// Utility functions for Google Forms

/**
 * Extracts the form ID from a Google Forms URL
 * Supports both forms.gle short URLs and docs.google.com URLs
 */
export function extractFormId(url: string): string | null {
  // Handle short URLs (forms.gle)
  if (url.includes("forms.gle/")) {
    // For short URLs, we need to resolve them first
    // For now, we'll expect the full URL or form ID
    const match = url.match(/forms\.gle\/([a-zA-Z0-9_-]+)/);
    if (match) {
      return match[1];
    }
  }

  // Handle full URLs (docs.google.com)
  const match = url.match(/\/d\/e\/([a-zA-Z0-9_-]+)/);
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
 * Fetches form data from Google Forms API
 * Note: Requires Google API credentials to be set up
 * @deprecated Use fetchGoogleFormWithAuth from googleAuth.ts instead for server-side
 */
export async function fetchGoogleForm(
  formId: string,
  accessToken?: string
): Promise<any> {
  const apiUrl = `https://forms.googleapis.com/v1/forms/${formId}`;

  const headers: HeadersInit = {
    "Content-Type": "application/json",
  };

  if (accessToken) {
    headers["Authorization"] = `Bearer ${accessToken}`;
  }

  const response = await fetch(apiUrl, {
    method: "GET",
    headers,
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to fetch form: ${response.status} ${error}`);
  }

  return response.json();
}
