import { _config } from '../src/globals.js';
import NoJS from '../src/index.js';

import '../src/directives/state.js';

// ═══════════════════════════════════════════════════════════════════════
//  COMPAT FLAGS
//
//  Opt-in hardening flags must default to v1.21.1 behavior (all false)
//  and be settable through NoJS.config() before and after init without
//  wiping sibling keys of nested config objects.
// ═══════════════════════════════════════════════════════════════════════

const TOP_LEVEL_FLAGS = ['scopeHeaders', 'strictRedaction', 'strictDirectives', 'strictDevtools', 'strictPersist', 'strictJsonld'];

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

  test('3 — i18n.escapeParams defaults to false', () => {
    expect(_config.i18n.escapeParams).toBe(false);
  });

  test('4 — devtools stays a boolean defaulting to false', () => {
    expect(_config.devtools).toBe(false);
  });
});

describe('Compat flags — settable through NoJS.config()', () => {
  test.each(TOP_LEVEL_FLAGS)('5 — %s can be enabled and disabled before init', (flag) => {
    NoJS.config({ [flag]: true });
    expect(_config[flag]).toBe(true);
    NoJS.config({ [flag]: false });
    expect(_config[flag]).toBe(false);
  });

  test('6 — templates.pageRelative can be set', () => {
    NoJS.config({ templates: { pageRelative: true } });
    expect(_config.templates.pageRelative).toBe(true);
  });

  test('7 — i18n.escapeParams can be set', () => {
    NoJS.config({ i18n: { escapeParams: true } });
    expect(_config.i18n.escapeParams).toBe(true);
  });

  test('8 — i18n.escapeParams can be set through NoJS.i18n()', () => {
    NoJS.i18n({ escapeParams: true });
    expect(_config.i18n.escapeParams).toBe(true);
    NoJS.i18n({ escapeParams: false });
    expect(_config.i18n.escapeParams).toBe(false);
  });

  test('9 — NoJS.i18n() without escapeParams leaves the flag untouched', () => {
    _config.i18n.escapeParams = true;
    NoJS.i18n({ fallbackLocale: 'en' });
    expect(_config.i18n.escapeParams).toBe(true);
  });

  test('10 — all flags are settable after init and not locked', async () => {
    const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
    document.body.innerHTML = '<div state="{}"></div>';
    await NoJS.init();

    NoJS.config({
      scopeHeaders: true,
      strictRedaction: true,
      strictDirectives: true,
      strictDevtools: true,
      strictPersist: true,
      strictJsonld: true,
      templates: { pageRelative: true },
      i18n: { escapeParams: true },
    });

    for (const flag of TOP_LEVEL_FLAGS) expect(_config[flag]).toBe(true);
    expect(_config.templates.pageRelative).toBe(true);
    expect(_config.i18n.escapeParams).toBe(true);
    expect(warnSpy).not.toHaveBeenCalledWith(
      expect.anything(),
      expect.stringContaining('cannot be changed after init'),
    );
    warnSpy.mockRestore();
  });
});

describe('Compat flags — nested merges keep sibling keys', () => {
  test('11 — setting templates.pageRelative keeps templates.cache', () => {
    NoJS.config({ templates: { cache: false } });
    NoJS.config({ templates: { pageRelative: true } });
    expect(_config.templates).toEqual({ cache: false, pageRelative: true });
  });

  test('12 — setting templates.cache keeps templates.pageRelative', () => {
    NoJS.config({ templates: { pageRelative: true } });
    NoJS.config({ templates: { cache: false } });
    expect(_config.templates.pageRelative).toBe(true);
  });

  test('13 — setting i18n.escapeParams keeps the other i18n settings', () => {
    NoJS.config({ i18n: { ns: ['common'], cache: false, supportedLocales: ['en', 'pt'] } });
    const before = { ..._config.i18n };

    NoJS.config({ i18n: { escapeParams: true } });

    expect(_config.i18n).toEqual({ ...before, escapeParams: true });
  });

  test('14 — setting other i18n keys keeps i18n.escapeParams', () => {
    NoJS.config({ i18n: { escapeParams: true } });
    NoJS.config({ i18n: { fallbackLocale: 'pt' } });
    expect(_config.i18n.escapeParams).toBe(true);
    expect(_config.i18n.fallbackLocale).toBe('pt');
  });

  test('15 — top-level flags do not disturb nested objects', () => {
    const templates = { ..._config.templates };
    const i18n = { ..._config.i18n };
    NoJS.config({ scopeHeaders: true, strictRedaction: true });
    expect(_config.templates).toEqual(templates);
    expect(_config.i18n).toEqual(i18n);
  });

  test('16 — strictDevtools does not change the devtools boolean', () => {
    NoJS.config({ strictDevtools: true });
    expect(_config.devtools).toBe(false);
    NoJS.config({ devtools: true });
    expect(_config.strictDevtools).toBe(true);
  });
});
