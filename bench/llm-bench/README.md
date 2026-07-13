# Benchmark v2 — análise de transcripts (LLM-native)

Tooling para agregar custo/tokens/turns dos runs do benchmark v2
(4 condições × 3 runs: Angular, React, NoJS sem skill, NoJS com skill).

## Opção A — enviar os .jsonl e rodar o analisador

Os transcripts do Claude Code ficam em `~/.claude/projects/<projeto>/`
(main chain) e `~/.claude/projects/<projeto>/subagents/*.jsonl`.

Organize assim e rode:

```
runs/
  angular/run-1/<sessao>.jsonl
  angular/run-1/subagents/*.jsonl
  react/run-1/...
  nojs-sem-skill/run-1/...
  nojs-com-skill/run-1/...
```

```bash
python3 bench/llm-bench/analyze_transcripts.py runs/ --json resultado.json
# TTL do cache do Claude Code é 5m por padrão; use --cache-ttl 1h se aplicável
# Sonnet 5 com preço introdutório: --intro-sonnet
```

Saída: tabela por run + mediana/pior caso por condição.
`user_interventions` é um **proxy** de ciclos de correção (turns de usuário
na main chain após o prompt inicial) — revisar manualmente contra as notas.

## Opção B — agregado local via jq (sem enviar transcripts)

Rode na sua máquina, por run, e cole o output:

```bash
DIR=~/.claude/projects/<projeto>
cat "$DIR"/*.jsonl "$DIR"/subagents/*.jsonl 2>/dev/null | jq -s '
  [ .[] | select(.message.usage) ] as $m
  | {
      api_turns: ($m | length),
      models: ($m | group_by(.message.model) | map({
        model: .[0].message.model,
        input:        (map(.message.usage.input_tokens // 0) | add),
        output:       (map(.message.usage.output_tokens // 0) | add),
        cache_read:   (map(.message.usage.cache_read_input_tokens // 0) | add),
        cache_create: (map(.message.usage.cache_creation_input_tokens // 0) | add)
      }))
    }'
```

Preços usados (USD/MTok, 2026-07): Opus 4.x $5/$25 · Sonnet 4.x/5 $3/$15
(Sonnet 5 intro $2/$10) · Haiku 4.5 $1/$5 · cache read 0.1× input ·
cache write 1.25× (5m) ou 2× (1h).
