#!/usr/bin/env python3
"""Benchmark v2 — agrega usage/custo de transcripts .jsonl do Claude Code.

Uso:
  python3 analyze_transcripts.py <runs_dir> [--cache-ttl 5m|1h] [--json out.json]

Estrutura esperada de <runs_dir> (flexível — qualquer nível de aninhamento):
  runs/
    angular/run-1/<uuid>.jsonl            # main chain
    angular/run-1/subagents/*.jsonl       # subagents (opcional)
    react/run-1/...
    nojs-sem-skill/run-1/...
    nojs-com-skill/run-1/...

Condição = 1º diretório abaixo de runs_dir; run = 2º. Se os .jsonl estiverem
soltos, cada arquivo vira um run da condição "unknown".

Métricas por run:
  - api_turns: mensagens assistant com message.usage (main + subagents)
  - tokens: input, output, cache_read, cache_create
  - custo USD por modelo (tabela PRICING) com cache read 0.1x e write 1.25x/2x
  - user_interventions: turns de usuário na main chain após o 1º (proxy de
    ciclos de correção — revisar manualmente; tool_results não contam)

Saída: tabela por condição (mediana + pior caso) + JSON opcional.
"""

import argparse
import json
import statistics
import sys
from collections import defaultdict
from pathlib import Path

# USD por 1M tokens: (input, output). Fonte: platform.claude.com, 2026-07.
PRICING = {
    "claude-opus-4-8": (5.00, 25.00),
    "claude-opus-4-7": (5.00, 25.00),
    "claude-opus-4-6": (5.00, 25.00),
    "claude-opus-4-5": (5.00, 25.00),
    "claude-sonnet-5": (3.00, 15.00),  # intro $2/$10 ate 2026-08-31: use --intro-sonnet
    "claude-sonnet-4-6": (3.00, 15.00),
    "claude-sonnet-4-5": (3.00, 15.00),
    "claude-haiku-4-5": (1.00, 5.00),
    "claude-fable-5": (10.00, 50.00),
}
CACHE_READ_MULT = 0.1
CACHE_WRITE_MULT = {"5m": 1.25, "1h": 2.0}


def resolve_pricing(model, intro_sonnet=False):
    if not model:
        return None
    for key, (inp, out) in PRICING.items():
        if model.startswith(key) or key in model:
            if intro_sonnet and key == "claude-sonnet-5":
                return (2.00, 10.00)
            return (inp, out)
    return None


def parse_file(path):
    """Extrai usage por modelo + contagem de turns de um transcript .jsonl."""
    usage_by_model = defaultdict(lambda: defaultdict(int))
    api_turns = 0
    user_turns = 0
    unknown_models = set()

    with open(path, encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if not line:
                continue
            try:
                entry = json.loads(line)
            except json.JSONDecodeError:
                continue

            etype = entry.get("type")
            msg = entry.get("message") or {}

            if etype == "user" or msg.get("role") == "user":
                content = msg.get("content")
                # tool_results não são intervenção humana
                if isinstance(content, str):
                    user_turns += 1
                elif isinstance(content, list) and any(
                    isinstance(b, dict) and b.get("type") == "text" for b in content
                ):
                    user_turns += 1
                continue

            usage = msg.get("usage")
            if not usage:
                continue
            api_turns += 1
            model = msg.get("model", "unknown")
            u = usage_by_model[model]
            u["input"] += usage.get("input_tokens", 0)
            u["output"] += usage.get("output_tokens", 0)
            u["cache_read"] += usage.get("cache_read_input_tokens", 0)
            u["cache_create"] += usage.get("cache_creation_input_tokens", 0)
            if resolve_pricing(model) is None:
                unknown_models.add(model)

    return usage_by_model, api_turns, user_turns, unknown_models


def cost_usd(usage_by_model, ttl="5m", intro_sonnet=False):
    total = 0.0
    for model, u in usage_by_model.items():
        p = resolve_pricing(model, intro_sonnet)
        if p is None:
            continue  # sinalizado em unknown_models
        inp, out = p
        total += u["input"] / 1e6 * inp
        total += u["output"] / 1e6 * out
        total += u["cache_read"] / 1e6 * inp * CACHE_READ_MULT
        total += u["cache_create"] / 1e6 * inp * CACHE_WRITE_MULT[ttl]
    return total


def classify(runs_dir, jsonl_path):
    """(condicao, run) a partir do caminho relativo."""
    rel = jsonl_path.relative_to(runs_dir)
    parts = rel.parts
    if len(parts) >= 3:
        return parts[0], parts[1]
    if len(parts) == 2:
        return parts[0], parts[1].removesuffix(".jsonl")
    return "unknown", parts[0].removesuffix(".jsonl")


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("runs_dir", type=Path)
    ap.add_argument("--cache-ttl", choices=["5m", "1h"], default="5m")
    ap.add_argument("--intro-sonnet", action="store_true",
                    help="usa preco introdutorio do Sonnet 5 ($2/$10)")
    ap.add_argument("--json", type=Path, help="grava agregado em JSON")
    args = ap.parse_args()

    files = sorted(args.runs_dir.rglob("*.jsonl"))
    if not files:
        sys.exit(f"nenhum .jsonl em {args.runs_dir}")

    # (condicao, run) -> agregado
    runs = defaultdict(lambda: {
        "files": 0, "api_turns": 0, "user_interventions": 0,
        "tokens": defaultdict(int), "usage_by_model": defaultdict(lambda: defaultdict(int)),
        "unknown_models": set(),
    })

    for path in files:
        cond, run = classify(args.runs_dir, path)
        is_subagent = "subagent" in str(path).lower()
        ubm, api_turns, user_turns, unknown = parse_file(path)
        r = runs[(cond, run)]
        r["files"] += 1
        r["api_turns"] += api_turns
        if not is_subagent:
            # -1: o prompt inicial não é ciclo de correção
            r["user_interventions"] += max(0, user_turns - 1)
        r["unknown_models"] |= unknown
        for model, u in ubm.items():
            for k, v in u.items():
                r["usage_by_model"][model][k] += v
                r["tokens"][k] += v

    # custo por run
    for r in runs.values():
        r["cost_usd"] = cost_usd(r["usage_by_model"], args.cache_ttl, args.intro_sonnet)

    # agrega por condição
    by_cond = defaultdict(list)
    for (cond, run), r in sorted(runs.items()):
        by_cond[cond].append((run, r))

    print(f"{'condição':<22} {'run':<10} {'turns':>6} {'interv.':>7} "
          f"{'output tok':>11} {'cache read':>12} {'custo USD':>10}")
    print("-" * 84)
    for cond, entries in by_cond.items():
        for run, r in entries:
            print(f"{cond:<22} {run:<10} {r['api_turns']:>6} "
                  f"{r['user_interventions']:>7} {r['tokens']['output']:>11,} "
                  f"{r['tokens']['cache_read']:>12,} {r['cost_usd']:>10.2f}")

    print("\n== por condição (mediana / pior caso) ==")
    print(f"{'condição':<22} {'custo med':>10} {'custo max':>10} "
          f"{'interv med':>11} {'interv max':>11} {'turns med':>10}")
    print("-" * 80)
    summary = {}
    for cond, entries in by_cond.items():
        costs = [r["cost_usd"] for _, r in entries]
        intervs = [r["user_interventions"] for _, r in entries]
        turns = [r["api_turns"] for _, r in entries]
        summary[cond] = {
            "runs": len(entries),
            "cost_median": statistics.median(costs),
            "cost_worst": max(costs),
            "interventions_median": statistics.median(intervs),
            "interventions_worst": max(intervs),
            "turns_median": statistics.median(turns),
        }
        s = summary[cond]
        print(f"{cond:<22} {s['cost_median']:>10.2f} {s['cost_worst']:>10.2f} "
              f"{s['interventions_median']:>11} {s['interventions_worst']:>11} "
              f"{s['turns_median']:>10}")

    unknown_all = set().union(*(r["unknown_models"] for r in runs.values()))
    if unknown_all:
        print(f"\n⚠ modelos sem preço na tabela (custo = 0 nessas mensagens): "
              f"{', '.join(sorted(unknown_all))}", file=sys.stderr)

    if args.json:
        out = {
            "cache_ttl": args.cache_ttl,
            "runs": {
                f"{cond}/{run}": {
                    "api_turns": r["api_turns"],
                    "user_interventions": r["user_interventions"],
                    "tokens": dict(r["tokens"]),
                    "cost_usd": round(r["cost_usd"], 4),
                    "models": {m: dict(u) for m, u in r["usage_by_model"].items()},
                }
                for (cond, run), r in sorted(runs.items())
            },
            "summary": summary,
        }
        args.json.write_text(json.dumps(out, indent=2, ensure_ascii=False))
        print(f"\nJSON: {args.json}")


if __name__ == "__main__":
    main()
