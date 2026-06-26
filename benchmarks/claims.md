# Benchmark Claims

This page states the most defensible claim supported by the repository benchmarks.

## Primary Claim

DDO can improve a prompt on a held-out instruction-following benchmark when you treat optimization as a bounded repair step and score on a separate test split.

On the repository's IFEval run:

| Pass | Optimizer | Validation Strict | Validation Loose | Test Strict | Test Loose |
| --- | --- | ---: | ---: | ---: | ---: |
| Baseline | none | 0.80 | 0.82 | 0.84 | 0.86 |
| Pass 1 | `google/gemma-4-31b-it` | 0.76 | 0.78 | 0.86 | 0.86 |
| Pass 2 | `anthropic/claude-sonnet-4.6` | 0.76 | 0.80 | 0.84 | 0.86 |

The clean benchmark takeaway is:

- One optimization pass improved held-out strict accuracy by `+0.02`.
- A second optimization pass did not improve the held-out strict score further.
- The final strict score after two passes returned to baseline, so repeated optimization is not monotonic.

## Why This Is Defendable

1. The train, validation, and test splits are separated before optimization.
2. The report shows both validation and held-out test scores.
3. The repository keeps the raw run outputs, optimized prompts, and token usage.
4. The result table includes both positive and negative deltas.
5. The second-pass ablation is published instead of hidden.

## Safe Wording

Use wording like this:

> DDO produced a measurable held-out improvement on IFEval after one optimization pass, but repeated optimization was not monotonic. We therefore report the first-pass held-out gain as the main benchmark result and the second pass as a stability check.

## Avoid

- Saying the method always improves prompts.
- Using validation as the only success metric.
- Reporting the second pass as a net improvement.
- Omitting the held-out split or the baseline comparison.

