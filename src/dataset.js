export function normalizeDataset(rawExamples) {
  if (!Array.isArray(rawExamples)) return [];

  return rawExamples
    .map((example, index) => {
      if (typeof example === 'string') {
        return {
          id: `ex-${index + 1}`,
          input: example.trim(),
          expected: '',
          notes: '',
          tags: []
        };
      }

      const tags = Array.isArray(example?.tags)
        ? example.tags
        : String(example?.tags ?? '')
            .split(/[;,]/)
            .map((tag) => tag.trim())
            .filter(Boolean);

      return {
        id: String(example?.id || `ex-${index + 1}`),
        input: String(example?.input ?? example?.question ?? example?.prompt ?? '').trim(),
        expected: String(example?.expected ?? example?.answer ?? example?.target ?? '').trim(),
        notes: String(example?.notes ?? example?.rubric ?? '').trim(),
        tags
      };
    })
    .filter((example) => example.input);
}

export function datasetPreview(examples, limit = 8) {
  return normalizeDataset(examples)
    .slice(0, limit)
    .map((example) => ({
      id: example.id,
      input: example.input.slice(0, 500),
      expected: example.expected.slice(0, 300),
      notes: example.notes.slice(0, 300),
      tags: example.tags
    }));
}

export function selectValidationExamples(examples, limit) {
  return normalizeDataset(examples).slice(0, Math.max(0, Number(limit) || 0));
}
