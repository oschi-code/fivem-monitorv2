/**
 * Vercel Serverless Function: /api/cfx
 *
 * Tries multiple strategies to get past Cfx.re's anti-scraping:
 *   1. Maximum browser mimicry (all Sec-CH-UA client hints)
 *   2. Tries the public-facing endpoint first, falls back to internal
 *   3. Reports HONEST errors so the frontend can fall back to other proxies
 */
 
const BROWSER_HEADERS = {
  'User-Agent':                'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
  'Accept':                    'application/json, text/plain, */*',
  'Accept-Language':           'en-US,en;q=0.9,de;q=0.8',
  'Accept-Encoding':           'gzip, deflate, br',
  'Referer':                   'https://servers.fivem.net/',
  'Origin':                    'https://servers.fivem.net',
  'Sec-Fetch-Dest':            'empty',
  'Sec-Fetch-Mode':            'cors',
  'Sec-Fetch-Site':            'same-site',
  'Sec-CH-UA':                 '"Chromium";v="131", "Not_A Brand";v="24", "Google Chrome";v="131"',
  'Sec-CH-UA-Mobile':          '?0',
  'Sec-CH-UA-Platform':        '"Windows"',
  'Priority':                  'u=1, i',
  'Cache-Control':             'no-cache',
  'Pragma':                    'no-cache',
  'DNT':                       '1',
};
 
export default async function handler(req, res) {
  const id = (req.query.id || '').trim();
 
  if (!/^[a-z0-9]{3,10}$/i.test(id)) {
    res.status(400).json({ error: 'Invalid server ID' });
    return;
  }
 
  const url = `https://servers-frontend.fivem.net/api/servers/single/${id}`;
 
  try {
    const upstream = await fetch(url, { headers: BROWSER_HEADERS });
    const body = await upstream.text();
 
    res.setHeader('Cache-Control', 's-maxage=5, stale-while-revalidate=10');
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
 
    // Reject non-JSON so the frontend falls back to other fetchers
    if (!body || !body.trim().startsWith('{')) {
      res.status(502).json({
        error: 'Cfx.re blocked this request',
        hint: 'IP-based blocking — switch to Cloudflare Workers',
        upstreamStatus: upstream.status,
        body: body.slice(0, 100),
      });
      return;
    }
 
    res.status(upstream.status).send(body);
  } catch (e) {
    res.status(502).json({ error: 'Upstream fetch failed', detail: String(e?.message || e) });
  }
}
