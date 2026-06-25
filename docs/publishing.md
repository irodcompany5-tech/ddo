# Publishing

This repository can be published as both an npm package and a PyPI package.

## Preflight

```bash
npm run doctor
npm run check
npm test
```

Confirm no secrets are present:

```bash
rg "ghp_|sk-[A-Za-z0-9]|pypi-" --glob "!node_modules/**"
```

## npm

Dry run:

```bash
npm pack --dry-run
```

Publish:

```bash
npm login
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

Consumers can then use:

```bash
pip install ddo-prompt-optimizer
```

Prefer PyPI trusted publishing from GitHub Actions for long-term maintenance. The included CI template is stored in `docs/github-actions-ci.yml`; activating workflows requires a GitHub token with `workflow` scope.
