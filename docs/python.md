# Python / pip Guide

Use this guide when your product, eval suite, or notebooks are Python-based.

## 1. Install

```bash
pip install ddo-prompt-optimizer
```

Optional DeepEval support:

```bash
pip install "ddo-prompt-optimizer[deepeval]"
```

## 2. Set API Key

```bash
export OPENAI_API_KEY="<your-openai-api-key>"
```

## 3. Minimal Python Example

```python
from ddo_optimizer import DDOOptimizer

optimizer = DDOOptimizer()

result = optimizer.optimize(
    initial_prompt="You are a careful assistant.",
    behavior_spec="Return requested formats exactly. Reason step by step when needed.",
    dataset=[
        {
            "input": "Return JSON with keys answer and confidence: 2+2?",
            "expected": "{\"answer\":4,\"confidence\":\"high\"}",
            "notes": "Must return valid JSON only.",
        }
    ],
    teacher_model="gpt-5.5",
    student_model="gpt-5.5",
    verifier_model="gpt-5.5",
    horizon=3,
    budget=6,
)

print(result.final_prompt)
print(result.best_score)
```

## 4. Track Events

```python
def on_event(event):
    print(event["type"])

result = optimizer.optimize(
    initial_prompt="You are a careful assistant.",
    behavior_spec="Follow requested output format exactly.",
    dataset=[{"input": "Return JSON for 2+2.", "expected": "{\"answer\":4}"}],
    on_event=on_event,
)
```

Useful event types:

| Event | Meaning |
| --- | --- |
| `iteration` | A new DDO round started |
| `teacher_question` | Teacher generated a diagnostic question |
| `student_answer` | Student answered under the current prompt |
| `weakness_profile` | Teacher identified a weakness |
| `repair` | DDO proposed a prompt edit |
| `verifier` | Evaluator scored before/after prompts |
| `accepted` | Prompt edit was accepted |
| `rejected` | Prompt edit was rejected |
| `done` | Run finished |

## 5. Use Your Own Evaluator

Use this when you already have tests, golden datasets, Ragas, LangSmith, or an internal scoring system.

```python
from ddo_optimizer import DDOOptimizer

def evaluator(prompt, dataset, **context):
    results = []

    for example in dataset:
        score = run_my_eval(
            system_prompt=prompt,
            user_input=example["input"],
            expected=example.get("expected"),
        )
        results.append({
            "id": example["id"],
            "score": score,
            "pass": score >= 0.7,
        })

    return {
        "average": sum(item["score"] for item in results) / len(results),
        "count": len(results),
        "passRate": sum(1 for item in results if item["pass"]) / len(results),
        "results": results,
    }

optimizer = DDOOptimizer(evaluator=evaluator)
```

DDO will use your evaluator instead of its built-in LLM verifier.

## 6. Custom Model Gateway

If your company routes model calls through a proxy or gateway, provide a custom client:

```python
from ddo_optimizer import DDOOptimizer
from ddo_optimizer.types import ModelResponse

class MyModelClient:
    def complete(self, *, model, messages, api_mode, temperature, max_output_tokens, metadata=None):
        text = call_my_gateway(model=model, messages=messages)
        return ModelResponse(text=text, usage={})

optimizer = DDOOptimizer(model_client=MyModelClient())
```

## 7. CLI From Python Install

After `pip install`, you also get:

```bash
ddo-optimize --help
```

Example:

```bash
ddo-optimize \
  --prompt prompt.txt \
  --dataset examples/dataset.jsonl \
  --teacher-model gpt-5.5 \
  --student-model gpt-5.5 \
  --output optimized-prompt.txt
```
