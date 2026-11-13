const API = process.env.API_URL ?? 'http://localhost:8083/api/v1';
const pct = (arr, p) => { const s = [...arr].sort((a, b) => a - b); return s[Math.min(s.length - 1, Math.floor(p / 100 * s.length))]; };
const terms = ['honey', 'sidr honey', 'dates', 'ajwa', 'coffee', 'saffron', 'cardamom', 'oud', 'rose water', 'pistachio', 'hony', 'organic dates', ''];
const sorts = ['relevance', 'relevance', 'relevance', 'nearest', 'price_asc', 'price_desc'];
function randomQuery() {
  const p = new URLSearchParams({ limit: '24' });
  const t = terms[Math.floor(Math.random() * terms.length)]; if (t) p.set('q', t);
  if (Math.random() < 0.6) {
    p.set('lat', (21 + Math.random() * 5).toFixed(4)); p.set('lng', (39 + Math.random() * 16).toFixed(4));
    if (Math.random() < 0.4) p.set('radiusKm', String([10, 25, 50, 100][Math.floor(Math.random() * 4)]));
    p.set('sort', sorts[Math.floor(Math.random() * sorts.length)]);
  }
  if (Math.random() < 0.2) p.set('page', String(1 + Math.floor(Math.random() * 5)));
  return p;
}
async function run(total, concurrency, make) {
  const times = []; let errors = 0; let next = 0; const errSamples = [];
  const started = Date.now();
  await Promise.all(Array.from({ length: concurrency }, async () => {
    while (next < total) {
      next++;
      const t0 = performance.now();
      try { const r = await make(); if (!r.ok) { errors++; if (errSamples.length < 3) errSamples.push(r.status + ' ' + (await r.text()).slice(0, 120)); } else await r.arrayBuffer(); }
      catch (e) { errors++; errSamples.push(e.message); }
      times.push(performance.now() - t0);
    }
  }));
  const secs = (Date.now() - started) / 1000;
  return { requests: total, errors, rps: Math.round(total / secs), p50: Math.round(pct(times, 50)), p95: Math.round(pct(times, 95)), p99: Math.round(pct(times, 99)), max: Math.round(Math.max(...times)), errSamples };
}
(async () => {
  for (let i = 0; i < 20; i++) await fetch(`${API}/search/products?${randomQuery()}`); // warm up
  console.log('search, 2000 req @50 concurrent:', await run(2000, 50, () => fetch(`${API}/search/products?${randomQuery()}`)));
  console.log('nearby shops, 500 req @50:', await run(500, 50, () => fetch(`${API}/search/shops?lat=${(21 + Math.random() * 5).toFixed(3)}&lng=${(39 + Math.random() * 16).toFixed(3)}&radiusKm=50`)));
  console.log('product page, 1000 req @50:', await run(1000, 50, () => fetch(`${API}/products/pp${1 + Math.floor(Math.random() * 200)}_${1 + Math.floor(Math.random() * 99)}`)));
})();
