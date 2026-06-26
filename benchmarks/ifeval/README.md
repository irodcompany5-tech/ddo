# IFEval DDO Experiment

IFEval is the best first public benchmark for DDO because it measures instruction-following, formatting, and verifiable constraints. Those are the failure modes prompt optimization can most plausibly improve.

## Splits

This folder contains deterministic samples from the official Google Research IFEval input file:

| Split | Rows | Purpose |
| --- | ---: | --- |
| `train.jsonl` | 150 | Prompt fitting / DDO diagnostic examples |
| `validation.jsonl` | 50 | Optimizer verifier checks and prompt selection |
| `test.jsonl` | 50 | Final held-out comparison only |

The split metadata is in [split-metadata.json](split-metadata.json).

## Models

Use these OpenRouter model IDs:

| Role | Model |
| --- | --- |
| Base/student | `google/gemma-3n-e4b-it` |
| Optimizer/teacher | `google/gemma-4-31b-it` |
| Validator/verifier | `google/gemma-4-31b-it` |

## Prompts

| File | Purpose |
| --- | --- |
| [prompts/base-system.md](prompts/base-system.md) | Baseline system prompt for the base model |
| [prompts/ddo-optimized-prompt.md](prompts/ddo-optimized-prompt.md) | Optimized prompt from the recorded DDO run |
| [prompts/checkpoint-prompt.md](prompts/checkpoint-prompt.md) | Checkpoint prompt for the next optimization pass |
| [prompts/optimizer-behavior-spec.md](prompts/optimizer-behavior-spec.md) | DDO behavior spec for fitting prompts |
| [prompts/evaluator-system.md](prompts/evaluator-system.md) | LLM evaluator prompt for qualitative auditing |
| [results.md](results.md) | Detailed report for the recorded validation and test run |

## Setup

Install benchmark extras:

```bash
python -m pip install -e ".[benchmarks]"
```

Set the OpenRouter key outside the repo:

```bash
export OPENROUTER_API_KEY="<your-openrouter-key>"
```

Do not write the key to tracked files.

## Baseline Run

Generate base-model responses on validation:

```bash
python scripts/run-ifeval-openrouter.py \
  --input benchmarks/ifeval/validation.jsonl \
  --system-prompt-file benchmarks/ifeval/prompts/base-system.md \
  --model google/gemma-3n-e4b-it \
  --output run-results/ifeval/baseline-validation-responses.jsonl
```

Score with the official IFEval checker:

```bash
python scripts/evaluate-ifeval.py \
  --input benchmarks/ifeval/validation.jsonl \
  --responses run-results/ifeval/baseline-validation-responses.jsonl \
  --output-dir run-results/ifeval/baseline-validation
```

## DDO Optimization Run

Use train examples for diagnosis and validation examples for the verifier:

```bash
OPENAI_API_KEY="$OPENROUTER_API_KEY" \
OPENAI_BASE_URL="https://openrouter.ai/api/v1" \
ddo-optimize \
  --prompt benchmarks/ifeval/prompts/base-system.md \
  --spec benchmarks/ifeval/prompts/optimizer-behavior-spec.md \
  --dataset benchmarks/ifeval/train-ddo.jsonl \
  --teacher-model google/gemma-4-31b-it \
  --student-model google/gemma-3n-e4b-it \
  --verifier-model google/gemma-4-31b-it \
  --api-mode chat \
  --horizon 3 \
  --budget 6 \
  --output run-results/ifeval/ddo-optimized-prompt.md \
  --result-json run-results/ifeval/ddo-run.json
```

Then run the optimized prompt on the test split and score it the same way as the baseline.

## Continue From The Checkpoint

Use the recorded optimized prompt as the next checkpoint and switch only the prompt-optimizer role to Claude Sonnet 4.6:

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

The student and verifier stay unchanged. Claude is only the prompt optimizer / repair model for this continuation pass.

## Metrics To Report

Record both strict and loose IFEval metrics:

- `prompt_level_accuracy_strict`
- `instruction_level_accuracy_strict`
- `prompt_level_accuracy_loose`
- `instruction_level_accuracy_loose`
- `n_prompts`
- `n_instructions`
- latency and token usage from OpenRouter runs
- DDO budget, horizon, model IDs, run date, and prompt file names

Append final rows to `benchmarks/results.csv`, then run:

```bash
npm run benchmarks:table -- benchmarks/results.csv > benchmarks/results.md
```

## Observed Run

A completed sample run is recorded in [results.md](results.md). The headline outcome is mixed:

- Validation strict accuracy moved from `0.80` to `0.76`.
- Validation loose accuracy moved from `0.82` to `0.78`.
- Held-out test strict accuracy moved from `0.84` to `0.86`.
- Held-out test loose accuracy stayed at `0.86`.
- The DDO loop stopped after `6` budgeted exchanges with `best_score = 0.0`.

The response logs also include token and cost data for each run. Treat latency as diagnostic only; the older run logs were captured before the runner switched to monotonic timing.

Do not claim improvement unless held-out test scores improve.
