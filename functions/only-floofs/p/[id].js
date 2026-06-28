// Cloudflare Pages Function: server-renders a shared post page for
// dumhawk.com/only-floofs/p/{id} with per-post SEO + Open Graph tags, so a pasted
// link unfurls with the pet's photo + name (crawlers don't run JS, so the static
// site can't do this) AND so Google can index each pet as its own page.
//
// On iOS with the app installed, the universal link is intercepted before this
// loads; this serves everyone else (desktop, Android, browsers, link-preview and
// search bots) and returns a true 200.
//
// This page is the #1 viral surface: a friend taps a shared floof from a text and
// lands here. It is designed to feel like a finished product, not a fallback page:
// a branded header, the pet photo as a hero card with its name + love overlaid,
// a bold install CTA above the fold, and a short value pitch. It mirrors the
// dumhawk.com/only-floofs landing styling so the brand reads as one polished whole.
// Breed lives in the SEO meta only (title/description/JSON-LD) so search indexing
// isn't hurt; the visible card leads with social proof, not a spec.
//
// SEO specifics handled here (these were the gaps that kept Google from indexing
// shared pets as distinct pages):
//   - per-post <link rel="canonical"> and og:url (was: same /only-floofs/ for all)
//   - rich, unique <title> + meta description per pet (name + breed)
//   - JSON-LD structured data (ImageObject + a SoftwareApplication "install" hook)
//   - Apple Smart App Banner so mobile Safari visitors get a one-tap install
//   - robots: index found posts, noindex dead/unknown ids (no thin pages indexed)
//
// Copy rule: no em/en dashes anywhere a user can see (brand style); use commas,
// periods, or middots instead.
//
// Deploy: this file lives at  functions/only-floofs/p/[id].js  in the GitHub repo
// Cloudflare Pages builds dumhawk.com from. The copy in the Only-Paws repo
// (infra/cloudflare/...) is the source of record and must be kept in sync.

const API = "https://d36iyq17my087a.cloudfront.net";
const APP_ID = "6781334218";
const APPSTORE = `https://apps.apple.com/app/only-floofs/id${APP_ID}`;
const SITE = "https://dumhawk.com";
const ICON = `${SITE}/apple-touch-icon.png`;
const BADGE = "https://tools.applemediaservices.com/api/badges/download-on-the-app-store/black/en-us?size=250x83";

const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) =>
  ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

function page(post, canonical) {
  const pet = post?.pet || {};
  const name = pet.name || "A floof";
  const breed = pet.breed || "";
  const species = pet.species || "";
  // og:image prefers the branded share card (photo + wordmark) for the unfurl;
  // the visible hero uses the RAW photo so it doesn't double up with this page's
  // own branding.
  const ogImg = post?.cardURL || post?.imageURL || post?.thumbURL || `${SITE}/assets/floofs/loki-main.jpg`;
  const photo = post?.imageURL || post?.thumbURL || ogImg;
  const hearts = (post?.hearts || 0).toLocaleString();
  const likes = (post?.likes || 0).toLocaleString();

  // The <title> keeps the breed: it powers the browser tab + Google result snippet,
  // where "name (breed)" is uniquely searchable. The SOCIAL card title (og/twitter)
  // leads with the pet so a shared link reads warm and human, not like a spec sheet.
  const descr = breed ? breed : (species || "pet");
  const pageTitle = post ? `${name} (${descr}) on Only Floofs` : "Only Floofs · Where pets become famous";
  const cardTitle = post ? `Meet ${name} on Only Floofs 🐾` : "Only Floofs · Where pets become famous";
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

  const features = `
    <ul class="feat">
      <li><span>🐾</span><div>A never-ending feed of the internet's cutest cats and dogs.</div></li>
      <li><span>❤️</span><div>Heart and follow the floofs you love, all in one place.</div></li>
      <li><span>⭐</span><div>Post your own pet and watch it climb the leaderboards.</div></li>
    </ul>`;

  const hero = post ? `
  <div class="hero">
    <img class="heroImg" src="${esc(photo)}" alt="${esc(name)}${breed ? esc(` the ${breed}`) : ""}" width="440" height="440">
    <div class="heroScrim"></div>
    <span class="heroPill">Only Floofs</span>
    <div class="heroName">${esc(name)}</div>
  </div>
  <div class="chips">
    <span class="chip">❤️ <b>${hearts}</b> hearts</span>
    <span class="chip">🐾 <b>${likes}</b> likes</span>
  </div>
  <a class="cta" href="${esc(APPSTORE)}">Get Only Floofs free</a>
  <a class="badge" href="${esc(APPSTORE)}" aria-label="Download Only Floofs on the App Store"><img src="${BADGE}" alt="Download on the App Store"></a>
  <div class="card">
    <div class="cardTitle">Why you'll love it</div>
    ${features}
  </div>
  <p class="closer">Free on the App Store. New floofs every day.</p>` : `
  <h1 class="big">Meet the cutest pets on the internet.</h1>
  <p class="lead">Get Only Floofs to see this floof, heart it, follow along, and make your own pet famous.</p>
  <a class="cta" href="${esc(APPSTORE)}">Get Only Floofs free</a>
  <a class="badge" href="${esc(APPSTORE)}" aria-label="Download Only Floofs on the App Store"><img src="${BADGE}" alt="Download on the App Store"></a>
  <div class="card">
    <div class="cardTitle">Why you'll love it</div>
    ${features}
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
*{box-sizing:border-box}html,body{margin:0}
body{font:16px/1.6 -apple-system,BlinkMacSystemFont,"SF Pro Text","Segoe UI",Roboto,Helvetica,Arial,sans-serif;color:#f2f2f7;
 background:
  radial-gradient(1100px 520px at 50% -8%, rgba(219,62,177,.22), transparent 60%),
  radial-gradient(820px 460px at 50% 2%, rgba(65,182,230,.14), transparent 55%),
  #0b0b0f;
 background-attachment:fixed;min-height:100vh}
.wrap{max-width:440px;margin:0 auto;padding:26px 20px 48px}
.brand{display:flex;align-items:center;gap:10px;margin-bottom:22px}
.brand img{width:34px;height:34px;border-radius:9px;box-shadow:0 4px 14px rgba(219,62,177,.45)}
.brand span{font-size:18px;font-weight:800;letter-spacing:.3px;color:#fff}
.hero{position:relative;border-radius:24px;overflow:hidden;border:1px solid rgba(255,255,255,.08);box-shadow:0 22px 60px rgba(0,0,0,.55)}
.heroImg{display:block;width:100%;aspect-ratio:1/1;object-fit:cover}
.heroScrim{position:absolute;inset:0;background:linear-gradient(to bottom,transparent 50%,rgba(0,0,0,.78))}
.heroPill{position:absolute;top:14px;left:14px;font-size:11px;font-weight:800;letter-spacing:.5px;text-transform:uppercase;color:#fff;
 background:linear-gradient(90deg,#db3eb1,#41b6e6);padding:5px 11px;border-radius:999px;box-shadow:0 4px 12px rgba(0,0,0,.3)}
.heroName{position:absolute;left:18px;right:18px;bottom:16px;font-size:30px;font-weight:800;letter-spacing:-.3px;color:#fff;text-shadow:0 2px 12px rgba(0,0,0,.5)}
.chips{display:flex;gap:10px;justify-content:center;flex-wrap:wrap;margin:18px 0 22px}
.chip{font-size:15px;color:#dcdce4;background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.10);padding:8px 14px;border-radius:999px}
.chip b{color:#fff;font-weight:800}
.cta{display:block;text-align:center;padding:16px;border-radius:16px;font-size:17px;font-weight:800;color:#fff;text-decoration:none;
 background:linear-gradient(90deg,#db3eb1,#41b6e6);box-shadow:0 10px 26px rgba(219,62,177,.38)}
.cta:hover{opacity:.95}
.badge{display:block;text-align:center;margin-top:14px;line-height:0}
.badge img{height:48px;width:auto}
.card{margin-top:26px;background:#15151b;border:1px solid #23232c;border-radius:18px;padding:20px 22px}
.cardTitle{font-size:13px;font-weight:800;letter-spacing:.5px;text-transform:uppercase;color:#9a93ad;margin-bottom:8px}
.feat{margin:0;padding:0;list-style:none}
.feat li{display:flex;gap:12px;align-items:flex-start;margin:14px 0;color:#e6e6ee;font-size:15px;line-height:1.45}
.feat li:first-child{margin-top:6px}.feat li:last-child{margin-bottom:0}
.feat li span{font-size:18px;line-height:1.35;flex:none}
.big{font-size:30px;line-height:1.15;letter-spacing:-.4px;color:#fff;text-align:center;margin:6px 0 10px}
.lead{text-align:center;color:#b6b6c2;font-size:16px;margin:0 0 22px}
.closer{text-align:center;color:#8e8e9a;font-size:13px;margin-top:20px}
.muted{text-align:center;color:#8e8e9a;font-size:13px;margin-top:26px}
a{color:#b9a3ff;text-decoration:none}
</style></head><body><div class="wrap">
<div class="brand"><img src="${ICON}" alt="Only Floofs"><span>Only Floofs</span></div>
${hero}
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
