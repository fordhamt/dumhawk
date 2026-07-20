// Cloudflare Pages Function: /only-floofs/puppies — cute puppy pictures.
import { render } from "./_gallery.js";
export const onRequestGet = ({ request }) => render("puppies", request);
