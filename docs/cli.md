# CLI Guide

DDO has two command-line entrypoints:

| Install Method | Command |
| --- | --- |
| `pip install ddo-prompt-optimizer` | `ddo-optimize` |
| `npm install ddo-prompt-optimizer` | `ddo` |

## Python CLI

```bash
ddo-optimize \
  --prompt prompt.txt \
  --dataset dataset.jsonl \
  --teacher-model gpt-5.5 \
  --student-model gpt-5.5 \
  --output optimized-prompt.txt \
  --result-json ddo-result.json
```

## npm CLI

```bash
ddo optimize \
  --prompt prompt.txt \
  --dataset dataset.jsonl \
  --teacher-model gpt-5.5 \
  --student-model gpt-5.5 \
  --output optimized-prompt.txt \
  --result-json ddo-result.json
```

## Prompt File

`prompt.txt`:

```text
You are a careful assistant. Follow the user's instructions and provide clear final answers.
```

## Dataset File

`dataset.jsonl`:

```jsonl
{"id":"format-1","input":"Return JSON with keys answer and confidence: 2+2?","expected":"{\"answer\":4,\"confidence\":\"high\"}"}
{"id":"instruction-1","input":"Give exactly three bullet points about safe migrations.","expected":"Three bullet points only."}
```

## Behavior Spec

You can pass a spec as text:

```bash
ddo-optimize \
  --prompt prompt.txt \
  --spec "Return requested formats exactly. Ask for missing information when needed." \
  --dataset dataset.jsonl
```

or as a file:

```bash
ddo-optimize \
  --prompt prompt.txt \
  --spec behavior-spec.txt \
  --dataset dataset.jsonl
```

## First Safe Run

Use a small run first:

```bash
ddo-optimize \
  --prompt prompt.txt \
  --dataset dataset.jsonl \
  --horizon 3 \
  --budget 6 \
  --patience 2 \
  --output optimized-prompt.txt
```
