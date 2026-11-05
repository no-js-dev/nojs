/**
 * @jest-environment node
 *
 * #333 — the package exports map must be purely additive.
 *
 * Packs the repo with `npm pack`, installs the tarball into a throwaway
 * project, and resolves/imports the package by bare specifier from a
 * separate Node process — exactly what an npm consumer does. Covers the
 * new `./compiler` entry, the unchanged root entry, and every deep import
 * the ecosystem repos use today (NoJS-Server, NoJS-Elements, NoJS-LSP,
 * NoJS-Skill — audited across all branches).
 */

import { execFileSync, spawnSync } from 'child_process';
import { mkdtempSync, mkdirSync, rmSync, writeFileSync, readFileSync } from 'fs';
import { tmpdir } from 'os';
import { join, resolve } from 'path';

const ROOT = resolve(__dirname, '..');
const pkg = JSON.parse(readFileSync(join(ROOT, 'package.json'), 'utf8'));
const npm = process.platform === 'win32' ? 'npm.cmd' : 'npm';

let tmp;
let consumer;

function runModule(source, nodeArgs = []) {
  const res = spawnSync(process.execPath, [...nodeArgs, '--input-type=module', '-e', source], {
    cwd: consumer,
    encoding: 'utf8',
  });
  if (res.status !== 0) throw new Error(`node exited ${res.status}: ${res.stderr}`);
  return res;
}

function resolved(spec, nodeArgs) {
  return runModule(`console.log(import.meta.resolve('${spec}'));`, nodeArgs).stdout.trim();
}

function installedPath(target) {
  return new RegExp(`/node_modules/@no-js-dev/nojs/${target.replace(/\./g, '\\.')}$`);
}

beforeAll(() => {
  tmp = mkdtempSync(join(tmpdir(), 'nojs-pack-'));
  const out = execFileSync(
    npm,
    ['pack', '--ignore-scripts', '--json', '--pack-destination', tmp],
    { cwd: ROOT, encoding: 'utf8' },
  );
  const tarball = join(tmp, JSON.parse(out)[0].filename);

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

describe('bare-specifier import of @no-js-dev/nojs/compiler', () => {
  test('exposes the ADR-024 parser surface as functions', () => {
    const { stdout } = runModule(`
      import * as c from '${pkg.name}/compiler';
      console.log(JSON.stringify(Object.fromEntries(Object.entries(c).map(([k, v]) => [k, typeof v]))));
    `);
    expect(JSON.parse(stdout)).toEqual({
      parseExpression: 'function',
      parseStatements: 'function',
      segmentPipes: 'function',
      evaluate: 'function',
    });
  });

  test('parseExpression returns the documented AST (pipes are not split)', () => {
    const { stdout } = runModule(`
      import { parseExpression, segmentPipes } from '${pkg.name}/compiler';
      console.log(JSON.stringify({
        ast: parseExpression('a | upper'),
        member: parseExpression('user.name'),
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
      member: {
        type: 'MemberExpr',
        object: { type: 'Identifier', name: 'user' },
        property: { type: 'Identifier', name: 'name' },
        computed: false,
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

  test('loads without a DOM and without a module-type warning', () => {
    const { stderr } = runModule(`
      import '${pkg.name}/compiler';
      if (typeof window !== 'undefined' || typeof document !== 'undefined') process.exit(2);
    `);
    expect(stderr).not.toMatch(/MODULE_TYPELESS_PACKAGE_JSON/);
  });

  test('is resolvable through require() as well', () => {
    const { stdout } = runModule(`
      import { createRequire } from 'module';
      const require = createRequire(import.meta.url);
      console.log(require.resolve('${pkg.name}/compiler'));
    `);
    expect(stdout.trim()).toMatch(installedPath('dist/compiler/compiler.mjs'));
  });
});

describe('root entry keeps resolving as before', () => {
  test('bundlers (browser condition) still get the CDN build, as the "browser" field did', () => {
    expect(resolved(pkg.name, ['--conditions=browser'])).toMatch(installedPath('dist/iife/no.js'));
  });

  test('Node import resolves to the ESM module entry', () => {
    expect(resolved(pkg.name)).toMatch(installedPath('src/index.js'));
  });

  test('Node require.resolve resolves to the ESM module entry', () => {
    const { stdout } = runModule(`
      import { createRequire } from 'module';
      const require = createRequire(import.meta.url);
      console.log(require.resolve('${pkg.name}'));
    `);
    expect(stdout.trim()).toMatch(installedPath('src/index.js'));
  });

  test('legacy package fields are untouched', () => {
    expect(pkg.browser).toBe('dist/iife/no.js');
    expect(pkg.unpkg).toBe('dist/iife/no.js');
    expect(pkg.jsdelivr).toBe('dist/iife/no.js');
    expect(pkg.types).toBe('./types/nojs-plugin.d.ts');
    expect(pkg.exports['.'].types).toBe(pkg.types);
  });
});

// Every deep import of this package found in the ecosystem repos (all
// branches, 2026-11). Removing one of these from the exports map breaks
// a consumer.
describe('audited deep imports stay reachable', () => {
  test.each([
    ['/compiler', 'dist/compiler/compiler.mjs'], // NoJS-Server src/compiler/core-loader.ts, e2e/runner/core.js
    ['/src/evaluate.js', 'src/evaluate.js'], // NoJS-Server src/types/nojs-core.d.ts (older branches)
    ['/src/index.js', 'src/index.js'], // core docs (plugins.md, llms-full.txt) legacy path
    ['/dist/iife/no.js', 'dist/iife/no.js'], // NoJS-Server e2e/runner/core.js
    ['/dist/iife/no.js.map', 'dist/iife/no.js.map'],
    ['/types/nojs-plugin.d.ts', 'types/nojs-plugin.d.ts'],
    ['/package.json', 'package.json'],
  ])('%s resolves to %s', (sub, target) => {
    expect(resolved(pkg.name + sub)).toMatch(installedPath(target));
  });

  test('deep src imports still load', () => {
    const { stdout } = runModule(`
      import { parseExpression } from '${pkg.name}/src/evaluate.js';
      import { createRequire } from 'module';
      const meta = createRequire(import.meta.url)('${pkg.name}/package.json');
      console.log(typeof parseExpression, meta.name);
    `);
    expect(stdout.trim()).toBe(`function ${pkg.name}`);
  });

  test('unlisted existing paths stay importable (catch-all "./*")', () => {
    expect(resolved(`${pkg.name}/build.js`)).toMatch(installedPath('build.js'));
    expect(resolved(`${pkg.name}/docs/llms.txt`)).toMatch(installedPath('docs/llms.txt'));
  });

  test('a non-existent path fails as not found, not as not exported', () => {
    const res = spawnSync(
      process.execPath,
      ['--input-type=module', '-e', `await import('${pkg.name}/does-not-exist.js')`],
      { cwd: consumer, encoding: 'utf8' },
    );
    expect(res.status).not.toBe(0);
    expect(res.stderr).toMatch(/ERR_MODULE_NOT_FOUND/);
    expect(res.stderr).not.toMatch(/ERR_PACKAGE_PATH_NOT_EXPORTED/);
  });
});
