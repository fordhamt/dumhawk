// Cloudflare Pages Function: /only-floofs/cats — the "cute cat pictures" gallery
// (paginated via ?page; popular-breed chips link the breed pages). Logic in _gallery.js.
import { render } from "./_gallery.js";
export const onRequestGet = ({ request }) => render("cat", request);
