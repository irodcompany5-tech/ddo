import test from 'node:test';
import assert from 'node:assert/strict';
import {
  DDOOptimizer,
  DEFAULT_BEHAVIOR_SPEC,
  normalizeDataset,
  normalizeEvaluatorSummary
} from '../src/index.js';

test('public library exports are usable', () => {
  const optimizer = new DDOOptimizer({ teacherModel: 'teacher', studentModel: 'student' });
  assert.equal(optimizer.defaults.teacherModel, 'teacher');
  assert.match(DEFAULT_BEHAVIOR_SPEC, /Stepwise reasoning/);
});

test('withEvaluator returns a configured optimizer', () => {
  const optimizer = new DDOOptimizer().withEvaluator(() => 0.8);
  assert.equal(typeof optimizer.defaults.evaluatePrompt, 'function');
});

test('normalizes external evaluator summaries', () => {
  assert.deepEqual(normalizeEvaluatorSummary(0.75), {
    average: 0.75,
    count: 1,
    passRate: 1,
    results: []
  });
});

test('normalizes datasets through public entrypoint', () => {
  const examples = normalizeDataset([{ question: 'Q', answer: 'A' }]);
  assert.equal(examples[0].input, 'Q');
  assert.equal(examples[0].expected, 'A');
});
