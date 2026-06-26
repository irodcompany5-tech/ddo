#!/usr/bin/env python3
from __future__ import annotations

import argparse
import json
import os
import time
from pathlib import Path
from typing import Any

from openai import OpenAI


OPENROUTER_BASE_URL = "https://openrouter.ai/api/v1"
DEFAULT_REFERER = "https://github.com/irodcompany5-tech/ddo"
DEFAULT_TITLE = "DDO Prompt Optimizer"


def main() -> int:
    parser = argparse.ArgumentParser(description="Generate IFEval responses through OpenRouter.")
    parser.add_argument("--input", required=True, help="IFEval split JSONL in official format.")
    parser.add_argument("--output", required=True, help="Response JSONL with prompt and response fields.")
    parser.add_argument("--system-prompt-file", required=True)
    parser.add_argument("--model", default="google/gemma-3n-e4b-it")
    parser.add_argument("--api-key-env", default="OPENROUTER_API_KEY")
    parser.add_argument("--base-url", default=OPENROUTER_BASE_URL)
    parser.add_argument("--temperature", type=float, default=0.0)
    parser.add_argument("--max-tokens", type=int, default=1400)
    parser.add_argument("--limit", type=int)
    parser.add_argument("--sleep", type=float, default=0.2)
    parser.add_argument("--resume", action="store_true")
    args = parser.parse_args()

    api_key = os.getenv(args.api_key_env)
    if not api_key:
        raise SystemExit(f"Missing API key. Set {args.api_key_env}.")

    system_prompt = Path(args.system_prompt_file).read_text(encoding="utf-8").strip()
    examples = read_jsonl(Path(args.input))
    if args.limit:
        examples = examples[: args.limit]

    output_path = Path(args.output)
    output_path.parent.mkdir(parents=True, exist_ok=True)
    completed = read_completed(output_path) if args.resume else set()

    client = OpenAI(
        api_key=api_key,
        base_url=args.base_url,
        default_headers={
            "HTTP-Referer": os.getenv("OPENROUTER_HTTP_REFERER", DEFAULT_REFERER),
            "X-Title": os.getenv("OPENROUTER_APP_TITLE", DEFAULT_TITLE),
        },
    )

    with output_path.open("a" if args.resume else "w", encoding="utf-8") as file:
        for index, example in enumerate(examples, start=1):
            if example["prompt"] in completed:
                continue
            started = time.time()
            response = client.chat.completions.create(
                model=args.model,
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": example["prompt"]},
                ],
                temperature=args.temperature,
                max_tokens=args.max_tokens,
            )
            text = response.choices[0].message.content or ""
            usage = object_to_dict(getattr(response, "usage", None))
            record = {
                "key": example.get("key"),
                "prompt": example["prompt"],
                "response": text,
                "model": args.model,
                "latency_seconds": round(time.time() - started, 3),
                "usage": usage,
            }
            file.write(json.dumps(record, ensure_ascii=False) + "\n")
            file.flush()
            print(json.dumps({"index": index, "key": example.get("key"), "latency_seconds": record["latency_seconds"], "usage": usage}))
            if args.sleep:
                time.sleep(args.sleep)

    return 0


def read_jsonl(path: Path) -> list[dict[str, Any]]:
    return [json.loads(line) for line in path.read_text(encoding="utf-8").splitlines() if line.strip()]


def read_completed(path: Path) -> set[str]:
    if not path.exists():
        return set()
    return {json.loads(line)["prompt"] for line in path.read_text(encoding="utf-8").splitlines() if line.strip()}


def object_to_dict(value: Any) -> dict[str, Any] | None:
    if value is None:
        return None
    if isinstance(value, dict):
        return value
    if hasattr(value, "model_dump"):
        return value.model_dump()
    return {key: getattr(value, key) for key in dir(value) if not key.startswith("_")}


if __name__ == "__main__":
    raise SystemExit(main())
