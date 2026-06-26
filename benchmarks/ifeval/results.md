# IFEval Run Report

This page records the deterministic 150/50/50 IFEval experiment for DDO in this repository.

## Setup

| Item | Value |
| --- | --- |
| Base/student model | `google/gemma-3n-e4b-it` |
| Optimizer/validator model | `google/gemma-4-31b-it` |
| Train split | 150 rows |
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
| [prompts/base-system.md](prompts/base-system.md) | Baseline system prompt |
| [prompts/ddo-optimized-prompt.md](prompts/ddo-optimized-prompt.md) | Prompt produced by the recorded DDO run |
| [prompts/checkpoint-prompt.md](prompts/checkpoint-prompt.md) | Checkpoint prompt for the next optimization pass |
| [prompts/optimizer-behavior-spec.md](prompts/optimizer-behavior-spec.md) | Optimization behavior spec |
| [prompts/evaluator-system.md](prompts/evaluator-system.md) | Qualitative evaluator prompt |

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

The result is mixed. DDO improved the held-out test score, but it regressed on validation. That means the method can help on this split, but this specific prompt and verifier setup are not stable enough to call it a general win.

The response JSONL files also include `latency_seconds`, but two older optimized-test rows were logged with negative wall-clock values before the runner switched to monotonic timing. For this report, use score, token, and cost metrics as the stable comparison points.

## Next Checkpoint

The current checkpoint prompt is [prompts/checkpoint-prompt.md](prompts/checkpoint-prompt.md). Use it as the starting point for the next pass and make only the prompt optimizer model Claude Sonnet 4.6:

```bash
OPENAI_API_KEY="$OPENROUTER_API_KEY" \
OPENAI_BASE_URL="https://openrouter.ai/api/v1" \
ddo-optimize \
  --prompt benchmarks/ifeval/prompts/checkpoint-prompt.md \
  --spec benchmarks/ifeval/prompts/optimizer-behavior-spec.md \
  --dataset benchmarks/ifeval/train-ddo.jsonl \
  --teacher-model anthropic/claude-sonnet-4.6 \
  --student-model google/gemma-3n-e4b-it \
  --verifier-model google/gemma-4-31b-it \
  --api-mode chat \
  --horizon 3 \
  --budget 6 \
  --output run-results/ifeval/claude-checkpoint-optimized-prompt.md \
  --result-json run-results/ifeval/claude-checkpoint-run.json
```
