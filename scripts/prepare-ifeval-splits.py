#!/usr/bin/env python3
from __future__ import annotations

import argparse
import hashlib
import json
import random
import urllib.request
from pathlib import Path


SOURCE_URL = "https://raw.githubusercontent.com/google-research/google-research/master/instruction_following_eval/data/input_data.jsonl"
DEFAULT_SEED = 20260626


def main() -> int:
    parser = argparse.ArgumentParser(description="Create deterministic IFEval splits for DDO benchmarking.")
    parser.add_argument("--output-dir", default="benchmarks/ifeval")
    parser.add_argument("--seed", type=int, default=DEFAULT_SEED)
    parser.add_argument("--train-size", type=int, default=150)
    parser.add_argument("--validation-size", type=int, default=50)
    parser.add_argument("--test-size", type=int, default=50)
    parser.add_argument("--source-url", default=SOURCE_URL)
    args = parser.parse_args()

    output_dir = Path(args.output_dir)
    raw_dir = output_dir / "raw"
    raw_dir.mkdir(parents=True, exist_ok=True)
    source_path = raw_dir / "input_data.jsonl"

    if not source_path.exists():
      download(args.source_url, source_path)

    rows = [json.loads(line) for line in source_path.read_text(encoding="utf-8").splitlines() if line.strip()]
    required = args.train_size + args.validation_size + args.test_size
    if len(rows) < required:
        raise SystemExit(f"Need {required} rows but source only has {len(rows)}")

    rng = random.Random(args.seed)
    shuffled = list(rows)
    rng.shuffle(shuffled)

    splits = {
        "train": shuffled[: args.train_size],
        "validation": shuffled[args.train_size : args.train_size + args.validation_size],
        "test": shuffled[args.train_size + args.validation_size : required],
    }

    output_dir.mkdir(parents=True, exist_ok=True)
    for split, split_rows in splits.items():
        write_jsonl(output_dir / f"{split}.jsonl", split_rows)
        write_jsonl(output_dir / f"{split}-ddo.jsonl", [to_ddo_example(row, split) for row in split_rows])

    metadata = {
        "source_url": args.source_url,
        "source_sha256": sha256(source_path),
        "seed": args.seed,
        "sizes": {name: len(value) for name, value in splits.items()},
        "total_source_rows": len(rows),
        "license_note": "Google Research datasets are distributed under CC BY 4.0 according to the Google Research repository.",
        "split_files": {
            "train": "train.jsonl",
            "validation": "validation.jsonl",
            "test": "test.jsonl",
            "train_ddo": "train-ddo.jsonl",
            "validation_ddo": "validation-ddo.jsonl",
            "test_ddo": "test-ddo.jsonl",
        },
    }
    (output_dir / "split-metadata.json").write_text(json.dumps(metadata, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(metadata, indent=2))
    return 0


def download(url: str, destination: Path) -> None:
    with urllib.request.urlopen(url, timeout=60) as response:
        destination.write_bytes(response.read())


def write_jsonl(path: Path, rows: list[dict]) -> None:
    path.write_text("\n".join(json.dumps(row, ensure_ascii=False) for row in rows) + "\n", encoding="utf-8")


def to_ddo_example(row: dict, split: str) -> dict:
    instruction_ids = row.get("instruction_id_list", [])
    return {
        "id": f"ifeval-{split}-{row['key']}",
        "input": row["prompt"],
        "expected": "Follow every verifiable instruction in instruction_id_list.",
        "notes": json.dumps(
            {
                "ifeval_key": row["key"],
                "instruction_id_list": instruction_ids,
                "kwargs": row.get("kwargs", []),
            },
            ensure_ascii=False,
        ),
        "tags": ["ifeval", split, *[item.split(":")[0] for item in instruction_ids]],
    }


def sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as file:
        for chunk in iter(lambda: file.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


if __name__ == "__main__":
    raise SystemExit(main())
