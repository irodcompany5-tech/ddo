from __future__ import annotations

import csv
import json
from pathlib import Path
from typing import Any


def normalize_dataset(raw_examples: Any) -> list[dict[str, Any]]:
    if raw_examples is None:
        return []

    if not isinstance(raw_examples, list):
        raw_examples = list(raw_examples)

    normalized = []
    for index, example in enumerate(raw_examples, start=1):
        if isinstance(example, str):
            item = {"id": f"ex-{index}", "input": example.strip(), "expected": "", "notes": "", "tags": []}
        else:
            item = {
                "id": str(_get(example, "id", f"ex-{index}")),
                "input": str(
                    _get(example, "input", None)
                    or _get(example, "question", None)
                    or _get(example, "prompt", "")
                ).strip(),
                "expected": str(
                    _get(example, "expected", None)
                    or _get(example, "expected_output", None)
                    or _get(example, "answer", None)
                    or _get(example, "target", "")
                ).strip(),
                "notes": str(_get(example, "notes", None) or _get(example, "rubric", "")).strip(),
                "tags": _normalize_tags(_get(example, "tags", [])),
            }
        if item["input"]:
            normalized.append(item)
    return normalized


def load_dataset_file(file_path: str | Path) -> list[dict[str, Any]]:
    path = Path(file_path)
    text = path.read_text(encoding="utf-8")
    lower = path.name.lower()

    if lower.endswith(".json"):
        data = json.loads(text)
        return normalize_dataset(data if isinstance(data, list) else data.get("examples") or data.get("data") or [])

    if lower.endswith(".jsonl"):
        return normalize_dataset([json.loads(line) for line in text.splitlines() if line.strip()])

    if lower.endswith(".csv"):
        return normalize_dataset(list(csv.DictReader(text.splitlines())))

    return normalize_dataset(
        {"id": f"ex-{index}", "input": chunk.strip()}
        for index, chunk in enumerate(text.split("\n\n"), start=1)
        if chunk.strip()
    )


def dataset_preview(examples: Any, limit: int = 8) -> list[dict[str, Any]]:
    return [
        {
            "id": item["id"],
            "input": item["input"][:500],
            "expected": item["expected"][:300],
            "notes": item["notes"][:300],
            "tags": item["tags"],
        }
        for item in normalize_dataset(examples)[:limit]
    ]


def select_validation_examples(examples: Any, limit: int) -> list[dict[str, Any]]:
    return normalize_dataset(examples)[: max(0, int(limit or 0))]


def _get(example: Any, key: str, default: Any = None) -> Any:
    if isinstance(example, dict):
        return example.get(key, default)
    return getattr(example, key, default)


def _normalize_tags(tags: Any) -> list[str]:
    if isinstance(tags, list):
        return [str(tag).strip() for tag in tags if str(tag).strip()]
    return [tag.strip() for tag in str(tags or "").replace(";", ",").split(",") if tag.strip()]
