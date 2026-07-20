// Cloudflare Pages Function: /only-floofs/in/{place} — cute pets near you,
// e.g. /only-floofs/in/austin. Backed by the app's places index + place feed.
import { renderPlace } from "../_gallery.js";
export const onRequestGet = ({ params, request }) =>
  renderPlace(params?.place ? decodeURIComponent(params.place) : "", request);
