# Jupyter Notebook Guide

Use this guide when you want a clickable, step-by-step walkthrough with visible outputs.

## 1. Open The Notebook On GitHub

Open:

[notebooks/ddo_quickstart.ipynb](../notebooks/ddo_quickstart.ipynb)

GitHub renders the saved outputs, so readers can inspect the full DDO flow before running anything locally.

## 2. Run It From This Repository

```bash
git clone https://github.com/irodcompany5-tech/ddo.git
cd ddo
python -m venv .venv
source .venv/bin/activate
python -m pip install --upgrade pip
python -m pip install -e ".[notebook]"
python -m notebook notebooks/ddo_quickstart.ipynb
```

## 3. Run It From Another Project

Download the notebook, then open it with the package from PyPI:

```bash
python -m venv .venv
source .venv/bin/activate
python -m pip install --upgrade pip
python -m pip install ddo-prompt-optimizer notebook ipykernel
curl -L -o ddo_quickstart.ipynb https://raw.githubusercontent.com/irodcompany5-tech/ddo/main/notebooks/ddo_quickstart.ipynb
python -m notebook ddo_quickstart.ipynb
```

## 4. Run It In Codespaces

1. Open `https://codespaces.new/irodcompany5-tech/ddo`.
2. Wait for dependencies to install.
3. Open `notebooks/ddo_quickstart.ipynb`.
4. Select the Python environment from the workspace.
5. Run cells from top to bottom.

The first workflow uses a fake model client and a simple evaluator, so it runs without an API key.

## 5. Run With OpenAI Models

Set your key before opening Jupyter:

```bash
export OPENAI_API_KEY="<your-openai-api-key>"
export DDO_TEACHER_MODEL="google/gemma-4-31b-it"
export DDO_STUDENT_MODEL="google/gemma-4-31b-it"
export DDO_VERIFIER_MODEL="google/gemma-4-31b-it"
```

Then uncomment the live OpenAI cell in the notebook.

Recommended first live settings:

```text
Horizon: 2
Budget: 3
Validation limit: 2
Verifier: on
```

These settings keep the run small while still showing the diagnostic loop.

## 6. Run With DeepEval

Install the optional DeepEval dependency:

```bash
python -m pip install "ddo-prompt-optimizer[deepeval]" notebook ipykernel
```

Then use the DeepEval example cell in the notebook as a template:

```python
from ddo_optimizer.adapters.deepeval import optimize_with_deepeval
```

Provide your own `model_callback`, goldens, and metrics. DDO will use DeepEval as the verifier gate.

## 7. What The Notebook Shows

- Create a small dataset.
- Run DDO offline with a fake diagnostic model.
- Watch the event trace.
- Inspect the optimized prompt.
- Inspect the accepted repair history.
- Switch to a real OpenAI run.
- Connect the same flow to DeepEval.

## 8. Common Issues

If `ddo_optimizer` cannot be imported, install the package in the same kernel:

```python
%pip install ddo-prompt-optimizer
```

If Jupyter uses the wrong Python environment:

```bash
python -m ipykernel install --user --name ddo --display-name "Python (DDO)"
```

Then select `Python (DDO)` as the notebook kernel.
