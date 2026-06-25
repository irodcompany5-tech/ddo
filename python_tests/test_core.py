import json
import unittest

from ddo_optimizer import DDOOptimizer
from ddo_optimizer.types import ModelResponse


class FakeModelClient:
    def complete(self, *, metadata=None, **kwargs):
        phase = (metadata or {}).get("ddo_phase")
        if phase == "diagnostic_policy":
            return ModelResponse(
                text=json.dumps(
                    {
                        "diagnosisComplete": True,
                        "axis": "Format",
                        "question": "Return JSON for 2+2.",
                        "whyThisQuestion": "Checks JSON format.",
                        "expectedSignal": "Invalid JSON reveals weakness.",
                    }
                )
            )
        if phase == "student_dialogue":
            return ModelResponse(text="The answer is 4.")
        if phase == "weakness_profile":
            return ModelResponse(
                text=json.dumps(
                    {
                        "axes_ok": [],
                        "salient_deficiency": "Does not return requested JSON.",
                        "evidence_turns": [1],
                        "hypothesized_prompt_cause": "Prompt lacks strict format instruction.",
                        "confidence": 0.91,
                        "material_weakness": True,
                        "severity": "medium",
                        "recommended_repair_strategy": "add_instruction",
                    }
                )
            )
        if phase == "prompt_repair":
            return ModelResponse(
                text=json.dumps(
                    {
                        "new_prompt": "Base prompt\n\nWhen a user requests JSON, return only valid JSON.",
                        "unified_diff": "+When a user requests JSON, return only valid JSON.",
                        "edit_summary": "Added strict JSON instruction.",
                        "changed_sections": ["format"],
                        "minimality_score": 0.9,
                        "estimated_risk": "low",
                    }
                )
            )
        return ModelResponse(text="")


class CoreTests(unittest.TestCase):
    def test_optimizer_accepts_external_evaluator(self):
        def evaluator(prompt, dataset=None, **kwargs):
            return 0.9 if "valid JSON" in prompt else 0.2

        optimizer = DDOOptimizer(model_client=FakeModelClient(), evaluator=evaluator)
        result = optimizer.optimize(
            initial_prompt="Base prompt",
            behavior_spec="Return requested format.",
            dataset=[{"input": "Return JSON for 2+2.", "expected": '{"answer":4}'}],
            horizon=1,
            budget=1,
            patience=1,
        )

        self.assertIn("valid JSON", result.final_prompt)
        self.assertEqual(result.best_score, 0.9)
        self.assertEqual(result.spent, 1)


if __name__ == "__main__":
    unittest.main()
