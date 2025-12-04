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
 * Transforms form data to match the Google Sheet column structure
 * Each product gets its own column matching the item title
 */
function transformFormDataToSheetRow(
  formData: Record<string, unknown>,
  form: GoogleForm,
  headers: string[],
  total: number,
  email?: string
): (string | number)[] {
  // Find first gift question ID (第一階段滿額贈)
  const firstGiftQuestionId = form.items.find(
    (item) =>
      item.title?.includes("✦第一階段滿額贈") ||
      item.title?.includes("第一階段滿額贈")
  )?.questionItem?.question?.questionId;

  // Find second gift question ID (第二階段滿額贈)
  const secondGiftQuestionId = form.items.find(
    (item) =>
      item.title?.includes("✦第二階段滿額贈") ||
      item.title?.includes("第二階段滿額贈")
  )?.questionItem?.question?.questionId;

  // Find total column and gift columns
  const totalColumnHeader = headers.find(
    (h) => h.includes("初步計算金額") || h.includes("金額")
  );
  const firstGiftColumnHeader = headers.find(
    (h) => h.includes("✦第一階段滿額贈") || h.includes("第一階段滿額贈")
  );
  const secondGiftColumnHeader = headers.find(
    (h) => h.includes("✦第二階段滿額贈") || h.includes("第二階段滿額贈")
  );

  // Extract basic info fields
  let fullName = "";
  let lineName = "";
  let igFbAccount = "";
  let emailField = "";

  // Map each product item title to its selected values
  const productsByTitle = new Map<string, string[]>();
  const firstGifts: string[] = [];
  const secondGifts: string[] = [];

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

    // Check if it's a gift section
    if (questionId === firstGiftQuestionId) {
      if (Array.isArray(value)) {
        const giftValues = value
          .map((v) => String(v))
          .filter((v) => v && v !== "false" && v.trim() !== "");
        firstGifts.push(...giftValues);
      } else if (String(value) !== "false") {
        firstGifts.push(String(value));
      }
      return;
    }
    if (questionId === secondGiftQuestionId) {
      if (Array.isArray(value)) {
        const giftValues = value
          .map((v) => String(v))
          .filter((v) => v && v !== "false" && v.trim() !== "");
        secondGifts.push(...giftValues);
      } else if (String(value) !== "false") {
        secondGifts.push(String(value));
      }
      return;
    }

    // Everything else is a product - store values by item title
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
    // Handle timestamp
    if (header === "時間戳記") {
      row.push(timestamp);
      return;
    }

    // Handle email address
    if (header === "電子郵件地址") {
      row.push(email || emailField || "");
      return;
    }

    // Handle basic info fields
    if (header.includes("全名") || header.match(/^1\./)) {
      row.push(fullName);
      return;
    }
    if (header.includes("Line") || header.match(/^2\./)) {
      row.push(lineName);
      return;
    }
    if (
      header.includes("IG") ||
      header.includes("FB") ||
      header.match(/^3\./)
    ) {
      row.push(igFbAccount);
      return;
    }
    if (header.includes("Email") && !header.includes("電子郵件")) {
      row.push(emailField || email || "");
      return;
    }

    // Handle total column
    if (header === totalColumnHeader || header.includes("初步計算金額")) {
      row.push(total);
      return;
    }

    // Handle first gift column
    if (
      header === firstGiftColumnHeader ||
      header.includes("✦第一階段滿額贈") ||
      header.includes("第一階段滿額贈")
    ) {
      row.push(firstGifts.join(", "));
      return;
    }

    // Handle second gift column
    if (
      header === secondGiftColumnHeader ||
      header.includes("✦第二階段滿額贈") ||
      header.includes("第二階段滿額贈")
    ) {
      row.push(secondGifts.join(", "));
      return;
    }

    // Handle product columns - match by item title
    // Try exact match first
    if (productsByTitle.has(header)) {
      const values = productsByTitle.get(header) || [];
      row.push(values.join(", "));
      return;
    }

    // Try partial match (in case headers have extra formatting)
    let matched = false;
    for (const [itemTitle, values] of productsByTitle.entries()) {
      // Check if header contains the item title or vice versa
      if (
        header.includes(itemTitle) ||
        itemTitle.includes(header) ||
        header.replace(/[^\w\u4e00-\u9fff]/g, "") ===
          itemTitle.replace(/[^\w\u4e00-\u9fff]/g, "")
      ) {
        row.push(values.join(", "));
        matched = true;
        break;
      }
    }

    if (!matched) {
      // Empty cell for columns that don't match
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
      error: "方法不允許。請使用 POST 方法提交表單回應。",
    });
  }

  const { formId: formIdOrUrl } = req.query;
  const { spreadsheetUrl, email, formData, total } = req.body;

  if (!formIdOrUrl || typeof formIdOrUrl !== "string") {
    return res.status(400).json({
      success: false,
      error: "需要表單 ID 或網址",
    });
  }

  // Get spreadsheet URL from body or environment variable
  const targetSpreadsheetUrl =
    spreadsheetUrl ||
    process.env.GOOGLE_SPREADSHEET_URL ||
    "https://docs.google.com/spreadsheets/d/12jcjRLrytyxJsiQFYRiutUdRNEBcpjE6ms9MAy_TzwE";

  if (!targetSpreadsheetUrl || typeof targetSpreadsheetUrl !== "string") {
    return res.status(400).json({
      success: false,
      error: "需要試算表網址",
    });
  }

  // Form data can be in req.body.formData or directly in req.body
  const formDataToProcess = formData || req.body;

  if (!formDataToProcess || typeof formDataToProcess !== "object") {
    return res.status(400).json({
      success: false,
      error: "請求主體中需要表單資料",
    });
  }

  try {
    // Extract form ID from URL if needed
    const formId = extractFormId(formIdOrUrl);
    if (!formId) {
      return res.status(400).json({
        success: false,
        error: "無效的表單網址或 ID",
      });
    }

    // Extract spreadsheet ID
    const spreadsheetId = extractSpreadsheetId(targetSpreadsheetUrl);
    if (!spreadsheetId) {
      return res.status(400).json({
        success: false,
        error: "無效的試算表網址",
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
      error: errorMessage || "提交表單回應失敗",
    });
  }
}
