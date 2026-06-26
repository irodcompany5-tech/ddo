# IFEval Full-Corpus Run

This page records the full 541-row IFEval experiment for DDO. It uses the complete source corpus rather than the smaller 150/50/50 sample.

## Setup

| Item | Value |
| --- | --- |
| Base/student model | `google/gemma-3n-e4b-it` |
| Optimizer/teacher model | `google/gemma-4-31b-it` |
| Validator/verifier model | `google/gemma-4-31b-it` |
| Train split | 441 rows |
| Validation split | 50 rows |
| Test split | 50 rows |
| DDO horizon | 3 |
| DDO budget | 6 |
| DDO stop reason | `budget_exhausted` |
| DDO iterations | 2 |
| DDO verifier best score | `0.0` |
| DDO token usage | 42,101 total tokens |

## Prompt Files

| File | Purpose |
| --- | --- |
| [../prompts/base-system.md](../prompts/base-system.md) | Baseline system prompt |
| [../prompts/full-corpus-gemma4-optimized-prompt.md](../prompts/full-corpus-gemma4-optimized-prompt.md) | Optimized prompt for the full-corpus Gemma 4 run |
| [../prompts/optimizer-behavior-spec.md](../prompts/optimizer-behavior-spec.md) | Optimization behavior spec |
| [../prompts/evaluator-system.md](../prompts/evaluator-system.md) | Qualitative evaluator prompt |

## Validation

| Metric | Baseline | Optimized | Delta |
| --- | ---: | ---: | ---: |
| Strict prompt accuracy | 0.80 | 0.76 | -0.04 |
| Strict instruction accuracy | 0.8271604938 | 0.8148148148 | -0.0123456790 |
| Loose prompt accuracy | 0.82 | 0.78 | -0.04 |
| Loose instruction accuracy | 0.8395061728 | 0.8271604938 | -0.0123456790 |
| Examples | 50 | 50 | 0 |
| Instructions | 81 | 81 | 0 |
| Response tokens | 25,691 | 24,869 | -822 |
| Response cost | $0.00264282 | $0.00250218 | -$0.00014064 |

## Held-Out Test

| Metric | Baseline | Optimized | Delta |
| --- | ---: | ---: | ---: |
| Strict prompt accuracy | 0.84 | 0.86 | +0.02 |
| Strict instruction accuracy | 0.8717948718 | 0.9102564103 | +0.0384615385 |
| Loose prompt accuracy | 0.86 | 0.86 | 0.00 |
| Loose instruction accuracy | 0.8974358974 | 0.9102564103 | +0.0128205128 |
| Examples | 50 | 50 | 0 |
| Instructions | 78 | 78 | 0 |
| Response tokens | 21,530 | 22,109 | +579 |
| Response cost | $0.00215292 | $0.00218040 | +$0.00002748 |

## Conclusion

The full-corpus run keeps the same published conclusion as the smaller sample: DDO improved held-out strict test accuracy by `+0.02`, but validation regressed. That makes the result useful and defensible, but not a monotonic win.

The difference from the sample run is scope, not direction. This benchmark uses the full 541-row corpus, with 441 rows available for prompt fitting before the 50-row validation and 50-row test splits are scored.
