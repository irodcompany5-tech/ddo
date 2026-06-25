import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const root = process.cwd();
const checks = [];

check('Node.js >= 20', () => {
  const major = Number(process.versions.node.split('.')[0]);
  return major >= 20;
});

check('package-lock.json exists', () => fs.existsSync(path.join(root, 'package-lock.json')));
check('OpenAI SDK installed', () => Boolean(require.resolve('openai')));
check('paper PDF copied', () => fs.existsSync(path.join(root, 'ddo_paper.pdf')));
check('paper text extracted', () => fs.existsSync(path.join(root, 'ddo_paper.txt')));
check('.env.example exists', () => fs.existsSync(path.join(root, '.env.example')));
check('public UI exists', () => fs.existsSync(path.join(root, 'public', 'index.html')));

const failed = checks.filter((item) => !item.ok);

for (const item of checks) {
  console.log(`${item.ok ? 'PASS' : 'FAIL'} ${item.name}`);
}

if (!process.env.OPENAI_API_KEY) {
  console.log('INFO OPENAI_API_KEY is not set. Add it to .env or use the UI key field for real runs.');
}

if (failed.length) {
  process.exitCode = 1;
}

function check(name, fn) {
  try {
    checks.push({ name, ok: Boolean(fn()) });
  } catch {
    checks.push({ name, ok: false });
  }
}
