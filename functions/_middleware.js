// Root Pages middleware: guarantee the Apple App Site Association (AASA) is served
// with an application/json Content-Type. App Clip domain validation requires it,
// but Cloudflare served the extensionless static file as application/octet-stream.
// Neither the _headers Content-Type rule nor a nested functions/.well-known/ function
// took effect (Cloudflare's build skips dot-directories under functions/). Middleware
// sits at a non-dot path so it's always built and runs before static-asset serving;
// it only rewrites the AASA path and passes everything else straight through.
export async function onRequest(context) {
  const { pathname } = new URL(context.request.url);
  if (pathname === "/.well-known/apple-app-site-association") {
    const AASA = {"applinks":{"details":[{"appIDs":["6H84MW6HH2.com.onlyfloofs.app"],"components":[{"/":"/only-floofs/p/*","comment":"Open a shared post in the app"},{"/":"/only-floofs/join/*","comment":"Redeem a co-owner invite in the app"}]}]},"appclips":{"apps":["6H84MW6HH2.com.onlyfloofs.app.Clip"]}};
    return new Response(JSON.stringify(AASA), {
      headers: { "content-type": "application/json", "cache-control": "public, max-age=3600" }
    });
  }
  return context.next();
}
