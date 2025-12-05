import { google, type Auth } from "googleapis";
import type { GoogleForm } from "@/types/googleForms";
import { log } from "./log";
import { Resend } from "resend";

/**
 * Gets an authenticated Google Forms API client using a service account
 * This is the recommended approach for server-side applications
 */
export async function getAuthenticatedClient(): Promise<
  Auth.GoogleAuth | Auth.OAuth2Client
> {
  // Check if we have service account credentials
  const serviceAccountKey = process.env.GOOGLE_SERVICE_ACCOUNT_KEY;
  const serviceAccountEmail = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  const serviceAccountPrivateKey =
    process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY;

  // Option 1: Service Account JSON (recommended for production)
  if (serviceAccountKey) {
    try {
      const credentials = JSON.parse(serviceAccountKey);
      const auth = new google.auth.GoogleAuth({
        credentials,
        scopes: [
          "https://www.googleapis.com/auth/forms.body.readonly",
          "https://www.googleapis.com/auth/spreadsheets",
        ],
      });
      return auth;
    } catch (error) {
      log.error("Error parsing service account key:", error);
      throw new Error("Invalid service account key format");
    }
  }

  // Option 2: Individual service account fields
  if (serviceAccountEmail && serviceAccountPrivateKey) {
    const auth = new google.auth.GoogleAuth({
      credentials: {
        client_email: serviceAccountEmail,
        private_key: serviceAccountPrivateKey.replace(/\\n/g, "\n"),
      },
      scopes: [
        "https://www.googleapis.com/auth/forms.body.readonly",
        "https://www.googleapis.com/auth/spreadsheets",
      ],
    });
    return auth;
  }

  // Option 3: OAuth2 access token (for development/testing)
  const accessToken = process.env.GOOGLE_FORMS_ACCESS_TOKEN;
  if (accessToken) {
    const auth = new google.auth.OAuth2();
    auth.setCredentials({ access_token: accessToken });
    return auth;
  }

  throw new Error(
    "No Google authentication credentials found. Please set up GOOGLE_SERVICE_ACCOUNT_KEY, GOOGLE_SERVICE_ACCOUNT_EMAIL/PRIVATE_KEY, or GOOGLE_FORMS_ACCESS_TOKEN"
  );
}

/**
 * Fetches a Google Form using authenticated client
 */
export async function fetchGoogleFormWithAuth(
  formId: string
): Promise<GoogleForm> {
  const auth = await getAuthenticatedClient();
  const forms = google.forms({ version: "v1", auth });

  try {
    const response = await forms.forms.get({
      formId: formId,
    });

    return response.data as GoogleForm;
  } catch (error) {
    const err = error as { code?: number; message?: string };
    if (err.code === 404) {
      throw new Error(
        `Form not found. Make sure the form ID is correct and the service account has access to the form.`
      );
    }
    if (err.code === 403) {
      throw new Error(
        `Permission denied. Make sure the service account has been granted access to the form. Share the form with the service account email.`
      );
    }
    throw new Error(`Failed to fetch form: ${err.message || "Unknown error"}`);
  }
}

/**
 * Gets the first sheet name from a Google Sheet
 * @param spreadsheetId - The ID of the Google Sheet
 * @returns The name of the first sheet
 */
export async function getFirstSheetName(
  spreadsheetId: string
): Promise<string> {
  const auth = await getAuthenticatedClient();
  const sheets = google.sheets({ version: "v4", auth });

  try {
    const response = await sheets.spreadsheets.get({
      spreadsheetId,
    });

    const sheetsList = response.data.sheets;
    if (!sheetsList || sheetsList.length === 0) {
      return "Sheet1"; // Default fallback
    }

    return sheetsList[0].properties?.title || "Sheet1";
  } catch {
    // If we can't get the sheet name, default to Sheet1
    return "Sheet1";
  }
}

/**
 * Reads the header row from a Google Sheet
 * @param spreadsheetId - The ID of the Google Sheet
 * @returns Array of header column names
 */
export async function getSheetHeaders(
  spreadsheetId: string
): Promise<string[]> {
  const auth = await getAuthenticatedClient();
  const sheets = google.sheets({ version: "v4", auth });

  try {
    // Get the first sheet name
    const sheetName = await getFirstSheetName(spreadsheetId);

    // Read the first row
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: `${sheetName}!1:1`,
    });

    const values = response.data.values;
    if (!values || values.length === 0) {
      return [];
    }

    return values[0].map((val) => String(val || ""));
  } catch (error) {
    const err = error as { code?: number; message?: string };
    if (err.code === 404) {
      throw new Error(
        `Spreadsheet not found. Make sure the spreadsheet ID is correct and the service account has access to it.`
      );
    }
    if (err.code === 403) {
      throw new Error(
        `Permission denied. Make sure the service account has been granted access to the spreadsheet. Share the spreadsheet with the service account email.`
      );
    }
    throw new Error(
      `Failed to read spreadsheet headers: ${err.message || "Unknown error"}`
    );
  }
}

/**
 * Writes a row of data to a Google Sheet
 * @param spreadsheetId - The ID of the Google Sheet
 * @param values - Array of values to write as a row
 */
export async function appendToGoogleSheet(
  spreadsheetId: string,
  values: (string | number)[]
): Promise<void> {
  const auth = await getAuthenticatedClient();
  const sheets = google.sheets({ version: "v4", auth });

  try {
    // Get the first sheet name
    const sheetName = await getFirstSheetName(spreadsheetId);

    await sheets.spreadsheets.values.append({
      spreadsheetId,
      range: `${sheetName}!A:Z`,
      valueInputOption: "USER_ENTERED",
      insertDataOption: "INSERT_ROWS",
      requestBody: {
        values: [values],
      },
    });
  } catch (error) {
    const err = error as { code?: number; message?: string };
    if (err.code === 404) {
      throw new Error(
        `Spreadsheet not found. Make sure the spreadsheet ID is correct and the service account has access to it.`
      );
    }
    if (err.code === 403) {
      throw new Error(
        `Permission denied. Make sure the service account has been granted access to the spreadsheet. Share the spreadsheet with the service account email.`
      );
    }
    throw new Error(
      `Failed to write to spreadsheet: ${err.message || "Unknown error"}`
    );
  }
}

/**
 * Sends an email using Resend API
 * @param to - Recipient email address
 * @param subject - Email subject
 * @param htmlBody - HTML email body
 */
export async function sendEmail(
  to: string,
  subject: string,
  htmlBody: string
): Promise<void> {
  const resendApiKey = process.env.RESEND_API_KEY;
  if (!resendApiKey) {
    throw new Error(
      "RESEND_API_KEY environment variable is not set. Please configure Resend API key."
    );
  }

  const resend = new Resend(resendApiKey);
  const senderEmail = "crystal@purensol.com.tw";

  try {
    log.log(`Attempting to send email to ${to} from ${senderEmail}`);

    const result = await resend.emails.send({
      from: senderEmail,
      to: to,
      subject: subject,
      html: htmlBody,
    });

    // Check for Resend API errors in the response
    if (result.error) {
      log.error("Resend API error:", result.error);
      throw new Error(
        `Resend API error: ${
          result.error.message || JSON.stringify(result.error)
        }`
      );
    }

    log.log(`Email sent successfully to ${to} from ${senderEmail}`, result);
  } catch (error) {
    const err = error as { message?: string };
    log.error("Error sending email:", error);
    throw new Error(`Failed to send email: ${err.message || "Unknown error"}`);
  }
}
