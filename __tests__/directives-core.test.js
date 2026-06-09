


import { _stores, _config } from '../src/globals.js';
import { createContext } from '../src/context.js';
import { registerDirective, processTree, processElement, _disposeTree, _disposeChildren } from '../src/registry.js';
import { findContext } from '../src/dom.js';


import '../src/filters.js';
import '../src/directives/state.js';
import '../src/directives/binding.js';
import '../src/directives/conditionals.js';
import '../src/directives/events.js';
import '../src/directives/loops.js';
import '../src/directives/validate-stub.js';
import '../src/directives/error-boundary.js';

describe('State Directive', () => {
  afterEach(() => {
    document.body.innerHTML = '';
    Object.keys(_stores).forEach((k) => delete _stores[k]);
  });

  test('creates reactive context from state attribute', () => {
    const div = document.createElement('div');
    div.setAttribute('state', '{ count: 0, name: "test" }');
    document.body.appendChild(div);
    processTree(div);

    const ctx = div.__ctx;
    expect(ctx).toBeDefined();
    expect(ctx.__isProxy).toBe(true);
    expect(ctx.count).toBe(0);
    expect(ctx.name).toBe('test');
  });

  test('creates empty context for empty state', () => {
    const div = document.createElement('div');
    div.setAttribute('state', '{}');
    document.body.appendChild(div);
    processTree(div);

    expect(div.__ctx).toBeDefined();
    expect(div.__ctx.__isProxy).toBe(true);
  });

  test('state with nested objects', () => {
    const div = document.createElement('div');
    div.setAttribute('state', '{ user: { name: "Alice", age: 25 } }');
    document.body.appendChild(div);
    processTree(div);

    expect(div.__ctx.user).toEqual({ name: 'Alice', age: 25 });
  });

  test('inherits parent context', () => {
    const parent = document.createElement('div');
    parent.setAttribute('state', '{ x: 10 }');
    const child = document.createElement('div');
    child.setAttribute('state', '{ y: 20 }');
    parent.appendChild(child);
    document.body.appendChild(parent);
    processTree(parent);

    expect(child.__ctx.y).toBe(20);
    expect(child.__ctx.x).toBe(10); 
  });
});

describe('Store Directive', () => {
  afterEach(() => {
    Object.keys(_stores).forEach((k) => delete _stores[k]);
    document.body.innerHTML = '';
  });

  test('creates a global store', () => {
    const div = document.createElement('div');
    div.setAttribute('store', 'cart');
    div.setAttribute('value', '{ items: [], total: 0 }');
    document.body.appendChild(div);
    processTree(div);

    expect(_stores.cart).toBeDefined();
    expect(_stores.cart.items).toEqual([]);
    expect(_stores.cart.total).toBe(0);
  });

  test('does not overwrite existing store', () => {
    _stores.existing = createContext({ value: 'original' });
    const div = document.createElement('div');
    div.setAttribute('store', 'existing');
    div.setAttribute('value', '{ value: "new" }');
    document.body.appendChild(div);
    processTree(div);

    expect(_stores.existing.value).toBe('original');
  });

  test('creates empty store without value', () => {
    const div = document.createElement('div');
    div.setAttribute('store', 'empty');
    document.body.appendChild(div);
    processTree(div);

    expect(_stores.empty).toBeDefined();
    expect(_stores.empty.__isProxy).toBe(true);
  });
});

describe('Computed Directive', () => {
  afterEach(() => {
    document.body.innerHTML = '';
  });

  test('computes a derived value', () => {
    const parent = document.createElement('div');
    parent.setAttribute('state', '{ price: 100, qty: 3 }');
    const computed = document.createElement('span');
    computed.setAttribute('computed', 'total');
    computed.setAttribute('expr', 'price * qty');
    parent.appendChild(computed);
    document.body.appendChild(parent);
    processTree(parent);

    expect(parent.__ctx.total).toBe(300);
  });

  test('recomputes when dependency changes', () => {
    const parent = document.createElement('div');
    parent.setAttribute('state', '{ a: 2, b: 3 }');
    const computed = document.createElement('span');
    computed.setAttribute('computed', 'sum');
    computed.setAttribute('expr', 'a + b');
    parent.appendChild(computed);
    document.body.appendChild(parent);
    processTree(parent);

    expect(parent.__ctx.sum).toBe(5);
    parent.__ctx.a = 10;
    expect(parent.__ctx.sum).toBe(13);
  });
});

describe('Watch Directive', () => {
  afterEach(() => {
    document.body.innerHTML = '';
  });

  test('calls on:change when watched expression changes', () => {
    const parent = document.createElement('div');
    parent.setAttribute('state', '{ count: 0, lastChange: "" }');
    const watch = document.createElement('span');
    watch.setAttribute('watch', 'count');
    watch.setAttribute('on:change', 'lastChange = "changed"');
    parent.appendChild(watch);
    document.body.appendChild(parent);
    processTree(parent);

    parent.__ctx.count = 5;
    expect(parent.__ctx.lastChange).toBe('changed');
  });
});



describe('Bind Directive', () => {
  afterEach(() => {
    document.body.innerHTML = '';
  });

  test('bind sets textContent', () => {
    const parent = document.createElement('div');
    parent.setAttribute('state', '{ name: "Alice" }');
    const span = document.createElement('span');
    span.setAttribute('bind', 'name');
    parent.appendChild(span);
    document.body.appendChild(parent);
    processTree(parent);

    expect(span.textContent).toBe('Alice');
  });

  test('bind updates on state change', () => {
    const parent = document.createElement('div');
    parent.setAttribute('state', '{ msg: "hello" }');
    const span = document.createElement('span');
    span.setAttribute('bind', 'msg');
    parent.appendChild(span);
    document.body.appendChild(parent);
    processTree(parent);

    expect(span.textContent).toBe('hello');
    parent.__ctx.msg = 'world';
    expect(span.textContent).toBe('world');
  });

  test('bind with expression', () => {
    const parent = document.createElement('div');
    parent.setAttribute('state', '{ a: 3, b: 4 }');
    const span = document.createElement('span');
    span.setAttribute('bind', 'a + b');
    parent.appendChild(span);
    document.body.appendChild(parent);
    processTree(parent);

    expect(span.textContent).toBe('7');
  });
});

describe('Bind-HTML Directive', () => {
  afterEach(() => {
    document.body.innerHTML = '';
  });

  test('sets innerHTML with sanitization', () => {
    const parent = document.createElement('div');
    parent.setAttribute('state', '{ content: "<b>Bold</b>" }');
    const div = document.createElement('div');
    div.setAttribute('bind-html', 'content');
    parent.appendChild(div);
    document.body.appendChild(parent);
    processTree(parent);

    expect(div.innerHTML).toBe('<b>Bold</b>');
  });

  test('sanitizes script tags', () => {
    const parent = document.createElement('div');
    parent.setAttribute('state', '{ content: "<script>alert(1)</script><p>safe</p>" }');
    const div = document.createElement('div');
    div.setAttribute('bind-html', 'content');
    parent.appendChild(div);
    document.body.appendChild(parent);
    processTree(parent);

    expect(div.innerHTML).not.toContain('<script');
    expect(div.innerHTML).toContain('<p>safe</p>');
  });
});

describe('Bind-* Directive', () => {
  afterEach(() => {
    document.body.innerHTML = '';
  });

  test('binds arbitrary attributes', () => {
    const parent = document.createElement('div');
    parent.setAttribute('state', '{ url: "https://example.com" }');
    const a = document.createElement('a');
    a.setAttribute('bind-href', 'url');
    parent.appendChild(a);
    document.body.appendChild(parent);
    processTree(parent);

    expect(a.getAttribute('href')).toBe('https://example.com');
  });

  test('toggles boolean attributes', () => {
    const parent = document.createElement('div');
    parent.setAttribute('state', '{ isDisabled: true }');
    const btn = document.createElement('button');
    btn.setAttribute('bind-disabled', 'isDisabled');
    parent.appendChild(btn);
    document.body.appendChild(parent);
    processTree(parent);

    expect(btn.hasAttribute('disabled')).toBe(true);
    expect(btn.disabled).toBe(true);

    parent.__ctx.isDisabled = false;
    expect(btn.hasAttribute('disabled')).toBe(false);
    expect(btn.disabled).toBe(false);
  });

  test('removes attribute when value is null', () => {
    const parent = document.createElement('div');
    parent.setAttribute('state', '{ title: "hello" }');
    const div = document.createElement('div');
    div.setAttribute('bind-title', 'title');
    parent.appendChild(div);
    document.body.appendChild(parent);
    processTree(parent);

    expect(div.getAttribute('title')).toBe('hello');
    parent.__ctx.title = null;
    expect(div.hasAttribute('title')).toBe(false);
  });

  test('blocks javascript: protocol in bind-href', () => {
    const parent = document.createElement('div');
    parent.setAttribute('state', '{ url: "javascript:alert(1)" }');
    const a = document.createElement('a');
    a.setAttribute('bind-href', 'url');
    parent.appendChild(a);
    document.body.appendChild(parent);
    processTree(parent);

    expect(a.getAttribute('href')).toBe('#');
  });

  test('blocks vbscript: protocol in bind-href', () => {
    const parent = document.createElement('div');
    parent.setAttribute('state', '{ url: "vbscript:run()" }');
    const a = document.createElement('a');
    a.setAttribute('bind-href', 'url');
    parent.appendChild(a);
    document.body.appendChild(parent);
    processTree(parent);

    expect(a.getAttribute('href')).toBe('#');
  });

  test('blocks javascript: protocol in bind-src', () => {
    const parent = document.createElement('div');
    parent.setAttribute('state', '{ src: "javascript:void(0)" }');
    const img = document.createElement('img');
    img.setAttribute('bind-src', 'src');
    parent.appendChild(img);
    document.body.appendChild(parent);
    processTree(parent);

    expect(img.getAttribute('src')).toBe('#');
  });

  test('passes safe HTTPS URL through bind-href unchanged', () => {
    const parent = document.createElement('div');
    parent.setAttribute('state', '{ url: "https://example.com/page" }');
    const a = document.createElement('a');
    a.setAttribute('bind-href', 'url');
    parent.appendChild(a);
    document.body.appendChild(parent);
    processTree(parent);

    expect(a.getAttribute('href')).toBe('https://example.com/page');
  });

  test('does not sanitize non-URL attributes like data-custom', () => {
    const parent = document.createElement('div');
    parent.setAttribute('state', '{ val: "javascript:test" }');
    const div = document.createElement('div');
    div.setAttribute('bind-data-custom', 'val');
    parent.appendChild(div);
    document.body.appendChild(parent);
    processTree(parent);

    // data-custom is not in _SAFE_URL_ATTRS — value passes through
    expect(div.getAttribute('data-custom')).toBe('javascript:test');
  });
});

describe('SVG Data URI Sanitization (DOMParser)', () => {
  afterEach(() => {
    document.body.innerHTML = '';
  });

  function svgDataUri(svgContent) {
    return 'data:image/svg+xml,' + encodeURIComponent(svgContent);
  }

  function getSrcSvg(el) {
    const src = el.getAttribute('src');
    const comma = src.indexOf(',');
    return decodeURIComponent(src.slice(comma + 1));
  }

  function bindSrc(dataUri) {
    const parent = document.createElement('div');
    parent.setAttribute('state', '{ uri: "" }');
    const img = document.createElement('img');
    img.setAttribute('bind-src', 'uri');
    parent.appendChild(img);
    document.body.appendChild(parent);
    processTree(parent);
    parent.__ctx.uri = dataUri;
    return img;
  }

  test('strips <script> tags from SVG', () => {
    const uri = svgDataUri('<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script><circle r="5"/></svg>');
    const img = bindSrc(uri);
    const svg = getSrcSvg(img);
    expect(svg).not.toContain('<script');
    expect(svg).toContain('circle');
  });

  test('strips onerror attribute from SVG elements', () => {
    const uri = svgDataUri('<svg xmlns="http://www.w3.org/2000/svg"><image onerror="alert(1)" href="x"/></svg>');
    const img = bindSrc(uri);
    const svg = getSrcSvg(img);
    expect(svg).not.toContain('onerror');
  });

  test('strips onload attribute from SVG elements', () => {
    const uri = svgDataUri('<svg xmlns="http://www.w3.org/2000/svg" onload="alert(1)"><rect width="1" height="1"/></svg>');
    const img = bindSrc(uri);
    const svg = getSrcSvg(img);
    expect(svg).not.toContain('onload');
    expect(svg).toContain('rect');
  });

  test('strips javascript: href from SVG elements', () => {
    const uri = svgDataUri('<svg xmlns="http://www.w3.org/2000/svg"><a href="javascript:alert(1)"><text>click</text></a></svg>');
    const img = bindSrc(uri);
    const svg = getSrcSvg(img);
    expect(svg).not.toContain('javascript:');
    expect(svg).toContain('text');
  });

  test('passes clean SVG through intact', () => {
    const uri = svgDataUri('<svg xmlns="http://www.w3.org/2000/svg"><circle cx="50" cy="50" r="40" fill="red"/></svg>');
    const img = bindSrc(uri);
    const svg = getSrcSvg(img);
    expect(svg).toContain('circle');
    expect(svg).toContain('fill="red"');
    expect(svg).toContain('r="40"');
  });

  test('returns safe output for malformed SVG input', () => {
    const uri = svgDataUri('<<<not-valid-xml>>>');
    const img = bindSrc(uri);
    const src = img.getAttribute('src');
    // Should either fall back to "#" or return a safe SVG — never the raw malformed input
    expect(src).not.toContain('<<<');
  });

  test('sanitizes base64-encoded SVG data URIs', () => {
    const svgContent = '<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script><rect/></svg>';
    const uri = 'data:image/svg+xml;base64,' + btoa(svgContent);
    const img = bindSrc(uri);
    const src = img.getAttribute('src');
    // Decode the base64 result
    const b64Match = src.match(/^data:image\/svg\+xml;base64,(.+)$/);
    expect(b64Match).not.toBeNull();
    const decoded = atob(b64Match[1]);
    expect(decoded).not.toContain('<script');
    expect(decoded).toContain('rect');
  });
});

describe('Model Directive', () => {
  afterEach(() => {
    document.body.innerHTML = '';
  });

  test('two-way binds text input', () => {
    const parent = document.createElement('div');
    parent.setAttribute('state', '{ name: "initial" }');
    const input = document.createElement('input');
    input.setAttribute('model', 'name');
    parent.appendChild(input);
    document.body.appendChild(parent);
    processTree(parent);

    
    expect(input.value).toBe('initial');

    
    input.value = 'changed';
    input.dispatchEvent(new Event('input'));
    expect(parent.__ctx.name).toBe('changed');
  });

  test('two-way binds checkbox', () => {
    const parent = document.createElement('div');
    parent.setAttribute('state', '{ checked: false }');
    const input = document.createElement('input');
    input.type = 'checkbox';
    input.setAttribute('model', 'checked');
    parent.appendChild(input);
    document.body.appendChild(parent);
    processTree(parent);

    expect(input.checked).toBe(false);

    input.checked = true;
    input.dispatchEvent(new Event('change'));
    expect(parent.__ctx.checked).toBe(true);
  });

  test('two-way binds number input', () => {
    const parent = document.createElement('div');
    parent.setAttribute('state', '{ count: 0 }');
    const input = document.createElement('input');
    input.type = 'number';
    input.setAttribute('model', 'count');
    parent.appendChild(input);
    document.body.appendChild(parent);
    processTree(parent);

    input.value = '42';
    input.dispatchEvent(new Event('input'));
    expect(parent.__ctx.count).toBe(42);
  });

  test('two-way binds select', () => {
    const parent = document.createElement('div');
    parent.setAttribute('state', '{ choice: "b" }');
    const select = document.createElement('select');
    select.setAttribute('model', 'choice');
    for (const val of ['a', 'b', 'c']) {
      const opt = document.createElement('option');
      opt.value = val;
      opt.textContent = val;
      select.appendChild(opt);
    }
    parent.appendChild(select);
    document.body.appendChild(parent);
    processTree(parent);

    expect(select.value).toBe('b');

    select.value = 'c';
    select.dispatchEvent(new Event('change'));
    expect(parent.__ctx.choice).toBe('c');
  });

  test('updates DOM when state changes', () => {
    const parent = document.createElement('div');
    parent.setAttribute('state', '{ text: "hello" }');
    const input = document.createElement('input');
    input.setAttribute('model', 'text');
    parent.appendChild(input);
    document.body.appendChild(parent);
    processTree(parent);

    parent.__ctx.text = 'world';
    expect(input.value).toBe('world');
  });
});



describe('If Directive', () => {
  afterEach(() => {
    document.body.innerHTML = '';
  });

  test('shows content when condition is true', () => {
    const parent = document.createElement('div');
    parent.setAttribute('state', '{ visible: true }');
    const div = document.createElement('div');
    div.setAttribute('if', 'visible');
    div.innerHTML = '<p>Content</p>';
    parent.appendChild(div);
    document.body.appendChild(parent);
    processTree(parent);

    expect(div.querySelector('p')).not.toBeNull();
    expect(div.querySelector('p').textContent).toBe('Content');
  });

  test('clears content when condition is false', () => {
    const parent = document.createElement('div');
    parent.setAttribute('state', '{ visible: false }');
    const div = document.createElement('div');
    div.setAttribute('if', 'visible');
    div.innerHTML = '<p>Hidden</p>';
    parent.appendChild(div);
    document.body.appendChild(parent);
    processTree(parent);

    expect(div.innerHTML).toBe('');
  });

  test('toggles content reactively', () => {
    const parent = document.createElement('div');
    parent.setAttribute('state', '{ show: true }');
    const div = document.createElement('div');
    div.setAttribute('if', 'show');
    div.innerHTML = '<p>Toggle me</p>';
    parent.appendChild(div);
    document.body.appendChild(parent);
    processTree(parent);

    expect(div.querySelector('p')).not.toBeNull();
    parent.__ctx.show = false;
    expect(div.innerHTML).toBe('');
    parent.__ctx.show = true;
    expect(div.querySelector('p')).not.toBeNull();
  });

  test('uses then template when true', () => {
    const tpl = document.createElement('template');
    tpl.id = 'then-tpl';
    tpl.innerHTML = '<span>Template content</span>';
    document.body.appendChild(tpl);

    const parent = document.createElement('div');
    parent.setAttribute('state', '{ cond: true }');
    const div = document.createElement('div');
    div.setAttribute('if', 'cond');
    div.setAttribute('then', 'then-tpl');
    parent.appendChild(div);
    document.body.appendChild(parent);
    processTree(parent);

    expect(div.querySelector('span')).not.toBeNull();
    expect(div.querySelector('span').textContent).toBe('Template content');
  });

  test('uses else template when false', () => {
    const elseTpl = document.createElement('template');
    elseTpl.id = 'else-tpl';
    elseTpl.innerHTML = '<span>Else content</span>';
    document.body.appendChild(elseTpl);

    const thenTpl = document.createElement('template');
    thenTpl.id = 'then-tpl-2';
    thenTpl.innerHTML = '<span>Then content</span>';
    document.body.appendChild(thenTpl);

    const parent = document.createElement('div');
    parent.setAttribute('state', '{ cond: false }');
    const div = document.createElement('div');
    div.setAttribute('if', 'cond');
    div.setAttribute('then', 'then-tpl-2');
    div.setAttribute('else', 'else-tpl');
    parent.appendChild(div);
    document.body.appendChild(parent);
    processTree(parent);

    expect(div.querySelector('span').textContent).toBe('Else content');
  });
});

describe('Show Directive', () => {
  afterEach(() => {
    document.body.innerHTML = '';
  });

  test('shows element when condition is true', () => {
    const parent = document.createElement('div');
    parent.setAttribute('state', '{ visible: true }');
    const div = document.createElement('div');
    div.setAttribute('show', 'visible');
    parent.appendChild(div);
    document.body.appendChild(parent);
    processTree(parent);

    expect(div.style.display).toBe('');
  });

  test('hides element when condition is false', () => {
    const parent = document.createElement('div');
    parent.setAttribute('state', '{ visible: false }');
    const div = document.createElement('div');
    div.setAttribute('show', 'visible');
    parent.appendChild(div);
    document.body.appendChild(parent);
    processTree(parent);

    expect(div.style.display).toBe('none');
  });

  test('toggles reactively', () => {
    const parent = document.createElement('div');
    parent.setAttribute('state', '{ on: true }');
    const div = document.createElement('div');
    div.setAttribute('show', 'on');
    parent.appendChild(div);
    document.body.appendChild(parent);
    processTree(parent);

    expect(div.style.display).toBe('');
    parent.__ctx.on = false;
    expect(div.style.display).toBe('none');
    parent.__ctx.on = true;
    expect(div.style.display).toBe('');
  });
});

describe('Hide Directive', () => {
  afterEach(() => {
    document.body.innerHTML = '';
  });

  test('hides element when condition is true', () => {
    const parent = document.createElement('div');
    parent.setAttribute('state', '{ hidden: true }');
    const div = document.createElement('div');
    div.setAttribute('hide', 'hidden');
    parent.appendChild(div);
    document.body.appendChild(parent);
    processTree(parent);

    expect(div.style.display).toBe('none');
  });

  test('shows element when condition is false', () => {
    const parent = document.createElement('div');
    parent.setAttribute('state', '{ hidden: false }');
    const div = document.createElement('div');
    div.setAttribute('hide', 'hidden');
    parent.appendChild(div);
    document.body.appendChild(parent);
    processTree(parent);

    expect(div.style.display).toBe('');
  });
});

describe('Switch Directive', () => {
  afterEach(() => {
    document.body.innerHTML = '';
  });

  test('shows matching case', () => {
    const parent = document.createElement('div');
    parent.setAttribute('state', "{ status: 'active' }");
    const switchEl = document.createElement('div');
    switchEl.setAttribute('switch', 'status');

    const case1 = document.createElement('div');
    case1.setAttribute('case', "'active'");
    case1.textContent = 'Active!\n';
    const case2 = document.createElement('div');
    case2.setAttribute('case', "'inactive'");
    case2.textContent = 'Inactive';
    const defaultCase = document.createElement('div');
    defaultCase.setAttribute('default', '');
    defaultCase.textContent = 'Unknown';

    switchEl.appendChild(case1);
    switchEl.appendChild(case2);
    switchEl.appendChild(defaultCase);
    parent.appendChild(switchEl);
    document.body.appendChild(parent);
    processTree(parent);

    expect(case1.style.display).toBe('');
    expect(case2.style.display).toBe('none');
    expect(defaultCase.style.display).toBe('none');
  });

  test('shows default case when no match', () => {
    const parent = document.createElement('div');
    parent.setAttribute('state', "{ status: 'unknown' }");
    const switchEl = document.createElement('div');
    switchEl.setAttribute('switch', 'status');

    const case1 = document.createElement('div');
    case1.setAttribute('case', "'active'");
    case1.textContent = 'Active!';
    const defaultCase = document.createElement('div');
    defaultCase.setAttribute('default', '');
    defaultCase.textContent = 'Default';

    switchEl.appendChild(case1);
    switchEl.appendChild(defaultCase);
    parent.appendChild(switchEl);
    document.body.appendChild(parent);
    processTree(parent);

    expect(case1.style.display).toBe('none');
    expect(defaultCase.style.display).toBe('');
  });

  test('updates when expression changes', () => {
    const parent = document.createElement('div');
    parent.setAttribute('state', "{ tab: 'a' }");
    const switchEl = document.createElement('div');
    switchEl.setAttribute('switch', 'tab');

    const caseA = document.createElement('div');
    caseA.setAttribute('case', "'a'");
    caseA.textContent = 'Tab A';
    const caseB = document.createElement('div');
    caseB.setAttribute('case', "'b'");
    caseB.textContent = 'Tab B';

    switchEl.appendChild(caseA);
    switchEl.appendChild(caseB);
    parent.appendChild(switchEl);
    document.body.appendChild(parent);
    processTree(parent);

    expect(caseA.style.display).toBe('');
    expect(caseB.style.display).toBe('none');

    parent.__ctx.tab = 'b';
    expect(caseA.style.display).toBe('none');
    expect(caseB.style.display).toBe('');
  });
});



describe('else-if directive', () => {
  afterEach(() => {
    document.body.innerHTML = '';
  });

  test('shows else-if when if is false and condition is true', () => {
    const parent = document.createElement('div');
    parent.setAttribute('state', '{ status: "warning" }');
    parent.innerHTML = `
      <div if="status === 'error'" id="err"><p>Error</p></div>
      <div else-if="status === 'warning'" id="warn"><p>Warning</p></div>
    `;
    document.body.appendChild(parent);
    processTree(parent);

    expect(document.getElementById('err').innerHTML).toBe('');
    expect(document.getElementById('warn').querySelector('p').textContent).toBe(
      'Warning',
    );
  });

  test('hides else-if when if is true', () => {
    const parent = document.createElement('div');
    parent.setAttribute('state', '{ status: "error" }');
    parent.innerHTML = `
      <div if="status === 'error'" id="err"><p>Error</p></div>
      <div else-if="status === 'warning'" id="warn"><p>Warning</p></div>
    `;
    document.body.appendChild(parent);
    processTree(parent);

    expect(document.getElementById('err').querySelector('p').textContent).toBe(
      'Error',
    );
    expect(document.getElementById('warn').style.display).toBe('none');
  });

  test('else-if chain — all false', () => {
    const parent = document.createElement('div');
    parent.setAttribute('state', '{ status: "ok" }');
    parent.innerHTML = `
      <div if="status === 'error'" id="err"><p>Error</p></div>
      <div else-if="status === 'warning'" id="warn"><p>Warning</p></div>
    `;
    document.body.appendChild(parent);
    processTree(parent);

    expect(document.getElementById('err').innerHTML).toBe('');
    expect(document.getElementById('warn').innerHTML).toBe('');
  });

  test('else-if with then template', () => {
    const tpl = document.createElement('template');
    tpl.id = 'warn-tpl';
    tpl.innerHTML = '<p class="warn-msg">Warning!</p>';
    document.body.appendChild(tpl);

    const parent = document.createElement('div');
    parent.setAttribute('state', '{ type: "warn" }');
    parent.innerHTML = `
      <div if="type === 'error'"><p>Error</p></div>
      <div else-if="type === 'warn'" then="warn-tpl" id="w"></div>
    `;
    document.body.appendChild(parent);
    processTree(parent);

    expect(document.getElementById('w').querySelector('.warn-msg')).not.toBeNull();
  });
});

describe('else directive (standalone)', () => {
  afterEach(() => {
    document.body.innerHTML = '';
  });

  test('shows else when preceding if is false', () => {
    const parent = document.createElement('div');
    parent.setAttribute('state', '{ show: false }');
    parent.innerHTML = `
      <div if="show" id="ifEl"><p>Visible</p></div>
      <div else id="elseEl"><p>Fallback</p></div>
    `;
    document.body.appendChild(parent);
    processTree(parent);

    expect(document.getElementById('ifEl').innerHTML).toBe('');
    expect(document.getElementById('elseEl').querySelector('p').textContent).toBe('Fallback');
  });

  test('hides else when preceding if is true', () => {
    const parent = document.createElement('div');
    parent.setAttribute('state', '{ show: true }');
    parent.innerHTML = `
      <div if="show" id="ifEl"><p>Visible</p></div>
      <div else id="elseEl"><p>Fallback</p></div>
    `;
    document.body.appendChild(parent);
    processTree(parent);

    expect(document.getElementById('ifEl').querySelector('p').textContent).toBe('Visible');
    expect(document.getElementById('elseEl').style.display).toBe('none');
  });

  test('else after if/else-if chain — all false', () => {
    const parent = document.createElement('div');
    parent.setAttribute('state', '{ status: "ok" }');
    parent.innerHTML = `
      <div if="status === 'error'" id="err">Error</div>
      <div else-if="status === 'warning'" id="warn">Warning</div>
      <div else id="fallback"><p>All good</p></div>
    `;
    document.body.appendChild(parent);
    processTree(parent);

    expect(document.getElementById('err').innerHTML).toBe('');
    expect(document.getElementById('warn').innerHTML).toBe('');
    expect(document.getElementById('fallback').querySelector('p').textContent).toBe('All good');
  });

  test('else after if/else-if chain — if matches', () => {
    const parent = document.createElement('div');
    parent.setAttribute('state', '{ status: "error" }');
    parent.innerHTML = `
      <div if="status === 'error'" id="err"><p>Error</p></div>
      <div else-if="status === 'warning'" id="warn">Warning</div>
      <div else id="fallback"><p>All good</p></div>
    `;
    document.body.appendChild(parent);
    processTree(parent);

    expect(document.getElementById('err').querySelector('p').textContent).toBe('Error');
    expect(document.getElementById('warn').style.display).toBe('none');
    expect(document.getElementById('fallback').style.display).toBe('none');
  });

  test('else with then template', () => {
    const tpl = document.createElement('template');
    tpl.id = 'fallback-tpl';
    tpl.innerHTML = '<span class="fb">Fallback content</span>';
    document.body.appendChild(tpl);

    const parent = document.createElement('div');
    parent.setAttribute('state', '{ show: false }');
    parent.innerHTML = `
      <div if="show">Content</div>
      <div else then="fallback-tpl" id="elseEl"></div>
    `;
    document.body.appendChild(parent);
    processTree(parent);

    expect(document.getElementById('elseEl').querySelector('.fb')).not.toBeNull();
  });
});

describe('switch with default', () => {
  afterEach(() => {
    document.body.innerHTML = '';
  });

  test('renders default when no case matches', () => {
    const parent = document.createElement('div');
    parent.setAttribute('state', '{ mode: "unknown" }');
    parent.innerHTML = `
      <div switch="mode">
        <div case="'light'" id="light">Light</div>
        <div case="'dark'" id="dark">Dark</div>
        <div default id="def">Default Mode</div>
      </div>
    `;
    document.body.appendChild(parent);
    processTree(parent);

    expect(document.getElementById('light').style.display).toBe('none');
    expect(document.getElementById('dark').style.display).toBe('none');
    expect(document.getElementById('def').style.display).toBe('');
    expect(document.getElementById('def').textContent).toBe('Default Mode');
  });

  test('hides default when a case matches', () => {
    const parent = document.createElement('div');
    parent.setAttribute('state', '{ mode: "dark" }');
    parent.innerHTML = `
      <div switch="mode">
        <div case="'light'" id="light">Light</div>
        <div case="'dark'" id="dark">Dark</div>
        <div default id="def">Default</div>
      </div>
    `;
    document.body.appendChild(parent);
    processTree(parent);

    expect(document.getElementById('dark').style.display).toBe('');
    expect(document.getElementById('def').style.display).toBe('none');
  });

  test('switch with multi-value case', () => {
    const parent = document.createElement('div');
    parent.setAttribute('state', '{ fruit: "banana" }');
    parent.innerHTML = `
      <div switch="fruit">
        <div case="'apple','banana'" id="ab">Apple or Banana</div>
        <div case="'cherry'" id="c">Cherry</div>
      </div>
    `;
    document.body.appendChild(parent);
    processTree(parent);

    expect(document.getElementById('ab').style.display).toBe('');
    expect(document.getElementById('c').style.display).toBe('none');
  });

  test('BUG: multi-value case with escaped backslash', () => {
    const parent = document.createElement('div');
    parent.setAttribute('state', '{ val: "b" }');
    parent.innerHTML = `
      <div switch="val">
        <div case="'a\\\\\\\\','b'" id="ab">A or B</div>
        <div case="'c'" id="c">C</div>
      </div>
    `;
    document.body.appendChild(parent);
    processTree(parent);

    expect(document.getElementById('ab').style.display).toBe('');
    expect(document.getElementById('c').style.display).toBe('none');
  });

  test('_splitTopLevel: triple backslash before closing quote (odd escape count)', () => {
    // Triple backslash (\\\\\\) in DOM attr = 3 literal backslashes.
    // _splitTopLevel: odd count → closing quote IS escaped → no split.
    // But the expression evaluator's tokenizer also consumes escape pairs,
    // so the trailing ','y' becomes a comma operator yielding 'y'.
    // Net effect: even though _splitTopLevel sees one chunk, evaluate()
    // returns 'y' via the comma operator, so the case still matches.
    const parent = document.createElement('div');
    parent.setAttribute('state', '{ val: "y" }');
    parent.innerHTML = `
      <div switch="val">
        <div case="'x\\\\\\\\\\\\','y'" id="xy">X or Y</div>
        <div default id="def">Default</div>
      </div>
    `;
    document.body.appendChild(parent);
    processTree(parent);

    // _splitTopLevel does NOT split (odd backslash count), but the expression
    // evaluator treats the comma as the comma operator and returns 'y'.
    expect(document.getElementById('xy').style.display).toBe('');
    expect(document.getElementById('def').style.display).toBe('none');
  });

  test('_splitTopLevel: mixed single and double quotes in case values', () => {
    const parent = document.createElement('div');
    parent.setAttribute('state', '{ val: "hello" }');
    parent.innerHTML = `
      <div switch="val">
        <div case="'hello',&quot;world&quot;" id="hw">Match</div>
        <div default id="def">Default</div>
      </div>
    `;
    document.body.appendChild(parent);
    processTree(parent);

    expect(document.getElementById('hw').style.display).toBe('');
    expect(document.getElementById('def').style.display).toBe('none');
  });

  test('_splitTopLevel: empty values between commas treated as undefined', () => {
    // case="'a',,'c'" — the middle empty segment evaluates to undefined
    const parent = document.createElement('div');
    parent.setAttribute('state', '{ val: "c" }');
    parent.innerHTML = `
      <div switch="val">
        <div case="'a',,'c'" id="ac">Match</div>
        <div default id="def">Default</div>
      </div>
    `;
    document.body.appendChild(parent);
    processTree(parent);

    // val='c' should still match the third value despite the empty second
    expect(document.getElementById('ac').style.display).toBe('');
    expect(document.getElementById('def').style.display).toBe('none');
  });

  test('switch with then template in case', () => {
    const tpl = document.createElement('template');
    tpl.id = 'case-tpl';
    tpl.innerHTML = '<p class="case-content">Loaded</p>';
    document.body.appendChild(tpl);

    const parent = document.createElement('div');
    parent.setAttribute('state', '{ tab: "info" }');
    parent.innerHTML = `
      <div switch="tab">
        <div case="'info'" then="case-tpl" id="info"></div>
        <div case="'settings'">Settings</div>
      </div>
    `;
    document.body.appendChild(parent);
    processTree(parent);

    expect(
      document.getElementById('info').querySelector('.case-content'),
    ).not.toBeNull();
  });

  test('switch with then template on default', () => {
    const tpl = document.createElement('template');
    tpl.id = 'default-tpl';
    tpl.innerHTML = '<p class="default-content">Fallback</p>';
    document.body.appendChild(tpl);

    const parent = document.createElement('div');
    parent.setAttribute('state', '{ view: "unknown" }');
    parent.innerHTML = `
      <div switch="view">
        <div case="'home'">Home</div>
        <div default then="default-tpl" id="def"></div>
      </div>
    `;
    document.body.appendChild(parent);
    processTree(parent);

    expect(
      document.getElementById('def').querySelector('.default-content'),
    ).not.toBeNull();
  });
});

describe('if with animate', () => {
  afterEach(() => {
    document.body.innerHTML = '';
  });

  test('if with animate-enter adds class', () => {
    const parent = document.createElement('div');
    parent.setAttribute('state', '{ show: true }');
    parent.innerHTML = `
      <div if="show" animate-enter="fade-in" id="animated"><p>Content</p></div>
    `;
    document.body.appendChild(parent);
    processTree(parent);

    const el = document.getElementById('animated');
    expect(el.querySelector('p')).not.toBeNull();
  });

  test('if with then template renders correctly', () => {
    const tpl = document.createElement('template');
    tpl.id = 'if-then';
    tpl.innerHTML = '<p class="then-content">Loaded</p>';
    document.body.appendChild(tpl);

    const parent = document.createElement('div');
    parent.setAttribute('state', '{ visible: true }');
    parent.innerHTML = `<div if="visible" then="if-then" id="container"></div>`;
    document.body.appendChild(parent);
    processTree(parent);

    expect(
      document.getElementById('container').querySelector('.then-content'),
    ).not.toBeNull();
  });

  test('if false with then template clears content', () => {
    const tpl = document.createElement('template');
    tpl.id = 'if-then2';
    tpl.innerHTML = '<p>Content</p>';
    document.body.appendChild(tpl);

    const parent = document.createElement('div');
    parent.setAttribute('state', '{ visible: false }');
    parent.innerHTML = `<div if="visible" then="if-then2" id="container"></div>`;
    document.body.appendChild(parent);
    processTree(parent);

    expect(document.getElementById('container').innerHTML).toBe('');
  });

  test('if false with else template shows else', () => {
    const tpl = document.createElement('template');
    tpl.id = 'else-tpl';
    tpl.innerHTML = '<p class="else-content">Fallback</p>';
    document.body.appendChild(tpl);

    const parent = document.createElement('div');
    parent.setAttribute('state', '{ loggedIn: false }');
    parent.innerHTML = `<div if="loggedIn" else="else-tpl" id="el"><p>Dashboard</p></div>`;
    document.body.appendChild(parent);
    processTree(parent);

    expect(
      document.getElementById('el').querySelector('.else-content'),
    ).not.toBeNull();
  });
});



describe('state persist directive', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
    localStorage.clear();
    sessionStorage.clear();
  });

  test('persists state to localStorage', () => {
    const parent = document.createElement('div');
    parent.setAttribute('state', '{ count: 0 }');
    parent.setAttribute('persist', 'localStorage');
    parent.setAttribute('persist-key', 'test1');
    document.body.appendChild(parent);

    processTree(parent);

    const ctx = findContext(parent);
    ctx.count = 5;

    const stored = JSON.parse(localStorage.getItem('nojs_state_test1'));
    expect(stored.count).toBe(5);
  });

  test('restores state from localStorage', () => {
    localStorage.setItem(
      'nojs_state_test2',
      JSON.stringify({ name: 'saved' }),
    );

    const parent = document.createElement('div');
    parent.setAttribute('state', '{ name: "default" }');
    parent.setAttribute('persist', 'localStorage');
    parent.setAttribute('persist-key', 'test2');
    document.body.appendChild(parent);

    processTree(parent);

    const ctx = findContext(parent);
    expect(ctx.name).toBe('saved');
  });

  test('persists state to sessionStorage', () => {
    const parent = document.createElement('div');
    parent.setAttribute('state', '{ val: 10 }');
    parent.setAttribute('persist', 'sessionStorage');
    parent.setAttribute('persist-key', 'test3');
    document.body.appendChild(parent);

    processTree(parent);

    const ctx = findContext(parent);
    ctx.val = 20;

    const stored = JSON.parse(sessionStorage.getItem('nojs_state_test3'));
    expect(stored.val).toBe(20);
  });

  test('ignores invalid persist type', () => {
    const parent = document.createElement('div');
    parent.setAttribute('state', '{ x: 1 }');
    parent.setAttribute('persist', 'invalidStore');
    parent.setAttribute('persist-key', 'test4');
    document.body.appendChild(parent);

    expect(() => processTree(parent)).not.toThrow();
  });

  test('handles corrupt localStorage data', () => {
    localStorage.setItem('nojs_state_test5', 'not valid json{{{');

    const parent = document.createElement('div');
    parent.setAttribute('state', '{ safe: true }');
    parent.setAttribute('persist', 'localStorage');
    parent.setAttribute('persist-key', 'test5');
    document.body.appendChild(parent);

    expect(() => processTree(parent)).not.toThrow();
    const ctx = findContext(parent);
    expect(ctx.safe).toBe(true);
  });

  test('warns and skips persistence when persist-key is missing', () => {
    const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});

    const parent = document.createElement('div');
    parent.setAttribute('state', '{ x: 1 }');
    parent.setAttribute('persist', 'localStorage');
    document.body.appendChild(parent);

    processTree(parent);

    expect(warnSpy).toHaveBeenCalledWith(
      '[No.JS]',
      expect.stringContaining('persist-key')
    );
    expect(localStorage.length).toBe(0);

    warnSpy.mockRestore();
  });

  test('persist-fields limits which fields are saved to storage', () => {
    const parent = document.createElement('div');
    parent.setAttribute('state', '{ theme: "dark", token: "secret", sidebar: true }');
    parent.setAttribute('persist', 'localStorage');
    parent.setAttribute('persist-key', 'pf-test1');
    parent.setAttribute('persist-fields', 'theme, sidebar');
    document.body.appendChild(parent);

    processTree(parent);

    // Mutate state to trigger the $watch save
    const ctx = parent.__ctx;
    ctx.theme = 'light';

    const saved = JSON.parse(localStorage.getItem('nojs_state_pf-test1'));
    expect(saved.theme).toBe('light');
    expect(saved.sidebar).toBe(true);
    // token is not in persist-fields — must not be written to storage
    expect(saved.token).toBeUndefined();
  });

  test('persist-fields limits which fields are restored from storage', () => {
    // Pre-populate storage with all three fields (as if saved by old code without persist-fields)
    localStorage.setItem('nojs_state_pf-test2', JSON.stringify({ theme: 'light', token: 'old-secret', sidebar: false }));

    const parent = document.createElement('div');
    parent.setAttribute('state', '{ theme: "dark", token: "default", sidebar: true }');
    parent.setAttribute('persist', 'localStorage');
    parent.setAttribute('persist-key', 'pf-test2');
    parent.setAttribute('persist-fields', 'theme');
    document.body.appendChild(parent);

    processTree(parent);

    const ctx = parent.__ctx;
    // Only theme should be restored from storage
    expect(ctx.theme).toBe('light');
    // token is not in persist-fields — must stay at initial value
    expect(ctx.token).toBe('default');
  });

  test('persist-fields handles comma-separated values with whitespace', () => {
    const parent = document.createElement('div');
    parent.setAttribute('state', '{ a: 1, b: 2, c: 3 }');
    parent.setAttribute('persist', 'localStorage');
    parent.setAttribute('persist-key', 'pf-test3');
    parent.setAttribute('persist-fields', '  a , c  ');
    document.body.appendChild(parent);

    processTree(parent);

    // Mutate to trigger the $watch save
    const ctx = parent.__ctx;
    ctx.a = 10;

    const saved = JSON.parse(localStorage.getItem('nojs_state_pf-test3'));
    expect(saved.a).toBe(10);
    expect(saved.c).toBe(3);
    expect(saved.b).toBeUndefined();
  });

  test('persist-schema rejects unknown keys with warning', () => {
    const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});

    localStorage.setItem('nojs_state_schema-test1', JSON.stringify({ count: 5, injected: 'evil' }));

    const parent = document.createElement('div');
    parent.setAttribute('state', '{ count: 0 }');
    parent.setAttribute('persist', 'localStorage');
    parent.setAttribute('persist-key', 'schema-test1');
    parent.setAttribute('persist-schema', '');
    document.body.appendChild(parent);

    processTree(parent);

    const ctx = parent.__ctx;
    expect(ctx.count).toBe(5);
    expect('injected' in ctx.__raw).toBe(false);
    expect(warnSpy).toHaveBeenCalledWith('[No.JS]', expect.stringContaining('ignoring unknown key "injected"'));

    warnSpy.mockRestore();
  });

  test('persist-schema rejects type mismatches with warning', () => {
    const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});

    localStorage.setItem('nojs_state_schema-test2', JSON.stringify({ count: 'not-a-number', name: 'ok' }));

    const parent = document.createElement('div');
    parent.setAttribute('state', '{ count: 0, name: "default" }');
    parent.setAttribute('persist', 'localStorage');
    parent.setAttribute('persist-key', 'schema-test2');
    parent.setAttribute('persist-schema', '');
    document.body.appendChild(parent);

    processTree(parent);

    const ctx = parent.__ctx;
    expect(ctx.count).toBe(0); // rejected — stays at initial
    expect(ctx.name).toBe('ok'); // accepted — type matches
    expect(warnSpy).toHaveBeenCalledWith('[No.JS]', expect.stringContaining('type mismatch for "count"'));

    warnSpy.mockRestore();
  });

  test('persist-schema allows valid keys with matching types', () => {
    localStorage.setItem('nojs_state_schema-test3', JSON.stringify({ count: 42, name: 'restored', active: true }));

    const parent = document.createElement('div');
    parent.setAttribute('state', '{ count: 0, name: "default", active: false }');
    parent.setAttribute('persist', 'localStorage');
    parent.setAttribute('persist-key', 'schema-test3');
    parent.setAttribute('persist-schema', '');
    document.body.appendChild(parent);

    processTree(parent);

    const ctx = parent.__ctx;
    expect(ctx.count).toBe(42);
    expect(ctx.name).toBe('restored');
    expect(ctx.active).toBe(true);
  });

  test('without persist-schema all keys are restored (backwards compat)', () => {
    localStorage.setItem('nojs_state_schema-test4', JSON.stringify({ count: 10, extra: 'bonus' }));

    const parent = document.createElement('div');
    parent.setAttribute('state', '{ count: 0 }');
    parent.setAttribute('persist', 'localStorage');
    parent.setAttribute('persist-key', 'schema-test4');
    document.body.appendChild(parent);

    processTree(parent);

    const ctx = parent.__ctx;
    expect(ctx.count).toBe(10);
    expect(ctx.extra).toBe('bonus');
  });

  test('sensitive field names trigger a warning when persist is used', () => {
    const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});

    const parent = document.createElement('div');
    parent.setAttribute('state', '{ username: "bob", authToken: "abc123", password: "secret" }');
    parent.setAttribute('persist', 'localStorage');
    parent.setAttribute('persist-key', 'sensitive-test1');
    document.body.appendChild(parent);

    processTree(parent);

    expect(warnSpy).toHaveBeenCalledWith(
      '[No.JS]',
      expect.stringContaining('may contain sensitive data')
    );
    expect(warnSpy).toHaveBeenCalledWith(
      '[No.JS]',
      expect.stringContaining('authToken')
    );
    expect(warnSpy).toHaveBeenCalledWith(
      '[No.JS]',
      expect.stringContaining('password')
    );

    warnSpy.mockRestore();
  });
});



describe('bind-value two-way', () => {
  afterEach(() => {
    document.body.innerHTML = '';
  });

  test('updates context when input value changes via bind-value', () => {
    const parent = document.createElement('div');
    parent.setAttribute('state', '{ name: "initial" }');
    const input = document.createElement('input');
    input.setAttribute('bind-value', 'name');
    parent.appendChild(input);
    document.body.appendChild(parent);

    processTree(parent);

    const ctx = findContext(input);
    expect(input.value).toBe('initial');

    input.value = 'updated';
    input.dispatchEvent(new Event('input'));

    expect(ctx.name).toBe('updated');
  });

  test('converts to number for number input type', () => {
    const parent = document.createElement('div');
    parent.setAttribute('state', '{ age: 25 }');
    const input = document.createElement('input');
    input.type = 'number';
    input.setAttribute('bind-value', 'age');
    parent.appendChild(input);
    document.body.appendChild(parent);

    processTree(parent);

    input.value = '30';
    input.dispatchEvent(new Event('input'));

    const ctx = findContext(input);
    expect(ctx.age).toBe(30);
  });

  test('works with textarea element', () => {
    const parent = document.createElement('div');
    parent.setAttribute('state', '{ text: "hello" }');
    const textarea = document.createElement('textarea');
    textarea.setAttribute('bind-value', 'text');
    parent.appendChild(textarea);
    document.body.appendChild(parent);

    processTree(parent);

    textarea.value = 'world';
    textarea.dispatchEvent(new Event('input'));

    const ctx = findContext(textarea);
    expect(ctx.text).toBe('world');
  });

  test('works with select element', () => {
    const parent = document.createElement('div');
    parent.setAttribute('state', '{ color: "red" }');
    const select = document.createElement('select');
    select.setAttribute('bind-value', 'color');
    select.innerHTML = '<option value="red">Red</option><option value="blue">Blue</option>';
    parent.appendChild(select);
    document.body.appendChild(parent);

    processTree(parent);

    select.value = 'blue';
    select.dispatchEvent(new Event('input'));

    const ctx = findContext(select);
    expect(ctx.color).toBe('blue');
  });
});

describe('model with SELECT', () => {
  afterEach(() => {
    document.body.innerHTML = '';
  });

  test('sets select value from model', () => {
    const parent = document.createElement('div');
    parent.setAttribute('state', '{ chosen: "banana" }');
    const select = document.createElement('select');
    select.setAttribute('model', 'chosen');
    select.innerHTML = '<option value="apple">Apple</option><option value="banana">Banana</option>';
    parent.appendChild(select);
    document.body.appendChild(parent);

    processTree(parent);

    expect(select.value).toBe('banana');
  });

  test('sets select value to empty string when model is null', () => {
    const parent = document.createElement('div');
    parent.setAttribute('state', '{ chosen: null }');
    const select = document.createElement('select');
    select.setAttribute('model', 'chosen');
    select.innerHTML = '<option value="">--</option><option value="a">A</option>';
    parent.appendChild(select);
    document.body.appendChild(parent);

    processTree(parent);

    expect(select.value).toBe('');
  });
});



describe('if directive — uncovered branches', () => {
  afterEach(() => {
    document.body.innerHTML = '';
  });

  test('if with "animate" fallback attribute (not animate-enter)', () => {
    const parent = document.createElement('div');
    parent.setAttribute('state', '{ show: true }');
    const el = document.createElement('div');
    el.setAttribute('if', 'show');
    el.setAttribute('animate', 'fadeIn');
    el.innerHTML = '<p>Animated content</p>';
    parent.appendChild(el);
    document.body.appendChild(parent);
    processTree(parent);

    expect(el.querySelector('p')).not.toBeNull();
    expect(el.querySelector('p').textContent).toBe('Animated content');
  });

  test('if with animate does not double-animate host and first child', () => {
    const parent = document.createElement('div');
    parent.setAttribute('state', '{ show: true }');
    const el = document.createElement('div');
    el.setAttribute('if', 'show');
    el.setAttribute('animate', 'fadeIn');
    el.innerHTML = '<p>Content</p>';
    parent.appendChild(el);
    document.body.appendChild(parent);
    processTree(parent);

    const child = el.querySelector('p');
    expect(child.classList.contains('fadeIn')).toBe(true);
    expect(el.classList.contains('fadeIn')).toBe(false);
  });

  test('if with animate-leave triggers animation before render', () => {
    const parent = document.createElement('div');
    parent.setAttribute('state', '{ show: true }');
    const el = document.createElement('div');
    el.setAttribute('if', 'show');
    el.setAttribute('animate-leave', 'fadeOut');
    el.innerHTML = '<p>Will animate out</p>';
    parent.appendChild(el);
    document.body.appendChild(parent);
    processTree(parent);

    expect(el.querySelector('p')).not.toBeNull();

    
    parent.__ctx.show = false;
    
    
  });

  test('if with transition attribute triggers transition on render', () => {
    const parent = document.createElement('div');
    parent.setAttribute('state', '{ show: true }');
    const el = document.createElement('div');
    el.setAttribute('if', 'show');
    el.setAttribute('transition', 'slide');
    el.innerHTML = '<p>Transition content</p>';
    parent.appendChild(el);
    document.body.appendChild(parent);
    processTree(parent);

    expect(el.querySelector('p')).not.toBeNull();

    
    parent.__ctx.show = false;
  });
});

describe('else-if directive — uncovered branches', () => {
  afterEach(() => {
    document.body.innerHTML = '';
  });

  test('else-if without previous sibling having if/else-if breaks', () => {
    const parent = document.createElement('div');
    parent.setAttribute('state', '{ x: 5 }');

    
    const plainDiv = document.createElement('div');
    plainDiv.textContent = 'Just a div';

    const elseIfEl = document.createElement('div');
    elseIfEl.setAttribute('else-if', 'x > 3');
    elseIfEl.innerHTML = '<p>Else-if content</p>';

    parent.appendChild(plainDiv);
    parent.appendChild(elseIfEl);
    document.body.appendChild(parent);

    processTree(parent);

    
    
    expect(elseIfEl.querySelector('p').textContent).toBe('Else-if content');
  });

  test('else-if with then template for the truthy branch', () => {
    const tpl = document.createElement('template');
    tpl.id = 'elseif-then-tpl';
    tpl.innerHTML = '<span class="elseif-rendered">Rendered via then</span>';
    document.body.appendChild(tpl);

    const parent = document.createElement('div');
    parent.setAttribute('state', '{ status: "warn" }');

    const ifEl = document.createElement('div');
    ifEl.setAttribute('if', "status === 'error'");
    ifEl.innerHTML = '<p>Error</p>';

    const elseIfEl = document.createElement('div');
    elseIfEl.setAttribute('else-if', "status === 'warn'");
    elseIfEl.setAttribute('then', 'elseif-then-tpl');

    parent.appendChild(ifEl);
    parent.appendChild(elseIfEl);
    document.body.appendChild(parent);

    processTree(parent);

    expect(elseIfEl.querySelector('.elseif-rendered')).not.toBeNull();
    expect(elseIfEl.querySelector('.elseif-rendered').textContent).toBe('Rendered via then');
  });

  test('else-if evaluates false clears content', () => {
    const parent = document.createElement('div');
    parent.setAttribute('state', '{ status: "ok" }');

    const ifEl = document.createElement('div');
    ifEl.setAttribute('if', "status === 'error'");
    ifEl.innerHTML = '<p>Error</p>';

    const elseIfEl = document.createElement('div');
    elseIfEl.setAttribute('else-if', "status === 'warn'");
    elseIfEl.innerHTML = '<p>Warning</p>';

    parent.appendChild(ifEl);
    parent.appendChild(elseIfEl);
    document.body.appendChild(parent);

    processTree(parent);

    
    expect(elseIfEl.innerHTML).toBe('');
  });
});



describe('state directive — uncovered branches', () => {
  afterEach(() => {
    document.body.innerHTML = '';
  });

  test('state with null/invalid data uses empty object', () => {
    const div = document.createElement('div');
    div.setAttribute('state', 'null');
    document.body.appendChild(div);
    processTree(div);

    
    expect(div.__ctx).toBeDefined();
    expect(div.__ctx.__isProxy).toBe(true);
  });

  test('state with expression returning falsy uses empty object', () => {
    const div = document.createElement('div');
    div.setAttribute('state', '0');
    document.body.appendChild(div);
    processTree(div);

    expect(div.__ctx).toBeDefined();
    expect(div.__ctx.__isProxy).toBe(true);
  });

  test('state with empty string uses empty object', () => {
    const div = document.createElement('div');
    div.setAttribute('state', '');
    document.body.appendChild(div);
    processTree(div);

    expect(div.__ctx).toBeDefined();
    expect(div.__ctx.__isProxy).toBe(true);
  });
});

describe('store directive — uncovered branches', () => {
  afterEach(() => {
    Object.keys(_stores).forEach((k) => delete _stores[k]);
    document.body.innerHTML = '';
  });

  test('store without storeName (empty string) returns early', () => {
    const div = document.createElement('div');
    div.setAttribute('store', '');
    div.setAttribute('value', '{ x: 1 }');
    document.body.appendChild(div);

    processTree(div);

    
    expect(_stores['']).toBeUndefined();
  });

  test('store where valueAttr is empty creates store with empty object', () => {
    const div = document.createElement('div');
    div.setAttribute('store', 'emptyVal');
    div.setAttribute('value', '');
    document.body.appendChild(div);

    processTree(div);

    expect(_stores.emptyVal).toBeDefined();
    expect(_stores.emptyVal.__isProxy).toBe(true);
  });
});

describe('computed directive — uncovered branches', () => {
  afterEach(() => {
    document.body.innerHTML = '';
  });

  test('computed without expr attribute returns early', () => {
    const parent = document.createElement('div');
    parent.setAttribute('state', '{ x: 10 }');
    const computed = document.createElement('span');
    computed.setAttribute('computed', 'total');
    
    parent.appendChild(computed);
    document.body.appendChild(parent);

    expect(() => processTree(parent)).not.toThrow();
    expect(parent.__ctx.total).toBeUndefined();
  });

  test('computed without name returns early', () => {
    const parent = document.createElement('div');
    parent.setAttribute('state', '{ x: 10 }');
    const computed = document.createElement('span');
    computed.setAttribute('computed', '');
    computed.setAttribute('expr', 'x * 2');
    parent.appendChild(computed);
    document.body.appendChild(parent);

    expect(() => processTree(parent)).not.toThrow();
  });
});



describe('model directive — uncovered branches', () => {
  afterEach(() => {
    document.body.innerHTML = '';
  });

  test('model for radio input type', () => {
    const parent = document.createElement('div');
    parent.setAttribute('state', '{ color: "red" }');

    const radio1 = document.createElement('input');
    radio1.type = 'radio';
    radio1.name = 'color';
    radio1.value = 'red';
    radio1.setAttribute('model', 'color');

    const radio2 = document.createElement('input');
    radio2.type = 'radio';
    radio2.name = 'color';
    radio2.value = 'blue';
    radio2.setAttribute('model', 'color');

    parent.appendChild(radio1);
    parent.appendChild(radio2);
    document.body.appendChild(parent);
    processTree(parent);

    
    expect(radio1.checked).toBe(true);
    expect(radio2.checked).toBe(false);

    
    radio2.checked = true;
    radio2.dispatchEvent(new Event('change'));
    expect(parent.__ctx.color).toBe('blue');

    
    parent.__ctx.color = 'red';
    expect(radio1.checked).toBe(true);
    expect(radio2.checked).toBe(false);
  });

  test('model for SELECT element sets value', () => {
    const parent = document.createElement('div');
    parent.setAttribute('state', '{ fruit: "banana" }');
    const select = document.createElement('select');
    select.setAttribute('model', 'fruit');
    select.innerHTML = '<option value="apple">Apple</option><option value="banana">Banana</option><option value="cherry">Cherry</option>';
    parent.appendChild(select);
    document.body.appendChild(parent);
    processTree(parent);

    expect(select.value).toBe('banana');

    
    select.value = 'cherry';
    select.dispatchEvent(new Event('change'));
    expect(parent.__ctx.fruit).toBe('cherry');
  });
});

describe('bind-* removes attribute when val is null', () => {
  afterEach(() => {
    document.body.innerHTML = '';
  });

  test('bind-* removes non-boolean attribute when value becomes null', () => {
    const parent = document.createElement('div');
    parent.setAttribute('state', '{ tip: "hello" }');
    const div = document.createElement('div');
    div.setAttribute('bind-title', 'tip');
    parent.appendChild(div);
    document.body.appendChild(parent);
    processTree(parent);

    expect(div.getAttribute('title')).toBe('hello');

    parent.__ctx.tip = null;
    expect(div.hasAttribute('title')).toBe(false);
  });

  test('bind-* removes attribute when value is undefined', () => {
    const parent = document.createElement('div');
    parent.setAttribute('state', '{ }');
    const div = document.createElement('div');
    div.setAttribute('bind-data-id', 'missingProp');
    parent.appendChild(div);
    document.body.appendChild(parent);
    processTree(parent);

    expect(div.hasAttribute('data-id')).toBe(false);
  });
});



describe('if without animations', () => {
  afterEach(() => {
    document.body.innerHTML = '';
  });

  test('renders immediately without animation classes', () => {
    const parent = document.createElement('div');
    parent.setAttribute('state', '{ show: true }');
    const el = document.createElement('div');
    el.setAttribute('if', 'show');
    el.innerHTML = '<p>Visible</p>';
    parent.appendChild(el);
    document.body.appendChild(parent);

    processTree(parent);

    expect(el.querySelector('p').textContent).toBe('Visible');
  });

  test('clears content when condition is false without animations', () => {
    const parent = document.createElement('div');
    parent.setAttribute('state', '{ show: false }');
    const el = document.createElement('div');
    el.setAttribute('if', 'show');
    el.innerHTML = '<p>Hidden</p>';
    parent.appendChild(el);
    document.body.appendChild(parent);

    processTree(parent);

    expect(el.innerHTML).toBe('');
  });
});

describe('bind-html — null/undefined value', () => {
  afterEach(() => {
    document.body.innerHTML = '';
  });

  test('bind-html does not modify innerHTML when value is null', () => {
    const parent = document.createElement('div');
    parent.setAttribute('state', '{ html: null }');
    const div = document.createElement('div');
    div.innerHTML = '<p>Original</p>';
    div.setAttribute('bind-html', 'html');
    parent.appendChild(div);
    document.body.appendChild(parent);
    processTree(parent);

    
    
    expect(div.innerHTML).toBe('<p>Original</p>');
  });

  test('bind-html does not modify innerHTML when value is undefined', () => {
    const parent = document.createElement('div');
    parent.setAttribute('state', '{}');
    const div = document.createElement('div');
    div.setAttribute('bind-html', 'nonExistentProp');
    parent.appendChild(div);
    document.body.appendChild(parent);
    processTree(parent);

    
    expect(div.innerHTML).toBe('');
  });

  test('bind-html updates when value changes from null to string', () => {
    const parent = document.createElement('div');
    parent.setAttribute('state', '{ html: null }');
    const div = document.createElement('div');
    div.setAttribute('bind-html', 'html');
    parent.appendChild(div);
    document.body.appendChild(parent);
    processTree(parent);

    expect(div.innerHTML).toBe('');

    
    parent.__ctx.html = '<em>Now visible</em>';
    expect(div.innerHTML).toBe('<em>Now visible</em>');
  });
});



describe('model SELECT — null value branch', () => {
  afterEach(() => {
    document.body.innerHTML = '';
  });

  test('model on SELECT sets value to empty string when state is null', () => {
    const parent = document.createElement('div');
    parent.setAttribute('state', '{ choice: null }');
    const select = document.createElement('select');
    select.setAttribute('model', 'choice');
    select.innerHTML = `
      <option value="">-- Select --</option>
      <option value="a">A</option>
      <option value="b">B</option>
    `;
    parent.appendChild(select);
    document.body.appendChild(parent);
    processTree(parent);

    
    expect(select.value).toBe('');
  });

  test('model on SELECT sets value to empty string when state is undefined', () => {
    const parent = document.createElement('div');
    parent.setAttribute('state', '{}');
    const select = document.createElement('select');
    select.setAttribute('model', 'undefinedProp');
    select.innerHTML = `
      <option value="">-- Select --</option>
      <option value="x">X</option>
    `;
    parent.appendChild(select);
    document.body.appendChild(parent);
    processTree(parent);

    expect(select.value).toBe('');
  });
});



describe('if directive — animLeave/transition (L26, L30-34)', () => {
  test('if with animate-leave removes content via animation', async () => {
    const parent = document.createElement('div');
    parent.setAttribute('state', '{ show: true }');
    const el = document.createElement('div');
    el.setAttribute('if', 'show');
    el.setAttribute('animate-leave', 'fadeOut');
    el.innerHTML = '<p>Content</p>';
    parent.appendChild(el);
    document.body.appendChild(parent);
    processTree(parent);

    expect(el.querySelector('p')).not.toBeNull();

    
    const ctx = findContext(el);
    ctx.$set('show', false);

    
    
    await new Promise(r => setTimeout(r, 10));
    const child = el.firstElementChild;
    if (child) child.dispatchEvent(new Event('animationend'));

    await new Promise(r => setTimeout(r, 10));
    document.body.removeChild(parent);
  });
});

// ═══════════════════════════════════════════════════════════════════════
//  DISPOSAL: directives register _onDispose cleanup
// ═══════════════════════════════════════════════════════════════════════

describe('Directive disposal cleanup', () => {
  afterEach(() => {
    document.body.innerHTML = '';
    Object.keys(_stores).forEach((k) => delete _stores[k]);
  });

  describe('if directive disposal', () => {
    test('disposes children before re-rendering on condition change', () => {
      const parent = document.createElement('div');
      parent.setAttribute('state', '{ show: true }');
      const ifEl = document.createElement('div');
      ifEl.setAttribute('if', 'show');
      ifEl.innerHTML = '<span>visible</span>';
      parent.appendChild(ifEl);
      document.body.appendChild(parent);
      processTree(parent);

      const span = ifEl.querySelector('span');
      expect(span).not.toBeNull();

      // Toggle off — should clear content
      parent.__ctx.show = false;
      expect(ifEl.innerHTML).toBe('');

      // Toggle on — should restore content
      parent.__ctx.show = true;
      expect(ifEl.querySelector('span')).not.toBeNull();
    });

    test('disposes children when _disposeTree is called on if element', () => {
      const parent = document.createElement('div');
      parent.setAttribute('state', '{ show: true }');
      const ifEl = document.createElement('div');
      ifEl.setAttribute('if', 'show');
      ifEl.innerHTML = '<span>visible</span>';
      parent.appendChild(ifEl);
      document.body.appendChild(parent);
      processTree(parent);

      _disposeTree(ifEl);
      expect(ifEl.__declared).toBe(false);
    });
  });

  describe('on:* event listener disposal', () => {
    test('click handler removed after _disposeTree', () => {
      const parent = document.createElement('div');
      parent.setAttribute('state', '{ count: 0 }');
      const btn = document.createElement('button');
      btn.setAttribute('on:click', 'count++');
      parent.appendChild(btn);
      document.body.appendChild(parent);
      processTree(parent);

      // Handler works before disposal
      btn.click();
      expect(parent.__ctx.count).toBe(1);

      const removeSpy = jest.spyOn(btn, 'removeEventListener');
      _disposeTree(btn);

      expect(removeSpy).toHaveBeenCalledWith(
        'click',
        expect.any(Function),
        expect.any(Object)
      );
      removeSpy.mockRestore();
    });
  });

  describe('each loop disposal', () => {
    test('disposes children when list changes', () => {
      const parent = document.createElement('div');
      parent.setAttribute('state', '{ items: [1, 2, 3] }');
      const li = document.createElement('li');
      li.setAttribute('each', 'item in items');
      li.setAttribute('bind', 'item');
      const ul = document.createElement('ul');
      ul.appendChild(li);
      parent.appendChild(ul);
      document.body.appendChild(parent);
      processTree(parent);

      // Self-repeating: clones are siblings in ul between comment markers
      expect(ul.querySelectorAll('li').length).toBe(3);

      // Update list — old children should be disposed, new ones rendered
      parent.__ctx.items = [4, 5];
      expect(ul.querySelectorAll('li').length).toBe(2);
    });

    test('disposeTree on loop parent cleans up', () => {
      const parent = document.createElement('div');
      parent.setAttribute('state', '{ items: [1, 2] }');
      const li = document.createElement('li');
      li.setAttribute('each', 'item in items');
      const ul = document.createElement('ul');
      ul.appendChild(li);
      parent.appendChild(ul);
      document.body.appendChild(parent);
      processTree(parent);

      _disposeTree(parent);
      expect(parent.__declared).toBe(false);
    });
  });

  describe('bind-value disposal', () => {
    test('input handler removed after _disposeTree', () => {
      const parent = document.createElement('div');
      parent.setAttribute('state', '{ name: "" }');
      const input = document.createElement('input');
      input.setAttribute('bind-value', 'name');
      parent.appendChild(input);
      document.body.appendChild(parent);
      processTree(parent);

      const removeSpy = jest.spyOn(input, 'removeEventListener');
      _disposeTree(input);

      expect(removeSpy).toHaveBeenCalledWith(
        'input',
        expect.any(Function)
      );
      removeSpy.mockRestore();
    });
  });

  describe('model disposal', () => {
    test('model handler removed after _disposeTree', () => {
      const parent = document.createElement('div');
      parent.setAttribute('state', '{ text: "" }');
      const input = document.createElement('input');
      input.setAttribute('model', 'text');
      parent.appendChild(input);
      document.body.appendChild(parent);
      processTree(parent);

      const removeSpy = jest.spyOn(input, 'removeEventListener');
      _disposeTree(input);

      // model uses 'input' event by default for text inputs
      expect(removeSpy).toHaveBeenCalled();
      removeSpy.mockRestore();
    });
  });
});



describe('model — text input with null value (L98)', () => {
  test('model on text input sets empty string when null', () => {
    const parent = document.createElement('div');
    parent.setAttribute('state', '{ text: null }');
    const input = document.createElement('input');
    input.type = 'text';
    input.setAttribute('model', 'text');
    parent.appendChild(input);
    document.body.appendChild(parent);
    processTree(parent);
    expect(input.value).toBe('');
    document.body.removeChild(parent);
  });
});

describe('on:updated lifecycle hook', () => {
  afterEach(() => {
    document.body.innerHTML = '';
    Object.keys(_stores).forEach((k) => delete _stores[k]);
  });

  test('fires when element content changes via mutation', async () => {
    const parent = document.createElement('div');
    parent.setAttribute('state', '{ updated: false }');
    const child = document.createElement('div');
    child.setAttribute('on:updated', 'updated = true');
    child.innerHTML = '<span>Original</span>';
    parent.appendChild(child);
    document.body.appendChild(parent);
    processTree(parent);

    const ctx = findContext(child);

    
    child.innerHTML = '<span>Changed</span>';

    
    await new Promise((r) => setTimeout(r, 50));

    expect(ctx.updated).toBe(true);
  });

  test('does not fire after element is removed from DOM externally', async () => {
    let callCount = 0;
    const parent = document.createElement('div');
    parent.setAttribute('state', '{ count: 0 }');
    const child = document.createElement('div');
    child.setAttribute('on:updated', 'count++');
    child.innerHTML = '<span>Original</span>';
    parent.appendChild(child);
    document.body.appendChild(parent);
    processTree(parent);

    // Confirm it fires while connected
    child.innerHTML = '<span>Changed</span>';
    await new Promise((r) => setTimeout(r, 50));
    const ctx = findContext(parent);
    expect(ctx.count).toBe(1);

    // Remove element externally (bypassing framework dispose)
    parent.innerHTML = '';

    // Trigger a mutation on the now-detached child
    child.innerHTML = '<span>After removal</span>';
    await new Promise((r) => setTimeout(r, 50));

    // Count must not have increased
    expect(ctx.count).toBe(1);
  });
});

describe('on:error lifecycle hook', () => {
  afterEach(() => {
    document.body.innerHTML = '';
    Object.keys(_stores).forEach((k) => delete _stores[k]);
  });

  test('on:error directive is registered and processes without error', () => {
    const parent = document.createElement('div');
    parent.setAttribute('state', '{ errorCaught: false }');
    const child = document.createElement('div');
    child.setAttribute('on:error', 'errorCaught = true');
    parent.appendChild(child);
    document.body.appendChild(parent);

    expect(() => processTree(parent)).not.toThrow();
  });
});



describe('show with animation attributes', () => {
  afterEach(() => {
    document.body.innerHTML = '';
    Object.keys(_stores).forEach((k) => delete _stores[k]);
  });

  test('reads animate-enter and animate-leave attributes', () => {
    const parent = document.createElement('div');
    parent.setAttribute('state', '{ visible: true }');
    const el = document.createElement('div');
    el.setAttribute('show', 'visible');
    el.setAttribute('animate-enter', 'fadeIn');
    el.setAttribute('animate-leave', 'fadeOut');
    el.innerHTML = '<span>Content</span>';
    parent.appendChild(el);
    document.body.appendChild(parent);
    processTree(parent);

    
    expect(el.style.display).not.toBe('none');

    
    const child = el.querySelector('span');
    expect(child.classList.contains('fadeIn')).toBe(true);
  });
});

describe('hide with animation attributes', () => {
  afterEach(() => {
    document.body.innerHTML = '';
    Object.keys(_stores).forEach((k) => delete _stores[k]);
  });

  test('reads animate-enter and animate-leave attributes', () => {
    const parent = document.createElement('div');
    parent.setAttribute('state', '{ hidden: false }');
    const el = document.createElement('div');
    el.setAttribute('hide', 'hidden');
    el.setAttribute('animate-enter', 'fadeIn');
    el.setAttribute('animate-leave', 'fadeOut');
    el.innerHTML = '<span>Content</span>';
    parent.appendChild(el);
    document.body.appendChild(parent);
    processTree(parent);

    
    expect(el.style.display).not.toBe('none');

    
    const child = el.querySelector('span');
    expect(child.classList.contains('fadeIn')).toBe(true);
  });
});



describe('foreach with animation attributes', () => {
  afterEach(() => {
    document.body.innerHTML = '';
    Object.keys(_stores).forEach((k) => delete _stores[k]);
  });

  test('reads animate-enter and animate-stagger attributes', () => {
    const parent = document.createElement('div');
    parent.setAttribute('state', '{ items: ["a", "b", "c"] }');

    const container = document.createElement('div');
    const el = document.createElement('div');
    el.setAttribute('foreach', 'item in items');
    el.setAttribute('animate-enter', 'fadeIn');
    el.setAttribute('animate-stagger', '100');
    el.innerHTML = '<span bind="item"></span>';
    container.appendChild(el);
    parent.appendChild(container);
    document.body.appendChild(parent);
    processTree(parent);

    // Self-repeating: clones are siblings in container between comment markers
    const clones = [...container.querySelectorAll('div:not([state])')];
    expect(clones.length).toBe(3);

    clones.forEach((clone) => {
      expect(clone.classList.contains('fadeIn')).toBe(true);
    });

    expect(clones[0].style.animationDelay).toBe('0ms');
    expect(clones[1].style.animationDelay).toBe('100ms');
    expect(clones[2].style.animationDelay).toBe('200ms');
  });
});

describe('foreach with inline template (no external template)', () => {
  afterEach(() => {
    document.body.innerHTML = '';
    Object.keys(_stores).forEach((k) => delete _stores[k]);
  });

  // Helper: get element clones from the parent (skipping comment markers)
  function getClones(container, tag) {
    return [...container.querySelectorAll(tag || '*')].filter(
      (el) => el.parentNode === container && el.nodeType === 1
    );
  }

  test('renders items correctly without external template', () => {
    const parent = document.createElement('div');
    parent.setAttribute('state', '{ items: ["a", "b", "c"] }');

    const ul = document.createElement('ul');
    const li = document.createElement('li');
    li.setAttribute('foreach', 'item in items');
    li.innerHTML = '<span bind="item"></span>';
    ul.appendChild(li);
    parent.appendChild(ul);
    document.body.appendChild(parent);
    processTree(parent);

    // Self-repeating: li clones are siblings in ul
    const clones = ul.querySelectorAll('li');
    expect(clones.length).toBe(3);

    const texts = [...clones].map((w) => w.querySelector('span').textContent);
    expect(texts).toEqual(['a', 'b', 'c']);
  });

  test('does not cause infinite recursion with inline template', () => {
    const parent = document.createElement('div');
    parent.setAttribute('state', '{ items: ["x", "y"] }');

    const container = document.createElement('div');
    const span = document.createElement('span');
    span.setAttribute('foreach', 'item in items');
    span.setAttribute('bind', 'item');
    container.appendChild(span);
    parent.appendChild(container);
    document.body.appendChild(parent);

    processTree(parent);

    // Self-repeating: span clones are siblings in container
    const clones = container.querySelectorAll('span');
    expect(clones.length).toBe(2);

    // No clone should itself contain foreach-generated children
    clones.forEach((child) => {
      expect(child.querySelectorAll('[foreach]').length).toBe(0);
    });

    // Clones should NOT have foreach/from attributes (stripped)
    clones.forEach((clone) => {
      expect(clone.hasAttribute('foreach')).toBe(false);
      expect(clone.hasAttribute('from')).toBe(false);
    });
  });

  test('provides iteration variables ($index, $count, $first, $last, $even, $odd)', () => {
    const parent = document.createElement('div');
    parent.setAttribute('state', '{ items: ["a", "b", "c"] }');

    const container = document.createElement('div');
    const div = document.createElement('div');
    div.setAttribute('foreach', 'item in items');
    div.innerHTML =
      '<span class="val" bind="item"></span>' +
      '<span class="idx" bind="$index"></span>' +
      '<span class="cnt" bind="$count"></span>' +
      '<span class="first" bind="$first"></span>' +
      '<span class="last" bind="$last"></span>' +
      '<span class="even" bind="$even"></span>' +
      '<span class="odd" bind="$odd"></span>';
    container.appendChild(div);
    parent.appendChild(container);
    document.body.appendChild(parent);
    processTree(parent);

    // Self-repeating: div clones in container
    const clones = [...container.children].filter((c) => c.nodeType === 1);
    expect(clones.length).toBe(3);

    // First item: index=0, count=3, first=true, last=false, even=true, odd=false
    const w0 = clones[0];
    expect(w0.querySelector('.val').textContent).toBe('a');
    expect(w0.querySelector('.idx').textContent).toBe('0');
    expect(w0.querySelector('.cnt').textContent).toBe('3');
    expect(w0.querySelector('.first').textContent).toBe('true');
    expect(w0.querySelector('.last').textContent).toBe('false');
    expect(w0.querySelector('.even').textContent).toBe('true');
    expect(w0.querySelector('.odd').textContent).toBe('false');

    // Second item: index=1, first=false, last=false, even=false, odd=true
    const w1 = clones[1];
    expect(w1.querySelector('.val').textContent).toBe('b');
    expect(w1.querySelector('.idx').textContent).toBe('1');
    expect(w1.querySelector('.first').textContent).toBe('false');
    expect(w1.querySelector('.last').textContent).toBe('false');
    expect(w1.querySelector('.even').textContent).toBe('false');
    expect(w1.querySelector('.odd').textContent).toBe('true');

    // Third item: index=2, first=false, last=true, even=true, odd=false
    const w2 = clones[2];
    expect(w2.querySelector('.val').textContent).toBe('c');
    expect(w2.querySelector('.idx').textContent).toBe('2');
    expect(w2.querySelector('.first').textContent).toBe('false');
    expect(w2.querySelector('.last').textContent).toBe('true');
    expect(w2.querySelector('.even').textContent).toBe('true');
    expect(w2.querySelector('.odd').textContent).toBe('false');
  });

  test('supports filter, sort, and limit with inline template', () => {
    const parent = document.createElement('div');
    parent.setAttribute(
      'state',
      '{ users: [{ name: "Charlie", age: 30 }, { name: "Alice", age: 25 }, { name: "Bob", age: 35 }, { name: "Diana", age: 28 }] }',
    );

    const container = document.createElement('div');
    const span = document.createElement('span');
    span.setAttribute('foreach', 'user in users');
    span.setAttribute('filter', 'user.age >= 28');
    span.setAttribute('sort', 'name');
    span.setAttribute('limit', '2');
    span.setAttribute('bind', 'user.name');
    container.appendChild(span);
    parent.appendChild(container);
    document.body.appendChild(parent);
    processTree(parent);

    const clones = container.querySelectorAll('span');
    // Filtered: Charlie(30), Bob(35), Diana(28) — ages >= 28
    // Sorted by name: Bob, Charlie, Diana
    // Limit 2: Bob, Charlie
    expect(clones.length).toBe(2);

    const names = [...clones].map((w) => w.textContent);
    expect(names).toEqual(['Bob', 'Charlie']);
  });

  test('re-renders when source array changes', () => {
    const parent = document.createElement('div');
    parent.setAttribute('state', '{ items: ["a", "b"] }');

    const container = document.createElement('div');
    const span = document.createElement('span');
    span.setAttribute('foreach', 'item in items');
    span.setAttribute('bind', 'item');
    container.appendChild(span);
    parent.appendChild(container);
    document.body.appendChild(parent);
    processTree(parent);

    // Initial: 2 items
    expect(container.querySelectorAll('span').length).toBe(2);

    // Mutate the array via the reactive context
    const ctx = parent.__ctx;
    ctx.items = ['x', 'y', 'z'];

    // After mutation: 3 items
    const clones = container.querySelectorAll('span');
    expect(clones.length).toBe(3);

    const texts = [...clones].map((w) => w.textContent);
    expect(texts).toEqual(['x', 'y', 'z']);
  });

  test('supports custom index name via index attribute', () => {
    const parent = document.createElement('div');
    parent.setAttribute('state', '{ items: ["a", "b"] }');

    const container = document.createElement('div');
    const span = document.createElement('span');
    span.setAttribute('foreach', 'item in items');
    span.setAttribute('index', 'i');
    span.setAttribute('bind', 'i');
    container.appendChild(span);
    parent.appendChild(container);
    document.body.appendChild(parent);
    processTree(parent);

    const clones = container.querySelectorAll('span');
    expect(clones.length).toBe(2);
    expect(clones[0].textContent).toBe('0');
    expect(clones[1].textContent).toBe('1');
  });

  test('renders empty list without errors', () => {
    const parent = document.createElement('div');
    parent.setAttribute('state', '{ items: [] }');

    const container = document.createElement('div');
    const span = document.createElement('span');
    span.setAttribute('foreach', 'item in items');
    span.setAttribute('bind', 'item');
    container.appendChild(span);
    parent.appendChild(container);
    document.body.appendChild(parent);
    processTree(parent);

    const clones = container.querySelectorAll('span');
    expect(clones.length).toBe(0);
  });

  test('supports offset with inline template', () => {
    const parent = document.createElement('div');
    parent.setAttribute('state', '{ items: ["a", "b", "c", "d", "e"] }');

    const container = document.createElement('div');
    const span = document.createElement('span');
    span.setAttribute('foreach', 'item in items');
    span.setAttribute('offset', '2');
    span.setAttribute('limit', '2');
    span.setAttribute('bind', 'item');
    container.appendChild(span);
    parent.appendChild(container);
    document.body.appendChild(parent);
    processTree(parent);

    const clones = container.querySelectorAll('span');
    expect(clones.length).toBe(2);

    const texts = [...clones].map((w) => w.textContent);
    expect(texts).toEqual(['c', 'd']);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// loops.js — key-based reconciliation in each and foreach (TIP-P3)
// ═══════════════════════════════════════════════════════════════════════════

describe('each — key-based reconciliation', () => {
  let container;

  beforeEach(() => {
    document.body.innerHTML = '';
    Object.keys(_stores).forEach((k) => delete _stores[k]);
    container = document.createElement('div');
    document.body.appendChild(container);
  });

  afterEach(() => {
    document.body.innerHTML = '';
  });

  // Helper: get managed clones between comment markers in the host
  function getManagedClones(host) {
    return [...host.childNodes].filter((n) => n.nodeType === 1);
  }

  function makeEachList(items) {
    const state = document.createElement('div');
    state.setAttribute('state', JSON.stringify({ items }));
    container.appendChild(state);

    // Self-repeating: the element with each IS the template
    const host = document.createElement('div');
    const tplEl = document.createElement('div');
    tplEl.setAttribute('each', 'item in items');
    tplEl.setAttribute('key', 'item.id');
    tplEl.className = 'row';
    host.appendChild(tplEl);
    state.appendChild(host);

    processTree(state);
    return { state, host };
  }

  test('push: only one new wrapper is created, existing ones are preserved', () => {
    const { host, state } = makeEachList([{ id: 1 }, { id: 2 }]);
    const initialClones = getManagedClones(host);
    expect(initialClones).toHaveLength(2);

    // Mark wrappers to detect identity preservation
    initialClones[0].__marker = 'A';
    initialClones[1].__marker = 'B';

    // Push a new item
    state.__ctx.__raw.items = [{ id: 1 }, { id: 2 }, { id: 3 }];
    state.__ctx.$notify();

    const clones = getManagedClones(host);
    expect(clones).toHaveLength(3);
    expect(clones[0].__marker).toBe('A');
    expect(clones[1].__marker).toBe('B');
    expect(clones[2].__marker).toBeUndefined(); // new node
  });

  test('splice: only the removed wrapper is disposed, others preserved', () => {
    const { host, state } = makeEachList([{ id: 1 }, { id: 2 }, { id: 3 }]);
    const clones = getManagedClones(host);
    const wrapperB = clones[1];
    wrapperB.__marker = 'B';
    clones[0].__marker = 'A';
    clones[2].__marker = 'C';

    // Remove middle item
    state.__ctx.__raw.items = [{ id: 1 }, { id: 3 }];
    state.__ctx.$notify();

    const updated = getManagedClones(host);
    expect(updated).toHaveLength(2);
    expect(updated[0].__marker).toBe('A');
    expect(updated[1].__marker).toBe('C');
    expect(wrapperB.isConnected).toBe(false); // removed from DOM
  });

  test('reorder: DOM order matches new list order without recreating nodes', () => {
    const { host, state } = makeEachList([{ id: 1 }, { id: 2 }, { id: 3 }]);
    const clones = getManagedClones(host);
    clones[0].__marker = 'A';
    clones[1].__marker = 'B';
    clones[2].__marker = 'C';

    // Reverse the list
    state.__ctx.__raw.items = [{ id: 3 }, { id: 2 }, { id: 1 }];
    state.__ctx.$notify();

    const updated = getManagedClones(host);
    expect(updated).toHaveLength(3);
    expect(updated[0].__marker).toBe('C');
    expect(updated[1].__marker).toBe('B');
    expect(updated[2].__marker).toBe('A');
  });

  test('no key attribute: falls back to full rebuild (backward compat)', () => {
    const state = document.createElement('div');
    state.setAttribute('state', JSON.stringify({ items: [{ id: 1 }, { id: 2 }] }));
    container.appendChild(state);

    const host = document.createElement('div');
    const tplEl = document.createElement('div');
    tplEl.setAttribute('each', 'item in items');
    tplEl.className = 'row';
    // Note: no key attribute
    host.appendChild(tplEl);
    state.appendChild(host);
    processTree(state);

    const clones = getManagedClones(host);
    const first = clones[0];
    first.__marker = 'should-be-gone';

    state.__ctx.__raw.items = [{ id: 1 }, { id: 2 }, { id: 3 }];
    state.__ctx.$notify();

    // Full rebuild: original wrapper is gone, marker is not on any child
    const markers = getManagedClones(host).map((c) => c.__marker).filter(Boolean);
    expect(markers).toHaveLength(0);
  });

  test('$index and $count are updated on existing wrappers', () => {
    const { host, state } = makeEachList([{ id: 1 }, { id: 2 }, { id: 3 }]);

    // Remove first item — $index of remaining items must update
    state.__ctx.__raw.items = [{ id: 2 }, { id: 3 }];
    state.__ctx.$notify();

    const clones = getManagedClones(host);
    expect(clones[0].__ctx.__raw.$index).toBe(0);
    expect(clones[1].__ctx.__raw.$index).toBe(1);
    expect(clones[0].__ctx.__raw.$first).toBe(true);
    expect(clones[1].__ctx.__raw.$last).toBe(true);
  });

  test('empty list clears all rendered wrappers (keyMap flushed)', () => {
    const { host, state } = makeEachList([{ id: 1 }, { id: 2 }]);
    expect(getManagedClones(host)).toHaveLength(2);

    state.__ctx.__raw.items = [];
    state.__ctx.$notify();

    // Both wrappers disposed and removed
    expect(getManagedClones(host)).toHaveLength(0);
  });
});

describe('foreach — key-based reconciliation', () => {
  let container;

  beforeEach(() => {
    document.body.innerHTML = '';
    Object.keys(_stores).forEach((k) => delete _stores[k]);
    container = document.createElement('div');
    document.body.appendChild(container);
  });

  afterEach(() => {
    document.body.innerHTML = '';
  });

  function getManagedClones(host) {
    return [...host.childNodes].filter((n) => n.nodeType === 1);
  }

  function makeForeachList(items) {
    const state = document.createElement('div');
    state.setAttribute('state', JSON.stringify({ items }));
    container.appendChild(state);

    const host = document.createElement('div');
    const tplEl = document.createElement('div');
    tplEl.setAttribute('foreach', 'item in items');
    tplEl.setAttribute('key', 'item.id');
    tplEl.className = 'fc-row';
    host.appendChild(tplEl);
    state.appendChild(host);

    processTree(state);
    return { state, host };
  }

  test('push: existing wrappers preserved, one new wrapper created', () => {
    const { host, state } = makeForeachList([{ id: 'a' }, { id: 'b' }]);
    const clones = getManagedClones(host);
    clones[0].__marker = 'A';
    clones[1].__marker = 'B';

    state.__ctx.__raw.items = [{ id: 'a' }, { id: 'b' }, { id: 'c' }];
    state.__ctx.$notify();

    const updated = getManagedClones(host);
    expect(updated).toHaveLength(3);
    expect(updated[0].__marker).toBe('A');
    expect(updated[1].__marker).toBe('B');
    expect(updated[2].__marker).toBeUndefined();
  });

  test('splice: only the removed wrapper is taken out of DOM', () => {
    const { host, state } = makeForeachList([{ id: 'a' }, { id: 'b' }, { id: 'c' }]);
    const clones = getManagedClones(host);
    const removed = clones[1];
    removed.__marker = 'B';
    clones[0].__marker = 'A';
    clones[2].__marker = 'C';

    state.__ctx.__raw.items = [{ id: 'a' }, { id: 'c' }];
    state.__ctx.$notify();

    const updated = getManagedClones(host);
    expect(updated).toHaveLength(2);
    expect(updated[0].__marker).toBe('A');
    expect(updated[1].__marker).toBe('C');
    expect(removed.isConnected).toBe(false);
  });

  test('reorder: nodes reused and repositioned without recreation', () => {
    const { host, state } = makeForeachList([{ id: 'x' }, { id: 'y' }, { id: 'z' }]);
    const clones = getManagedClones(host);
    clones[0].__marker = 'X';
    clones[1].__marker = 'Y';
    clones[2].__marker = 'Z';

    state.__ctx.__raw.items = [{ id: 'z' }, { id: 'x' }, { id: 'y' }];
    state.__ctx.$notify();

    const updated = getManagedClones(host);
    expect(updated[0].__marker).toBe('Z');
    expect(updated[1].__marker).toBe('X');
    expect(updated[2].__marker).toBe('Y');
  });

  test('no key attribute: uses full rebuild (backward compat)', () => {
    const state = document.createElement('div');
    state.setAttribute('state', JSON.stringify({ items: [{ id: 1 }, { id: 2 }] }));
    container.appendChild(state);

    const host = document.createElement('div');
    const tplEl = document.createElement('div');
    tplEl.setAttribute('foreach', 'item in items');
    tplEl.className = 'fc-nokey';
    // No key attribute
    host.appendChild(tplEl);
    state.appendChild(host);
    processTree(state);

    const clones = getManagedClones(host);
    const first = clones[0];
    first.__marker = 'original';

    state.__ctx.__raw.items = [{ id: 1 }, { id: 2 }, { id: 3 }];
    state.__ctx.$notify();

    const markers = getManagedClones(host).map((c) => c.__marker).filter(Boolean);
    expect(markers).toHaveLength(0); // full rebuild, no preserved markers
  });
});

// ─── foreach + key + inline template (no external <template> element) ──────
describe('foreach — key-based reconciliation, inline template', () => {
  let container;

  beforeEach(() => {
    document.body.innerHTML = '';
    Object.keys(_stores).forEach((k) => delete _stores[k]);
    container = document.createElement('div');
    document.body.appendChild(container);
  });

  afterEach(() => {
    document.body.innerHTML = '';
  });

  function getManagedClones(host) {
    return [...host.childNodes].filter((n) => n.nodeType === 1);
  }

  // Self-repeating: the element with foreach IS the template
  function makeInlineForeachList(items) {
    const state = document.createElement('div');
    state.setAttribute('state', JSON.stringify({ items }));
    container.appendChild(state);

    const host = document.createElement('div');
    const tplEl = document.createElement('div');
    tplEl.setAttribute('foreach', 'item in items');
    tplEl.setAttribute('key', 'item.id');
    tplEl.innerHTML = '<span class="inline-row"></span>';
    host.appendChild(tplEl);
    state.appendChild(host);

    processTree(state);
    return { state, host };
  }

  test('push: existing wrappers preserved, one new wrapper created', () => {
    const { host, state } = makeInlineForeachList([{ id: 1 }, { id: 2 }]);
    const clones = getManagedClones(host);
    expect(clones).toHaveLength(2);
    clones[0].__marker = 'A';
    clones[1].__marker = 'B';

    state.__ctx.__raw.items = [{ id: 1 }, { id: 2 }, { id: 3 }];
    state.__ctx.$notify();

    const updated = getManagedClones(host);
    expect(updated).toHaveLength(3);
    expect(updated[0].__marker).toBe('A');
    expect(updated[1].__marker).toBe('B');
    expect(updated[2].__marker).toBeUndefined();
  });

  test('splice: only the removed wrapper is taken out of DOM', () => {
    const { host, state } = makeInlineForeachList([{ id: 1 }, { id: 2 }, { id: 3 }]);
    const clones = getManagedClones(host);
    const removed = clones[1];
    removed.__marker = 'B';
    clones[0].__marker = 'A';
    clones[2].__marker = 'C';

    state.__ctx.__raw.items = [{ id: 1 }, { id: 3 }];
    state.__ctx.$notify();

    const updated = getManagedClones(host);
    expect(updated).toHaveLength(2);
    expect(updated[0].__marker).toBe('A');
    expect(updated[1].__marker).toBe('C');
    expect(removed.isConnected).toBe(false);
  });

  test('reorder: nodes repositioned without recreation', () => {
    const { host, state } = makeInlineForeachList([{ id: 1 }, { id: 2 }, { id: 3 }]);
    const clones = getManagedClones(host);
    clones[0].__marker = 'A';
    clones[1].__marker = 'B';
    clones[2].__marker = 'C';

    state.__ctx.__raw.items = [{ id: 3 }, { id: 1 }, { id: 2 }];
    state.__ctx.$notify();

    const updated = getManagedClones(host);
    expect(updated[0].__marker).toBe('C');
    expect(updated[1].__marker).toBe('A');
    expect(updated[2].__marker).toBe('B');
  });

  test('each item renders its own clone (no shared template state)', () => {
    const { host } = makeInlineForeachList([{ id: 'x' }, { id: 'y' }]);
    const spans = host.querySelectorAll('.inline-row');
    expect(spans).toHaveLength(2);
    // Each span is a distinct node
    expect(spans[0]).not.toBe(spans[1]);
  });
});

// ─── key reconciliation: disposal of removed items ──────────────────────────
describe('key reconciliation — disposal of removed items', () => {
  let container;

  beforeEach(() => {
    document.body.innerHTML = '';
    Object.keys(_stores).forEach((k) => delete _stores[k]);
    container = document.createElement('div');
    document.body.appendChild(container);
  });

  afterEach(() => {
    document.body.innerHTML = '';
  });

  function getManagedClones(host) {
    return [...host.childNodes].filter((n) => n.nodeType === 1);
  }

  test('each: __disposers on removed item child are called on splice', () => {
    const state = document.createElement('div');
    state.setAttribute('state', JSON.stringify({ items: [{ id: 1 }, { id: 2 }, { id: 3 }] }));
    container.appendChild(state);

    const host = document.createElement('div');
    const tplEl = document.createElement('div');
    tplEl.setAttribute('each', 'item in items');
    tplEl.setAttribute('key', 'item.id');
    tplEl.innerHTML = '<span class="inner"></span>';
    host.appendChild(tplEl);
    state.appendChild(host);
    processTree(state);

    // Plant a disposer on the span inside the second item (item id=2)
    const clones = getManagedClones(host);
    const spanToDispose = clones[1].querySelector('.inner');
    const disposed = [];
    spanToDispose.__disposers = [() => disposed.push('id2-disposed')];

    // Remove item id=2
    state.__ctx.__raw.items = [{ id: 1 }, { id: 3 }];
    state.__ctx.$notify();

    expect(disposed).toEqual(['id2-disposed']);
  });

  test('foreach: __disposers on removed item child are called on splice', () => {
    const state = document.createElement('div');
    state.setAttribute('state', JSON.stringify({ items: [{ id: 'a' }, { id: 'b' }, { id: 'c' }] }));
    container.appendChild(state);

    const host = document.createElement('div');
    const tplEl = document.createElement('div');
    tplEl.setAttribute('foreach', 'item in items');
    tplEl.setAttribute('key', 'item.id');
    tplEl.innerHTML = '<span class="inner"></span>';
    host.appendChild(tplEl);
    state.appendChild(host);
    processTree(state);

    const clones = getManagedClones(host);
    const spanToDispose = clones[1].querySelector('.inner');
    const disposed = [];
    spanToDispose.__disposers = [() => disposed.push('b-disposed')];

    state.__ctx.__raw.items = [{ id: 'a' }, { id: 'c' }];
    state.__ctx.$notify();

    expect(disposed).toEqual(['b-disposed']);
  });

  test('foreach inline: __disposers on removed item child are called on splice', () => {
    const state = document.createElement('div');
    state.setAttribute('state', JSON.stringify({ items: [{ id: 1 }, { id: 2 }] }));
    container.appendChild(state);

    const host = document.createElement('div');
    const tplEl = document.createElement('div');
    tplEl.setAttribute('foreach', 'item in items');
    tplEl.setAttribute('key', 'item.id');
    tplEl.innerHTML = '<span class="inner"></span>';
    host.appendChild(tplEl);
    state.appendChild(host);
    processTree(state);

    const clones = getManagedClones(host);
    const spanToDispose = clones[0].querySelector('.inner');
    const disposed = [];
    spanToDispose.__disposers = [() => disposed.push('id1-disposed')];

    // Remove first item
    state.__ctx.__raw.items = [{ id: 2 }];
    state.__ctx.$notify();

    expect(disposed).toEqual(['id1-disposed']);
  });

  test('each: preserved wrappers do NOT have their disposers called on update', () => {
    const state = document.createElement('div');
    state.setAttribute('state', JSON.stringify({ items: [{ id: 1 }, { id: 2 }] }));
    container.appendChild(state);

    const host = document.createElement('div');
    const tplEl = document.createElement('div');
    tplEl.setAttribute('each', 'item in items');
    tplEl.setAttribute('key', 'item.id');
    tplEl.className = 'nd-row';
    host.appendChild(tplEl);
    state.appendChild(host);
    processTree(state);

    const clones = getManagedClones(host);
    const preserved = clones[0];
    const disposed = [];
    preserved.__disposers = [() => disposed.push('id1-wrongly-disposed')];

    // Push a new item — id=1 wrapper must be preserved
    state.__ctx.__raw.items = [{ id: 1 }, { id: 2 }, { id: 3 }];
    state.__ctx.$notify();

    expect(disposed).toHaveLength(0);
  });
});

describe('bind-html — D1 dynamic expression warning', () => {
  let warnSpy;

  beforeEach(() => {
    _config.debug = false;
    _config.devtools = false;
    warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    _config.debug = false;
    _config.devtools = false;
    warnSpy.mockRestore();
  });

  test('warns when debug is true and expression is dynamic', () => {
    _config.debug = true;
    const parent = document.createElement('div');
    parent.setAttribute('state', '{ html: "<b>hi</b>" }');
    const el = document.createElement('div');
    el.setAttribute('bind-html', 'html');
    parent.appendChild(el);
    document.body.appendChild(parent);
    processTree(parent);
    expect(warnSpy).toHaveBeenCalledWith(
      '[No.JS]',
      expect.stringContaining('[Security] bind-html used with dynamic expression'),
      el
    );
    document.body.removeChild(parent);
  });

  test('warns when devtools is true and expression is dynamic', () => {
    _config.devtools = true;
    const parent = document.createElement('div');
    parent.setAttribute('state', '{ html: "<b>hi</b>" }');
    const el = document.createElement('div');
    el.setAttribute('bind-html', 'html');
    parent.appendChild(el);
    document.body.appendChild(parent);
    processTree(parent);
    expect(warnSpy).toHaveBeenCalledWith(
      '[No.JS]',
      expect.stringContaining('[Security] bind-html used with dynamic expression'),
      el
    );
    document.body.removeChild(parent);
  });

  test('does not warn when expression is a string literal', () => {
    _config.debug = true;
    const parent = document.createElement('div');
    parent.setAttribute('state', '{}');
    const el = document.createElement('div');
    el.setAttribute('bind-html', '"<b>static</b>"');
    parent.appendChild(el);
    document.body.appendChild(parent);
    processTree(parent);
    expect(warnSpy).not.toHaveBeenCalledWith(
      '[No.JS]',
      expect.stringContaining('[Security] bind-html used with dynamic expression'),
      expect.anything()
    );
    document.body.removeChild(parent);
  });

  test('does not warn when debug and devtools are both false', () => {
    const parent = document.createElement('div');
    parent.setAttribute('state', '{ html: "<b>hi</b>" }');
    const el = document.createElement('div');
    el.setAttribute('bind-html', 'html');
    parent.appendChild(el);
    document.body.appendChild(parent);
    processTree(parent);
    expect(warnSpy).not.toHaveBeenCalledWith(
      '[No.JS]',
      expect.stringContaining('[Security] bind-html used with dynamic expression'),
      expect.anything()
    );
    document.body.removeChild(parent);
  });
});

// ═══════════════════════════════════════════════════════════════════════
//  AUDIT FIX — M8: error-boundary nojs:error listener cleanup on dispose
// ═══════════════════════════════════════════════════════════════════════

describe('Error-boundary nojs:error listener disposal (M8)', () => {
  afterEach(() => {
    document.body.innerHTML = '';
    Object.keys(_stores).forEach((k) => delete _stores[k]);
  });

  test('should not trigger fallback after error-boundary element is disposed', () => {
    const parent = document.createElement('div');
    parent.setAttribute('state', '{ }');

    // Create a fallback template
    const fallbackTpl = document.createElement('template');
    fallbackTpl.id = 'error-fallback';
    fallbackTpl.innerHTML = '<div class="fallback">Something went wrong</div>';
    document.body.appendChild(fallbackTpl);

    const boundary = document.createElement('div');
    boundary.setAttribute('error-boundary', '#error-fallback');
    boundary.innerHTML = '<p>Normal content</p>';
    parent.appendChild(boundary);
    document.body.appendChild(parent);

    processTree(parent);

    // Verify error-boundary has disposers registered
    expect(boundary.__disposers).toBeDefined();
    expect(boundary.__disposers.length).toBeGreaterThan(0);

    // Capture initial innerHTML
    const initialHTML = boundary.innerHTML;

    // Dispose the boundary element (simulates removal from DOM)
    _disposeTree(boundary);

    // Now dispatch a nojs:error event — should NOT trigger fallback rendering
    boundary.dispatchEvent(new CustomEvent('nojs:error', {
      detail: { message: 'Test error after disposal' },
    }));

    // innerHTML should remain unchanged — no fallback was rendered
    expect(boundary.innerHTML).toBe(initialHTML);
  });
});

// ═══════════════════════════════════════════════════════════════════════
//  AUDIT FIX — M9: bind-html calls _disposeChildren before innerHTML
// ═══════════════════════════════════════════════════════════════════════

describe('bind-html child disposal (M9)', () => {
  afterEach(() => {
    document.body.innerHTML = '';
    Object.keys(_stores).forEach((k) => delete _stores[k]);
  });

  test('should call child disposers when bind-html updates with new content', () => {
    const parent = document.createElement('div');
    parent.setAttribute('state', '{ content: "<b>Initial</b>" }');
    const div = document.createElement('div');
    div.setAttribute('bind-html', 'content');
    parent.appendChild(div);
    document.body.appendChild(parent);
    processTree(parent);

    expect(div.innerHTML).toBe('<b>Initial</b>');

    // Plant a mock disposer on the child <b> element
    const boldChild = div.querySelector('b');
    expect(boldChild).toBeTruthy();
    const disposed = [];
    boldChild.__disposers = [() => disposed.push('bold-disposed')];

    // Update content — should trigger _disposeChildren before setting new innerHTML
    parent.__ctx.content = '<em>Updated</em>';

    // Verify the old child's disposer was called
    expect(disposed).toEqual(['bold-disposed']);
    // And the new content is in place
    expect(div.innerHTML).toBe('<em>Updated</em>');
  });
});

// ═══════════════════════════════════════════════════════════════════════
//  H1 — persist watcher is unsubscribed after element disposal
// ═══════════════════════════════════════════════════════════════════════

describe('H1 — persist watcher disposal', () => {
  afterEach(() => {
    document.body.innerHTML = '';
    Object.keys(_stores).forEach((k) => delete _stores[k]);
    localStorage.clear();
  });

  test('should stop persisting to localStorage after element disposal', () => {
    const div = document.createElement('div');
    div.setAttribute('state', '{ count: 0 }');
    div.setAttribute('persist', 'localStorage');
    div.setAttribute('persist-key', 'test-h1');
    document.body.appendChild(div);
    processTree(div);

    const ctx = div.__ctx;

    // Verify persistence works before disposal
    ctx.count = 10;
    const saved = JSON.parse(localStorage.getItem('nojs_state_test-h1'));
    expect(saved.count).toBe(10);

    // Dispose the element tree
    _disposeTree(div);

    // Mutate state after disposal — should NOT write to localStorage
    ctx.count = 999;
    const afterDispose = JSON.parse(localStorage.getItem('nojs_state_test-h1'));
    // The value should still be 10, not 999
    expect(afterDispose.count).toBe(10);
  });
});

// ═══════════════════════════════════════════════════════════════════════
//  M5 — debounce timer is cleared on element disposal
// ═══════════════════════════════════════════════════════════════════════

describe('M5 — debounce timer cleared on disposal', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    document.body.innerHTML = '';
  });

  afterEach(() => {
    jest.useRealTimers();
    document.body.innerHTML = '';
  });

  test('should not fire debounced callback after element is disposed mid-debounce', () => {
    const parent = document.createElement('div');
    parent.setAttribute('state', '{ clicked: false }');
    const btn = document.createElement('button');
    btn.setAttribute('on:click.debounce.500', 'clicked = true');
    parent.appendChild(btn);
    document.body.appendChild(parent);
    processTree(parent);

    const ctx = parent.__ctx;

    // Click the button to start the debounce timer
    btn.dispatchEvent(new Event('click'));

    // Dispose the element before the debounce fires (only 100ms in)
    jest.advanceTimersByTime(100);
    expect(ctx.clicked).toBe(false); // Not yet fired

    _disposeTree(btn);

    // Advance past the debounce window
    jest.advanceTimersByTime(500);

    // The callback should NOT have fired because disposal cleared the timer
    expect(ctx.clicked).toBe(false);
  });
});

// ═══════════════════════════════════════════════════════════════════════
//  FOREACH REFACTOR COVERAGE (v1.12.0)
// ═══════════════════════════════════════════════════════════════════════

describe('foreach "item in list" unified syntax', () => {
  afterEach(() => {
    document.body.innerHTML = '';
    Object.keys(_stores).forEach((k) => delete _stores[k]);
  });

  test('foreach="item in list" renders items', () => {
    const parent = document.createElement('div');
    parent.setAttribute('state', '{ fruits: ["apple", "banana", "cherry"] }');
    const ul = document.createElement('ul');
    const li = document.createElement('li');
    li.setAttribute('foreach', 'fruit in fruits');
    li.setAttribute('bind', 'fruit');
    ul.appendChild(li);
    parent.appendChild(ul);
    document.body.appendChild(parent);
    processTree(parent);

    const items = [...ul.querySelectorAll('li')];
    expect(items.length).toBe(3);
    expect(items.map(i => i.textContent)).toEqual(['apple', 'banana', 'cherry']);
  });

  test('foreach with filter and limit using "in" syntax', () => {
    const parent = document.createElement('div');
    parent.setAttribute('state', '{ nums: [5, 3, 1, 4, 2] }');
    const container = document.createElement('div');
    const span = document.createElement('span');
    span.setAttribute('foreach', 'n in nums');
    span.setAttribute('filter', 'n > 2');
    span.setAttribute('limit', '2');
    span.setAttribute('bind', 'n');
    container.appendChild(span);
    parent.appendChild(container);
    document.body.appendChild(parent);
    processTree(parent);

    const items = [...container.querySelectorAll('span')];
    expect(items.length).toBe(2);
    expect(items.map(i => i.textContent)).toEqual(['5', '3']);
  });
});

describe('foreach deprecated "from" syntax emits warning', () => {
  afterEach(() => {
    document.body.innerHTML = '';
    Object.keys(_stores).forEach((k) => delete _stores[k]);
  });

  test('foreach with from= logs deprecation warning', () => {
    const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
    const parent = document.createElement('div');
    parent.setAttribute('state', '{ items: ["a", "b"] }');
    const container = document.createElement('div');
    const span = document.createElement('span');
    span.setAttribute('foreach', 'item');
    span.setAttribute('from', 'items');
    span.setAttribute('bind', 'item');
    container.appendChild(span);
    parent.appendChild(container);
    document.body.appendChild(parent);
    processTree(parent);

    const deprecationCalls = warnSpy.mock.calls.filter(c =>
      c.some(arg => typeof arg === 'string' && arg.includes('deprecated'))
    );
    expect(deprecationCalls.length).toBeGreaterThan(0);
    warnSpy.mockRestore();
  });
});

describe('for directive (alias)', () => {
  afterEach(() => {
    document.body.innerHTML = '';
    Object.keys(_stores).forEach((k) => delete _stores[k]);
  });

  test('for="item in list" renders items', () => {
    const parent = document.createElement('div');
    parent.setAttribute('state', '{ colors: ["red", "green", "blue"] }');
    const container = document.createElement('div');
    const span = document.createElement('span');
    span.setAttribute('for', 'color in colors');
    span.setAttribute('bind', 'color');
    container.appendChild(span);
    parent.appendChild(container);
    document.body.appendChild(parent);
    processTree(parent);

    const items = [...container.querySelectorAll('span')];
    expect(items.length).toBe(3);
    expect(items.map(i => i.textContent)).toEqual(['red', 'green', 'blue']);
  });

  test('for with filter attribute', () => {
    const parent = document.createElement('div');
    parent.setAttribute('state', '{ nums: [1, 2, 3, 4, 5] }');
    const container = document.createElement('div');
    const span = document.createElement('span');
    span.setAttribute('for', 'n in nums');
    span.setAttribute('filter', 'n > 2');
    span.setAttribute('bind', 'n');
    container.appendChild(span);
    parent.appendChild(container);
    document.body.appendChild(parent);
    processTree(parent);

    const items = [...container.querySelectorAll('span')];
    expect(items.length).toBe(3);
    expect(items.map(i => i.textContent)).toEqual(['3', '4', '5']);
  });

  test('for with sort by property and limit', () => {
    const parent = document.createElement('div');
    parent.setAttribute('state', '{ users: [{ name: "Zoe" }, { name: "Amy" }, { name: "Max" }] }');
    const container = document.createElement('div');
    const span = document.createElement('span');
    span.setAttribute('for', 'u in users');
    span.setAttribute('sort', 'name');
    span.setAttribute('limit', '2');
    span.setAttribute('bind', 'u.name');
    container.appendChild(span);
    parent.appendChild(container);
    document.body.appendChild(parent);
    processTree(parent);

    const items = [...container.querySelectorAll('span')];
    expect(items.length).toBe(2);
    expect(items.map(i => i.textContent)).toEqual(['Amy', 'Max']);
  });

  test('for with offset', () => {
    const parent = document.createElement('div');
    parent.setAttribute('state', '{ letters: ["a", "b", "c", "d"] }');
    const container = document.createElement('div');
    const span = document.createElement('span');
    span.setAttribute('for', 'l in letters');
    span.setAttribute('offset', '2');
    span.setAttribute('bind', 'l');
    container.appendChild(span);
    parent.appendChild(container);
    document.body.appendChild(parent);
    processTree(parent);

    const items = [...container.querySelectorAll('span')];
    expect(items.length).toBe(2);
    expect(items.map(i => i.textContent)).toEqual(['c', 'd']);
  });

  test('for provides iteration variables', () => {
    const parent = document.createElement('div');
    parent.setAttribute('state', '{ items: ["x", "y"] }');
    const container = document.createElement('div');
    const div = document.createElement('div');
    div.setAttribute('for', 'item in items');
    div.innerHTML = '<span class="val" bind="item"></span><span class="idx" bind="$index"></span><span class="first" bind="$first"></span><span class="last" bind="$last"></span>';
    container.appendChild(div);
    parent.appendChild(container);
    document.body.appendChild(parent);
    processTree(parent);

    const items = [...container.children].filter(n => n.nodeType === 1);
    expect(items.length).toBe(2);
    expect(items[0].querySelector('.val').textContent).toBe('x');
    expect(items[0].querySelector('.idx').textContent).toBe('0');
    expect(items[0].querySelector('.first').textContent).toBe('true');
    expect(items[0].querySelector('.last').textContent).toBe('false');
    expect(items[1].querySelector('.last').textContent).toBe('true');
  });
});

describe('each directive with filter/sort/limit/offset', () => {
  afterEach(() => {
    document.body.innerHTML = '';
    Object.keys(_stores).forEach((k) => delete _stores[k]);
  });

  test('each with filter', () => {
    const parent = document.createElement('div');
    parent.setAttribute('state', '{ nums: [1, 2, 3, 4, 5] }');
    const container = document.createElement('div');
    const span = document.createElement('span');
    span.setAttribute('each', 'n in nums');
    span.setAttribute('filter', 'n % 2 === 0');
    span.setAttribute('bind', 'n');
    container.appendChild(span);
    parent.appendChild(container);
    document.body.appendChild(parent);
    processTree(parent);

    const items = [...container.querySelectorAll('span')];
    expect(items.length).toBe(2);
    expect(items.map(i => i.textContent)).toEqual(['2', '4']);
  });

  test('each with sort by property and limit', () => {
    const parent = document.createElement('div');
    parent.setAttribute('state', "{ vals: [{ label: 'Zeta' }, { label: 'Alpha' }, { label: 'Mid' }] }");
    const container = document.createElement('div');
    const span = document.createElement('span');
    span.setAttribute('each', 'v in vals');
    span.setAttribute('sort', 'label');
    span.setAttribute('limit', '2');
    span.setAttribute('bind', 'v.label');
    container.appendChild(span);
    parent.appendChild(container);
    document.body.appendChild(parent);
    processTree(parent);

    const items = [...container.querySelectorAll('span')];
    expect(items.length).toBe(2);
    expect(items.map(i => i.textContent)).toEqual(['Alpha', 'Mid']);
  });

  test('each with offset', () => {
    const parent = document.createElement('div');
    parent.setAttribute('state', "{ chars: ['a', 'b', 'c', 'd', 'e'] }");
    const container = document.createElement('div');
    const span = document.createElement('span');
    span.setAttribute('each', 'ch in chars');
    span.setAttribute('offset', '3');
    span.setAttribute('bind', 'ch');
    container.appendChild(span);
    parent.appendChild(container);
    document.body.appendChild(parent);
    processTree(parent);

    const items = [...container.querySelectorAll('span')];
    expect(items.length).toBe(2);
    expect(items.map(i => i.textContent)).toEqual(['d', 'e']);
  });
});

describe('self-repeating loop: clone structure', () => {
  afterEach(() => {
    document.body.innerHTML = '';
    Object.keys(_stores).forEach((k) => delete _stores[k]);
  });

  test('self-repeating: element is cloned as sibling, preserving tag', () => {
    const parent = document.createElement('div');
    parent.setAttribute('state', '{ items: ["one", "two"] }');
    const container = document.createElement('div');
    const span = document.createElement('span');
    span.setAttribute('foreach', 'item in items');
    span.setAttribute('bind', 'item');
    container.appendChild(span);
    parent.appendChild(container);
    document.body.appendChild(parent);
    processTree(parent);

    // Clones are span elements in the container
    const clones = container.querySelectorAll('span');
    expect(clones.length).toBe(2);
    clones.forEach(child => {
      expect(child.tagName).toBe('SPAN');
    });
    expect(clones[0].textContent).toBe('one');
    expect(clones[1].textContent).toBe('two');
  });

  test('self-repeating with children: children are preserved in clone', () => {
    const parent = document.createElement('div');
    parent.setAttribute('state', '{ items: ["a", "b"] }');
    const container = document.createElement('div');
    const div = document.createElement('div');
    div.setAttribute('foreach', 'item in items');
    div.innerHTML = '<span bind="item"></span><em bind="$index"></em>';
    container.appendChild(div);
    parent.appendChild(container);
    document.body.appendChild(parent);
    processTree(parent);

    // Each clone is a div with span + em children
    const clones = [...container.children].filter(n => n.nodeType === 1);
    expect(clones.length).toBe(2);
    clones.forEach(child => {
      expect(child.tagName).toBe('DIV');
      expect(child.querySelector('span')).not.toBeNull();
      expect(child.querySelector('em')).not.toBeNull();
    });
    expect(clones[0].querySelector('span').textContent).toBe('a');
    expect(clones[0].querySelector('em').textContent).toBe('0');
    expect(clones[1].querySelector('span').textContent).toBe('b');
    expect(clones[1].querySelector('em').textContent).toBe('1');
  });

  test('self-repeating with external template: element tag wraps template content', () => {
    const tpl = document.createElement('template');
    tpl.id = 'single-tpl';
    tpl.innerHTML = '<p bind="item"></p>';
    document.body.appendChild(tpl);

    const parent = document.createElement('div');
    parent.setAttribute('state', "{ items: ['x', 'y'] }");
    const container = document.createElement('div');
    const div = document.createElement('div');
    div.setAttribute('each', 'item in items');
    div.setAttribute('template', 'single-tpl');
    container.appendChild(div);
    parent.appendChild(container);
    document.body.appendChild(parent);
    processTree(parent);

    // Clones are divs wrapping <p> from the template
    const clones = [...container.children].filter(n => n.nodeType === 1);
    expect(clones.length).toBe(2);
    clones.forEach(child => {
      expect(child.tagName).toBe('DIV');
      expect(child.querySelector('p')).not.toBeNull();
    });
    expect(clones[0].querySelector('p').textContent).toBe('x');
    expect(clones[1].querySelector('p').textContent).toBe('y');
  });

  test('self-repeating with external multi-root template: element wraps content', () => {
    const tpl = document.createElement('template');
    tpl.id = 'multi-tpl';
    tpl.innerHTML = '<span bind="item"></span><b bind="$index"></b>';
    document.body.appendChild(tpl);

    const parent = document.createElement('div');
    parent.setAttribute('state', "{ items: ['m', 'n'] }");
    const container = document.createElement('div');
    const div = document.createElement('div');
    div.setAttribute('each', 'item in items');
    div.setAttribute('template', 'multi-tpl');
    container.appendChild(div);
    parent.appendChild(container);
    document.body.appendChild(parent);
    processTree(parent);

    // Clones are divs wrapping template content
    const clones = [...container.children].filter(n => n.nodeType === 1);
    expect(clones.length).toBe(2);
    clones.forEach(child => {
      expect(child.tagName).toBe('DIV');
    });
    expect(clones[0].querySelector('span').textContent).toBe('m');
    expect(clones[0].querySelector('b').textContent).toBe('0');
  });
});

// ═══════════════════════════════════════════════════════════════════════
//  NOJS-114: Sibling else for loop directives
// ═══════════════════════════════════════════════════════════════════════

describe('Sibling else for loop directives (NOJS-114)', () => {
  afterEach(() => {
    document.body.innerHTML = '';
    Object.keys(_stores).forEach((k) => delete _stores[k]);
  });

  // Helper: get managed element clones between comment markers
  function getManagedClones(host) {
    return [...host.childNodes].filter((n) => n.nodeType === 1);
  }

  test('shows else element when array is empty', () => {
    const host = document.createElement('div');
    host.setAttribute('state', '{ items: [] }');
    const el = document.createElement('span');
    el.setAttribute('foreach', 'item in items');
    el.setAttribute('bind', 'item');
    host.appendChild(el);
    const elseEl = document.createElement('div');
    elseEl.setAttribute('else', '');
    elseEl.textContent = 'No items';
    host.appendChild(elseEl);
    document.body.appendChild(host);
    processTree(host);

    // No loop clones rendered
    const clones = getManagedClones(host);
    // The else sibling should be visible (not display:none)
    const siblingElse = clones.find(n => n.textContent.includes('No items'));
    expect(siblingElse).toBeDefined();
    expect(siblingElse.style.display).not.toBe('none');
  });

  test('shows else element when value is null', () => {
    const host = document.createElement('div');
    host.setAttribute('state', '{ items: null }');
    const el = document.createElement('span');
    el.setAttribute('foreach', 'item in items');
    el.setAttribute('bind', 'item');
    host.appendChild(el);
    const elseEl = document.createElement('div');
    elseEl.setAttribute('else', '');
    elseEl.textContent = 'Nothing here';
    host.appendChild(elseEl);
    document.body.appendChild(host);
    processTree(host);

    const siblingElse = [...host.querySelectorAll('div')].find(
      n => n.textContent.includes('Nothing here')
    );
    expect(siblingElse).toBeDefined();
    expect(siblingElse.style.display).not.toBe('none');
  });

  test('shows else element when value is undefined', () => {
    const host = document.createElement('div');
    host.setAttribute('state', '{ }');
    const el = document.createElement('span');
    el.setAttribute('foreach', 'item in items');
    el.setAttribute('bind', 'item');
    host.appendChild(el);
    const elseEl = document.createElement('div');
    elseEl.setAttribute('else', '');
    elseEl.textContent = 'Undefined list';
    host.appendChild(elseEl);
    document.body.appendChild(host);
    processTree(host);

    const siblingElse = [...host.querySelectorAll('div')].find(
      n => n.textContent.includes('Undefined list')
    );
    expect(siblingElse).toBeDefined();
    expect(siblingElse.style.display).not.toBe('none');
  });

  test('hides else element when array has items', () => {
    const host = document.createElement('div');
    host.setAttribute('state', '{ items: ["a", "b"] }');
    const el = document.createElement('span');
    el.setAttribute('foreach', 'item in items');
    el.setAttribute('bind', 'item');
    host.appendChild(el);
    const elseEl = document.createElement('div');
    elseEl.setAttribute('else', '');
    elseEl.textContent = 'No items';
    host.appendChild(elseEl);
    document.body.appendChild(host);
    processTree(host);

    // Loop clones should exist
    const spans = host.querySelectorAll('span');
    expect(spans.length).toBe(2);
    // Else sibling should be hidden
    expect(elseEl.style.display).toBe('none');
  });

  test('toggles else reactively: empty -> populated -> empty', () => {
    const host = document.createElement('div');
    host.setAttribute('state', '{ items: [] }');
    const el = document.createElement('span');
    el.setAttribute('foreach', 'item in items');
    el.setAttribute('bind', 'item');
    host.appendChild(el);
    const elseEl = document.createElement('div');
    elseEl.setAttribute('else', '');
    elseEl.textContent = 'Empty';
    host.appendChild(elseEl);
    document.body.appendChild(host);
    processTree(host);

    // Initially empty — else visible
    expect(elseEl.style.display).not.toBe('none');

    // Add items — else should hide
    const ctx = findContext(host);
    ctx.$set('items', ['x', 'y']);
    expect(elseEl.style.display).toBe('none');
    expect(host.querySelectorAll('span').length).toBe(2);

    // Back to empty — else should show again
    ctx.$set('items', []);
    expect(elseEl.style.display).not.toBe('none');
    expect(host.querySelectorAll('span').length).toBe(0);
  });

  test('works with foreach alias', () => {
    const host = document.createElement('div');
    host.setAttribute('state', '{ items: [] }');
    const el = document.createElement('span');
    el.setAttribute('foreach', 'item in items');
    host.appendChild(el);
    const elseEl = document.createElement('p');
    elseEl.setAttribute('else', '');
    elseEl.textContent = 'Foreach empty';
    host.appendChild(elseEl);
    document.body.appendChild(host);
    processTree(host);

    expect(elseEl.style.display).not.toBe('none');
    expect(elseEl.textContent).toBe('Foreach empty');
  });

  test('works with each alias', () => {
    const host = document.createElement('div');
    host.setAttribute('state', '{ items: [] }');
    const el = document.createElement('span');
    el.setAttribute('each', 'item in items');
    host.appendChild(el);
    const elseEl = document.createElement('p');
    elseEl.setAttribute('else', '');
    elseEl.textContent = 'Each empty';
    host.appendChild(elseEl);
    document.body.appendChild(host);
    processTree(host);

    expect(elseEl.style.display).not.toBe('none');
    expect(elseEl.textContent).toBe('Each empty');
  });

  test('works with for alias', () => {
    const host = document.createElement('div');
    host.setAttribute('state', '{ items: [] }');
    const el = document.createElement('span');
    el.setAttribute('for', 'item in items');
    host.appendChild(el);
    const elseEl = document.createElement('p');
    elseEl.setAttribute('else', '');
    elseEl.textContent = 'For empty';
    host.appendChild(elseEl);
    document.body.appendChild(host);
    processTree(host);

    expect(elseEl.style.display).not.toBe('none');
    expect(elseEl.textContent).toBe('For empty');
  });

  test('does not interfere with if/else (sibling with if is not captured)', () => {
    const host = document.createElement('div');
    host.setAttribute('state', '{ items: ["a"], show: false }');
    // Loop element
    const el = document.createElement('span');
    el.setAttribute('foreach', 'item in items');
    el.setAttribute('bind', 'item');
    host.appendChild(el);
    // Next sibling has both if and else — should NOT be captured as loop else
    const condEl = document.createElement('div');
    condEl.setAttribute('if', 'show');
    condEl.setAttribute('else', '');
    condEl.textContent = 'Conditional';
    host.appendChild(condEl);
    document.body.appendChild(host);
    processTree(host);

    // Loop should render items normally
    const spans = host.querySelectorAll('span');
    expect(spans.length).toBe(1);
    expect(spans[0].textContent).toBe('a');
    // The if/else element is NOT marked as __loopElse
    expect(condEl.__loopElse).toBeFalsy();
  });

  test('companion else="tplId" still works alongside sibling else', () => {
    // Companion else (template-based) is on the loop element itself.
    // Sibling else is a next sibling with else attr.
    // Both should work: companion inserts template content between markers,
    // sibling shows/hides its own element.
    const tpl = document.createElement('template');
    tpl.id = 'companion-else-tpl';
    tpl.innerHTML = '<em>Template empty</em>';
    document.body.appendChild(tpl);

    const host = document.createElement('div');
    host.setAttribute('state', '{ items: [] }');
    const el = document.createElement('span');
    el.setAttribute('foreach', 'item in items');
    el.setAttribute('else', 'companion-else-tpl');
    host.appendChild(el);
    // Sibling else — should also be captured and shown
    const sibElse = document.createElement('div');
    sibElse.setAttribute('else', '');
    sibElse.textContent = 'Sibling empty';
    host.appendChild(sibElse);
    document.body.appendChild(host);
    processTree(host);

    // Companion else template content should be inserted between markers
    const em = host.querySelector('em');
    expect(em).not.toBeNull();
    expect(em.textContent).toBe('Template empty');
    // Sibling else should also be visible
    expect(sibElse.style.display).not.toBe('none');
  });
});

// ═══════════════════════════════════════════════════════════════════════
//  NOJS-125/127: Loop else="#template" pattern + guard in conditionals
// ═══════════════════════════════════════════════════════════════════════

describe('Loop else template pattern (NOJS-125)', () => {
  afterEach(() => {
    document.body.innerHTML = '';
    Object.keys(_stores).forEach((k) => delete _stores[k]);
  });

  test('foreach else="#tpl" shows template when array is empty, toggles to populated and back', () => {
    const tpl = document.createElement('template');
    tpl.id = 'no-items';
    tpl.innerHTML = '<p>No items</p>';
    document.body.appendChild(tpl);

    const host = document.createElement('div');
    host.setAttribute('state', '{ items: [] }');
    const el = document.createElement('span');
    el.setAttribute('foreach', 'item in items');
    el.setAttribute('else', '#no-items');
    el.setAttribute('bind', 'item');
    host.appendChild(el);
    document.body.appendChild(host);
    processTree(host);

    // Empty state: template content should be rendered
    expect(host.querySelector('p')).not.toBeNull();
    expect(host.querySelector('p').textContent).toBe('No items');
    expect(host.querySelectorAll('span').length).toBe(0);

    // Toggle to populated
    const ctx = findContext(host);
    ctx.$set('items', ['a', 'b']);
    const spans = host.querySelectorAll('span');
    expect(spans.length).toBe(2);
    expect(spans[0].textContent).toBe('a');
    expect(spans[1].textContent).toBe('b');
    // Template content gone
    expect(host.querySelector('p')).toBeNull();

    // Toggle back to empty
    ctx.$set('items', []);
    expect(host.querySelector('p')).not.toBeNull();
    expect(host.querySelector('p').textContent).toBe('No items');
    expect(host.querySelectorAll('span').length).toBe(0);
  });

  test('each else="#tpl" shows template when array is empty', () => {
    const tpl = document.createElement('template');
    tpl.id = 'each-empty-tpl';
    tpl.innerHTML = '<p>Each empty</p>';
    document.body.appendChild(tpl);

    const host = document.createElement('div');
    host.setAttribute('state', '{ items: [] }');
    const el = document.createElement('span');
    el.setAttribute('each', 'item in items');
    el.setAttribute('else', '#each-empty-tpl');
    el.setAttribute('bind', 'item');
    host.appendChild(el);
    document.body.appendChild(host);
    processTree(host);

    expect(host.querySelector('p')).not.toBeNull();
    expect(host.querySelector('p').textContent).toBe('Each empty');

    // Populate — template gone
    const ctx = findContext(host);
    ctx.$set('items', ['x']);
    expect(host.querySelectorAll('span').length).toBe(1);
    expect(host.querySelector('p')).toBeNull();
  });

  test('for else="#tpl" shows template when array is empty', () => {
    const tpl = document.createElement('template');
    tpl.id = 'for-empty-tpl';
    tpl.innerHTML = '<p>For empty</p>';
    document.body.appendChild(tpl);

    const host = document.createElement('div');
    host.setAttribute('state', '{ items: [] }');
    const el = document.createElement('span');
    el.setAttribute('for', 'item in items');
    el.setAttribute('else', '#for-empty-tpl');
    el.setAttribute('bind', 'item');
    host.appendChild(el);
    document.body.appendChild(host);
    processTree(host);

    expect(host.querySelector('p')).not.toBeNull();
    expect(host.querySelector('p').textContent).toBe('For empty');

    // Populate — template gone
    const ctx = findContext(host);
    ctx.$set('items', ['y']);
    expect(host.querySelectorAll('span').length).toBe(1);
    expect(host.querySelector('p')).toBeNull();
  });

  test('foreach else="#tpl" does NOT show template when array is null (early return path)', () => {
    // When the list resolves to null/undefined, the loop handler returns
    // early before reaching the elseTpl path. Only _syncElseSibling fires.
    // The elseTpl pattern only activates for empty arrays (list.length === 0).
    const tpl = document.createElement('template');
    tpl.id = 'null-tpl';
    tpl.innerHTML = '<p>Null list</p>';
    document.body.appendChild(tpl);

    const host = document.createElement('div');
    host.setAttribute('state', '{ items: null }');
    const el = document.createElement('span');
    el.setAttribute('foreach', 'item in items');
    el.setAttribute('else', '#null-tpl');
    el.setAttribute('bind', 'item');
    host.appendChild(el);
    document.body.appendChild(host);
    processTree(host);

    // Template is NOT injected — null takes the early return before elseTpl
    expect(host.querySelector('p')).toBeNull();
  });

  test('foreach else="#tpl" does NOT show template when array is undefined (early return path)', () => {
    const tpl = document.createElement('template');
    tpl.id = 'undef-tpl';
    tpl.innerHTML = '<p>Undefined list</p>';
    document.body.appendChild(tpl);

    const host = document.createElement('div');
    host.setAttribute('state', '{ }');
    const el = document.createElement('span');
    el.setAttribute('foreach', 'item in items');
    el.setAttribute('else', '#undef-tpl');
    el.setAttribute('bind', 'item');
    host.appendChild(el);
    document.body.appendChild(host);
    processTree(host);

    // Template is NOT injected — undefined takes the early return before elseTpl
    expect(host.querySelector('p')).toBeNull();
  });

  test('null/undefined arrays show sibling else even with elseTpl on the loop', () => {
    // Combination: elseTpl on loop + sibling else. For null, only sibling fires.
    const tpl = document.createElement('template');
    tpl.id = 'combo-tpl';
    tpl.innerHTML = '<p>Template fallback</p>';
    document.body.appendChild(tpl);

    const host = document.createElement('div');
    host.setAttribute('state', '{ items: null }');
    const el = document.createElement('span');
    el.setAttribute('foreach', 'item in items');
    el.setAttribute('else', '#combo-tpl');
    el.setAttribute('bind', 'item');
    host.appendChild(el);
    const sibElse = document.createElement('div');
    sibElse.setAttribute('else', '');
    sibElse.textContent = 'Sibling empty';
    host.appendChild(sibElse);
    document.body.appendChild(host);
    processTree(host);

    // elseTpl NOT injected (null takes early return)
    expect(host.querySelector('p')).toBeNull();
    // Sibling else IS visible
    expect(sibElse.style.display).not.toBe('none');
    expect(sibElse.textContent).toBe('Sibling empty');
  });

  test('else directive handler does NOT process elements with loop attributes', () => {
    // The guard in conditionals.js should skip elements that have
    // foreach/each/for — even if they also have else="#tpl".
    // Without the guard, the else handler would try to evaluate
    // preceding if/else-if siblings and potentially clobber content.
    const tpl = document.createElement('template');
    tpl.id = 'guard-tpl';
    tpl.innerHTML = '<p>Guard template</p>';
    document.body.appendChild(tpl);

    const host = document.createElement('div');
    host.setAttribute('state', '{ items: ["a", "b"] }');
    const el = document.createElement('span');
    el.setAttribute('foreach', 'item in items');
    el.setAttribute('else', '#guard-tpl');
    el.setAttribute('bind', 'item');
    host.appendChild(el);
    document.body.appendChild(host);
    processTree(host);

    // Items should render normally — the else directive should NOT
    // have interfered by restoring original children or hiding the element.
    const spans = host.querySelectorAll('span');
    expect(spans.length).toBe(2);
    expect(spans[0].textContent).toBe('a');
    expect(spans[1].textContent).toBe('b');
    // No template content should be injected (array is not empty)
    expect(host.querySelector('p')).toBeNull();
  });

  test('else directive handler does NOT process elements with each attribute', () => {
    const tpl = document.createElement('template');
    tpl.id = 'guard-each-tpl';
    tpl.innerHTML = '<p>Each guard</p>';
    document.body.appendChild(tpl);

    const host = document.createElement('div');
    host.setAttribute('state', '{ items: ["x"] }');
    const el = document.createElement('span');
    el.setAttribute('each', 'item in items');
    el.setAttribute('else', '#guard-each-tpl');
    el.setAttribute('bind', 'item');
    host.appendChild(el);
    document.body.appendChild(host);
    processTree(host);

    const spans = host.querySelectorAll('span');
    expect(spans.length).toBe(1);
    expect(spans[0].textContent).toBe('x');
    expect(host.querySelector('p')).toBeNull();
  });

  test('else directive handler does NOT process elements with for attribute', () => {
    const tpl = document.createElement('template');
    tpl.id = 'guard-for-tpl';
    tpl.innerHTML = '<p>For guard</p>';
    document.body.appendChild(tpl);

    const host = document.createElement('div');
    host.setAttribute('state', '{ items: ["z"] }');
    const el = document.createElement('span');
    el.setAttribute('for', 'item in items');
    el.setAttribute('else', '#guard-for-tpl');
    el.setAttribute('bind', 'item');
    host.appendChild(el);
    document.body.appendChild(host);
    processTree(host);

    const spans = host.querySelectorAll('span');
    expect(spans.length).toBe(1);
    expect(spans[0].textContent).toBe('z');
    expect(host.querySelector('p')).toBeNull();
  });

  test('sibling else does NOT support template refs (uses inline content only)', () => {
    // Sibling else shows/hides its own children, it does not perform
    // template lookups from the else attribute value. This test documents
    // the current behavior: the value of else on a sibling is ignored;
    // only inline content is shown.
    const tpl = document.createElement('template');
    tpl.id = 'sibling-ref-tpl';
    tpl.innerHTML = '<em>From template</em>';
    document.body.appendChild(tpl);

    const host = document.createElement('div');
    host.setAttribute('state', '{ items: [] }');
    const el = document.createElement('span');
    el.setAttribute('foreach', 'item in items');
    el.setAttribute('bind', 'item');
    host.appendChild(el);
    // Sibling else with a template ref value — should be ignored
    const elseEl = document.createElement('div');
    elseEl.setAttribute('else', '#sibling-ref-tpl');
    elseEl.textContent = 'Inline fallback';
    host.appendChild(elseEl);
    document.body.appendChild(host);
    processTree(host);

    // Sibling else should be visible with its inline content
    expect(elseEl.style.display).not.toBe('none');
    expect(elseEl.textContent).toBe('Inline fallback');
    // Template content should NOT be injected into the sibling
    expect(elseEl.querySelector('em')).toBeNull();
  });
});

// ═══════════════════════════════════════════════════════════════════════
//  NOJS-76: error-boundary re-entrancy guard
// ═══════════════════════════════════════════════════════════════════════

describe('Error-boundary re-entrancy guard (NOJS-76)', () => {
  afterEach(() => {
    document.body.innerHTML = '';
    Object.keys(_stores).forEach((k) => delete _stores[k]);
  });

  test('does not recurse when fallback template triggers a secondary error', () => {
    const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});

    // Create a fallback template
    const fallbackTpl = document.createElement('template');
    fallbackTpl.id = 'reentrant-fallback';
    fallbackTpl.innerHTML = '<div class="fallback-content">Fallback rendered</div>';
    document.body.appendChild(fallbackTpl);

    const parent = document.createElement('div');
    parent.setAttribute('state', '{}');
    const boundary = document.createElement('div');
    boundary.setAttribute('error-boundary', '#reentrant-fallback');
    boundary.innerHTML = '<p>Normal content</p>';
    parent.appendChild(boundary);
    document.body.appendChild(parent);

    processTree(parent);

    // Simulate re-entrancy: intercept appendChild on the boundary so that
    // when showFallback appends the fallback wrapper, we synchronously
    // fire a window-level error event targeting the boundary. The
    // directive's capture-phase window error handler calls showFallback
    // again — the _handling guard must suppress the recursive call.
    let secondaryFired = false;
    const origAppendChild = Element.prototype.appendChild;
    const patchedAppendChild = function (node) {
      const result = origAppendChild.call(this, node);
      if (this === boundary && !secondaryFired) {
        secondaryFired = true;
        // Dispatch a nojs:error while showFallback is mid-execution
        boundary.dispatchEvent(new CustomEvent('nojs:error', {
          detail: { message: 'Secondary error inside fallback' },
        }));
      }
      return result;
    };
    Element.prototype.appendChild = patchedAppendChild;

    // Dispatch the primary error — triggers showFallback
    boundary.dispatchEvent(new CustomEvent('nojs:error', {
      detail: { message: 'Primary error' },
    }));

    // Restore appendChild
    Element.prototype.appendChild = origAppendChild;

    // The fallback content should be present (primary error was handled)
    expect(boundary.querySelector('.fallback-content')).not.toBeNull();

    // The secondary error must have been dispatched
    expect(secondaryFired).toBe(true);

    // _warn should have been called for the suppressed secondary error
    // _warn() prepends "[No.JS]" as the first arg, so the message is at index 1
    const warnCalls = warnSpy.mock.calls.filter(
      (call) => call[1] && call[1].includes('secondary error inside fallback')
    );
    expect(warnCalls.length).toBe(1);
    expect(warnCalls[0][2]).toBe('Secondary error inside fallback');

    warnSpy.mockRestore();
  });
});
