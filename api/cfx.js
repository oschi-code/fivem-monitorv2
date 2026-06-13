export default async function handler(req, res) {
  const id = (req.query.id || '').trim();

  // Validate server ID format to prevent abuse (only alphanumeric, 3-10 chars)
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
          'User-Agent': 'FiveM-Monitor/1.0',
          'Accept': 'application/json',
        },
      }
    );

    const body = await upstream.text();

    // Cache responses at Vercel's edge for 5 seconds — reduces upstream load
    // and makes back-to-back polls instant.
    res.setHeader('Cache-Control', 's-maxage=5, stale-while-revalidate=10');
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.status(upstream.status).send(body);
  } catch (e) {
    res.status(502).json({
      error: 'Upstream fetch failed',
      detail: String(e?.message || e),
    });
  }
}
