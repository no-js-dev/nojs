import { _hasCompiled, _getCompiledIndex } from '../src/compiled.js';

describe('compiled.js', () => {
  // ── _hasCompiled ──────────────────────────────────────────────────

  describe('_hasCompiled', () => {
    test('returns true when data-nojs-e is present', () => {
      const el = document.createElement('div');
      el.setAttribute('data-nojs-e', '{"bind":0}');
      expect(_hasCompiled(el)).toBe(true);
    });

    test('returns false when data-nojs-e is absent', () => {
      const el = document.createElement('div');
      expect(_hasCompiled(el)).toBe(false);
    });

    test('returns false for null / undefined', () => {
      expect(_hasCompiled(null)).toBe(false);
      expect(_hasCompiled(undefined)).toBe(false);
    });
  });

  // ── _getCompiledIndex ─────────────────────────────────────────────

  describe('_getCompiledIndex', () => {
    test('returns the correct index for a known directive', () => {
      const el = document.createElement('div');
      el.setAttribute('data-nojs-e', '{"bind":0,"on:click":1}');
      expect(_getCompiledIndex(el, 'bind')).toBe(0);
      expect(_getCompiledIndex(el, 'on:click')).toBe(1);
    });

    test('returns null for an unknown directive', () => {
      const el = document.createElement('div');
      el.setAttribute('data-nojs-e', '{"bind":0}');
      expect(_getCompiledIndex(el, 'if')).toBeNull();
    });

    test('returns null when the element has no compiled attribute', () => {
      const el = document.createElement('div');
      expect(_getCompiledIndex(el, 'bind')).toBeNull();
    });

    test('caches the parsed map on the element', () => {
      const el = document.createElement('div');
      el.setAttribute('data-nojs-e', '{"bind":0,"show":2}');

      // First call — parses
      _getCompiledIndex(el, 'bind');

      // Verify cache was set
      expect(el.__nojs_compiled_map).toEqual({ bind: 0, show: 2 });

      // Mutate the attribute — cached value should still be used
      el.setAttribute('data-nojs-e', '{"bind":99}');
      expect(_getCompiledIndex(el, 'bind')).toBe(0); // from cache, not re-parsed
    });

    test('returns null for malformed JSON', () => {
      const el = document.createElement('div');
      el.setAttribute('data-nojs-e', '{not valid json}');
      expect(_getCompiledIndex(el, 'bind')).toBeNull();
    });

    test('returns null for non-numeric values in the map', () => {
      const el = document.createElement('div');
      el.setAttribute('data-nojs-e', '{"bind":"hello"}');
      expect(_getCompiledIndex(el, 'bind')).toBeNull();
    });
  });
});
