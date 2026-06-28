// Cloudflare Pages Function: server-renders a shared post page for
// dumhawk.com/only-floofs/p/{id} with per-post SEO + Open Graph tags, so a pasted
// link unfurls with the pet's photo + name (crawlers don't run JS, so the static
// site can't do this) AND so Google can index each pet as its own page.
//
// On iOS with the app installed, the universal link is intercepted before this
// loads; this serves everyone else (desktop, Android, browsers, link-preview and
// search bots) and returns a true 200.
//
// DESIGN: this is a phone-sized "bite", NOT a mini website. A friend taps a shared
// floof from a text and sees one tidy card: the pet's photo, name, and love, plus a
// single install CTA. No scrolling marketing page. The pet is the star.
//
// Robustness: the pet is the whole point of the link, so we never want a transient
// API blip to drop it. We retry the fetch once and we do NOT edge-cache the no-pet
// fallback, so a shared pet can never freeze on the generic page.
//
// SEO (kept in <head> only; the visible card stays a bite):
//   - per-post <link rel="canonical"> + og:url, unique <title>/description (name+breed)
//   - JSON-LD ImageObject + a SoftwareApplication install hook
//   - Apple Smart App Banner; robots: index real posts, noindex unknown ids
//
// Copy: the install CTA intentionally uses an em dash ("Get Only Floofs — Free").
//
// Deploy: this file lives at  functions/only-floofs/p/[id].js  in the GitHub repo
// Cloudflare Pages builds dumhawk.com from. The copy in the Only-Paws repo
// (infra/cloudflare/...) is the source of record and must be kept in sync.

const API = "https://d36iyq17my087a.cloudfront.net";
const APP_ID = "6781334218";
const APPSTORE = `https://apps.apple.com/app/only-floofs/id${APP_ID}`;
const SITE = "https://dumhawk.com";
const ICON = `${SITE}/apple-touch-icon.png`;

const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) =>
  ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

function page(post, canonical) {
  const pet = post?.pet || {};
  const name = pet.name || "A floof";
  const breed = pet.breed || "";
  const species = pet.species || "";
  // og:image prefers the branded share card (photo + wordmark) for the unfurl;
  // the visible card uses the RAW photo.
  const ogImg = post?.cardURL || post?.imageURL || post?.thumbURL || `${SITE}/assets/floofs/loki-main.jpg`;
  const photo = post?.imageURL || post?.thumbURL || ogImg;
  const hearts = (post?.hearts || 0).toLocaleString();
  const likes = (post?.likes || 0).toLocaleString();

  // <title> keeps the breed (search snippet). The social card title leads with the pet.
  const descr = breed ? breed : (species || "pet");
  const pageTitle = post ? `${name} (${descr}) on Only Floofs` : "Only Floofs · Where pets become famous";
  const cardTitle = post ? `Meet ${name} on Only Floofs 🐾` : "Only Floofs · Where pets become famous";
  const desc = post
    ? `${name} has ${hearts} hearts and ${likes} likes on Only Floofs. Join the home of the internet's cutest pets, heart your favorites, and make your own pet famous.`
    : "An endless feed of the internet's cutest pets. Heart your favorites, follow the floofs you love, and make your own pet famous.";

  const robots = post ? "index,follow" : "noindex,follow";

  const ld = post ? {
    "@context": "https://schema.org",
    "@type": "ImageObject",
    "name": `${name}${breed ? ` the ${breed}` : ""}`,
    "description": desc,
    "contentUrl": photo,
    "thumbnailUrl": post?.thumbURL || photo,
    "url": canonical,
    "creditText": "Only Floofs",
    "isPartOf": {
      "@type": "MobileApplication",
      "name": "Only Floofs",
      "applicationCategory": "PhotoApplication",
      "operatingSystem": "iOS",
      "installUrl": APPSTORE,
      "offers": { "@type": "Offer", "price": "0", "priceCurrency": "USD" }
    }
  } : null;

  const card = post ? `
  <div class="card">
    <div class="brand"><img src="${ICON}" alt=""><span>Only Floofs</span></div>
    <div class="frame">
      <img class="photo" src="${esc(photo)}" alt="${esc(name)}${breed ? esc(` the ${breed}`) : ""}" width="360" height="360">
      <div class="scrim"></div>
      <span class="tag">Only Floofs</span>
      <div class="meta">
        <div class="name">${esc(name)}</div>
        <div class="stats"><span>❤️ <b>${hearts}</b></span><span>🐾 <b>${likes}</b></span></div>
      </div>
    </div>
    <a class="cta" href="${esc(APPSTORE)}">Get Only Floofs — Free</a>
    <p class="sub">Free on the App Store. Tap to meet ${esc(name)} and more.</p>
  </div>` : `
  <div class="card">
    <div class="brand"><img src="${ICON}" alt=""><span>Only Floofs</span></div>
    <h1 class="headline">Meet the cutest pets on the internet.</h1>
    <a class="cta" href="${esc(APPSTORE)}">Get Only Floofs — Free</a>
    <p class="sub">Free on the App Store.</p>
  </div>`;

  return `<!DOCTYPE html><html lang="en"><head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="color-scheme" content="dark">
<link rel="icon" href="${SITE}/favicon.svg" type="image/svg+xml">
<link rel="apple-touch-icon" href="${ICON}">
<title>${esc(pageTitle)}</title>
<meta name="description" content="${esc(desc)}">
<meta name="robots" content="${robots}">
<link rel="canonical" href="${esc(canonical)}">
<meta name="apple-itunes-app" content="app-id=${APP_ID}, app-clip-bundle-id=com.onlyfloofs.app.Clip">
<meta property="og:site_name" content="Only Floofs">
<meta property="og:title" content="${esc(cardTitle)}">
<meta property="og:description" content="${esc(desc)}">
<meta property="og:type" content="website">
<meta property="og:image" content="${esc(ogImg)}">
<meta property="og:image:alt" content="${esc(name)}${breed ? esc(` the ${breed}`) : ""}">
<meta property="og:url" content="${esc(canonical)}">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${esc(cardTitle)}">
<meta name="twitter:description" content="${esc(desc)}">
<meta name="twitter:image" content="${esc(ogImg)}">
${ld ? `<script type="application/ld+json">${JSON.stringify(ld)}</script>` : ""}
<style>
*{box-sizing:border-box}html,body{margin:0;height:100%}
body{font:16px/1.55 -apple-system,BlinkMacSystemFont,"SF Pro Text","Segoe UI",Roboto,Helvetica,Arial,sans-serif;color:#f2f2f7;
 background:
  radial-gradient(900px 500px at 50% -10%, rgba(219,62,177,.22), transparent 60%),
  radial-gradient(700px 460px at 50% 4%, rgba(65,182,230,.14), transparent 55%),
  #0b0b0f;
 min-height:100vh;display:flex;align-items:center;justify-content:center;padding:22px}
.card{width:100%;max-width:360px;text-align:center}
.brand{display:inline-flex;align-items:center;gap:8px;margin-bottom:16px}
.brand img{width:28px;height:28px;border-radius:8px;box-shadow:0 3px 10px rgba(219,62,177,.45)}
.brand span{font-size:15px;font-weight:800;letter-spacing:.3px;color:#fff}
.frame{position:relative;border-radius:24px;overflow:hidden;border:1px solid rgba(255,255,255,.08);box-shadow:0 22px 60px rgba(0,0,0,.55)}
.photo{display:block;width:100%;aspect-ratio:1/1;object-fit:cover}
.scrim{position:absolute;inset:0;background:linear-gradient(to bottom,transparent 46%,rgba(0,0,0,.82))}
.tag{position:absolute;top:12px;left:12px;font-size:10px;font-weight:800;letter-spacing:.5px;text-transform:uppercase;color:#fff;
 background:linear-gradient(90deg,#db3eb1,#41b6e6);padding:4px 10px;border-radius:999px;box-shadow:0 3px 10px rgba(0,0,0,.3)}
.meta{position:absolute;left:16px;right:16px;bottom:14px;text-align:left}
.name{font-size:27px;font-weight:800;letter-spacing:-.3px;color:#fff;text-shadow:0 2px 12px rgba(0,0,0,.55);margin-bottom:7px}
.stats{display:flex;gap:14px;font-size:14px;color:#fff}
.stats b{font-weight:800}
.headline{font-size:24px;font-weight:800;letter-spacing:-.3px;color:#fff;margin:18px 0 4px}
.cta{display:block;margin-top:18px;padding:15px 18px;border-radius:14px;font-size:17px;font-weight:800;color:#fff;text-decoration:none;
 background:linear-gradient(90deg,#db3eb1,#41b6e6);box-shadow:0 10px 26px rgba(219,62,177,.38)}
.cta:hover{opacity:.95}
.sub{margin:12px 0 0;color:#9a93ad;font-size:12.5px}
a{color:#b9a3ff;text-decoration:none}
</style></head><body>${card}</body></html>`;
}

async function fetchPost(id) {
  const url = `${API}/posts/${encodeURIComponent(id)}`;
  try {
    // Cache hits briefly; never edge-cache errors (a transient 404/5xx/rate-limit must
    // not poison the share card). On any failure, retry once fresh (bypassing the edge
    // cache) so a shared pet still resolves to its real photo + name.
    let r = await fetch(url, { cf: { cacheTtlByStatus: { "200-299": 60, "404": 5, "500-599": 0 } } });
    if (!r.ok) r = await fetch(url + (url.includes("?") ? "&" : "?") + "_r=1", { cf: { cacheTtl: 0 } });
    if (r.ok) return await r.json();
  } catch { /* fall through to the generic brand page */ }
  return null;
}

export const onRequestGet = async ({ params }) => {
  const id = params?.id ? decodeURIComponent(params.id) : null;
  const canonical = `${SITE}/only-floofs/p/${encodeURIComponent(id || "")}`;
  const post = id ? await fetchPost(id) : null;
  // A real pet page edge-caches; the generic fallback caches only briefly so a
  // transient API blip can never freeze a shared pet on the no-pet page.
  const cache = post ? "public, max-age=60, s-maxage=300" : "public, max-age=10, s-maxage=10";
  return new Response(page(post, canonical), {
    headers: { "content-type": "text/html; charset=utf-8", "cache-control": cache },
  });
};
