import type { NextApiRequest, NextApiResponse } from "next";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { path } = req.query;

  if (!path || !Array.isArray(path)) {
    return res.status(400).json({ error: "Invalid image path" });
  }

  try {
    // Reconstruct the Google Forms image URL
    // The path array contains: ["formsz", "AN7BsV..."]
    // We need to preserve the query string from the original request
    const pathString = path.join("/");
    const fullUrl = req.url || "";

    // Extract query string (everything after ?)
    const queryMatch = fullUrl.match(/\?(.+)$/);
    let queryString = queryMatch ? queryMatch[1] : "";

    // Build the full URL
    // Google Forms URLs have format: URL=w260?key=... or URL?=w260&key=...
    let imageUrl = `https://lh7-rt.googleusercontent.com/${pathString}`;

    if (queryString) {
      // If query string starts with =w, append it directly (format: =w260&key=...)
      if (queryString.startsWith("=w")) {
        imageUrl = `${imageUrl}?${queryString}`;
      } else {
        // Standard query string format
        imageUrl = `${imageUrl}?${queryString}`;
      }
    }

    // Fetch the image from Google
    const response = await fetch(imageUrl, {
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; GoogleFormsProxy/1.0)",
        Referer: "https://docs.google.com/",
      },
    });

    if (!response.ok) {
      return res.status(response.status).json({
        error: `Failed to fetch image: ${response.status}`,
      });
    }

    // Get the image data
    const imageBuffer = await response.arrayBuffer();
    const contentType = response.headers.get("content-type") || "image/jpeg";

    // Set appropriate headers
    res.setHeader("Content-Type", contentType);
    res.setHeader("Cache-Control", "public, max-age=31536000, immutable");

    // Send the image
    return res.send(Buffer.from(imageBuffer));
  } catch (error) {
    console.error("Error proxying image:", error);
    return res.status(500).json({
      error: error instanceof Error ? error.message : "Failed to fetch image",
    });
  }
}
