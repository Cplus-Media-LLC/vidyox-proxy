import { VercelRequest, VercelResponse } from '@vercel/node';

const fetch = (url: string, options?: any) =>
  import('node-fetch').then(({ default: fetch }) => fetch(url, options));

export default async (req: VercelRequest, res: VercelResponse) => {
  const url = req.query.url as string;

  if (!url) {
    return res.status(400).json({ error: 'Missing url parameter' });
  }

  try {
    const response = await fetch(url, { method: 'GET' });

    if (!response.ok) {
      return res.status(response.status).json({ error: 'Upstream failed' });
    }

    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Content-Type', response.headers.get('content-type') || 'application/octet-stream');

    const buffer = await response.arrayBuffer();
    res.send(Buffer.from(buffer));
  } catch (err: any) {
    res.status(500).json({ error: 'Proxy error', details: err.message });
  }
};
