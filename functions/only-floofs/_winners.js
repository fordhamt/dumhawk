// Winner pages for dumhawk.com/only-floofs:
//   /only-floofs/pet-of-the-day  — today's champion + the Hall of Fame (every daily winner)
//   /only-floofs/champions       — Floof Madness bracket champions (weekly)
//   /only-floofs/top-floofs      — the live Top Floof leaderboard snapshot
// Self-updating from the public API, same visual shell as the gallery pages.
// "_"-prefixed = import-only (not routed).

const API = "https://d36iyq17my087a.cloudfront.net";
const SITE = "https://dumhawk.com";
const APP_ID = "6781334218";
const APPSTORE = `https://apps.apple.com/app/only-floofs/id${APP_ID}`;
const ICON = "https://is1-ssl.mzstatic.com/image/thumb/Purple211/v4/1f/13/e1/1f13e100-24bd-728e-a871-36814f0c9526/AppIcon-0-0-1x_U007epad-0-1-85-220.png/120x120bb.jpg";
const BADGE = "https://tools.applemediaservices.com/api/badges/download-on-the-app-store/black/en-us?size=250x83";

const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) =>
  ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const ldJson = (o) => JSON.stringify(o)
  .replace(/</g, "\\u003c").replace(/>/g, "\\u003e").replace(/&/g, "\\u0026");

async function getJson(path) {
  try {
    const r = await fetch(`${API}${path}`, { cf: { cacheTtl: 600 } });
    if (!r.ok) return null;
    return await r.json();
  } catch { return null; }
}

// One winner card: photo, name, date line. Links to the pet's share page when
// we have a post id (the p/{id} pages carry the full pet context).
function card(w) {
  const inner = `
      <img loading="lazy" src="${esc(w.img)}" alt="${esc(w.alt)}" width="300" height="300">
      <span class="cap"><b>${esc(w.name)}</b>${w.sub ? `<i>${esc(w.sub)}</i>` : ""}</span>
      ${w.badge ? `<span class="medal">${esc(w.badge)}</span>` : ""}`;
  return w.postId
    ? `<a class="tile" href="/only-floofs/p/${esc(encodeURIComponent(w.postId))}" title="${esc(w.name)}">${inner}</a>`
    : `<div class="tile">${inner}</div>`;
}

function jsonld(c, canonical, winners) {
  const items = winners.slice(0, 30).map((w, i) => ({
    "@type": "ListItem", "position": i + 1,
    ...(w.postId ? { "url": `${SITE}/only-floofs/p/${encodeURIComponent(w.postId)}` } : {}),
    "item": { "@type": "ImageObject", "name": w.alt, "contentUrl": w.img, "creditText": "Only Floofs" },
  }));
  return [
    {
      "@context": "https://schema.org", "@type": "CollectionPage", "name": c.h1, "description": c.desc, "url": canonical,
      "isPartOf": { "@type": "MobileApplication", "name": "Only Floofs", "applicationCategory": "PhotoApplication", "operatingSystem": "iOS", "installUrl": APPSTORE, "offers": { "@type": "Offer", "price": "0", "priceCurrency": "USD" }, "author": { "@type": "Person", "name": "Paul Fordham" }, "publisher": { "@type": "Organization", "name": "dumhawk", "url": SITE } },
      "mainEntity": { "@type": "ItemList", "numberOfItems": items.length, "itemListElement": items },
    },
    {
      "@context": "https://schema.org", "@type": "BreadcrumbList",
      "itemListElement": [
        { "@type": "ListItem", "position": 1, "name": "Only Floofs", "item": `${SITE}/only-floofs/` },
        { "@type": "ListItem", "position": 2, "name": c.h1, "item": canonical },
      ],
    },
    ...(c.faqs && c.faqs.length ? [{ "@context": "https://schema.org", "@type": "FAQPage", "mainEntity": c.faqs.map((f) => ({ "@type": "Question", "name": f.q, "acceptedAnswer": { "@type": "Answer", "text": f.a } })) }] : []),
  ];
}

function shell(c, winners, hero) {
  const canonical = `${SITE}${c.path}`;
  const grid = winners.length
    ? `<div class="grid">${winners.map(card).join("")}</div>`
    : `<p class="empty">${esc(c.empty)}</p>`;
  const faq = (c.faqs && c.faqs.length) ? `<section class="faq"><h2>FAQ</h2>${c.faqs.map((f) => `<div class="qa"><h3>${esc(f.q)}</h3><p>${esc(f.a)}</p></div>`).join("")}</section>` : "";
  const relNav = c.related.map((r) => `<a href="${r.path}">${esc(r.label)}</a>`).join(" · ");
  const ogImg = (hero && hero.img) || (winners[0] && winners[0].img) || null;
  const ld = jsonld(c, canonical, winners);

  const heroHtml = hero ? `<div class="hero">
    ${hero.postId ? `<a href="/only-floofs/p/${esc(encodeURIComponent(hero.postId))}">` : ""}<img src="${esc(hero.img)}" alt="${esc(hero.alt)}" width="480" height="480">${hero.postId ? "</a>" : ""}
    <div class="hero-t"><span class="crown">👑</span><h2>${esc(hero.title)}</h2><p>${esc(hero.line)}</p></div>
  </div>` : "";

  return new Response(`<!DOCTYPE html><html lang="en"><head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="color-scheme" content="dark">
<link rel="icon" href="${SITE}/favicon.svg" type="image/svg+xml"><link rel="apple-touch-icon" href="${ICON}">
<title>${esc(c.title)}</title>
<meta name="description" content="${esc(c.desc)}">
<meta name="author" content="Paul Fordham">
<meta name="keywords" content="${esc(c.kw)}">
<meta name="robots" content="index,follow">
<link rel="canonical" href="${esc(canonical)}">\n<meta name="p:domain_verify" content="d3874ef349369f6d50994ee63caf7025"/>
<meta name="apple-itunes-app" content="app-id=${APP_ID}, app-clip-bundle-id=com.onlyfloofs.app.Clip">
<meta property="og:site_name" content="Only Floofs"><meta property="og:title" content="${esc(c.h1)} on Only Floofs"><meta property="og:description" content="${esc(c.desc)}"><meta property="og:type" content="website"><meta property="og:url" content="${esc(canonical)}">${ogImg ? `<meta property="og:image" content="${esc(ogImg)}"><meta property="og:image:alt" content="${esc((hero && hero.alt) || (winners[0] && winners[0].alt) || c.h1)}">` : ""}
<meta name="twitter:card" content="summary_large_image"><meta name="twitter:title" content="${esc(c.h1)} on Only Floofs"><meta name="twitter:description" content="${esc(c.desc)}">${ogImg ? `<meta name="twitter:image" content="${esc(ogImg)}">` : ""}
<script type="application/ld+json">${ldJson(ld)}</script>
<style>
*{box-sizing:border-box}body{margin:0;font:16px/1.6 -apple-system,BlinkMacSystemFont,"SF Pro Text","Segoe UI",Roboto,Helvetica,Arial,sans-serif;color:#f2f2f7;background:radial-gradient(1100px 600px at 50% -10%,rgba(219,62,177,.20),transparent 60%),radial-gradient(900px 520px at 50% 2%,rgba(65,182,230,.12),transparent 55%),#0b0b0f;min-height:100vh}
.wrap{max-width:1040px;margin:0 auto;padding:26px 20px 60px}
header{display:flex;align-items:center;gap:10px;margin-bottom:22px}header img{width:34px;height:34px;border-radius:9px}header a{color:#fff;font-weight:800;text-decoration:none;font-size:17px}
h1{font-size:34px;line-height:1.15;letter-spacing:-.02em;margin:6px 0 10px}.lead{color:#c9c6d4;max-width:760px;margin:0 0 18px}
.cta{display:flex;align-items:center;gap:14px;margin:4px 0 18px;flex-wrap:wrap}.cta img{height:50px}
.nav{color:#9a93ad;font-size:14px}.nav a,footer a,.qa a{color:#b9a3ff;text-decoration:none}
.hero{display:flex;gap:22px;align-items:center;background:#15151b;border:1px solid rgba(255,215,80,.35);border-radius:20px;padding:18px;margin:0 0 22px;flex-wrap:wrap}
.hero img{width:200px;height:200px;object-fit:cover;border-radius:16px;border:3px solid #ffd750}
.hero-t{flex:1;min-width:220px}.hero-t h2{margin:0 0 6px;font-size:24px}.hero-t p{margin:0;color:#c9c6d4}
.crown{font-size:28px;display:block;margin-bottom:4px}
.grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:10px;margin:18px 0}
.tile{position:relative;display:block;border-radius:16px;overflow:hidden;background:#15151b;border:1px solid rgba(255,255,255,.06);aspect-ratio:1/1}
.tile img{width:100%;height:100%;object-fit:cover;display:block}
.cap{position:absolute;left:0;right:0;bottom:0;padding:20px 10px 8px;background:linear-gradient(transparent,rgba(0,0,0,.8));display:flex;flex-direction:column;gap:1px}.cap b{font-size:13px;color:#fff}.cap i{font-size:11px;color:#cfc9da;font-style:normal}
.medal{position:absolute;top:8px;left:8px;background:rgba(0,0,0,.6);border-radius:999px;padding:3px 8px;font-size:12px}
.empty{color:#c9c6d4}
.faq{max-width:760px;margin:26px 0 0}.faq h2{font-size:20px;margin:0 0 10px}.qa{border-top:1px solid rgba(255,255,255,.07);padding:14px 0}.qa h3{font-size:15px;margin:0 0 4px;color:#fff}.qa p{margin:0;color:#c9c6d4;font-size:14px}
footer{margin-top:30px;color:#7d7790;font-size:13px;border-top:1px solid rgba(255,255,255,.07);padding-top:16px}
</style></head><body><div class="wrap">
<header><img src="${ICON}" alt=""><a href="/only-floofs/">Only Floofs</a></header>
<h1>${esc(c.h1)} ${c.emoji}</h1>
<p class="lead">${esc(c.lead)}</p>
<div class="cta"><a href="${esc(APPSTORE)}" aria-label="Download Only Floofs on the App Store"><img src="${BADGE}" alt="Download Only Floofs on the App Store"></a><span class="nav">Also here: ${relNav}</span></div>
${heroHtml}
${grid}
<p class="lead">${esc(c.blurb)}</p>
${c.embed ? `<section class="faq"><h2>Put Pet of the Day on your site</h2><p style="color:#c9c6d4">Pet blog or fan page? Embed the live winner card anywhere with this snippet. It updates itself every day.</p><pre style="background:#15151b;border:1px solid rgba(255,255,255,.08);border-radius:12px;padding:14px;overflow:auto;font-size:12.5px;color:#cfc9da">&lt;iframe src="https://dumhawk.com/only-floofs/widget" width="320" height="430" style="border:0;border-radius:16px" title="Only Floofs Pet of the Day"&gt;&lt;/iframe&gt;</pre></section>` : ""}
${faq}
<footer>${esc(c.h1)} on <a href="/only-floofs/">Only Floofs</a>, the home of the internet's cutest pets. Also see ${relNav}. <a href="${esc(APPSTORE)}">Get the free iOS app</a> and put your own floof in the running.</footer>
<script async defer data-pin-hover="true" src="https://assets.pinterest.com/js/pinit.js"></script>
</div></body></html>`, { headers: { "content-type": "text/html; charset=utf-8", "cache-control": "public, max-age=600, s-maxage=1800" } });
}

const REL = {
  potd: [
    { path: "/only-floofs/champions", label: "Floof Madness champions" },
    { path: "/only-floofs/top-floofs", label: "Top Floofs right now" },
    { path: "/only-floofs/cats", label: "Cute cats" },
    { path: "/only-floofs/dogs", label: "Cute dogs" },
  ],
  champs: [
    { path: "/only-floofs/pet-of-the-day", label: "Pet of the Day" },
    { path: "/only-floofs/top-floofs", label: "Top Floofs right now" },
    { path: "/only-floofs/cats", label: "Cute cats" },
    { path: "/only-floofs/dogs", label: "Cute dogs" },
  ],
  top: [
    { path: "/only-floofs/pet-of-the-day", label: "Pet of the Day" },
    { path: "/only-floofs/champions", label: "Floof Madness champions" },
    { path: "/only-floofs/cats", label: "Cute cats" },
    { path: "/only-floofs/dogs", label: "Cute dogs" },
  ],
};

// /only-floofs/pet-of-the-day — today's leader + the Hall of Fame.
export async function renderPetOfDay() {
  const [today, hall] = await Promise.all([getJson("/pet-of-the-day"), getJson("/hall-of-fame")]);
  const winners = (Array.isArray(hall) ? hall : []).map((h) => {
    const p = h.post || {};
    const pet = p.pet || {};
    const img = p.thumbURL || p.imageURL || pet.avatarURL;
    if (!img) return null;
    return { postId: p.id, img, name: pet.name || "A very good floof", sub: h.dateLabel || "", alt: `${pet.name || "Winner"}, Pet of the Day${h.dateLabel ? ` (${h.dateLabel})` : ""}`, badge: "👑" };
  }).filter(Boolean);

  let hero = null;
  if (today && (today.thumbURL || today.imageURL)) {
    const pet = today.pet || {};
    hero = {
      postId: today.id, img: today.thumbURL || today.imageURL,
      alt: `${pet.name || "Today's leader"}, leading Pet of the Day`,
      title: today.crowned ? `${pet.name} is Pet of the Day` : `${pet.name || "Someone cute"} is leading right now`,
      line: today.crowned ? "Crowned at the daily cutoff and headed for the Hall of Fame." : "The floof with the most love today takes the crown at the daily cutoff.",
    };
  }

  const c = {
    path: "/only-floofs/pet-of-the-day",
    title: "Pet of the Day · every daily winner on Only Floofs",
    h1: "Pet of the Day", emoji: "👑",
    desc: "One pet is crowned every single day on Only Floofs. Meet today's leader and every Pet of the Day winner in the Hall of Fame.",
    kw: "pet of the day, cutest pet today, daily pet contest, cute cat winner, cute dog winner, pet hall of fame",
    lead: "One floof is crowned every single day. Hearts and likes from around the world decide it, and every winner lands here in the Hall of Fame for good.",
    blurb: "Want your pet up here? Post a photo in the free Only Floofs app and let the world vote. The crown resets daily, so every floof gets a fresh shot at fame.",
    empty: "The first crowns are being handed out. Check back tomorrow, or get the app and watch it live.",
    faqs: [
      { q: "How is Pet of the Day decided?", a: "Every heart and like in the Only Floofs app counts as a vote. The pet with the most love when the daily cutoff hits is crowned, worldwide, one winner a day." },
      { q: "Can my pet win Pet of the Day?", a: "Yes. Post a photo in the free Only Floofs app and it competes automatically. Winners keep their spot in the Hall of Fame forever." },
    ],
    related: REL.potd,
    embed: true,
  };
  return shell(c, winners, hero);
}

// /only-floofs/champions — Floof Madness bracket champions.
export async function renderChampions() {
  const history = await getJson("/tournament/history");
  const winners = (Array.isArray(history) ? history : []).map((t) => {
    if (!t.imageURL) return null;
    const when = t.crownedAt ? new Date(t.crownedAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "";
    return { postId: t.postId, img: t.imageURL, name: t.name || "Champion", sub: t.title || when, alt: `${t.name || "Champion"}, Floof Madness champion${when ? ` (${when})` : ""}`, badge: "🏆" };
  }).filter(Boolean);

  const hero = winners[0] ? { ...winners[0], title: `${winners[0].name} is the reigning champion`, line: "Winner of the latest Floof Madness bracket, decided head-to-head by thousands of votes." } : null;

  const c = {
    path: "/only-floofs/champions",
    title: "Floof Madness Champions · bracket winners on Only Floofs",
    h1: "Floof Madness Champions", emoji: "🏆",
    desc: "The pets that survived the bracket. Floof Madness runs twice a week on Only Floofs: 16 pets, head-to-head votes, one champion.",
    kw: "pet tournament, cutest pet bracket, floof madness, pet contest winners, cute animal tournament",
    lead: "Floof Madness is the app's knockout bracket: 16 floofs enter, the community votes head to head, and one champion takes the whole thing. These are the winners.",
    blurb: "A new bracket seeds twice a week. Post your pet in the free app and it can be seeded into the next tournament, then rally your people to vote.",
    empty: "The first bracket is still being fought. Download the app to vote in the live rounds.",
    faqs: [
      { q: "How does Floof Madness work?", a: "Sixteen pets are seeded into a knockout bracket inside the Only Floofs app. Every matchup is a head-to-head vote, tap the cuter floof, and winners advance until one champion is crowned." },
      { q: "How often does a new bracket run?", a: "A fresh bracket seeds twice a week, so there is always a new champion coming. Champions are permanent and celebrated here and in the app." },
    ],
    related: REL.champs,
  };
  return shell(c, winners, hero);
}

// /only-floofs/top-floofs — live leaderboard snapshot (daily, all species).
export async function renderTopFloofs() {
  const board = await getJson("/leaderboards?board=daily%23all");
  const entries = (board && Array.isArray(board.entries) ? board.entries : Array.isArray(board) ? board : []);
  const seen = new Set();
  const winners = [];
  let rank = 0;
  for (const e of entries) {
    if (!e || !e.petId || seen.has(e.petId)) continue;
    const img = e.thumbURL || e.imageURL || e.avatarURL;
    if (!img) continue;
    seen.add(e.petId);
    rank += 1;
    const score = (e.hearts || 0) * 2 + (e.likes || 0);
    winners.push({ postId: e.postId, img, name: e.name || "A very good floof", sub: `#${rank} · ${score} points`, alt: `${e.name || "Top floof"}, #${rank} on today's leaderboard`, badge: rank === 1 ? "🥇" : rank === 2 ? "🥈" : rank === 3 ? "🥉" : null });
    if (winners.length >= 60) break;
  }

  const hero = winners[0] ? { ...winners[0], title: `${winners[0].name} is today's Top Floof`, line: "Leading the worldwide daily leaderboard right now. Hearts count double." } : null;

  const c = {
    path: "/only-floofs/top-floofs",
    title: "Top Floofs · today's cutest pet leaderboard on Only Floofs",
    h1: "Top Floofs", emoji: "🔥",
    desc: "The live daily leaderboard of the internet's cutest pets, ranked by hearts and likes on Only Floofs. Updated all day, every day.",
    kw: "top pets today, cutest pet leaderboard, pet ranking, most popular pets, cute cat ranking, cute dog ranking",
    lead: "The worldwide daily leaderboard, ranked by love: hearts count double, likes count once, and the order moves all day as votes come in.",
    blurb: "Every pet on Only Floofs competes automatically. Post your floof in the free app, collect hearts, and climb. The daily board resets every night; weekly and all-time charts live in the app.",
    empty: "The board is warming up. Open the app to see the live rankings.",
    faqs: [
      { q: "How is the Top Floofs leaderboard ranked?", a: "By community love in the Only Floofs app: each heart is worth 2 points and each like is worth 1. The daily board resets at the daily cutoff; weekly and all-time boards live in the app." },
      { q: "How do I get my pet on the leaderboard?", a: "Post a photo in the free Only Floofs app. Every public pet competes automatically, and city leaderboards in the app give local floofs their own spotlight." },
    ],
    related: REL.top,
  };
  return shell(c, winners, hero);
}

// /only-floofs/widget — the embeddable Pet of the Day card (framable by any
// site; every embed is a live backlink). Compact, self-contained, no scripts.
export async function renderWidget() {
  const today = await getJson("/pet-of-the-day");
  const pet = (today && today.pet) || {};
  const img = today && (today.thumbURL || today.imageURL);
  const name = pet.name || "Today's floof";
  const crowned = !!(today && today.crowned);
  const link = `${SITE}/only-floofs/pet-of-the-day?utm_source=widget`;
  const body = img ? `
  <a class="card" href="${esc(link)}" target="_blank" rel="noopener">
    <img src="${esc(img)}" alt="${esc(name)}, Pet of the Day on Only Floofs">
    <div class="t"><span class="crown">👑</span><b>${esc(name)}</b>
    <i>${crowned ? "Pet of the Day" : "Leading Pet of the Day"}</i></div>
  </a>` : `<p class="empty">Today's floof is loading…</p>`;
  return new Response(`<!DOCTYPE html><html lang="en"><head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex">
<title>Pet of the Day · Only Floofs</title>
<style>*{box-sizing:border-box}body{margin:0;font:14px/1.5 -apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Helvetica,Arial,sans-serif;background:#0b0b0f;color:#f2f2f7}
.wrap{padding:12px}
.card{display:block;text-decoration:none;color:#f2f2f7;background:#15151b;border:1px solid rgba(255,215,80,.35);border-radius:16px;overflow:hidden}
.card img{width:100%;aspect-ratio:1/1;object-fit:cover;display:block}
.t{padding:10px 12px}.t b{display:block;font-size:16px}.t i{color:#c9c6d4;font-style:normal;font-size:12.5px}
.crown{float:right;font-size:18px}
.brand{display:flex;align-items:center;gap:6px;margin-top:8px;font-size:12px;color:#9a93ad}
.brand a{color:#b9a3ff;text-decoration:none;font-weight:700}
.empty{color:#c9c6d4;text-align:center;padding:30px 8px}</style></head>
<body><div class="wrap">${body}
<div class="brand">One pet crowned daily on <a href="${esc(SITE)}/only-floofs/?utm_source=widget" target="_blank" rel="noopener">Only Floofs</a></div>
</div></body></html>`, { headers: { "content-type": "text/html; charset=utf-8", "cache-control": "public, max-age=600, s-maxage=900" } });
}
