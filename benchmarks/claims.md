# Benchmark Claims

This page states the most defensible claim supported by the repository benchmarks.

## Primary Claim

DDO can improve a prompt on a held-out instruction-following benchmark when you treat optimization as a bounded repair step, split fitting data from scoring data, and report the full corpus rather than a small hand-picked sample.

On the repository's full-corpus IFEval run:

| Run | Optimizer | Train Rows | Validation Strict | Validation Loose | Test Strict | Test Loose |
| --- | --- | ---: | ---: | ---: | ---: | ---: |
| Full corpus | `google/gemma-4-31b-it` | 441 | 0.76 | 0.78 | 0.86 | 0.86 |

The clean benchmark takeaway is:

- The full 541-row corpus still produced a held-out strict gain of `+0.02`.
- Validation regressed, so the result is mixed rather than monotonic.
- The full-corpus setup is the stronger benchmark to cite because it uses all available source rows.

## Why This Is Defendable

1. The train, validation, and test splits are separated before optimization.
2. The report shows both validation and held-out test scores.
3. The repository keeps the split metadata, optimized prompt, and summary report for the full-corpus run.
4. The result table includes both gains and regressions.
5. The smaller 150/50/50 sample remains published as a historical comparison instead of being substituted for the full corpus.

## Safe Wording

Use wording like this:

> DDO produced a measurable held-out improvement on IFEval when evaluated on the full 541-row corpus with a 441/50/50 split. The result is mixed because validation regressed, so we report the held-out gain as the benchmark outcome and the validation drop as the stability check.

## Avoid

- Saying the method always improves prompts.
- Using validation as the only success metric.
- Reporting the sample split as if it were the full corpus.
- Omitting the held-out split or the baseline comparison.
