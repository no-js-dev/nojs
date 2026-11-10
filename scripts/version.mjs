#!/usr/bin/env node
// ═══════════════════════════════════════════════════════════════════════
//  VERSION — sync and verify every place that declares the release version
//  Config: .versionrc.json (repo root). Dependency-free, Node >= 18.
//
//  node scripts/version.mjs sync <x.y.z>      rewrite every declared location
//  node scripts/version.mjs release <x.y.z>   sync + stage + "chore: release vX.Y.Z"
//  node scripts/version.mjs check [--prev <x.y.z>] [--tag <vX.Y.Z>] [--ref <commit>]
//  node scripts/version.mjs install           git hooks + git aliases (prepare)
// ═══════════════════════════════════════════════════════════════════════

import { spawnSync } from "node:child_process";
import { chmodSync, existsSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const CONFIG_FILE = ".versionrc.json";
const SEMVER = /^(\d+)\.(\d+)\.(\d+)(?:-([0-9A-Za-z.-]+))?$/;
const ANY_VERSION = "\\d+\\.\\d+\\.\\d+(?:-[0-9A-Za-z.-]+)?";
const FETCH_COMMANDS = new Set(["fetch", "pull", "clone", "fetch-pack", "remote"]);

let errors = 0;
let reviews = 0;

const info = (msg) => process.stdout.write(`version: ${msg}\n`);
const review = (msg) => { reviews++; process.stdout.write(`version: REVIEW ${msg}\n`); };
const error = (msg) => { errors++; process.stderr.write(`version: ERROR ${msg}\n`); };

function fail(msg) {
  process.stderr.write(`version: ERROR ${msg}\n`);
  process.exit(1);
}

// ─── git / file access ────────────────────────────────────────────────

function git(args, opts = {}) {
  const res = spawnSync("git", args, { cwd: ROOT, encoding: "utf8", maxBuffer: 64 * 1024 * 1024, ...opts });
  return { ok: res.status === 0, out: res.stdout || "", err: res.stderr || "" };
}

// Reads files either from the working tree or from a commit (git objects).
function createReader(ref) {
  if (!ref) {
    return {
      label: "working tree",
      read: (file) => {
        const path = join(ROOT, file);
        return existsSync(path) ? readFileSync(path, "utf8") : null;
      },
    };
  }
  const commit = git(["rev-parse", "--verify", "--quiet", `${ref}^{commit}`]);
  if (!commit.ok) fail(`cannot resolve ${ref} to a commit`);
  const sha = commit.out.trim();
  return {
    label: sha.slice(0, 12),
    sha,
    read: (file) => {
      const res = git(["cat-file", "blob", `${sha}:${file}`]);
      return res.ok ? res.out : null;
    },
  };
}

// ─── versions ─────────────────────────────────────────────────────────

function parseVersion(v) {
  const m = SEMVER.exec(v);
  return m ? { nums: [+m[1], +m[2], +m[3]], pre: m[4] || "" } : null;
}

function compareVersions(a, b) {
  const pa = parseVersion(a);
  const pb = parseVersion(b);
  for (let i = 0; i < 3; i++) if (pa.nums[i] !== pb.nums[i]) return pa.nums[i] - pb.nums[i];
  if (pa.pre === pb.pre) return 0;
  if (!pa.pre) return 1;
  if (!pb.pre) return -1;
  return pa.pre < pb.pre ? -1 : 1;
}

function highestBelow(tags, current) {
  let best = null;
  for (const tag of tags) {
    const v = tag.trim().replace(/^v/, "");
    if (!parseVersion(v) || compareVersions(v, current) >= 0) continue;
    if (!best || compareVersions(v, best) > 0) best = v;
  }
  return best;
}

// Previous release = highest v* tag lower than the current version.
// Shallow CI checkouts carry no tags, so fall back to the remote.
function previousVersion(current) {
  const local = git(["tag", "-l", "v*"]);
  const fromLocal = local.ok ? highestBelow(local.out.split("\n"), current) : null;
  if (fromLocal) return fromLocal;
  const remote = git(["ls-remote", "--tags", "--refs", "origin", "v*"], { timeout: 15000 });
  if (!remote.ok) return null;
  const tags = remote.out.split("\n").map((line) => line.split("refs/tags/")[1] || "");
  return highestBelow(tags, current);
}

// ─── config / patterns ────────────────────────────────────────────────

function loadConfig(reader) {
  const raw = reader.read(CONFIG_FILE);
  if (raw === null) return null;
  let config;
  try {
    config = JSON.parse(raw);
  } catch (e) {
    fail(`${CONFIG_FILE}: ${e.message}`);
  }
  if (!config.source || !config.source.file) fail(`${CONFIG_FILE}: "source.file" is required`);
  config.source.key = config.source.key || "version";
  config.files = config.files || [];
  config.reviewAllowlist = config.reviewAllowlist || [];
  config.scanExclude = config.scanExclude || [];
  for (const entry of config.files) {
    const spec = entry.pattern ?? entry.regex;
    if (!entry.file || typeof spec !== "string" || !spec.includes("{v}") || (entry.pattern && entry.regex)) {
      fail(`${CONFIG_FILE}: each "files" entry needs "file" and exactly one of "pattern"/"regex" containing {v}`);
    }
    entry.count = entry.count ?? 1;
  }
  return config;
}

const escapeRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

// Literal "pattern" or "regex" with a {v} placeholder → global, multiline RegExp.
function entryRegExp(entry, versionSource) {
  const parts = entry.pattern !== undefined
    ? entry.pattern.split("{v}").map(escapeRe)
    : entry.regex.split("{v}");
  return new RegExp(parts.join(versionSource), "gm");
}

const describe = (entry) => entry.pattern !== undefined ? JSON.stringify(entry.pattern) : `/${entry.regex}/`;

function lineOf(text, index) {
  let line = 1;
  for (let i = 0; i < index; i++) if (text.charCodeAt(i) === 10) line++;
  return line;
}

function readSourceVersion(config, reader) {
  const raw = reader.read(config.source.file);
  if (raw === null) fail(`source file ${config.source.file} not found (${reader.label})`);
  let value = JSON.parse(raw);
  for (const key of config.source.key.split(".")) value = value == null ? undefined : value[key];
  if (typeof value !== "string" || !parseVersion(value)) {
    fail(`${config.source.file}: "${config.source.key}" is not a semver version (${value})`);
  }
  return value;
}

// Verifies one entry against `version`; reports mismatches with file:line.
function verifyEntry(entry, text, version) {
  if (text === null) {
    error(`${entry.file}: file not found (declared in ${CONFIG_FILE})`);
    return false;
  }
  const found = [...text.matchAll(entryRegExp(entry, escapeRe(version)))].length;
  if (found === entry.count) return true;
  const loose = [...text.matchAll(entryRegExp(entry, `(?<version>${ANY_VERSION})`))];
  const stale = loose.filter((m) => m.groups.version !== version);
  if (stale.length) {
    for (const m of stale) {
      const v = m.groups.version;
      error(`${entry.file}:${lineOf(text, m.index + m[0].indexOf(v))}: declares ${v}, expected ${version} (${describe(entry)})`);
    }
  } else {
    error(`${entry.file}: expected ${entry.count} match(es) of ${describe(entry)} for ${version}, found ${found}`);
  }
  return false;
}

// ─── glob matching (scanExclude / reviewAllowlist) ────────────────────

function globToRegExp(glob) {
  const g = glob.endsWith("/") ? `${glob}**` : glob;
  let re = "";
  for (let i = 0; i < g.length; i++) {
    const c = g[i];
    if (c === "*") {
      if (g[i + 1] === "*") {
        i++;
        if (g[i + 1] === "/") { i++; re += "(?:.*/)?"; } else re += ".*";
      } else re += "[^/]*";
    } else if (c === "?") re += "[^/]";
    else re += escapeRe(c);
  }
  return new RegExp(g.includes("/") ? `^${re}$` : `(?:^|/)${re}$`);
}

const matchesAny = (file, globs) => globs.some((g) => globToRegExp(g).test(file));

// ─── stale scan ───────────────────────────────────────────────────────

function staleScan(config, reader, current, prev, verbose) {
  if (!prev) {
    info("no previous release tag found; stale-version scan skipped");
    return;
  }
  if (prev === current) return;
  const args = ["grep", "-n", "-I", "-F", "-e", prev];
  if (reader.sha) args.push(reader.sha);
  args.push("--");
  const res = git(args);
  if (!res.ok && res.out === "" && res.err) fail(`git grep failed: ${res.err.trim()}`);

  const declared = new Set([config.source.file, ...config.files.map((e) => e.file)]);
  const exact = new RegExp(`(?<![0-9A-Za-z.])${escapeRe(prev)}(?!\\.?\\d)`);
  const prefix = reader.sha ? `${reader.sha}:` : "";
  const allow = config.reviewAllowlist;
  const reviewed = new Map();

  for (const line of res.out.split("\n")) {
    if (!line) continue;
    const rest = line.startsWith(prefix) ? line.slice(prefix.length) : line;
    const m = /^(.*?):(\d+):(.*)$/.exec(rest);
    if (!m) continue;
    const [, file, lineNo, content] = m;
    if (!exact.test(content)) continue;
    if (matchesAny(file, config.scanExclude)) continue;
    const allowed = allow.find((a) => matchesAny(file, [a.file]));
    if (declared.has(file) && !allowed) continue;
    const snippet = content.trim().slice(0, 140);
    if (allowed) {
      if (!reviewed.has(file)) reviewed.set(file, { reason: allowed.reason, lines: [] });
      reviewed.get(file).lines.push(lineNo);
      if (verbose) info(`  ${file}:${lineNo}: ${snippet}`);
    } else {
      error(`${file}:${lineNo}: stale previous version ${prev} — update it, or add the file to "reviewAllowlist"/"scanExclude" in ${CONFIG_FILE}\n         ${snippet}`);
    }
  }
  for (const [file, { reason, lines }] of reviewed) {
    review(`${file}:${lines.join(",")}: mentions ${prev} — ${reason}`);
  }
}

// ─── commands ─────────────────────────────────────────────────────────

function parseArgs(argv) {
  const opts = { _: [] };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--hook" || a === "--verbose") opts[a.slice(2)] = true;
    else if (a.startsWith("--")) {
      const [key, inline] = a.slice(2).split("=");
      opts[key] = inline ?? argv[++i];
      if (opts[key] === undefined) fail(`missing value for --${key}`);
    } else opts._.push(a);
  }
  return opts;
}

// The reference-transaction hook also fires when fetch/pull/clone write
// remote tags; those were verified on their way out, so skip them.
function invokedByFetch() {
  if (process.platform === "win32") return false;
  let pid = process.ppid;
  for (let depth = 0; depth < 6 && pid > 1; depth++) {
    const res = spawnSync("ps", ["-o", "ppid=,args=", "-p", String(pid)], { encoding: "utf8" });
    const m = /^\s*(\d+)\s+(.*)$/.exec((res.stdout || "").trim());
    if (!m) return false;
    const tokens = m[2].split(/\s+/);
    if (/(^|\/)git(\.exe)?$/.test(tokens[0])) return tokens.slice(1).some((t) => FETCH_COMMANDS.has(t));
    pid = +m[1];
  }
  return false;
}

function cmdCheck(opts) {
  if (opts.hook && invokedByFetch()) return 0;
  const reader = createReader(opts.ref);
  const config = loadConfig(reader);
  if (!config) {
    if (opts.ref) {
      info(`${reader.label} has no ${CONFIG_FILE}; nothing to verify`);
      return 0;
    }
    fail(`${CONFIG_FILE} not found in ${ROOT}`);
  }
  const current = readSourceVersion(config, reader);
  const where = opts.ref ? ` at ${reader.label}` : "";
  const tag = opts.tag ?? (process.env.GITHUB_REF_TYPE === "tag" && /^v\d/.test(process.env.GITHUB_REF_NAME || "") ? process.env.GITHUB_REF_NAME : undefined);

  if (tag !== undefined && tag.replace(/^v/, "") !== current) {
    error(`tag ${tag} does not match ${config.source.file} version ${current}${where}`);
  }

  let ok = 0;
  for (const entry of config.files) {
    if (verifyEntry(entry, reader.read(entry.file), current)) {
      ok++;
      if (opts.verbose) info(`ok ${entry.file} ${describe(entry)} ×${entry.count}`);
    }
  }

  const prev = opts.prev ?? previousVersion(current);
  if (opts.prev !== undefined && !parseVersion(opts.prev)) fail(`--prev ${opts.prev} is not a semver version`);
  staleScan(config, reader, current, prev, opts.verbose);

  const summary = `${current}${where}: ${ok}/${config.files.length} declared locations match` +
    (prev ? `, scanned for ${prev}` : "") + (reviews ? `, ${reviews} file(s) to review` : "") +
    (tag !== undefined ? `, tag ${tag}` : "");
  if (errors) {
    const sourceText = reader.read(config.source.file);
    const at = sourceText.search(new RegExp(`"${escapeRe(config.source.key.split(".").pop())}"\\s*:\\s*"${escapeRe(current)}"`));
    if (at >= 0) process.stderr.write(`version: source of truth ${config.source.file}:${lineOf(sourceText, at)} declares ${current}\n`);
    process.stderr.write(`version: FAILED ${summary}, ${errors} error(s)\n`);
    return 1;
  }
  info(`OK ${summary}`);
  return 0;
}

function cmdSync(opts) {
  const next = opts._[1];
  if (!next || !parseVersion(next)) fail(`usage: sync <x.y.z> (got "${next ?? ""}")`);
  const reader = createReader(null);
  const config = loadConfig(reader);
  if (!config) fail(`${CONFIG_FILE} not found in ${ROOT}`);
  const current = readSourceVersion(config, reader);
  if (compareVersions(next, current) < 0 && !opts.force) {
    fail(`${next} is lower than the current ${current} (pass --force to downgrade)`);
  }

  // Phase 1: compute every rewrite in memory; abort before writing on any mismatch.
  const texts = new Map();
  const touched = new Set();
  const textOf = (file) => {
    if (!texts.has(file)) texts.set(file, reader.read(file));
    return texts.get(file);
  };

  const sourceText = textOf(config.source.file);
  const key = config.source.key.split(".").pop();
  const keyRe = new RegExp(`("${escapeRe(key)}"\\s*:\\s*")${escapeRe(current)}(")`);
  if (!keyRe.test(sourceText)) fail(`${config.source.file}: cannot locate "${key}": "${current}"`);
  texts.set(config.source.file, sourceText.replace(keyRe, `$1${next}$2`));
  touched.add(config.source.file);

  for (const entry of config.files) {
    if (entry.generated) continue;
    const text = textOf(entry.file);
    if (!verifyEntry(entry, text, current)) continue;
    const re = entryRegExp(entry, escapeRe(current));
    texts.set(entry.file, text.replace(re, (match) => match.split(current).join(next)));
    touched.add(entry.file);
  }
  if (errors) fail(`sync aborted, nothing written (${errors} location(s) do not declare ${current})`);

  const changed = [];
  for (const file of touched) {
    const path = join(ROOT, file);
    if (readFileSync(path, "utf8") !== texts.get(file)) {
      writeFileSync(path, texts.get(file));
      changed.push(file);
    }
  }
  if (config.source.file === "package.json" && changed.length) {
    JSON.parse(readFileSync(join(ROOT, "package.json"), "utf8"));
  }

  const generated = config.files.filter((e) => e.generated);
  const staleGenerated = generated.some((e) => {
    const text = reader.read(e.file);
    return text === null || [...text.matchAll(entryRegExp(e, escapeRe(next)))].length !== e.count;
  });
  const before = new Map(generated.map((e) => [e.file, reader.read(e.file)]));
  if (config.build && (changed.length || staleGenerated)) {
    info(`build: ${config.build}`);
    const res = spawnSync(config.build, { cwd: ROOT, shell: true, stdio: "inherit" });
    if (res.status !== 0) fail(`build failed (${config.build})`);
  }
  for (const entry of generated) verifyEntry(entry, reader.read(entry.file), next);
  if (errors) fail("generated files do not declare the new version after the build");
  for (const [file, text] of before) if (reader.read(file) !== text && !changed.includes(file)) changed.push(file);

  for (const file of new Set([config.source.file, ...config.files.map((e) => e.file)])) {
    info(`${changed.includes(file) ? "updated  " : "unchanged"} ${file}`);
  }
  info(current === next ? `already at ${next}` : `${current} → ${next}`);
  return { config, current, next };
}

function cmdRelease(opts) {
  if (!git(["diff", "--cached", "--quiet"]).ok) fail("the index has staged changes; commit or unstage them first");
  const { config, next } = cmdSync(opts);
  const files = [...new Set([config.source.file, ...config.files.map((e) => e.file)])];
  if (existsSync(join(ROOT, "CHANGELOG.md"))) files.push("CHANGELOG.md");
  if (!git(["add", "--", ...files]).ok) fail("git add failed");
  if (git(["diff", "--cached", "--quiet"]).ok) fail(`nothing to commit — already at ${next}`);
  const res = spawnSync("git", ["commit", "-m", `chore: release v${next}`], { cwd: ROOT, stdio: "inherit" });
  if (res.status !== 0) fail("git commit failed");
  info(`committed "chore: release v${next}". Next: push, open the release PR, merge it, then tag the merge commit: git tag v${next} <merge-commit>`);
  return 0;
}

function cmdInstall() {
  const top = git(["rev-parse", "--show-toplevel"]);
  if (!top.ok || resolve(top.out.trim()) !== ROOT) {
    info("not a git checkout of this repository; hooks and aliases not installed");
    return 0;
  }
  const config = loadConfig(createReader(null));
  const hooks = config?.hooks;
  if (hooks?.dir) {
    for (const name of ["reference-transaction", "pre-push"]) {
      const file = join(ROOT, hooks.dir, name);
      if (existsSync(file)) chmodSync(file, 0o755);
    }
    if (hooks.manager === "husky") {
      // husky v9 only generates stubs for a fixed hook list; add the missing one.
      const stubDir = join(ROOT, hooks.dir, "_");
      if (existsSync(join(stubDir, "h"))) {
        const stub = join(stubDir, "reference-transaction");
        writeFileSync(stub, "#!/usr/bin/env sh\n. \"$(dirname \"$0\")/h\"");
        chmodSync(stub, 0o755);
      } else {
        info(`${hooks.dir}/_ missing (run husky first); reference-transaction hook not installed`);
      }
    } else {
      git(["config", "core.hooksPath", hooks.dir]);
    }
  }
  git(["config", "alias.release", "!node scripts/version.mjs release"]);
  git(["config", "alias.release-check", "!node scripts/version.mjs check"]);
  info(`installed ${hooks?.dir ? `hooks (${hooks.dir}) and ` : ""}git aliases: release, release-check`);
  return 0;
}

const USAGE = `usage:
  node scripts/version.mjs sync <x.y.z>
  node scripts/version.mjs release <x.y.z>
  node scripts/version.mjs check [--prev <x.y.z>] [--tag <vX.Y.Z>] [--ref <commit>] [--verbose]
  node scripts/version.mjs install`;

const opts = parseArgs(process.argv.slice(2));
const commands = { check: cmdCheck, sync: (o) => (cmdSync(o), 0), release: cmdRelease, install: cmdInstall };
const command = commands[opts._[0]];
if (!command) {
  process.stderr.write(`${USAGE}\n`);
  process.exit(opts._[0] ? 1 : 0);
}
process.exit(command(opts));
