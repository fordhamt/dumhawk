// Cloudflare Pages Function: server-renders a shared post page for
// dumhawk.com/only-floofs/p/{id} with per-post SEO + Open Graph tags, so a pasted
// link unfurls with the pet's photo + name (crawlers don't run JS, so the static
// site can't do this) AND so Google can index each pet as its own page.
//
// On iOS with the app installed, the universal link is intercepted before this
// loads; this serves everyone else (desktop, Android, browsers, link-preview and
// search bots) and returns a true 200.
//
// This page is also the #1 viral surface: a friend taps a shared floof and should
// IMMEDIATELY see how loved it is and a one-tap way to get the app. So the layout
// leads with the photo, shows hearts/likes as social proof (not a breed spec), and
// puts a bold "Get the app" CTA above the fold. Breed stays in the SEO meta only
// (title/description/JSON-LD) so search indexing isn't hurt.
//
// SEO specifics handled here (these were the gaps that kept Google from indexing
// shared pets as distinct pages):
//   - per-post <link rel="canonical"> and og:url (was: same /only-floofs/ for all)
//   - rich, unique <title> + meta description per pet (name + breed)
//   - JSON-LD structured data (ImageObject + a SoftwareApplication "install" hook)
//   - Apple Smart App Banner so mobile Safari visitors get a one-tap install
//   - robots: index found posts, noindex dead/unknown ids (no thin pages indexed)
//
// Deploy: this file lives at  functions/only-floofs/p/[id].js  in the GitHub repo
// Cloudflare Pages builds dumhawk.com from. The copy in the Only-Paws repo
// (infra/cloudflare/...) is the source of record and must be kept in sync.

const API = "https://d36iyq17my087a.cloudfront.net";
const APP_ID = "6781334218";
const APPSTORE = `https://apps.apple.com/app/only-floofs/id${APP_ID}`;
const SITE = "https://dumhawk.com";
const BADGE = "https://tools.applemediaservices.com/api/badges/download-on-the-app-store/black/en-us?size=250x83";

const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) =>
  ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

function page(post, canonical) {
  const pet = post?.pet || {};
  const name = pet.name || "A floof";
  const breed = pet.breed || "";
  const species = pet.species || "";
  // Prefer the branded share card (photo + Only Floofs pill + name) for the unfurl;
  // fall back to the raw photo for posts uploaded before cards existed.
  const img = post?.cardURL || post?.imageURL || post?.thumbURL || `${SITE}/assets/floofs/loki-main.jpg`;
  const photo = post?.imageURL || post?.thumbURL || img;
  const hearts = (post?.hearts || 0).toLocaleString();
  const likes = (post?.likes || 0).toLocaleString();

  // The <title> keeps the breed: it powers the browser tab + Google result snippet,
  // where "name (breed)" is uniquely searchable. The SOCIAL card title (og/twitter)
  // leads with the pet so a shared link reads warm and human, not like a spec sheet.
  const descr = breed ? breed : (species || "pet");
  const pageTitle = post ? `${name} (${descr}) on Only Floofs` : "Only Floofs — Where pets become famous";
  const cardTitle = post ? `Meet ${name} on Only Floofs 🐾` : "Only Floofs — Where pets become famous";
  const desc = post
    ? `${name} has ${hearts} hearts and ${likes} likes on Only Floofs. Join the home of the internet's cutest cats and dogs, heart your favorites, and make your own pet famous.`
    : "An endless feed of the internet's cutest cats and dogs. Heart your favorites, follow the floofs you love, and make your own pet famous.";

  // Index real posts; keep unknown/dead ids out of the index (no thin pages).
  const robots = post ? "index,follow" : "noindex,follow";

  // Structured data: the shared image as an ImageObject, plus a clear link to the
  // app so Google can associate the page with the iOS app.
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

  return `<!DOCTYPE html><html lang="en"><head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="color-scheme" content="dark">
<title>${esc(pageTitle)}</title>
<meta name="description" content="${esc(desc)}">
<meta name="robots" content="${robots}">
<link rel="canonical" href="${esc(canonical)}">
<meta name="apple-itunes-app" content="app-id=${APP_ID}, app-clip-bundle-id=com.onlyfloofs.app.Clip">
<meta property="og:site_name" content="Only Floofs">
<meta property="og:title" content="${esc(cardTitle)}">
<meta property="og:description" content="${esc(desc)}">
<meta property="og:type" content="website">
<meta property="og:image" content="${esc(img)}">
<meta property="og:image:alt" content="${esc(name)}${breed ? esc(` the ${breed}`) : ""}">
<meta property="og:url" content="${esc(canonical)}">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${esc(cardTitle)}">
<meta name="twitter:description" content="${esc(desc)}">
<meta name="twitter:image" content="${esc(img)}">
${ld ? `<script type="application/ld+json">${JSON.stringify(ld)}</script>` : ""}
<style>
*{box-sizing:border-box}html,body{margin:0;background:#0b0b0f}
body{font:16px/1.6 -apple-system,BlinkMacSystemFont,"SF Pro Text","Segoe UI",Roboto,Helvetica,Arial,sans-serif;color:#f2f2f7}
.wrap{max-width:480px;margin:0 auto;padding:28px 22px 40px;text-align:center}
.pill{display:inline-block;font-size:12px;font-weight:700;letter-spacing:.4px;text-transform:uppercase;color:#fff;
 background:linear-gradient(90deg,#db3eb1,#41b6e6);padding:5px 13px;border-radius:999px;margin-bottom:18px}
.photo{width:100%;max-width:300px;aspect-ratio:1/1;object-fit:cover;border-radius:20px;border:1px solid #23232c;display:block;margin:0 auto}
.name{font-size:26px;font-weight:800;color:#fff;margin:16px 0 8px}
.stats{display:flex;gap:18px;justify-content:center;align-items:center;font-size:17px;color:#d6d6df;margin-bottom:18px}
.stats b{color:#fff;font-weight:800}
.btn{display:block;max-width:320px;margin:0 auto;padding:15px 22px;border-radius:14px;font-size:17px;font-weight:800;color:#fff;
 background:linear-gradient(90deg,#db3eb1,#41b6e6);box-shadow:0 8px 22px rgba(219,62,177,.35)}
.tagline{color:#b6b6c2;font-size:14px;max-width:340px;margin:16px auto 0}
.badge{display:inline-block;margin-top:14px}.badge img{height:46px}
a{color:#b9a3ff;text-decoration:none}.muted{color:#8e8e9a;font-size:13px;margin-top:26px}
</style></head><body><div class="wrap">
<span class="pill">Only Floofs</span>
${post ? `
<img class="photo" src="${esc(img)}" alt="${esc(name)}${breed ? esc(` the ${breed}`) : ""}" width="300" height="300">
<h1 class="name">${esc(name)}</h1>
<div class="stats"><span>❤️ <b>${hearts}</b> hearts</span><span>🐾 <b>${likes}</b> likes</span></div>
<a class="btn" href="${esc(APPSTORE)}">Get Only Floofs — Free</a>
<p class="tagline">See ${esc(name)} and thousands more pets. Heart your favorites and make your own floof famous.</p>
<a class="badge" href="${esc(APPSTORE)}"><img src="${BADGE}" alt="Download Only Floofs on the App Store"></a>` : `
<h1 class="name">Meet the cutest pets on the internet.</h1>
<p class="tagline">Get Only Floofs to see this floof, heart it, and follow along.</p>
<a class="btn" href="${esc(APPSTORE)}">Get Only Floofs — Free</a>
<a class="badge" href="${esc(APPSTORE)}"><img src="${BADGE}" alt="Download Only Floofs on the App Store"></a>`}
<p class="muted"><a href="${SITE}/only-floofs/">Only Floofs</a> · <a href="${SITE}/only-floofs/support.html">Support</a></p>
</div></body></html>`;
}

export const onRequestGet = async ({ params, request }) => {
  const id = params?.id ? decodeURIComponent(params.id) : null;
  const canonical = `${SITE}/only-floofs/p/${encodeURIComponent(id || "")}`;
  let post = null;
  if (id) {
    try {
      const r = await fetch(`${API}/posts/${encodeURIComponent(id)}`, { cf: { cacheTtl: 60 } });
      if (r.ok) post = await r.json();
    } catch { /* fall through to the generic brand page */ }
  }
  return new Response(page(post, canonical), {
    headers: {
      "content-type": "text/html; charset=utf-8",
      // Edge-cache the rendered page; counts refresh within a few minutes.
      "cache-control": "public, max-age=60, s-maxage=300",
    },
  });
};
