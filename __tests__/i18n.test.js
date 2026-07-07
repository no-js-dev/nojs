import { _i18n, _i18nProxy, _notifyI18n, _loadI18nForLocale, _loadI18nNamespace } from '../src/i18n.js';
import { _config, _i18nListeners, _watchI18n, _stores, _watchExpr, _setCurrentEl, _onDispose, _storeWatchers, _notifyStoreWatchers, _routeWatchers } from '../src/globals.js';
import { createContext } from '../src/context.js';
import { evaluate, resolve } from '../src/evaluate.js';
import { processTree, processElement, _disposeChildren } from '../src/registry.js';
import '../src/directives/state.js';
import '../src/directives/binding.js';
import '../src/directives/conditionals.js';
import '../src/directives/loops.js';
import '../src/directives/i18n.js';

describe('i18n System', () => {
  beforeEach(() => {
    _i18n.locale = 'en';
    _i18n.locales = {
      en: {
        greeting: 'Hello',
        welcome: 'Welcome, {name}!',
        items: 'one item | {count} items',
        nested: {
          deep: {
            key: 'Deep value',
          },
        },
      },
      es: {
        greeting: 'Hola',
        welcome: 'Bienvenido, {name}!',
        items: 'un artículo | {count} artículos',
      },
      pt: {
        greeting: 'Olá',
      },
    };
    _config.i18n.fallbackLocale = 'en';
  });

  afterEach(() => {
    _i18n.locale = 'en';
    _i18n.locales = {};
  });

  test('translates simple key', () => {
    expect(_i18n.t('greeting')).toBe('Hello');
  });

  test('translates with locale switch', () => {
    _i18n.locale = 'es';
    expect(_i18n.t('greeting')).toBe('Hola');
  });

  test('interpolates parameters', () => {
    expect(_i18n.t('welcome', { name: 'Alice' })).toBe('Welcome, Alice!');
  });

  test('interpolates parameters in different locale', () => {
    _i18n.locale = 'es';
    expect(_i18n.t('welcome', { name: 'Carlos' })).toBe('Bienvenido, Carlos!');
  });

  test('pluralization - singular', () => {
    expect(_i18n.t('items', { count: 1 })).toBe('one item');
  });

  test('pluralization - plural', () => {
    expect(_i18n.t('items', { count: 5 })).toBe('5 items');
  });

  test('pluralization - zero', () => {
    expect(_i18n.t('items', { count: 0 })).toBe('0 items');
  });

  test('resolves nested keys with dot notation', () => {
    expect(_i18n.t('nested.deep.key')).toBe('Deep value');
  });

  test('returns key when translation not found', () => {
    expect(_i18n.t('nonexistent.key')).toBe('nonexistent.key');
  });

  test('falls back to fallback locale', () => {
    _i18n.locale = 'fr';
    _config.i18n.fallbackLocale = 'en';
    expect(_i18n.t('greeting')).toBe('Hello');
  });

  test('returns key when neither locale nor fallback has translation', () => {
    _i18n.locale = 'fr';
    _config.i18n.fallbackLocale = 'de';
    expect(_i18n.t('greeting')).toBe('greeting');
  });

  test('handles missing parameter gracefully', () => {
    expect(_i18n.t('welcome', {})).toBe('Welcome, !');
  });

});

describe('i18n — pluralization edge cases', () => {
  beforeEach(() => {
    _i18n.locale = 'en';
    _i18n.locales = {
      en: {
        items: 'one item | {count} items',
        greeting: 'Hello',
        nested: { msg: 'nested value' },
      },
    };
    _config.i18n.fallbackLocale = 'en';
  });

  afterEach(() => {
    _i18n.locale = 'en';
    _i18n.locales = {};
  });

  test('does not split on | when count is not in params', () => {
    const result = _i18n.t('items', { name: 'Alice' });
    expect(result).toContain('|');
    expect(result).toBe('one item |  items');
  });

  test('does not split on | with empty params', () => {
    const result = _i18n.t('items', {});
    expect(result).toContain('|');
  });

  test('does not split on | with no params', () => {
    const result = _i18n.t('items');
    expect(result).toContain('|');
  });
});

describe('i18n — non-string message value', () => {
  beforeEach(() => {
    _i18n.locale = 'en';
    _i18n.locales = {
      en: {
        count: 42,
        flag: true,
        obj: { nested: 'value' },
        arr: [1, 2, 3],
      },
    };
    _config.i18n.fallbackLocale = 'en';
  });

  afterEach(() => {
    _i18n.locale = 'en';
    _i18n.locales = {};
  });

  test('returns number value as-is', () => {
    expect(_i18n.t('count')).toBe(42);
  });

  test('returns boolean value as-is', () => {
    expect(_i18n.t('flag')).toBe(true);
  });

  test('returns object value as-is (no interpolation)', () => {
    expect(_i18n.t('obj')).toEqual({ nested: 'value' });
  });

  test('returns array value as-is', () => {
    expect(_i18n.t('arr')).toEqual([1, 2, 3]);
  });
});

describe('i18n — pluralization forms[1] fallback (L25)', () => {
  beforeEach(() => {
    _i18n.locale = 'en';
    _i18n.locales = {
      en: {
        thing: 'item',
        singlePipe: 'one thing |',
        normalPlural: 'one item | {count} items',
      },
    };
  });

  afterEach(() => {
    _i18n.locale = 'en';
    _i18n.locales = {};
  });

  test('falls back to forms[0] when forms[1] is empty string and count > 1', () => {
    const result = _i18n.t('singlePipe', { count: 5 });
    expect(result).toBe('one thing');
  });

  test('uses forms[0] when count is 1', () => {
    const result = _i18n.t('normalPlural', { count: 1 });
    expect(result).toBe('one item');
  });

  test('uses forms[1] when count > 1 and forms[1] exists', () => {
    const result = _i18n.t('normalPlural', { count: 3 });
    expect(result).toBe('3 items');
  });
});

// ═══════════════════════════════════════════════════════════════════════
//  EXTERNAL FILE LOADING — NEW TESTS
// ═══════════════════════════════════════════════════════════════════════

describe('deep merge behavior (via _loadI18nForLocale)', () => {
  const originalFetch = global.fetch;
  let fetchMock;

  beforeEach(() => {
    _i18n.locales = {};
    _config.i18n.loadPath = '/locales/{locale}.json';
    _config.i18n.cache = false;
    _config.i18n.ns = [];
  });

  afterEach(() => {
    _i18n.locales = {};
    _config.i18n.loadPath = null;
    _config.i18n.cache = true;
    _config.i18n.ns = [];
    global.fetch = originalFetch;
  });

  test('deep merges nested locale objects', async () => {
    _i18n.locales.en = { nav: { home: 'Home' }, existing: 'value' };
    fetchMock = jest.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ nav: { docs: 'Docs' }, greeting: 'Hello' }),
    });
    global.fetch = fetchMock;
    await _loadI18nForLocale('en');
    expect(_i18n.locales.en).toEqual({
      nav: { home: 'Home', docs: 'Docs' },
      existing: 'value',
      greeting: 'Hello',
    });
  });

  test('source overwrites scalar values', async () => {
    _i18n.locales.en = { greeting: 'Hi' };
    fetchMock = jest.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ greeting: 'Hello' }),
    });
    global.fetch = fetchMock;
    await _loadI18nForLocale('en');
    expect(_i18n.locales.en.greeting).toBe('Hello');
  });

  test('replaces arrays instead of merging', async () => {
    _i18n.locales.en = { tags: ['old'] };
    fetchMock = jest.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ tags: ['new1', 'new2'] }),
    });
    global.fetch = fetchMock;
    await _loadI18nForLocale('en');
    expect(_i18n.locales.en.tags).toEqual(['new1', 'new2']);
  });
});

describe('locale loading (via _loadI18nForLocale)', () => {
  const originalFetch = global.fetch;
  let fetchMock;

  beforeEach(() => {
    _i18n.locales = {};
    _config.i18n.loadPath = '/locales/{locale}.json';
    _config.i18n.cache = false;
    _config.i18n.ns = [];

    fetchMock = jest.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ greeting: 'Hello' }),
    });
    global.fetch = fetchMock;
  });

  afterEach(() => {
    _i18n.locales = {};
    _config.i18n.loadPath = null;
    _config.i18n.cache = true;
    _config.i18n.ns = [];
    global.fetch = originalFetch;
  });

  test('flat mode: fetches and merges', async () => {
    await _loadI18nForLocale('en');
    expect(fetchMock).toHaveBeenCalledWith('/locales/en.json');
    expect(_i18n.locales.en).toEqual({ greeting: 'Hello' });
  });

  test('ns mode: fetches with namespace', async () => {
    _config.i18n.loadPath = '/locales/{locale}/{ns}.json';
    _config.i18n.ns = ['dashboard'];
    await _loadI18nForLocale('en');
    expect(fetchMock).toHaveBeenCalledWith('/locales/en/dashboard.json');
  });

  test('caches response when cache enabled', async () => {
    _config.i18n.cache = true;
    await _loadI18nForLocale('en');
    await _loadI18nForLocale('en');
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  test('handles fetch error gracefully', async () => {
    fetchMock.mockResolvedValue({ ok: false, status: 404 });
    const warnSpy = jest.spyOn(console, 'warn').mockImplementation();
    await _loadI18nForLocale('en');
    expect(warnSpy).toHaveBeenCalled();
    expect(_i18n.locales.en).toBeUndefined();
    warnSpy.mockRestore();
  });

  test('respects cache:false', async () => {
    _config.i18n.cache = false;
    await _loadI18nForLocale('en');
    await _loadI18nForLocale('en');
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  test('deep merges into existing locale data', async () => {
    _i18n.locales.en = { existing: 'value', nav: { home: 'Home' } };
    fetchMock.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ greeting: 'Hello', nav: { docs: 'Docs' } }),
    });
    await _loadI18nForLocale('en');
    expect(_i18n.locales.en).toEqual({
      existing: 'value',
      greeting: 'Hello',
      nav: { home: 'Home', docs: 'Docs' },
    });
  });

  test('handles network error gracefully', async () => {
    fetchMock.mockRejectedValue(new Error('Network error'));
    const warnSpy = jest.spyOn(console, 'warn').mockImplementation();
    await _loadI18nForLocale('en');
    expect(warnSpy).toHaveBeenCalled();
    warnSpy.mockRestore();
  });
});

describe('_loadI18nForLocale', () => {
  const originalFetch = global.fetch;
  let fetchMock;

  beforeEach(() => {
    _i18n.locales = {};
    _config.i18n.cache = false;

    fetchMock = jest.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ hello: 'Hello' }),
    });
    global.fetch = fetchMock;
  });

  afterEach(() => {
    _i18n.locales = {};
    _config.i18n.loadPath = null;
    _config.i18n.ns = [];
    _config.i18n.cache = true;
    global.fetch = originalFetch;
  });

  test('flat mode: calls _loadLocale(locale, null)', async () => {
    _config.i18n.loadPath = '/locales/{locale}.json';
    _config.i18n.ns = [];
    await _loadI18nForLocale('en');
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledWith('/locales/en.json');
  });

  test('ns mode: calls _loadLocale per namespace', async () => {
    _config.i18n.loadPath = '/locales/{locale}/{ns}.json';
    _config.i18n.ns = ['common', 'page'];
    await _loadI18nForLocale('en');
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(fetchMock).toHaveBeenCalledWith('/locales/en/common.json');
    expect(fetchMock).toHaveBeenCalledWith('/locales/en/page.json');
  });

  test('no-ops when loadPath is null', async () => {
    _config.i18n.loadPath = null;
    await _loadI18nForLocale('en');
    expect(fetchMock).not.toHaveBeenCalled();
  });

  test('flat mode when loadPath has no {ns}', async () => {
    _config.i18n.loadPath = '/locales/{locale}.json';
    _config.i18n.ns = ['common'];
    await _loadI18nForLocale('en');
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledWith('/locales/en.json');
  });
});

describe('_loadI18nNamespace', () => {
  const originalFetch = global.fetch;
  let fetchMock;

  beforeEach(() => {
    _i18n._locale = 'es';
    _i18n.locales = {};
    _config.i18n.loadPath = '/locales/{locale}/{ns}.json';
    _config.i18n.fallbackLocale = 'en';
    _config.i18n.cache = false;

    fetchMock = jest.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ title: 'Title' }),
    });
    global.fetch = fetchMock;
  });

  afterEach(() => {
    _i18n._locale = 'en';
    _i18n.locales = {};
    _config.i18n.loadPath = null;
    _config.i18n.ns = [];
    _config.i18n.cache = true;
    _config.i18n.fallbackLocale = 'en';
    global.fetch = originalFetch;
  });

  test('loads for current + fallback locales', async () => {
    await _loadI18nNamespace('dashboard');
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(fetchMock).toHaveBeenCalledWith('/locales/es/dashboard.json');
    expect(fetchMock).toHaveBeenCalledWith('/locales/en/dashboard.json');
  });

  test('deduplicates when current === fallback', async () => {
    _i18n._locale = 'en';
    _config.i18n.fallbackLocale = 'en';
    await _loadI18nNamespace('dashboard');
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  test('no-ops when loadPath is null', async () => {
    _config.i18n.loadPath = null;
    await _loadI18nNamespace('dashboard');
    expect(fetchMock).not.toHaveBeenCalled();
  });

  test('merges into existing locales', async () => {
    _i18n.locales.es = { greeting: 'Hola' };
    await _loadI18nNamespace('dashboard');
    expect(_i18n.locales.es.greeting).toBe('Hola');
    expect(_i18n.locales.es.title).toBe('Title');
  });
});

describe('locale setter with loadPath', () => {
  const originalFetch = global.fetch;
  let fetchMock;

  beforeEach(() => {
    _i18n._locale = 'en';
    _i18n.locales = {};
    _i18nListeners.clear();
    _config.i18n.cache = false;

    fetchMock = jest.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ welcome: 'Bienvenido' }),
    });
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

  test('fetches before notifying listeners', async () => {
    _config.i18n.loadPath = '/locales/{locale}.json';
    const calls = [];
    const listener = () => calls.push('notified');
    _i18nListeners.add(listener);

    _i18n.locale = 'es';
    // Listener is not called synchronously
    expect(calls).toEqual([]);
    // Wait for promise to resolve
    await new Promise((r) => setTimeout(r, 10));
    expect(calls).toEqual(['notified']);
  });

  test('notifies synchronously when no loadPath', () => {
    _config.i18n.loadPath = null;
    const calls = [];
    _i18nListeners.add(() => calls.push('notified'));
    _i18n.locale = 'es';
    expect(calls).toEqual(['notified']);
  });

  test('does not notify when locale unchanged', () => {
    _config.i18n.loadPath = null;
    const calls = [];
    _i18nListeners.add(() => calls.push('notified'));
    _i18n.locale = 'en'; // same as current
    expect(calls).toEqual([]);
  });

  test('cleans disconnected listeners', () => {
    _config.i18n.loadPath = null;
    const fn = jest.fn();
    fn._el = { isConnected: false };
    _i18nListeners.add(fn);
    _i18n.locale = 'fr';
    expect(fn).not.toHaveBeenCalled();
    expect(_i18nListeners.has(fn)).toBe(false);
  });
});

describe('NoJS.i18n() — external options', () => {
  beforeEach(() => {
    _config.i18n.loadPath = null;
    _config.i18n.ns = [];
    _config.i18n.cache = true;
  });

  afterEach(() => {
    _config.i18n.loadPath = null;
    _config.i18n.ns = [];
    _config.i18n.cache = true;
    _i18n.locales = {};
  });

  test('sets loadPath in config', async () => {
    const { default: No } = await import('../src/index.js');
    No.i18n({ loadPath: '/l/{locale}.json' });
    expect(_config.i18n.loadPath).toBe('/l/{locale}.json');
  });

  test('sets ns in config', async () => {
    const { default: No } = await import('../src/index.js');
    No.i18n({ ns: ['common', 'page'] });
    expect(_config.i18n.ns).toEqual(['common', 'page']);
  });

  test('sets cache in config', async () => {
    const { default: No } = await import('../src/index.js');
    No.i18n({ cache: false });
    expect(_config.i18n.cache).toBe(false);
  });

  test('preserves existing locale data', async () => {
    const { default: No } = await import('../src/index.js');
    _i18n.locales = { en: { hello: 'Hello' } };
    No.i18n({ loadPath: '/l/{locale}.json' });
    expect(_i18n.locales.en.hello).toBe('Hello');
  });
});

describe('NoJS.i18n() — browser detection with supportedLocales (loadPath)', () => {
  const originalLanguage = Object.getOwnPropertyDescriptor(navigator, 'language');

  function setNavigatorLanguage(lang) {
    Object.defineProperty(navigator, 'language', { value: lang, configurable: true });
  }

  beforeEach(() => {
    _i18n._locale = 'en';
    _i18n.locales = {};
    _config.i18n.loadPath = null;
    _config.i18n.ns = [];
    _config.i18n.supportedLocales = [];
    _config.i18n.persist = false;
    try { localStorage.removeItem('nojs-locale'); } catch (_) {}
  });

  afterEach(() => {
    _i18n._locale = 'en';
    _i18n.locales = {};
    _config.i18n.loadPath = null;
    _config.i18n.ns = [];
    _config.i18n.supportedLocales = [];
    _config.i18n.persist = false;
    try { localStorage.removeItem('nojs-locale'); } catch (_) {}
    // jsdom defines `language` on Navigator.prototype (not as an own
    // property), so `originalLanguage` is `undefined` here. Restoring the
    // saved own descriptor would leak the mocked value into later describes.
    // When there was no own descriptor, delete the own property we added so
    // the prototype getter is restored; otherwise restore the saved one.
    if (originalLanguage) {
      Object.defineProperty(navigator, 'language', originalLanguage);
    } else {
      delete navigator.language;
    }
  });

  test('registers supportedLocales in config', async () => {
    const { default: No } = await import('../src/index.js');
    No.i18n({ supportedLocales: ['en', 'pt', 'es'] });
    expect(_config.i18n.supportedLocales).toEqual(['en', 'pt', 'es']);
  });

  test('detects prefix (pt) from navigator.language "pt-BR" via supportedLocales under loadPath', async () => {
    const { default: No } = await import('../src/index.js');
    setNavigatorLanguage('pt-BR');
    No.i18n({
      loadPath: '/locales/{locale}.json',
      defaultLocale: 'en',
      detectBrowser: true,
      supportedLocales: ['en', 'pt', 'es'],
    });
    // exact tag 'pt-BR' is not supported, but its prefix 'pt' is
    expect(_i18n.locale).toBe('pt');
  });

  test('detects exact tag when supportedLocales contains the full tag', async () => {
    const { default: No } = await import('../src/index.js');
    setNavigatorLanguage('pt-BR');
    No.i18n({
      loadPath: '/locales/{locale}.json',
      defaultLocale: 'en',
      detectBrowser: true,
      supportedLocales: ['en', 'pt-BR'],
    });
    expect(_i18n.locale).toBe('pt-BR');
  });

  test('stays on defaultLocale when browser language is not supported', async () => {
    const { default: No } = await import('../src/index.js');
    setNavigatorLanguage('de-DE');
    No.i18n({
      loadPath: '/locales/{locale}.json',
      defaultLocale: 'en',
      detectBrowser: true,
      supportedLocales: ['en', 'pt', 'es'],
    });
    expect(_i18n.locale).toBe('en');
  });

  test('persisted nojs-locale wins over browser detection', async () => {
    const { default: No } = await import('../src/index.js');
    setNavigatorLanguage('pt-BR');
    localStorage.setItem('nojs-locale', 'es');
    No.i18n({
      loadPath: '/locales/{locale}.json',
      defaultLocale: 'en',
      detectBrowser: true,
      persist: true,
      supportedLocales: ['en', 'pt', 'es'],
    });
    expect(_i18n.locale).toBe('es');
  });

  test('backward compat: inline locales map still detects without supportedLocales', async () => {
    const { default: No } = await import('../src/index.js');
    setNavigatorLanguage('pt-BR');
    No.i18n({
      defaultLocale: 'en',
      detectBrowser: true,
      locales: { en: { hi: 'Hi' }, pt: { hi: 'Oi' } },
    });
    expect(_i18n.locale).toBe('pt');
  });

  test('detectBrowser: false performs no detection regardless of supportedLocales', async () => {
    const { default: No } = await import('../src/index.js');
    setNavigatorLanguage('pt-BR');
    No.i18n({
      loadPath: '/locales/{locale}.json',
      defaultLocale: 'en',
      detectBrowser: false,
      supportedLocales: ['en', 'pt', 'es'],
    });
    expect(_i18n.locale).toBe('en');
  });

  test('loadPath + detectBrowser with supportedLocales omitted stays on defaultLocale', async () => {
    const { default: No } = await import('../src/index.js');
    setNavigatorLanguage('pt-BR');
    // No inline bundles, no supportedLocales → defaults to [] and nothing
    // matches, so the resolved locale must remain the defaultLocale.
    No.i18n({
      loadPath: '/locales/{locale}.json',
      defaultLocale: 'en',
      detectBrowser: true,
    });
    expect(_config.i18n.supportedLocales).toEqual([]);
    expect(_i18n.locale).toBe('en');
  });

  test('non-array supportedLocales does not throw and stays on defaultLocale', async () => {
    const { default: No } = await import('../src/index.js');
    setNavigatorLanguage('pt-BR');
    // A bad (non-array) supportedLocales must be guarded so detection cannot
    // throw on `.includes` — it should be ignored and detection is a no-op.
    expect(() =>
      No.i18n({
        loadPath: '/locales/{locale}.json',
        defaultLocale: 'en',
        detectBrowser: true,
        supportedLocales: null,
      })
    ).not.toThrow();
    expect(_i18n.locale).toBe('en');
  });
});

describe('_notifyI18n', () => {
  beforeEach(() => {
    _i18nListeners.clear();
  });

  afterEach(() => {
    _i18nListeners.clear();
  });

  test('calls all listeners', () => {
    const fn1 = jest.fn();
    const fn2 = jest.fn();
    const fn3 = jest.fn();
    _i18nListeners.add(fn1);
    _i18nListeners.add(fn2);
    _i18nListeners.add(fn3);
    _notifyI18n();
    expect(fn1).toHaveBeenCalledTimes(1);
    expect(fn2).toHaveBeenCalledTimes(1);
    expect(fn3).toHaveBeenCalledTimes(1);
  });

  test('removes disconnected listeners', () => {
    const fn = jest.fn();
    fn._el = { isConnected: false };
    _i18nListeners.add(fn);
    _notifyI18n();
    expect(fn).not.toHaveBeenCalled();
    expect(_i18nListeners.has(fn)).toBe(false);
  });
});

describe('t-html sanitization integration', () => {
  beforeEach(() => {
    _i18n.locale = 'en';
    _i18n.locales = {
      en: {
        xssScript: '<b>Bold</b><script>alert("xss")</script>',
        xssOnerror: '<b>Bold</b><img src=x onerror=alert(1)>',
      },
    };
    _config.i18n.fallbackLocale = 'en';
  });

  afterEach(() => {
    _i18n.locale = 'en';
    _i18n.locales = {};
    document.body.innerHTML = '';
  });

  test('strips <script> tags from t-html output', () => {
    const parent = document.createElement('div');
    const el = document.createElement('span');
    el.setAttribute('t', 'xssScript');
    el.setAttribute('t-html', '');
    parent.appendChild(el);
    document.body.appendChild(parent);
    processTree(parent);

    expect(el.innerHTML).toContain('<b>Bold</b>');
    expect(el.innerHTML).not.toContain('<script>');
    expect(el.innerHTML).not.toContain('alert');
  });

  test('strips onerror attributes from t-html output', () => {
    const parent = document.createElement('div');
    const el = document.createElement('span');
    el.setAttribute('t', 'xssOnerror');
    el.setAttribute('t-html', '');
    parent.appendChild(el);
    document.body.appendChild(parent);
    processTree(parent);

    expect(el.innerHTML).toContain('<b>Bold</b>');
    expect(el.innerHTML).not.toContain('onerror');
    expect(el.innerHTML).not.toContain('alert');
  });
});

// ═══════════════════════════════════════════════════════════════════════
//  AUDIT FIX — M10: t directive with t-html calls _disposeChildren
//  before setting innerHTML
// ═══════════════════════════════════════════════════════════════════════

describe('t-html child disposal (M10)', () => {
  beforeEach(() => {
    _i18n.locale = 'en';
    _i18n.locales = {
      en: {
        richMsg: '<b>Hello</b>',
        richMsgUpdated: '<em>Updated</em>',
      },
    };
    _config.i18n.fallbackLocale = 'en';
  });

  afterEach(() => {
    _i18n.locale = 'en';
    _i18n.locales = {};
    document.body.innerHTML = '';
  });

  test('should call child disposers when t-html updates with new content', () => {
    const parent = document.createElement('div');
    parent.setAttribute('state', '{ }');
    const el = document.createElement('span');
    el.setAttribute('t', 'richMsg');
    el.setAttribute('t-html', '');
    parent.appendChild(el);
    document.body.appendChild(parent);
    processTree(parent);

    expect(el.innerHTML).toContain('<b>Hello</b>');

    // Plant a mock disposer on the child <b> element
    const boldChild = el.querySelector('b');
    expect(boldChild).toBeTruthy();
    const disposed = [];
    boldChild.__disposers = [() => disposed.push('bold-disposed')];

    // Trigger an i18n update that changes the content
    _i18n.locales.en.richMsg = '<em>Changed</em>';
    _notifyI18n();

    // Verify the old child's disposer was called
    expect(disposed).toEqual(['bold-disposed']);
    // And the new content is in place
    expect(el.innerHTML).toContain('<em>Changed</em>');
  });
});

// ═══════════════════════════════════════════════════════════════════════
//  $i18n REACTIVE PROXY — UNIT TESTS
// ═══════════════════════════════════════════════════════════════════════

describe('$i18n proxy — property resolution', () => {
  beforeEach(() => {
    _i18n._locale = 'en';
    _i18n.locales = {
      en: {
        shell: {
          sidebar: {
            introduction: 'Introduction',
            features: 'Features',
          },
        },
        common: {
          buttons: {
            save: 'Save',
            cancel: 'Cancel',
          },
        },
        greeting: 'Hello',
        count: 42,
        deeply: {
          nested: {
            path: {
              value: 'Deep Value',
            },
          },
        },
      },
      pt: {
        shell: {
          sidebar: {
            introduction: 'Introdução',
            features: 'Funcionalidades',
          },
        },
        common: {
          buttons: {
            save: 'Salvar',
            cancel: 'Cancelar',
          },
        },
        greeting: 'Olá',
      },
      es: {
        greeting: 'Hola',
      },
    };
    _config.i18n.fallbackLocale = 'en';
  });

  afterEach(() => {
    _i18n._locale = 'en';
    _i18n.locales = {};
  });

  test('$i18n.namespace.key resolves to translation string', () => {
    expect(_i18nProxy.shell.sidebar.introduction).toBe('Introduction');
  });

  test('$i18n.namespace.nested.deep.key resolves nested paths', () => {
    expect(_i18nProxy.deeply.nested.path.value).toBe('Deep Value');
  });

  test('$i18n.missing.key returns undefined', () => {
    expect(_i18nProxy.nonexistent).toBeUndefined();
  });

  test('$i18n.missing.nested.key returns undefined through nested proxy', () => {
    // shell exists but shell.missing does not
    expect(_i18nProxy.shell.missing).toBeUndefined();
  });

  test('$i18n returns number values as-is', () => {
    expect(_i18nProxy.count).toBe(42);
  });

  test('$i18n.namespace returns nested proxy (not raw object)', () => {
    const shell = _i18nProxy.shell;
    // It should be a proxy, not the raw object
    expect(shell).toBeDefined();
    expect(shell.sidebar).toBeDefined();
    expect(shell.sidebar.introduction).toBe('Introduction');
  });

  test('$i18n resolves top-level string key', () => {
    expect(_i18nProxy.greeting).toBe('Hello');
  });
});

describe('$i18n proxy — reserved properties', () => {
  beforeEach(() => {
    _i18n._locale = 'en';
    _i18n.locales = {
      en: {
        locale: 'should-not-resolve-to-this',
        t: 'should-not-resolve-to-this',
        locales: 'should-not-resolve-to-this',
        setLocale: 'should-not-resolve-to-this',
        greeting: 'Hello',
      },
    };
    _config.i18n.fallbackLocale = 'en';
  });

  afterEach(() => {
    _i18n._locale = 'en';
    _i18n.locales = {};
  });

  test('$i18n.locale returns current locale (reserved property)', () => {
    expect(_i18nProxy.locale).toBe('en');
  });

  test('$i18n.locales returns locales object (reserved property)', () => {
    expect(_i18nProxy.locales).toBe(_i18n.locales);
  });

  test('$i18n.t still works for interpolation/pluralization', () => {
    _i18n.locales = {
      en: {
        welcome: 'Hello, {name}!',
        items: 'one item | {count} items',
      },
    };
    expect(_i18nProxy.t('welcome', { name: 'Alice' })).toBe('Hello, Alice!');
    expect(_i18nProxy.t('items', { count: 3 })).toBe('3 items');
  });

  test('$i18n.setLocale changes locale', () => {
    _i18n.locales = { en: { greeting: 'Hello' }, pt: { greeting: 'Olá' } };
    _config.i18n.loadPath = null;
    expect(_i18nProxy.locale).toBe('en');
    _i18nProxy.setLocale('pt');
    expect(_i18nProxy.locale).toBe('pt');
  });

  test('reserved names never resolve to translation keys', () => {
    // Even though en.locale, en.t, en.locales, en.setLocale exist in the
    // locale data, the proxy should return the reserved property behavior
    expect(_i18nProxy.locale).toBe('en'); // not 'should-not-resolve-to-this'
    expect(typeof _i18nProxy.t).toBe('function'); // not 'should-not-resolve-to-this'
    expect(typeof _i18nProxy.locales).toBe('object'); // not 'should-not-resolve-to-this'
    expect(typeof _i18nProxy.setLocale).toBe('function'); // not 'should-not-resolve-to-this'
  });
});

describe('$i18n proxy — locale change triggers re-evaluation', () => {
  beforeEach(() => {
    _i18n._locale = 'en';
    _i18n.locales = {
      en: { greeting: 'Hello', nav: { home: 'Home' } },
      pt: { greeting: 'Olá', nav: { home: 'Início' } },
    };
    _config.i18n.fallbackLocale = 'en';
    _config.i18n.loadPath = null;
    _i18nListeners.clear();
  });

  afterEach(() => {
    _i18n._locale = 'en';
    _i18n.locales = {};
    _i18nListeners.clear();
  });

  test('locale change triggers re-evaluation of $i18n listeners', () => {
    const calls = [];
    _watchI18n(() => calls.push('called'));

    _i18n.locale = 'pt';
    expect(calls).toEqual(['called']);
  });

  test('proxy resolves to new locale after setLocale', () => {
    expect(_i18nProxy.greeting).toBe('Hello');
    _i18nProxy.setLocale('pt');
    expect(_i18nProxy.greeting).toBe('Olá');
  });

  test('nested proxy resolves to new locale after locale change', () => {
    expect(_i18nProxy.nav.home).toBe('Home');
    _i18n.locale = 'pt';
    expect(_i18nProxy.nav.home).toBe('Início');
  });
});

describe('$i18n proxy — fallback locale', () => {
  beforeEach(() => {
    _i18n._locale = 'fr';
    _i18n.locales = {
      en: { greeting: 'Hello', nav: { docs: 'Docs' } },
      fr: { bonjour: 'Bonjour' },
    };
    _config.i18n.fallbackLocale = 'en';
  });

  afterEach(() => {
    _i18n._locale = 'en';
    _i18n.locales = {};
  });

  test('falls back to fallback locale for missing top-level key', () => {
    expect(_i18nProxy.greeting).toBe('Hello');
  });

  test('falls back to fallback locale for nested keys', () => {
    expect(_i18nProxy.nav.docs).toBe('Docs');
  });

  test('returns undefined when both current and fallback are missing', () => {
    expect(_i18nProxy.nonexistent).toBeUndefined();
  });

  test('no fallback when fallback locale matches current locale', () => {
    _i18n._locale = 'en';
    _config.i18n.fallbackLocale = 'en';
    // 'bonjour' only exists in fr, not in en
    expect(_i18nProxy.bonjour).toBeUndefined();
  });

  test('no fallback when fallbackLocale is not set', () => {
    _config.i18n.fallbackLocale = null;
    // fr does not have 'greeting'
    expect(_i18nProxy.greeting).toBeUndefined();
  });
});

describe('$i18n proxy — Symbol and non-string keys', () => {
  beforeEach(() => {
    _i18n._locale = 'en';
    _i18n.locales = { en: { greeting: 'Hello' } };
  });

  afterEach(() => {
    _i18n._locale = 'en';
    _i18n.locales = {};
  });

  test('Symbol properties return undefined on root proxy', () => {
    expect(_i18nProxy[Symbol.toPrimitive]).toBeUndefined();
  });

  test('Symbol properties return undefined on nested proxy', () => {
    _i18n.locales = { en: { nav: { home: 'Home' } } };
    const nav = _i18nProxy.nav;
    expect(nav[Symbol.toPrimitive]).toBeUndefined();
  });
});

// ═══════════════════════════════════════════════════════════════════════
//  $i18n PROXY — DIRECTIVE INTEGRATION TESTS
// ═══════════════════════════════════════════════════════════════════════

describe('$i18n proxy in state expressions', () => {
  beforeEach(() => {
    _i18n._locale = 'en';
    _i18n.locales = {
      en: { greeting: 'Hello', nav: { home: 'Home' } },
      pt: { greeting: 'Olá', nav: { home: 'Início' } },
    };
    _config.i18n.fallbackLocale = 'en';
    _config.i18n.loadPath = null;
    _i18nListeners.clear();
  });

  afterEach(() => {
    _i18n._locale = 'en';
    _i18n.locales = {};
    _i18nListeners.clear();
    document.body.innerHTML = '';
  });

  test('$i18n resolves in state expression', () => {
    const el = document.createElement('div');
    el.setAttribute('state', '{ label: $i18n.greeting }');
    document.body.appendChild(el);
    processTree(el);

    const ctx = el.__ctx;
    expect(ctx.label).toBe('Hello');
  });

  test('$i18n nested path resolves in state expression', () => {
    const el = document.createElement('div');
    el.setAttribute('state', '{ navHome: $i18n.nav.home }');
    document.body.appendChild(el);
    processTree(el);

    const ctx = el.__ctx;
    expect(ctx.navHome).toBe('Home');
  });
});

describe('$i18n proxy in bind expressions', () => {
  beforeEach(() => {
    _i18n._locale = 'en';
    _i18n.locales = {
      en: { greeting: 'Hello', nav: { home: 'Home' } },
      pt: { greeting: 'Olá', nav: { home: 'Início' } },
    };
    _config.i18n.fallbackLocale = 'en';
    _config.i18n.loadPath = null;
    _i18nListeners.clear();
  });

  afterEach(() => {
    _i18n._locale = 'en';
    _i18n.locales = {};
    _i18nListeners.clear();
    document.body.innerHTML = '';
  });

  test('$i18n resolves in bind expression and updates on locale change', () => {
    const parent = document.createElement('div');
    parent.setAttribute('state', '{}');
    const span = document.createElement('span');
    span.setAttribute('bind', '$i18n.greeting');
    parent.appendChild(span);
    document.body.appendChild(parent);
    processTree(parent);

    expect(span.textContent).toBe('Hello');

    // Change locale
    _i18n.locale = 'pt';
    expect(span.textContent).toBe('Olá');
  });

  test('$i18n nested path in bind expression updates on locale change', () => {
    const parent = document.createElement('div');
    parent.setAttribute('state', '{}');
    const span = document.createElement('span');
    span.setAttribute('bind', '$i18n.nav.home');
    parent.appendChild(span);
    document.body.appendChild(parent);
    processTree(parent);

    expect(span.textContent).toBe('Home');

    _i18n.locale = 'pt';
    expect(span.textContent).toBe('Início');
  });
});

describe('$i18n proxy in computed expressions', () => {
  beforeEach(() => {
    _i18n._locale = 'en';
    _i18n.locales = {
      en: { greeting: 'Hello' },
      pt: { greeting: 'Olá' },
    };
    _config.i18n.fallbackLocale = 'en';
    _config.i18n.loadPath = null;
    _i18nListeners.clear();
  });

  afterEach(() => {
    _i18n._locale = 'en';
    _i18n.locales = {};
    _i18nListeners.clear();
    document.body.innerHTML = '';
  });

  test('$i18n in computed re-evaluates on locale change', () => {
    const parent = document.createElement('div');
    parent.setAttribute('state', '{ label: "" }');
    const computedEl = document.createElement('span');
    computedEl.setAttribute('computed', 'label');
    computedEl.setAttribute('expr', '$i18n.greeting');
    parent.appendChild(computedEl);
    const span = document.createElement('span');
    span.setAttribute('bind', 'label');
    parent.appendChild(span);
    document.body.appendChild(parent);
    processTree(parent);

    expect(span.textContent).toBe('Hello');

    _i18n.locale = 'pt';
    expect(span.textContent).toBe('Olá');
  });
});

describe('$i18n proxy in watch expressions', () => {
  beforeEach(() => {
    _i18n._locale = 'en';
    _i18n.locales = {
      en: { greeting: 'Hello' },
      pt: { greeting: 'Olá' },
    };
    _config.i18n.fallbackLocale = 'en';
    _config.i18n.loadPath = null;
    _i18nListeners.clear();
  });

  afterEach(() => {
    _i18n._locale = 'en';
    _i18n.locales = {};
    _i18nListeners.clear();
    document.body.innerHTML = '';
  });

  test('$i18n in watch triggers callback on locale change', () => {
    const parent = document.createElement('div');
    parent.setAttribute('state', '{ seen: "" }');
    const watchEl = document.createElement('span');
    watchEl.setAttribute('watch', '$i18n.greeting');
    watchEl.setAttribute('on:change', 'seen = $new');
    parent.appendChild(watchEl);
    const span = document.createElement('span');
    span.setAttribute('bind', 'seen');
    parent.appendChild(span);
    document.body.appendChild(parent);
    processTree(parent);

    // Initial: watch has not fired yet (no change)
    expect(span.textContent).toBe('');

    _i18n.locale = 'pt';
    expect(span.textContent).toBe('Olá');
  });
});

describe('$i18n proxy in if/show/hide expressions', () => {
  beforeEach(() => {
    _i18n._locale = 'en';
    _i18n.locales = {
      en: { showSection: 'yes' },
      pt: {},
    };
    _config.i18n.fallbackLocale = null;
    _config.i18n.loadPath = null;
    _i18nListeners.clear();
  });

  afterEach(() => {
    _i18n._locale = 'en';
    _i18n.locales = {};
    _config.i18n.fallbackLocale = 'en';
    _i18nListeners.clear();
    document.body.innerHTML = '';
  });

  test('$i18n in show condition works and updates on locale change', () => {
    const parent = document.createElement('div');
    parent.setAttribute('state', '{}');
    const el = document.createElement('span');
    el.setAttribute('show', '$i18n.showSection');
    el.textContent = 'Visible';
    parent.appendChild(el);
    document.body.appendChild(parent);
    processTree(parent);

    // 'yes' is truthy — element visible
    expect(el.style.display).not.toBe('none');

    // Switch to pt — showSection is undefined (falsy)
    _i18n.locale = 'pt';
    expect(el.style.display).toBe('none');
  });
});

describe('$i18n proxy in foreach expressions', () => {
  beforeEach(() => {
    _i18n._locale = 'en';
    _i18n.locales = {
      en: {
        navItems: ['Home', 'Docs', 'API'],
      },
      pt: {
        navItems: ['Início', 'Documentação', 'API'],
      },
    };
    _config.i18n.fallbackLocale = 'en';
    _config.i18n.loadPath = null;
    _i18nListeners.clear();
  });

  afterEach(() => {
    _i18n._locale = 'en';
    _i18n.locales = {};
    _i18nListeners.clear();
    document.body.innerHTML = '';
  });

  test('$i18n in foreach renders collection from translations', () => {
    const parent = document.createElement('div');
    parent.setAttribute('state', '{}');
    const ul = document.createElement('ul');
    const li = document.createElement('li');
    li.setAttribute('foreach', 'item in $i18n.navItems');
    li.setAttribute('bind', 'item');
    ul.appendChild(li);
    parent.appendChild(ul);
    document.body.appendChild(parent);
    processTree(parent);

    const items = ul.querySelectorAll('li');
    expect(items.length).toBe(3);
    expect(items[0].textContent).toBe('Home');
    expect(items[1].textContent).toBe('Docs');
    expect(items[2].textContent).toBe('API');
  });
});

describe('$i18n proxy in store expressions', () => {
  beforeEach(() => {
    _i18n._locale = 'en';
    _i18n.locales = {
      en: { greeting: 'Hello' },
    };
    _config.i18n.fallbackLocale = 'en';
    _config.i18n.loadPath = null;
    _i18nListeners.clear();
    _stores.app = { title: 'MyApp' };
  });

  afterEach(() => {
    _i18n._locale = 'en';
    _i18n.locales = {};
    _i18nListeners.clear();
    delete _stores.app;
    document.body.innerHTML = '';
  });

  test('$i18n resolves alongside $store in same expression', () => {
    const parent = document.createElement('div');
    parent.setAttribute('state', '{}');
    const span = document.createElement('span');
    span.setAttribute('bind', '$i18n.greeting');
    parent.appendChild(span);
    document.body.appendChild(parent);
    processTree(parent);

    expect(span.textContent).toBe('Hello');
  });
});

describe('_watchExpr auto-subscribes $i18n expressions', () => {
  beforeEach(() => {
    _i18n._locale = 'en';
    _i18n.locales = {
      en: { greeting: 'Hello' },
      pt: { greeting: 'Olá' },
    };
    _config.i18n.fallbackLocale = 'en';
    _config.i18n.loadPath = null;
    _i18nListeners.clear();
  });

  afterEach(() => {
    _i18n._locale = 'en';
    _i18n.locales = {};
    _i18nListeners.clear();
  });

  test('_watchExpr adds fn to _i18nListeners when expr contains $i18n', () => {
    const el = document.createElement('div');
    el.setAttribute('state', '{}');
    document.body.appendChild(el);
    processTree(el);
    const ctx = el.__ctx;

    _setCurrentEl(el);
    const fn = jest.fn();
    _watchExpr('$i18n.greeting', ctx, fn);

    expect(_i18nListeners.has(fn)).toBe(true);

    document.body.innerHTML = '';
  });

  test('_watchExpr does NOT add to _i18nListeners when expr has no $i18n', () => {
    const el = document.createElement('div');
    el.setAttribute('state', '{ x: 1 }');
    document.body.appendChild(el);
    processTree(el);
    const ctx = el.__ctx;

    _setCurrentEl(el);
    const fn = jest.fn();
    _watchExpr('x', ctx, fn);

    expect(_i18nListeners.has(fn)).toBe(false);

    document.body.innerHTML = '';
  });
});

// ─── F5 (NOJS-233): locale path-traversal / translation poisoning ─────────
// Untrusted input flowing into setLocale (e.g. $route.params.lang) must not be
// able to load an attacker-chosen same-origin path. Two layers of defense:
//   1. set locale rejects values not in supportedLocales (when configured).
//   2. _loadLocale percent-encodes the {locale}/{ns} placeholders so traversal
//      ("../../../account/settings") cannot escape the configured loadPath even
//      when supportedLocales is unset.
describe('i18n — F5 locale path traversal (NOJS-233)', () => {
  const originalFetch = global.fetch;
  let fetchMock;

  beforeEach(() => {
    _i18n._locale = 'en';
    _i18n.locales = {};
    _config.i18n.loadPath = '/locales/{locale}.json';
    _config.i18n.cache = false;
    _config.i18n.ns = [];
    _config.i18n.supportedLocales = [];

    fetchMock = jest.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ greeting: 'Hello' }),
    });
    global.fetch = fetchMock;
  });

  afterEach(() => {
    _i18n._locale = 'en';
    _i18n.locales = {};
    _config.i18n.loadPath = null;
    _config.i18n.cache = true;
    _config.i18n.ns = [];
    _config.i18n.supportedLocales = [];
    global.fetch = originalFetch;
  });

  // ── ENCODE (defense-in-depth, supportedLocales unset) ──────────────────
  test('encodes traversal locale so the traversed path is NOT fetched', async () => {
    await _loadI18nForLocale('../../../../account/settings');
    const encoded =
      '/locales/' + encodeURIComponent('../../../../account/settings') + '.json';
    expect(fetchMock).toHaveBeenCalledWith(encoded);
    // The raw traversed path must never reach fetch.
    expect(fetchMock).not.toHaveBeenCalledWith(
      '/locales/../../../../account/settings.json',
    );
    // Encoded form contains no literal "../" segment.
    expect(encoded).not.toContain('../');
    expect(encoded).toContain('%2F');
  });

  test('encodes "../admin?" so query/traversal characters are neutralized', async () => {
    await _loadI18nForLocale('../admin?');
    const encoded = '/locales/' + encodeURIComponent('../admin?') + '.json';
    expect(fetchMock).toHaveBeenCalledWith(encoded);
    expect(encoded).not.toContain('../');
    expect(encoded).not.toContain('?');
  });

  test.each(['a/b', 'a\\b', 'a?b', 'a#b'])(
    'neutralizes reserved char in locale "%s"',
    async (loc) => {
      await _loadI18nForLocale(loc);
      const encoded = '/locales/' + encodeURIComponent(loc) + '.json';
      expect(fetchMock).toHaveBeenCalledWith(encoded);
      // None of / \ ? # survive verbatim in the fetched URL path segment.
      const seg = encodeURIComponent(loc);
      expect(seg).not.toMatch(/[/\\?#]/);
    },
  );

  test('encodes the {ns} placeholder as well', async () => {
    _config.i18n.loadPath = '/locales/{locale}/{ns}.json';
    _config.i18n.ns = ['../secret'];
    await _loadI18nForLocale('en');
    const encoded = '/locales/en/' + encodeURIComponent('../secret') + '.json';
    expect(fetchMock).toHaveBeenCalledWith(encoded);
    expect(fetchMock).not.toHaveBeenCalledWith('/locales/en/../secret.json');
  });

  test('a normal locale still loads with the exact same URL as before', async () => {
    await _loadI18nForLocale('en');
    // encodeURIComponent('en') === 'en' — no behavior change for valid locales.
    expect(fetchMock).toHaveBeenCalledWith('/locales/en.json');
    expect(_i18n.locales.en).toEqual({ greeting: 'Hello' });
  });

  // ── REJECT (supportedLocales configured) ───────────────────────────────
  test('setter rejects a traversal locale when supportedLocales is configured', async () => {
    _config.i18n.supportedLocales = ['en', 'pt'];
    _config.i18n.loadPath = '/locales/{locale}/{ns}.json';
    _config.i18n.ns = ['dashboard'];
    const warnSpy = jest.spyOn(console, 'warn').mockImplementation();

    _i18n.locale = '../../../../account/settings';
    await new Promise((r) => setTimeout(r, 0));

    expect(warnSpy).toHaveBeenCalled();
    // Locale unchanged and nothing fetched.
    expect(_i18n.locale).toBe('en');
    expect(fetchMock).not.toHaveBeenCalled();
    warnSpy.mockRestore();
  });

  test.each(['../admin?', 'a/b', 'a\\b', 'a?b', 'a#b'])(
    'setter rejects reserved-char locale "%s" when supportedLocales is configured',
    async (loc) => {
      _config.i18n.supportedLocales = ['en', 'pt'];
      const warnSpy = jest.spyOn(console, 'warn').mockImplementation();

      _i18n.locale = loc;
      await new Promise((r) => setTimeout(r, 0));

      expect(warnSpy).toHaveBeenCalled();
      expect(_i18n.locale).toBe('en');
      expect(fetchMock).not.toHaveBeenCalled();
      warnSpy.mockRestore();
    },
  );

  // ── ACCEPT (allowed locales still work) ────────────────────────────────
  test('setter accepts an allowed locale and loads its namespaces', async () => {
    _config.i18n.supportedLocales = ['en', 'pt'];
    _config.i18n.loadPath = '/locales/{locale}/{ns}.json';
    _config.i18n.ns = ['dashboard'];

    _i18n.locale = 'pt';
    await new Promise((r) => setTimeout(r, 0));

    expect(_i18n.locale).toBe('pt');
    expect(fetchMock).toHaveBeenCalledWith('/locales/pt/dashboard.json');
  });

  test('flat-mode load for an allowed locale is unchanged with supportedLocales set', async () => {
    _config.i18n.supportedLocales = ['en', 'pt'];
    await _loadI18nForLocale('pt');
    await _loadI18nForLocale('en');
    expect(fetchMock).toHaveBeenCalledWith('/locales/pt.json');
    expect(fetchMock).toHaveBeenCalledWith('/locales/en.json');
  });
});

// ═══════════════════════════════════════════════════════════════════════
//  NOJS-248: t-* param expression sniff — $store/$route in params
//  register watchers so translation re-renders on mutation
// ═══════════════════════════════════════════════════════════════════════

describe('t-* param expression sniff (NOJS-248)', () => {
  beforeEach(() => {
    _i18n._locale = 'en';
    _i18n.locales = {
      en: {
        welcome: 'Welcome, {name}!',
        status: '{user} is {role}',
      },
    };
    _config.i18n.fallbackLocale = 'en';
    _config.i18n.loadPath = null;
    _i18nListeners.clear();
    _stores.user = { name: 'Alice', role: 'admin' };
  });

  afterEach(() => {
    _i18n._locale = 'en';
    _i18n.locales = {};
    _i18nListeners.clear();
    delete _stores.user;
    _storeWatchers.clear();
    document.body.innerHTML = '';
  });

  test('store-driven t-* param re-renders translation on store mutation', () => {
    const parent = document.createElement('div');
    parent.setAttribute('state', '{}');
    const el = document.createElement('span');
    el.setAttribute('t', 'welcome');
    el.setAttribute('t-name', '$store.user.name');
    parent.appendChild(el);
    document.body.appendChild(parent);
    processTree(parent);

    // Initial render uses the store value
    expect(el.textContent).toBe('Welcome, Alice!');

    // Mutate the store and notify watchers
    _stores.user.name = 'Bob';
    _notifyStoreWatchers('user');

    // Translation re-renders with the updated store value
    expect(el.textContent).toBe('Welcome, Bob!');
  });

  test('multiple store-driven t-* params all trigger re-render', () => {
    const parent = document.createElement('div');
    parent.setAttribute('state', '{}');
    const el = document.createElement('span');
    el.setAttribute('t', 'status');
    el.setAttribute('t-user', '$store.user.name');
    el.setAttribute('t-role', '$store.user.role');
    parent.appendChild(el);
    document.body.appendChild(parent);
    processTree(parent);

    expect(el.textContent).toBe('Alice is admin');

    _stores.user.name = 'Carol';
    _stores.user.role = 'editor';
    _notifyStoreWatchers('user');

    expect(el.textContent).toBe('Carol is editor');
  });

  test('t-* param with $store registers store watcher', () => {
    const parent = document.createElement('div');
    parent.setAttribute('state', '{}');
    const el = document.createElement('span');
    el.setAttribute('t', 'welcome');
    el.setAttribute('t-name', '$store.user.name');
    parent.appendChild(el);
    document.body.appendChild(parent);
    processTree(parent);

    // A store watcher should be registered for the 'user' partition
    const userSet = _storeWatchers.get('user');
    expect(userSet).toBeTruthy();
    expect(userSet.size).toBeGreaterThanOrEqual(1);
  });

  test('t key without $store in params does not register store watcher', () => {
    const sizeBefore = _storeWatchers.size;
    const parent = document.createElement('div');
    parent.setAttribute('state', '{ name: "World" }');
    const el = document.createElement('span');
    el.setAttribute('t', 'welcome');
    el.setAttribute('t-name', 'name');
    parent.appendChild(el);
    document.body.appendChild(parent);
    processTree(parent);

    expect(el.textContent).toBe('Welcome, World!');
    // No new store watcher partitions should have been added
    expect(_storeWatchers.size).toBe(sizeBefore);
  });

  // ── Edge cases (QA: NOJS-248) ──────────────────────────────────────────

  test('non-parameterized t usage unchanged — no store/route watcher', () => {
    const storesBefore = _storeWatchers.size;
    const routesBefore = _routeWatchers.size;
    const parent = document.createElement('div');
    parent.setAttribute('state', '{}');
    _i18n.locales.en.hello = 'Hello';
    const el = document.createElement('span');
    el.setAttribute('t', 'hello');
    parent.appendChild(el);
    document.body.appendChild(parent);
    processTree(parent);

    expect(el.textContent).toBe('Hello');
    expect(_storeWatchers.size).toBe(storesBefore);
    expect(_routeWatchers.size).toBe(routesBefore);
  });

  test('$route in t-* param registers route watcher', () => {
    const routesBefore = _routeWatchers.size;
    _i18n.locales.en.page = 'Page: {id}';
    const parent = document.createElement('div');
    parent.setAttribute('state', '{}');
    const el = document.createElement('span');
    el.setAttribute('t', 'page');
    el.setAttribute('t-id', '$route.params.id');
    parent.appendChild(el);
    document.body.appendChild(parent);
    processTree(parent);

    expect(_routeWatchers.size).toBeGreaterThan(routesBefore);
  });

  test('t-html attribute is excluded from param sniff collection', () => {
    // t-html is a modifier flag, not a translation param — it must not
    // be included in the sniff string or evaluated as a param expression.
    _i18n.locales.en.bold = '<b>{name}</b>';
    const parent = document.createElement('div');
    parent.setAttribute('state', '{}');
    const el = document.createElement('span');
    el.setAttribute('t', 'bold');
    el.setAttribute('t-html', '');
    el.setAttribute('t-name', '$store.user.name');
    parent.appendChild(el);
    document.body.appendChild(parent);
    processTree(parent);

    // Should render HTML with the store value
    expect(el.innerHTML).toContain('<b>Alice</b>');

    // Only 'user' partition should be registered, not a spurious empty-string match
    const userSet = _storeWatchers.get('user');
    expect(userSet).toBeTruthy();
    expect(userSet.size).toBeGreaterThanOrEqual(1);
  });

  test('mixed params — one $store, one literal — store watcher still registers', () => {
    _i18n.locales.en.mixed = '{greeting}, {name}!';
    const parent = document.createElement('div');
    parent.setAttribute('state', '{ greeting: "Hi" }');
    const el = document.createElement('span');
    el.setAttribute('t', 'mixed');
    el.setAttribute('t-greeting', 'greeting');
    el.setAttribute('t-name', '$store.user.name');
    parent.appendChild(el);
    document.body.appendChild(parent);
    processTree(parent);

    expect(el.textContent).toBe('Hi, Alice!');

    // Store watcher registered via the t-name param
    const userSet = _storeWatchers.get('user');
    expect(userSet).toBeTruthy();

    // Mutate store — translation re-renders
    _stores.user.name = 'Dave';
    _notifyStoreWatchers('user');
    expect(el.textContent).toBe('Hi, Dave!');
  });

  test('many t-* params with nested expressions build correct sniff', () => {
    _i18n.locales.en.report = '{a} / {b} / {c}';
    _stores.metrics = { x: 10 };
    const parent = document.createElement('div');
    parent.setAttribute('state', '{ localVal: 99 }');
    const el = document.createElement('span');
    el.setAttribute('t', 'report');
    el.setAttribute('t-a', '$store.user.name');
    el.setAttribute('t-b', 'localVal');
    el.setAttribute('t-c', '$store.metrics.x');
    parent.appendChild(el);
    document.body.appendChild(parent);
    processTree(parent);

    expect(el.textContent).toBe('Alice / 99 / 10');

    // The sniff string contains both $store references, so the first
    // partition ('user') is registered.  Verify at least one store watcher.
    expect(_storeWatchers.size).toBeGreaterThanOrEqual(1);

    // Clean up extra store
    delete _stores.metrics;
  });
});