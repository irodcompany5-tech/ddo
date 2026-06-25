import test from 'node:test';
import assert from 'node:assert/strict';
import { extractJson, promptDiff } from '../src/utils.js';
import { normalizeDataset } from '../src/dataset.js';

test('extractJson handles fenced JSON', () => {
  const parsed = extractJson('```json\n{"confidence":0.75,"material_weakness":true}\n```');
  assert.equal(parsed.confidence, 0.75);
  assert.equal(parsed.material_weakness, true);
});

test('extractJson handles text around JSON object', () => {
  const parsed = extractJson('Profile:\n{"axes_ok":["format"],"confidence":0.4}\nDone');
  assert.deepEqual(parsed.axes_ok, ['format']);
});

test('normalizeDataset accepts common aliases', () => {
  const examples = normalizeDataset([
    { question: 'Q1', answer: 'A1', rubric: 'R1', tags: 'math;format' },
    'Free-form input'
  ]);

  assert.equal(examples.length, 2);
  assert.equal(examples[0].input, 'Q1');
  assert.equal(examples[0].expected, 'A1');
  assert.deepEqual(examples[0].tags, ['math', 'format']);
  assert.equal(examples[1].input, 'Free-form input');
});

test('promptDiff emits a unified-style replacement diff', () => {
  const diff = promptDiff('old', 'new');
  assert.match(diff, /--- prompt_before/);
  assert.match(diff, /\+new/);
  assert.match(diff, /-old/);
});
