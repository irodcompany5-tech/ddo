# Contributing

## Local Setup

```bash
npm install
cp .env.example .env
npm run doctor
npm run dev
```

Open `http://127.0.0.1:5174`.

## Development Checks

```bash
npm run docs:check
npm run check
npm test
```

## Commit Style

Use small commits that describe one logical change:

- `docs: improve setup guide`
- `feat: add verifier gate`
- `test: cover dataset parsing`
- `chore: add codespaces config`

## Pull Request Checklist

- No secrets or private datasets committed.
- Documentation links pass with `npm run docs:check`.
- `npm run check` passes.
- `npm test` passes.
- README or docs updated when behavior changes.
- UI still works on narrow and desktop widths.
