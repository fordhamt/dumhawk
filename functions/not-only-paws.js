// Cloudflare Pages Function: /not-only-paws — the "it's not only paws" page.
// A deliberate MIX of animals (reptiles, birds, bunnies first, then cats & dogs)
// that captures the "only paws" search phrase as a pun and surfaces "browse by
// animal" chips. The brand stays Only Floofs. Logic in the shared gallery module.
import { render } from "./only-floofs/_gallery.js";
export const onRequestGet = ({ request }) => render("onlypaws", request);
