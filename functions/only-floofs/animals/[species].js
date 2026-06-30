// Cloudflare Pages Function: /only-floofs/animals/{species} — a gallery for any
// non-cat/dog animal category (reptiles, birds, bunnies, …). One dynamic route
// covers every species, so these pages appear automatically as that content
// shows up. Linked from /not-only-paws "browse by animal" chips. 404 when empty,
// noindex when thin, paginated via ?page. Logic in the shared gallery module.
import { renderSpecies } from "../_gallery.js";
export const onRequestGet = ({ params, request }) =>
  renderSpecies(params?.species ? decodeURIComponent(params.species) : "", request);
