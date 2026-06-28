/**
 * 로컬 개발 서버 — 정적 파일 + /api/* Serverless 핸들러
 * Vercel 배포 시에는 Vercel이 api/ 폴더를 자동 실행
 */
const http = require('http');
const fs = require('fs');
const path = require('path');
const { loadEnv } = require('../lib/load-env');

const ROOT = path.join(__dirname, '..');
const PORT = process.env.PORT || 8080;

function loadEnvFiles() {
  loadEnv();
}

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.ico': 'image/x-icon',
};

const API_MAP = {
  '/api/health': 'health.js',
  '/api/admin-verify': 'admin-verify.js',
  '/api/master': 'master.js',
  '/api/templates': 'templates.js',
  '/api/gemini': 'gemini.js',
  '/api/submissions': 'submissions.js',
  '/api/env': 'env.js',
};

function createMockRes(serverRes) {
  let statusCode = 200;
  const mock = {
    setHeader(k, v) {
      serverRes.setHeader(k, v);
      return mock;
    },
    status(code) {
      statusCode = code;
      return mock;
    },
    json(data) {
      if (!serverRes.headersSent) {
        serverRes.writeHead(statusCode, { 'Content-Type': 'application/json; charset=utf-8' });
      }
      serverRes.end(JSON.stringify(data));
    },
    end(data) {
      if (!serverRes.headersSent) serverRes.writeHead(statusCode);
      serverRes.end(data);
    },
  };
  return mock;
}

async function handleApi(req, res, pathname) {
  const file = API_MAP[pathname];
  if (!file) {
    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'API not found', path: pathname }));
    return;
  }
  const modPath = path.join(ROOT, 'api', file);
  delete require.cache[require.resolve(modPath)];
  const handler = require(modPath);
  const mockRes = createMockRes(res);
  try {
    await handler(req, mockRes);
  } catch (e) {
    if (!res.headersSent) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: e.message }));
    }
  }
}

function serveStatic(req, res, pathname) {
  let filePath = pathname === '/' ? '/index.html' : pathname;
  filePath = path.join(ROOT, filePath.replace(/\.\./g, ''));

  if (!filePath.startsWith(ROOT)) {
    res.writeHead(403);
    return res.end('Forbidden');
  }

  if (!fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
    res.writeHead(404);
    return res.end('Not found');
  }

  const ext = path.extname(filePath);
  res.writeHead(200, { 'Content-Type': MIME[ext] || 'application/octet-stream' });
  fs.createReadStream(filePath).pipe(res);
}

loadEnvFiles();

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://localhost:${PORT}`);
  const pathname = decodeURIComponent(url.pathname);

  if (pathname.startsWith('/api/')) {
    return handleApi(req, res, pathname);
  }
  return serveStatic(req, res, pathname);
});

server.listen(PORT, () => {
  console.log(`\n  개발 서버: http://localhost:${PORT}`);
  console.log(`  API 상태:  http://localhost:${PORT}/api/health`);
  console.log(`  관리자:    http://localhost:${PORT}/admin.html\n`);
});
