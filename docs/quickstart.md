# Quickstart

Use this when you want the fastest path to a running DDO app.

## 1. Clone And Install

```bash
git clone https://github.com/irodcompany5-tech/ddo.git
cd ddo
npm install
```

## 2. Configure API Key

```bash
cp .env.example .env
```

Edit `.env`:

```bash
OPENAI_API_KEY=<your-openai-api-key>
```

You can also leave `.env` empty and paste a key into the UI for a single run.

## 3. Check Setup

```bash
npm run doctor
npm run check
npm test
```

## 4. Start The Web UI

```bash
npm run dev
```

Open:

```text
http://127.0.0.1:5174
```

## 5. Run A Demo

1. Click `Demo` in the dataset tab.
2. Review the default behavior specification.
3. Review the initial student prompt.
4. Set a small budget for the first run, such as `Budget = 4`.
5. Click `Start DDO`.
6. Open the `Results` tab and copy or export the optimized prompt.

## 6. Common First-Run Settings

```text
Horizon: 3
Budget: 6
Patience: 2
Tau: 0.62
Epsilon: 0.03
Validation: 3
Verifier gate: on
```

These settings keep the first run cheap and easy to inspect.
