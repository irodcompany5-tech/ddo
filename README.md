# DDO Prompt Optimizer

[![npm](https://img.shields.io/npm/v/ddo-prompt-optimizer?label=npm)](https://www.npmjs.com/package/ddo-prompt-optimizer)
[![PyPI](https://img.shields.io/pypi/v/ddo-prompt-optimizer?label=pypi)](https://pypi.org/project/ddo-prompt-optimizer/)
[![CI](https://github.com/irodcompany5-tech/ddo/actions/workflows/ci.yml/badge.svg)](https://github.com/irodcompany5-tech/ddo/actions/workflows/ci.yml)
[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

Diagnostic Dialogue Optimization (DDO) is a prompt optimization framework based on the paper included in this repository. A teacher model probes a student prompt through diagnostic dialogue, identifies one concrete weakness, proposes a minimal repair, verifies the candidate prompt, then repeats.

Use it as a web UI, a Python package, an npm package, a CLI, a Jupyter notebook, or an adapter inside your existing evaluation stack.

## Start Here

| Goal | Best Entry Point |
| --- | --- |
| Try DDO visually | [Web UI quickstart](docs/quickstart.md) |
| Run a step-by-step notebook | [Jupyter notebook guide](docs/jupyter-notebook.md) |
| Use it from Python | [Python / pip guide](docs/python.md) |
| Use it from Node.js | [JavaScript / npm guide](docs/javascript.md) |
| Plug into DeepEval | [DeepEval guide](docs/deepeval.md) |
| Plug into another evaluator | [Evaluation adapters](docs/evaluation-adapters.md) |
| Benchmark before/after results | [Benchmarking guide](docs/benchmarking.md) |
| Defensible claim framing | [Benchmark claims](benchmarks/claims.md) |
| See published benchmark results | [Benchmark results](benchmarks/results.md) |
| Run from a terminal | [CLI guide](docs/cli.md) |
| Understand all docs | [Documentation hub](docs/README.md) |

## Install

JavaScript and TypeScript:

```bash
npm install ddo-prompt-optimizer
```

Python:

```bash
pip install ddo-prompt-optimizer
```

DeepEval and notebook support:

```bash
pip install "ddo-prompt-optimizer[deepeval]"
pip install ddo-prompt-optimizer notebook ipykernel
```

From source:

```bash
git clone https://github.com/irodcompany5-tech/ddo.git
cd ddo
npm install
python -m pip install -e ".[notebook]"
```

## Run The Web UI

```bash
cp .env.example .env
npm run doctor
npm run dev
```

Open:

```text
http://127.0.0.1:5174
```

Set `OPENAI_API_KEY` in `.env`, or paste a key into the UI for a single local run. UI-provided keys are held in memory for that request and are not written to disk.

## Run The Notebook

Open the rendered notebook on GitHub:

[notebooks/ddo_quickstart.ipynb](notebooks/ddo_quickstart.ipynb)

Run it locally:

```bash
python -m pip install -e ".[notebook]"
python -m notebook notebooks/ddo_quickstart.ipynb
```

The first notebook workflow uses a fake model client and simple evaluator, so it runs without an API key or paid model call.

## Minimal Python

```python
from ddo_optimizer import DDOOptimizer

optimizer = DDOOptimizer()

result = optimizer.optimize(
    initial_prompt="You are a careful assistant.",
    behavior_spec="Return requested formats exactly and ask for missing details.",
    dataset=[
        {
            "input": "Return JSON with keys answer and confidence: 2+2?",
            "expected": "{\"answer\":4,\"confidence\":\"high\"}",
        }
    ],
    horizon=3,
    budget=6,
)

print(result.final_prompt)
```

## Minimal JavaScript

```js
import { DDOOptimizer } from "ddo-prompt-optimizer";

const optimizer = new DDOOptimizer();

const result = await optimizer.optimize({
  initialPrompt: "You are a careful assistant.",
  behaviorSpec: "Return requested formats exactly and ask for missing details.",
  dataset: [
    {
      input: "Return JSON with keys answer and confidence: 2+2?",
      expected: "{\"answer\":4,\"confidence\":\"high\"}"
    }
  ],
  horizon: 3,
  budget: 6
});

console.log(result.finalPrompt);
```

## Integrate Your Evaluator

DDO accepts external evaluators in both Python and JavaScript. Your evaluator receives a candidate prompt and dataset, then returns either a score from `0` to `1` or a summary with `average`, `count`, `passRate`, and `results`.

This lets teams connect DDO to DeepEval, Ragas, LangSmith, pytest, CI replay tests, internal grading services, or product-specific regression suites.

Start with:

- [DeepEval guide](docs/deepeval.md)
- [Evaluation adapters](docs/evaluation-adapters.md)
- [Integration guide](docs/integrations.md)

## Repository Map

| Path | Purpose |
| --- | --- |
| [ddo_paper.pdf](ddo_paper.pdf) | Source paper copied into the repo |
| [ddo_paper.txt](ddo_paper.txt) | Extracted paper text |
| [public/](public/) | Browser UI |
| [src/](src/) | Node.js server, OpenAI adapter, npm library, DDO engine |
| [ddo_optimizer/](ddo_optimizer/) | Python package, CLI, OpenAI client, DeepEval adapter |
| [notebooks/](notebooks/) | Jupyter walkthroughs |
| [examples/](examples/) | Starter datasets |
| [benchmarks/](benchmarks/) | Benchmark manifest, result table, and templates |
| [benchmarks/ifeval/](benchmarks/ifeval/) | Deterministic 150/50/50 IFEval experiment and report |
| [docs/](docs/) | User and maintainer documentation |
| [.github/workflows/ci.yml](.github/workflows/ci.yml) | CI checks for code, docs, and tests |

## Quality Checks

```bash
npm run doctor
npm run docs:check
npm run ifeval:prepare
npm run benchmarks:table -- benchmarks/results-template.csv
npm run check
npm test
```

`npm run check` validates JavaScript syntax, Python import syntax, docs links, and notebook JSON.

## Codespaces

Open:

```text
https://codespaces.new/irodcompany5-tech/ddo
```

The devcontainer installs Node dependencies, Python notebook extras, and starts with port `5174` ready for the UI.

## Security

Do not commit `.env`, `.npmrc`, API keys, GitHub tokens, PyPI tokens, npm tokens, private datasets, generated logs, or model transcripts that contain secrets. If a token is pasted into chat, an issue, or terminal output, revoke it and create a new one.

See [SECURITY.md](SECURITY.md).

## License

MIT. See [LICENSE](LICENSE).
