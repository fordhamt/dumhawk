// Cloudflare Pages Function: /only-floofs/funny — the goofiest floofs.
import { render } from "./_gallery.js";
export const onRequestGet = ({ request }) => render("funny", request);
