Optimize the base system prompt for IFEval-style instruction following.

The optimized prompt should help the base model:

- obey all explicit user constraints
- preserve exact output formats
- satisfy keyword, count, language, section, paragraph, bullet, casing, JSON, and start/end constraints
- avoid unsolicited explanations or wrapper text
- avoid adding markdown unless requested
- resolve multiple simultaneous instructions without dropping any
- produce a final answer that can pass deterministic IFEval strict and loose checkers

Keep edits minimal. Prefer compact, general rules over benchmark-specific memorization. Do not include dataset examples, answer templates for individual examples, or references to the held-out test split.
