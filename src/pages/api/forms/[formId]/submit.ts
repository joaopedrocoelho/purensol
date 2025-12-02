import type { NextApiRequest, NextApiResponse } from "next";
import {
  appendToGoogleSheet,
  getSheetHeaders,
  fetchGoogleFormWithAuth,
} from "@/lib/googleAuth";
import { extractFormId } from "@/lib/googleForms";
import type { GoogleForm } from "@/types/googleForms";

interface SubmitResponse {
  success: boolean;
  error?: string;
}

/**
 * Extracts spreadsheet ID from Google Sheets URL
 */
function extractSpreadsheetId(url: string): string | null {
  // Format: https://docs.google.com/spreadsheets/d/SPREADSHEET_ID/edit
  const match = url.match(/\/spreadsheets\/d\/([a-zA-Z0-9_-]+)/);
  if (match) {
    return match[1];
  }
  // If it's already just an ID
  if (/^[a-zA-Z0-9_-]+$/.test(url)) {
    return url;
  }
  return null;
}

/**
 * Transforms form data to match the simplified Google Sheet column structure
 * Columns: 時間戳記, 電子郵件地址, 全名, Line顯示名稱, IG/FB帳號, Email, Products, Gifts, Total
 */
function transformFormDataToSheetRow(
  formData: Record<string, unknown>,
  form: GoogleForm,
  headers: string[],
  total: number,
  email?: string
): (string | number)[] {
  // Find gift question ID
  const giftQuestionId = form.items.find(
    (item) => item.title?.includes("✦滿額贈✦") || item.title?.includes("滿額贈")
  )?.questionItem?.question?.questionId;

  // Extract basic info fields
  let fullName = "";
  let lineName = "";
  let igFbAccount = "";
  let emailField = "";

  // Collect products grouped by title: Map<title, selected values[]>
  const productsByTitle = new Map<string, string[]>();
  const gifts: string[] = [];

  // Process form data
  Object.entries(formData).forEach(([fieldName, value]) => {
    // Skip false values (unchecked checkboxes)
    if (value === false) {
      return;
    }

    // Skip empty values
    if (value === null || value === undefined || value === "") {
      return;
    }

    // Extract question ID from field name
    const questionIdMatch = fieldName.match(
      /^question_(.+?)(?:_row_\d+_col_\d+)?$/
    );
    if (!questionIdMatch) return;

    const questionId = questionIdMatch[1];
    const item = form.items.find(
      (i) =>
        i.questionItem?.question?.questionId === questionId ||
        i.questionGroupItem?.questions?.some((q) => q.questionId === questionId)
    );

    if (!item) return;

    const itemTitle = item.title || "";

    // Extract basic info fields - check by title content
    if (itemTitle.includes("全名") || itemTitle.match(/^1\./)) {
      fullName = Array.isArray(value) ? value.join(", ") : String(value);
      return;
    }
    if (itemTitle.includes("Line") || itemTitle.match(/^2\./)) {
      lineName = Array.isArray(value) ? value.join(", ") : String(value);
      return;
    }
    if (
      itemTitle.includes("IG") ||
      itemTitle.includes("FB") ||
      itemTitle.match(/^3\./)
    ) {
      igFbAccount = Array.isArray(value) ? value.join(", ") : String(value);
      return;
    }
    if (itemTitle.includes("Email") || itemTitle.match(/^4\./)) {
      emailField = Array.isArray(value) ? value.join(", ") : String(value);
      return;
    }

    // Check if it's the gift section
    if (questionId === giftQuestionId) {
      if (Array.isArray(value)) {
        const giftValues = value
          .map((v) => String(v))
          .filter((v) => v && v !== "false" && v.trim() !== "");
        gifts.push(...giftValues);
      } else if (String(value) !== "false") {
        gifts.push(String(value));
      }
      return;
    }

    // Everything else is a product (skip info fields and gifts)
    // Group products by their item title
    if (Array.isArray(value)) {
      const productValues = value
        .map((v) => String(v))
        .filter((v) => v && v !== "false" && v.trim() !== "");

      if (productValues.length > 0) {
        const existing = productsByTitle.get(itemTitle) || [];
        productsByTitle.set(itemTitle, [...existing, ...productValues]);
      }
    } else if (String(value) !== "false") {
      const existing = productsByTitle.get(itemTitle) || [];
      productsByTitle.set(itemTitle, [...existing, String(value)]);
    }
  });

  // Format products as "title: value1, value2"
  const products = Array.from(productsByTitle.entries()).map(
    ([title, values]) => {
      return `${title} : ${values.join(", ")}`;
    }
  );

  // Create timestamp
  const timestamp = new Date().toLocaleString("zh-TW", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });

  // Build row matching header order
  const row: (string | number)[] = [];
  headers.forEach((header) => {
    switch (header) {
      case "時間戳記":
        row.push(timestamp);
        break;
      case "電子郵件地址":
        row.push(email || emailField || "");
        break;
      case "全名":
        row.push(fullName);
        break;
      case "Line顯示名稱（請務必填寫正確）":
        row.push(lineName);
        break;
      case "IG/FB帳號":
        row.push(igFbAccount);
        break;
      case "Email":
        row.push(emailField || email || "");
        break;
      case "Products":
        row.push(products.join(", "));
        break;
      case "Gifts":
        row.push(gifts.join(", "));
        break;
      case "Total":
        row.push(total);
        break;
      default:
        row.push("");
    }
  });

  return row;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<SubmitResponse>
) {
  if (req.method !== "POST") {
    return res.status(405).json({
      success: false,
      error: "Method not allowed. Use POST to submit form responses.",
    });
  }

  const { formId: formIdOrUrl } = req.query;
  const { spreadsheetUrl, email, formData, total } = req.body;

  if (!formIdOrUrl || typeof formIdOrUrl !== "string") {
    return res.status(400).json({
      success: false,
      error: "Form ID or URL is required",
    });
  }

  // Get spreadsheet URL from body or environment variable
  const targetSpreadsheetUrl =
    spreadsheetUrl ||
    process.env.GOOGLE_SPREADSHEET_URL ||
    "https://docs.google.com/spreadsheets/d/1c2vD11T__puDjLl6lwt36tfs5BW10xr4G2zFZ9XntHs";

  if (!targetSpreadsheetUrl || typeof targetSpreadsheetUrl !== "string") {
    return res.status(400).json({
      success: false,
      error: "Spreadsheet URL is required",
    });
  }

  // Form data can be in req.body.formData or directly in req.body
  const formDataToProcess = formData || req.body;

  if (!formDataToProcess || typeof formDataToProcess !== "object") {
    return res.status(400).json({
      success: false,
      error: "Form data is required in the request body",
    });
  }

  try {
    // Extract form ID from URL if needed
    const formId = extractFormId(formIdOrUrl);
    if (!formId) {
      return res.status(400).json({
        success: false,
        error: "Invalid form URL or ID",
      });
    }

    // Extract spreadsheet ID
    const spreadsheetId = extractSpreadsheetId(targetSpreadsheetUrl);
    if (!spreadsheetId) {
      return res.status(400).json({
        success: false,
        error: "Invalid spreadsheet URL",
      });
    }

    // Fetch form structure to map questions to columns
    const form = await fetchGoogleFormWithAuth(formId);

    // Get sheet headers to match column structure
    const headers = await getSheetHeaders(spreadsheetId);

    // Transform form data to sheet row
    const totalAmount = typeof total === "number" ? total : 0;
    const row = transformFormDataToSheetRow(
      formDataToProcess,
      form,
      headers,
      totalAmount,
      email
    );

    // Append to sheet
    await appendToGoogleSheet(spreadsheetId, row);

    return res.status(200).json({
      success: true,
    });
  } catch (error) {
    console.error("Error submitting form response:", error);
    const errorMessage =
      error instanceof Error ? error.message : "Failed to submit form response";
    return res.status(500).json({
      success: false,
      error: errorMessage,
    });
  }
}
