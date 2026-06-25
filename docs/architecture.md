# Architecture

The implementation follows the paper's `converse -> diagnose -> repair -> verify -> reset` loop.

## Components

- `src/server.js`: HTTP server, static UI, config endpoint, NDJSON run streaming.
- `src/ddoEngine.js`: outer DDO loop, teacher policy calls, student calls, weakness profiles, prompt repair, verifier gate, and memory/history.
- `src/openaiAdapter.js`: OpenAI SDK integration for Responses API and Chat Completions fallback.
- `src/prompts.js`: teacher, diagnostician, repair, and verifier system prompts.
- `src/dataset.js`: dataset normalization and validation subset selection.
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

## Safety Boundaries

- The app optimizes prompts only; it does not fine-tune models.
- UI-provided API keys are held in memory for the current request.
- The verifier gate is a regression guard, not a safety certification.
- DDO diagnostic probes should be paired with safety evaluation for production prompts.
