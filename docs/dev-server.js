const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 3000;
const DOCS = __dirname;
const PROJECT = path.resolve(DOCS, '..');
const LOCAL_BUILD = path.join(PROJECT, 'dist/iife/no.js');

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

// ── Mock API helpers for pagination demos ──────────────────────────

const TOTAL_DEMO_PAGES = 5;

function demoItemsHTML(page) {
  const start = (page - 1) * 5 + 1;
  const items = [];
  for (let i = start; i < start + 5; i++) {
    items.push(`<div class="pg-demo-item"><span class="pg-demo-num">${i}</span> Item #${i}</div>`);
  }
  return items.join('\n');
}

function demoFeedHTML(page) {
  const ts = Date.now();
  const items = [];
  for (let i = 0; i < 3; i++) {
    const id = (page - 1) * 3 + i + 1;
    items.push(`<div class="pg-demo-item pg-demo-feed"><span class="pg-demo-num">&#x25CF;</span> Update #${id} <span class="pg-demo-ts">${new Date(ts - id * 60000).toLocaleTimeString()}</span></div>`);
  }
  return items.join('\n');
}

function demoCursorItems(cursorParam) {
  const page = cursorParam ? parseInt(cursorParam.replace('page_', ''), 10) : 1;
  if (page > TOTAL_DEMO_PAGES) return { data: [], cursor: null };
  const items = [];
  for (let i = 0; i < 4; i++) {
    const id = (page - 1) * 4 + i + 1;
    items.push({ id, title: `Cursor Item #${id}` });
  }
  const nextCursor = page < TOTAL_DEMO_PAGES ? `page_${page + 1}` : null;
  return { data: items, cursor: nextCursor };
}

function handleDemoAPI(req, res, url, query) {
  // GET /api/demo/items?page=N
  if (url === '/api/demo/items') {
    const page = parseInt(query.page || '1', 10);
    if (page > TOTAL_DEMO_PAGES) {
      res.writeHead(200, { 'Content-Type': 'text/html', 'X-NoJS-Last-Page': 'true' });
      res.end('');
      return true;
    }
    res.writeHead(200, { 'Content-Type': 'text/html' });
    res.end(demoItemsHTML(page));
    return true;
  }

  // GET /api/demo/feed?page=N
  if (url === '/api/demo/feed') {
    const page = parseInt(query.page || '1', 10);
    if (page > TOTAL_DEMO_PAGES) {
      res.writeHead(200, { 'Content-Type': 'text/html', 'X-NoJS-Last-Page': 'true' });
      res.end('');
      return true;
    }
    res.writeHead(200, { 'Content-Type': 'text/html' });
    res.end(demoFeedHTML(page));
    return true;
  }

  // GET /api/demo/cursor-items?cursor=X
  if (url === '/api/demo/cursor-items') {
    const result = demoCursorItems(query.cursor || '');
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(result));
    return true;
  }

  // GET /api/demo/lazy-content (500ms delay)
  if (url === '/api/demo/lazy-content') {
    setTimeout(() => {
      res.writeHead(200, { 'Content-Type': 'text/html' });
      res.end('<div class="pg-demo-lazy-loaded"><strong>Lazy-loaded content</strong><p>This section was fetched only when it scrolled into the viewport.</p></div>');
    }, 500);
    return true;
  }

  // GET /api/demo/hover-preview
  if (url === '/api/demo/hover-preview') {
    res.writeHead(200, { 'Content-Type': 'text/html' });
    res.end('<div class="pg-demo-hover-content"><strong>Preview loaded!</strong><p>This content was prefetched on hover.</p><p>Users see it instantly on click.</p></div>');
    return true;
  }

  return false;
}

// ────────────────────────────────────────────────────────────────────

const server = http.createServer((req, res) => {
  const fullUrl = req.url || '/';
  let url = fullUrl.split('?')[0];
  const queryString = fullUrl.includes('?') ? fullUrl.split('?')[1] : '';
  const query = {};
  queryString.split('&').forEach(pair => {
    const [k, v] = pair.split('=');
    if (k) query[decodeURIComponent(k)] = decodeURIComponent(v || '');
  });

  // ── Mock API routes for pagination demos ──
  if (url.startsWith('/api/demo/')) {
    if (handleDemoAPI(req, res, url, query)) return;
  }

  // ── Serve local build at /__local__/no.js ──
  if (url === LOCAL_SCRIPT) {
    console.log(`  ⚡ serving local build → dist/iife/no.js`);
    res.writeHead(200, { 'Content-Type': 'application/javascript' });
    fs.createReadStream(LOCAL_BUILD).pipe(res);
    return;
  }

  // ── SPA fallback: any extensionless path → index.html ──
  const filePath = path.join(DOCS, url === '/' ? 'index.html' : url);
  const resolvedPath = !path.extname(url) ? path.join(DOCS, 'index.html') : filePath;

  fs.stat(resolvedPath, (err, stats) => {
    if (err || !stats.isFile()) {
      res.writeHead(404);
      res.end('Not Found');
      return;
    }

    const ext = path.extname(resolvedPath);

    // ── For HTML files: rewrite CDN URL → local path on-the-fly ──
    if (ext === '.html') {
      fs.readFile(resolvedPath, 'utf8', (readErr, html) => {
        if (readErr) { res.writeHead(500); res.end('Error'); return; }
        const rewritten = html.replace(CDN_PATTERN, LOCAL_SCRIPT);
        res.writeHead(200, { 'Content-Type': 'text/html' });
        res.end(rewritten);
      });
      return;
    }

    res.writeHead(200, { 'Content-Type': MIME[ext] || 'application/octet-stream' });
    fs.createReadStream(resolvedPath).pipe(res);
  });
});

server.listen(PORT, () => {
  console.log(`\n  🚀 No.JS Docs — http://localhost:${PORT}`);
  console.log(`  ⚡ cdn.no-js.dev → local build (on-the-fly rewrite)`);
  console.log(`  📁 ${LOCAL_BUILD}\n`);
});
