from __future__ import annotations

import os
from typing import Any

from .types import ModelResponse


class OpenAIModelClient:
    """Small adapter around the official OpenAI Python SDK."""

    def __init__(
        self,
        api_key: str | None = None,
        base_url: str | None = None,
        organization: str | None = None,
        project: str | None = None,
    ) -> None:
        resolved_key = api_key or os.getenv("OPENAI_API_KEY")
        if not resolved_key:
            raise ValueError("Missing OpenAI API key. Set OPENAI_API_KEY or pass api_key.")

        try:
            from openai import OpenAI
        except ImportError as exc:
            raise ImportError("Install ddo-prompt-optimizer with the openai dependency available.") from exc

        self.client = OpenAI(
            api_key=resolved_key,
            base_url=base_url or os.getenv("OPENAI_BASE_URL") or None,
            organization=organization or os.getenv("OPENAI_ORG_ID") or None,
            project=project or os.getenv("OPENAI_PROJECT_ID") or None,
        )

    def complete(
        self,
        *,
        model: str,
        messages: list[dict[str, str]],
        api_mode: str = "responses",
        temperature: float = 0.2,
        max_output_tokens: int = 1400,
        metadata: dict[str, str] | None = None,
    ) -> ModelResponse:
        if api_mode == "chat":
            return self._chat(model, messages, temperature, max_output_tokens, metadata)

        try:
            response = self.client.responses.create(
                model=model,
                input=messages,
                temperature=temperature,
                max_output_tokens=max_output_tokens,
                metadata=metadata,
            )
            return ModelResponse(
                text=_extract_responses_text(response),
                usage=_object_to_dict(getattr(response, "usage", None)),
                raw=response,
                api_mode="responses",
                request_id=getattr(response, "_request_id", None),
            )
        except Exception:
            return self._chat(model, _chat_messages(messages), temperature, max_output_tokens, metadata)

    def _chat(
        self,
        model: str,
        messages: list[dict[str, str]],
        temperature: float,
        max_output_tokens: int,
        metadata: dict[str, str] | None,
    ) -> ModelResponse:
        response = self.client.chat.completions.create(
            model=model,
            messages=_chat_messages(messages),
            temperature=temperature,
            max_completion_tokens=max_output_tokens,
            metadata=metadata,
        )
        return ModelResponse(
            text=response.choices[0].message.content or "",
            usage=_object_to_dict(getattr(response, "usage", None)),
            raw=response,
            api_mode="chat",
            request_id=getattr(response, "_request_id", None),
        )


def _chat_messages(messages: list[dict[str, str]]) -> list[dict[str, str]]:
    return [
        {
            "role": "system" if message.get("role") == "developer" else message.get("role", "user"),
            "content": str(message.get("content", "")),
        }
        for message in messages
    ]


def _extract_responses_text(response: Any) -> str:
    output_text = getattr(response, "output_text", None)
    if output_text:
        return output_text

    chunks = []
    for item in getattr(response, "output", []) or []:
        for content in getattr(item, "content", []) or []:
            text = getattr(content, "text", None)
            if text:
                chunks.append(text)
    return "\n".join(chunks).strip()


def _object_to_dict(value: Any) -> dict[str, Any] | None:
    if value is None:
        return None
    if isinstance(value, dict):
        return value
    if hasattr(value, "model_dump"):
        return value.model_dump()
    return {key: getattr(value, key) for key in dir(value) if not key.startswith("_")}
