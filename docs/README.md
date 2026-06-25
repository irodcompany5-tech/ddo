# DDO Documentation

This is the practical documentation hub for Diagnostic Dialogue Optimization (DDO). Start with the guide that matches how you want to use the project.

## Start Here

| Goal | Guide |
| --- | --- |
| Install and run the web UI | [Quickstart](quickstart.md) |
| Use DDO from Python with `pip` | [Python / pip](python.md) |
| Use DDO from Node.js with `npm` | [JavaScript / npm](javascript.md) |
| Use DDO with DeepEval metrics | [DeepEval](deepeval.md) |
| Run DDO from a terminal | [CLI](cli.md) |
| Prepare datasets | [Dataset format](dataset-format.md) |
| Plug in your own evaluation platform | [Evaluation adapters](evaluation-adapters.md) |
| Configure models, keys, and budgets | [Configuration](configuration.md) |
| Follow end-to-end examples | [Usage scenarios](scenarios.md) |
| Fix common issues | [Troubleshooting](troubleshooting.md) |

## What DDO Does

DDO improves a system prompt through a repeated loop:

1. A teacher model asks diagnostic questions.
2. A student model answers under the current prompt.
3. The teacher identifies one concrete weakness.
4. DDO proposes a small prompt repair.
5. An optional evaluator verifies that the repair does not regress.
6. The next round starts fresh with the repaired prompt.

The result is an optimized prompt, an audit trail of accepted edits, and the diagnostic evidence behind each edit.

## Pick The Right Integration

- Use the **web UI** when you want to experiment visually.
- Use **Python / pip** when your evaluation stack is Python-first.
- Use **JavaScript / npm** when your product or evaluation harness is Node.js.
- Use **DeepEval** when you already evaluate with DeepEval metrics and goldens.
- Use the **external evaluator contract** when you have your own platform, CI eval job, LangSmith/Ragas-like harness, or internal scorer.

## Minimal Dataset

You can start with three examples:

```jsonl
{"id":"format-1","input":"Return JSON with keys answer and confidence: 2+2?","expected":"{\"answer\":4,\"confidence\":\"high\"}","notes":"Must return valid JSON only."}
{"id":"instruction-1","input":"Give exactly three bullet points about safe migrations. Each starts with a verb.","expected":"Three bullets only, each starts with a verb."}
{"id":"calibration-1","input":"What will my cloud bill be next month?","expected":"Ask for missing usage and pricing details."}
```

Save that as `dataset.jsonl`, then follow the guide for your framework.
