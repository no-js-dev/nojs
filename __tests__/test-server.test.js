/** @jest-environment node */
const fs = require('fs');
const os = require('os');
const path = require('path');
const http = require('http');
const net = require('net');
const { spawn } = require('child_process');

const SERVER_SRC = path.resolve(__dirname, '..', 'test-server.js');

function freePort() {
  return new Promise((resolve, reject) => {
    const s = net.createServer();
    s.once('error', reject);
    s.listen(0, '127.0.0.1', () => {
      const { port } = s.address();
      s.close(() => resolve(port));
    });
  });
}

// Raw request path (no client-side normalisation of ".."), resolves with { status, body }
function get(port, rawPath) {
  return new Promise((resolve, reject) => {
    http.get({ host: '127.0.0.1', port, path: rawPath }, (res) => {
      let body = '';
      res.on('data', (c) => (body += c));
      res.on('end', () => resolve({ status: res.statusCode, body }));
    }).on('error', reject);
  });
}

describe('test-server path guard', () => {
  let base, child, port;

  beforeAll(async () => {
    // <base>/app is the served ROOT; <base>/app-private shares its name prefix
    base = fs.mkdtempSync(path.join(os.tmpdir(), 'nojs-test-server-'));
    fs.mkdirSync(path.join(base, 'app', 'docs'), { recursive: true });
    fs.mkdirSync(path.join(base, 'app-private'));
    fs.writeFileSync(path.join(base, 'app', 'docs', 'index.html'), '<p>docs</p>');
    fs.writeFileSync(path.join(base, 'app', 'docs', 'ok.json'), '{"ok":true}');
    fs.writeFileSync(path.join(base, 'app-private', 'secret.json'), '{"SECRET":"hunter2"}');
    fs.copyFileSync(SERVER_SRC, path.join(base, 'app', 'test-server.js'));

    port = await freePort();
    child = spawn(process.execPath, ['test-server.js'], {
      cwd: path.join(base, 'app'),
      env: { ...process.env, PORT: String(port) },
    });
    await new Promise((resolve, reject) => {
      child.once('error', reject);
      child.once('exit', (code) => reject(new Error('test-server exited early: ' + code)));
      child.stdout.on('data', (d) => { if (String(d).includes('Test Server')) resolve(); });
    });
  });

  afterAll(() => {
    if (child) { child.removeAllListeners('exit'); child.kill(); }
    if (base) fs.rmSync(base, { recursive: true, force: true });
  });

  test('sibling directory sharing the ROOT name prefix is forbidden', async () => {
    const res = await get(port, '/../app-private/secret.json');
    expect(res.status).toBe(403);
    expect(res.body).not.toContain('hunter2');
  });

  test('plain traversal outside ROOT is forbidden', async () => {
    const res = await get(port, '/../../etc/passwd.json');
    expect(res.status).toBe(403);
  });

  test('files inside ROOT are still served', async () => {
    const res = await get(port, '/docs/ok.json');
    expect(res.status).toBe(200);
    expect(res.body).toBe('{"ok":true}');
  });
});
