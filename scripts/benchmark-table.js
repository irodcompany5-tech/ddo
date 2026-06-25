#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const input = process.argv[2] || 'benchmarks/results-template.csv';
const filePath = path.resolve(process.cwd(), input);

if (!fs.existsSync(filePath)) {
  console.error(`Missing benchmark results file: ${input}`);
  process.exit(1);
}

const rows = parseCsv(fs.readFileSync(filePath, 'utf8').trim());
if (!rows.length) {
  console.log('No benchmark rows found.');
  process.exit(0);
}

const [header, ...data] = rows;
const records = data
  .filter((row) => row.some((value) => value.trim()))
  .map((row) => Object.fromEntries(header.map((key, index) => [key, row[index] || ''])));

if (!records.length) {
  console.log('| Benchmark | Task | Model | Baseline | Optimized | Delta | Cases | Evaluator | Date | Notes |');
  console.log('| --- | --- | --- | ---: | ---: | ---: | ---: | --- | --- | --- |');
  console.log('| _No benchmark results recorded yet._ |  |  |  |  |  |  |  |  |  |');
  process.exit(0);
}

console.log('| Benchmark | Task | Model | Baseline | Optimized | Delta | Cases | Evaluator | Date | Notes |');
console.log('| --- | --- | --- | ---: | ---: | ---: | ---: | --- | --- | --- |');

for (const record of records) {
  const baseline = toNumber(record.baseline_score);
  const optimized = toNumber(record.optimized_score);
  const delta = record.delta || (baseline !== null && optimized !== null ? formatNumber(optimized - baseline) : '');
  console.log(
    [
      record.benchmark,
      record.task,
      record.model,
      formatCell(record.baseline_score),
      formatCell(record.optimized_score),
      formatCell(delta),
      formatCell(record.n_cases),
      record.evaluator,
      record.run_date,
      record.notes
    ]
      .map((value) => ` ${escapeMarkdown(value)} `)
      .join('|')
      .replace(/^/, '|')
      .replace(/$/, '|')
  );
}

function parseCsv(text) {
  const rows = [];
  let row = [];
  let value = '';
  let quoted = false;

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    const next = text[index + 1];

    if (quoted) {
      if (char === '"' && next === '"') {
        value += '"';
        index += 1;
      } else if (char === '"') {
        quoted = false;
      } else {
        value += char;
      }
      continue;
    }

    if (char === '"') {
      quoted = true;
    } else if (char === ',') {
      row.push(value);
      value = '';
    } else if (char === '\n') {
      row.push(value);
      rows.push(row);
      row = [];
      value = '';
    } else if (char !== '\r') {
      value += char;
    }
  }

  row.push(value);
  rows.push(row);
  return rows.filter((item) => item.length > 1 || item[0]);
}

function toNumber(value) {
  if (value === undefined || value === '') {
    return null;
  }
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function formatNumber(value) {
  return Number(value).toFixed(4).replace(/0+$/, '').replace(/\.$/, '');
}

function formatCell(value) {
  const parsed = toNumber(value);
  return parsed === null ? value : formatNumber(parsed);
}

function escapeMarkdown(value) {
  return String(value ?? '').replace(/\|/g, '\\|');
}
