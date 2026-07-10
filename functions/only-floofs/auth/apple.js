// Cloudflare Pages Function: Sign in with Apple WEB-flow bounce page for the
// Android app, served at dumhawk.com/only-floofs/auth/apple.
//
// Android has no native Sign in with Apple, so the app opens Apple's OAuth in a
// Custom Tab with response_mode=form_post and this URL as the return_uri. Apple
// then form-POSTs the result here. A browser can't hand a POST body to a native
// app, so this page reads the POST fields and immediately redirects the Custom
// Tab to the app's custom scheme (onlyfloofs://auth/apple?...), carrying the
// id_token, state (CSRF echo), and the first-consent `user` JSON. The app
// verifies state, then exchanges the id_token at POST /auth/google's sibling
// POST /auth/apple.
//
// The token's audience is the Services ID com.onlyfloofs.app.signin, the same
// Apple `sub` as the native iOS flow, so both platforms resolve to one account.
//
// Deploy: this file lives at  functions/only-floofs/auth/apple.js  in the GitHub
// repo Cloudflare Pages builds dumhawk.com from. The copy here in the Only-Paws
// repo (infra/cloudflare/...) is the source of record and must be kept in sync.

const APP_SCHEME = "onlyfloofs://auth/apple";

const esc = (s) =>
  String(s ?? "").replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

// Build the app deep link, forwarding only the fields the app needs.
function appRedirect(params) {
  const u = new URL(APP_SCHEME);
  for (const key of ["id_token", "state", "user", "error"]) {
    const v = params.get(key);
    if (v) u.searchParams.set(key, v);
  }
  return u.toString();
}

// A tiny page that jumps straight to the app, with a manual fallback link in
// case the automatic redirect is blocked. No user data is rendered or logged.
function bouncePage(deepLink) {
  const safe = esc(deepLink);
  return `<!doctype html><html lang="en"><head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="robots" content="noindex">
<title>Signing you in…</title>
<style>
  body{margin:0;background:#0D0B1A;color:#F6F1FB;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;
       display:flex;min-height:100vh;align-items:center;justify-content:center;text-align:center}
  .card{padding:32px}
  .dot{width:44px;height:44px;margin:0 auto 18px;border-radius:50%;
       background:linear-gradient(135deg,#DB3EB1,#41B6E6)}
  a{color:#2DE2E6;font-weight:600;text-decoration:none}
</style>
<script>location.replace(${JSON.stringify(deepLink)});</script>
</head><body><div class="card">
  <div class="dot"></div>
  <p>Finishing your sign-in…</p>
  <p><a href="${safe}">Return to Only Floofs</a></p>
</div></body></html>`;
}

const html = (body) =>
  new Response(body, {
    status: 200,
    headers: { "content-type": "text/html; charset=utf-8", "cache-control": "no-store" },
  });

// Apple posts application/x-www-form-urlencoded when scope includes name/email.
export async function onRequestPost({ request }) {
  const form = await request.formData();
  const params = new URLSearchParams();
  for (const [k, v] of form.entries()) params.set(k, typeof v === "string" ? v : "");
  return html(bouncePage(appRedirect(params)));
}

// Fallback: a direct visit or an error-mode GET still bounces to the app so it
// can show a clean "try again" instead of stranding the Custom Tab.
export async function onRequestGet({ request }) {
  const params = new URL(request.url).searchParams;
  if (!params.get("id_token") && !params.get("error")) params.set("error", "no_response");
  return html(bouncePage(appRedirect(params)));
}
