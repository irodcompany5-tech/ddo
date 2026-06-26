#!/usr/bin/env python3
from __future__ import annotations

import argparse
import importlib.util
import json
import sys
import urllib.request
from pathlib import Path
from typing import Any


FILES = [
    "evaluation_lib.py",
    "instructions.py",
    "instructions_registry.py",
    "instructions_util.py",
]
BASE_URL = "https://raw.githubusercontent.com/google-research/google-research/master/instruction_following_eval"


def main() -> int:
    parser = argparse.ArgumentParser(description="Evaluate IFEval responses with the official checker implementation.")
    parser.add_argument("--input", required=True, help="IFEval input JSONL in official format.")
    parser.add_argument("--responses", required=True, help="JSONL with prompt and response fields.")
    parser.add_argument("--output-dir", required=True)
    parser.add_argument("--cache-dir", default="run-results/ifeval/evaluator")
    args = parser.parse_args()

    package_dir = ensure_official_evaluator(Path(args.cache_dir))
    ensure_nltk_data(Path(args.cache_dir) / "nltk_data")
    sys.path.insert(0, str(package_dir.parent))
    evaluation_lib = load_module(package_dir / "evaluation_lib.py", "instruction_following_eval.evaluation_lib")

    inputs = evaluation_lib.read_prompt_list(args.input)
    prompt_to_response = evaluation_lib.read_prompt_to_response_dict(args.responses)
    output_dir = Path(args.output_dir)
    output_dir.mkdir(parents=True, exist_ok=True)

    summaries = {}
    for name, func in [
        ("strict", evaluation_lib.test_instruction_following_strict),
        ("loose", evaluation_lib.test_instruction_following_loose),
    ]:
        outputs = [func(item, prompt_to_response) for item in inputs]
        write_outputs(output_dir / f"eval_results_{name}.jsonl", outputs)
        summaries[name] = summarize(outputs)

    metrics = {
        "input": args.input,
        "responses": args.responses,
        "strict": summaries["strict"],
        "loose": summaries["loose"],
    }
    (output_dir / "metrics.json").write_text(json.dumps(metrics, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(metrics, indent=2))
    return 0


def ensure_official_evaluator(cache_dir: Path) -> Path:
    package_dir = cache_dir / "instruction_following_eval"
    package_dir.mkdir(parents=True, exist_ok=True)
    (package_dir / "__init__.py").write_text("", encoding="utf-8")
    for filename in FILES:
        destination = package_dir / filename
        if not destination.exists():
            with urllib.request.urlopen(f"{BASE_URL}/{filename}", timeout=60) as response:
                destination.write_bytes(response.read())
    return package_dir


def ensure_nltk_data(nltk_dir: Path) -> None:
    nltk_dir.mkdir(parents=True, exist_ok=True)
    import nltk

    nltk.data.path.insert(0, str(nltk_dir))
    for package in ["punkt", "punkt_tab"]:
        try:
            nltk.data.find(f"tokenizers/{package}")
        except LookupError:
            nltk.download(package, download_dir=str(nltk_dir), quiet=True)


def load_module(path: Path, module_name: str):
    spec = importlib.util.spec_from_file_location(module_name, path)
    if spec is None or spec.loader is None:
        raise RuntimeError(f"Cannot import {path}")
    module = importlib.util.module_from_spec(spec)
    sys.modules[module_name] = module
    spec.loader.exec_module(module)
    return module


def write_outputs(path: Path, outputs: list[Any]) -> None:
    path.write_text(
        "\n".join(
            json.dumps(
                {
                    "instruction_id_list": item.instruction_id_list,
                    "prompt": item.prompt,
                    "response": item.response,
                    "follow_all_instructions": item.follow_all_instructions,
                    "follow_instruction_list": item.follow_instruction_list,
                },
                ensure_ascii=False,
            )
            for item in outputs
        )
        + "\n",
        encoding="utf-8",
    )


def summarize(outputs: list[Any]) -> dict[str, Any]:
    prompt_total = len(outputs)
    prompt_correct = sum(1 for item in outputs if item.follow_all_instructions)
    instruction_total = sum(len(item.follow_instruction_list) for item in outputs)
    instruction_correct = sum(sum(item.follow_instruction_list) for item in outputs)
    return {
        "prompt_level_accuracy": prompt_correct / prompt_total if prompt_total else 0,
        "instruction_level_accuracy": instruction_correct / instruction_total if instruction_total else 0,
        "n_prompts": prompt_total,
        "n_instructions": instruction_total,
        "prompt_correct": prompt_correct,
        "instruction_correct": instruction_correct,
    }


if __name__ == "__main__":
    raise SystemExit(main())
