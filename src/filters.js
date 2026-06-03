// ═══════════════════════════════════════════════════════════════════════
//  BUILT-IN FILTERS
// ═══════════════════════════════════════════════════════════════════════

import { _filters } from "./globals.js";

// Text
_filters.uppercase = (v) => String(v ?? "").toUpperCase();
_filters.lowercase = (v) => String(v ?? "").toLowerCase();
_filters.capitalize = (v) =>
  String(v ?? "").replace(/\b\w/g, (c) => c.toUpperCase());
_filters.truncate = (v, len = 100) => {
  const s = String(v ?? "");
  return s.length > len ? s.slice(0, len) + "..." : s;
};
_filters.trim = (v) => String(v ?? "").trim();
_filters.stripHtml = (v) => String(v ?? "").replace(/<[^>]*>/g, "");
_filters.slugify = (v) =>
  String(v ?? "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
_filters.nl2br = (v) =>
  String(v ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\n/g, "<br>");
_filters.encodeUri = (v) => encodeURIComponent(String(v ?? ""));

// Clamp a decimals argument to the range accepted by toLocaleString/toFixed
// (0–100). Coerces non-numeric / out-of-range values instead of letting
// RangeError abort the whole render.
const _clampDecimals = (decimals, fallback = 0) => {
  const d = Math.floor(Number(decimals));
  if (isNaN(d)) return fallback;
  if (d < 0) return 0;
  if (d > 100) return 100;
  return d;
};

// Numbers
_filters.number = (v, decimals = 0) => {
  const n = Number(v);
  if (isNaN(n)) return v;
  const d = _clampDecimals(decimals);
  return n.toLocaleString(undefined, {
    minimumFractionDigits: d,
    maximumFractionDigits: d,
  });
};
_filters.currency = (v, code = "USD") => {
  const n = Number(v);
  if (isNaN(n)) return v;
  try {
    return n.toLocaleString(undefined, { style: "currency", currency: code });
  } catch {
    return `${code} ${n.toFixed(2)}`;
  }
};
_filters.percent = (v, decimals = 0) => {
  const n = Number(v);
  if (isNaN(n)) return v;
  return (n * 100).toFixed(_clampDecimals(decimals)) + "%";
};
_filters.filesize = (v) => {
  const n = Number(v);
  if (isNaN(n)) return v;
  const units = ["B", "KB", "MB", "GB", "TB"];
  const sign = n < 0 ? "-" : "";
  let i = 0;
  let size = Math.abs(n);
  while (size >= 1024 && i < units.length - 1) {
    size /= 1024;
    i++;
  }
  return sign + size.toFixed(i > 0 ? 1 : 0) + " " + units[i];
};
_filters.ordinal = (v) => {
  const n = Number(v);
  if (isNaN(n)) return v;
  const s = ["th", "st", "nd", "rd"];
  const mod = n % 100;
  return n + (s[(mod - 20) % 10] || s[mod] || s[0]);
};

// Arrays
_filters.count = (v) => (Array.isArray(v) ? v.length : 0);
_filters.first = (v) => (Array.isArray(v) ? v[0] : v);
_filters.last = (v) => (Array.isArray(v) ? v[v.length - 1] : v);
_filters.join = (v, sep = ", ") => (Array.isArray(v) ? v.join(sep) : v);
_filters.reverse = (v) => (Array.isArray(v) ? [...v].reverse() : v);
_filters.unique = (v) => (Array.isArray(v) ? [...new Set(v)] : v);
_filters.pluck = (v, key) => (Array.isArray(v) ? v.map((i) => i?.[key]) : v);
_filters.sortBy = (v, key) => {
  if (!Array.isArray(v)) return v;
  const desc = key?.startsWith("-");
  const k = desc ? key.slice(1) : key;
  // null/undefined/NaN keys are non-comparable: always sink them to the end
  // (independent of sort direction) so they don't poison the ordering.
  const isNil = (x) =>
    x == null || (typeof x === "number" && isNaN(x));
  return [...v].sort((a, b) => {
    const va = a?.[k],
      vb = b?.[k];
    const na = isNil(va),
      nb = isNil(vb);
    if (na && nb) return 0;
    if (na) return 1;
    if (nb) return -1;
    const r = va < vb ? -1 : va > vb ? 1 : 0;
    return desc ? -r : r;
  });
};
_filters.where = (v, key, val) =>
  Array.isArray(v) ? v.filter((i) => i?.[key] === val) : v;

// Date
// Date-only ISO strings ("2026-05-29") are parsed by the JS engine as UTC
// midnight, which renders as the previous day in any negative-UTC-offset zone.
// Append a local-time component so the date is interpreted in the local zone.
const _DATE_ONLY_RE = /^\d{4}-\d{2}-\d{2}$/;
const _parseDate = (v) =>
  typeof v === "string" && _DATE_ONLY_RE.test(v)
    ? new Date(v + "T00:00:00")
    : new Date(v);

_filters.date = (v, fmt = "short") => {
  const d = _parseDate(v);
  if (isNaN(d)) return v;
  const opts =
    fmt === "long"
      ? { dateStyle: "long" }
      : fmt === "full"
        ? { dateStyle: "full" }
        : { dateStyle: "short" };
  return d.toLocaleDateString(undefined, opts);
};
_filters.datetime = (v) => {
  const d = _parseDate(v);
  if (isNaN(d)) return v;
  return d.toLocaleString();
};
_filters.relative = (v) => {
  const d = _parseDate(v);
  if (isNaN(d)) return v;
  const diff = (Date.now() - d.getTime()) / 1000;
  // Future timestamps (negative diff) are not "just now"; delegate to fromNow.
  if (diff < 0) return _filters.fromNow(v);
  if (diff < 60) return "just now";
  if (diff < 3600) return Math.floor(diff / 60) + "m ago";
  if (diff < 86400) return Math.floor(diff / 3600) + "h ago";
  if (diff < 2592000) return Math.floor(diff / 86400) + "d ago";
  return d.toLocaleDateString();
};
_filters.fromNow = (v) => {
  const d = _parseDate(v);
  if (isNaN(d)) return v;
  const diff = (d.getTime() - Date.now()) / 1000;
  if (diff < 0) return _filters.relative(v);
  if (diff < 60) return "in a moment";
  if (diff < 3600) return "in " + Math.floor(diff / 60) + "m";
  if (diff < 86400) return "in " + Math.floor(diff / 3600) + "h";
  return "in " + Math.floor(diff / 86400) + "d";
};

// Utility
_filters.default = (v, def = "") => (v == null || v === "" ? def : v);
_filters.json = (v, indent = 2) => JSON.stringify(v, null, indent);
_filters.debug = (v) => {
  console.log("[No.JS debug]", v);
  return v;
};
_filters.keys = (v) => (v && typeof v === "object" ? Object.keys(v) : []);
_filters.values = (v) => (v && typeof v === "object" ? Object.values(v) : []);
