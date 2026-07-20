// Cloudflare Pages Function: /only-floofs/pet-of-the-day
// Today's leader + the Hall of Fame of every daily winner. Logic in _winners.js.
import { renderPetOfDay } from "./_winners.js";
export const onRequestGet = () => renderPetOfDay();
