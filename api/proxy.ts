import fetch from "node-fetch";
import type { VercelRequest, VercelResponse } from "@vercel/node";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const url = req.query.url as string;

  if (!url) {
    return res.status(400).json({ error: "Missing 'url' parameter" });
  }

  try {
    const response = await fetch(url);
    const data = await response.arrayBuffer();

    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Content-Type", response.headers.get("content-type") || "application/octet-stream");

    return res.send(Buffer.from(data));
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Proxy request failed" });
  }
}
