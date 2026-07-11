// Cloudflare Pages Function: serves https://dumhawk.com/sitemap.xml
//
// Why: the site had no sitemap, so Google had no map of the Only Floofs pages or
// the per-pet share pages — a big reason nothing was getting indexed. This
// generates one dynamically: the static marketing/legal pages plus every public
// pet (pulled live from the feed API), each as /only-floofs/p/{id}.
//
// Route: a file named  functions/sitemap.xml.js  is served at  /sitemap.xml .
// Deploy: drop this in the GitHub repo Cloudflare Pages builds dumhawk.com from.
// The copy in the Only-Paws repo (infra/cloudflare/...) is the source of record.
//
// NOTE on robots.txt: if Cloudflare's "Manage robots.txt" (AI Crawl Control) is
// enabled for the zone, it serves /robots.txt at the edge and overrides any file
// in the repo. Make sure that managed robots.txt allows `search` and add this
// sitemap, OR disable the managed feature so functions/robots.txt.js is served.

const SITE = "https://dumhawk.com";
const API = "https://d36iyq17my087a.cloudfront.net";

// Static pages worth indexing, with a rough priority + change cadence.
const STATIC = [
  { loc: `${SITE}/only-floofs/`, priority: "1.0", changefreq: "daily" },
  { loc: `${SITE}/only-floofs/cats`, priority: "0.9", changefreq: "daily" },
  { loc: `${SITE}/only-floofs/dogs`, priority: "0.9", changefreq: "daily" },
  { loc: `${SITE}/not-only-paws`, priority: "0.8", changefreq: "weekly" },
  // Extensionless canonical URLs: Cloudflare 301-redirects the .html versions to
  // these, so listing .html made Google report "Page with redirect."
  { loc: `${SITE}/only-floofs/support`, priority: "0.3", changefreq: "monthly" },
  { loc: `${SITE}/only-floofs/privacy`, priority: "0.2", changefreq: "yearly" },
  { loc: `${SITE}/only-floofs/terms`, priority: "0.2", changefreq: "yearly" },
];

const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) =>
  ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const slugify = (s) => String(s ?? "").toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");

async function fetchPosts(limit = 2000) {
  // Page through the public feed until we run out or hit the cap. Keeps the
  // sitemap bounded so the function never runs long.
  const out = [];
  const PAGE = 100;
  for (let offset = 0; offset < limit; offset += PAGE) {
    let batch;
    try {
      const r = await fetch(`${API}/feed?limit=${PAGE}&offset=${offset}`, { cf: { cacheTtl: 300 } });
      if (!r.ok) break;
      batch = await r.json();
    } catch { break; }
    if (!Array.isArray(batch) || batch.length === 0) break;
    for (const p of batch) if (p?.id) out.push(p);
    if (batch.length < PAGE) break;
  }
  return out;
}

export const onRequestGet = async () => {
  const posts = await fetchPosts();
  const urls = [];

  for (const s of STATIC) {
    urls.push(`<url><loc>${esc(s.loc)}</loc><changefreq>${s.changefreq}</changefreq><priority>${s.priority}</priority></url>`);
  }
  const breedCount = new Map();
  const speciesCount = new Map();
  for (const p of posts) {
    const loc = `${SITE}/only-floofs/p/${encodeURIComponent(p.id)}`;
    const lastmod = p.createdAt ? new Date(p.createdAt).toISOString().slice(0, 10) : null;
    // Image extension: hand Google the actual pet photo for each page so the
    // cute cats/dogs surface in Image search, not just the web page.
    const img = p.thumbURL || p.imageURL || p.pet?.avatarURL || null;
    const petName = p.pet?.name || p.name || "";
    const imgXml = img
      ? `<image:image><image:loc>${esc(img)}</image:loc>${petName ? `<image:title>${esc(petName)} on Only Floofs</image:title>` : ""}</image:image>`
      : "";
    urls.push(
      `<url><loc>${esc(loc)}</loc>${lastmod ? `<lastmod>${lastmod}</lastmod>` : ""}<changefreq>weekly</changefreq><priority>0.6</priority>${imgXml}</url>`
    );
    const breed = p.pet?.breed || p.breed;
    if (breed) { const s = slugify(breed); if (s) breedCount.set(s, (breedCount.get(s) || 0) + 1); }
    const sp = String(p.species || p.pet?.species || "").toLowerCase();
    if (sp && sp !== "cat" && sp !== "dog" && sp !== "other") { const ss = slugify(sp); if (ss) speciesCount.set(ss, (speciesCount.get(ss) || 0) + 1); }
  }

  // Breed gallery pages, but only breeds with enough photos to be a real page
  // (the breed function noindexes thin ones anyway; keep them out of the sitemap).
  for (const [slug, n] of breedCount) {
    if (n < 3) continue;
    urls.push(`<url><loc>${esc(`${SITE}/only-floofs/breed/${slug}`)}</loc><changefreq>weekly</changefreq><priority>0.7</priority></url>`);
  }
  // Per-species "animals" pages (reptiles, birds, …) with enough photos.
  for (const [slug, n] of speciesCount) {
    if (n < 3) continue;
    urls.push(`<url><loc>${esc(`${SITE}/only-floofs/animals/${slug}`)}</loc><changefreq>weekly</changefreq><priority>0.7</priority></url>`);
  }

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">
${urls.join("\n")}
</urlset>`;

  return new Response(xml, {
    headers: {
      "content-type": "application/xml; charset=utf-8",
      "cache-control": "public, max-age=600, s-maxage=3600",
    },
  });
};
