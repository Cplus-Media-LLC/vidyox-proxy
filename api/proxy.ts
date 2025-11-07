import type { VercelRequest, VercelResponse } from '@vercel/node'
import fetch from 'node-fetch'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const { url } = req.query

  if (!url || typeof url !== 'string') {
    return res.status(400).json({ error: 'Missing or invalid URL parameter' })
  }

  try {
    const response = await fetch(url)
    const contentType = response.headers.get('content-type')
    res.setHeader('Content-Type', contentType || 'application/octet-stream')
    response.body?.pipe(res)
  } catch (error) {
    res.status(500).json({ error: 'Proxy error', details: (error as Error).message })
  }
}
