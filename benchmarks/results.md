| Benchmark | Task | Model | Baseline | Optimized | Delta | Cases | Evaluator | Date | Notes |
| --- | --- | --- | ---: | ---: | ---: | ---: | --- | --- | --- |
| ifeval | held-out test (strict) | google/gemma-3n-e4b-it | 0.84 | 0.86 | 0.02 | 50 | official IFEval checker | 2026-06-26 | Validation regressed from 0.80 to 0.76 strict and 0.82 to 0.78 loose. See [the full report](ifeval/results.md) for the validation and test breakdown. |
| ifeval | held-out test (strict) | google/gemma-3n-e4b-it | 0.86 | 0.84 | -0.02 | 50 | official IFEval checker | 2026-06-26 | Second optimization round from the checkpoint prompt with Claude Sonnet 4.6. Validation loose improved 0.78 to 0.80, but held-out strict test regressed 0.86 to 0.84. Net strict improvement from the original baseline is 0.00. |
