// Cloudflare Pages Function: /only-floofs/top-floofs
// Live daily leaderboard snapshot (hearts x2 + likes). Logic in _winners.js.
import { renderTopFloofs } from "./_winners.js";
export const onRequestGet = () => renderTopFloofs();
