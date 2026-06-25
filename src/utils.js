export function clampNumber(value, min, max, fallback) {
  const number = Number(value);
  if (!Number.isFinite(number)) return fallback;
  return Math.min(max, Math.max(min, number));
}

export function asBoolean(value, fallback = false) {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase();
    if (['1', 'true', 'yes', 'on'].includes(normalized)) return true;
    if (['0', 'false', 'no', 'off'].includes(normalized)) return false;
  }
  return fallback;
}

export function stripCodeFence(text) {
  const trimmed = String(text ?? '').trim();
  const fenced = trimmed.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i);
  return fenced ? fenced[1].trim() : trimmed;
}

export function extractJson(text, fallback = null) {
  const cleaned = stripCodeFence(text);

  try {
    return JSON.parse(cleaned);
  } catch {
    // Continue with balanced object extraction below.
  }

  const start = cleaned.indexOf('{');
  if (start === -1) return fallback;

  let depth = 0;
  let inString = false;
  let escape = false;

  for (let i = start; i < cleaned.length; i += 1) {
    const char = cleaned[i];

    if (escape) {
      escape = false;
      continue;
    }

    if (char === '\\') {
      escape = true;
      continue;
    }

    if (char === '"') {
      inString = !inString;
      continue;
    }

    if (inString) continue;

    if (char === '{') depth += 1;
    if (char === '}') depth -= 1;

    if (depth === 0) {
      try {
        return JSON.parse(cleaned.slice(start, i + 1));
      } catch {
        return fallback;
      }
    }
  }

  return fallback;
}

export function compactText(value, maxLength = 2400) {
  const text = String(value ?? '').trim();
  if (text.length <= maxLength) return text;
  return `${text.slice(0, maxLength - 80)}\n\n[...truncated ${text.length - maxLength + 80} chars]`;
}

export function promptDiff(before, after) {
  if (before === after) {
    return '--- prompt_before\n+++ prompt_after\n@@\n unchanged';
  }

  const beforeLines = String(before ?? '').split(/\r?\n/);
  const afterLines = String(after ?? '').split(/\r?\n/);
  const removed = beforeLines.map((line) => `-${line}`).join('\n');
  const added = afterLines.map((line) => `+${line}`).join('\n');
  return `--- prompt_before\n+++ prompt_after\n@@\n${removed}\n${added}`;
}

export function summarizeHistory(history) {
  return history.map((entry, index) => ({
    iteration: index + 1,
    deficiency: entry.weakness?.salient_deficiency ?? '',
    cause: entry.weakness?.hypothesized_prompt_cause ?? '',
    confidence: entry.weakness?.confidence ?? null,
    edit_summary: entry.repair?.edit_summary ?? '',
    accepted: entry.accepted
  }));
}

export function usageTotals(...usageObjects) {
  const totals = {
    input_tokens: 0,
    output_tokens: 0,
    total_tokens: 0
  };

  for (const usage of usageObjects.flat().filter(Boolean)) {
    totals.input_tokens += usage.input_tokens ?? usage.prompt_tokens ?? 0;
    totals.output_tokens += usage.output_tokens ?? usage.completion_tokens ?? 0;
    totals.total_tokens += usage.total_tokens ?? 0;
  }

  return totals;
}
