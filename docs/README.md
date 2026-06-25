# DDO Documentation

This is the documentation hub for Diagnostic Dialogue Optimization (DDO). It is organized by how people actually adopt the project: try it in the UI, run a notebook, install a library, connect an evaluator, then productionize the workflow.

## Choose Your Path

| You want to... | Read this | What you get |
| --- | --- | --- |
| Try DDO in a browser | [Quickstart](quickstart.md) | Local UI, demo dataset, first optimization run |
| Run a visible walkthrough | [Jupyter notebook](jupyter-notebook.md) | Notebook with saved outputs and optional live cells |
| Use Python | [Python / pip](python.md) | `DDOOptimizer`, custom clients, Python CLI |
| Use Node.js | [JavaScript / npm](javascript.md) | ESM import, npm CLI, evaluator callback |
| Use DeepEval | [DeepEval](deepeval.md) | Goldens, metrics, model callback adapter |
| Use another eval platform | [Evaluation adapters](evaluation-adapters.md) | Generic evaluator contract for any framework |
| Publish before/after evidence | [Benchmarking](benchmarking.md) | Benchmark shortlist, protocol, result table format |
| Prepare data | [Dataset format](dataset-format.md) | JSON, JSONL, CSV, text, aliases, tips |
| Tune settings | [Configuration](configuration.md) | API keys, model IDs, budgets, verifier settings |
| Run terminal workflows | [CLI](cli.md) | Python and npm command examples |
| Follow complete examples | [Usage scenarios](scenarios.md) | Python, Node, DeepEval, CI scenarios |
| Fix setup issues | [Troubleshooting](troubleshooting.md) | API keys, imports, ports, package tokens |
| Understand internals | [Architecture](architecture.md) | Runtime flow, components, extension points |
| Publish releases | [Publishing](publishing.md) | npm, PyPI, tokens, release checks |

## What DDO Does

DDO improves a system prompt through a repeatable diagnostic loop:

1. A teacher model asks targeted questions.
2. A student model answers under the current prompt.
3. The teacher writes a structured weakness profile.
4. DDO proposes a minimal prompt repair.
5. A verifier or external evaluator scores before and after prompts.
6. Accepted repairs update the prompt; rejected repairs are recorded.
7. The next iteration starts with a fresh diagnostic conversation.

The output is an optimized prompt plus an audit trail: diagnostic turns, weakness profiles, repair summaries, verifier scores, usage metadata, and stop reason.

## First Run Checklist

Use this when helping a new teammate get from zero to first result.

```bash
git clone https://github.com/irodcompany5-tech/ddo.git
cd ddo
npm install
cp .env.example .env
npm run doctor
npm run dev
```

Open `http://127.0.0.1:5174`, load the demo dataset, set `Budget = 3`, and run DDO.

No API key yet? Open [the notebook](../notebooks/ddo_quickstart.ipynb). Its first workflow runs offline with a fake model client.

## Minimal Dataset

Start with a small JSONL file:

```jsonl
{"id":"format-1","input":"Return JSON with keys answer and confidence: 2+2?","expected":"{\"answer\":4,\"confidence\":\"high\"}","notes":"Must return valid JSON only.","tags":["format","math"]}
{"id":"instruction-1","input":"Give exactly three bullet points about safe migrations. Each starts with a verb.","expected":"Three bullets only, each starts with a verb.","tags":["instruction-following"]}
{"id":"calibration-1","input":"What will my cloud bill be next month?","expected":"Ask for missing usage and pricing details.","tags":["calibration"]}
```

Save it as `dataset.jsonl`, then follow the guide for your framework.

## Integration Pattern

Most production integrations use this shape:

1. Keep your current app or model gateway.
2. Give DDO an initial prompt and representative dataset.
3. Let DDO propose prompt repairs.
4. Score the original and candidate prompt with your evaluator.
5. Accept only candidates that do not regress beyond `regression_epsilon`.
6. Review the accepted diff before shipping.

The generic evaluator guides are [Evaluation adapters](evaluation-adapters.md) and [Integration guide](integrations.md).

## Benchmark Evidence

Use [Benchmarking](benchmarking.md) when you want public before/after evidence. It defines a conservative protocol:

1. Use a public benchmark or internal holdout set.
2. Split prompt-fitting examples from final evaluation examples.
3. Run the baseline prompt.
4. Run DDO on the fitting split.
5. Re-run the optimized prompt on the held-out benchmark split.
6. Publish baseline score, optimized score, delta, run date, model, evaluator, and dataset version.

Do not publish synthetic or hand-entered improvement numbers as benchmark results.

## Recommended First Settings

```text
Horizon: 2
Budget: 3
Patience: 1
Validation limit: 2
Verifier gate: on
```

Increase budget and validation size only after the first run produces useful, targeted repairs.

## Maintainer Checks

Run these before committing documentation or release changes:

```bash
npm run doctor
npm run docs:check
npm run check
npm test
```

`npm run docs:check` validates local Markdown links and notebook JSON so the GitHub docs stay clickable.
