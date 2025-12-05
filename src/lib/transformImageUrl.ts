import { log } from "./log";
// Helper function to transform Google Forms image URLs to use our proxy API
export const transformImageUrl = (
  contentUri: string,
  width: number
): string => {
  // Extract the path from the Google Forms URL
  // Format: https://lh7-rt.googleusercontent.com/formsz/AN7BsV...?key=...
  try {
    const url = new URL(contentUri);
    const pathParts = url.pathname.split("/").filter(Boolean);

    // Extract key from query string
    const keyParam = url.searchParams.get("key") || "";

    // Add width parameter if not present
    let queryString = "";
    if (!contentUri.includes("=w")) {
      // Format: =w260?key=...
      queryString = `=w${width}${keyParam ? `&key=${keyParam}` : ""}`;
    } else {
      // Preserve existing width and key
      const existingQuery = url.search.substring(1); // Remove leading ?
      queryString = existingQuery;
    }

    // Use our API proxy route
    // Format: /api/images/formsz/AN7BsV...?=w260&key=...
    const proxyPath = `/api/images/${pathParts.join("/")}?${queryString}`;
    return proxyPath;
  } catch (error) {
    // Fallback to original URL if parsing fails
    log.error("Error parsing image URL:", error);
    return contentUri;
  }
};
