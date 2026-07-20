#!/usr/bin/env node
// Sync the Only Floofs App Store rating shown on only-floofs/index.html with the
// live App Store numbers for app id 6781334218 (both the visible badge and the
// JSON-LD aggregateRating, so they always match).
//
// Data source: Apple's public iTunes lookup API (clean JSON). For a very new app
// that API can lag, so if it has not yet propagated a rating we fall back to a
// best-effort parse of the storefront page. Either way this script REFUSES to
// write a zero/empty rating — it keeps whatever is already in the file. That
// guard means the page can never regress to "0 ratings" if Apple's data lags or
// a fetch fails; at worst it keeps the last-known-good number.

import { readFile, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const APP_ID = "6781334218";
const COUNTRY = "us";
const FILE = join(dirname(fileURLToPath(import.meta.url)), "..", "only-floofs", "index.html");

async function fromLookupApi() {
  const url = `https://itunes.apple.com/lookup?id=${APP_ID}&country=${COUNTRY}`;
  const res = await fetch(url, { headers: { accept: "application/json" } });
  if (!res.ok) throw new Error(`lookup HTTP ${res.status}`);
  const data = await res.json();
  const r = data && data.results && data.results[0];
  if (!r) return null;
  return { value: Number(r.averageUserRating), count: Number(r.userRatingCount), source: "lookup" };
}

async function fromStorefront() {
  // Best-effort fallback. The storefront embeds an app-attributes blob that
  // carries a userRating object; shape can change, so failure here is non-fatal.
  const url = `https://apps.apple.com/${COUNTRY}/app/id${APP_ID}`;
  const res = await fetch(url, {
    headers: { "user-agent": "Mozilla/5.0 (compatible; dumhawk-rating-bot/1.0)" },
  });
  if (!res.ok) throw new Error(`storefront HTTP ${res.status}`);
  const html = await res.text();
  const a = html.match(/"userRating"\s*:\s*\{[^}]*?"value"\s*:\s*([\d.]+)[^}]*?"ratingCount"\s*:\s*(\d+)/);
  if (a) return { value: Number(a[1]), count: Number(a[2]), source: "storefront" };
  const b = html.match(/"userRating"\s*:\s*\{[^}]*?"ratingCount"\s*:\s*(\d+)[^}]*?"value"\s*:\s*([\d.]+)/);
  if (b) return { value: Number(b[2]), count: Number(b[1]), source: "storefront" };
  return null;
}

export function valid(r) {
  return !!r && Number.isFinite(r.value) && r.value > 0 && Number.isInteger(r.count) && r.count > 0;
}

export function stars(value) {
  const full = Math.max(0, Math.min(5, Math.round(value)));
  return "★".repeat(full) + "☆".repeat(5 - full);
}

export function fmt(value) {
  return (Math.round(value * 10) / 10).toFixed(1); // one decimal, e.g. "5.0", "4.8"
}

export function applyToHtml(html, r) {
  const value = fmt(r.value);
  const count = String(r.count);
  const star = stars(r.value);
  let out = html;
  out = out.replace(/(<!--rating:stars-->)[\s\S]*?(<!--\/rating:stars-->)/, `$1${star}$2`);
  out = out.replace(/(<!--rating:value-->)[\s\S]*?(<!--\/rating:value-->)/, `$1${value}$2`);
  out = out.replace(/(<!--rating:count-->)[\s\S]*?(<!--\/rating:count-->)/, `$1${count}$2`);
  out = out.replace(
    /aria-label="Rated [\d.]+ out of 5 stars from \d+ App Store ratings"/,
    `aria-label="Rated ${value} out of 5 stars from ${count} App Store ratings"`
  );
  out = out.replace(/("ratingValue"\s*:\s*")[^"]*(")/, `$1${value}$2`);
  out = out.replace(/("ratingCount"\s*:\s*")[^"]*(")/, `$1${count}$2`);
  return out;
}

async function main() {
  let r = null;
  try { r = await fromLookupApi(); } catch (e) { console.log("lookup failed:", e.message); }
  if (!valid(r)) {
    console.log("lookup had no usable rating yet; trying storefront fallback…");
    try { r = await fromStorefront(); } catch (e) { console.log("storefront failed:", e.message); }
  }
  if (!valid(r)) {
    console.log("No usable rating from any source — leaving the file unchanged (guard).");
    return;
  }
  const html = await readFile(FILE, "utf8");
  const next = applyToHtml(html, r);
  if (next === html) {
    console.log(`Rating unchanged (${fmt(r.value)} from ${r.count}, via ${r.source}).`);
    return;
  }
  await writeFile(FILE, next);
  console.log(`Updated rating to ${fmt(r.value)} from ${r.count} ratings (via ${r.source}).`);
}

// Only run when executed directly (so tests can import the pure helpers safely).
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((e) => { console.error(e); process.exit(1); });
}
