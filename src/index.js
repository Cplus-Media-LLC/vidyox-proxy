// /src/index.js
export default async function handler(req, res) {
  const targetUrl = req.query.url;
  if (!targetUrl) {
    return res.status(400).json({ error: 'Missing URL parameter' });
  }

  try {
    // Tarayıcı benzeri header'lar (bunu istediğin gibi değiştir)
    const forwardHeaders = {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/118.0.0.0 Safari/537.36',
      'Accept': '*/*',
      'Accept-Language': 'en-US,en;q=0.9',
      'Referer': 'https://www.google.com/',
      // 'Origin': 'https://www.google.com/', // gerektiğinde aç
    };

    // Eğer istemci Range gönderdiyse upstream'e ilet (video için gerekli)
    if (req.headers.range) {
      forwardHeaders['Range'] = req.headers.range;
    }

    // Doğrudan targetUrl'e fetch
    const upstreamRes = await fetch(targetUrl, {
      method: 'GET',
      headers: forwardHeaders,
      redirect: 'follow',
    });

    // Eğer upstream hata döndüyse, içeriği (varsa) snippet olarak gönder
    if (!upstreamRes.ok) {
      const text = await upstreamRes.text().catch(() => '');
      return res.status(upstreamRes.status).json({
        error: `Upstream error: ${upstreamRes.status}`,
        statusText: upstreamRes.statusText,
        upstreamBodySnippet: text.slice(0, 1000),
      });
    }

    // Upstream headerlarını al ve kullanıcıya ilet
    const contentType = upstreamRes.headers.get('content-type');
    const contentLength = upstreamRes.headers.get('content-length');
    const contentRange = upstreamRes.headers.get('content-range');
    const acceptRanges = upstreamRes.headers.get('accept-ranges');

    if (contentType) res.setHeader('Content-Type', contentType);
    if (contentLength && !contentRange) res.setHeader('Content-Length', contentLength);
    if (contentRange) res.setHeader('Content-Range', contentRange);
    if (acceptRanges) res.setHeader('Accept-Ranges', acceptRanges);

    // CORS ve Range izinleri (isteğe bağlı olarak daralt)
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Range');

    // Status kodunu upstream ile eşle
    res.statusCode = upstreamRes.status || 200;

    // Stream ederek gönder (bellek yormadan)
    const reader = upstreamRes.body.getReader();
    async function pipe() {
      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          res.write(Buffer.from(value));
        }
        res.end();
      } catch (err) {
        console.error('Stream pipe error:', err);
        try { res.end(); } catch (e) {}
      }
    }
    pipe();
  } catch (err) {
    console.error('Fetch error:', err);
    return res.status(500).json({ error: 'Proxy error', details: err.message });
  }
}
