import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const ignoredDirs = new Set([
  '.git',
  '.git-real',
  '.venv',
  'node_modules',
  'dist',
  'build',
  'coverage',
  'run-results',
  '__pycache__',
  '.ipynb_checkpoints'
]);

const markdownFiles = [];
const notebookFiles = [];
const failures = [];

walk(root);

for (const file of markdownFiles) {
  checkMarkdownLinks(file);
}

for (const file of notebookFiles) {
  checkNotebook(file);
}

if (failures.length) {
  for (const failure of failures) {
    console.error(`FAIL ${failure}`);
  }
  process.exitCode = 1;
} else {
  console.log(`PASS docs: checked ${markdownFiles.length} markdown files and ${notebookFiles.length} notebooks`);
}

function walk(directory) {
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    if (ignoredDirs.has(entry.name)) {
      continue;
    }

    const fullPath = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      walk(fullPath);
      continue;
    }

    if (entry.isFile() && entry.name.endsWith('.md')) {
      markdownFiles.push(fullPath);
    }
    if (entry.isFile() && entry.name.endsWith('.ipynb')) {
      notebookFiles.push(fullPath);
    }
  }
}

function checkMarkdownLinks(file) {
  const content = fs.readFileSync(file, 'utf8');
  const links = content.matchAll(/!?\[[^\]]+\]\(([^)]+)\)/g);

  for (const match of links) {
    const rawTarget = match[1].trim();
    if (!rawTarget || shouldSkipTarget(rawTarget)) {
      continue;
    }

    const [targetPath, anchor] = normalizeTarget(rawTarget).split('#');
    const resolved = targetPath
      ? path.resolve(path.dirname(file), targetPath)
      : file;

    if (targetPath && !fs.existsSync(resolved)) {
      failures.push(`${relative(file)} links to missing path ${rawTarget}`);
      continue;
    }

    if (anchor && resolved.endsWith('.md')) {
      checkAnchor(file, resolved, anchor, rawTarget);
    }
  }
}

function checkNotebook(file) {
  try {
    const parsed = JSON.parse(fs.readFileSync(file, 'utf8'));
    if (parsed.nbformat !== 4 || !Array.isArray(parsed.cells)) {
      failures.push(`${relative(file)} is not a valid nbformat v4 notebook`);
    }
  } catch (error) {
    failures.push(`${relative(file)} is not valid JSON: ${error.message}`);
  }
}

function checkAnchor(sourceFile, targetFile, anchor, rawTarget) {
  const headings = fs
    .readFileSync(targetFile, 'utf8')
    .split(/\r?\n/)
    .filter((line) => /^#{1,6}\s+/.test(line))
    .map((line) => githubSlug(line.replace(/^#{1,6}\s+/, '')));

  if (!headings.includes(anchor.toLowerCase())) {
    failures.push(`${relative(sourceFile)} links to missing heading ${rawTarget}`);
  }
}

function shouldSkipTarget(target) {
  return (
    target.startsWith('http://') ||
    target.startsWith('https://') ||
    target.startsWith('mailto:') ||
    target.startsWith('tel:') ||
    target.startsWith('javascript:')
  );
}

function normalizeTarget(target) {
  const withoutTitle = target.replace(/\s+["'][^"']+["']$/, '');
  return decodeURIComponent(withoutTitle.replace(/^<|>$/g, ''));
}

function githubSlug(value) {
  return value
    .trim()
    .toLowerCase()
    .replace(/<[^>]+>/g, '')
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '-');
}

function relative(file) {
  return path.relative(root, file);
}
