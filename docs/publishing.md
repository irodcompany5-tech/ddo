# Publishing

This repository can be published as both an npm package and a PyPI package.

## Preflight

```bash
npm run doctor
npm run docs:check
npm run check
npm test
```

Confirm no secrets are present:

```bash
rg "ghp_|sk-[A-Za-z0-9]|pypi-" --glob "!node_modules/**"
```

Also confirm local auth files are ignored:

```bash
git status --short
```

Do not commit `.env`, `.npmrc`, build artifacts, token logs, or private datasets.

## npm

Dry run:

```bash
npm pack --dry-run
```

Authenticate:

```bash
npm login
```

or use a token in CI:

```bash
export NODE_AUTH_TOKEN="<npm-token>"
```

Publish:

```bash
npm publish
```

Consumers can then use:

```bash
npm install ddo-prompt-optimizer
```

## PyPI

Install build tools:

```bash
python3 -m pip install --upgrade build twine
```

Build:

```bash
python3 -m build
```

Check:

```bash
python3 -m twine check dist/*
```

Publish to TestPyPI first:

```bash
python3 -m twine upload --repository testpypi dist/*
```

Publish to PyPI:

```bash
python3 -m twine upload dist/*
```

For token-based uploads:

```bash
export TWINE_USERNAME="__token__"
export TWINE_PASSWORD="<pypi-token>"
python3 -m twine upload dist/*
```

Consumers can then use:

```bash
pip install ddo-prompt-optimizer
```

Prefer PyPI trusted publishing from GitHub Actions for long-term maintenance. The included CI template is stored in `docs/github-actions-ci.yml`; activating workflows requires a GitHub token with `workflow` scope.

## Version Checklist

Before publishing a new release:

1. Update `package.json`.
2. Update `pyproject.toml`.
3. Rebuild `package-lock.json`.
4. Run `npm pack --dry-run`.
5. Run `python3 -m build`.
6. Run `python3 -m twine check dist/*`.
7. Tag the release after both registries succeed.
