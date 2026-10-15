import { _config } from '../src/globals.js';
import NoJS from '../src/index.js';
import { initDevtools, destroyDevtools } from '../src/devtools.js';

import '../src/directives/state.js';

// ═══════════════════════════════════════════════════════════════════════
//  COMPAT FLAGS
//
//  Opt-in hardening flags must default to v1.21.1 behavior (all false)
//  and be settable through NoJS.config() before and after init without
//  wiping sibling keys of nested config objects.
// ═══════════════════════════════════════════════════════════════════════

const TOP_LEVEL_FLAGS = ['scopeHeaders', 'strictRedaction', 'strictDirectives', 'strictDevtools', 'strictJsonld'];

// Config keys of v1.21.1 (src/globals.js). The flags are the only additions.
const V1_21_1_TOP_LEVEL_KEYS = [
  'baseApiUrl', 'headers', 'timeout', 'retries', 'retryDelay', 'credentials', 'csrf', 'cache',
  'templates', 'router', 'i18n', 'debug', 'devtools', 'sanitize', 'dangerouslyDisableSanitize',
  'sanitizeHtml', 'exprCacheSize', 'maxEventListeners', 'appId',
];
const V1_21_1_I18N = {
  defaultLocale: 'en', fallbackLocale: 'en', detectBrowser: false, loadPath: null, ns: [],
  supportedLocales: [], cache: true, persist: false,
};

let snapshot;

beforeEach(() => {
  snapshot = {
    top: Object.fromEntries(TOP_LEVEL_FLAGS.map((k) => [k, _config[k]])),
    templates: { ..._config.templates },
    i18n: { ..._config.i18n },
    devtools: _config.devtools,
  };
});

afterEach(() => {
  Object.assign(_config, snapshot.top);
  _config.templates = snapshot.templates;
  _config.i18n = snapshot.i18n;
  _config.devtools = snapshot.devtools;
  document.body.innerHTML = '';
});

describe('Compat flags — defaults', () => {
  test.each(TOP_LEVEL_FLAGS)('1 — %s defaults to false', (flag) => {
    expect(flag in _config).toBe(true);
    expect(_config[flag]).toBe(false);
  });

  test('2 — templates.pageRelative defaults to false', () => {
    expect(_config.templates).toEqual({ cache: true, pageRelative: false });
  });

  test('3 — i18n.escapeParams and i18n.strictLocale default to false', () => {
    expect(_config.i18n.escapeParams).toBe(false);
    expect(_config.i18n.strictLocale).toBe(false);
  });

  test('4 — devtools stays a boolean defaulting to false', () => {
    expect(_config.devtools).toBe(false);
  });

  test('5 — the flags are the only keys added to the v1.21.1 config', () => {
    expect(Object.keys(_config).sort()).toEqual([...V1_21_1_TOP_LEVEL_KEYS, ...TOP_LEVEL_FLAGS].sort());
    expect(_config.i18n).toEqual({ ...V1_21_1_I18N, escapeParams: false, strictLocale: false });
  });
});

describe('Compat flags — settable through NoJS.config()', () => {
  test.each(TOP_LEVEL_FLAGS)('6 — %s can be enabled and disabled before init', (flag) => {
    NoJS.config({ [flag]: true });
    expect(_config[flag]).toBe(true);
    NoJS.config({ [flag]: false });
    expect(_config[flag]).toBe(false);
  });

  test('7 — templates.pageRelative can be set', () => {
    NoJS.config({ templates: { pageRelative: true } });
    expect(_config.templates.pageRelative).toBe(true);
  });

  test('8 — i18n.escapeParams and i18n.strictLocale can be set', () => {
    NoJS.config({ i18n: { escapeParams: true, strictLocale: true } });
    expect(_config.i18n.escapeParams).toBe(true);
    expect(_config.i18n.strictLocale).toBe(true);
  });

  test('9 — all flags are settable after init and not locked', async () => {
    const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
    document.body.innerHTML = '<div state="{}"></div>';
    await NoJS.init();

    NoJS.config({
      scopeHeaders: true,
      strictRedaction: true,
      strictDirectives: true,
      strictDevtools: true,
      strictJsonld: true,
      templates: { pageRelative: true },
      i18n: { escapeParams: true, strictLocale: true },
    });

    for (const flag of TOP_LEVEL_FLAGS) expect(_config[flag]).toBe(true);
    expect(_config.templates.pageRelative).toBe(true);
    expect(_config.i18n.escapeParams).toBe(true);
    expect(_config.i18n.strictLocale).toBe(true);
    expect(warnSpy).not.toHaveBeenCalledWith(
      expect.anything(),
      expect.stringContaining('cannot be changed after init'),
    );
    warnSpy.mockRestore();
  });
});

describe('Compat flags — nested merges keep sibling keys', () => {
  test('10 — setting templates.pageRelative keeps templates.cache', () => {
    NoJS.config({ templates: { cache: false } });
    NoJS.config({ templates: { pageRelative: true } });
    expect(_config.templates).toEqual({ cache: false, pageRelative: true });
  });

  test('11 — setting templates.cache keeps templates.pageRelative', () => {
    NoJS.config({ templates: { pageRelative: true } });
    NoJS.config({ templates: { cache: false } });
    expect(_config.templates.pageRelative).toBe(true);
  });

  test('12 — setting i18n flags keeps the other i18n settings', () => {
    NoJS.config({ i18n: { ns: ['common'], cache: false, supportedLocales: ['en', 'pt'] } });
    const before = { ..._config.i18n };

    NoJS.config({ i18n: { escapeParams: true, strictLocale: true } });

    expect(_config.i18n).toEqual({ ...before, escapeParams: true, strictLocale: true });
  });

  test('13 — setting other i18n keys keeps the i18n flags', () => {
    NoJS.config({ i18n: { escapeParams: true, strictLocale: true } });
    NoJS.config({ i18n: { fallbackLocale: 'pt' } });
    expect(_config.i18n.escapeParams).toBe(true);
    expect(_config.i18n.strictLocale).toBe(true);
    expect(_config.i18n.fallbackLocale).toBe('pt');
  });

  test('14 — top-level flags do not disturb nested objects', () => {
    const templates = { ..._config.templates };
    const i18n = { ..._config.i18n };
    NoJS.config({ scopeHeaders: true, strictRedaction: true, strictJsonld: true });
    expect(_config.templates).toEqual(templates);
    expect(_config.i18n).toEqual(i18n);
  });

  test('15 — strictDevtools does not change the devtools boolean', () => {
    NoJS.config({ strictDevtools: true });
    expect(_config.devtools).toBe(false);
    NoJS.config({ devtools: true });
    expect(_config.strictDevtools).toBe(true);
  });
});

describe('Compat flags — devtools config views', () => {
  function getConfig() {
    return new Promise((resolve) => {
      const handler = (e) => {
        if (e.detail.command !== 'get:config') return;
        window.removeEventListener('nojs:devtools:response', handler);
        resolve(e.detail.result);
      };
      window.addEventListener('nojs:devtools:response', handler);
      window.dispatchEvent(new CustomEvent('nojs:devtools:cmd', { detail: { command: 'get:config', args: {} } }));
    });
  }

  let logSpy;

  beforeEach(() => {
    logSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    _config.devtools = true;
    initDevtools(NoJS);
  });

  afterEach(() => {
    destroyDevtools();
    logSpy.mockRestore();
    delete _config.csrf;
    _config.headers = {};
  });

  test('16 — get:config keeps v1.21.1 redaction and shows the flags as plain false values', async () => {
    _config.headers = { Authorization: 'Bearer secret' };
    _config.csrf = { token: 'secret-token', header: 'X-CSRF-Token' };

    const result = await getConfig();

    expect(result.headers).toBe('[REDACTED]');
    expect(result.csrf).toEqual({ token: '[REDACTED]', header: 'X-CSRF-Token' });
    for (const flag of TOP_LEVEL_FLAGS) expect(result[flag]).toBe(false);
    expect(result.templates).toEqual({ cache: true, pageRelative: false });
    expect(result.i18n.escapeParams).toBe(false);
    expect(result.i18n.strictLocale).toBe(false);
    expect(() => JSON.stringify(result)).not.toThrow();
  });

  test('17 — the devtools config getter shows the flags without exposing a writable _config', () => {
    const exposed = window.__NOJS_DEVTOOLS__.config;

    for (const flag of TOP_LEVEL_FLAGS) expect(exposed[flag]).toBe(false);
    expect(exposed.i18n.strictLocale).toBe(false);

    exposed.strictRedaction = true;
    exposed.i18n.escapeParams = true;
    expect(_config.strictRedaction).toBe(false);
    expect(_config.i18n.escapeParams).toBe(false);
  });
});
