# Usage Scenarios

This page shows end-to-end ways teams can use DDO. Each scenario starts small, then shows where to expand.

## Scenario 1: Improve A JSON-Returning Assistant

Use this when your prompt often violates a schema.

### 1. Create `prompt.txt`

```text
You are a careful assistant. Answer the user's question clearly.
```

### 2. Create `dataset.jsonl`

```jsonl
{"id":"json-1","input":"Return JSON with keys answer and confidence: 2+2?","expected":"{\"answer\":4,\"confidence\":\"high\"}","notes":"Return valid JSON only."}
{"id":"json-2","input":"Return JSON with key city: What is the capital of France?","expected":"{\"city\":\"Paris\"}","notes":"No markdown fences."}
```

### 3. Run DDO

```bash
ddo-optimize \
  --prompt prompt.txt \
  --spec "When JSON is requested, return only valid JSON with the requested keys." \
  --dataset dataset.jsonl \
  --horizon 3 \
  --budget 6 \
  --output optimized-prompt.txt
```

### 4. Review The Output

Open `optimized-prompt.txt` and check that DDO added a targeted formatting instruction instead of rewriting everything.

## Scenario 2: Use DDO Inside A Python Evaluation Job

Use this when you already have a Python regression suite.

```python
from ddo_optimizer import DDOOptimizer

def evaluator(prompt, dataset, **context):
    results = []

    for example in dataset:
        actual = my_app(system_prompt=prompt, user_input=example["input"])
        score = my_scorer(actual=actual, expected=example["expected"])
        results.append({"id": example["id"], "score": score, "pass": score >= 0.8})

    return {
        "average": sum(item["score"] for item in results) / len(results),
        "count": len(results),
        "passRate": sum(1 for item in results if item["pass"]) / len(results),
        "results": results,
    }

optimizer = DDOOptimizer(evaluator=evaluator)

result = optimizer.optimize(
    initial_prompt=open("prompt.txt").read(),
    behavior_spec="Follow task instructions and preserve required output format.",
    dataset=[
        {"id": "case-1", "input": "Return JSON for 2+2.", "expected": "{\"answer\":4}"},
    ],
    horizon=3,
    budget=6,
)

print(result.final_prompt)
```

## Scenario 3: Use DDO In A Node.js Service

Use this when your app and eval harness are JavaScript-first.

```js
import { DDOOptimizer } from "ddo-prompt-optimizer";

async function evaluatePrompt(prompt, { dataset }) {
  const results = [];

  for (const example of dataset) {
    const actual = await myApp.generate({
      systemPrompt: prompt,
      userInput: example.input
    });

    const score = await myScorer({ actual, expected: example.expected });
    results.push({ id: example.id, score, pass: score >= 0.8 });
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
  behaviorSpec: "Follow task instructions and preserve required output format.",
  dataset: [
    { id: "case-1", input: "Return JSON for 2+2.", expected: "{\"answer\":4}" }
  ],
  horizon: 3,
  budget: 6
});

console.log(result.finalPrompt);
```

## Scenario 4: Use DeepEval Metrics

Use this when your team already uses DeepEval.

```python
from deepeval.dataset import Golden
from deepeval.metrics import AnswerRelevancyMetric
from ddo_optimizer.adapters.deepeval import optimize_with_deepeval

def model_callback(prompt, example):
    return my_app(system_prompt=prompt, user_input=example["input"])

result = optimize_with_deepeval(
    initial_prompt="You are a careful assistant.",
    goldens=[
        Golden(input="What is Saturn?", expected_output="Saturn is a planet.")
    ],
    metrics=[AnswerRelevancyMetric()],
    model_callback=model_callback,
    horizon=3,
    budget=6,
)
```

## Scenario 5: Run A Cheap Prompt Check In CI

Use this when you want pull requests to test prompt quality.

```bash
ddo-optimize \
  --prompt prompts/support-agent.txt \
  --dataset evals/support-agent.jsonl \
  --horizon 2 \
  --budget 3 \
  --output /tmp/optimized-prompt.txt \
  --result-json /tmp/ddo-result.json
```

Then inspect `/tmp/ddo-result.json` in your CI logs or artifacts.

## When To Increase Budget

Start small:

```text
Horizon: 2
Budget: 3
Validation: 2
```

Increase when:

- the run is stable
- the accepted edits look useful
- the dataset has enough examples
- you want deeper diagnosis across multiple behavior axes
