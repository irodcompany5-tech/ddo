# Dataset Format

The verifier is optional, but a small dataset makes DDO safer because prompt edits can be rejected when they regress validation quality.

## Fields

| Field | Required | Meaning |
| --- | --- | --- |
| `id` | no | Stable example identifier |
| `input` | yes | User input sent to the student model |
| `expected` | no | Expected answer, schema, behavior, or target |
| `notes` | no | Extra rubric notes for the verifier |
| `tags` | no | Categories such as `format`, `reasoning`, `calibration` |

Aliases are supported:

| Alias | Normalized Field |
| --- | --- |
| `question`, `prompt` | `input` |
| `answer`, `target`, `expected_output` | `expected` |
| `rubric` | `notes` |

## JSON

```json
[
  {
    "id": "format-1",
    "input": "Return JSON with keys answer and confidence: 2+2?",
    "expected": "{\"answer\":4,\"confidence\":\"high\"}",
    "notes": "Output must be valid JSON only.",
    "tags": ["format", "math"]
  }
]
```

## JSONL

```jsonl
{"id":"reasoning-1","input":"A train travels 60 mph for 2 hours and 30 mph for 1 hour. Distance?","expected":"150 miles","notes":"Must compute both legs."}
{"id":"calibration-1","input":"What will my server bill be next month?","expected":"Ask for missing usage and pricing details.","tags":["calibration"]}
```

## CSV

Headers can use `id`, `input`, `expected`, `notes`, and `tags`.

```csv
id,input,expected,notes,tags
format-1,"Return exactly two bullets about backups.","Two bullets only.","Checks format adherence.","format"
```

## Plain Text

Plain text is split into examples by blank lines. Each block becomes one input without an expected answer.

## Starter Dataset

```jsonl
{"id":"format-1","input":"Return JSON with keys answer and confidence: 2+2?","expected":"{\"answer\":4,\"confidence\":\"high\"}","notes":"Must return valid JSON only.","tags":["format","math"]}
{"id":"instruction-1","input":"Give exactly three bullet points about safe database migrations. Each bullet must start with a verb.","expected":"Three bullets only; each starts with a verb.","tags":["instruction-following"]}
{"id":"calibration-1","input":"What will my server bill be next month?","expected":"Ask for missing usage/pricing details or state uncertainty.","tags":["calibration"]}
```

## Tips

- Start with 5 to 20 examples.
- Include examples for each behavior you care about.
- Put strict output requirements in `expected` or `notes`.
- Use tags to inspect which types of behavior improve or regress.
