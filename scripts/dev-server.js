// Minimal dev server (no external deps):
// - Serves /public as static
// - POST /proxy to forward requests to http://localhost:11434 with CORS
// Usage: node scripts/dev-server.js

const http = require('http');
const fs = require('fs');
const path = require('path');
const url = require('url');

const PORT = process.env.PORT || 8080;
const OLLAMA_HOST = 'localhost';
const OLLAMA_PORT = 11434;

function setCORS(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
}

function serveStatic(req, res) {
  let pathname = url.parse(req.url).pathname;
  if (pathname === '/') pathname = '/test-ai.html';
  const filePath = path.join(__dirname, '..', 'public', pathname);
  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.statusCode = 404;
      res.end('Not Found');
      return;
    }
    const ext = path.extname(filePath).toLowerCase();
    const types = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png', '.json': 'application/json' };
    res.setHeader('Content-Type', types[ext] || 'application/octet-stream');
    res.end(data);
  });
}

function collectBody(req) {
  return new Promise((resolve) => {
    const chunks = [];
    req.on('data', (c) => chunks.push(c));
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
  });
}

function proxyToOllama(req, res, bodyText) {
  try {
    const payload = JSON.parse(bodyText || '{}');
    const targetUrl = new URL(payload.url);
    if (targetUrl.hostname !== 'localhost' || String(targetUrl.port || 11434) !== String(OLLAMA_PORT)) {
      res.statusCode = 400;
      res.end('Only http://localhost:11434 is allowed');
      return;
    }
    const method = (payload.method || 'GET').toUpperCase();
    const headers = payload.headers || {};
    const body = payload.body ? Buffer.from(payload.body) : null;

    const options = {
      hostname: OLLAMA_HOST,
      port: OLLAMA_PORT,
      path: targetUrl.pathname + (targetUrl.search || ''),
      method,
      headers: {
        ...headers,
        host: `${OLLAMA_HOST}:${OLLAMA_PORT}`,
        origin: undefined,
        referer: undefined,
      },
    };

    const prox = http.request(options, (pres) => {
      // forward status and content-type
      res.statusCode = pres.statusCode || 500;
      const ctype = pres.headers['content-type'] || 'application/json; charset=utf-8';
      res.setHeader('Content-Type', ctype);
      setCORS(res);
      pres.pipe(res);
    });
    prox.on('error', (e) => {
      res.statusCode = 502;
      res.end('Proxy error: ' + e.message);
    });
    if (body) prox.write(body);
    prox.end();
  } catch (e) {
    res.statusCode = 400;
    res.end('Bad request: ' + e.message);
  }
}

const server = http.createServer(async (req, res) => {
  setCORS(res);
  if (req.method === 'OPTIONS') {
    res.statusCode = 204;
    res.end();
    return;
  }
  if (req.url === '/proxy' && req.method === 'POST') {
    const bodyText = await collectBody(req);
    proxyToOllama(req, res, bodyText);
    return;
  }
  serveStatic(req, res);
});

server.listen(PORT, () => {
  console.log(`Dev server up: http://localhost:${PORT}/test-ai.html`);
});

