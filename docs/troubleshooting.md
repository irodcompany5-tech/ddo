# Troubleshooting

## Missing API Key

Error:

```text
Missing OpenAI API key
```

Fix:

```bash
export OPENAI_API_KEY="<your-openai-api-key>"
```

or add it to `.env` for the web UI.

## Package Import Fails In Python

Check install:

```bash
pip show ddo-prompt-optimizer
python -c "import ddo_optimizer; print(ddo_optimizer.__version__)"
```

If needed:

```bash
pip install --upgrade ddo-prompt-optimizer
```

## npm Import Fails

The package is ESM. Use:

```js
import { DDOOptimizer } from "ddo-prompt-optimizer";
```

For CommonJS projects:

```js
const { DDOOptimizer } = await import("ddo-prompt-optimizer");
```

## Port Is Already In Use

```bash
DDO_PORT=5175 npm run dev
```

Open:

```text
http://127.0.0.1:5175
```

## DDO Is Too Expensive

Lower the run size:

```text
Horizon: 2
Budget: 3
Validation: 2
```

Then increase after you confirm the flow works.

## Prompt Edits Are Too Large

Use stricter minimality:

```text
Minimality: Reject oversized edits
```

or lower the budget.

## Verifier Rejects Everything

Try:

1. Check dataset examples are valid.
2. Add clearer `expected` values.
3. Lower strictness in your external evaluator.
4. Increase `Regression epsilon` slightly, for example from `0.03` to `0.05`.

## PyPI Token Was Pasted Somewhere

Revoke it immediately:

```text
https://pypi.org/manage/account/token/
```

Then create a new token for future releases.

## npm Token Was Pasted Somewhere

Revoke it immediately:

```text
https://www.npmjs.com/settings/<your-user>/tokens
```

Then create a new token for future releases.
