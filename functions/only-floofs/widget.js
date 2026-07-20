// Cloudflare Pages Function: /only-floofs/widget — embeddable Pet of the Day.
import { renderWidget } from "./_winners.js";
export const onRequestGet = () => renderWidget();
