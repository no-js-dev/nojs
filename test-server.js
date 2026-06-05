const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = process.env.PORT || 3000;
const ROOT = __dirname;
const LOCAL_BUILD = path.join(ROOT, 'dist/iife/no.js');
const LOCAL_ELEMENTS = path.join(ROOT, '..', 'NoJS-Elements', 'dist', 'iife', 'nojs-elements.js');
const LOCAL_ELEMENTS_SCRIPT = '/__local__/nojs-elements.js';

const CDN_PATTERN = /https:\/\/cdn\.no-js\.dev\//g;
const LOCAL_SCRIPT = '/__local__/no.js';

const MIME = {
  '.html': 'text/html',
  '.css':  'text/css',
  '.js':   'application/javascript',
  '.json': 'application/json',
  '.svg':  'image/svg+xml',
  '.png':  'image/png',
  '.ico':  'image/x-icon',
  '.woff2':'font/woff2',
  '.map':  'application/json',
  '.tpl':  'text/html',
  '.md':   'text/markdown',
};

function serveFile(filePath, res) {
  const ext = path.extname(filePath);

  // For HTML files: rewrite CDN URL → local path on-the-fly
  if (ext === '.html') {
    fs.readFile(filePath, 'utf8', (err, html) => {
      if (err) { res.writeHead(500); res.end('Error'); return; }
      const rewritten = html.replace(CDN_PATTERN, LOCAL_SCRIPT);
      res.writeHead(200, { 'Content-Type': 'text/html' });
      res.end(rewritten);
    });
    return;
  }

  res.writeHead(200, { 'Content-Type': MIME[ext] || 'application/octet-stream' });
  fs.createReadStream(filePath).pipe(res);
}

const server = http.createServer((req, res) => {
  let url = req.url.split('?')[0];

  // ── Serve local build at /__local__/no.js ──
  if (url === LOCAL_SCRIPT) {
    res.writeHead(200, { 'Content-Type': 'application/javascript' });
    fs.createReadStream(LOCAL_BUILD).pipe(res);
    return;
  }

  // ── Serve NoJS-Elements at /__local__/nojs-elements.js ──
  if (url === LOCAL_ELEMENTS_SCRIPT) {
    fs.stat(LOCAL_ELEMENTS, (err) => {
      if (err) { res.writeHead(404); res.end('NoJS-Elements build not found'); return; }
      res.writeHead(200, { 'Content-Type': 'application/javascript' });
      fs.createReadStream(LOCAL_ELEMENTS).pipe(res);
    });
    return;
  }

  // ── SPA fallback: root or extensionless path → docs/index.html ──
  let filePath = path.join(ROOT, url === '/' ? 'docs/index.html' : url);
  if (!path.extname(url)) filePath = path.join(ROOT, 'docs/index.html');

  // Path traversal guard: resolved path must stay within ROOT
  if (!filePath.startsWith(ROOT)) {
    res.writeHead(403);
    res.end('Forbidden');
    return;
  }

  fs.stat(filePath, (err, stats) => {
    if (err || !stats.isFile()) {
      // Fallback: try docs/ subdirectory (the docs site assets are under docs/)
      const docsPath = path.join(ROOT, 'docs', url);
      if (!docsPath.startsWith(ROOT)) {
        res.writeHead(403);
        res.end('Forbidden');
        return;
      }
      fs.stat(docsPath, (err2, stats2) => {
        if (err2 || !stats2?.isFile()) {
          res.writeHead(404);
          res.end('Not Found');
          return;
        }
        serveFile(docsPath, res);
      });
      return;
    }

    serveFile(filePath, res);
  });
});

server.listen(PORT, () => {
  console.log(`\n  🚀 No.JS Test Server — http://localhost:${PORT}`);
  console.log(`  📁 Serving from project root: ${ROOT}\n`);
});
