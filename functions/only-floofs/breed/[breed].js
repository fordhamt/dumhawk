// Cloudflare Pages Function: /only-floofs/breed/{slug} — a per-breed gallery,
// e.g. /only-floofs/breed/golden-retriever -> "Cute Golden Retriever Pictures".
// Linked from the cat/dog galleries' breed chips. 404 when empty, noindex when
// thin, paginated via ?page. Logic in the shared gallery module.
import { renderBreed } from "../_gallery.js";
export const onRequestGet = ({ params, request }) =>
  renderBreed(params?.breed ? decodeURIComponent(params.breed) : "", request);
