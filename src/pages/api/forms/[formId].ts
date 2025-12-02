import type { NextApiRequest, NextApiResponse } from "next";
import { extractFormId } from "@/lib/googleForms";
import { fetchGoogleFormWithAuth } from "@/lib/googleAuth";
import type { GoogleForm } from "@/types/googleForms";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<GoogleForm | { error: string }>
) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { formId: formIdOrUrl } = req.query;

  if (!formIdOrUrl || typeof formIdOrUrl !== "string") {
    return res.status(400).json({ error: "Form ID or URL is required" });
  }

  try {
    // Extract form ID from URL if needed
    const formId = extractFormId(formIdOrUrl);

    if (!formId) {
      return res.status(400).json({ error: "Invalid form URL or ID" });
    }

    // Try to fetch using authenticated client
    try {
      const formData = await fetchGoogleFormWithAuth(formId);
      return res.status(200).json(formData);
    } catch (authError: any) {
      // If authentication fails, return helpful error message
      if (
        authError.message.includes("No Google authentication credentials") ||
        authError.message.includes("Permission denied") ||
        authError.message.includes("Form not found")
      ) {
        return res.status(401).json({
          error: authError.message,
        });
      }
      throw authError;
    }
  } catch (error: any) {
    console.error("Error fetching form:", error);
    return res.status(500).json({
      error: error.message || "Failed to fetch form data",
    });
  }
}
