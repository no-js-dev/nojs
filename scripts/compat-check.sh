#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────────
# v1.21.1 compatibility gate.
#
# Builds NoJS at a given git ref (in a throwaway worktree, never touching this
# checkout's dist/) and runs the v1.21.1 compat suite against that build:
#   - e2e:  e2e/tests/compat-v1-21.spec.ts (+ e2e/examples/compat-v1-21/*.html)
#           in Chromium, Firefox and WebKit, served by this checkout's
#           test-server.js with NOJS_BUILD_PATH pointing at the ref's build
#   - unit: __tests__/compat-v1-21*.test.js, copied into the ref's worktree and
#           run against the ref's src/
#
# The suite always comes from THIS checkout, so any ref can be checked against
# the latest expectations. Every test must pass: a failure is a behavior that
# worked on v1.21.1 and no longer does.
#
# Usage:
#   scripts/compat-check.sh <ref> [options]
#   scripts/compat-check.sh --working-tree [options]
#
#   <ref>              any git ref: v1.21.1, origin/main, origin/fix/foo, a sha,
#                      or pr:<number> (fetches the GitHub PR head from origin)
#   --working-tree     check this checkout's uncommitted src/ instead of a ref
#
# Options:
#   --port <n>         port for the e2e test server (default: $COMPAT_PORT or 3990).
#                      The run aborts if anything already listens on it, because
#                      Playwright would silently reuse another checkout's server.
#   --project <name>   only run one Playwright project (chromium|firefox|webkit);
#                      repeatable. Default: all three.
#   --e2e-only         skip the unit suite
#   --unit-only        skip the e2e suite
#   --npm-ci           run `npm ci` in the ref worktree instead of symlinking this
#                      checkout's node_modules (use when the ref changed devDeps)
#   --keep             keep the temporary worktree for inspection
#
# Examples:
#   scripts/compat-check.sh v1.21.1                 # baseline: must be all green
#   scripts/compat-check.sh origin/main --port 3970
#   scripts/compat-check.sh pr:381 --project chromium
#   scripts/compat-check.sh --working-tree
# ─────────────────────────────────────────────────────────────────────────────
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
REF=""
WORKING_TREE=""
PORT="${COMPAT_PORT:-3990}"
PROJECTS=()
RUN_E2E=1
RUN_UNIT=1
NPM_CI=""
KEEP=""

while [[ $# -gt 0 ]]; do
  case "$1" in
    --port)         PORT="$2"; shift 2 ;;
    --project)      PROJECTS+=("--project=$2"); shift 2 ;;
    --e2e-only)     RUN_UNIT=""; shift ;;
    --unit-only)    RUN_E2E=""; shift ;;
    --npm-ci)       NPM_CI=1; shift ;;
    --keep)         KEEP=1; shift ;;
    --working-tree) WORKING_TREE=1; shift ;;
    -h|--help)      sed -n '2,45p' "$0"; exit 0 ;;
    -*)             echo "Unknown option: $1" >&2; exit 2 ;;
    *)              [[ -z "$REF" ]] || { echo "Only one ref allowed" >&2; exit 2; }; REF="$1"; shift ;;
  esac
done

if [[ -z "$REF" && -z "$WORKING_TREE" ]]; then
  echo "Usage: scripts/compat-check.sh <ref> | --working-tree [--port <n>] (see --help)" >&2
  exit 2
fi
[[ "$PORT" =~ ^[0-9]+$ ]] || { echo "--port must be a number" >&2; exit 2; }

cd "$REPO_ROOT"
[[ -d node_modules ]] || { echo "node_modules missing in $REPO_ROOT: run npm ci first" >&2; exit 1; }

# ── Port guard: refuse to run against someone else's server ─────────────────
port_busy() {
  if command -v lsof >/dev/null 2>&1; then
    lsof -nP -iTCP:"$1" -sTCP:LISTEN >/dev/null 2>&1
  else
    node -e 'const s=require("net").createServer();s.once("error",()=>process.exit(0));s.listen(+process.argv[1],"127.0.0.1",()=>s.close(()=>process.exit(1)))' "$1"
  fi
}
if [[ -n "$RUN_E2E" ]] && port_busy "$PORT"; then
  echo "✗ Port $PORT is already in use. Playwright would reuse that server (possibly another" >&2
  echo "  checkout's build) and the results would be meaningless. Pick another: --port <n>" >&2
  exit 1
fi

TMP_DIR="$(mktemp -d "${TMPDIR:-/tmp}/nojs-compat.XXXXXX")"
WT=""
cleanup() {
  if [[ -n "$KEEP" ]]; then
    echo "▸ Kept: $TMP_DIR"
    return
  fi
  if [[ -n "$WT" ]]; then git -C "$REPO_ROOT" worktree remove --force "$WT" >/dev/null 2>&1 || true; fi
  rm -rf "$TMP_DIR"
}
trap cleanup EXIT

# ── Prepare the source tree to check ────────────────────────────────────────
if [[ -n "$WORKING_TREE" ]]; then
  LABEL="working tree"
  SRC_DIR="$TMP_DIR/src-tree"
  mkdir -p "$SRC_DIR"
  cp -R src build.js package.json "$SRC_DIR/"
  ln -s "$REPO_ROOT/node_modules" "$SRC_DIR/node_modules"
else
  if [[ "$REF" =~ ^pr:([0-9]+)$ ]]; then
    PR="${BASH_REMATCH[1]}"
    echo "▸ Fetching PR #$PR head…"
    git fetch --quiet origin "pull/$PR/head"
    SHA="$(git rev-parse FETCH_HEAD)"
  else
    SHA="$(git rev-parse --verify --quiet "$REF^{commit}")" || { echo "Unknown ref: $REF" >&2; exit 1; }
  fi
  LABEL="$REF ($(git rev-parse --short "$SHA"))"
  WT="$TMP_DIR/ref"
  echo "▸ Checking out $LABEL in a temporary worktree…"
  git worktree add --quiet --detach "$WT" "$SHA"
  SRC_DIR="$WT"
  if [[ -n "$NPM_CI" ]]; then
    echo "▸ npm ci in the ref worktree…"
    (cd "$SRC_DIR" && npm ci --ignore-scripts --silent)
  else
    ln -s "$REPO_ROOT/node_modules" "$SRC_DIR/node_modules"
  fi
fi

echo "▸ Building ${LABEL}…"
(cd "$SRC_DIR" && node build.js >/dev/null)
BUILD="$SRC_DIR/dist/iife/no.js"
[[ -f "$BUILD" ]] || { echo "Build output missing: $BUILD" >&2; exit 1; }

E2E_STATUS=0
UNIT_STATUS=0

# ── e2e ─────────────────────────────────────────────────────────────────────
if [[ -n "$RUN_E2E" ]]; then
  echo "▸ e2e compat suite on port $PORT against ${LABEL}…"
  NOJS_BUILD_PATH="$BUILD" E2E_PORT="$PORT" PORT="$PORT" \
    npx playwright test --config e2e/playwright.config.ts e2e/tests/compat-v1-21.spec.ts \
      --reporter=list ${PROJECTS[@]+"${PROJECTS[@]}"} || E2E_STATUS=$?
fi

# ── unit ────────────────────────────────────────────────────────────────────
if [[ -n "$RUN_UNIT" ]]; then
  echo "▸ unit compat suite against $LABEL src/…"
  if [[ -n "$WORKING_TREE" ]]; then
    npx jest --no-coverage --runTestsByPath __tests__/compat-v1-21*.test.js || UNIT_STATUS=$?
  else
    cp __tests__/compat-v1-21*.test.js "$SRC_DIR/__tests__/"
    (cd "$SRC_DIR" && npx jest --no-coverage --runTestsByPath __tests__/compat-v1-21*.test.js) || UNIT_STATUS=$?
  fi
fi

echo
echo "── compat-check: $LABEL ──"
[[ -n "$RUN_E2E" ]]  && { [[ $E2E_STATUS -eq 0 ]]  && echo "  e2e  : PASS (port $PORT)" || echo "  e2e  : FAIL (port $PORT)"; }
[[ -n "$RUN_UNIT" ]] && { [[ $UNIT_STATUS -eq 0 ]] && echo "  unit : PASS" || echo "  unit : FAIL"; }

[[ $E2E_STATUS -eq 0 && $UNIT_STATUS -eq 0 ]]
