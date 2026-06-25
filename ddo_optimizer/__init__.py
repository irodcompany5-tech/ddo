"""Diagnostic Dialogue Optimization for prompt repair."""

from .core import DDOOptimizer, optimize_prompt
from .dataset import load_dataset_file, normalize_dataset
from .prompts import DEFAULT_BEHAVIOR_SPEC, DEFAULT_INITIAL_PROMPT
from .types import DDOConfig, DDOResult, ModelResponse

__all__ = [
    "DDOConfig",
    "DDOOptimizer",
    "DDOResult",
    "DEFAULT_BEHAVIOR_SPEC",
    "DEFAULT_INITIAL_PROMPT",
    "ModelResponse",
    "load_dataset_file",
    "normalize_dataset",
    "optimize_prompt",
]

__version__ = "0.1.0"
