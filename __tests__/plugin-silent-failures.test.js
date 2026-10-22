/**
 * Diagnostics for plugin/global/interceptor cases that used to fail silently.
 *
 * - NoJS.global() stores objects as a JSON copy, which drops nested functions
 *   and class-instance methods: warn, naming the dropped paths. What gets
 *   stored is unchanged.
 * - A sensitive header set by an untrusted request interceptor is discarded:
 *   warn once per interceptor and header name, never logging the value.
 * - `trusted: true` on the plugin object is ignored: warn in NoJS.use().
 */

import NoJS from '../src/index.js';
import {
  _config,
  _stores,
  _storeWatchers,
  _plugins,
  _globals,
  _globalOwners,
  _interceptors,
  _setCurrentPluginName,
} from '../src/globals.js';
import { evaluate } from '../src/evaluate.js';
import { _doFetch } from '../src/fetch.js';
import { createContext } from '../src/context.js';

let warnSpy;
const warnings = () => warnSpy.mock.calls.map((c) => c.map(String).join(' '));
const matching = (re) => warnings().filter((w) => re.test(w));

beforeEach(() => {
  warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
  document.body.innerHTML = '';
  _config.debug = false;
  _config.baseApiUrl = '';
  _config.headers = {};
  _config.csrf = null;
  _config.retries = 0;
  _config.timeout = 10000;
  _config.cache = { strategy: 'none', ttl: 300000 };
  _config.strictRedaction = false;
  _interceptors.request.length = 0;
  _interceptors.response.length = 0;
  _plugins.clear();
  for (const k in _globals) delete _globals[k];
  for (const k in _globalOwners) delete _globalOwners[k];
  _setCurrentPluginName(null);
});

afterEach(() => {
  warnSpy.mockRestore();
  document.body.innerHTML = '';
  Object.keys(_stores).forEach((k) => delete _stores[k]);
  _storeWatchers.clear();
  _interceptors.request.length = 0;
});

// ═══════════════════════════════════════════════════════════════════════
//  NoJS.global(): functions dropped by the JSON copy
// ═══════════════════════════════════════════════════════════════════════

describe('NoJS.global() warns when the JSON copy drops functions', () => {
  const DROP = /drops function values/;

  test('object of actions: warns with every dropped path; stored value unchanged', () => {
    NoJS.global('actions', { save() {}, label: (n) => n, title: 'T', nested: { run() {} } });

    const w = matching(DROP);
    expect(w).toHaveLength(1);
    expect(w[0]).toContain('"$actions"');
    expect(w[0]).toContain('$actions.save, $actions.label, $actions.nested.run');
    expect(w[0]).toContain('NoJS.global("fnName", fn)');
    expect(w[0]).toContain('custom directive');

    expect(_globals.actions.title).toBe('T');
    expect(_globals.actions.save).toBeUndefined();
    expect(_globals.actions.nested.run).toBeUndefined();
    expect(Object.keys(_globals.actions.__raw ?? _globals.actions).sort()).toEqual(['nested', 'title']);
    expect(evaluate('$actions.label(1)', createContext({}))).toBeUndefined();
  });

  test('class instance: prototype methods (incl. inherited) are named', () => {
    class Base { ping() {} }
    class Editor extends Base {
      constructor() { super(); this.mode = 'edit'; }
      run() {}
      get size() { return 1; }
    }
    NoJS.global('ed', new Editor());

    const w = matching(DROP);
    expect(w).toHaveLength(1);
    expect(w[0]).toContain('$ed.run, $ed.ping');
    expect(w[0]).not.toContain('$ed.size');
    expect(w[0]).not.toContain('constructor');
    expect(_globals.ed.mode).toBe('edit');
    expect(_globals.ed.run).toBeUndefined();
  });

  test('methods inherited through Object.create() are named', () => {
    NoJS.global('oc', Object.create({ go() {} }, { k: { value: 1, enumerable: true } }));
    expect(matching(DROP)[0]).toContain('$oc.go');
    expect(_globals.oc.k).toBe(1);
  });

  test('functions inside arrays are reported with index paths', () => {
    NoJS.global('list', { items: [1, () => 1, { go() {} }] });
    const w = matching(DROP);
    expect(w).toHaveLength(1);
    expect(w[0]).toContain('$list.items[1], $list.items[2].go');
    expect(_globals.list.items[1]).toBeNull();
  });

  test('the path list is capped', () => {
    const many = {};
    for (let i = 0; i < 8; i++) many['f' + i] = () => i;
    NoJS.global('many', many);
    const w = matching(DROP)[0];
    expect(w).toContain('$many.f4');
    expect(w).not.toContain('$many.f5');
    expect(w).toContain('(and 3 more)');
  });

  test('no warning for plain data, top-level functions, Dates, Maps or proxies', () => {
    NoJS.global('data', { a: 1, b: [1, 2, { c: 'x' }], d: null });
    NoJS.global('fn', () => 1);
    NoJS.global('when', { at: new Date(0) });
    NoJS.global('map', { m: new Map([[1, 2]]), s: new Set([1]) });
    NoJS.global('proxied', createContext({ go() {} }));
    expect(matching(DROP)).toHaveLength(0);
    expect(typeof _globals.fn).toBe('function');
    expect(_globals.when.at).toBe(new Date(0).toJSON());
  });

  test('cyclic objects skip the JSON copy and keep their functions (no warning)', () => {
    const obj = { go() { return 'went'; } };
    obj.self = obj;
    NoJS.global('cyc', obj);
    expect(matching(DROP)).toHaveLength(0);
    expect(typeof _globals.cyc.go).toBe('function');
  });

  test('accessor properties are not invoked by the scan', () => {
    let reads = 0;
    const obj = { get v() { reads++; return 1; } };
    NoJS.global('acc', obj);
    expect(reads).toBe(1); // JSON.stringify only
    expect(_globals.acc.v).toBe(1);
  });

  test('a scan failure never changes what gets stored', () => {
    // Throws on the first descriptor lookup only (the scan); JSON.stringify
    // afterwards sees a normal object, as it would without the scan.
    let thrown = false;
    const hostile = new Proxy({ a: 1 }, {
      getOwnPropertyDescriptor(t, k) {
        if (!thrown) { thrown = true; throw new Error('boom'); }
        return Reflect.getOwnPropertyDescriptor(t, k);
      },
    });
    expect(() => NoJS.global('hostile', hostile)).not.toThrow();
    expect(thrown).toBe(true);
    expect(_globals.hostile.a).toBe(1);
    expect(matching(DROP)).toHaveLength(0);
  });

  test('plugin-registered globals warn the same way', () => {
    NoJS.use({ name: 'ed-plugin', install(app) { app.global('editor', { run() {} }); } });
    expect(matching(DROP)[0]).toContain('$editor.run');
  });
});

// ═══════════════════════════════════════════════════════════════════════
//  Interceptors: sensitive headers from untrusted interceptors
// ═══════════════════════════════════════════════════════════════════════

describe('untrusted interceptor setting a sensitive header', () => {
  let originalFetch;
  const sent = () => global.fetch.mock.calls.map((c) => c[1].headers);
  const DISCARD = /set sensitive header/;

  beforeEach(() => {
    originalFetch = global.fetch;
    global.fetch = jest.fn().mockImplementation(() =>
      Promise.resolve({ ok: true, status: 200, headers: new Headers(), text: () => Promise.resolve('{}') }),
    );
  });
  afterEach(() => {
    global.fetch = originalFetch;
  });

  test('app-level interceptor: header discarded (unchanged), warns once per header, no value logged', async () => {
    NoJS.interceptor('request', (url, opts) => ({
      ...opts,
      headers: { ...opts.headers, 'X-CSRF-Token': 'secret-tok', Authorization: 'Bearer secret-ab', 'X-Debug': '1' },
    }));

    await _doFetch('/api/a', 'POST', {});
    await _doFetch('/api/b', 'POST', {});

    for (const h of sent()) {
      expect(h['X-Debug']).toBe('1');
      expect(h['X-CSRF-Token']).toBeUndefined();
      expect(h.Authorization).toBeUndefined();
    }
    const w = matching(DISCARD);
    expect(w).toHaveLength(2);
    expect(w[0]).toContain('Request interceptor [0] set sensitive header "X-CSRF-Token"');
    expect(w[1]).toContain('"Authorization"');
    for (const m of w) {
      expect(m).toContain('NoJS.use(plugin, { trusted: true })');
      expect(m).toContain('NoJS.config({ csrf: { token } })');
    }
    expect(warnings().join('\n')).not.toMatch(/secret-/);
  });

  test('header-name case variants of the same header warn once', async () => {
    let n = 0;
    NoJS.interceptor('request', (url, opts) => ({
      ...opts,
      headers: { ...opts.headers, [n++ % 2 ? 'x-csrf-token' : 'X-CSRF-Token']: 't' },
    }));
    await _doFetch('/api/a', 'POST', {});
    await _doFetch('/api/b', 'POST', {});
    expect(matching(DISCARD)).toHaveLength(1);
  });

  test('each interceptor warns on its own; plugin name is included', async () => {
    NoJS.use({
      name: 'auth-plugin',
      install(app) {
        app.interceptor('request', (url, opts) => ({ ...opts, headers: { ...opts.headers, Authorization: 'x' } }));
      },
    });
    NoJS.interceptor('request', (url, opts) => ({ ...opts, headers: { ...opts.headers, Authorization: 'y' } }));
    await _doFetch('/api/a');
    await _doFetch('/api/a');
    const w = matching(DISCARD);
    expect(w).toHaveLength(2);
    expect(w[0]).toContain('Request interceptor [0] (plugin "auth-plugin")');
    expect(w[1]).toContain('Request interceptor [1] set');
  });

  test('config csrf token is kept and untrusted override still discarded (warns)', async () => {
    _config.csrf = { header: 'X-CSRF-Token', token: 'cfgtok' };
    NoJS.interceptor('request', (url, opts) => ({ ...opts, headers: { ...opts.headers, 'X-CSRF-Token': 'evil' } }));
    await _doFetch('/api/a', 'POST', {});
    expect(sent()[0]['X-CSRF-Token']).toBe('cfgtok');
    expect(matching(DISCARD)).toHaveLength(1);
  });

  test('trusted plugin interceptor sets the header without a warning', async () => {
    NoJS.use(
      {
        name: 'trusted-auth',
        install(app) {
          app.interceptor('request', (url, opts) => ({ ...opts, headers: { ...opts.headers, 'X-CSRF-Token': 'tok' } }));
        },
      },
      { trusted: true },
    );
    await _doFetch('/api/a', 'POST', {});
    expect(sent()[0]['X-CSRF-Token']).toBe('tok');
    expect(matching(DISCARD)).toHaveLength(0);
  });

  test('passing untouched opts through (no sensitive key added) does not warn', async () => {
    _config.headers = { Authorization: 'Bearer cfg' };
    NoJS.interceptor('request', (url, opts) => opts);
    NoJS.interceptor('request', (url, opts) => ({ ...opts, headers: { ...opts.headers, 'X-Debug': '1' } }));
    await _doFetch('/api/a');
    expect(sent()[0].Authorization).toBe('Bearer cfg');
    expect(matching(DISCARD)).toHaveLength(0);
  });
});

// ═══════════════════════════════════════════════════════════════════════
//  NoJS.use(): trusted on the plugin object
// ═══════════════════════════════════════════════════════════════════════

describe('NoJS.use() with trusted: true on the plugin object', () => {
  const IGNORED = /sets trusted: true on the plugin object, which is ignored/;

  test('warns and does not grant trust', async () => {
    const originalFetch = global.fetch;
    global.fetch = jest.fn().mockResolvedValue({ ok: true, status: 200, headers: new Headers(), text: () => Promise.resolve('{}') });
    NoJS.use({
      name: 'obj-trusted',
      trusted: true,
      install(app) {
        app.interceptor('request', (url, opts) => ({ ...opts, headers: { ...opts.headers, 'X-CSRF-Token': 't' } }));
      },
    });
    const w = matching(IGNORED);
    expect(w).toHaveLength(1);
    expect(w[0]).toContain('"obj-trusted"');
    expect(w[0]).toContain('NoJS.use(plugin, { trusted: true })');
    expect(_plugins.get('obj-trusted').options.trusted).toBeUndefined();

    await _doFetch('/api/a', 'POST', {});
    expect(global.fetch.mock.calls[0][1].headers['X-CSRF-Token']).toBeUndefined();
    global.fetch = originalFetch;
  });

  test('no warning when trust is passed in options, or not requested', () => {
    NoJS.use({ name: 'both', trusted: true, install() {} }, { trusted: true });
    NoJS.use({ name: 'plain', install() {} });
    NoJS.use({ name: 'falsy', trusted: false, install() {} });
    expect(matching(IGNORED)).toHaveLength(0);
  });

  test('duplicate install of the same plugin does not warn again', () => {
    const p = { name: 'dup', trusted: true, install() {} };
    NoJS.use(p);
    NoJS.use(p);
    expect(matching(IGNORED)).toHaveLength(1);
  });
});
