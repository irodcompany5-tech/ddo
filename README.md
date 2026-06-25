# DDO Prompt Optimizer

Diagnostic Dialogue Optimization (DDO) is a prompt optimization framework based on the paper copied into this repository. A stronger teacher model conducts a multi-turn diagnostic conversation with a student model, compiles a structured weakness profile, proposes a minimal prompt repair, optionally verifies the edit on a small dataset or external evaluator, then resets and repeats.

This repository includes the paper, a full-stack OpenAI SDK implementation, a browser UI, npm and pip library entrypoints, a DeepEval adapter, Codespaces support, tests, a CI workflow template, and example data.

## Documentation

Read the full docs here:

[docs/README.md](docs/README.md)

Framework-specific guides:

- [Python / pip](docs/python.md)
- [JavaScript / npm](docs/javascript.md)
- [DeepEval](docs/deepeval.md)
- [Jupyter notebook](docs/jupyter-notebook.md)
- [CLI](docs/cli.md)
- [Web UI quickstart](docs/quickstart.md)
- [Datasets](docs/dataset-format.md)
- [External evaluators](docs/evaluation-adapters.md)
- [Configuration](docs/configuration.md)
- [Usage scenarios](docs/scenarios.md)
- [Troubleshooting](docs/troubleshooting.md)

## Quick Start

```bash
npm install
cp .env.example .env
npm run doctor
npm run dev
```

Open `http://127.0.0.1:5174`.

Prefer a notebook walkthrough first? Open [notebooks/ddo_quickstart.ipynb](notebooks/ddo_quickstart.ipynb) on GitHub or run it locally with the [Jupyter notebook guide](docs/jupyter-notebook.md).

Add your API key either to `.env`:

```bash
OPENAI_API_KEY=<your-openai-api-key>
```

or paste it into the UI key field for a single run. UI keys are sent only to the local server for that request and are not written to disk.

## Codespaces

Open the project in a dedicated Codespaces environment:

`https://codespaces.new/irodcompany5-tech/ddo`

The devcontainer installs dependencies, runs `npm run doctor`, and forwards port `5174`.

## Install As A Library

JavaScript/TypeScript projects:

```bash
npm install ddo-prompt-optimizer
```

Python projects:

```bash
pip install ddo-prompt-optimizer
```

To install the latest source directly from GitHub:

```bash
npm install github:irodcompany5-tech/ddo
pip install "git+https://github.com/irodcompany5-tech/ddo.git"
```

For DeepEval helpers:

```bash
pip install "ddo-prompt-optimizer[deepeval]"
```

## JavaScript API

```js
import { DDOOptimizer } from "ddo-prompt-optimizer";

const optimizer = new DDOOptimizer({
  teacherModel: "gpt-5.5",
  studentModel: "gpt-5.5",
  verifierModel: "gpt-5.5"
});

const result = await optimizer.optimize(
  {
    initialPrompt: "You are a careful assistant.",
    behaviorSpec: "Follow requested format, reason stepwise, and handle edge cases.",
    dataset: [
      {
        input: "Return JSON with keys answer and confidence: 2+2?",
        expected: "{\"answer\":4,\"confidence\":\"high\"}"
      }
    ]
  },
  (event) => console.log(event.type)
);

console.log(result.finalPrompt);
```

Use your own evaluation platform by passing `evaluatePrompt`. It should return either a score from `0` to `1`, or an object with `average`, `count`, `passRate`, and `results`.

```js
const optimizer = new DDOOptimizer({
  evaluatePrompt: async (prompt, { dataset }) => {
    return await runYourEvalHarness(prompt, dataset);
  }
});
```

JavaScript CLI:

```bash
ddo optimize \
  --prompt prompt.txt \
  --dataset examples/dataset.jsonl \
  --teacher-model gpt-5.5 \
  --student-model gpt-5.5 \
  --output optimized-prompt.txt
```

## Python API

```python
from ddo_optimizer import DDOOptimizer

optimizer = DDOOptimizer()

result = optimizer.optimize(
    initial_prompt="You are a careful assistant.",
    behavior_spec="Follow requested format, reason stepwise, and handle edge cases.",
    dataset=[
        {
            "input": "Return JSON with keys answer and confidence: 2+2?",
            "expected": "{\"answer\":4,\"confidence\":\"high\"}",
        }
    ],
    teacher_model="gpt-5.5",
    student_model="gpt-5.5",
)

print(result.final_prompt)
```

Python CLI:

```bash
ddo-optimize \
  --prompt prompt.txt \
  --dataset examples/dataset.jsonl \
  --teacher-model gpt-5.5 \
  --student-model gpt-5.5 \
  --output optimized-prompt.txt
```

## DeepEval Adapter

```python
from deepeval.dataset import Golden
from deepeval.metrics import AnswerRelevancyMetric
from ddo_optimizer.adapters.deepeval import optimize_with_deepeval

def model_callback(prompt, example):
    # Run your app using the candidate prompt and the example input.
    return your_llm_app(system_prompt=prompt, user_input=example["input"])

result = optimize_with_deepeval(
    initial_prompt="Respond carefully.",
    goldens=[Golden(input="What is Saturn?", expected_output="Saturn is a planet.")],
    metrics=[AnswerRelevancyMetric()],
    model_callback=model_callback,
)

print(result.final_prompt)
```

See [docs/integrations.md](docs/integrations.md) for generic evaluator contracts and examples.

## What Is Included

- [ddo_paper.pdf](ddo_paper.pdf): copied paper.
- [ddo_paper.txt](ddo_paper.txt): extracted paper text.
- [src/ddoEngine.js](src/ddoEngine.js): DDO algorithm implementation.
- [src/index.js](src/index.js): public npm library entrypoint.
- [src/openaiAdapter.js](src/openaiAdapter.js): official OpenAI SDK adapter for Responses API and Chat Completions.
- [ddo_optimizer/](ddo_optimizer): public Python package.
- [public/](public): browser UI for configuration, dataset upload, live logs, and prompt export.
- [examples/dataset.jsonl](examples/dataset.jsonl): sample verifier dataset.
- [docs/architecture.md](docs/architecture.md): implementation architecture.
- [docs/dataset-format.md](docs/dataset-format.md): supported dataset formats.
- [docs/integrations.md](docs/integrations.md): library and framework integration guide.
- [docs/publishing.md](docs/publishing.md): npm and PyPI release checklist.
- [docs/github-actions-ci.yml](docs/github-actions-ci.yml): GitHub Actions CI template.

## Configuration

Environment defaults live in [.env.example](.env.example):

```bash
OPENAI_API_KEY=
OPENAI_BASE_URL=
OPENAI_ORG_ID=
OPENAI_PROJECT_ID=

DDO_HOST=127.0.0.1
DDO_PORT=5174
DDO_TEACHER_MODEL=gpt-5.5
DDO_STUDENT_MODEL=gpt-5.5
DDO_VERIFIER_MODEL=gpt-5.5
DDO_API_MODE=responses

DDO_HORIZON=5
DDO_BUDGET=20
DDO_PATIENCE=2
DDO_CONFIDENCE_THRESHOLD=0.62
DDO_REGRESSION_EPSILON=0.03
DDO_VALIDATION_LIMIT=6
```

All important DDO settings can also be changed from the UI:

- Teacher, student, and verifier models.
- Responses API or Chat Completions mode.
- Behavior specification.
- Initial student system prompt.
- Horizon, total budget, patience, confidence threshold, regression epsilon, and validation limit.
- Verifier gate and minimality guard.

## Dataset Input

The UI accepts JSON, JSONL, CSV, plain text, or manual examples.

Minimal JSONL:

```jsonl
{"input":"Return exactly two bullets about backups.","expected":"Two bullets only.","notes":"Checks instruction adherence."}
{"input":"What will my cloud bill be next month?","expected":"Ask for missing usage and pricing details.","tags":["calibration"]}
```

See [docs/dataset-format.md](docs/dataset-format.md) for full details.

## DDO Runtime

The implementation follows the paper's core loop:

1. Teacher asks adaptive diagnostic questions.
2. Student answers under the current prompt.
3. Teacher emits a JSON weakness profile.
4. Repair operator proposes a minimal prompt diff.
5. Optional verifier scores before/after prompts on validation examples.
6. Accepted edits update history; rejected edits increase stall count.
7. A fresh diagnostic conversation starts against the repaired prompt.

## Scripts

```bash
npm run doctor   # local setup checks
npm run check    # syntax checks
npm test         # unit tests
npm run dev      # start the UI/server
npm start        # same server entrypoint for production-like runs
```

Python checks are included in `npm run check` and `npm test`.

## Security

Do not commit `.env`, API keys, GitHub tokens, private datasets, or generated logs. If a token is pasted into chat, an issue, or a terminal log, revoke it and create a new one.

See [SECURITY.md](SECURITY.md).

## CI

The CI workflow template is stored at [docs/github-actions-ci.yml](docs/github-actions-ci.yml). To activate it, copy it to `.github/workflows/ci.yml` using a GitHub token that has the `workflow` scope.

## License

MIT. See [LICENSE](LICENSE).
