#!/usr/bin/env node
/* Build static, shareable, crawlable pages for each approved reading.
 *
 *   node tools/build-reading-pages.mjs               # fetch live data from Supabase
 *   node tools/build-reading-pages.mjs --data f.json # build from a local JSON array
 *
 * Writes r/<id>.html (with full <title>/description/OpenGraph/Twitter meta and a
 * readable, themed page) plus sitemap.xml. These are plain static files — no
 * runtime server — so they're crawlable and unfurl nicely when shared. Re-run
 * whenever the approved readings change.
 */
import { writeFileSync, mkdirSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const ORIGIN = 'https://ai-commons-for-eap.vercel.app';
const SUPABASE_URL = 'https://yeqykdtclexxexzvzvlb.supabase.co';
const SUPABASE_KEY = 'sb_publishable_SfJzbr0fjvdy7Qk4lJ0h0w_BJ9K08Id';

const esc = s => String(s == null ? '' : s)
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
const clip = (s, n) => { s = String(s || ''); return s.length > n ? s.slice(0, n - 1).trimEnd() + '…' : s; };
const avgOf = r => {
  const n = (r.base_count || 0); return n ? Number(r.base_avg) : 0;
};

function page(r) {
  const typeLabel = r.type === 'article' ? 'ARTICLE' : 'WEBSITE';
  const avg = avgOf(r);
  const desc = clip(r.description, 200);
  const ogDesc = clip(r.description, 160);
  const canonical = `${ORIGIN}/r/${encodeURIComponent(r.id)}.html`;
  const tags = (r.tags || []).map(t =>
    `<span style="font-family:var(--mono);font-size:11px;color:var(--t-label);background:var(--field);border:1px solid var(--line2);border-radius:5px;padding:3px 9px;">#${esc(t)}</span>`).join('');
  return `<!DOCTYPE html>
<html lang="en" data-theme="dark">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<script>(function(){try{var t=localStorage.getItem('aice-theme');document.documentElement.setAttribute('data-theme',(t==='light'||t==='dark')?t:'dark');}catch(e){}})();</script>
<title>${esc(r.title)} · AI Commons for Education</title>
<meta name="description" content="${esc(ogDesc)}" />
<link rel="canonical" href="${canonical}" />
<meta property="og:type" content="article" />
<meta property="og:site_name" content="AI Commons for Education" />
<meta property="og:title" content="${esc(r.title)}" />
<meta property="og:description" content="${esc(ogDesc)}" />
<meta property="og:url" content="${canonical}" />
<meta name="twitter:card" content="summary" />
<meta name="twitter:title" content="${esc(r.title)}" />
<meta name="twitter:description" content="${esc(ogDesc)}" />
<link rel="preconnect" href="https://fonts.googleapis.com" />
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
<link href="https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500;600&display=swap" rel="stylesheet" />
<link rel="stylesheet" href="../edu.css" />
</head>
<body class="edu-body">
  <div class="edu" style="min-height:100vh;">
    <div style="max-width:720px;margin:0 auto;padding:0 24px;">
      <div style="display:flex;align-items:center;justify-content:space-between;gap:14px;padding:24px 0;border-bottom:1px solid var(--line);">
        <a href="../index.html" style="font-family:var(--mono);font-size:11px;letter-spacing:0.2em;color:var(--t-eyebrow);text-transform:uppercase;text-decoration:none;">AI Commons · for Education</a>
        <a href="../index.html" style="font-family:var(--mono);font-size:11px;color:var(--t-faint);text-decoration:none;">← Library</a>
      </div>

      <article style="padding:48px 0 40px;">
        <div style="font-family:var(--mono);font-size:11.5px;color:var(--t-muted);letter-spacing:0.06em;margin-bottom:16px;">${typeLabel} · ${esc(r.cat_label || r.cat)}</div>
        <h1 style="margin:0;font-size:clamp(26px,4vw,38px);line-height:1.12;letter-spacing:-0.02em;font-weight:700;">${esc(r.title)}</h1>
        <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin-top:16px;font-family:var(--mono);font-size:12px;color:var(--t-muted);">
          <span>${esc(r.domain)}</span><span style="color:var(--sep);">·</span>
          <span>${esc(r.published_label)}</span><span style="color:var(--sep);">·</span>
          <span style="color:var(--t-label);">★ ${avg > 0 ? avg.toFixed(1) : '—'}</span><span style="color:var(--sep);">·</span>
          <span>▲ ${r.score}</span>
        </div>
        <p style="margin:26px 0 0;font-size:17px;line-height:1.65;color:var(--t-2);">${esc(desc)}</p>
        ${tags ? `<div style="display:flex;gap:7px;flex-wrap:wrap;margin-top:24px;">${tags}</div>` : ''}
        <div style="display:flex;align-items:center;gap:12px;flex-wrap:wrap;margin-top:34px;">
          <a href="${esc(r.url)}" target="_blank" rel="noopener" class="h-lift" style="display:inline-flex;align-items:center;gap:8px;padding:14px 24px;background:var(--t-1);color:var(--bg);border-radius:10px;font-size:14.5px;font-weight:600;text-decoration:none;">Read the original ↗</a>
          <a href="../Library.html#id=${encodeURIComponent(r.id)}" class="h-bd" style="display:inline-flex;align-items:center;padding:14px 22px;background:transparent;color:var(--t-1);border:1px solid var(--line3);border-radius:10px;font-size:14.5px;font-weight:500;text-decoration:none;">Rate &amp; discuss →</a>
        </div>
      </article>

      <div style="padding:24px 0 60px;border-top:1px solid var(--line);font-family:var(--mono);font-size:11px;color:var(--t-faint);">
        An open, community-curated reading in <a href="../index.html" style="color:var(--t-muted);">AI Commons for Education</a>. Open access · CC BY 4.0
      </div>
    </div>
  </div>
</body>
</html>
`;
}

function sitemap(readings) {
  const urls = [`${ORIGIN}/`, `${ORIGIN}/Library.html`]
    .concat(readings.map(r => `${ORIGIN}/r/${encodeURIComponent(r.id)}.html`));
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemap.org/schemas/sitemap/0.9">\n` +
    urls.map(u => `  <url><loc>${u}</loc></url>`).join('\n') + `\n</urlset>\n`;
}

async function fetchLive() {
  const h = { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` };
  const q = `${SUPABASE_URL}/rest/v1/readings?status=eq.approved&select=*&order=created_at.desc`;
  const [reads, cats] = await Promise.all([
    fetch(q, { headers: h }).then(r => r.json()),
    fetch(`${SUPABASE_URL}/rest/v1/reading_categories?select=key,label`, { headers: h }).then(r => r.json()),
  ]);
  const labels = Object.fromEntries(cats.map(c => [c.key, c.label]));
  return reads.map(r => ({ ...r, cat_label: labels[r.cat] || r.cat }));
}

async function main() {
  const dataArg = process.argv.indexOf('--data');
  let readings;
  if (dataArg !== -1) {
    readings = JSON.parse(readFileSync(process.argv[dataArg + 1], 'utf8'));
  } else {
    readings = await fetchLive();
  }
  if (!Array.isArray(readings) || !readings.length) {
    console.error('No readings to build — leaving existing pages untouched.');
    process.exit(1);
  }
  mkdirSync(join(ROOT, 'r'), { recursive: true });
  for (const r of readings) writeFileSync(join(ROOT, 'r', `${r.id}.html`), page(r));
  writeFileSync(join(ROOT, 'sitemap.xml'), sitemap(readings));
  console.log(`Built ${readings.length} reading pages + sitemap.xml`);
}

main().catch(e => { console.error(e); process.exit(1); });
