const state = {
  dataset: [],
  lastResult: null,
  abortController: null
};

const els = {
  keyStatus: document.getElementById('keyStatus'),
  runState: document.getElementById('runState'),
  startRun: document.getElementById('startRun'),
  stopRun: document.getElementById('stopRun'),
  apiKey: document.getElementById('apiKey'),
  apiMode: document.getElementById('apiMode'),
  baseURL: document.getElementById('baseURL'),
  teacherModel: document.getElementById('teacherModel'),
  studentModel: document.getElementById('studentModel'),
  verifierModel: document.getElementById('verifierModel'),
  behaviorSpec: document.getElementById('behaviorSpec'),
  initialPrompt: document.getElementById('initialPrompt'),
  horizon: document.getElementById('horizon'),
  budget: document.getElementById('budget'),
  patience: document.getElementById('patience'),
  confidenceThreshold: document.getElementById('confidenceThreshold'),
  regressionEpsilon: document.getElementById('regressionEpsilon'),
  validationLimit: document.getElementById('validationLimit'),
  verifierEnabled: document.getElementById('verifierEnabled'),
  minimalityMode: document.getElementById('minimalityMode'),
  datasetFile: document.getElementById('datasetFile'),
  loadDemo: document.getElementById('loadDemo'),
  clearDataset: document.getElementById('clearDataset'),
  manualInput: document.getElementById('manualInput'),
  manualExpected: document.getElementById('manualExpected'),
  manualNotes: document.getElementById('manualNotes'),
  addExample: document.getElementById('addExample'),
  datasetRows: document.getElementById('datasetRows'),
  spentMetric: document.getElementById('spentMetric'),
  iterationMetric: document.getElementById('iterationMetric'),
  scoreMetric: document.getElementById('scoreMetric'),
  stopMetric: document.getElementById('stopMetric'),
  eventLog: document.getElementById('eventLog'),
  finalPrompt: document.getElementById('finalPrompt'),
  historyList: document.getElementById('historyList'),
  exportJson: document.getElementById('exportJson'),
  exportPrompt: document.getElementById('exportPrompt')
};

init();

async function init() {
  wireTabs();
  wireDataset();
  wireRunControls();
  await loadConfig();
  renderDataset();
}

async function loadConfig() {
  const response = await fetch('/api/config');
  const config = await response.json();
  const defaults = config.defaults;

  els.keyStatus.textContent = config.hasEnvKey ? 'env key ready' : 'no env key';
  els.apiMode.value = defaults.apiMode;
  els.baseURL.value = defaults.baseURL;
  els.teacherModel.value = defaults.teacherModel;
  els.studentModel.value = defaults.studentModel;
  els.verifierModel.value = defaults.verifierModel;
  els.behaviorSpec.value = defaults.behaviorSpec;
  els.initialPrompt.value = defaults.initialPrompt;
  els.horizon.value = defaults.horizon;
  els.budget.value = defaults.budget;
  els.patience.value = defaults.patience;
  els.confidenceThreshold.value = defaults.confidenceThreshold;
  els.regressionEpsilon.value = defaults.regressionEpsilon;
  els.validationLimit.value = defaults.validationLimit;
}

function wireTabs() {
  document.querySelectorAll('.tab').forEach((button) => {
    button.addEventListener('click', () => {
      document.querySelectorAll('.tab').forEach((tab) => tab.classList.remove('active'));
      button.classList.add('active');
      const name = button.dataset.tab;
      document.querySelectorAll('.tab-panel').forEach((panel) => panel.classList.add('hidden'));
      document.getElementById(`${name}Tab`).classList.remove('hidden');
    });
  });
}

function wireDataset() {
  els.datasetFile.addEventListener('change', async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const text = await file.text();
    state.dataset = parseDatasetText(text, file.name);
    renderDataset();
    event.target.value = '';
  });

  els.loadDemo.addEventListener('click', () => {
    state.dataset = demoDataset();
    renderDataset();
  });

  els.clearDataset.addEventListener('click', () => {
    state.dataset = [];
    renderDataset();
  });

  els.addExample.addEventListener('click', () => {
    const input = els.manualInput.value.trim();
    if (!input) return;
    state.dataset.push({
      id: `ex-${state.dataset.length + 1}`,
      input,
      expected: els.manualExpected.value.trim(),
      notes: els.manualNotes.value.trim(),
      tags: []
    });
    els.manualInput.value = '';
    els.manualExpected.value = '';
    els.manualNotes.value = '';
    renderDataset();
  });
}

function wireRunControls() {
  els.startRun.addEventListener('click', startRun);
  els.stopRun.addEventListener('click', () => {
    state.abortController?.abort();
  });
  els.exportJson.addEventListener('click', () => {
    downloadText('ddo-result.json', JSON.stringify(state.lastResult, null, 2));
  });
  els.exportPrompt.addEventListener('click', () => {
    downloadText('optimized-prompt.txt', els.finalPrompt.value);
  });
}

async function startRun() {
  const payload = collectPayload();
  state.lastResult = null;
  state.abortController = new AbortController();
  setRunning(true);
  clearRunView();
  switchTab('run');
  addEvent('start', 'Starting DDO run', payloadSummary(payload));

  try {
    const response = await fetch('/api/optimize', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal: state.abortController.signal
    });

    if (!response.body) throw new Error('Streaming response is unavailable.');

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
      const { value, done } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        if (!line.trim()) continue;
        handleEvent(JSON.parse(line));
      }
    }

    if (buffer.trim()) handleEvent(JSON.parse(buffer));
  } catch (error) {
    if (error.name === 'AbortError') {
      addEvent('stopped', 'Run stopped', '');
      els.runState.textContent = 'stopped';
    } else {
      addEvent('error', 'Run failed', error.message, 'bad');
      els.runState.textContent = 'error';
    }
  } finally {
    setRunning(false);
    state.abortController = null;
  }
}

function collectPayload() {
  return {
    apiKey: els.apiKey.value.trim(),
    apiMode: els.apiMode.value,
    baseURL: els.baseURL.value.trim(),
    teacherModel: els.teacherModel.value.trim(),
    studentModel: els.studentModel.value.trim(),
    verifierModel: els.verifierModel.value.trim(),
    behaviorSpec: els.behaviorSpec.value.trim(),
    initialPrompt: els.initialPrompt.value.trim(),
    horizon: Number(els.horizon.value),
    budget: Number(els.budget.value),
    patience: Number(els.patience.value),
    confidenceThreshold: Number(els.confidenceThreshold.value),
    regressionEpsilon: Number(els.regressionEpsilon.value),
    validationLimit: Number(els.validationLimit.value),
    verifierEnabled: els.verifierEnabled.checked,
    minimalityMode: els.minimalityMode.value,
    dataset: state.dataset
  };
}

function handleEvent(event) {
  switch (event.type) {
    case 'iteration':
      els.iterationMetric.textContent = event.iteration;
      addEvent('iteration', `Iteration ${event.iteration}`, `spent=${event.spent} stall=${event.stall}`);
      break;
    case 'teacher_question':
      addEvent('teacher', `Teacher turn ${event.turn}`, JSON.stringify(event.policy, null, 2));
      break;
    case 'student_answer':
      els.spentMetric.textContent = `${event.spent}/${event.budget}`;
      addEvent('student', `Student turn ${event.turn}`, event.entry.student);
      break;
    case 'weakness_profile':
      addEvent('weakness', 'Weakness profile', JSON.stringify(event.weakness, null, 2), event.weakness.material_weakness ? '' : 'warn');
      break;
    case 'repair':
      addEvent('repair', 'Prompt repair', JSON.stringify(event.repair, null, 2), event.minimalityRejected ? 'bad' : '');
      break;
    case 'verifier':
      els.scoreMetric.textContent = formatScore(event.verifier.after.average);
      addEvent('verifier', 'Verifier gate', JSON.stringify(event.verifier, null, 2), event.verifier.delta < 0 ? 'warn' : '');
      break;
    case 'accepted':
      els.finalPrompt.value = event.prompt;
      addEvent('accepted', `Accepted iteration ${event.iteration}`, event.prompt);
      renderHistory(event.history || []);
      break;
    case 'rejected':
      addEvent('rejected', event.reason, JSON.stringify(event.verifier || { growthRatio: event.growthRatio }, null, 2), 'bad');
      break;
    case 'stalled':
      addEvent('stalled', event.reason, `stall=${event.stall}`, 'warn');
      break;
    case 'done':
      state.lastResult = event.result;
      els.finalPrompt.value = event.result.finalPrompt;
      els.stopMetric.textContent = event.result.stoppedReason;
      els.scoreMetric.textContent = event.result.bestScore === null ? '--' : formatScore(event.result.bestScore);
      els.exportJson.disabled = false;
      els.exportPrompt.disabled = false;
      els.runState.textContent = 'done';
      renderHistory((event.result.history || []).filter((entry) => entry.accepted));
      addEvent('done', 'Run complete', JSON.stringify({
        spent: event.result.spent,
        iterations: event.result.iterations,
        stoppedReason: event.result.stoppedReason,
        usage: event.result.usage
      }, null, 2));
      switchTab('results');
      break;
    case 'error':
      addEvent('error', 'Server error', event.message, 'bad');
      els.runState.textContent = 'error';
      break;
    default:
      if (event.type !== 'start') addEvent(event.type, event.type, JSON.stringify(event, null, 2));
  }
}

function renderDataset() {
  els.datasetRows.innerHTML = '';
  for (const [index, example] of state.dataset.entries()) {
    const row = document.createElement('tr');
    row.innerHTML = `
      <td>${escapeHtml(example.id || `ex-${index + 1}`)}</td>
      <td><div class="clip">${escapeHtml(example.input)}</div></td>
      <td><div class="clip">${escapeHtml(example.expected || '')}</div></td>
      <td><div class="clip">${escapeHtml(example.notes || '')}</div></td>
      <td><button class="ghost" type="button" data-index="${index}">Remove</button></td>
    `;
    row.querySelector('button').addEventListener('click', () => {
      state.dataset.splice(index, 1);
      renderDataset();
    });
    els.datasetRows.appendChild(row);
  }
}

function renderHistory(history) {
  els.historyList.innerHTML = '';
  if (!history.length) return;

  for (const item of history) {
    const div = document.createElement('div');
    div.className = 'history-item';
    div.innerHTML = `
      <strong>Iteration ${escapeHtml(String(item.iteration ?? ''))}</strong>
      <pre>${escapeHtml(item.repair?.unified_diff || item.edit_summary || JSON.stringify(item, null, 2))}</pre>
    `;
    els.historyList.appendChild(div);
  }
}

function parseDatasetText(text, filename) {
  const lower = filename.toLowerCase();
  if (lower.endsWith('.json')) {
    const value = JSON.parse(text);
    return normalizeDataset(Array.isArray(value) ? value : value.examples || value.data || []);
  }

  if (lower.endsWith('.jsonl')) {
    return normalizeDataset(text.split(/\r?\n/).filter(Boolean).map((line) => JSON.parse(line)));
  }

  if (lower.endsWith('.csv')) {
    return normalizeDataset(parseCsv(text));
  }

  return normalizeDataset(
    text
      .split(/\n\s*\n/)
      .map((chunk, index) => ({ id: `ex-${index + 1}`, input: chunk.trim() }))
      .filter((example) => example.input)
  );
}

function parseCsv(text) {
  const rows = [];
  let row = [];
  let cell = '';
  let inQuotes = false;

  for (let i = 0; i < text.length; i += 1) {
    const char = text[i];
    const next = text[i + 1];

    if (char === '"' && next === '"') {
      cell += '"';
      i += 1;
    } else if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      row.push(cell);
      cell = '';
    } else if ((char === '\n' || char === '\r') && !inQuotes) {
      if (char === '\r' && next === '\n') i += 1;
      row.push(cell);
      rows.push(row);
      row = [];
      cell = '';
    } else {
      cell += char;
    }
  }

  row.push(cell);
  rows.push(row);

  const [headers = [], ...body] = rows.filter((items) => items.some((item) => item.trim()));
  return body.map((items, index) => {
    const object = { id: `ex-${index + 1}` };
    headers.forEach((header, headerIndex) => {
      object[header.trim()] = items[headerIndex]?.trim() || '';
    });
    return object;
  });
}

function normalizeDataset(raw) {
  return raw
    .map((example, index) => {
      if (typeof example === 'string') {
        return { id: `ex-${index + 1}`, input: example, expected: '', notes: '', tags: [] };
      }
      return {
        id: String(example.id || `ex-${index + 1}`),
        input: String(example.input || example.question || example.prompt || '').trim(),
        expected: String(example.expected || example.answer || example.target || '').trim(),
        notes: String(example.notes || example.rubric || '').trim(),
        tags: Array.isArray(example.tags) ? example.tags : String(example.tags || '').split(/[;,]/).filter(Boolean)
      };
    })
    .filter((example) => example.input);
}

function demoDataset() {
  return normalizeDataset([
    {
      input: 'Return JSON with keys "answer" and "confidence": A train leaves at 3 PM, travels 60 mph for 2 hours, then 30 mph for 1 hour. How far did it travel?',
      expected: '{"answer":"150 miles","confidence":"high"}',
      notes: 'Must compute stepwise and return only valid JSON.'
    },
    {
      input: 'Give exactly three bullet points about safe database migrations. Each bullet must start with a verb.',
      expected: 'Three bullets only; each starts with a verb.',
      notes: 'Checks format and instruction adherence.'
    },
    {
      input: 'The user asks for a number but does not provide enough data: "What will my server bill be next month?"',
      expected: 'Ask for missing usage/pricing details or state uncertainty.',
      notes: 'Checks calibration on underspecified input.'
    }
  ]);
}

function clearRunView() {
  els.eventLog.innerHTML = '';
  els.finalPrompt.value = '';
  els.historyList.innerHTML = '';
  els.spentMetric.textContent = '0';
  els.iterationMetric.textContent = '0';
  els.scoreMetric.textContent = '--';
  els.stopMetric.textContent = '--';
  els.exportJson.disabled = true;
  els.exportPrompt.disabled = true;
}

function setRunning(running) {
  els.startRun.disabled = running;
  els.stopRun.disabled = !running;
  els.runState.textContent = running ? 'running' : els.runState.textContent;
}

function addEvent(type, title, body, tone = '') {
  const event = document.createElement('article');
  event.className = `event ${tone}`.trim();
  const time = new Date().toLocaleTimeString();
  event.innerHTML = `
    <div class="event-head"><span>${escapeHtml(title)}</span><span>${escapeHtml(type)} ${time}</span></div>
    ${body ? `<pre>${escapeHtml(String(body))}</pre>` : ''}
  `;
  els.eventLog.prepend(event);
}

function switchTab(name) {
  document.querySelector(`.tab[data-tab="${name}"]`)?.click();
}

function payloadSummary(payload) {
  return JSON.stringify({
    teacherModel: payload.teacherModel,
    studentModel: payload.studentModel,
    verifierModel: payload.verifierModel,
    apiMode: payload.apiMode,
    horizon: payload.horizon,
    budget: payload.budget,
    patience: payload.patience,
    dataset: payload.dataset.length
  }, null, 2);
}

function formatScore(score) {
  return Number.isFinite(score) ? score.toFixed(2) : '--';
}

function downloadText(filename, text) {
  const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
