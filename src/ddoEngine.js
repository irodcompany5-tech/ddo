import { callModelText, createOpenAIClient } from './openaiAdapter.js';
import { datasetPreview, normalizeDataset, selectValidationExamples } from './dataset.js';
import {
  compactText,
  extractJson,
  promptDiff,
  summarizeHistory,
  usageTotals,
  clampNumber,
  asBoolean
} from './utils.js';
import {
  DEFAULT_BEHAVIOR_SPEC,
  DEFAULT_INITIAL_PROMPT,
  DIAGNOSIS_SYSTEM,
  REPAIR_SYSTEM,
  TEACHER_POLICY_SYSTEM,
  VERIFIER_SYSTEM
} from './prompts.js';

export function buildRunOptions(payload = {}) {
  const env = process.env;

  return {
    apiKey: payload.apiKey || '',
    baseURL: payload.baseURL || env.OPENAI_BASE_URL || '',
    organization: payload.organization || env.OPENAI_ORG_ID || '',
    project: payload.project || env.OPENAI_PROJECT_ID || '',
    apiMode: payload.apiMode || env.DDO_API_MODE || 'responses',
    teacherModel: payload.teacherModel || env.DDO_TEACHER_MODEL || 'google/gemma-4-31b-it',
    studentModel: payload.studentModel || env.DDO_STUDENT_MODEL || 'google/gemma-4-31b-it',
    verifierModel: payload.verifierModel || env.DDO_VERIFIER_MODEL || payload.teacherModel || 'google/gemma-4-31b-it',
    behaviorSpec: payload.behaviorSpec || DEFAULT_BEHAVIOR_SPEC,
    initialPrompt: payload.initialPrompt || DEFAULT_INITIAL_PROMPT,
    dataset: normalizeDataset(payload.dataset),
    horizon: clampNumber(payload.horizon, 1, 20, Number(env.DDO_HORIZON) || 5),
    epochs: clampNumber(payload.epochs, 1, 100, Number(env.DDO_EPOCHS) || 5),
    budget: clampNumber(payload.budget, 1, 200, Number(env.DDO_BUDGET) || 20),
    patience: clampNumber(payload.patience, 1, 20, Number(env.DDO_PATIENCE) || 2),
    maxTotalTokens: clampNumber(payload.maxTotalTokens, 1000, 10000000, Number(env.DDO_MAX_TOTAL_TOKENS) || 1000000),
    confidenceThreshold: clampNumber(
      payload.confidenceThreshold,
      0,
      1,
      Number(env.DDO_CONFIDENCE_THRESHOLD) || 0.62
    ),
    regressionEpsilon: clampNumber(
      payload.regressionEpsilon,
      0,
      1,
      Number(env.DDO_REGRESSION_EPSILON) || 0.03
    ),
    validationLimit: clampNumber(payload.validationLimit, 1, 50, Number(env.DDO_VALIDATION_LIMIT) || 6),
    verifierEnabled: asBoolean(payload.verifierEnabled, true),
    externalEvaluator: typeof payload.evaluatePrompt === 'function'
      ? payload.evaluatePrompt
      : typeof payload.externalEvaluator === 'function'
        ? payload.externalEvaluator
        : null,
    minimalityMode: payload.minimalityMode || 'warn',
    maxPromptGrowthRatio: clampNumber(payload.maxPromptGrowthRatio, 0, 5, 0.35),
    temperature: clampNumber(payload.temperature, 0, 2, 0.2),
    maxOutputTokens: clampNumber(payload.maxOutputTokens, 256, 12000, 1800)
  };
}

export async function runDDO(payload, emit = () => {}) {
  const options = buildRunOptions(payload);
  const client = createOpenAIClient(options);
  const callUsage = [];
  const scoreCache = new Map();
  let tokenTotal = 0;

  let prompt = options.initialPrompt;
  let bestPrompt = prompt;
  let bestScore = null;
  let spent = 0;
  let stall = 0;
  let iteration = 0;
  const history = [];

  emit({
    type: 'start',
    options: publicOptions(options),
    datasetSize: options.dataset.length,
    initialPrompt: prompt
  });

  while (
    spent < options.budget &&
    stall < options.patience &&
    iteration < options.epochs &&
    tokenTotal < options.maxTotalTokens
  ) {
    iteration += 1;
    const transcript = [];

    emit({
      type: 'iteration',
      iteration,
      prompt,
      spent,
      stall
    });

    for (let turn = 1; turn <= options.horizon && spent < options.budget; turn += 1) {
      const policy = await generateDiagnosticQuestion({
        client,
        options,
        prompt,
        transcript,
        history,
        turn
      });
      callUsage.push(policy.usage);
      tokenTotal = usageTotals(callUsage).total_tokens;

      emit({
        type: 'teacher_question',
        iteration,
        turn,
        policy: policy.data
      });

      if (policy.data.diagnosisComplete && !policy.data.question) {
        emit({
          type: 'diagnosis_complete',
          iteration,
          turn,
          reason: policy.data.whyThisQuestion || 'Teacher localized the dominant deficiency.'
        });
        break;
      }

      const question = String(policy.data.question || '').trim();
      if (!question) break;

      const student = await askStudent({
        client,
        options,
        prompt,
        transcript,
        question
      });
      callUsage.push(student.usage);
      tokenTotal = usageTotals(callUsage).total_tokens;
      spent += 1;

      const entry = {
        turn,
        axis: policy.data.axis || '',
        teacher: question,
        student: student.text,
        whyThisQuestion: policy.data.whyThisQuestion || '',
        expectedSignal: policy.data.expectedSignal || ''
      };
      transcript.push(entry);

      emit({
        type: 'student_answer',
        iteration,
        turn,
        entry,
        spent,
        budget: options.budget,
        tokenTotal,
        maxTotalTokens: options.maxTotalTokens
      });

      if (policy.data.diagnosisComplete || tokenTotal >= options.maxTotalTokens) break;
    }

    if (!transcript.length) {
      stall += 1;
      emit({
        type: 'stalled',
        iteration,
        stall,
        reason: 'No diagnostic turn was produced.'
      });
      continue;
    }

    const weaknessResult = await compileWeaknessProfile({
      client,
      options,
      prompt,
      transcript,
      history
    });
    callUsage.push(weaknessResult.usage);
    tokenTotal = usageTotals(callUsage).total_tokens;
    const weakness = weaknessResult.data;

    emit({
      type: 'weakness_profile',
      iteration,
      weakness
    });

    if (
      !weakness.material_weakness ||
      Number(weakness.confidence ?? 0) < options.confidenceThreshold
    ) {
      stall += 1;
      history.push({
        iteration,
        transcript,
        weakness,
        accepted: false,
        skipped: true,
        reason: 'No confident material weakness.'
      });
      emit({
        type: 'stalled',
        iteration,
        stall,
        reason: 'No confident material weakness.',
        confidenceThreshold: options.confidenceThreshold
      });
      continue;
    }

    const repairResult = await repairPrompt({
      client,
      options,
      prompt,
      weakness,
      history
    });
    callUsage.push(repairResult.usage);
    tokenTotal = usageTotals(callUsage).total_tokens;
    const repair = normalizeRepair(repairResult.data, prompt);
    const growthRatio = prompt.length ? Math.max(0, repair.new_prompt.length - prompt.length) / prompt.length : 0;
    const minimalityRejected =
      options.minimalityMode === 'reject' && growthRatio > options.maxPromptGrowthRatio;

    emit({
      type: 'repair',
      iteration,
      repair,
      growthRatio,
      minimalityRejected
    });

    if (minimalityRejected) {
      stall += 1;
      history.push({
        iteration,
        transcript,
        weakness,
        repair,
        accepted: false,
        reason: 'Rejected by minimality guard.'
      });
      emit({
        type: 'rejected',
        iteration,
        stall,
        reason: 'Rejected by minimality guard.',
        growthRatio
      });
      continue;
    }

    const verifier = await maybeVerifyRepair({
      client,
      options,
      prompt,
      candidatePrompt: repair.new_prompt,
      scoreCache,
      callUsage
    });
    tokenTotal = usageTotals(callUsage).total_tokens;

    if (verifier) {
      emit({
        type: 'verifier',
        iteration,
        verifier
      });
    }

    const rejectedByVerifier =
      verifier && verifier.after.average < verifier.before.average - options.regressionEpsilon;

    if (rejectedByVerifier) {
      stall += 1;
      history.push({
        iteration,
        transcript,
        weakness,
        repair,
        verifier,
        accepted: false,
        reason: 'Rejected by verifier regression gate.'
      });
      emit({
        type: 'rejected',
        iteration,
        stall,
        reason: 'Rejected by verifier regression gate.',
        verifier
      });
      continue;
    }

    prompt = repair.new_prompt;
    stall = 0;
    const acceptedEntry = {
      iteration,
      transcript,
      weakness,
      repair,
      verifier,
      accepted: true
    };
    history.push(acceptedEntry);

    if (verifier) {
      if (bestScore === null || verifier.after.average > bestScore) {
        bestScore = verifier.after.average;
        bestPrompt = prompt;
      }
    } else {
      bestPrompt = prompt;
    }

    emit({
      type: 'accepted',
      iteration,
      prompt,
      bestPrompt,
      bestScore,
      history: summarizeHistory(history)
    });

    if (tokenTotal >= options.maxTotalTokens) {
      emit({
        type: 'token_limit_reached',
        iteration,
        tokenTotal,
        maxTotalTokens: options.maxTotalTokens
      });
      break;
    }
  }

  const result = {
    finalPrompt: bestPrompt,
    currentPrompt: prompt,
    bestScore,
    spent,
    iterations: iteration,
    stoppedReason: stopReason({
      spent,
      budget: options.budget,
      stall,
      patience: options.patience,
      iterations: iteration,
      epochs: options.epochs,
      tokenTotal,
      maxTotalTokens: options.maxTotalTokens
    }),
    history,
    usage: usageTotals(callUsage)
  };

  emit({
    type: 'done',
    result
  });

  return result;
}

async function generateDiagnosticQuestion({ client, options, prompt, transcript, history, turn }) {
  const user = {
    behavior_spec: options.behaviorSpec,
    current_prompt: prompt,
    turn,
    horizon: options.horizon,
    remaining_student_exchanges: options.budget,
    dataset_preview: datasetPreview(options.dataset),
    conversation_so_far: transcript,
    accepted_history: summarizeHistory(history.filter((entry) => entry.accepted))
  };

  const response = await callModelText({
    client,
    apiMode: options.apiMode,
    model: options.teacherModel,
    temperature: options.temperature,
    maxOutputTokens: 900,
    messages: [
      { role: 'system', content: TEACHER_POLICY_SYSTEM },
      { role: 'user', content: JSON.stringify(user, null, 2) }
    ],
    metadata: { ddo_phase: 'diagnostic_policy' }
  });

  const data = extractJson(response.text, {});
  return {
    data: {
      diagnosisComplete: Boolean(data.diagnosisComplete),
      axis: String(data.axis ?? ''),
      question: String(data.question ?? ''),
      whyThisQuestion: String(data.whyThisQuestion ?? ''),
      expectedSignal: String(data.expectedSignal ?? '')
    },
    usage: response.usage
  };
}

async function askStudent({ client, options, prompt, transcript, question }) {
  const messages = [
    { role: 'system', content: prompt },
    ...transcript.flatMap((entry) => [
      { role: 'user', content: entry.teacher },
      { role: 'assistant', content: entry.student }
    ]),
    { role: 'user', content: question }
  ];

  const response = await callModelText({
    client,
    apiMode: options.apiMode,
    model: options.studentModel,
    temperature: options.temperature,
    maxOutputTokens: options.maxOutputTokens,
    messages,
    metadata: { ddo_phase: 'student_dialogue' }
  });

  return {
    text: response.text,
    usage: response.usage
  };
}

async function compileWeaknessProfile({ client, options, prompt, transcript, history }) {
  const user = {
    behavior_spec: options.behaviorSpec,
    current_prompt: prompt,
    conversation: transcript,
    accepted_history: summarizeHistory(history.filter((entry) => entry.accepted))
  };

  const response = await callModelText({
    client,
    apiMode: options.apiMode,
    model: options.teacherModel,
    temperature: 0.1,
    maxOutputTokens: 1200,
    messages: [
      { role: 'system', content: DIAGNOSIS_SYSTEM },
      { role: 'user', content: JSON.stringify(user, null, 2) }
    ],
    metadata: { ddo_phase: 'weakness_profile' }
  });

  const data = extractJson(response.text, {});

  return {
    data: {
      axes_ok: Array.isArray(data.axes_ok) ? data.axes_ok : [],
      salient_deficiency: String(data.salient_deficiency ?? ''),
      evidence_turns: Array.isArray(data.evidence_turns) ? data.evidence_turns : [],
      hypothesized_prompt_cause: String(data.hypothesized_prompt_cause ?? ''),
      confidence: Number(data.confidence ?? 0),
      material_weakness: Boolean(data.material_weakness),
      severity: String(data.severity ?? 'none'),
      recommended_repair_strategy: String(data.recommended_repair_strategy ?? 'none'),
      history_conflict: Boolean(data.history_conflict),
      no_material_weakness_reason: String(data.no_material_weakness_reason ?? '')
    },
    usage: response.usage
  };
}

async function repairPrompt({ client, options, prompt, weakness, history }) {
  const user = {
    behavior_spec: options.behaviorSpec,
    current_prompt: prompt,
    weakness_profile: weakness,
    accepted_history: summarizeHistory(history.filter((entry) => entry.accepted)),
    max_prompt_growth_ratio: options.maxPromptGrowthRatio,
    minimality_mode: options.minimalityMode
  };

  const response = await callModelText({
    client,
    apiMode: options.apiMode,
    model: options.teacherModel,
    temperature: 0.15,
    maxOutputTokens: Math.max(1400, options.maxOutputTokens),
    messages: [
      { role: 'system', content: REPAIR_SYSTEM },
      { role: 'user', content: JSON.stringify(user, null, 2) }
    ],
    metadata: { ddo_phase: 'prompt_repair' }
  });

  return {
    data: extractJson(response.text, {}),
    usage: response.usage
  };
}

function normalizeRepair(data, beforePrompt) {
  const newPrompt = String(data.new_prompt || beforePrompt).trim();

  return {
    new_prompt: newPrompt,
    unified_diff: String(data.unified_diff || promptDiff(beforePrompt, newPrompt)),
    edit_summary: String(data.edit_summary || 'Applied a targeted DDO repair.'),
    changed_sections: Array.isArray(data.changed_sections) ? data.changed_sections : [],
    minimality_score: Number(data.minimality_score ?? 0),
    estimated_risk: String(data.estimated_risk || 'medium')
  };
}

async function maybeVerifyRepair({ client, options, prompt, candidatePrompt, scoreCache, callUsage }) {
  if (!options.verifierEnabled || !options.dataset.length) return null;

  if (options.externalEvaluator) {
    const before = normalizeEvaluatorSummary(
      await options.externalEvaluator(prompt, {
        dataset: options.dataset,
        behaviorSpec: options.behaviorSpec,
        phase: 'before',
        options
      })
    );
    const after = normalizeEvaluatorSummary(
      await options.externalEvaluator(candidatePrompt, {
        dataset: options.dataset,
        behaviorSpec: options.behaviorSpec,
        phase: 'after',
        options
      })
    );

    return {
      source: 'external',
      before,
      after,
      delta: after.average - before.average,
      epsilon: options.regressionEpsilon
    };
  }

  const before = await scorePrompt({
    client,
    options,
    prompt,
    scoreCache,
    callUsage
  });
  const after = await scorePrompt({
    client,
    options,
    prompt: candidatePrompt,
    scoreCache,
    callUsage
  });

  return {
    source: 'llm_verifier',
    before,
    after,
    delta: after.average - before.average,
    epsilon: options.regressionEpsilon
  };
}

export function normalizeEvaluatorSummary(value) {
  if (typeof value === 'number') {
    return {
      average: clampNumber(value, 0, 1, 0),
      count: 1,
      passRate: value >= 0.5 ? 1 : 0,
      results: []
    };
  }

  const average = clampNumber(value?.average ?? value?.score, 0, 1, 0);
  const results = Array.isArray(value?.results) ? value.results : [];
  const count = Number.isFinite(Number(value?.count)) ? Number(value.count) : results.length;

  return {
    average,
    count,
    passRate: clampNumber(value?.passRate, 0, 1, average >= 0.5 ? 1 : 0),
    results
  };
}

export async function scorePrompt({ client, options, prompt, scoreCache, callUsage = [] }) {
  const key = prompt;
  if (scoreCache?.has(key)) return scoreCache.get(key);

  const examples = selectValidationExamples(options.dataset, options.validationLimit);
  const results = [];

  for (const example of examples) {
    const student = await callModelText({
      client,
      apiMode: options.apiMode,
      model: options.studentModel,
      temperature: options.temperature,
      maxOutputTokens: options.maxOutputTokens,
      messages: [
        { role: 'system', content: prompt },
        { role: 'user', content: example.input }
      ],
      metadata: { ddo_phase: 'verification_student' }
    });
    callUsage.push(student.usage);

    const verifierInput = {
      behavior_spec: options.behaviorSpec,
      example: {
        id: example.id,
        input: example.input,
        expected: example.expected,
        notes: example.notes,
        tags: example.tags
      },
      student_answer: compactText(student.text, 4000)
    };

    const judged = await callModelText({
      client,
      apiMode: options.apiMode,
      model: options.verifierModel,
      temperature: 0,
      maxOutputTokens: 700,
      messages: [
        { role: 'system', content: VERIFIER_SYSTEM },
        { role: 'user', content: JSON.stringify(verifierInput, null, 2) }
      ],
      metadata: { ddo_phase: 'verification_judge' }
    });
    callUsage.push(judged.usage);

    const parsed = extractJson(judged.text, {});
    const score = clampNumber(parsed.score, 0, 1, 0);
    results.push({
      id: example.id,
      score,
      pass: Boolean(parsed.pass),
      rationale: String(parsed.rationale ?? ''),
      answer: student.text
    });
  }

  const average = results.length
    ? results.reduce((sum, result) => sum + result.score, 0) / results.length
    : 0;
  const summary = {
    average,
    count: results.length,
    passRate: results.length
      ? results.filter((result) => result.pass).length / results.length
      : 0,
    results
  };

  scoreCache?.set(key, summary);
  return summary;
}

function stopReason({ spent, budget, stall, patience, iterations, epochs, tokenTotal, maxTotalTokens }) {
  if (tokenTotal >= maxTotalTokens) return 'token_limit_exhausted';
  if (iterations >= epochs) return 'epoch_limit_exhausted';
  if (spent >= budget) return 'budget_exhausted';
  if (stall >= patience) return 'patience_exhausted';
  return 'completed';
}

function publicOptions(options) {
  const { apiKey, externalEvaluator, ...rest } = options;
  return {
    ...rest,
    apiKeySource: apiKey ? 'ui' : process.env.OPENAI_API_KEY ? 'env' : 'missing'
  };
}
