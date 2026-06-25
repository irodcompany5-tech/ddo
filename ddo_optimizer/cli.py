from __future__ import annotations

import argparse
import json
from pathlib import Path

from .core import DDOOptimizer
from .dataset import load_dataset_file


def main() -> int:
    parser = argparse.ArgumentParser(description="Run Diagnostic Dialogue Optimization from the command line.")
    parser.add_argument("--prompt", required=True, help="Initial prompt text or path to a text file.")
    parser.add_argument("--spec", help="Behavior specification text or path.")
    parser.add_argument("--dataset", help="JSON, JSONL, CSV, or blank-line text dataset.")
    parser.add_argument("--teacher-model", default=None)
    parser.add_argument("--student-model", default=None)
    parser.add_argument("--verifier-model", default=None)
    parser.add_argument("--api-mode", default=None, choices=["responses", "chat"])
    parser.add_argument("--horizon", type=int, default=None)
    parser.add_argument("--budget", type=int, default=None)
    parser.add_argument("--patience", type=int, default=None)
    parser.add_argument("--no-verifier", action="store_true")
    parser.add_argument("--output", help="Write final prompt to this file.")
    parser.add_argument("--result-json", help="Write full run result JSON to this file.")
    args = parser.parse_args()

    options = {
        "initial_prompt": _read_text_or_value(args.prompt),
        "behavior_spec": _read_text_or_value(args.spec) if args.spec else None,
        "dataset": load_dataset_file(args.dataset) if args.dataset else [],
        "teacher_model": args.teacher_model,
        "student_model": args.student_model,
        "verifier_model": args.verifier_model,
        "api_mode": args.api_mode,
        "horizon": args.horizon,
        "budget": args.budget,
        "patience": args.patience,
        "verifier_enabled": not args.no_verifier,
    }
    options = {key: value for key, value in options.items() if value is not None}

    result = DDOOptimizer().optimize(**options)

    if args.output:
        Path(args.output).write_text(result.final_prompt, encoding="utf-8")
    if args.result_json:
        Path(args.result_json).write_text(json.dumps(result.to_dict(), indent=2), encoding="utf-8")

    print(result.final_prompt)
    return 0


def _read_text_or_value(value: str) -> str:
    path = Path(value)
    if path.exists() and path.is_file():
        return path.read_text(encoding="utf-8").strip()
    return value


if __name__ == "__main__":
    raise SystemExit(main())
