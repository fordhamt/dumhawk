// Cloudflare Pages Function: serves https://dumhawk.com/robots.txt
//
// Explicitly allows search crawlers and points them at the sitemap. This is the
// state we WANT robots.txt to be in.
//
// IMPORTANT caveat: if Cloudflare's "Manage robots.txt" / AI Crawl Control is
// enabled on the zone, Cloudflare serves its own managed robots.txt at the edge
// and this function will NOT be reached. The live file currently looks managed
// (it uses Cloudflare's "content-signal" comment format). So either:
//   (a) In the Cloudflare dashboard, disable "Manage robots.txt" so this file is
//       served, OR
//   (b) Leave it managed but make sure the managed policy has  search = yes
//       (it must not block search engines) and add the Sitemap line below.
//
// Deploy: file at  functions/robots.txt.js  is served at  /robots.txt .
// Source of record: Only-Paws repo infra/cloudflare/...

const SITE = "https://dumhawk.com";

export const onRequestGet = async () =>
  new Response(
    `User-agent: *
Allow: /

Sitemap: ${SITE}/sitemap.xml
`,
    {
      headers: {
        "content-type": "text/plain; charset=utf-8",
        "cache-control": "public, max-age=3600",
      },
    }
  );
