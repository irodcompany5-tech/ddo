from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any


@dataclass(slots=True)
class ModelResponse:
    text: str
    usage: dict[str, Any] | None = None
    raw: Any = None
    api_mode: str = "responses"
    request_id: str | None = None


@dataclass(slots=True)
class DDOConfig:
    api_key: str | None = None
    base_url: str | None = None
    organization: str | None = None
    project: str | None = None
    api_mode: str = "responses"
    teacher_model: str = "gpt-5.5"
    student_model: str = "gpt-5.5"
    verifier_model: str = "gpt-5.5"
    behavior_spec: str = ""
    initial_prompt: str = ""
    horizon: int = 5
    budget: int = 20
    patience: int = 2
    confidence_threshold: float = 0.62
    regression_epsilon: float = 0.03
    validation_limit: int = 6
    verifier_enabled: bool = True
    minimality_mode: str = "warn"
    max_prompt_growth_ratio: float = 0.35
    temperature: float = 0.2
    max_output_tokens: int = 1800


@dataclass(slots=True)
class DDOResult:
    final_prompt: str
    current_prompt: str
    best_score: float | None
    spent: int
    iterations: int
    stopped_reason: str
    history: list[dict[str, Any]] = field(default_factory=list)
    usage: dict[str, int] = field(default_factory=dict)

    def to_dict(self) -> dict[str, Any]:
        return {
            "final_prompt": self.final_prompt,
            "current_prompt": self.current_prompt,
            "best_score": self.best_score,
            "spent": self.spent,
            "iterations": self.iterations,
            "stopped_reason": self.stopped_reason,
            "history": self.history,
            "usage": self.usage,
        }
