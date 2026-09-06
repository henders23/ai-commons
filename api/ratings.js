/* Ratings API — a Vercel serverless function backed by an Upstash Redis
   REST database (Vercel Marketplace → Upstash, or an Upstash account).

   GET  /api/ratings?slugs=a,b,c[&visitor=<uuid>]
        → { a: { avg, count[, mine] }, b: … }
   POST /api/ratings  { slug, stars (1–5), visitor (uuid) }
        → { avg, count, mine }

   One rating per (slug, visitor): stored as a hash `rating:<slug>` mapping
   visitor id → stars. The visitor id is generated in the browser and kept
   in localStorage; it is enough to let someone change their own rating.

   Environment: KV_REST_API_URL + KV_REST_API_TOKEN (Vercel KV / Marketplace
   naming) or UPSTASH_REDIS_REST_URL + UPSTASH_REDIS_REST_TOKEN. */

const URL_ = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
const TOKEN = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;

const SLUG = /^[a-z0-9-]{1,120}$/;
const VISITOR = /^[A-Za-z0-9-]{8,64}$/;
const ALLOWED_ORIGINS = [process.env.SITE_URL, process.env.VERCEL_PROJECT_PRODUCTION_URL && `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`].filter(Boolean);

async function redis(commands) {
  const r = await fetch(`${URL_}/pipeline`, {
    method: 'POST',
    headers: { authorization: `Bearer ${TOKEN}`, 'content-type': 'application/json' },
    body: JSON.stringify(commands),
  });
  if (!r.ok) throw new Error(`redis ${r.status}`);
  return (await r.json()).map((x) => x.result);
}

function stats(hash, visitor) {
  // hash is a flat [field, value, field, value, …] array from HGETALL
  let sum = 0, count = 0, mine = 0;
  for (let i = 0; i < hash.length; i += 2) {
    const v = Number(hash[i + 1]);
    if (!v) continue;
    sum += v; count++;
    if (visitor && hash[i] === visitor) mine = v;
  }
  const out = { avg: count ? Math.round((sum / count) * 10) / 10 : 0, count };
  if (visitor) out.mine = mine;
  return out;
}

function json(res, status, body) {
  res.setHeader('content-type', 'application/json; charset=utf-8');
  res.setHeader('cache-control', 'no-store');
  res.status(status).send(JSON.stringify(body));
}

export default async function handler(req, res) {
  if (!URL_ || !TOKEN) return json(res, 503, { error: 'ratings not configured' });

  if (req.method === 'GET') {
    const slugs = String(req.query.slugs || '').split(',').map((s) => s.trim()).filter((s) => SLUG.test(s)).slice(0, 100);
    const visitor = VISITOR.test(String(req.query.visitor || '')) ? String(req.query.visitor) : undefined;
    if (!slugs.length) return json(res, 400, { error: 'slugs required' });
    try {
      const results = await redis(slugs.map((s) => ['HGETALL', `rating:${s}`]));
      const out = {};
      slugs.forEach((s, i) => { out[s] = stats(results[i] || [], visitor); });
      return json(res, 200, out);
    } catch (e) {
      return json(res, 502, { error: 'store unavailable' });
    }
  }

  if (req.method === 'POST') {
    // Same-origin only: the widget is the sole intended client.
    const origin = req.headers.origin;
    if (origin && ALLOWED_ORIGINS.length && !ALLOWED_ORIGINS.includes(origin)) return json(res, 403, { error: 'forbidden' });
    let body = req.body;
    if (typeof body === 'string') { try { body = JSON.parse(body); } catch { body = null; } }
    const slug = body && String(body.slug || '');
    const stars = body && Number(body.stars);
    const visitor = body && String(body.visitor || '');
    if (!SLUG.test(slug) || !VISITOR.test(visitor) || !Number.isInteger(stars) || stars < 1 || stars > 5) {
      return json(res, 400, { error: 'bad request' });
    }
    try {
      const [, hash] = await redis([
        ['HSET', `rating:${slug}`, visitor, String(stars)],
        ['HGETALL', `rating:${slug}`],
      ]);
      return json(res, 200, stats(hash || [], visitor));
    } catch (e) {
      return json(res, 502, { error: 'store unavailable' });
    }
  }

  res.setHeader('allow', 'GET, POST');
  return json(res, 405, { error: 'method not allowed' });
}
