#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────────
# Same-session A/B runner for js-framework-benchmark.
#
# Runs BASE and CANDIDATE builds of NoJS back-to-back in one session so the
# numbers are comparable (same Chrome, same machine state). Headed runs are
# extremely sensitive to machine activity: keep the machine IDLE for the
# whole run or the results are garbage.
#
# Usage:
#   bench/run-ab.sh --base <path/to/baseline/no.js> [options]
#
# Options:
#   --base <file>        Baseline no.js build (required)
#   --cand <file>        Candidate build (default: build working tree → dist/iife/no.js)
#   --benchmark <id>     Only run one benchmark id (e.g. 01_run1k); repeatable
#   --headless           Run headless (NOT comparable with headed baselines)
#   --skip-base          Only run the candidate (compare against existing ab-base results)
#
# Prereqs:
#   - js-framework-benchmark checkout at $JFB_DIR (default: ../../js-framework-benchmark)
#   - its HTTP server running:  cd $JFB_DIR && npm start   (port 8080)
#   - webdriver-ts compiled:    cd $JFB_DIR/webdriver-ts && npm run compile
#
# Results land in $JFB_DIR/webdriver-ts/results as no-js-vab-base-keyed_*.json
# and no-js-vab-cand-keyed_*.json, then bench/compare-ab.py prints the table.
# ─────────────────────────────────────────────────────────────────────────────
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
JFB_DIR="${JFB_DIR:-$REPO_ROOT/../js-framework-benchmark}"
FW_DIR="$JFB_DIR/frameworks/keyed/no-js"
WDT_DIR="$JFB_DIR/webdriver-ts"

BASE_JS=""
CAND_JS=""
HEADLESS=""
SKIP_BASE=""
BENCH_ARGS=()

while [[ $# -gt 0 ]]; do
  case "$1" in
    --base)      BASE_JS="$2"; shift 2 ;;
    --cand)      CAND_JS="$2"; shift 2 ;;
    --benchmark) BENCH_ARGS+=(--benchmark "$2"); shift 2 ;;
    --headless)  HEADLESS="--headless true"; shift ;;
    --skip-base) SKIP_BASE=1; shift ;;
    *) echo "Unknown option: $1" >&2; exit 1 ;;
  esac
done

[[ -d "$JFB_DIR" ]] || { echo "js-framework-benchmark not found at $JFB_DIR (set JFB_DIR)" >&2; exit 1; }
if [[ -z "$SKIP_BASE" ]]; then
  [[ -n "$BASE_JS" && -f "$BASE_JS" ]] || { echo "--base <file> required (baseline no.js build)" >&2; exit 1; }
fi

# Candidate: build the working tree unless a file was given.
if [[ -z "$CAND_JS" ]]; then
  echo "▸ Building candidate from working tree…"
  (cd "$REPO_ROOT" && node build.js >/dev/null)
  CAND_JS="$REPO_ROOT/dist/iife/no.js"
fi
[[ -f "$CAND_JS" ]] || { echo "Candidate build not found: $CAND_JS" >&2; exit 1; }

# Benchmark HTTP server must be up.
if ! node -e "fetch('http://localhost:8080').then(()=>process.exit(0),()=>process.exit(1))" 2>/dev/null; then
  echo "Benchmark server not running. Start it first:  cd $JFB_DIR && npm start" >&2
  exit 1
fi

# Preserve the framework entry state; restore on exit no matter what.
cp "$FW_DIR/no.js" "$FW_DIR/no.js.ab-backup"
cp "$FW_DIR/package.json" "$FW_DIR/package.json.ab-backup"
restore() {
  mv -f "$FW_DIR/no.js.ab-backup" "$FW_DIR/no.js" 2>/dev/null || true
  mv -f "$FW_DIR/package.json.ab-backup" "$FW_DIR/package.json" 2>/dev/null || true
  [[ -d "$FW_DIR/dist" ]] && cp -f "$FW_DIR/no.js" "$FW_DIR/dist/no.js" 2>/dev/null || true
}
trap restore EXIT

set_variant() { # $1 = js file, $2 = version tag
  cp "$1" "$FW_DIR/no.js"
  [[ -d "$FW_DIR/dist" ]] && cp "$1" "$FW_DIR/dist/no.js"
  node -e "
    const fs = require('fs'), p = '$FW_DIR/package.json';
    const j = JSON.parse(fs.readFileSync(p, 'utf8'));
    (j['js-framework-benchmark'] ||= {}).frameworkVersion = '$2';
    fs.writeFileSync(p, JSON.stringify(j, null, 2) + '\n');
  "
}

run_variant() { # $1 = version tag
  echo ""
  echo "▸ Benchmarking variant '$1'…"
  # Stale results for this tag would mix into the comparison — clear them.
  rm -f "$WDT_DIR"/results/no-js-v"$1"-keyed_*.json
  (cd "$WDT_DIR" && npm run bench -- --framework keyed/no-js $HEADLESS "${BENCH_ARGS[@]+"${BENCH_ARGS[@]}"}")
}

echo "════════════════════════════════════════════════════════════════"
echo "  A/B benchmark — KEEP THE MACHINE IDLE UNTIL THIS FINISHES."
echo "  Foreground activity pollutes headed runs (huge stddev)."
echo "════════════════════════════════════════════════════════════════"
sleep 5

if [[ -z "$SKIP_BASE" ]]; then
  set_variant "$BASE_JS" "ab-base"
  run_variant "ab-base"
fi

set_variant "$CAND_JS" "ab-cand"
run_variant "ab-cand"

echo ""
python3 "$REPO_ROOT/bench/compare-ab.py" --dir "$WDT_DIR/results" --a ab-base --b ab-cand
