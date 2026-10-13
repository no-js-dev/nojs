// ═══════════════════════════════════════════════════════════════════════
//  NOJS-I18N-001: flat-mode loadPath ('/locales/{locale}.json') — a locale
//  switch must load the new locale's file before notifying listeners.
//  Own file: the namespace set and locale file cache in i18n.js are
//  module-level, and namespaces loaded by other suites would mask the bug.
// ═══════════════════════════════════════════════════════════════════════

import { _i18n, _loadI18nForLocale } from '../src/i18n.js';
import { _config, _i18nListeners } from '../src/globals.js';

// ─── Helpers ────────────────────────────────────────────────────────────
const flush = () => new Promise((r) => setTimeout(r, 10));

const originalFetch = global.fetch;
let fetchMock;

// ─── Setup / teardown ──────────────────────────────────────────────────
beforeEach(() => {
  _i18n._locale = 'en';
  _i18n.locales = { en: { greeting: 'Hello' } };
  _i18nListeners.clear();
  _config.i18n.loadPath = '/locales/{locale}.json';
  _config.i18n.ns = [];
  _config.i18n.cache = false;

  fetchMock = jest.fn((url) => Promise.resolve({
    ok: true,
    json: () => Promise.resolve(url === '/locales/pt.json' ? { greeting: 'Olá' } : { greeting: 'Hello' }),
  }));
  global.fetch = fetchMock;
});

afterEach(() => {
  _i18n._locale = 'en';
  _i18n.locales = {};
  _i18nListeners.clear();
  _config.i18n.loadPath = null;
  _config.i18n.ns = [];
  _config.i18n.cache = true;
  global.fetch = originalFetch;
});

describe('locale setter — flat-mode loadPath (NOJS-I18N-001)', () => {
  // NOJS-I18N-001 — flipped to test() by the fix commit
  test.failing('switching locale fetches /locales/pt.json and listeners see the new text', async () => {
    const seen = [];
    _i18nListeners.add(() => seen.push(_i18n.t('greeting')));

    _i18n.locale = 'pt';
    await flush();

    expect(fetchMock).toHaveBeenCalledWith('/locales/pt.json');
    expect(_i18n.t('greeting')).toBe('Olá');
    expect(seen).toEqual(['Olá']);
  });

  // NOJS-I18N-001 — flipped to test() by the fix commit
  test.failing('switching back to a loaded locale uses the cache (no second fetch)', async () => {
    _config.i18n.cache = true;
    await _loadI18nForLocale('en'); // initial load, as init() does

    for (const loc of ['pt', 'en', 'pt']) {
      _i18n.locale = loc;
      await flush();
    }

    expect(fetchMock.mock.calls.map(([url]) => url)).toEqual(['/locales/en.json', '/locales/pt.json']);
    expect(_i18n.t('greeting')).toBe('Olá');
  });
});
