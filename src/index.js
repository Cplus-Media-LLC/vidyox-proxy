// /src/index.js
export default async function handler(req, res) {
  const targetUrl = req.query.url;
  if (!targetUrl) {
    return res.status(400).json({ error: 'Missing URL parameter' });
  }

  // Env'den al (Vercel'de Settings > Environment Variables bölümüne ekle)
  const API_KEY = process.env.PROXYSCRAPE_KEY || 'h9hdo4x4k4q3e7i8oq99';
  const API_BASE = process.env.PROXYSCRAPE_BASE || 'https://api.proxyscrape.com';

  if (!API_KEY) {
    console.error('Missing PROXYSCRAPE_KEY environment variable');
    return res.status(500).json({ error: 'Server misconfiguration: missing API key' });
  }

  try {
    // Proxy sağlayıcısının beklediği query parametre yapısına göre ayarla.
    // Çoğu "scraper API" şu formata yakın çalışır: `${API_BASE}?api_key=${API_KEY}&url=${encodeURIComponent(targetUrl)}`
    // ProxyScrape dokümanında farklı bir parametre adı varsa (ör. key, token vs.) PROXYSCRAPE_BASE içine tam format ile koyabilirsin.
    const apiUrl = `${API_BASE}/?api_key=${encodeURIComponent(API_KEY)}&url=${encodeURIComponent(targetUrl)}`;

    const response = await fetch(apiUrl, {
      // ekstra headers: hedef siteye "tarayıcı" gibi görünmesi için
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/118.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
        'Referer': 'https://www.google.com/',
        // Not: Origin header'i API sağlayıcısına göre kaldır/ekle
      },
      // timeout kontrolü istersen fetch wrapper ekle (Vercel fonksiyon limitleri de var)
    });

    if (!response.ok) {
      // Proxy servisinin döndürdüğü hatayı direkt ilet
      const bodyText = await response.text().catch(() => '');
      console.warn('Upstream (proxy) returned non-ok:', response.status, response.statusText);
      return res.status(response.status).json({
        error: `Upstream error: ${response.status}`,
        statusText: response.statusText,
        upstreamBodySnippet: bodyText.slice(0, 1000) // uzun çıktıları kırpar
      });
    }

    // CORS ayarları (isteğe göre kısıtla)
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    // İçerik tipi header'ını ilet
    const contentType = response.headers.get('content-type');
    if (contentType) res.setHeader('Content-Type', contentType);

    // Binary ve text her ikisini de destekle
    const arrayBuffer = await response.arrayBuffer();
    return res.send(Buffer.from(arrayBuffer));
  } catch (err) {
    console.error('Proxy error:', err);
    return res.status(500).json({ error: 'Proxy error', details: err.message });
  }
}
