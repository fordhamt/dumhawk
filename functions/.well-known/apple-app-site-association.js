// AASA served with an explicit application/json Content-Type. A Pages Function
// controls its own response headers; the extensionless static file was served as
// application/octet-stream (the _headers rule silently no-op'd), which passes
// universal links but fails App Clip domain validation. Mirrors the static file at
// /.well-known/apple-app-site-association.
//
// KEEP THE COMPONENT LIST IN LOCK-STEP WITH THE STATIC FILE. This function is
// what Cloudflare actually serves (Functions shadow static files), so a claim
// added only to the static file never reaches Apple's CDN. That is exactly how
// the ?ref= referral claim sat dead from Aug 9 to Aug 15 2026.
const AASA = {"applinks":{"details":[{"appIDs":["6H84MW6HH2.com.onlyfloofs.app"],"components":[{"/":"/only-floofs/p/*","comment":"Open a shared post in the app"},{"/":"/only-floofs/join/*","comment":"Redeem a co-owner invite in the app"},{"/":"/only-floofs/","?":{"ref":"*"},"comment":"Referral invite links (?ref=CODE) open the app so the code auto-redeems; without this claim the ?ref capture in OnlyFloofsApp was unreachable and every invite opened Safari"}]}]},"appclips":{"apps":["6H84MW6HH2.com.onlyfloofs.app.Clip"]}};

export const onRequestGet = () =>
  new Response(JSON.stringify(AASA), {
    headers: { "content-type": "application/json", "cache-control": "public, max-age=3600" }
  });
