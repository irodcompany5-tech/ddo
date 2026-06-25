# Integration Guide

DDO can run as a web app, an npm library, a Python package, or a CLI. The key integration point is the evaluator contract: let DDO propose prompt repairs, then let your evaluation system decide whether the candidate prompt is safe to accept.

## Evaluator Contract

An evaluator receives the candidate prompt and dataset, then returns either:

- a number from `0` to `1`
- an object with `average`, `count`, `passRate`, and `results`

Example summary:

```json
{
  "average": 0.82,
  "count": 20,
  "passRate": 0.75,
  "results": [
    {
      "id": "case-1",
      "score": 0.9,
      "pass": true,
      "rationale": "Matched expected JSON schema."
    }
  ]
}
```

## JavaScript

```js
import { DDOOptimizer } from "ddo-prompt-optimizer";

async function evaluatePrompt(prompt, { dataset }) {
  const results = [];
  for (const example of dataset) {
    const score = await yourEvaluationService.score({
      systemPrompt: prompt,
      input: example.input,
      expected: example.expected
    });
    results.push({ id: example.id, score, pass: score >= 0.7 });
  }

  return {
    average: results.reduce((sum, item) => sum + item.score, 0) / results.length,
    count: results.length,
    passRate: results.filter((item) => item.pass).length / results.length,
    results
  };
}

const optimizer = new DDOOptimizer({ evaluatePrompt });
const result = await optimizer.optimize({
  initialPrompt: "You are a careful assistant.",
  behaviorSpec: "Return requested formats exactly.",
  dataset: [{ input: "Return JSON for 2+2.", expected: "{\"answer\":4}" }]
});
```

## Python

```python
from ddo_optimizer import DDOOptimizer

def evaluator(prompt, dataset, **context):
    results = []
    for example in dataset:
        score = your_eval_harness(prompt, example["input"], example.get("expected"))
        results.append({"id": example["id"], "score": score, "pass": score >= 0.7})

    return {
        "average": sum(item["score"] for item in results) / len(results),
        "count": len(results),
        "passRate": sum(1 for item in results if item["pass"]) / len(results),
        "results": results,
    }

optimizer = DDOOptimizer(evaluator=evaluator)
result = optimizer.optimize(
    initial_prompt="You are a careful assistant.",
    behavior_spec="Return requested formats exactly.",
    dataset=[{"input": "Return JSON for 2+2.", "expected": "{\"answer\":4}"}],
)
```

## DeepEval

Install the optional integration:

```bash
pip install "ddo-prompt-optimizer[deepeval]"
```

Use DeepEval metrics as the verifier gate:

```python
from deepeval.dataset import Golden
from deepeval.metrics import AnswerRelevancyMetric
from ddo_optimizer.adapters.deepeval import optimize_with_deepeval

def model_callback(prompt, example):
    return your_llm_app(system_prompt=prompt, user_input=example["input"])

result = optimize_with_deepeval(
    initial_prompt="Respond carefully.",
    goldens=[
        Golden(input="What is Saturn?", expected_output="Saturn is a planet.")
    ],
    metrics=[AnswerRelevancyMetric()],
    model_callback=model_callback,
    teacher_model="gpt-5.5",
    student_model="gpt-5.5",
)
```

## Custom Model Clients

Python users can replace the OpenAI client entirely:

```python
from ddo_optimizer import DDOOptimizer
from ddo_optimizer.types import ModelResponse

class MyModelClient:
    def complete(self, *, model, messages, api_mode, temperature, max_output_tokens, metadata=None):
        text = call_my_provider(model=model, messages=messages)
        return ModelResponse(text=text, usage={})

optimizer = DDOOptimizer(model_client=MyModelClient(), evaluator=my_evaluator)
```

This is useful when your platform already routes model calls through LiteLLM, LangChain, an internal gateway, or a compliance proxy.
