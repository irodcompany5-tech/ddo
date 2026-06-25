from __future__ import annotations

from typing import Any, Callable

from ..core import DDOOptimizer
from ..dataset import normalize_dataset


def goldens_to_dataset(goldens: list[Any]) -> list[dict[str, Any]]:
    examples = []
    for index, golden in enumerate(goldens, start=1):
        examples.append(
            {
                "id": str(getattr(golden, "id", None) or getattr(golden, "name", None) or f"golden-{index}"),
                "input": str(getattr(golden, "input", "")),
                "expected": str(getattr(golden, "expected_output", None) or getattr(golden, "expected", "") or ""),
                "notes": str(getattr(golden, "context", "") or ""),
                "tags": list(getattr(golden, "tags", []) or []),
            }
        )
    return normalize_dataset(examples)


def make_deepeval_evaluator(metrics: list[Any], model_callback: Callable[..., str]) -> Callable[..., dict[str, Any]]:
    """Create a DDO external evaluator backed by DeepEval metrics.

    The callback may accept either ``(prompt, golden_like_dict)`` or a single interpolated string.
    """

    try:
        from deepeval.test_case import LLMTestCase
    except ImportError as exc:
        raise ImportError("Install with: pip install ddo-prompt-optimizer[deepeval]") from exc

    def evaluator(prompt: str, *, dataset: list[dict[str, Any]], **_: Any) -> dict[str, Any]:
        results = []
        for example in dataset:
            actual_output = _call_model_callback(model_callback, prompt, example)
            test_case = LLMTestCase(
                input=example["input"],
                actual_output=actual_output,
                expected_output=example.get("expected") or None,
            )
            metric_scores = []
            metric_reasons = []
            for metric in metrics:
                metric.measure(test_case)
                metric_scores.append(float(getattr(metric, "score", 0) or 0))
                metric_reasons.append(str(getattr(metric, "reason", "") or ""))
            score = sum(metric_scores) / len(metric_scores) if metric_scores else 0
            results.append(
                {
                    "id": example["id"],
                    "score": score,
                    "pass": score >= 0.5,
                    "rationale": " | ".join(reason for reason in metric_reasons if reason),
                    "answer": actual_output,
                }
            )

        average = sum(result["score"] for result in results) / len(results) if results else 0
        return {
            "average": average,
            "count": len(results),
            "passRate": sum(1 for result in results if result["pass"]) / len(results) if results else 0,
            "results": results,
        }

    return evaluator


def optimize_with_deepeval(
    *,
    initial_prompt: str,
    goldens: list[Any],
    metrics: list[Any],
    model_callback: Callable[..., str],
    **ddo_options: Any,
):
    evaluator = make_deepeval_evaluator(metrics, model_callback)
    optimizer = DDOOptimizer(evaluator=evaluator)
    return optimizer.optimize(initial_prompt=initial_prompt, dataset=goldens_to_dataset(goldens), **ddo_options)


def _call_model_callback(callback: Callable[..., str], prompt: str, example: dict[str, Any]) -> str:
    try:
        return str(callback(prompt, example))
    except TypeError:
        rendered = prompt.replace("{input}", example["input"])
        return str(callback(rendered))
