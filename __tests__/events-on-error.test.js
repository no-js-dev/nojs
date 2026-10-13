/**
 * on:error listens to the element's own `error` event (NOJS-EVT-001).
 *
 * `on:error` used to add a bubble-phase listener on window instead. Resource
 * load errors (<img>, <script>, <video> …) do not bubble, so `<img on:error>`
 * never ran; and for an uncaught JS error (target === window) the
 * `el.contains(window)` check threw a TypeError once per on:error element.
 * An <img> that already failed before No.JS processed it gets the error
 * replayed once, to its on:error handlers only.
 */

import { _stores } from '../src/globals.js';
import { processTree, _disposeTree } from '../src/registry.js';
import { findContext } from '../src/dom.js';

import '../src/directives/state.js';
import '../src/directives/events.js';

let errorSpy;
beforeEach(() => {
  // jsdom reports exceptions thrown by event listeners through console.error.
  errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
});
afterEach(() => {
  errorSpy.mockRestore();
  for (const child of [...document.body.children]) _disposeTree(child);
  document.body.innerHTML = '';
  Object.keys(_stores).forEach((k) => delete _stores[k]);
});

function mount(html, prepare) {
  const host = document.createElement('div');
  host.innerHTML = html;
  if (prepare) prepare(host);
  document.body.appendChild(host);
  processTree(host);
  return host;
}

// jsdom never loads images: fake the state of an <img> whose load has
// already failed (or succeeded) before No.JS processes it.
function loadState(naturalWidth) {
  return (host) => {
    const img = host.querySelector('img');
    Object.defineProperty(img, 'complete', { value: true });
    Object.defineProperty(img, 'naturalWidth', { value: naturalWidth });
  };
}

// The replay is deferred to a timer; this resolves after it has run.
const tick = () => new Promise((resolve) => setTimeout(resolve, 0));

describe('on:error on the element', () => {
  test('a failed load on <img on:error> runs the handler with $event', () => {
    const host = mount('<div state="{ fails: 0, kind: null }"><img on:error="fails++; kind = $event.type"></div>');
    const img = host.querySelector('img');
    const ctx = findContext(img);

    // What the browser fires on a failed load: a plain, non-bubbling Event.
    img.dispatchEvent(new Event('error'));
    expect(ctx.fails).toBe(1);
    expect(ctx.kind).toBe('error');

    // The listener is removed on dispose.
    _disposeTree(host);
    img.dispatchEvent(new Event('error'));
    expect(ctx.fails).toBe(1);
  });

  test('an uncaught window error does not throw or run on:error handlers', () => {
    const host = mount('<div state="{ fails: 0 }"><img on:error="fails++"><div on:error="fails++"></div></div>');

    // No `error` property: with no window listener left, Jest's jsdom
    // environment would rethrow it as an uncaught exception of the test.
    window.dispatchEvent(new ErrorEvent('error', { message: 'boom' }));

    const reported = errorSpy.mock.calls.map((c) => String(c[0]?.message ?? c[0]));
    expect(reported).toEqual([]);
    expect(findContext(host.querySelector('img')).fails).toBe(0);
  });
});

describe('on:error on an <img> that failed before init', () => {
  test('the error is replayed once to every on:error on the element', async () => {
    const host = mount(
      '<div state="{ fails: 0, onces: 0, kind: null, own: false }">' +
        '<img src="/missing.png" on:error="fails++; kind = $event.type; own = $event.target === $el && $event.currentTarget === $el"' +
        ' on:error.self.once="onces++">' +
      '</div>',
      loadState(0)
    );
    const ctx = findContext(host.querySelector('img'));

    await tick();
    expect([ctx.fails, ctx.onces, ctx.kind, ctx.own]).toEqual([1, 1, 'error', true]);
    await tick();
    expect([ctx.fails, ctx.onces]).toEqual([1, 1]);

    // A later real error runs on:error again; the .once handler is used up.
    host.querySelector('img').dispatchEvent(new Event('error'));
    expect([ctx.fails, ctx.onces]).toEqual([2, 1]);
  });

  test('the replay reaches only on:error, not inline onerror or ancestor listeners', async () => {
    const onAncestor = jest.fn();
    const host = mount(
      '<div state="{ fails: 0 }"><img src="/missing.png" onerror="this.dataset.inline = \'ran\'" on:error="fails++"></div>',
      (h) => { loadState(0)(h); h.addEventListener('error', onAncestor, true); }
    );
    const img = host.querySelector('img');

    await tick();
    expect(findContext(img).fails).toBe(1);
    expect(img.dataset.inline).toBeUndefined();
    expect(onAncestor).not.toHaveBeenCalled();

    // Control: a real error event does reach both.
    img.dispatchEvent(new Event('error'));
    expect(img.dataset.inline).toBe('ran');
    expect(onAncestor).toHaveBeenCalledTimes(1);
  });

  test('no replay when the browser\'s own event arrives after init', async () => {
    const host = mount('<div state="{ fails: 0 }"><img src="/missing.png" on:error="fails++"></div>', loadState(0));
    const img = host.querySelector('img');

    // A browser may report `complete` before its queued error event runs.
    img.dispatchEvent(new Event('error'));
    await tick();
    expect(findContext(img).fails).toBe(1);
  });

  test('no replay for a loaded image, an image without src, or a disposed element', async () => {
    const loaded = mount('<div state="{ fails: 0 }"><img src="/ok.png" on:error="fails++"></div>', loadState(120));
    const noSrc = mount('<div state="{ fails: 0 }"><img on:error="fails++"></div>', loadState(0));
    const disposed = mount('<div state="{ fails: 0 }"><img src="/missing.png" on:error="fails++"></div>', loadState(0));
    _disposeTree(disposed);

    await tick();
    for (const host of [loaded, noSrc, disposed]) {
      expect(findContext(host.querySelector('img')).fails).toBe(0);
    }
  });

  test('re-processing the element does not replay the same failure again', async () => {
    const host = mount('<div state="{ fails: 0 }"><img src="/missing.png" on:error="fails++"></div>', loadState(0));
    await tick();

    _disposeTree(host);
    processTree(host); // fresh state context, same broken <img>
    await tick();
    expect(findContext(host.querySelector('img')).fails).toBe(0);
  });
});
