#!/usr/bin/env node
/**
 * i18n Audit Script
 *
 * 1. MISSING KEYS: finds t="namespace.key.path" refs in templates that have
 *    no corresponding leaf in the EN locale JSON.
 * 2. DEAD KEYS: finds leaf keys in EN JSON that are not referenced by any template.
 *
 * Excluded from dead-key check (used dynamically by framework):
 *   shell.demo.*, shell.langSwitcher.*, shell.flag
 */

const fs = require('fs');
const path = require('path');

// ── Config ──────────────────────────────────────────────────────────────────
const TEMPLATES_DIR = path.join(__dirname, 'templates');
const INDEX_HTML    = path.join(__dirname, 'index.html');
const LOCALES_DIR   = path.join(__dirname, 'locales', 'en');

const LOCALE_FILES = [
  'shell.json', 'landing.json', 'features.json',
  'docs.json', 'examples.json', 'faq.json', 'playground.json',
];

const NAMESPACES = LOCALE_FILES.map(f => f.replace('.json', ''));

// Dynamic keys excluded from dead-key check
const DEAD_KEY_EXCLUDES = [
  /^shell\.demo\./,
  /^shell\.langSwitcher\./,
  /^shell\.flag$/,
];

// ── Helpers ─────────────────────────────────────────────────────────────────
function collectTplFiles(dir) {
  const results = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) results.push(...collectTplFiles(full));
    else if (entry.name.endsWith('.tpl')) results.push(full);
  }
  return results;
}

/** Flatten a nested object into dotted paths: { a: { b: 'x' } } → ['a.b'] */
function flattenKeys(obj, prefix = '') {
  const keys = [];
  for (const [k, v] of Object.entries(obj)) {
    const fullKey = prefix ? `${prefix}.${k}` : k;
    if (v && typeof v === 'object' && !Array.isArray(v)) {
      keys.push(...flattenKeys(v, fullKey));
    } else {
      keys.push(fullKey);
    }
  }
  return keys;
}

/** Resolve a dotted path against an object, return undefined if missing */
function resolvePath(obj, dotted) {
  const parts = dotted.split('.');
  let cur = obj;
  for (const p of parts) {
    if (cur == null || typeof cur !== 'object') return undefined;
    cur = cur[p];
  }
  return cur;
}

// ── Load locale data ────────────────────────────────────────────────────────
const localeData = {};   // namespace → parsed JSON
const allLeafKeys = {};  // namespace → Set of dotted leaf key paths (including namespace prefix)

for (const file of LOCALE_FILES) {
  const ns = file.replace('.json', '');
  const json = JSON.parse(fs.readFileSync(path.join(LOCALES_DIR, file), 'utf8'));
  localeData[ns] = json;
  const leaves = flattenKeys(json);
  allLeafKeys[ns] = new Set(leaves);
}

// ── Extract i18n refs from templates ────────────────────────────────────────
// Patterns:
//   t="namespace.key.path"                 (attribute)
//   $i18n.t('namespace.key.path')          (expression)
//   $i18n.t("namespace.key.path")          (expression)

// Pattern 1: t="namespace.key.path"
const RE_T_ATTR   = /\bt="([^"]+)"/g;
// Pattern 2: $i18n.t('namespace.key.path') or $i18n.t("namespace.key.path")
const RE_I18N_FN  = /\$i18n\.t\(['"]([^'"]+)['"]\)/g;
// Pattern 3: t-placeholder="namespace.key.path" (translates arbitrary HTML attrs)
const RE_T_DASH   = /\bt-[a-z][-a-z]*="([^"]+)"/g;
// Pattern 4: setAttribute('t', 'namespace.key.path') (dynamic JS)
const RE_SET_ATTR = /setAttribute\(['"]t['"],\s*['"]([^'"]+)['"]\)/g;

function isI18nKey(value) {
  // Must start with a known namespace and contain at least one dot
  if (!value.includes('.')) return false;
  const ns = value.split('.')[0];
  return NAMESPACES.includes(ns);
}

function extractRefs(content, filePath) {
  const refs = [];
  let m;

  const patterns = [RE_T_ATTR, RE_I18N_FN, RE_T_DASH, RE_SET_ATTR];
  for (const re of patterns) {
    re.lastIndex = 0;
    while ((m = re.exec(content)) !== null) {
      const val = m[1];
      if (isI18nKey(val)) {
        refs.push({ key: val, file: filePath, line: lineOf(content, m.index) });
      }
    }
  }

  return refs;
}

function lineOf(content, offset) {
  return content.substring(0, offset).split('\n').length;
}

// ── Collect all refs ────────────────────────────────────────────────────────
const allRefs = [];
const allRefKeys = new Set();

const tplFiles = collectTplFiles(TEMPLATES_DIR);
// Also scan JS files that may use $i18n.t() or setAttribute('t', ...)
const ENGINE_JS = path.join(__dirname, 'playground', 'engine.js');
const extraFiles = fs.existsSync(ENGINE_JS) ? [ENGINE_JS] : [];
const filesToScan = [...tplFiles, INDEX_HTML, ...extraFiles];

for (const file of filesToScan) {
  const content = fs.readFileSync(file, 'utf8');
  const refs = extractRefs(content, file);
  allRefs.push(...refs);
  for (const r of refs) allRefKeys.add(r.key);
}

// ── CHECK 1: Missing keys ───────────────────────────────────────────────────
const missingKeys = [];

for (const ref of allRefs) {
  const ns = ref.key.split('.')[0];
  const json = localeData[ns];
  if (!json) {
    missingKeys.push({ ...ref, reason: `namespace "${ns}" not found` });
    continue;
  }
  // The key in the JSON starts from the namespace, e.g. "landing.hero.badge"
  // and the JSON is { landing: { hero: { badge: "..." } } }
  const resolved = resolvePath(json, ref.key);
  if (resolved === undefined) {
    missingKeys.push({ ...ref, reason: 'key not found in EN locale' });
  }
}

// ── CHECK 2: Dead keys ─────────────────────────────────────────────────────
const deadKeys = [];

for (const [ns, leafSet] of Object.entries(allLeafKeys)) {
  for (const fullKey of leafSet) {
    // Check exclusions
    if (DEAD_KEY_EXCLUDES.some(re => re.test(fullKey))) continue;
    if (!allRefKeys.has(fullKey)) {
      deadKeys.push(fullKey);
    }
  }
}

// ── Report ──────────────────────────────────────────────────────────────────
const BASE = path.join(__dirname);

console.log('══════════════════════════════════════════════════════════');
console.log('  i18n AUDIT REPORT — EN locale vs templates');
console.log('══════════════════════════════════════════════════════════\n');

console.log(`Scanned: ${filesToScan.length} files, found ${allRefs.length} i18n refs, ${Object.values(allLeafKeys).reduce((s, set) => s + set.size, 0)} EN leaf keys\n`);

// Missing
console.log('── MISSING KEYS (referenced in templates but absent from EN JSON) ──\n');
if (missingKeys.length === 0) {
  console.log('  No missing keys found.\n');
} else {
  console.log(`  Found ${missingKeys.length} missing key(s):\n`);
  for (const mk of missingKeys) {
    const rel = path.relative(BASE, mk.file);
    console.log(`  ✗ ${mk.key}`);
    console.log(`    ${rel}:${mk.line} — ${mk.reason}\n`);
  }
}

// Dead
console.log('── DEAD KEYS (in EN JSON but not referenced by any template) ──\n');
console.log('  (Excludes: shell.demo.*, shell.langSwitcher.*, shell.flag)\n');
if (deadKeys.length === 0) {
  console.log('  No dead keys found.\n');
} else {
  deadKeys.sort();
  console.log(`  Found ${deadKeys.length} dead key(s):\n`);
  for (const dk of deadKeys) {
    const ns = dk.split('.')[0];
    console.log(`  ✗ ${dk}  (${ns}.json)`);
  }
  console.log('');
}

console.log('══════════════════════════════════════════════════════════');
console.log('  END OF REPORT');
console.log('══════════════════════════════════════════════════════════');

// Exit with error code if issues found
if (missingKeys.length > 0 || deadKeys.length > 0) {
  process.exit(1);
}
