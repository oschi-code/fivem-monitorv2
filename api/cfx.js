export default async function handler(req, res) {
  const id = (req.query.id || '').trim();
 
  // Validate server ID format to prevent abuse
  if (!/^[a-z0-9]{3,10}$/i.test(id)) {
    res.status(400).json({
      error: 'Invalid server ID',
      hint: 'Expected 3-10 alphanumeric characters (e.g. "5xdjqr")',
    });
    return;
  }
 
  try {
    const upstream = await fetch(
      `https://servers-frontend.fivem.net/api/servers/single/${id}`,
      {
        headers: {
          // Look like a normal Firefox on Windows visiting servers.fivem.net
          'User-Agent':       'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:128.0) Gecko/20100101 Firefox/128.0',
          'Accept':           'application/json, text/plain, */*',
          'Accept-Language':  'en-US,en;q=0.5',
          'Accept-Encoding':  'gzip, deflate, br',
          'Referer':          'https://servers.fivem.net/',
          'Origin':           'https://servers.fivem.net',
          'Sec-Fetch-Dest':   'empty',
          'Sec-Fetch-Mode':   'cors',
          'Sec-Fetch-Site':   'same-site',
          'DNT':              '1',
          'Connection':       'keep-alive',
        },
      }
    );
 
    const body = await upstream.text();
 
    // Cache responses at Vercel's edge for 5 seconds — reduces upstream load
    res.setHeader('Cache-Control', 's-maxage=5, stale-while-revalidate=10');
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
 
    // If Cfx.re still returns "not found" / non-JSON, surface that as a 502
    // so the frontend can fall back to public proxies instead of being lied to.
    if (!body || !body.trim().startsWith('{')) {
      res.status(502).json({
        error: 'Upstream returned non-JSON',
        upstreamStatus: upstream.status,
        body: body.slice(0, 200),
      });
      return;
    }
 
    res.status(upstream.status).send(body);
  } catch (e) {
    res.status(502).json({
      error: 'Upstream fetch failed',
      detail: String(e?.message || e),
    });
  }
}
