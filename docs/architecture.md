# Architecture

The implementation follows the paper's `converse -> diagnose -> repair -> verify -> reset` loop.

## Components

- `src/server.js`: HTTP server, static UI, config endpoint, NDJSON run streaming.
- `src/index.js`: public JavaScript library entrypoint exposing `DDOOptimizer`, `optimizePrompt`, dataset helpers, and evaluator normalization.
- `src/ddoEngine.js`: outer DDO loop, teacher policy calls, student calls, weakness profiles, prompt repair, verifier gate, and memory/history.
- `src/openaiAdapter.js`: OpenAI SDK integration for Responses API and Chat Completions fallback.
- `src/prompts.js`: teacher, diagnostician, repair, and verifier system prompts.
- `src/dataset.js`: dataset normalization and validation subset selection.
- `ddo_optimizer/`: Python package with a matching `DDOOptimizer`, CLI, OpenAI client, dataset utilities, and optional DeepEval adapter.
- `public/`: browser UI for configuration, dataset management, live run logs, and prompt export.

## Runtime Flow

1. The UI posts run configuration and dataset examples to `/api/optimize`.
2. The server starts `runDDO(...)` and streams newline-delimited JSON events back to the UI.
3. The teacher model chooses adaptive diagnostic questions.
4. The student model answers under the current candidate system prompt.
5. The teacher compiles a JSON weakness profile.
6. The repair operator proposes a minimal prompt edit.
7. The optional verifier scores before/after prompts on a small validation subset.
8. Accepted edits update the prompt and history; rejected edits increase stall count.

## Library Extension Points

Both the JavaScript and Python libraries support external evaluators. An evaluator receives a candidate prompt and dataset, then returns a scalar score or a summary with `average`, `count`, `passRate`, and `results`. This lets teams plug in DeepEval, Ragas, LangSmith, custom pytest suites, internal grading services, or production replay harnesses without replacing the DDO diagnostic loop.

The Python package also supports custom model clients. A model client only needs a `complete(...)` method returning a `ModelResponse`-compatible object with `text` and optional `usage`.

## Safety Boundaries

- The app optimizes prompts only; it does not fine-tune models.
- UI-provided API keys are held in memory for the current request.
- The verifier gate is a regression guard, not a safety certification.
- DDO diagnostic probes should be paired with safety evaluation for production prompts.
