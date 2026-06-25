from __future__ import annotations

import json
import os
from typing import Any, Callable

from .client import OpenAIModelClient
from .dataset import dataset_preview, normalize_dataset, select_validation_examples
from .prompts import (
    DEFAULT_BEHAVIOR_SPEC,
    DEFAULT_INITIAL_PROMPT,
    DIAGNOSIS_SYSTEM,
    REPAIR_SYSTEM,
    TEACHER_POLICY_SYSTEM,
    VERIFIER_SYSTEM,
)
from .types import DDOConfig, DDOResult, ModelResponse
from .utils import clamp_number, compact_text, extract_json, prompt_diff, summarize_history, usage_totals


EventHandler = Callable[[dict[str, Any]], None]
Evaluator = Callable[..., Any]


class DDOOptimizer:
    def __init__(
        self,
        *,
        model_client: Any | None = None,
        evaluator: Evaluator | None = None,
        **defaults: Any,
    ) -> None:
        self.model_client = model_client
        self.evaluator = evaluator
        self.defaults = defaults

    def optimize(self, *, on_event: EventHandler | None = None, **options: Any) -> DDOResult:
        emit = on_event or (lambda event: None)
        config = build_config({**self.defaults, **options})
        dataset = normalize_dataset(options.get("dataset") or self.defaults.get("dataset") or [])
        client = self.model_client or OpenAIModelClient(
            api_key=config.api_key,
            base_url=config.base_url,
            organization=config.organization,
            project=config.project,
        )

        prompt = config.initial_prompt
        best_prompt = prompt
        best_score: float | None = None
        spent = 0
        stall = 0
        iteration = 0
        history: list[dict[str, Any]] = []
        usages: list[dict[str, Any] | None] = []
        score_cache: dict[str, dict[str, Any]] = {}

        emit({"type": "start", "dataset_size": len(dataset), "initial_prompt": prompt})

        while spent < config.budget and stall < config.patience:
            iteration += 1
            transcript: list[dict[str, Any]] = []
            emit({"type": "iteration", "iteration": iteration, "prompt": prompt, "spent": spent, "stall": stall})

            for turn in range(1, config.horizon + 1):
                if spent >= config.budget:
                    break
                policy, usage = self._diagnostic_question(client, config, prompt, dataset, transcript, history, turn)
                usages.append(usage)
                emit({"type": "teacher_question", "iteration": iteration, "turn": turn, "policy": policy})

                if policy.get("diagnosisComplete") and not policy.get("question"):
                    break

                question = str(policy.get("question") or "").strip()
                if not question:
                    break

                student, usage = self._ask_student(client, config, prompt, transcript, question)
                usages.append(usage)
                spent += 1
                entry = {
                    "turn": turn,
                    "axis": policy.get("axis", ""),
                    "teacher": question,
                    "student": student,
                    "whyThisQuestion": policy.get("whyThisQuestion", ""),
                    "expectedSignal": policy.get("expectedSignal", ""),
                }
                transcript.append(entry)
                emit({"type": "student_answer", "iteration": iteration, "turn": turn, "entry": entry, "spent": spent})
                if policy.get("diagnosisComplete"):
                    break

            if not transcript:
                stall += 1
                emit({"type": "stalled", "iteration": iteration, "stall": stall, "reason": "No diagnostic turn was produced."})
                continue

            weakness, usage = self._weakness_profile(client, config, prompt, transcript, history)
            usages.append(usage)
            emit({"type": "weakness_profile", "iteration": iteration, "weakness": weakness})

            if not weakness.get("material_weakness") or float(weakness.get("confidence") or 0) < config.confidence_threshold:
                stall += 1
                history.append(
                    {
                        "iteration": iteration,
                        "transcript": transcript,
                        "weakness": weakness,
                        "accepted": False,
                        "skipped": True,
                        "reason": "No confident material weakness.",
                    }
                )
                emit({"type": "stalled", "iteration": iteration, "stall": stall, "reason": "No confident material weakness."})
                continue

            repair, usage = self._repair_prompt(client, config, prompt, weakness, history)
            usages.append(usage)
            growth_ratio = max(0, len(repair["new_prompt"]) - len(prompt)) / max(1, len(prompt))
            emit({"type": "repair", "iteration": iteration, "repair": repair, "growth_ratio": growth_ratio})

            if config.minimality_mode == "reject" and growth_ratio > config.max_prompt_growth_ratio:
                stall += 1
                history.append(
                    {
                        "iteration": iteration,
                        "transcript": transcript,
                        "weakness": weakness,
                        "repair": repair,
                        "accepted": False,
                        "reason": "Rejected by minimality guard.",
                    }
                )
                emit({"type": "rejected", "iteration": iteration, "stall": stall, "reason": "Rejected by minimality guard."})
                continue

            verifier = self._maybe_verify(client, config, dataset, prompt, repair["new_prompt"], score_cache, usages)
            if verifier:
                emit({"type": "verifier", "iteration": iteration, "verifier": verifier})

            if verifier and verifier["after"]["average"] < verifier["before"]["average"] - config.regression_epsilon:
                stall += 1
                history.append(
                    {
                        "iteration": iteration,
                        "transcript": transcript,
                        "weakness": weakness,
                        "repair": repair,
                        "verifier": verifier,
                        "accepted": False,
                        "reason": "Rejected by verifier regression gate.",
                    }
                )
                emit({"type": "rejected", "iteration": iteration, "stall": stall, "reason": "Rejected by verifier regression gate."})
                continue

            prompt = repair["new_prompt"]
            stall = 0
            accepted = {
                "iteration": iteration,
                "transcript": transcript,
                "weakness": weakness,
                "repair": repair,
                "verifier": verifier,
                "accepted": True,
            }
            history.append(accepted)

            if verifier:
                if best_score is None or verifier["after"]["average"] > best_score:
                    best_score = verifier["after"]["average"]
                    best_prompt = prompt
            else:
                best_prompt = prompt

            emit({"type": "accepted", "iteration": iteration, "prompt": prompt, "best_score": best_score})

        result = DDOResult(
            final_prompt=best_prompt,
            current_prompt=prompt,
            best_score=best_score,
            spent=spent,
            iterations=iteration,
            stopped_reason=_stop_reason(spent, config.budget, stall, config.patience),
            history=history,
            usage=usage_totals(usages),
        )
        emit({"type": "done", "result": result.to_dict()})
        return result

    def _diagnostic_question(
        self,
        client: Any,
        config: DDOConfig,
        prompt: str,
        dataset: list[dict[str, Any]],
        transcript: list[dict[str, Any]],
        history: list[dict[str, Any]],
        turn: int,
    ) -> tuple[dict[str, Any], dict[str, Any] | None]:
        payload = {
            "behavior_spec": config.behavior_spec,
            "current_prompt": prompt,
            "turn": turn,
            "horizon": config.horizon,
            "dataset_preview": dataset_preview(dataset),
            "conversation_so_far": transcript,
            "accepted_history": summarize_history([entry for entry in history if entry.get("accepted")]),
        }
        response = _complete(
            client,
            config,
            model=config.teacher_model,
            messages=[
                {"role": "system", "content": TEACHER_POLICY_SYSTEM},
                {"role": "user", "content": json.dumps(payload, indent=2)},
            ],
            max_output_tokens=900,
            metadata={"ddo_phase": "diagnostic_policy"},
        )
        data = extract_json(response.text, {}) or {}
        return (
            {
                "diagnosisComplete": bool(data.get("diagnosisComplete")),
                "axis": str(data.get("axis", "")),
                "question": str(data.get("question", "")),
                "whyThisQuestion": str(data.get("whyThisQuestion", "")),
                "expectedSignal": str(data.get("expectedSignal", "")),
            },
            response.usage,
        )

    def _ask_student(
        self,
        client: Any,
        config: DDOConfig,
        prompt: str,
        transcript: list[dict[str, Any]],
        question: str,
    ) -> tuple[str, dict[str, Any] | None]:
        messages = [{"role": "system", "content": prompt}]
        for entry in transcript:
            messages.extend(
                [
                    {"role": "user", "content": entry["teacher"]},
                    {"role": "assistant", "content": entry["student"]},
                ]
            )
        messages.append({"role": "user", "content": question})
        response = _complete(
            client,
            config,
            model=config.student_model,
            messages=messages,
            max_output_tokens=config.max_output_tokens,
            metadata={"ddo_phase": "student_dialogue"},
        )
        return response.text, response.usage

    def _weakness_profile(
        self,
        client: Any,
        config: DDOConfig,
        prompt: str,
        transcript: list[dict[str, Any]],
        history: list[dict[str, Any]],
    ) -> tuple[dict[str, Any], dict[str, Any] | None]:
        payload = {
            "behavior_spec": config.behavior_spec,
            "current_prompt": prompt,
            "conversation": transcript,
            "accepted_history": summarize_history([entry for entry in history if entry.get("accepted")]),
        }
        response = _complete(
            client,
            config,
            model=config.teacher_model,
            messages=[
                {"role": "system", "content": DIAGNOSIS_SYSTEM},
                {"role": "user", "content": json.dumps(payload, indent=2)},
            ],
            temperature=0.1,
            max_output_tokens=1200,
            metadata={"ddo_phase": "weakness_profile"},
        )
        data = extract_json(response.text, {}) or {}
        return (
            {
                "axes_ok": data.get("axes_ok") if isinstance(data.get("axes_ok"), list) else [],
                "salient_deficiency": str(data.get("salient_deficiency", "")),
                "evidence_turns": data.get("evidence_turns") if isinstance(data.get("evidence_turns"), list) else [],
                "hypothesized_prompt_cause": str(data.get("hypothesized_prompt_cause", "")),
                "confidence": float(data.get("confidence") or 0),
                "material_weakness": bool(data.get("material_weakness")),
                "severity": str(data.get("severity", "none")),
                "recommended_repair_strategy": str(data.get("recommended_repair_strategy", "none")),
                "history_conflict": bool(data.get("history_conflict")),
                "no_material_weakness_reason": str(data.get("no_material_weakness_reason", "")),
            },
            response.usage,
        )

    def _repair_prompt(
        self,
        client: Any,
        config: DDOConfig,
        prompt: str,
        weakness: dict[str, Any],
        history: list[dict[str, Any]],
    ) -> tuple[dict[str, Any], dict[str, Any] | None]:
        payload = {
            "behavior_spec": config.behavior_spec,
            "current_prompt": prompt,
            "weakness_profile": weakness,
            "accepted_history": summarize_history([entry for entry in history if entry.get("accepted")]),
            "max_prompt_growth_ratio": config.max_prompt_growth_ratio,
            "minimality_mode": config.minimality_mode,
        }
        response = _complete(
            client,
            config,
            model=config.teacher_model,
            messages=[
                {"role": "system", "content": REPAIR_SYSTEM},
                {"role": "user", "content": json.dumps(payload, indent=2)},
            ],
            temperature=0.15,
            max_output_tokens=max(1400, config.max_output_tokens),
            metadata={"ddo_phase": "prompt_repair"},
        )
        data = extract_json(response.text, {}) or {}
        new_prompt = str(data.get("new_prompt") or prompt).strip()
        return (
            {
                "new_prompt": new_prompt,
                "unified_diff": str(data.get("unified_diff") or prompt_diff(prompt, new_prompt)),
                "edit_summary": str(data.get("edit_summary") or "Applied a targeted DDO repair."),
                "changed_sections": data.get("changed_sections") if isinstance(data.get("changed_sections"), list) else [],
                "minimality_score": float(data.get("minimality_score") or 0),
                "estimated_risk": str(data.get("estimated_risk") or "medium"),
            },
            response.usage,
        )

    def _maybe_verify(
        self,
        client: Any,
        config: DDOConfig,
        dataset: list[dict[str, Any]],
        prompt: str,
        candidate_prompt: str,
        score_cache: dict[str, dict[str, Any]],
        usages: list[dict[str, Any] | None],
    ) -> dict[str, Any] | None:
        if not config.verifier_enabled or not dataset:
            return None

        if self.evaluator:
            before = _normalize_evaluator_summary(
                _call_evaluator(self.evaluator, prompt, dataset, config, phase="before")
            )
            after = _normalize_evaluator_summary(
                _call_evaluator(self.evaluator, candidate_prompt, dataset, config, phase="after")
            )
            return {
                "source": "external",
                "before": before,
                "after": after,
                "delta": after["average"] - before["average"],
                "epsilon": config.regression_epsilon,
            }

        before = self._score_prompt(client, config, dataset, prompt, score_cache, usages)
        after = self._score_prompt(client, config, dataset, candidate_prompt, score_cache, usages)
        return {
            "source": "llm_verifier",
            "before": before,
            "after": after,
            "delta": after["average"] - before["average"],
            "epsilon": config.regression_epsilon,
        }

    def _score_prompt(
        self,
        client: Any,
        config: DDOConfig,
        dataset: list[dict[str, Any]],
        prompt: str,
        score_cache: dict[str, dict[str, Any]],
        usages: list[dict[str, Any] | None],
    ) -> dict[str, Any]:
        if prompt in score_cache:
            return score_cache[prompt]

        results = []
        for example in select_validation_examples(dataset, config.validation_limit):
            student = _complete(
                client,
                config,
                model=config.student_model,
                messages=[
                    {"role": "system", "content": prompt},
                    {"role": "user", "content": example["input"]},
                ],
                max_output_tokens=config.max_output_tokens,
                metadata={"ddo_phase": "verification_student"},
            )
            usages.append(student.usage)
            verifier_input = {
                "behavior_spec": config.behavior_spec,
                "example": example,
                "student_answer": compact_text(student.text, 4000),
            }
            judged = _complete(
                client,
                config,
                model=config.verifier_model,
                messages=[
                    {"role": "system", "content": VERIFIER_SYSTEM},
                    {"role": "user", "content": json.dumps(verifier_input, indent=2)},
                ],
                temperature=0,
                max_output_tokens=700,
                metadata={"ddo_phase": "verification_judge"},
            )
            usages.append(judged.usage)
            parsed = extract_json(judged.text, {}) or {}
            score = clamp_number(parsed.get("score"), 0, 1, 0)
            results.append(
                {
                    "id": example["id"],
                    "score": score,
                    "pass": bool(parsed.get("pass")),
                    "rationale": str(parsed.get("rationale", "")),
                    "answer": student.text,
                }
            )

        average = sum(result["score"] for result in results) / len(results) if results else 0
        summary = {
            "average": average,
            "count": len(results),
            "passRate": sum(1 for result in results if result["pass"]) / len(results) if results else 0,
            "results": results,
        }
        score_cache[prompt] = summary
        return summary


def optimize_prompt(**options: Any) -> DDOResult:
    return DDOOptimizer().optimize(**options)


def build_config(values: dict[str, Any]) -> DDOConfig:
    env = os.environ
    return DDOConfig(
        api_key=values.get("api_key") or values.get("apiKey") or None,
        base_url=values.get("base_url") or values.get("baseURL") or env.get("OPENAI_BASE_URL"),
        organization=values.get("organization") or env.get("OPENAI_ORG_ID"),
        project=values.get("project") or env.get("OPENAI_PROJECT_ID"),
        api_mode=values.get("api_mode") or values.get("apiMode") or env.get("DDO_API_MODE", "responses"),
        teacher_model=values.get("teacher_model") or values.get("teacherModel") or env.get("DDO_TEACHER_MODEL", "gpt-5.5"),
        student_model=values.get("student_model") or values.get("studentModel") or env.get("DDO_STUDENT_MODEL", "gpt-5.5"),
        verifier_model=values.get("verifier_model") or values.get("verifierModel") or env.get("DDO_VERIFIER_MODEL", "gpt-5.5"),
        behavior_spec=values.get("behavior_spec") or values.get("behaviorSpec") or DEFAULT_BEHAVIOR_SPEC,
        initial_prompt=values.get("initial_prompt") or values.get("initialPrompt") or DEFAULT_INITIAL_PROMPT,
        horizon=int(clamp_number(values.get("horizon"), 1, 20, int(env.get("DDO_HORIZON", 5)))),
        budget=int(clamp_number(values.get("budget"), 1, 200, int(env.get("DDO_BUDGET", 20)))),
        patience=int(clamp_number(values.get("patience"), 1, 20, int(env.get("DDO_PATIENCE", 2)))),
        confidence_threshold=clamp_number(
            values.get("confidence_threshold") or values.get("confidenceThreshold"),
            0,
            1,
            float(env.get("DDO_CONFIDENCE_THRESHOLD", 0.62)),
        ),
        regression_epsilon=clamp_number(
            values.get("regression_epsilon") or values.get("regressionEpsilon"),
            0,
            1,
            float(env.get("DDO_REGRESSION_EPSILON", 0.03)),
        ),
        validation_limit=int(
            clamp_number(
                values.get("validation_limit") or values.get("validationLimit"),
                1,
                50,
                int(env.get("DDO_VALIDATION_LIMIT", 6)),
            )
        ),
        verifier_enabled=bool(values.get("verifier_enabled", values.get("verifierEnabled", True))),
        minimality_mode=values.get("minimality_mode") or values.get("minimalityMode") or "warn",
        max_prompt_growth_ratio=clamp_number(
            values.get("max_prompt_growth_ratio") or values.get("maxPromptGrowthRatio"), 0, 5, 0.35
        ),
        temperature=clamp_number(values.get("temperature"), 0, 2, 0.2),
        max_output_tokens=int(
            clamp_number(values.get("max_output_tokens") or values.get("maxOutputTokens"), 256, 12000, 1800)
        ),
    )


def _complete(
    client: Any,
    config: DDOConfig,
    *,
    model: str,
    messages: list[dict[str, str]],
    temperature: float | None = None,
    max_output_tokens: int,
    metadata: dict[str, str],
) -> ModelResponse:
    return client.complete(
        model=model,
        messages=messages,
        api_mode=config.api_mode,
        temperature=config.temperature if temperature is None else temperature,
        max_output_tokens=max_output_tokens,
        metadata=metadata,
    )


def _call_evaluator(
    evaluator: Evaluator,
    prompt: str,
    dataset: list[dict[str, Any]],
    config: DDOConfig,
    *,
    phase: str,
) -> Any:
    try:
        return evaluator(prompt, dataset=dataset, behavior_spec=config.behavior_spec, phase=phase, config=config)
    except TypeError:
        return evaluator(prompt, dataset)


def _normalize_evaluator_summary(value: Any) -> dict[str, Any]:
    if isinstance(value, (int, float)):
        score = clamp_number(value, 0, 1, 0)
        return {"average": score, "count": 1, "passRate": 1 if score >= 0.5 else 0, "results": []}

    score = clamp_number(value.get("average", value.get("score", 0)) if isinstance(value, dict) else 0, 0, 1, 0)
    results = value.get("results", []) if isinstance(value, dict) else []
    return {
        "average": score,
        "count": int(value.get("count", len(results))) if isinstance(value, dict) else len(results),
        "passRate": clamp_number(value.get("passRate") if isinstance(value, dict) else None, 0, 1, 1 if score >= 0.5 else 0),
        "results": results,
    }


def _stop_reason(spent: int, budget: int, stall: int, patience: int) -> str:
    if spent >= budget:
        return "budget_exhausted"
    if stall >= patience:
        return "patience_exhausted"
    return "completed"
