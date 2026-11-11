/**
 * Watchers disposed during a batch drain must not run (NOJS-312 F4 part i).
 *
 * _endBatch drains a snapshot of the queued watchers. When one of them (the
 * `switch` update) disposes an element, the element's watchers are removed
 * from the listener sets but were still in the snapshot, so they ran once
 * more with the new value, after the case got display:none. A `get` inside
 * the case fired a request for a case that was already hidden.
 */
import { findContext } from '../src/dom.js';
import { processTree, _disposeTree } from '../src/registry.js';
import { createContext, _startBatch, _endBatch } from '../src/context.js';
import { _filters, _watchExpr, _setCurrentEl, _stores, _notifyStoreWatchers } from '../src/globals.js';

import '../src/filters.js';
import '../src/directives/state.js';
import '../src/directives/binding.js';
import '../src/directives/conditionals.js';
import '../src/directives/http.js';
import '../src/directives/sse.js';

const flush = (ms = 10) => new Promise((r) => setTimeout(r, ms));

function mount(html) {
  document.body.innerHTML = html;
  processTree(document.body);
  return findContext(document.getElementById('root'));
}

let calls;

beforeEach(() => {
  calls = [];
  // Records each evaluation with the case's display at that moment.
  _filters.tap = (v, tag) => {
    const c = document.getElementById('c' + tag.toLowerCase());
    calls.push(tag + ':' + (c ? c.style.display || 'shown' : '?'));
    return v;
  };
});

afterEach(() => {
  delete _filters.tap;
  document.body.innerHTML = '';
});

const SWITCH = `<div id="root" state="{ s: 'a' }">
  <div switch="s">
    <p case="'a'" id="ca"><span id="va" bind="s | tap:'A'"></span></p>
    <p case="'b'" id="cb"><span id="vb" bind="s | tap:'B'"></span></p>
  </div></div>`;

describe('switch: a case being hidden does not re-evaluate', () => {
  test('the hidden case keeps its last value and its bind does not run with display:none', async () => {
    const ctx = mount(SWITCH);
    // Show and hide B once, so both cases went through the dispose path.
    ctx.s = 'b'; await flush();
    ctx.s = 'a'; await flush();
    expect(document.getElementById('va').textContent).toBe('a');

    calls = [];
    ctx.s = 'b'; await flush();

    expect(document.getElementById('ca').style.display).toBe('none');
    expect(document.getElementById('va').textContent).toBe('a');
    expect(calls).not.toContain('A:none');
    expect(calls.filter((c) => c.startsWith('A:'))).toEqual([]);
    expect(document.getElementById('vb').textContent).toBe('b');
  });

  test('the shown case still renders the new value', async () => {
    const ctx = mount(SWITCH);
    ctx.s = 'b'; await flush();
    ctx.s = 'a'; await flush();
    ctx.s = 'b'; await flush();
    expect(document.getElementById('vb').textContent).toBe('b');
    expect(document.getElementById('cb').style.display).toBe('');
    ctx.s = 'a'; await flush();
    expect(document.getElementById('va').textContent).toBe('a');
    expect(document.getElementById('ca').style.display).toBe('');
  });
});

describe('_endBatch skips watchers disposed earlier in the same drain', () => {
  test('a watcher whose element is disposed by another watcher does not run', () => {
    const ctx = createContext({ n: 0 });
    const host = document.createElement('div');
    const victim = document.createElement('span');
    host.appendChild(victim);
    document.body.appendChild(host);

    const runs = [];
    // First watcher disposes the second one's element, which stays connected.
    _setCurrentEl(host);
    _watchExpr('n', ctx, () => { runs.push('killer'); _disposeTree(victim); });
    _setCurrentEl(victim);
    _watchExpr('n', ctx, () => runs.push('victim'));
    _setCurrentEl(null);

    _startBatch();
    ctx.n = 1;
    _endBatch();

    expect(victim.isConnected).toBe(true);
    expect(runs).toEqual(['killer']);

    // Disposed for good: later notifications do not reach it either.
    ctx.n = 2;
    expect(runs).toEqual(['killer', 'killer']);
  });
});

describe('directives watching through $watch / $store in a hidden case', () => {
  afterEach(() => {
    delete global.fetch;
    delete global.EventSource;
    delete _stores.ui;
  });

  test('get: hiding the case does not request the new URL', async () => {
    const urls = [];
    global.fetch = jest.fn((url) => {
      urls.push(url);
      return Promise.resolve({
        ok: true, status: 200, headers: new Headers({ 'content-type': 'application/json' }),
        json: () => Promise.resolve({ name: url }), text: () => Promise.resolve(JSON.stringify({ name: url })),
      });
    });
    const ctx = mount(`<div id="root" state="{ s: 'a' }">
      <div switch="s">
        <section case="'a'" id="ca"><div get="/api/item-{s}" as="item"><span id="ia" bind="item.name"></span></div></section>
        <section case="'b'" id="cb">B</section>
      </div></div>`);
    await flush(30);
    expect(urls.map((u) => u.replace(/^.*\/api/, '/api'))).toEqual(['/api/item-a']);

    urls.length = 0;
    ctx.s = 'b';
    await flush(30);
    expect(document.getElementById('ca').style.display).toBe('none');
    expect(urls).toEqual([]);
  });

  test('sse: hiding the case does not reopen a connection for the new URL', async () => {
    const opened = [];
    global.EventSource = class {
      constructor(url) { this.url = url; this.readyState = 0; opened.push(url); }
      addEventListener() {}
      removeEventListener() {}
      close() { this.readyState = 2; }
    };
    const ctx = mount(`<div id="root" state="{ s: 'a' }">
      <div switch="s">
        <section case="'a'" id="ca"><div sse="/events/{s}" as="ev"></div></section>
        <section case="'b'" id="cb">B</section>
      </div></div>`);
    expect(opened.map((u) => u.replace(/^.*\/events/, '/events'))).toEqual(['/events/a']);

    opened.length = 0;
    ctx.s = 'b';
    await flush();
    expect(document.getElementById('ca').style.display).toBe('none');
    expect(opened).toEqual([]);
  });

  test('$store: a case hidden by a store change does not re-evaluate', async () => {
    _stores.ui = createContext({ s: 'a' });
    mount(`<div id="root" state="{}">
      <div switch="$store.ui.s">
        <p case="'a'" id="ca"><span id="va" bind="$store.ui.s | tap:'A'"></span></p>
        <p case="'b'" id="cb"><span id="vb" bind="$store.ui.s | tap:'B'"></span></p>
      </div></div>`);
    _stores.ui.s = 'b'; _notifyStoreWatchers('ui'); await flush();
    _stores.ui.s = 'a'; _notifyStoreWatchers('ui'); await flush();
    expect(document.getElementById('va').textContent).toBe('a');

    calls = [];
    _stores.ui.s = 'b'; _notifyStoreWatchers('ui'); await flush();
    expect(document.getElementById('ca').style.display).toBe('none');
    expect(document.getElementById('va').textContent).toBe('a');
    expect(calls.filter((c) => c.startsWith('A:'))).toEqual([]);
    expect(document.getElementById('vb').textContent).toBe('b');
  });
});
