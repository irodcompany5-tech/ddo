# Benchmarking DDO

Use this guide to prove whether DDO improves prompts on real evaluation data. The goal is a reproducible before/after table, not a hand-written success claim.

## Recommended Benchmarks

The benchmark manifest lives in [benchmarks/manifest.json](../benchmarks/manifest.json). Start with benchmarks that map cleanly to prompt optimization:

| Benchmark | Why It Fits DDO | First Run |
| --- | --- | --- |
| IFEval | Instruction following, format compliance, constraints, output structure | Small `n_problems` subset through DeepEval |
| GSM8K | Multi-step arithmetic and answer formatting | 10 to 50 problems through DeepEval or custom exact-match scorer |
| BIG-Bench Hard | Diverse hard reasoning tasks with exact-match targets | 1 to 3 tasks first, then expand |
| PromptBench | Existing prompt evaluation and adversarial prompt tooling | Use when testing robustness across prompt variants |

## Evidence Protocol

Use the same model, dataset version, decoding settings, and evaluator for both baseline and optimized prompts.

1. Select the benchmark and exact task subset.
2. Split examples into a prompt-fitting split and a held-out scoring split.
3. Score the baseline prompt on the held-out split.
4. Run DDO using only the fitting split.
5. Score the optimized prompt on the same held-out split.
6. Record baseline score, optimized score, delta, model, evaluator, run date, and notes.
7. Keep the DDO result JSON as an artifact.

Never optimize directly on the final scoring rows. That makes the result look better than it is.

## Result Table Template

Copy [benchmarks/results-template.csv](../benchmarks/results-template.csv):

```csv
benchmark,task,model,baseline_prompt,optimized_prompt,baseline_score,optimized_score,delta,n_cases,evaluator,run_date,notes
```

Generate a Markdown table:

```bash
npm run benchmarks:table -- benchmarks/results-template.csv
```

For a real file:

```bash
npm run benchmarks:table -- benchmarks/results.csv > benchmarks/results.md
```

Recommended table columns:

| Column | Meaning |
| --- | --- |
| `benchmark` | Benchmark name, such as `ifeval` or `gsm8k` |
| `task` | Task subset, split, or benchmark task name |
| `model` | Student model used for both baseline and optimized prompt |
| `baseline_prompt` | Prompt version or file path before DDO |
| `optimized_prompt` | Prompt version or file path after DDO |
| `baseline_score` | Held-out score before DDO, from 0 to 1 |
| `optimized_score` | Held-out score after DDO, from 0 to 1 |
| `delta` | `optimized_score - baseline_score` |
| `n_cases` | Number of held-out examples scored |
| `evaluator` | DeepEval, lm-evaluation-harness, custom scorer, or internal system |
| `run_date` | UTC date of the benchmark run |
| `notes` | Dataset version, settings, or caveats |

## DeepEval Example Shape

DeepEval already exposes benchmark objects for IFEval, GSM8K, and BIG-Bench Hard. Wrap your application/model so it applies a candidate system prompt, then run the benchmark once with the baseline prompt and once with the DDO-optimized prompt.

```python
from deepeval.benchmarks import IFEval

benchmark = IFEval(n_problems=20)
benchmark.evaluate(model=my_prompted_model)
print(benchmark.overall_score)
```

Use the DDO DeepEval adapter when you want DDO to use DeepEval as the verifier during optimization. Use the benchmark object directly when you want final held-out evidence.

## DDO Benchmark Workflow

1. Create a small fitting dataset from the benchmark format.
2. Run DDO:

```bash
ddo-optimize \
  --prompt prompts/baseline.txt \
  --spec "Follow the benchmark task instructions exactly." \
  --dataset benchmarks/fitting.jsonl \
  --horizon 3 \
  --budget 6 \
  --output prompts/ddo-optimized.txt \
  --result-json benchmarks/ddo-run.json
```

3. Score both prompts on the held-out benchmark split.
4. Append the results to `benchmarks/results.csv`.
5. Generate `benchmarks/results.md`.

## First Benchmark Plan

Start small and publish only reproducible rows:

| Order | Benchmark | Fitting Split | Held-Out Scoring | Why |
| --- | --- | --- | --- | --- |
| 1 | IFEval | 20 prompts | 100 prompts | Best match for instruction-following prompt repair |
| 2 | GSM8K | 20 problems | 100 problems | Shows reasoning and final-answer formatting impact |
| 3 | BIG-Bench Hard | 1 task, 20 examples | Same task held-out rows | Tests exact output and reasoning robustness |
| 4 | PromptBench | One supported dataset | Same dataset held-out rows | Compares against prompt-engineering baselines |

If a benchmark score does not improve, publish that too. Negative or flat results are useful because they show where DDO needs a better evaluator, more representative fitting data, or a different prompt repair policy.

## Included IFEval Experiment

The repository includes a deterministic IFEval experiment at [benchmarks/ifeval](../benchmarks/ifeval/):

| Split | Rows | Use |
| --- | ---: | --- |
| `train.jsonl` | 150 | DDO prompt fitting |
| `validation.jsonl` | 50 | verifier and prompt selection |
| `test.jsonl` | 50 | final held-out score |

Regenerate the sample:

```bash
npm run ifeval:prepare
```

Use OpenRouter models requested for this experiment:

```text
Base/student: google/gemma-3n-e4b-it
Optimizer/teacher: google/gemma-4-31b-it
Validator/verifier: google/gemma-4-31b-it
```

Install benchmark extras:

```bash
python -m pip install -e ".[benchmarks]"
```

Then follow [benchmarks/ifeval/README.md](../benchmarks/ifeval/README.md) for baseline, DDO, and held-out scoring commands.

## Recorded Example

The repository includes a complete IFEval run report at [benchmarks/ifeval/results.md](../benchmarks/ifeval/results.md).
It is a mixed result: the optimized prompt regressed on validation, but it improved the held-out strict test score.
Publish the numbers you actually got, not the numbers you wanted.

## Sources

- [GSM8K official repository](https://github.com/openai/grade-school-math)
- [GSM8K dataset card](https://huggingface.co/datasets/openai/gsm8k)
- [BIG-Bench Hard repository](https://github.com/suzgunmirac/BIG-Bench-Hard)
- [IFEval lm-evaluation-harness task notes](https://github.com/EleutherAI/lm-evaluation-harness/blob/main/lm_eval/tasks/ifeval/README.md)
- [PromptBench repository](https://github.com/microsoftarchive/promptbench)
- [DeepEval benchmark docs](https://deepeval.com/docs/benchmarks-ifeval)
