# Dataset Format

The verifier is optional, but a small dataset makes DDO safer because prompt edits can be rejected when they regress validation quality.

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
