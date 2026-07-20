// Cloudflare Pages Function: /only-floofs/kittens — cute kitten pictures.
import { render } from "./_gallery.js";
export const onRequestGet = ({ request }) => render("kittens", request);
