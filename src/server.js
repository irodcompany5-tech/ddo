import './env.js';
import { loadEnvFile } from './env.js';
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { runDDO } from './ddoEngine.js';
import { DEFAULT_BEHAVIOR_SPEC, DEFAULT_INITIAL_PROMPT } from './prompts.js';

loadEnvFile();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');
const publicDir = path.join(rootDir, 'public');
const port = Number(process.env.DDO_PORT || process.env.PORT || 5174);
const host = process.env.DDO_HOST || process.env.HOST || '127.0.0.1';

const mimeTypes = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.pdf': 'application/pdf',
  '.txt': 'text/plain; charset=utf-8',
  '.svg': 'image/svg+xml'
};

const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url, `http://${req.headers.host}`);

    if ((req.method === 'GET' || req.method === 'HEAD') && url.pathname === '/api/config') {
      return sendJson(res, {
        hasEnvKey: Boolean(process.env.OPENAI_API_KEY),
        defaults: {
          apiMode: process.env.DDO_API_MODE || 'responses',
          teacherModel: process.env.DDO_TEACHER_MODEL || 'gpt-5.5',
          studentModel: process.env.DDO_STUDENT_MODEL || 'gpt-5.5',
          verifierModel: process.env.DDO_VERIFIER_MODEL || 'gpt-5.5',
          baseURL: process.env.OPENAI_BASE_URL || '',
          horizon: Number(process.env.DDO_HORIZON || 5),
          budget: Number(process.env.DDO_BUDGET || 20),
          patience: Number(process.env.DDO_PATIENCE || 2),
          confidenceThreshold: Number(process.env.DDO_CONFIDENCE_THRESHOLD || 0.62),
          regressionEpsilon: Number(process.env.DDO_REGRESSION_EPSILON || 0.03),
          validationLimit: Number(process.env.DDO_VALIDATION_LIMIT || 6),
          behaviorSpec: DEFAULT_BEHAVIOR_SPEC,
          initialPrompt: DEFAULT_INITIAL_PROMPT
        },
        paper: {
          pdf: fs.existsSync(path.join(rootDir, 'ddo_paper.pdf')),
          text: fs.existsSync(path.join(rootDir, 'ddo_paper.txt'))
        }
      });
    }

    if (req.method === 'POST' && url.pathname === '/api/optimize') {
      const payload = await readJsonBody(req);
      res.writeHead(200, {
        'Content-Type': 'application/x-ndjson; charset=utf-8',
        'Cache-Control': 'no-cache, no-transform',
        Connection: 'keep-alive',
        'X-Accel-Buffering': 'no'
      });

      const emit = (event) => {
        res.write(`${JSON.stringify({ at: new Date().toISOString(), ...event })}\n`);
      };

      try {
        await runDDO(payload, emit);
      } catch (error) {
        emit({
          type: 'error',
          message: error.message || String(error),
          stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
        });
      } finally {
        res.end();
      }
      return;
    }

    if ((req.method === 'GET' || req.method === 'HEAD') && url.pathname === '/paper/ddo_paper.pdf') {
      return serveFile(res, path.join(rootDir, 'ddo_paper.pdf'));
    }

    if ((req.method === 'GET' || req.method === 'HEAD') && url.pathname === '/paper/ddo_paper.txt') {
      return serveFile(res, path.join(rootDir, 'ddo_paper.txt'));
    }

    if (req.method === 'GET' || req.method === 'HEAD') {
      const pathname = url.pathname === '/' ? '/index.html' : url.pathname;
      const requestedPath = path.normalize(path.join(publicDir, pathname));

      if (!requestedPath.startsWith(publicDir)) {
        return sendJson(res, { error: 'Forbidden' }, 403);
      }

      return serveFile(res, requestedPath);
    }

    sendJson(res, { error: 'Not found' }, 404);
  } catch (error) {
    sendJson(res, { error: error.message || String(error) }, 500);
  }
});

server.on('error', (error) => {
  if (error.code === 'EADDRINUSE') {
    console.error(`Port ${port} is already in use. Set DDO_PORT to another port.`);
  } else if (error.code === 'EACCES' || error.code === 'EPERM') {
    console.error(`Cannot listen on ${host}:${port}. Set DDO_HOST/DDO_PORT or check sandbox permissions.`);
  } else {
    console.error(error);
  }
  process.exit(1);
});

server.listen(port, host, () => {
  console.log(`DDO Prompt Optimizer running at http://${host}:${port}`);
});

function sendJson(res, payload, status = 200) {
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8' });
  if (res.req?.method === 'HEAD') {
    res.end();
    return;
  }
  res.end(JSON.stringify(payload, null, 2));
}

function serveFile(res, filePath) {
  if (!fs.existsSync(filePath) || !fs.statSync(filePath).isFile()) {
    return sendJson(res, { error: 'Not found' }, 404);
  }

  const ext = path.extname(filePath).toLowerCase();
  res.writeHead(200, { 'Content-Type': mimeTypes[ext] || 'application/octet-stream' });
  if (res.req?.method === 'HEAD') {
    res.end();
    return;
  }
  fs.createReadStream(filePath).pipe(res);
}

async function readJsonBody(req) {
  const chunks = [];
  let size = 0;

  for await (const chunk of req) {
    size += chunk.length;
    if (size > 8 * 1024 * 1024) {
      throw new Error('Request body too large.');
    }
    chunks.push(chunk);
  }

  const text = Buffer.concat(chunks).toString('utf8');
  return text ? JSON.parse(text) : {};
}
