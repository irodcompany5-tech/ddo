#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { optimizePrompt } from '../src/index.js';

const args = parseArgs(process.argv.slice(2));

if (args.help || args._[0] === 'help') {
  printHelp();
  process.exit(0);
}

const command = args._[0] || 'optimize';
if (command !== 'optimize') {
  console.error(`Unknown command: ${command}`);
  printHelp();
  process.exit(1);
}

try {
  const prompt = readTextArg(args.prompt || args.initialPrompt, 'prompt');
  const behaviorSpec = readTextArg(args.spec || args.behaviorSpec, 'behavior spec', false);
  const dataset = args.dataset ? loadDataset(args.dataset) : [];

  const result = await optimizePrompt(
    {
      apiKey: args.apiKey,
      apiMode: args.apiMode,
      baseURL: args.baseURL,
      teacherModel: args.teacherModel,
      studentModel: args.studentModel,
      verifierModel: args.verifierModel,
      initialPrompt: prompt,
      behaviorSpec,
      dataset,
      horizon: args.horizon,
      budget: args.budget,
      patience: args.patience,
      confidenceThreshold: args.confidenceThreshold,
      regressionEpsilon: args.regressionEpsilon,
      validationLimit: args.validationLimit,
      verifierEnabled: args.verifier !== 'false' && args.noVerifier !== true
    },
    (event) => {
      if (args.jsonl) {
        process.stderr.write(`${JSON.stringify(event)}\n`);
        return;
      }
      if (['iteration', 'weakness_profile', 'repair', 'accepted', 'rejected', 'done'].includes(event.type)) {
        process.stderr.write(`[${event.type}] ${event.iteration ? `iteration=${event.iteration} ` : ''}${event.reason || ''}\n`);
      }
    }
  );

  const output = args.output || args.out;
  if (output) {
    fs.writeFileSync(path.resolve(output), result.finalPrompt, 'utf8');
  }

  if (args.resultJson) {
    fs.writeFileSync(path.resolve(args.resultJson), `${JSON.stringify(result, null, 2)}\n`, 'utf8');
  }

  process.stdout.write(`${result.finalPrompt}\n`);
} catch (error) {
  console.error(error.message || String(error));
  process.exit(1);
}

function parseArgs(argv) {
  const parsed = { _: [] };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (!arg.startsWith('--')) {
      parsed._.push(arg);
      continue;
    }

    const key = arg.slice(2);
    if (key.startsWith('no-')) {
      parsed[toCamel(key)] = true;
      continue;
    }

    const next = argv[i + 1];
    if (!next || next.startsWith('--')) {
      parsed[toCamel(key)] = true;
      continue;
    }

    parsed[toCamel(key)] = coerce(next);
    i += 1;
  }
  return parsed;
}

function toCamel(value) {
  return value.replace(/-([a-z])/g, (_, char) => char.toUpperCase());
}

function coerce(value) {
  if (/^-?\d+(?:\.\d+)?$/.test(value)) return Number(value);
  return value;
}

function readTextArg(value, label, required = true) {
  if (!value) {
    if (required) throw new Error(`Missing --${label.replace(/\s+/g, '-')}.`);
    return undefined;
  }

  const resolved = path.resolve(String(value));
  if (fs.existsSync(resolved)) return fs.readFileSync(resolved, 'utf8').trim();
  return String(value);
}

function loadDataset(filePath) {
  const resolved = path.resolve(filePath);
  const text = fs.readFileSync(resolved, 'utf8');
  const lower = resolved.toLowerCase();

  if (lower.endsWith('.json')) {
    const data = JSON.parse(text);
    return Array.isArray(data) ? data : data.examples || data.data || [];
  }

  if (lower.endsWith('.jsonl')) {
    return text.split(/\r?\n/).filter(Boolean).map((line) => JSON.parse(line));
  }

  return text
    .split(/\n\s*\n/)
    .map((chunk, index) => ({ id: `ex-${index + 1}`, input: chunk.trim() }))
    .filter((example) => example.input);
}

function printHelp() {
  console.log(`DDO Prompt Optimizer

Usage:
  ddo optimize --prompt prompt.txt --dataset examples/dataset.jsonl --teacher-model gpt-5.5 --student-model gpt-5.5

Options:
  --prompt <text|file>             Initial student system prompt
  --spec <text|file>               Behavior specification
  --dataset <file>                 JSON, JSONL, or blank-line text dataset
  --teacher-model <model>          Teacher model
  --student-model <model>          Student model
  --verifier-model <model>         Verifier model
  --api-mode <responses|chat>      OpenAI API mode
  --horizon <n>                    Diagnostic turns per iteration
  --budget <n>                     Total student diagnostic exchanges
  --patience <n>                   Stalls before termination
  --no-verifier                    Disable verifier gate
  --output <file>                  Write final prompt to a file
  --result-json <file>             Write full run result JSON
  --jsonl                          Stream events as JSONL to stderr
`);
}
