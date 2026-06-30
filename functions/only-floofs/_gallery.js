// Shared renderer for the SEO gallery pages:
//   /only-floofs/cats, /only-floofs/dogs   — cute cat/dog pictures
//   /not-only-paws                          — the "it's not only paws" mix page
//   /only-floofs/breed/{slug}               — per-breed pages
//   /only-floofs/animals/{species}          — per-species pages (reptiles, birds, …)
// All support ?page=N pagination with crawlable prev/next. Thin route files call
// render / renderBreed / renderSpecies. "_"-prefixed = import-only (not routed).
//
// WHY: the static SPA can't be crawled and the per-pet "bite" pages are thin.
// These are real, photo-rich, keyword-targeted pages. Cat/dog galleries surface
// POPULAR-BREED chips (so breed pages are actually linked, not orphaned); the mix
// page surfaces BROWSE-BY-ANIMAL chips. Each tile links to the per-pet page, and
// pages carry CollectionPage + ItemList(ImageObject) + Breadcrumb + FAQPage JSON-LD.
//
// BRAND: "Only Floofs". We never claim "Only Paws" as a name; it's a search pun
// used only on /not-only-paws.
//
// Source of record: Only-Paws repo infra/cloudflare/...; deploy = the dumhawk repo.

const API = "https://d36iyq17my087a.cloudfront.net";
const SITE = "https://dumhawk.com";
const APP_ID = "6781334218";
const APPSTORE = `https://apps.apple.com/app/only-floofs/id${APP_ID}`;
const ICON = "https://is1-ssl.mzstatic.com/image/thumb/Purple211/v4/1f/13/e1/1f13e100-24bd-728e-a871-36814f0c9526/AppIcon-0-0-1x_U007epad-0-1-85-220.png/120x120bb.jpg";
const BADGE = "https://tools.applemediaservices.com/api/badges/download-on-the-app-store/black/en-us?size=250x83";
const PER = 60;        // pets per page
const CAP = 300;       // max pets fetched per species (bounds runtime)

const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) =>
  ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const slugify = (s) => String(s ?? "").toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
const title1 = (s) => String(s ?? "").replace(/\b\w/g, (m) => m.toUpperCase());
const plural = (s) => /s$/i.test(s) ? s : `${s}s`;

const faqCat = [
  { q: "Where can I find cute cat pictures?", a: "Right here. This page is a daily-updated gallery of real cats shared by their owners on Only Floofs, with thousands more in the free app." },
  { q: "Are these real cats?", a: "Yes. Every photo is posted by the cat's owner and passes automatic moderation before it appears." },
  { q: "Can I post my own cat?", a: "Yes, and it's free. Download Only Floofs, upload a photo, and your cat can collect hearts, climb the leaderboards, and even become Pet of the Day." },
];
const faqDog = [
  { q: "Where can I find cute dog pictures?", a: "Right here. This page is a daily-updated gallery of real dogs shared by their owners on Only Floofs, with thousands more in the free app." },
  { q: "Are these real dogs?", a: "Yes. Every photo is posted by the dog's owner and passes automatic moderation before it appears." },
  { q: "Can I post my own dog?", a: "Yes, and it's free. Download Only Floofs, upload a photo, and your dog can collect hearts, climb the leaderboards, and even become Pet of the Day." },
];
const faqPaws = [
  { q: "Is Only Floofs only cats and dogs?", a: "No, it's not only paws. Alongside cats and dogs you'll find reptiles, birds, bunnies and more, all shared by their owners." },
  { q: "What does “only paws” mean here?", a: "It's our wink at the obvious: people come for the paws, but Only Floofs is the home of the internet's cutest animals, full stop." },
  { q: "Can I post any animal?", a: "Yes. Any animal is welcome in the free app, as long as the photo passes moderation." },
];

const COPY = {
  cat: {
    path: "/only-floofs/cats", emoji: "🐱", species: "cat", oneLabel: "cat", showBreeds: true,
    title: "Cute Cat Pictures — adorable cats on Only Floofs", h1: "Cute cat pictures",
    lead: "A fresh, endless gallery of the internet's cutest cats. Every kitten and cat here was shared by its owner on Only Floofs and passed photo moderation, so it's all real, all adorable, and updated every day.",
    desc: "Browse the internet's cutest cat pictures on Only Floofs. Real cats and kittens shared by their owners, updated daily. Heart your favorites and make your own cat famous.",
    kw: "cute cats, cute cat pictures, cute cat photos, kitten pictures, cute kittens, cat pics, only floofs",
    blurb: "From sleepy tabbies to wide-eyed kittens, these are real cats posted by real owners. And it's not only paws around here, tap through to meet the dogs, reptiles, birds and more too.",
    related: [{ path: "/only-floofs/dogs", label: "cute dog pictures" }, { path: "/not-only-paws", label: "reptiles, birds & more" }],
    faqs: faqCat,
  },
  dog: {
    path: "/only-floofs/dogs", emoji: "🐶", species: "dog", oneLabel: "dog", showBreeds: true,
    title: "Cute Dog Pictures — adorable dogs on Only Floofs", h1: "Cute dog pictures",
    lead: "A fresh, endless gallery of the internet's cutest dogs. Every good boy and girl here was shared by its owner on Only Floofs and passed photo moderation, so it's all real, all adorable, and updated every day.",
    desc: "Browse the internet's cutest dog pictures on Only Floofs. Real dogs and puppies shared by their owners, updated daily. Heart your favorites and make your own dog famous.",
    kw: "cute dogs, cute dog pictures, dog pics, dog pictures, cute puppies, puppy pictures, only floofs",
    blurb: "From fluffy puppies to dignified seniors, these are real dogs posted by real owners. And it's not only paws around here, tap through to meet the cats, reptiles, birds and more too.",
    related: [{ path: "/only-floofs/cats", label: "cute cat pictures" }, { path: "/not-only-paws", label: "reptiles, birds & more" }],
    faqs: faqDog,
  },
  onlypaws: {
    path: "/not-only-paws", emoji: "🐾", mix: true, oneLabel: "animal", showSpecies: true,
    title: "Not Only Paws — cats, dogs, reptiles, birds & more | Only Floofs", h1: "It's not only paws",
    lead: "You came for the paws. Good news: it's not only paws. Only Floofs is stacked with cute cats and dogs, sure, but it's also home to reptiles, birds, bunnies, and every other floof worth a double-tap. So if you searched “only paws,” congrats, you found a whole lot more than only paws.",
    desc: "It's not only paws. Only Floofs has cute cats and dogs plus reptiles, birds, bunnies and more, all shared by their owners. Heart your favorites and make your own pet famous.",
    kw: "only paws, not only paws, cute animals, cute pets, reptiles, birds, bunnies, exotic pets, cute cats, cute dogs, only floofs",
    blurb: "Paws are great. But Only Floofs was never only paws, it's the home of the internet's cutest animals, full stop. Tap any one to meet it, or get the free app to see them all.",
    related: [{ path: "/only-floofs/cats", label: "cute cat pictures" }, { path: "/only-floofs/dogs", label: "cute dog pictures" }],
    faqs: faqPaws,
  },
};

function normalize(p) {
  const pet = p.pet || {};
  return {
    id: p.id || p.postId || "",
    name: pet.name || p.name || "A floof",
    breed: pet.breed || p.breed || "",
    species: String(p.species || pet.species || "").toLowerCase(),
    img: p.thumbURL || p.imageURL || pet.avatarURL || "",
    hearts: Number(p.hearts || 0),
    likes: Number(p.likes || 0),
  };
}

async function pageFeed(onBatch) {
  const PAGE = 100;
  for (let offset = 0; offset < 2000; offset += PAGE) {
    let batch;
    try {
      const r = await fetch(`${API}/feed?limit=${PAGE}&offset=${offset}`, { cf: { cacheTtl: 600 } });
      if (!r.ok) break;
      batch = await r.json();
    } catch { break; }
    if (!Array.isArray(batch) || batch.length === 0) break;
    if (onBatch(batch) === false) break;
    if (batch.length < PAGE) break;
  }
}

// All pets of a species (up to CAP) + a breed tally for the chip row.
async function fetchSpeciesAll(species) {
  const pets = [], seen = new Set(), breeds = new Map();
  await pageFeed((batch) => {
    for (const p of batch) {
      const n = normalize(p);
      if (n.species !== species || !n.id || !n.img || seen.has(n.id)) continue;
      seen.add(n.id); pets.push(n);
      if (n.breed) { const s = slugify(n.breed); if (s) { const e = breeds.get(s) || { slug: s, label: title1(n.breed), count: 0 }; e.count++; breeds.set(s, e); } }
      if (pets.length >= CAP) return false;
    }
  });
  return { pets, breeds };
}

async function fetchBreedAll(slug) {
  const pets = [], seen = new Set();
  let display = "", species = "";
  await pageFeed((batch) => {
    for (const p of batch) {
      const n = normalize(p);
      if (!n.breed || slugify(n.breed) !== slug || !n.id || !n.img || seen.has(n.id)) continue;
      seen.add(n.id); pets.push(n);
      if (!display) display = title1(n.breed);
      if (!species) species = n.species;
      if (pets.length >= CAP) return false;
    }
  });
  return { pets, display, species };
}

// Mix for /not-only-paws: non-cat/dog first, then round-robin. Also returns the
// species tally so the page can show "browse by animal" chips.
async function fetchMixAll() {
  const buckets = new Map(), seen = new Set();
  await pageFeed((batch) => {
    for (const p of batch) {
      const n = normalize(p);
      if (!n.id || !n.img || seen.has(n.id)) continue;
      seen.add(n.id);
      const sp = n.species || "other";
      if (!buckets.has(sp)) buckets.set(sp, []);
      buckets.get(sp).push(n);
    }
    if (seen.size >= CAP) return false;
  });
  const speciesTally = [...buckets.entries()].map(([sp, arr]) => ({ sp, count: arr.length }));
  const order = [...buckets.keys()].sort((a, b) =>
    ((a === "cat" || a === "dog") ? 1 : 0) - ((b === "cat" || b === "dog") ? 1 : 0));
  const work = new Map([...buckets].map(([k, v]) => [k, v.slice()]));
  const out = [];
  let added = true;
  while (added && out.length < CAP) {
    added = false;
    for (const sp of order) {
      const arr = work.get(sp);
      if (arr && arr.length) { out.push(arr.shift()); added = true; }
    }
  }
  return { pets: out, speciesTally };
}

function jsonld(c, canonical, pets) {
  const items = pets.slice(0, 30).map((p, i) => ({
    "@type": "ListItem", "position": i + 1,
    "url": `${SITE}/only-floofs/p/${encodeURIComponent(p.id)}`,
    "item": { "@type": "ImageObject", "name": `${p.name}${p.breed ? ` the ${p.breed}` : ""}`, "contentUrl": p.img, "thumbnailUrl": p.img, "creditText": "Only Floofs" },
  }));
  const out = [
    {
      "@context": "https://schema.org", "@type": "CollectionPage", "name": c.h1, "description": c.desc, "url": canonical,
      "isPartOf": { "@type": "MobileApplication", "name": "Only Floofs", "applicationCategory": "PhotoApplication", "operatingSystem": "iOS", "installUrl": APPSTORE, "offers": { "@type": "Offer", "price": "0", "priceCurrency": "USD" } },
      "mainEntity": { "@type": "ItemList", "numberOfItems": items.length, "itemListElement": items },
    },
    {
      "@context": "https://schema.org", "@type": "BreadcrumbList",
      "itemListElement": [
        { "@type": "ListItem", "position": 1, "name": "Only Floofs", "item": `${SITE}/only-floofs/` },
        { "@type": "ListItem", "position": 2, "name": c.h1, "item": canonical },
      ],
    },
  ];
  if (c.faqs && c.faqs.length) out.push({ "@context": "https://schema.org", "@type": "FAQPage", "mainEntity": c.faqs.map((f) => ({ "@type": "Question", "name": f.q, "acceptedAnswer": { "@type": "Answer", "text": f.a } })) });
  return out;
}

// allPets = full fetched list; this slices to the requested page and renders.
function buildPage(c, allPets, opts = {}) {
  const page = Math.max(1, parseInt(opts.page, 10) || 1);
  const start = (page - 1) * PER;
  const pets = allPets.slice(start, start + PER);
  const hasPrev = page > 1;
  const hasNext = allPets.length > page * PER;
  const pageUrl = (n) => `${c.path}${n > 1 ? `?page=${n}` : ""}`;
  const canonical = `${SITE}${pageUrl(page)}`;
  const robots = opts.robots || "index,follow";

  const tiles = pets.map((p) => {
    const kind = p.breed ? `${p.breed} ` : (p.species ? `${p.species} ` : "");
    const alt = `Cute ${kind}named ${p.name}`;
    return `<a class="tile" href="/only-floofs/p/${esc(encodeURIComponent(p.id))}" title="${esc(p.name)}${p.breed ? esc(` the ${p.breed}`) : ""}">
      <img loading="lazy" src="${esc(p.img)}" alt="${esc(alt)}" width="300" height="300" data-pin-description="${esc(alt)} on Only Floofs">
      <span class="cap"><b>${esc(p.name)}</b>${p.breed ? `<i>${esc(p.breed)}</i>` : ""}</span></a>`;
  }).join("");
  const grid = pets.length ? `<div class="grid">${tiles}</div>` : `<p class="empty">Fresh ${c.oneLabel} pics are loading. Check back in a moment, or get the app to see them all.</p>`;

  const chips = (opts.chips && opts.chips.length)
    ? `<nav class="chips" aria-label="${esc(opts.chipsLabel || "Browse")}"><span class="chips-h">${esc(opts.chipsLabel || "Browse")}:</span>${
        opts.chips.map((ch) => `<a href="${esc(ch.path)}">${esc(ch.label)}</a>`).join("")}</nav>`
    : "";

  const pager = (hasPrev || hasNext) ? `<nav class="pager" aria-label="Pagination">${
      hasPrev ? `<a rel="prev" href="${esc(pageUrl(page - 1))}">← Newer</a>` : "<span></span>"}${
      hasNext ? `<a rel="next" href="${esc(pageUrl(page + 1))}">More cute ${esc(c.oneLabel)} pictures →</a>` : "<span></span>"}</nav>` : "";

  const relNav = c.related.map((r) => `<a href="${r.path}">${esc(r.label)}</a>`).join(" · ");
  const faq = (c.faqs && c.faqs.length) ? `<section class="faq"><h2>FAQ</h2>${c.faqs.map((f) => `<div class="qa"><h3>${esc(f.q)}</h3><p>${esc(f.a)}</p></div>`).join("")}</section>` : "";
  const ld = jsonld(c, canonical, pets);
  const heading = page > 1 ? `${c.h1} — page ${page}` : c.h1;

  return new Response(`<!DOCTYPE html><html lang="en"><head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="color-scheme" content="dark">
<link rel="icon" href="${SITE}/favicon.svg" type="image/svg+xml"><link rel="apple-touch-icon" href="${ICON}">
<title>${esc(page > 1 ? `${c.title} (page ${page})` : c.title)}</title>
<meta name="description" content="${esc(c.desc)}">
<meta name="keywords" content="${esc(c.kw)}">
<meta name="robots" content="${robots}">
<link rel="canonical" href="${esc(canonical)}">
${hasPrev ? `<link rel="prev" href="${esc(SITE + pageUrl(page - 1))}">` : ""}${hasNext ? `<link rel="next" href="${esc(SITE + pageUrl(page + 1))}">` : ""}
<meta name="apple-itunes-app" content="app-id=${APP_ID}, app-clip-bundle-id=com.onlyfloofs.app.Clip">
<meta property="og:site_name" content="Only Floofs"><meta property="og:title" content="${esc(c.h1)} on Only Floofs"><meta property="og:description" content="${esc(c.desc)}"><meta property="og:type" content="website"><meta property="og:url" content="${esc(canonical)}">${pets[0] ? `<meta property="og:image" content="${esc(pets[0].img)}">` : ""}
<meta name="twitter:card" content="summary_large_image"><meta name="twitter:title" content="${esc(c.h1)} on Only Floofs"><meta name="twitter:description" content="${esc(c.desc)}">${pets[0] ? `<meta name="twitter:image" content="${esc(pets[0].img)}">` : ""}
<script type="application/ld+json">${JSON.stringify(ld)}</script>
<style>
*{box-sizing:border-box}body{margin:0;font:16px/1.6 -apple-system,BlinkMacSystemFont,"SF Pro Text","Segoe UI",Roboto,Helvetica,Arial,sans-serif;color:#f2f2f7;background:radial-gradient(1100px 600px at 50% -10%,rgba(219,62,177,.20),transparent 60%),radial-gradient(900px 520px at 50% 2%,rgba(65,182,230,.12),transparent 55%),#0b0b0f;min-height:100vh}
.wrap{max-width:1040px;margin:0 auto;padding:26px 20px 60px}
header{display:flex;align-items:center;gap:10px;margin-bottom:22px}header img{width:34px;height:34px;border-radius:9px}header a{color:#fff;font-weight:800;text-decoration:none;font-size:17px}
h1{font-size:34px;line-height:1.15;letter-spacing:-.02em;margin:6px 0 10px}.lead{color:#c9c6d4;max-width:760px;margin:0 0 18px}
.cta{display:flex;align-items:center;gap:14px;margin:4px 0 18px;flex-wrap:wrap}.cta img{height:50px}
.nav{color:#9a93ad;font-size:14px}.nav a,footer a,.qa a,.pager a,.chips a{color:#b9a3ff;text-decoration:none}
.chips{display:flex;flex-wrap:wrap;gap:8px;align-items:center;margin:2px 0 18px}
.chips-h{color:#9a93ad;font-size:13px;margin-right:2px}
.chips a{background:#15151b;border:1px solid rgba(255,255,255,.08);padding:5px 11px;border-radius:999px;font-size:13px}
.grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:10px;margin:18px 0}
.tile{position:relative;display:block;border-radius:16px;overflow:hidden;background:#15151b;border:1px solid rgba(255,255,255,.06);aspect-ratio:1/1}
.tile img{width:100%;height:100%;object-fit:cover;display:block}
.cap{position:absolute;left:0;right:0;bottom:0;padding:20px 10px 8px;background:linear-gradient(transparent,rgba(0,0,0,.8));display:flex;flex-direction:column;gap:1px}.cap b{font-size:13px;color:#fff}.cap i{font-size:11px;color:#cfc9da;font-style:normal}
.pager{display:flex;justify-content:space-between;gap:12px;margin:6px 0 8px;font-size:14px}
.blurb{color:#c9c6d4;max-width:760px;margin:18px 0}.empty{color:#c9c6d4}
.faq{max-width:760px;margin:26px 0 0}.faq h2{font-size:20px;margin:0 0 10px}.qa{border-top:1px solid rgba(255,255,255,.07);padding:14px 0}.qa h3{font-size:15px;margin:0 0 4px;color:#fff}.qa p{margin:0;color:#c9c6d4;font-size:14px}
footer{margin-top:30px;color:#7d7790;font-size:13px;border-top:1px solid rgba(255,255,255,.07);padding-top:16px}
</style></head><body><div class="wrap">
<header><img src="${ICON}" alt=""><a href="/only-floofs/">Only Floofs</a></header>
<h1>${esc(heading)} ${c.emoji}</h1>
<p class="lead">${esc(c.lead)}</p>
${chips}
<div class="cta"><a href="${esc(APPSTORE)}" aria-label="Download Only Floofs on the App Store"><img src="${BADGE}" alt="Download Only Floofs on the App Store"></a><span class="nav">Also here: ${relNav}</span></div>
${grid}
${pager}
<p class="blurb">${esc(c.blurb)}</p>
${faq}
<footer>${esc(c.h1)} on <a href="/only-floofs/">Only Floofs</a>, the home of the internet's cutest pets. Also see ${relNav}. New photos every day. <a href="${esc(APPSTORE)}">Get the free iOS app</a>.</footer>
</div></body></html>`, { headers: { "content-type": "text/html; charset=utf-8", "cache-control": "public, max-age=600, s-maxage=3600" } });
}

const pageOf = (request) => {
  try { return parseInt(new URL(request.url).searchParams.get("page"), 10) || 1; } catch { return 1; }
};

export async function render(key, request) {
  const c = COPY[key];
  if (!c) return new Response("Not found", { status: 404 });
  const page = pageOf(request);
  if (c.mix) {
    const { pets, speciesTally } = await fetchMixAll();
    const chips = speciesTally
      .filter((t) => t.sp !== "cat" && t.sp !== "dog" && t.sp !== "other" && t.count >= 3)
      .sort((a, b) => b.count - a.count).slice(0, 12)
      .map((t) => ({ path: `/only-floofs/animals/${slugify(t.sp)}`, label: plural(title1(t.sp)) }));
    return buildPage(c, pets, { page, chips, chipsLabel: "Browse by animal" });
  }
  const { pets, breeds } = await fetchSpeciesAll(c.species);
  const chips = c.showBreeds
    ? [...breeds.values()].filter((b) => b.count >= 2).sort((a, b) => b.count - a.count).slice(0, 14)
        .map((b) => ({ path: `/only-floofs/breed/${b.slug}`, label: b.label }))
    : [];
  return buildPage(c, pets, { page, chips, chipsLabel: "Popular breeds" });
}

// /only-floofs/breed/{slug}
export async function renderBreed(slugParam, request) {
  const slug = slugify(slugParam || "");
  if (!slug) return new Response("Not found", { status: 404 });
  const { pets, display, species } = await fetchBreedAll(slug);
  if (pets.length < 1) return new Response("Not found", { status: 404 });
  const sp = (species === "cat") ? "cat" : "dog";
  const c = {
    path: `/only-floofs/breed/${slug}`, emoji: sp === "cat" ? "🐱" : "🐶", oneLabel: display.toLowerCase(),
    title: `Cute ${display} Pictures — ${display} photos on Only Floofs`, h1: `Cute ${display} pictures`,
    lead: `Real ${display}s, shared by their owners on Only Floofs and updated as new ones are posted. Every photo passed moderation, so it's all genuine ${display} cuteness, with thousands more pets in the free app.`,
    desc: `Cute ${display} pictures on Only Floofs. Real ${display}s shared by their owners, updated regularly. Heart your favorites and make your own ${display} famous.`,
    kw: `cute ${display.toLowerCase()}, ${display.toLowerCase()} pictures, ${display.toLowerCase()} photos, cute ${sp}s, ${sp} pics, only floofs`,
    blurb: `Every ${display} here belongs to a real owner who shares it on Only Floofs. Tap any one to meet it, or post your own ${display} and watch the hearts roll in.`,
    related: [{ path: `/only-floofs/${sp}s`, label: `more cute ${sp}s` }, { path: "/not-only-paws", label: "reptiles, birds & more" }],
    faqs: [
      { q: `Where can I find cute ${display} pictures?`, a: `Right here. This page collects real ${display}s shared by their owners on Only Floofs, and there are thousands more pets in the free app.` },
      { q: `Are these real ${display}s?`, a: `Yes. Every photo is posted by the pet's owner and passes automatic moderation before it appears.` },
      { q: `Can I add my ${display}?`, a: `Yes, and it's free. Post your ${display} in the Only Floofs app and it can collect hearts and climb the leaderboards.` },
    ],
  };
  return buildPage(c, pets, { page: pageOf(request), robots: pets.length < 3 ? "noindex,follow" : "index,follow" });
}

// /only-floofs/animals/{species} — any non-cat/dog animal category.
export async function renderSpecies(speciesParam, request) {
  const slug = slugify(speciesParam || "");
  if (!slug) return new Response("Not found", { status: 404 });
  // match on the slug of the post's species value
  const pets = [], seen = new Set();
  let display = "";
  await pageFeed((batch) => {
    for (const p of batch) {
      const n = normalize(p);
      if (!n.species || slugify(n.species) !== slug || !n.id || !n.img || seen.has(n.id)) continue;
      seen.add(n.id); pets.push(n);
      if (!display) display = title1(n.species);
      if (pets.length >= CAP) return false;
    }
  });
  if (pets.length < 1) return new Response("Not found", { status: 404 });
  const one = display.toLowerCase(), many = plural(one);
  const c = {
    path: `/only-floofs/animals/${slug}`, emoji: "🐾", oneLabel: one,
    title: `Cute ${plural(display)} — ${many} on Only Floofs`, h1: `Cute ${many}`,
    lead: `It's not only paws: meet the ${many} of Only Floofs. Real ${many} shared by their owners and updated as new ones are posted, with thousands of pets of every kind in the free app.`,
    desc: `Cute ${many} on Only Floofs. Real ${many} shared by their owners. It's not only paws, every animal is welcome.`,
    kw: `cute ${many}, ${many}, ${one} pictures, cute pets, not only paws, only floofs`,
    blurb: `Proof that it's not only paws. Every ${one} here belongs to a real owner on Only Floofs. Tap any one to meet it, or post your own.`,
    related: [{ path: "/not-only-paws", label: "every animal" }, { path: "/only-floofs/cats", label: "cute cats" }, { path: "/only-floofs/dogs", label: "cute dogs" }],
    faqs: [
      { q: `Where can I find cute ${many}?`, a: `Right here. Only Floofs isn't only paws, this page collects real ${many} shared by their owners, with more in the free app.` },
      { q: `Are these real ${many}?`, a: `Yes. Every photo is owner-submitted and passes moderation before it appears.` },
      { q: `Can I post my ${one}?`, a: `Yes, and it's free. Any animal is welcome in the Only Floofs app.` },
    ],
  };
  return buildPage(c, pets, { page: pageOf(request), robots: pets.length < 3 ? "noindex,follow" : "index,follow" });
}
