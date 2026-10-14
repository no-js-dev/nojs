import NoJS from '../src/index.js';
import { _config, _plugins, _interceptors, _globals, _globalOwners, _setDisposing, _setCurrentPluginName } from '../src/globals.js';
import { _doFetch } from '../src/fetch.js';
import { createContext } from '../src/context.js';
import { evaluate, _execStatement } from '../src/evaluate.js';

describe('plugin trust-boundary hardening', () => {
  beforeEach(() => {
    _plugins.clear(); _interceptors.request = []; _interceptors.response = [];
    _setDisposing(false); _setCurrentPluginName(null);
    for (const k in _globals) delete _globals[k];
    for (const k in _globalOwners) delete _globalOwners[k];
    _config.headers = { Authorization: 'Bearer SECRET' }; _config.csrf = null; _config.baseApiUrl = '';
    global.fetch = jest.fn().mockResolvedValue({ ok: true, status: 200, statusText: 'OK', headers: new Headers(), url: '/api/me', text: () => Promise.resolve('{}'), json: () => Promise.resolve({}) });
  });

  test('API-002 — a plugin cannot grant itself trusted access by mutating its options', async () => {
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => {});
    let seen;
    NoJS.use({ name: 'analytics', install(app, options) {
      options.trusted = true;
      app.interceptor('request', (url, opts) => { seen = opts.headers.Authorization; });
    } });
    await _doFetch('/api/me');
    warn.mockRestore();
    expect(seen).toBeUndefined();
  });

  test('API-002 — a later mutation of the options object does not grant trust', async () => {
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => {});
    let seen;
    const options = {};
    NoJS.use({ name: 'late', install(app) {
      app.interceptor('request', (url, opts) => { seen = opts.headers.Authorization; });
    } }, options);
    options.trusted = true;
    await _doFetch('/api/me');
    warn.mockRestore();
    expect(seen).toBeUndefined();
  });

  test('API-002 — interceptor() ignores a caller-supplied pluginName', async () => {
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => {});
    NoJS.use({ name: 'auth', install() {} }, { trusted: true });
    let seen;
    NoJS.interceptor('request', { pluginName: 'auth', fn: (url, opts) => { seen = opts.headers.Authorization; } });
    await _doFetch('/api/me');
    warn.mockRestore();
    expect(seen).toBeUndefined();
  });

  test('API-008 — a bound Function is rejected by global()', () => {
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => {});
    window.__pwned = 0;
    NoJS.global('F', Function.bind(null));
    _execStatement("$F('window.__pwned = 1')()", createContext({}));
    warn.mockRestore();
    expect(window.__pwned).toBe(0);
  });

  test('API-008 — a bound Function nested in a non-serialisable object is rejected', () => {
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => {});
    window.__pwned2 = 0;
    NoJS.global('utils', { big: 1n, make: Function.bind(null) });
    _execStatement("$utils.make('window.__pwned2 = 1')()", createContext({}));
    warn.mockRestore();
    expect(window.__pwned2).toBe(0);
  });

  test('API-008 — the real window is rejected by global()', () => {
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => {});
    NoJS.global('w', window);
    warn.mockRestore();
    expect(evaluate('typeof $w.localStorage', createContext({}))).toBe('undefined');
  });

  // v1.21.1: dispose() lifts the lock so the app can be reconfigured and re-initialised
  test('API-010 — dispose() lifts the sanitize config lock, as in v1.21.1', async () => {
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => {});
    NoJS._initialized = false;
    _config.sanitize = true; _config.dangerouslyDisableSanitize = false; _config.sanitizeHtml = null;
    document.body.innerHTML = '<div id="app"></div>';
    await NoJS.init();
    await NoJS.dispose();
    NoJS.config({ dangerouslyDisableSanitize: true });
    warn.mockRestore();
    expect(_config.dangerouslyDisableSanitize).toBe(true);
    _config.dangerouslyDisableSanitize = false;
  });

  test('API-010 — dispose → config(sanitize) → init applies the new config and re-locks it', async () => {
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => {});
    _config.sanitize = true; _config.dangerouslyDisableSanitize = false; _config.sanitizeHtml = null;
    document.body.innerHTML = '<div id="app"></div>';
    await NoJS.init();

    NoJS.config({ sanitizeHtml: (html) => html.toUpperCase() });
    expect(_config.sanitizeHtml).toBeNull(); // locked while initialised

    await NoJS.dispose();
    const custom = (html) => html.replace(/<em>/g, '<strong>').replace(/<\/em>/g, '</strong>');
    NoJS.config({ sanitizeHtml: custom });
    expect(_config.sanitizeHtml).toBe(custom);

    document.body.innerHTML = `<div state="{ h: '<em>hi</em>' }"><p id="out" bind-html="h"></p></div>`;
    await NoJS.init();
    expect(document.querySelector('#out strong').textContent).toBe('hi');

    NoJS.config({ sanitizeHtml: null });
    expect(_config.sanitizeHtml).toBe(custom); // locked again after the new init()

    await NoJS.dispose();
    NoJS.config({ sanitizeHtml: null });
    warn.mockRestore();
    expect(_config.sanitizeHtml).toBeNull();
  });
});
