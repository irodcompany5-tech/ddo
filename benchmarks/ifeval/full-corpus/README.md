# IFEval Full-Corpus DDO Experiment

This folder contains the full 541-row IFEval split used for the larger benchmark run.

## Split Sizes

| Split | Rows | Purpose |
| --- | ---: | --- |
| `train.jsonl` | 441 | Prompt fitting / DDO diagnostic examples |
| `validation.jsonl` | 50 | Optimizer verifier checks and prompt selection |
| `test.jsonl` | 50 | Final held-out comparison only |

The split metadata is in [split-metadata.json](split-metadata.json).

## Models

| Role | Model |
| --- | --- |
| Base/student | `google/gemma-3n-e4b-it` |
| Optimizer/teacher | `google/gemma-4-31b-it` |
| Validator/verifier | `google/gemma-4-31b-it` |

## Report

Read the benchmark report at [results.md](results.md).

## Reproduce

Generate the split again from the tracked source corpus:

```bash
python3 scripts/prepare-ifeval-splits.py \
  --output-dir benchmarks/ifeval/full-corpus \
  --source-file benchmarks/ifeval/raw/input_data.jsonl \
  --full-corpus
```

The full-corpus benchmark keeps validation and test held out from the optimization pass.
