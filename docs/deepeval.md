# DeepEval Guide

Use this guide when you already have DeepEval goldens and metrics.

## 1. Install

```bash
pip install "ddo-prompt-optimizer[deepeval]"
```

## 2. Set API Key

```bash
export OPENAI_API_KEY="<your-openai-api-key>"
```

## 3. Basic DeepEval Example

```python
from deepeval.dataset import Golden
from deepeval.metrics import AnswerRelevancyMetric
from ddo_optimizer.adapters.deepeval import optimize_with_deepeval

def model_callback(prompt, example):
    return your_llm_app(
        system_prompt=prompt,
        user_input=example["input"],
    )

result = optimize_with_deepeval(
    initial_prompt="You are a careful assistant.",
    goldens=[
        Golden(
            input="What is Saturn?",
            expected_output="Saturn is a planet."
        )
    ],
    metrics=[AnswerRelevancyMetric()],
    model_callback=model_callback,
    teacher_model="google/gemma-4-31b-it",
    student_model="google/gemma-4-31b-it",
    horizon=3,
    budget=6,
)

print(result.final_prompt)
```

## 4. What `model_callback` Should Do

`model_callback` should run your application with the candidate prompt.

```python
def model_callback(prompt, example):
    user_input = example["input"]
    return my_app.generate(
        system_prompt=prompt,
        user_message=user_input,
    )
```

DDO calls this repeatedly while testing candidate prompts.

## 5. Multiple Metrics

```python
from deepeval.metrics import AnswerRelevancyMetric, FaithfulnessMetric

metrics = [
    AnswerRelevancyMetric(),
    FaithfulnessMetric(),
]
```

DDO averages metric scores for the verifier gate.

## 6. Convert Goldens Manually

If you need more control:

```python
from ddo_optimizer.adapters.deepeval import goldens_to_dataset, make_deepeval_evaluator
from ddo_optimizer import DDOOptimizer

dataset = goldens_to_dataset(goldens)
evaluator = make_deepeval_evaluator(metrics, model_callback)

optimizer = DDOOptimizer(evaluator=evaluator)
result = optimizer.optimize(
    initial_prompt="You are a careful assistant.",
    behavior_spec="Answer accurately and stay concise.",
    dataset=dataset,
)
```

## 7. Recommended Workflow

1. Start with 5 to 20 goldens.
2. Use one or two metrics first.
3. Keep `budget` small for the first run.
4. Review accepted prompt diffs.
5. Increase dataset size and budget after the first successful run.
