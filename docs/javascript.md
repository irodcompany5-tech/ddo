# JavaScript / npm Guide

Use this guide when your app or evaluation harness runs in Node.js.

## 1. Install

```bash
npm install ddo-prompt-optimizer
```

## 2. Set API Key

```bash
export OPENAI_API_KEY="<your-openai-api-key>"
```

## 3. Minimal JavaScript Example

```js
import { DDOOptimizer } from "ddo-prompt-optimizer";

const optimizer = new DDOOptimizer({
  teacherModel: "gpt-5.5",
  studentModel: "gpt-5.5",
  verifierModel: "gpt-5.5"
});

const result = await optimizer.optimize({
  initialPrompt: "You are a careful assistant.",
  behaviorSpec: "Return requested formats exactly. Reason step by step when needed.",
  dataset: [
    {
      input: "Return JSON with keys answer and confidence: 2+2?",
      expected: "{\"answer\":4,\"confidence\":\"high\"}",
      notes: "Must return valid JSON only."
    }
  ],
  horizon: 3,
  budget: 6
});

console.log(result.finalPrompt);
```

## 4. Stream Progress Events

```js
const result = await optimizer.optimize(
  {
    initialPrompt: "You are a careful assistant.",
    behaviorSpec: "Follow the requested output format exactly.",
    dataset: [{ input: "Return JSON for 2+2.", expected: "{\"answer\":4}" }]
  },
  (event) => {
    console.log(event.type);
  }
);
```

## 5. Use Your Own Evaluator

```js
import { DDOOptimizer } from "ddo-prompt-optimizer";

async function evaluatePrompt(prompt, { dataset }) {
  const results = [];

  for (const example of dataset) {
    const score = await runMyEvalHarness({
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

## 6. CLI From npm Install

```bash
ddo optimize \
  --prompt prompt.txt \
  --dataset examples/dataset.jsonl \
  --teacher-model gpt-5.5 \
  --student-model gpt-5.5 \
  --output optimized-prompt.txt
```

## 7. TypeScript Notes

The package is ESM. Use one of these:

```js
import { DDOOptimizer } from "ddo-prompt-optimizer";
```

or dynamic import:

```js
const { DDOOptimizer } = await import("ddo-prompt-optimizer");
```
