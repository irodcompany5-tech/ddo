# Configuration

DDO can be configured through environment variables, UI fields, CLI flags, or library options.

## API Keys

OpenAI-compatible defaults:

```bash
OPENAI_API_KEY=<your-openai-api-key>
OPENAI_BASE_URL=
OPENAI_ORG_ID=
OPENAI_PROJECT_ID=
```

Use `OPENAI_BASE_URL` when routing through a compatible gateway.

## Server Settings

```bash
DDO_HOST=127.0.0.1
DDO_PORT=5174
```

## Model Settings

```bash
DDO_TEACHER_MODEL=gpt-5.5
DDO_STUDENT_MODEL=gpt-5.5
DDO_VERIFIER_MODEL=gpt-5.5
DDO_API_MODE=responses
```

`DDO_API_MODE` can be:

| Value | Meaning |
| --- | --- |
| `responses` | Use OpenAI Responses API first |
| `chat` | Use Chat Completions |

## Optimization Settings

```bash
DDO_HORIZON=5
DDO_BUDGET=20
DDO_PATIENCE=2
DDO_CONFIDENCE_THRESHOLD=0.62
DDO_REGRESSION_EPSILON=0.03
DDO_VALIDATION_LIMIT=6
```

| Setting | Meaning |
| --- | --- |
| `Horizon` | Maximum teacher-student diagnostic turns per iteration |
| `Budget` | Total student diagnostic exchanges |
| `Patience` | Stop after this many stalled iterations |
| `Confidence threshold` | Minimum weakness confidence required for repair |
| `Regression epsilon` | Allowed verifier score drop before rejection |
| `Validation limit` | Number of dataset examples used by verifier |

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
