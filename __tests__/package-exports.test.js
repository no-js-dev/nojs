/**
 * @jest-environment node
 *
 * #333 — the published package must be importable by bare specifier.
 *
 * Packs the repo with `npm pack`, installs the tarball into a throwaway
 * project, and imports `@no-js-dev/nojs/compiler` from a separate Node
 * process — exactly what an npm consumer (e.g. NoJS-Server) does.
 */

import { execFileSync, spawnSync } from 'child_process';
import { mkdtempSync, mkdirSync, rmSync, writeFileSync, readFileSync } from 'fs';
import { tmpdir } from 'os';
import { join, resolve } from 'path';

const ROOT = resolve(__dirname, '..');
const pkg = JSON.parse(readFileSync(join(ROOT, 'package.json'), 'utf8'));
const npm = process.platform === 'win32' ? 'npm.cmd' : 'npm';

let tmp;
let tarball;
let consumer;

function runModule(source) {
  const res = spawnSync(process.execPath, ['--input-type=module', '-e', source], {
    cwd: consumer,
    encoding: 'utf8',
  });
  if (res.status !== 0) throw new Error(`node exited ${res.status}: ${res.stderr}`);
  return res;
}

beforeAll(() => {
  tmp = mkdtempSync(join(tmpdir(), 'nojs-pack-'));
  const out = execFileSync(
    npm,
    ['pack', '--ignore-scripts', '--json', '--pack-destination', tmp],
    { cwd: ROOT, encoding: 'utf8' },
  );
  tarball = join(tmp, JSON.parse(out)[0].filename);

  consumer = join(tmp, 'consumer');
  mkdirSync(consumer);
  writeFileSync(
    join(consumer, 'package.json'),
    JSON.stringify({ name: 'consumer', private: true, type: 'module' }),
  );
  execFileSync(
    npm,
    ['install', tarball, '--ignore-scripts', '--no-audit', '--no-fund', '--offline'],
    { cwd: consumer, encoding: 'utf8' },
  );
}, 120000);

afterAll(() => {
  if (tmp) rmSync(tmp, { recursive: true, force: true });
});

describe('packed tarball', () => {
  test('ships only src, dist, types and package metadata', () => {
    const out = execFileSync(npm, ['pack', '--ignore-scripts', '--dry-run', '--json'], {
      cwd: ROOT,
      encoding: 'utf8',
    });
    const roots = new Set(JSON.parse(out)[0].files.map((f) => f.path.split('/')[0]));
    for (const r of roots) {
      expect(['src', 'dist', 'types', 'package.json', 'README.md', 'LICENSE']).toContain(r);
    }
    for (const r of ['src', 'dist', 'types', 'package.json']) expect(roots.has(r)).toBe(true);
  });
});

describe('bare-specifier import of @no-js-dev/nojs/compiler', () => {
  test('exposes the ADR-024 parser surface as functions', () => {
    const { stdout } = runModule(`
      import * as c from '${pkg.name}/compiler';
      console.log(JSON.stringify({
        parseExpression: typeof c.parseExpression,
        parseStatements: typeof c.parseStatements,
        segmentPipes: typeof c.segmentPipes,
        evaluate: typeof c.evaluate,
      }));
    `);
    expect(JSON.parse(stdout)).toEqual({
      parseExpression: 'function',
      parseStatements: 'function',
      segmentPipes: 'function',
      evaluate: 'function',
    });
  });

  test('parseExpression("a | upper") returns the documented AST (pipes are not split)', () => {
    const { stdout } = runModule(`
      import { parseExpression, segmentPipes } from '${pkg.name}/compiler';
      console.log(JSON.stringify({
        ast: parseExpression('a | upper'),
        segments: segmentPipes('a | upper'),
      }));
    `);
    expect(JSON.parse(stdout)).toEqual({
      ast: {
        type: 'BinaryExpr',
        op: '|',
        left: { type: 'Identifier', name: 'a' },
        right: { type: 'Identifier', name: 'upper' },
      },
      segments: ['a', 'upper'],
    });
  });

  test('parseStatements returns an AST array', () => {
    const { stdout } = runModule(`
      import { parseStatements } from '${pkg.name}/compiler';
      console.log(JSON.stringify(parseStatements('count++; name = "x"').map((n) => n.type)));
    `);
    expect(JSON.parse(stdout)).toEqual(['PostfixExpr', 'AssignExpr']);
  });

  test('loads without a module-type warning from node_modules', () => {
    const { stderr } = runModule(`import '${pkg.name}/compiler';`);
    expect(stderr).not.toMatch(/MODULE_TYPELESS_PACKAGE_JSON/);
  });
});

describe('export map subpaths', () => {
  test.each([
    ['.', 'src/index.js'],
    ['/compiler', 'dist/compiler/compiler.mjs'],
    ['/src/evaluate.js', 'src/evaluate.js'],
    ['/dist/iife/no.js', 'dist/iife/no.js'],
    ['/package.json', 'package.json'],
  ])('%s resolves to %s', (sub, target) => {
    const spec = sub === '.' ? pkg.name : pkg.name + sub;
    const { stdout } = runModule(`console.log(import.meta.resolve('${spec}'));`);
    expect(stdout.trim()).toMatch(new RegExp(`/node_modules/@no-js-dev/nojs/${target.replace(/\./g, '\\.')}$`));
  });

  test('unexported internals are not reachable', () => {
    const res = spawnSync(
      process.execPath,
      ['--input-type=module', '-e', `import.meta.resolve('${pkg.name}/build.js')`],
      { cwd: consumer, encoding: 'utf8' },
    );
    expect(res.status).not.toBe(0);
    expect(res.stderr).toMatch(/ERR_PACKAGE_PATH_NOT_EXPORTED/);
  });
});
