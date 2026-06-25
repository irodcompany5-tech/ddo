import { runDDO, buildRunOptions, normalizeEvaluatorSummary, scorePrompt } from './ddoEngine.js';
import { createOpenAIClient, callModelText } from './openaiAdapter.js';
import { normalizeDataset, datasetPreview, selectValidationExamples } from './dataset.js';
import { DEFAULT_BEHAVIOR_SPEC, DEFAULT_INITIAL_PROMPT } from './prompts.js';

export class DDOOptimizer {
  constructor(defaults = {}) {
    this.defaults = { ...defaults };
  }

  async optimize(options = {}, onEvent = () => {}) {
    return runDDO({ ...this.defaults, ...options }, onEvent);
  }

  withEvaluator(evaluatePrompt) {
    return new DDOOptimizer({
      ...this.defaults,
      evaluatePrompt
    });
  }
}

export async function optimizePrompt(options = {}, onEvent = () => {}) {
  return runDDO(options, onEvent);
}

export {
  buildRunOptions,
  callModelText,
  createOpenAIClient,
  datasetPreview,
  DEFAULT_BEHAVIOR_SPEC,
  DEFAULT_INITIAL_PROMPT,
  normalizeDataset,
  normalizeEvaluatorSummary,
  scorePrompt,
  selectValidationExamples
};
