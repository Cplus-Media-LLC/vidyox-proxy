// /src/index.js
import fetch from 'node-fetch';

export default async function handler(req, res) {
  const targetUrl = req.query.url;
  if (!targetUrl) return res.status(400).json({ error: 'Missing URL parameter' });

  try {
    // ProxyScrape ücretsiz proxy listesi (http proxy)
    const listRes = await fetch('https://api.proxyscrape.com/v2/?request=displayproxies&protocol=http&timeout=3000&country=all&ssl=all&anonymity=all');
    const listText = await listRes.text();
    const proxies = listText.split('\n').filter(Boolean);
    if (!proxies.length) throw new Error('No proxies found');

    // Rastgele bir proxy seç
    const randomProxy = proxies[Math.floor(Math.random() * proxies.length)];
    const proxyUrl = `http://${randomProxy}`;

    console.log('Using proxy:', proxyUrl);

    // Proxy kullanarak fetch (sadece Node.js ortamında çalışır)
    const HttpsProxyAgent = (await import('https-proxy-agent')).default;
    const agent = new HttpsProxyAgent(proxyUrl);

    const upstreamRes = await fetch(targetUrl, {
      method: 'GET',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
        'Accept': '*/*',
      },
      agent,
    });

    if (!upstreamRes.ok) {
      return res.status(upstreamRes.status).json({ error: `Upstream error: ${upstreamRes.status}` });
    }

    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Range');

    const contentType = upstreamRes.headers.get('content-type');
    if (contentType) res.setHeader('Content-Type', contentType);

    // Stream et
    const reader = upstreamRes.body.getReader();
    async function pipeStream() {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        res.write(Buffer.from(value));
      }
      res.end();
    }
    pipeStream();
  } catch (err) {
    res.status(500).json({ error: 'Proxy error', details: err.message });
  }
}
