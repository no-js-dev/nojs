#!/usr/bin/env python3
"""Compare two js-framework-benchmark result sets for no-js.

Handles both result schemas:
  - CPU benchmarks:        values.total   = {min,max,median,mean,stddev,values}
  - memory/size/startup:   values.DEFAULT = {...} (or a bare list of numbers)

Usage:
  compare-ab.py --dir <results-dir> --a ab-base --b ab-cand
  compare-ab.py --dir results --a 1.18.0 --b 1.18.0-perf --competitors
"""

import argparse
import glob
import json
import os
import statistics
import sys

BENCH_NAMES = {
    "01_run1k": "Create 1K rows",
    "02_replace1k": "Replace 1K rows",
    "03_update10th1k_x16": "Partial update (every 10th)",
    "04_select1k": "Select row",
    "05_swap1k": "Swap rows",
    "06_remove-one-1k": "Remove row",
    "07_create10k": "Create 10K rows",
    "08_create1k-after1k_x2": "Append 1K",
    "09_clear1k_x8": "Clear rows",
    "21_ready-memory": "Ready memory (MB)",
    "22_run-memory": "Run memory (MB)",
    "25_run-clear-memory": "Run+clear memory (MB)",
    "41_size-uncompressed": "Size uncompressed (KB)",
    "42_size-compressed": "Size gzip (KB)",
    "43_first-paint": "First paint (ms)",
}

COMPETITOR_GLOBS = {
    "react": "react-hooks*keyed_*.json",
    "vue": "vue-v3*keyed_*.json",
    "alpine": "alpine-v3*keyed_*.json",
    "angular": "angular-cf-signals*keyed_*.json",
}


def stats_from(node):
    if isinstance(node, dict):
        return {
            "median": node["median"], "mean": node["mean"],
            "min": node["min"], "max": node["max"],
            "std": node.get("stddev", 0.0),
        }
    if isinstance(node, list) and node:
        return {
            "median": statistics.median(node), "mean": statistics.mean(node),
            "min": min(node), "max": max(node),
            "std": statistics.pstdev(node) if len(node) > 1 else 0.0,
        }
    return None


def load(pattern, d):
    out = {}
    for f in glob.glob(os.path.join(d, pattern)):
        with open(f) as fh:
            data = json.load(fh)
        vals = data.get("values", {})
        node = None
        if isinstance(vals, dict):
            node = vals.get("total") or vals.get("DEFAULT")
        if node is None:
            node = vals
        s = stats_from(node)
        if s:
            out[data["benchmark"]] = s
    return out


def geomean(ratios):
    ratios = [r for r in ratios if r and r > 0]
    if not ratios:
        return None
    prod = 1.0
    for r in ratios:
        prod *= r
    return prod ** (1.0 / len(ratios))


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--dir", required=True, help="webdriver-ts results directory")
    ap.add_argument("--a", required=True, help="baseline frameworkVersion tag")
    ap.add_argument("--b", required=True, help="candidate frameworkVersion tag")
    ap.add_argument("--competitors", action="store_true",
                    help="add best-competitor column (react/vue/alpine/angular results in same dir)")
    args = ap.parse_args()

    a = load(f"no-js-v{args.a}-keyed_*.json", args.dir)
    b = load(f"no-js-v{args.b}-keyed_*.json", args.dir)
    if not a:
        sys.exit(f"No results for tag '{args.a}' in {args.dir}")
    if not b:
        sys.exit(f"No results for tag '{args.b}' in {args.dir}")

    comp = {}
    if args.competitors:
        comp = {name: load(pat, args.dir) for name, pat in COMPETITOR_GLOBS.items()}

    hdr = f"{'Benchmark':<30} {args.a:>10} {args.b:>10} {'Δ':>8} {'speedup':>8}"
    if comp:
        hdr += "   best-competitor"
    print(hdr)
    print("-" * len(hdr) + "----------")

    cpu_ratios = []
    for bench in sorted(set(a) | set(b)):
        label = BENCH_NAMES.get(bench, bench)
        sa, sb = a.get(bench), b.get(bench)
        if not sa or not sb:
            va = f"{sa['median']:.1f}" if sa else "—"
            vb = f"{sb['median']:.1f}" if sb else "—"
            print(f"{label:<30} {va:>10} {vb:>10}   (missing)")
            continue
        av, bv = sa["median"], sb["median"]
        speed = av / bv if bv else float("inf")
        if bench.startswith(("01_", "02_", "03_", "04_", "05_", "06_", "07_", "08_", "09_")):
            cpu_ratios.append(speed)
        line = f"{label:<30} {av:>10.1f} {bv:>10.1f} {bv - av:>+8.1f} {speed:>7.2f}x"
        if comp:
            bests = [(c[bench]["median"], nm) for nm, c in comp.items() if bench in c]
            line += f"   {min(bests)[0]:.1f} ({min(bests)[1]})" if bests else "   —"
        print(line)

    gm = geomean(cpu_ratios)
    if gm:
        print(f"\nCPU geomean speedup ({args.a} → {args.b}): {gm:.2f}x")

    print(f"\nRaw '{args.b}' stats (median / mean / min / max / stddev):")
    for bench in sorted(b):
        s = b[bench]
        flag = "  ⚠ high stddev — machine not idle?" if s["std"] > max(5.0, s["median"] * 0.15) else ""
        print(f"  {bench:<26} {s['median']:.1f} / {s['mean']:.2f} / {s['min']:.1f} / {s['max']:.1f} / {s['std']:.2f}{flag}")


if __name__ == "__main__":
    main()
