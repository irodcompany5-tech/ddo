# Evaluation Adapters

Use an evaluation adapter when you already have an evaluation system and want DDO to use that instead of the built-in LLM verifier.

## Why Use An External Evaluator

External evaluators are useful when:

- you already have production regression tests
- you use DeepEval, Ragas, LangSmith, pytest, or an internal harness
- you need deterministic scoring
- you want task-specific metrics
- you want DDO proposals gated by your own quality bar

## Return Shape

An evaluator can return a number:

```python
0.82
```

or a full summary:

```json
{
  "average": 0.82,
  "count": 10,
  "passRate": 0.8,
  "results": [
    {
      "id": "case-1",
      "score": 0.9,
      "pass": true,
      "rationale": "Matched schema and expected value."
    }
  ]
}
```

`average` must be from `0` to `1`.

## Python Adapter

```python
from ddo_optimizer import DDOOptimizer

def evaluator(prompt, dataset, **context):
    results = []
    for example in dataset:
        score = my_eval_system.score(
            system_prompt=prompt,
            input=example["input"],
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

## JavaScript Adapter

```js
import { DDOOptimizer } from "ddo-prompt-optimizer";

async function evaluatePrompt(prompt, { dataset }) {
  const results = [];

  for (const example of dataset) {
    const score = await myEvalSystem.score({
      systemPrompt: prompt,
      input: example.input,
      expected: example.expected
    });

    results.push({
      id: example.id,
      score,
      pass: score >= 0.7
    });
  }

  return {
    average: results.reduce((sum, item) => sum + item.score, 0) / results.length,
    count: results.length,
    passRate: results.filter((item) => item.pass).length / results.length,
    results
  };
}

const optimizer = new DDOOptimizer({ evaluatePrompt });
```

## Acceptance Rule

DDO compares before and after scores:

```text
accept if after.average >= before.average - regression_epsilon
```

If the candidate prompt drops too much, DDO rejects the repair.
