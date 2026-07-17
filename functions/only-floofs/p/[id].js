// Cloudflare Pages Function: server-renders a shared post page for
// dumhawk.com/only-floofs/p/{id} with per-post SEO + Open Graph tags, so a pasted
// link unfurls with the pet's photo + name (crawlers don't run JS, so the static
// site can't do this) AND so Google can index each pet as its own page.
//
// On iOS with the app installed, the universal link is intercepted before this
// loads; this serves everyone else (desktop, Android, browsers, link-preview and
// search bots) and returns a true 200.
//
// DESIGN: a phone-sized "bite" first — one tidy card: a small Only Floofs wordmark
// up top (the app icon, not the umbrella DUMHAWK mark), the pet photo with its name
// + love overlaid, and the official App Store badge. The brand name appears exactly
// ONCE (the header) so it reads clean, not spammy.
//
// Robustness: the pet is the whole point, so we retry the fetch and never cache the
// no-pet fallback, so a shared pet can't freeze on the generic page.
//
// SEO (2026-07-11 rewrite — WHY THIS CHANGED):
// The card used to be a bite and NOTHING else: SEO lived in <head> only, and the
// only unique text in the body was the pet's name and two counters. Google saw ~90
// near-identical templated pages on a young domain and refused them: Search Console
// showed 5 indexed vs 67 "Discovered - currently not indexed" (i.e. it found every
// URL from the sitemap and CHOSE not to index). That is a content judgment, not a
// plumbing bug — no amount of sitemap/IndexNow pinging fixes it.
//
// The API was already returning genuinely unique content we were throwing away:
// caption (the owner's own words!), altText, city/region, breed, createdAt,
// hallOfFame / lucky (Pet of the Day). So we now RENDER it: a real <h1>, the
// caption, a short factual "about" line, and richer JSON-LD. The card above it is
// untouched — the bite still reads as a bite; the substance sits under it.
//
// Thin-page gate: a pet with no caption, no breed, no bio and no location has
// nothing unique to say, so it is noindex,follow (still crawlable, still passes
// links, but it won't dilute the domain's quality signal). Better 40 real pages
// than 90 thin ones.
//
// Deploy: this file lives at  functions/only-floofs/p/[id].js  in the GitHub repo
// Cloudflare Pages builds dumhawk.com from. The copy in the Only-Paws repo
// (infra/cloudflare/...) is the source of record and must be kept in sync.

const API = "https://d36iyq17my087a.cloudfront.net";
const APP_ID = "6781334218";
const APPSTORE = `https://apps.apple.com/app/only-floofs/id${APP_ID}`;
const SITE = "https://dumhawk.com";
// The actual Only Floofs app icon (App Store artwork), not the DUMHAWK site icon.
const ICON = "https://is1-ssl.mzstatic.com/image/thumb/Purple211/v4/1f/13/e1/1f13e100-24bd-728e-a871-36814f0c9526/AppIcon-0-0-1x_U007epad-0-1-85-220.png/120x120bb.jpg";
// Official Apple "Download on the App Store" badge.
const BADGE = "https://tools.applemediaservices.com/api/badges/download-on-the-app-store/black/en-us?size=250x83";
// Stat icons in the app's brand colors (dark-theme variants): heart = flamingo pink,
// paw = mint/teal — so they match the in-app reaction colors instead of grey emoji.
const HEART = `<svg class="ic" viewBox="0 0 24 24" aria-hidden="true"><path fill="#FF4D86" d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/></svg>`;
const PAW = `<svg class="ic" viewBox="0 0 24 24" aria-hidden="true" fill="#1FEFC0"><ellipse cx="5.5" cy="11" rx="2" ry="2.6"/><ellipse cx="9.5" cy="6.8" rx="2" ry="2.7"/><ellipse cx="14.5" cy="6.8" rx="2" ry="2.7"/><ellipse cx="18.5" cy="11" rx="2" ry="2.6"/><path d="M12 11.4c-2.6 0-4.8 1.9-5.2 4.3-.3 1.7 1 3.3 2.7 3.3.9 0 1.7-.5 2.5-.5s1.6.5 2.5.5c1.7 0 3-1.6 2.7-3.3-.4-2.4-2.6-4.3-5.2-4.3z"/></svg>`;

const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) =>
  ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

// SECURITY: JSON.stringify does NOT escape "<" or "/", so any user-controlled string
// inside JSON-LD (a pet's name, and now the owner's caption) can close the script tag
// and inject markup — a stored XSS, since captions/names are user content. HTML-escaping
// would corrupt the JSON, so escape the three dangerous chars as \uXXXX, which is valid
// JSON, parses back to the identical string, and can never terminate a <script>.
const ldJson = (o) => JSON.stringify(o)
  .replace(/</g, "\\u003c")
  .replace(/>/g, "\\u003e")
  .replace(/&/g, "\\u0026");

// PRIVACY: OFF on purpose. The API publishes city/region and the app shows it, but
// putting a user's city into a Google-INDEXED page is a meaningfully bigger exposure
// than showing it in-app — a stranger could search a pet and get a town. The owner
// never consented to that. We give up a little per-page uniqueness for it; the
// caption + breed + Pet-of-the-Day facts carry enough on their own.
// Flip to true only if users are actually told their location becomes searchable.
const SHOW_LOCATION = false;

// NOTE: format in UTC on purpose. A date-only value like luckyDate "2026-07-09"
// parses as UTC midnight, so formatting it in a negative-offset local zone renders
// the PREVIOUS day ("July 8") — which would have quietly mis-dated every Pet of the
// Day. Workers run in UTC anyway; being explicit keeps it deterministic.
const fmtDate = (iso) => {
  try {
    const d = new Date(iso);
    return isNaN(d) ? "" : d.toLocaleDateString("en-US", {
      year: "numeric", month: "long", day: "numeric", timeZone: "UTC",
    });
  } catch { return ""; }
};

function page(post, canonical, related = [], rawOg = false) {
  const pet = post?.pet || {};
  const name = pet.name || "A floof";
  const breed = pet.breed || "";
  const species = pet.species || "";
  // The genuinely unique, human-written / per-photo fields the old template ignored.
  const caption = String(post?.caption || "").trim();
  const bio = String(pet?.bio || "").trim();
  const altText = String(post?.altText || "").trim();
  const place = SHOW_LOCATION
    ? [post?.city, post?.region].filter(Boolean).join(", ")
    : "";
  const posted = fmtDate(post?.createdAt);
  const potdDate = post?.lucky && post?.luckyDate ? fmtDate(post.luckyDate) : "";
  const hallOfFame = !!post?.hallOfFame;
  // The visible card always uses the RAW pet photo. og:image (what a pasted link
  // unfurls) defaults to the BRANDED share card so the wordmark travels — EXCEPT when
  // ?og=raw is set, which the app appends ONLY for r/onlyfloofs shares so Reddit gets
  // the plain photo (a branded card there reads like an ad; the sub prefers raw).
  const photo = post?.imageURL || post?.thumbURL || `${SITE}/assets/floofs/loki-main.jpg`;
  const ogImg = rawOg ? photo : (post?.cardURL || photo);
  const hearts = (post?.hearts || 0).toLocaleString();
  const likes = (post?.likes || 0).toLocaleString();

  // <title> keeps the breed (search snippet). The social card title leads with the pet.
  const descr = breed ? breed : (species || "pet");
  const pageTitle = post ? `${name} (${descr}) on Only Floofs` : "Only Floofs · Where pets become famous";
  const cardTitle = post ? `Meet ${name} on Only Floofs 🐾` : "Only Floofs · Where pets become famous";

  // The old description was a template with only the name + counters swapped in, so
  // ~90 pages shared one sentence. Lead with the owner's caption when there is one —
  // that is the most distinctive text on the page — then the real facts.
  const who = [breed, place && `from ${place}`].filter(Boolean).join(" ");
  const desc = post
    ? (caption
        ? `“${caption}” — ${name}${who ? `, a ${who}` : ""}, on Only Floofs. ${hearts} hearts, ${likes} likes.`
        : `${name} is a ${who || descr} on Only Floofs${posted ? `, shared ${posted}` : ""}. ${hearts} hearts, ${likes} likes.`)
    : "An endless feed of the internet's cutest pets. Heart your favorites, follow the floofs you love, and make your own pet famous.";

  // Thin-page gate: if a pet has nothing unique to say, keep it crawlable but out of
  // the index rather than let it drag the domain's quality signal down.
  const hasSubstance = !!(caption || breed || bio || place);
  const robots = post ? (hasSubstance ? "index,follow" : "noindex,follow") : "noindex,follow";

  const sp0 = String(species).toLowerCase();
  const ld = post ? {
    "@context": "https://schema.org",
    "@type": "ImageObject",
    "name": `${name}${breed ? ` the ${breed}` : ""}`,
    "description": desc,
    // The owner's own words + the per-photo alt text: the fields that make this
    // image distinguishable from the other ~90.
    ...(caption ? { "caption": caption } : {}),
    "representativeOfPage": true,
    "contentUrl": photo,
    "thumbnailUrl": post?.thumbURL || photo,
    "url": canonical,
    ...(posted ? { "uploadDate": post.createdAt, "datePublished": post.createdAt } : {}),
    ...(place ? {
      "contentLocation": {
        "@type": "Place",
        "name": place,
        "address": {
          "@type": "PostalAddress",
          ...(post?.city ? { "addressLocality": post.city } : {}),
          ...(post?.region ? { "addressRegion": post.region } : {}),
          ...(post?.country ? { "addressCountry": post.country } : {})
        }
      }
    } : {}),
    "about": {
      "@type": "Thing",
      "name": `${name}${breed ? `, a ${breed}` : ""}`,
      ...(bio ? { "description": bio } : {})
    },
    "interactionStatistic": [
      { "@type": "InteractionCounter", "interactionType": "https://schema.org/LikeAction", "userInteractionCount": post?.likes || 0 },
      { "@type": "InteractionCounter", "interactionType": "https://schema.org/CommentAction", "userInteractionCount": post?.comments || 0 }
    ],
    "creditText": "Only Floofs",
    "isPartOf": {
      "@type": "MobileApplication",
      "name": "Only Floofs",
      "applicationCategory": "PhotoApplication",
      "operatingSystem": "iOS",
      "installUrl": APPSTORE,
      "offers": { "@type": "Offer", "price": "0", "priceCurrency": "USD" },
      "author": { "@type": "Person", "name": "Paul Fordham" },
      "creator": { "@type": "Person", "name": "Paul Fordham" },
      "publisher": {
        "@type": "Organization",
        "name": "dumhawk",
        "url": SITE,
        "founder": { "@type": "Person", "name": "Paul Fordham" }
      }
    }
  } : null;

  // Breadcrumbs: gives Google a real site hierarchy (Search Console has a
  // Breadcrumbs enhancement report) and pushes crawl equity to the gallery hubs.
  const hubPath = sp0 === "cat" ? "/only-floofs/cats" : sp0 === "dog" ? "/only-floofs/dogs" : "/not-only-paws";
  const hubName = sp0 === "cat" ? "Cats" : sp0 === "dog" ? "Dogs" : "Other pets";
  const crumbs = post ? {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    "itemListElement": [
      { "@type": "ListItem", "position": 1, "name": "Only Floofs", "item": `${SITE}/only-floofs/` },
      { "@type": "ListItem", "position": 2, "name": hubName, "item": `${SITE}${hubPath}` },
      { "@type": "ListItem", "position": 3, "name": name, "item": canonical }
    ]
  } : null;

  const store = `<a class="store" href="${esc(APPSTORE)}" aria-label="Download Only Floofs on the App Store"><img src="${BADGE}" alt="Download on the App Store"></a>`;

  // ---- The substance Google was missing -------------------------------------
  // A real <h1>, the owner's caption, and a plain-English factual line. All built
  // from live per-pet data, so no two pages read the same. Written to sound like a
  // person describing their pet, not an SEO block.
  const facts = [];
  if (breed) facts.push(`${name} is a ${breed}`);
  else if (species) facts.push(`${name} is a ${species}`);
  if (place) facts[0] = `${facts[0] || name} from ${place}`;
  if (facts[0]) facts[0] += ".";
  if (potdDate) facts.push(`Pet of the Day on ${potdDate}.`);
  else if (hallOfFame) facts.push(`A Hall of Fame floof.`);
  if (posted) facts.push(`Shared ${posted}.`);

  const about = post ? `
  <section class="about">
    <h1>${esc(name)}${breed ? ` <span class="breed">the ${esc(breed)}</span>` : ""}</h1>
    ${caption ? `<blockquote class="cap">${esc(caption)}</blockquote>` : ""}
    ${facts.length ? `<p class="facts">${esc(facts.join(" "))}</p>` : ""}
    ${bio ? `<p class="bio">${esc(bio)}</p>` : ""}
    <p class="love">${hearts} hearts · ${likes} likes from the Only Floofs community.</p>
  </section>` : "";

  // Pinterest "Save" — pet photos are catnip on Pinterest (a visual search engine
  // that drives huge cute-cats/dog-pics traffic). One tap pins the photo back to
  // this page; the data-pin-description on the <img> feeds the browser hover-save.
  const pinDesc = `${name}${breed ? ` the ${breed}` : ""} on Only Floofs`;
  // The API's per-photo altText ("Dog, Husky, Floor, ...") actually describes THIS
  // image; the old alt was the same name+breed string as every other page. Prefer
  // the real thing, fall back to name+breed.
  const photoAlt = altText
    ? `${name}${breed ? ` the ${breed}` : ""} — ${altText}`
    : `${name}${breed ? ` the ${breed}` : ""}`;
  const pin = post ? `<a class="pin" href="https://www.pinterest.com/pin/create/button/?url=${encodeURIComponent(canonical)}&media=${encodeURIComponent(photo)}&description=${encodeURIComponent(pinDesc)}" target="_blank" rel="nofollow noopener">Save to Pinterest</a>` : "";

  // Related pets of the same species + a link to the matching gallery, so the
  // page links onward instead of dead-ending.
  const sp = String(species).toLowerCase();
  const galleryLink = sp === "cat" ? "/only-floofs/cats" : sp === "dog" ? "/only-floofs/dogs" : "/not-only-paws";
  const galleryLabel = sp === "cat" ? "More cute cat pictures" : sp === "dog" ? "More cute dog pictures" : "It's not only paws";
  const more = (post && related.length) ? `<div class="more">
    <div class="more-h">More cute ${esc(sp || "pet")}s</div>
    <div class="more-grid">${related.map((r) => `<a href="/only-floofs/p/${esc(encodeURIComponent(r.id))}" title="${esc(r.name)}"><img loading="lazy" src="${esc(r.img)}" alt="Cute ${esc(sp || "pet")} named ${esc(r.name)}" width="84" height="84" data-pin-description="${esc(r.name)} on Only Floofs"></a>`).join("")}</div>
    <p class="more-links"><a href="${galleryLink}">${esc(galleryLabel)}</a></p>
  </div>` : "";

  const card = post ? `
  <div class="card">
    <div class="brand"><img src="${ICON}" alt="" width="30" height="30"><span>Only Floofs</span></div>
    <div class="frame">
      <img class="photo" src="${esc(photo)}" alt="${esc(photoAlt)}" width="360" height="360" data-pin-description="${esc(pinDesc)}">
      <div class="scrim"></div>
      <div class="meta">
        <div class="name">${esc(name)}</div>
        <div class="stats"><span>${HEART}<b>${hearts}</b></span><span>${PAW}<b>${likes}</b></span></div>
      </div>
    </div>
    ${store}
    <p class="sub">Tap to meet ${esc(name)} and thousands more pets.</p>
    ${pin}
  </div>` : `
  <div class="card">
    <div class="brand"><img src="${ICON}" alt="" width="30" height="30"><span>Only Floofs</span></div>
    <h1 class="headline">Meet the cutest pets on the internet.</h1>
    ${store}
  </div>`;

  return `<!DOCTYPE html><html lang="en"><head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="color-scheme" content="dark">
<link rel="icon" href="${SITE}/favicon.svg" type="image/svg+xml">
<link rel="apple-touch-icon" href="${ICON}">
<title>${esc(pageTitle)}</title>
<meta name="description" content="${esc(desc)}">
<meta name="author" content="Paul Fordham">
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
${ld ? `<script type="application/ld+json">${ldJson(ld)}</script>` : ""}
${crumbs ? `<script type="application/ld+json">${ldJson(crumbs)}</script>` : ""}
<style>
*{box-sizing:border-box}html,body{margin:0;height:100%}
body{font:16px/1.55 -apple-system,BlinkMacSystemFont,"SF Pro Text","Segoe UI",Roboto,Helvetica,Arial,sans-serif;color:#f2f2f7;
 background:
  radial-gradient(900px 500px at 50% -10%, rgba(219,62,177,.22), transparent 60%),
  radial-gradient(700px 460px at 50% 4%, rgba(65,182,230,.14), transparent 55%),
  #0b0b0f;
 min-height:100vh;display:flex;align-items:center;justify-content:center;padding:22px}
.card{width:100%;max-width:360px;text-align:center}
.brand{display:inline-flex;align-items:center;gap:9px;margin-bottom:16px}
.brand img{width:30px;height:30px;border-radius:8px}
.brand span{font-size:16px;font-weight:800;letter-spacing:.2px;color:#fff}
.frame{position:relative;border-radius:24px;overflow:hidden;border:1px solid rgba(255,255,255,.08);box-shadow:0 22px 60px rgba(0,0,0,.55)}
.photo{display:block;width:100%;aspect-ratio:1/1;object-fit:cover}
.scrim{position:absolute;inset:0;background:linear-gradient(to bottom,transparent 46%,rgba(0,0,0,.82))}
.meta{position:absolute;left:16px;right:16px;bottom:14px;text-align:left}
.name{font-size:27px;font-weight:800;letter-spacing:-.3px;color:#fff;text-shadow:0 2px 12px rgba(0,0,0,.55);margin-bottom:7px}
.stats{display:flex;gap:16px;font-size:14px;color:#fff}
.stats span{display:inline-flex;align-items:center;gap:5px}
.stats .ic{width:15px;height:15px;display:block}
.stats b{font-weight:800}
.headline{font-size:24px;font-weight:800;letter-spacing:-.3px;color:#fff;margin:18px 0 4px}
.store{display:inline-block;margin-top:18px;line-height:0}
.store img{height:52px;width:auto}
.sub{margin:12px 0 0;color:#9a93ad;font-size:12.5px}
a{color:#b9a3ff;text-decoration:none}
.col{display:flex;flex-direction:column;align-items:center;gap:24px;width:100%;max-width:360px}
.pin{display:inline-block;margin-top:9px;color:#b9a3ff;font-size:12.5px}
.more{width:100%;text-align:center}
.more-h{font-size:12px;color:#9a93ad;margin-bottom:10px;text-transform:uppercase;letter-spacing:.07em}
.more-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:8px}
.more-grid a{display:block;border-radius:12px;overflow:hidden;aspect-ratio:1/1;background:#15151b}
.more-grid img{width:100%;height:100%;object-fit:cover;display:block}
.more-links{margin:12px 0 0;font-size:13px}
/* The substance block: quiet by design so the card still reads as the "bite",
   but it is real, crawlable, per-pet text rather than a template. */
.about{width:100%;text-align:left;padding:0 2px}
.about h1{font-size:19px;font-weight:800;letter-spacing:-.2px;color:#fff;margin:0 0 8px}
.about h1 .breed{font-weight:600;color:#9a93ad}
.cap{margin:0 0 10px;padding:0 0 0 11px;border-left:2px solid rgba(255,77,134,.55);
 color:#e6e2f0;font-size:15px;font-style:italic}
.facts{margin:0 0 6px;color:#b9b3c7;font-size:13.5px}
.bio{margin:0 0 6px;color:#b9b3c7;font-size:13.5px}
.love{margin:0;color:#9a93ad;font-size:12.5px}
</style></head><body><main class="col">${card}${about}${more}</main></body></html>`;
}

async function fetchPost(id) {
  const url = `${API}/posts/${encodeURIComponent(id)}`;
  // The pet is the whole point of the link, so be stubborn about resolving it. The
  // API can briefly return an empty/throttled body (rate limits, crawler bursts on a
  // popular link); a successful body is cached 5 min at the edge so popular links
  // barely touch the origin, and we retry a few times before giving up. Errors are
  // never cached, and the caller does not cache the no-pet fallback either, so a
  // shared pet self-heals on the very next view.
  for (let attempt = 0; attempt < 4; attempt++) {
    try {
      const r = await fetch(url, { cf: { cacheTtlByStatus: { "200-299": 300, "404": 5, "500-599": 0 } } });
      if (r.ok) {
        const text = await r.text();
        if (text && text.trim()) { try { return JSON.parse(text); } catch { /* malformed; retry */ } }
      }
    } catch { /* network blip; retry */ }
  }
  return null;
}

// A few more pets of the same species to link to, so the page isn't a dead end:
// deepens internal linking + crawl paths and gives the visitor somewhere to go.
async function fetchRelated(post, excludeId, want = 6) {
  const species = String(post?.pet?.species || post?.species || "").toLowerCase();
  try {
    const r = await fetch(`${API}/feed?limit=60`, { cf: { cacheTtl: 600 } });
    if (!r.ok) return [];
    const batch = await r.json();
    if (!Array.isArray(batch)) return [];
    const out = [];
    for (const p of batch) {
      const pid = p.id || p.postId;
      if (!pid || pid === excludeId) continue;
      const sp = String(p.species || p.pet?.species || "").toLowerCase();
      if (species && sp !== species) continue;
      const img = p.thumbURL || p.imageURL || p.pet?.avatarURL;
      if (!img) continue;
      out.push({ id: pid, name: p.pet?.name || p.name || "A floof", img });
      if (out.length >= want) break;
    }
    return out;
  } catch { return []; }
}

export const onRequestGet = async ({ params, request }) => {
  const id = params?.id ? decodeURIComponent(params.id) : null;
  const canonical = `${SITE}/only-floofs/p/${encodeURIComponent(id || "")}`;
  const post = id ? await fetchPost(id) : null;
  const related = post ? await fetchRelated(post, id) : [];
  // The app appends ?og=raw only on r/onlyfloofs shares, so the unfurl uses the plain
  // photo instead of the branded card. A distinct query string is its own edge-cache
  // entry, so it never bleeds into the branded unfurl other platforms get.
  let rawOg = false;
  try { rawOg = new URL(request.url).searchParams.get("og") === "raw"; } catch {}
  // A real pet page edge-caches; the generic fallback caches only briefly so a
  // transient API blip can never freeze a shared pet on the no-pet page.
  const cache = post ? "public, max-age=60, s-maxage=300" : "public, max-age=10, s-maxage=10";
  return new Response(page(post, canonical, related, rawOg), {
    headers: { "content-type": "text/html; charset=utf-8", "cache-control": cache },
  });
};
