# DDO Prompt Optimizer

Diagnostic Dialogue Optimization (DDO) is a prompt optimization framework based on the paper copied into this repository. A stronger teacher model conducts a multi-turn diagnostic conversation with a student model, compiles a structured weakness profile, proposes a minimal prompt repair, optionally verifies the edit on a small dataset, then resets and repeats.

This repository includes the paper, a full-stack OpenAI SDK implementation, a browser UI, Codespaces support, tests, a CI workflow template, and example data.

## Quick Start

```bash
npm install
cp .env.example .env
npm run doctor
npm run dev
```

Open `http://127.0.0.1:5174`.

Add your API key either to `.env`:

```bash
OPENAI_API_KEY=<your-openai-api-key>
```

or paste it into the UI key field for a single run. UI keys are sent only to the local server for that request and are not written to disk.

## Codespaces

Open the project in a dedicated Codespaces environment:

`https://codespaces.new/irodcompany5-tech/ddo`

The devcontainer installs dependencies, runs `npm run doctor`, and forwards port `5174`.

## What Is Included

- [ddo_paper.pdf](ddo_paper.pdf): copied paper.
- [ddo_paper.txt](ddo_paper.txt): extracted paper text.
- [src/ddoEngine.js](src/ddoEngine.js): DDO algorithm implementation.
- [src/openaiAdapter.js](src/openaiAdapter.js): official OpenAI SDK adapter for Responses API and Chat Completions.
- [public/](public): browser UI for configuration, dataset upload, live logs, and prompt export.
- [examples/dataset.jsonl](examples/dataset.jsonl): sample verifier dataset.
- [docs/architecture.md](docs/architecture.md): implementation architecture.
- [docs/dataset-format.md](docs/dataset-format.md): supported dataset formats.
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

## Security

Do not commit `.env`, API keys, GitHub tokens, private datasets, or generated logs. If a token is pasted into chat, an issue, or a terminal log, revoke it and create a new one.

See [SECURITY.md](SECURITY.md).

## CI

The CI workflow template is stored at [docs/github-actions-ci.yml](docs/github-actions-ci.yml). To activate it, copy it to `.github/workflows/ci.yml` using a GitHub token that has the `workflow` scope.

## License

MIT. See [LICENSE](LICENSE).
