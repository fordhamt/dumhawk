// Cloudflare Pages Function: /only-floofs/champions
// Floof Madness bracket champions, newest first. Logic in _winners.js.
import { renderChampions } from "./_winners.js";
export const onRequestGet = () => renderChampions();
