from __future__ import annotations

import json
from typing import Any


def clamp_number(value: Any, minimum: float, maximum: float, fallback: float) -> float:
    try:
        number = float(value)
    except (TypeError, ValueError):
        return fallback
    return min(maximum, max(minimum, number))


def strip_code_fence(text: str) -> str:
    cleaned = str(text or "").strip()
    if cleaned.startswith("```") and cleaned.endswith("```"):
        lines = cleaned.splitlines()
        if len(lines) >= 2:
            return "\n".join(lines[1:-1]).strip()
    return cleaned


def extract_json(text: str, fallback: Any = None) -> Any:
    cleaned = strip_code_fence(text)
    try:
        return json.loads(cleaned)
    except json.JSONDecodeError:
        pass

    start = cleaned.find("{")
    if start == -1:
        return fallback

    depth = 0
    in_string = False
    escape = False
    for index in range(start, len(cleaned)):
        char = cleaned[index]
        if escape:
            escape = False
            continue
        if char == "\\":
            escape = True
            continue
        if char == '"':
            in_string = not in_string
            continue
        if in_string:
            continue
        if char == "{":
            depth += 1
        elif char == "}":
            depth -= 1
        if depth == 0:
            try:
                return json.loads(cleaned[start : index + 1])
            except json.JSONDecodeError:
                return fallback

    return fallback


def prompt_diff(before: str, after: str) -> str:
    if before == after:
        return "--- prompt_before\n+++ prompt_after\n@@\n unchanged"
    removed = "\n".join(f"-{line}" for line in str(before or "").splitlines())
    added = "\n".join(f"+{line}" for line in str(after or "").splitlines())
    return f"--- prompt_before\n+++ prompt_after\n@@\n{removed}\n{added}"


def compact_text(value: Any, max_length: int = 2400) -> str:
    text = str(value or "").strip()
    if len(text) <= max_length:
        return text
    return f"{text[: max_length - 80]}\n\n[...truncated {len(text) - max_length + 80} chars]"


def summarize_history(history: list[dict[str, Any]]) -> list[dict[str, Any]]:
    summary = []
    for index, entry in enumerate(history, start=1):
        weakness = entry.get("weakness") or {}
        repair = entry.get("repair") or {}
        summary.append(
            {
                "iteration": entry.get("iteration", index),
                "deficiency": weakness.get("salient_deficiency", ""),
                "cause": weakness.get("hypothesized_prompt_cause", ""),
                "confidence": weakness.get("confidence"),
                "edit_summary": repair.get("edit_summary", ""),
                "accepted": bool(entry.get("accepted")),
            }
        )
    return summary


def usage_totals(usages: list[dict[str, Any] | None]) -> dict[str, int]:
    totals = {"input_tokens": 0, "output_tokens": 0, "total_tokens": 0}
    for usage in usages:
        if not usage:
            continue
        totals["input_tokens"] += int(usage.get("input_tokens") or usage.get("prompt_tokens") or 0)
        totals["output_tokens"] += int(usage.get("output_tokens") or usage.get("completion_tokens") or 0)
        totals["total_tokens"] += int(usage.get("total_tokens") or 0)
    return totals
