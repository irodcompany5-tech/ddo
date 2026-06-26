# Benchmarks

This folder is for reproducible before/after evidence for DDO prompt optimization.

## Files

| File | Purpose |
| --- | --- |
| [manifest.json](manifest.json) | Curated public benchmark shortlist and integration notes |
| [results-template.csv](results-template.csv) | CSV schema for benchmark results |
| [claims.md](claims.md) | Defensible benchmark framing and wording |
| [results.md](results.md) | Published benchmark result table |
| [ifeval/](ifeval/) | Ready-to-run IFEval 150/50/50 split and prompts |

## Workflow

1. Choose a benchmark from `manifest.json`.
2. Create a prompt-fitting split and a held-out scoring split.
3. Run the baseline prompt on held-out scoring examples.
4. Run DDO on fitting examples only.
5. Run the optimized prompt on the same held-out scoring examples.
6. Append the row to `results.csv`.
7. Generate a Markdown table:

```bash
npm run benchmarks:table -- benchmarks/results.csv > benchmarks/results.md
```

Do not commit private benchmark data, API keys, provider logs, or unreproducible score claims.
