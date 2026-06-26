# Configuration

DDO can be configured through environment variables, UI fields, CLI flags, or library options.

## Precedence

When the same setting is provided in more than one place, use this order:

1. Explicit library option or CLI flag.
2. UI field for the current run.
3. Environment variable.
4. Built-in default.

This lets teams keep safe defaults in `.env` while overriding individual runs from the UI, notebook, CLI, or library call.

## API Keys

OpenAI-compatible defaults:

```bash
OPENAI_API_KEY=<your-openai-api-key>
OPENAI_BASE_URL=
OPENAI_ORG_ID=
OPENAI_PROJECT_ID=
```

Use `OPENAI_BASE_URL` when routing through a compatible gateway.

Never commit `.env`, `.npmrc`, or tokens. Use `.env.example` as the public template.

## Server Settings

```bash
DDO_HOST=127.0.0.1
DDO_PORT=5174
```

## Model Settings

```bash
DDO_TEACHER_MODEL=google/gemma-4-31b-it
DDO_STUDENT_MODEL=google/gemma-4-31b-it
DDO_VERIFIER_MODEL=google/gemma-4-31b-it
DDO_API_MODE=responses
```

Use model IDs available to your OpenAI account or compatible gateway. The teacher model should usually be at least as capable as the student model because it performs diagnosis and repair.

For the Gemma 4 benchmark preset used in this repository:

```bash
DDO_TEACHER_MODEL=google/gemma-4-31b-it
DDO_STUDENT_MODEL=google/gemma-4-31b-it
DDO_VERIFIER_MODEL=google/gemma-4-31b-it
```

`DDO_API_MODE` can be:

| Value | Meaning |
| --- | --- |
| `responses` | Use OpenAI Responses API first |
| `chat` | Use Chat Completions |

## Optimization Settings

```bash
DDO_HORIZON=5
DDO_EPOCHS=5
DDO_BUDGET=20
DDO_PATIENCE=2
DDO_CONFIDENCE_THRESHOLD=0.62
DDO_REGRESSION_EPSILON=0.03
DDO_VALIDATION_LIMIT=6
DDO_MAX_TOTAL_TOKENS=1000000
```

| Setting | Meaning |
| --- | --- |
| `Horizon` | Maximum teacher-student diagnostic turns per iteration |
| `Epochs` | Maximum optimization iterations before the run stops |
| `Budget` | Total student diagnostic exchanges |
| `Patience` | Stop after this many stalled iterations |
| `Confidence threshold` | Minimum weakness confidence required for repair |
| `Regression epsilon` | Allowed verifier score drop before rejection |
| `Validation limit` | Number of dataset examples used by verifier |
| `Max total tokens` | Hard cap on accumulated token usage for the full run |

## Verifier And Minimality Controls

| Control | Recommended Start | Meaning |
| --- | --- | --- |
| Verifier gate | On | Score before/after prompts and reject regressions |
| Minimality mode | Warn | Surface oversized edits while still allowing exploration |
| Max prompt growth ratio | `0.35` | Warn or reject when a repair grows too much |

Use stricter minimality after the first successful run if DDO is adding too much text.

## Recommended Presets

### Cheap Smoke Test

```text
Horizon: 2
Budget: 3
Patience: 1
Validation: 2
```

### Normal Prompt Tuning

```text
Horizon: 5
Budget: 20
Patience: 2
Validation: 6
```

### More Thorough Run

```text
Horizon: 8
Budget: 40
Patience: 3
Validation: 12
```

### Gemma 4 Long Run

```text
Teacher: google/gemma-4-31b-it
Student: google/gemma-4-31b-it
Verifier: google/gemma-4-31b-it
Epochs: 5
Max total tokens: 1000000
```

## Production Defaults

For production prompt maintenance, keep these defaults stable in source control or deployment config:

- Dataset location.
- Behavior specification.
- Model IDs.
- Budget and validation limits.
- Regression epsilon.
- External evaluator settings.

Keep secrets in environment variables or your secret manager.
