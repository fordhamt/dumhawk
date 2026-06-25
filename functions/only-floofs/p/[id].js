// Cloudflare Pages Function: server-renders a shared post page for
// dumhawk.com/only-floofs/p/{id} with per-post Open Graph tags, so a pasted link
// unfurls with the pet's photo + name in iMessage/Slack/Twitter (crawlers don't
// run JS, so the static site can't do this). On iOS with the app the universal
// link is intercepted before this loads; this serves everyone else (desktop,
// Android, browsers, link-preview bots) and returns a true 200.
//
// Deploy: drop this file at  functions/only-floofs/p/[id].js  in the GitHub repo
// that Cloudflare Pages builds dumhawk.com from. On the next push, Cloudflare
// serves /only-floofs/p/* through this function; everything else stays static.
// No AWS, no DNS change. Rollback = delete the file and redeploy.

const API = "https://d36iyq17my087a.cloudfront.net";
const APPSTORE = "https://apps.apple.com/app/only-floofs/id6781334218";

const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) =>
  ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

function page(post) {
  const pet = post?.pet || {};
  const name = pet.name || "A floof";
  const img = post?.imageURL || post?.thumbURL || "https://dumhawk.com/assets/floofs/loki-main.jpg";
  const hearts = (post?.hearts || 0).toLocaleString();
  const likes = (post?.likes || 0).toLocaleString();
  const title = post ? `${name} on Only Floofs` : "Only Floofs";
  const desc = post
    ? "Where pets become famous. 🐾"
    : "Where pets become famous. Meet the internet's cutest pets.";
  return `<!DOCTYPE html><html lang="en"><head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="color-scheme" content="dark">
<title>${esc(title)}</title>
<meta name="description" content="${esc(desc)}">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(desc)}">
<meta property="og:type" content="website">
<meta property="og:image" content="${esc(img)}">
<meta property="og:url" content="https://dumhawk.com/only-floofs/">
<meta name="twitter:card" content="summary_large_image">
<style>
*{box-sizing:border-box}html,body{margin:0;background:#0b0b0f}
body{font:16px/1.6 -apple-system,BlinkMacSystemFont,"SF Pro Text","Segoe UI",Roboto,Helvetica,Arial,sans-serif;color:#f2f2f7}
.wrap{max-width:560px;margin:0 auto;padding:40px 22px 64px;text-align:center}
.pill{display:inline-block;font-size:12px;font-weight:700;letter-spacing:.4px;text-transform:uppercase;color:#fff;
 background:linear-gradient(90deg,#db3eb1,#41b6e6);padding:5px 13px;border-radius:999px;margin-bottom:22px}
.photo{width:100%;aspect-ratio:1/1;object-fit:cover;border-radius:20px;border:1px solid #23232c;display:block}
.ident{margin:18px 0 4px}.name{font-size:24px;font-weight:800;color:#fff}.breed{color:#b6b6c2}
.counts{color:#b6b6c2;margin:10px 0}.counts b{color:#fff}
.cta{margin-top:24px}.cta img{height:54px}
a{color:#b9a3ff;text-decoration:none}.muted{color:#8e8e9a;font-size:13px;margin-top:28px}
</style></head><body><div class="wrap">
<span class="pill">Only Floofs</span>
${post ? `
<img class="photo" src="${esc(img)}" alt="${esc(name)}">
<div class="ident"><div class="name">${esc(name)}</div><div class="breed">${esc(pet.breed || "")}</div></div>
<div class="counts"><b>${hearts}</b> hearts · <b>${likes}</b> likes</div>` : `
<h1 style="color:#fff">Meet the cutest pets on the internet.</h1>
<p style="color:#b6b6c2">Get Only Floofs to see this floof, heart it, and follow along.</p>`}
<div class="cta"><a href="${esc(APPSTORE)}"><img src="https://tools.applemediaservices.com/api/badges/download-on-the-app-store/black/en-us?size=250x83" alt="Download on the App Store"></a></div>
<p class="muted"><a href="https://dumhawk.com/only-floofs/">Only Floofs</a> · <a href="https://dumhawk.com/only-floofs/support.html">Support</a></p>
</div></body></html>`;
}

export const onRequestGet = async ({ params }) => {
  const id = params?.id ? decodeURIComponent(params.id) : null;
  let post = null;
  if (id) {
    try {
      const r = await fetch(`${API}/posts/${encodeURIComponent(id)}`, { cf: { cacheTtl: 60 } });
      if (r.ok) post = await r.json();
    } catch { /* fall through to the generic brand page */ }
  }
  return new Response(page(post), {
    headers: {
      "content-type": "text/html; charset=utf-8",
      // Edge-cache the rendered page; counts refresh within a few minutes.
      "cache-control": "public, max-age=60, s-maxage=300",
    },
  });
};
