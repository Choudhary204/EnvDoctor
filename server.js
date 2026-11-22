/**
 * @file server.js
 * @description Local HTTP server serving the EnvDoctor interactive demo playground,
 * static HTML diagnostic report, and JSON diagnostic API.
 */

import http from 'node:http';
import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { diagnose } from './src/index.js';
import { renderHTML } from './src/reporters/html.js';
import { renderJSON } from './src/reporters/json.js';

const PORT = process.env.PORT || 3333;
const envFile = existsSync(resolve('.env')) ? '.env' : 'test/fixtures/.env.test';
const demoHtmlPath = resolve('docs/index.html');

const server = http.createServer(async (req, res) => {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  const url = new URL(req.url, `http://${req.headers.host}`);

  try {
    // Interactive Web Demo / Playground
    if (url.pathname === '/' || url.pathname === '/demo') {
      if (existsSync(demoHtmlPath)) {
        const demoHtml = readFileSync(demoHtmlPath, 'utf8');
        res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
        res.end(demoHtml);
        return;
      }
    }

    const report = await diagnose({
      filePath: envFile,
      required: ['PORT', 'DATABASE_URL', 'JWT_SECRET'],
      rules: {
        PORT: 'port',
        DATABASE_URL: 'url',
        JWT_SECRET: { type: 'string', minLength: 16 },
        DEBUG: 'boolean',
      },
      checkGit: true,
    });

    if (url.pathname === '/api/diagnose' || url.pathname === '/api/report') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(renderJSON(report));
      return;
    }

    if (url.pathname === '/report') {
      const html = renderHTML(report);
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end(html);
      return;
    }

    res.writeHead(404, { 'Content-Type': 'text/plain' });
    res.end('Not Found');
  } catch (err) {
    res.writeHead(500, { 'Content-Type': 'text/plain' });
    res.end(`Internal Server Error: ${err.message}`);
  }
});

server.listen(PORT, () => {
  console.log(`🩺 EnvDoctor server running at http://localhost:${PORT}`);
  console.log(`   - Interactive Demo: http://localhost:${PORT}/`);
  console.log(`   - Static Report:    http://localhost:${PORT}/report`);
  console.log(`   - JSON API:         http://localhost:${PORT}/api/diagnose`);
  console.log(`   - Scanning:         ${envFile}`);
});
