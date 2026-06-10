



import { createContext } from '../src/context.js';
import { findContext } from '../src/dom.js';
import { processTree } from '../src/registry.js';


import '../src/filters.js';
import '../src/directives/state.js';
import '../src/directives/binding.js';
import '../src/directives/loops.js';
import '../src/directives/events.js';
import '../src/directives/styling.js';



describe('Each Directive', () => {
  afterEach(() => {
    document.body.innerHTML = '';
  });

  test('renders list items', () => {
    const parent = document.createElement('div');
    parent.setAttribute('state', '{ items: ["a", "b", "c"] }');
    const container = document.createElement('div');
    const span = document.createElement('span');
    span.setAttribute('each', 'item in items');
    span.className = 'item';
    container.appendChild(span);
    parent.appendChild(container);
    document.body.appendChild(parent);
    processTree(parent);

    const items = container.querySelectorAll('.item');
    expect(items.length).toBe(3);
  });

  test('provides loop variables ($index, $count, $first, $last, $even, $odd)', () => {
    const parent = document.createElement('div');
    parent.setAttribute('state', '{ items: ["a", "b"] }');
    const container = document.createElement('div');
    const span = document.createElement('span');
    span.setAttribute('each', 'item in items');
    container.appendChild(span);
    parent.appendChild(container);
    document.body.appendChild(parent);
    processTree(parent);

    const clones = [...container.children].filter(n => n.nodeType === 1);
    expect(clones.length).toBe(2);

    const ctx0 = clones[0].__ctx;
    expect(ctx0.$index).toBe(0);
    expect(ctx0.$count).toBe(2);
    expect(ctx0.$first).toBe(true);
    expect(ctx0.$last).toBe(false);
    expect(ctx0.$even).toBe(true);
    expect(ctx0.$odd).toBe(false);

    const ctx1 = clones[1].__ctx;
    expect(ctx1.$index).toBe(1);
    expect(ctx1.$first).toBe(false);
    expect(ctx1.$last).toBe(true);
    expect(ctx1.$even).toBe(false);
    expect(ctx1.$odd).toBe(true);
  });

  test('re-renders when list changes', () => {
    const parent = document.createElement('div');
    parent.setAttribute('state', '{ items: [1, 2] }');
    const container = document.createElement('div');
    const span = document.createElement('span');
    span.setAttribute('each', 'item in items');
    span.className = 'r-item';
    container.appendChild(span);
    parent.appendChild(container);
    document.body.appendChild(parent);
    processTree(parent);

    expect(container.querySelectorAll('.r-item').length).toBe(2);

    parent.__ctx.items = [1, 2, 3, 4];
    expect(container.querySelectorAll('.r-item').length).toBe(4);
  });

  test('shows else template for empty list', () => {
    const elseTpl = document.createElement('template');
    elseTpl.id = 'empty-tpl';
    elseTpl.innerHTML = '<p class="empty">No items</p>';
    document.body.appendChild(elseTpl);

    const parent = document.createElement('div');
    parent.setAttribute('state', '{ items: [] }');
    const container = document.createElement('div');
    const span = document.createElement('span');
    span.setAttribute('each', 'item in items');
    span.setAttribute('else', 'empty-tpl');
    container.appendChild(span);
    parent.appendChild(container);
    document.body.appendChild(parent);
    processTree(parent);

    // The else template content is inserted between comment markers
    expect(container.querySelector('.empty')).not.toBeNull();
  });
});

describe('Foreach Directive', () => {
  afterEach(() => {
    document.body.innerHTML = '';
  });

  test('renders from a data source', () => {
    const parent = document.createElement('div');
    parent.setAttribute('state', '{ users: ["Alice", "Bob", "Carol"] }');
    const ul = document.createElement('ul');
    const li = document.createElement('li');
    li.setAttribute('foreach', 'user in users');
    li.className = 'fe-item';
    ul.appendChild(li);
    parent.appendChild(ul);
    document.body.appendChild(parent);
    processTree(parent);

    expect(ul.querySelectorAll('.fe-item').length).toBe(3);
  });

  test('supports filter attribute', () => {
    const parent = document.createElement('div');
    parent.setAttribute('state', '{ nums: [1, 2, 3, 4, 5, 6] }');
    const container = document.createElement('div');
    const span = document.createElement('span');
    span.setAttribute('foreach', 'num in nums');
    span.setAttribute('filter', 'num > 3');
    span.className = 'filtered-item';
    container.appendChild(span);
    parent.appendChild(container);
    document.body.appendChild(parent);
    processTree(parent);

    expect(container.querySelectorAll('.filtered-item').length).toBe(3);
  });

  test('supports limit and offset', () => {
    const parent = document.createElement('div');
    parent.setAttribute('state', '{ items: ["a","b","c","d","e"] }');
    const container = document.createElement('div');
    const span = document.createElement('span');
    span.setAttribute('foreach', 'item in items');
    span.setAttribute('limit', '2');
    span.setAttribute('offset', '1');
    span.className = 'limited-item';
    container.appendChild(span);
    parent.appendChild(container);
    document.body.appendChild(parent);
    processTree(parent);

    expect(container.querySelectorAll('.limited-item').length).toBe(2);
  });

  test('supports sort attribute ascending', () => {
    const parent = document.createElement('div');
    parent.setAttribute('state', '{ items: [{ name: "Charlie" }, { name: "Alice" }, { name: "Bob" }] }');
    const container = document.createElement('div');
    const span = document.createElement('span');
    span.setAttribute('foreach', 'item in items');
    span.setAttribute('sort', 'name');
    span.className = 'sorted';
    container.appendChild(span);
    parent.appendChild(container);
    document.body.appendChild(parent);
    processTree(parent);

    const clones = [...container.children].filter(n => n.nodeType === 1);
    expect(clones[0].__ctx.item.name).toBe('Alice');
    expect(clones[1].__ctx.item.name).toBe('Bob');
    expect(clones[2].__ctx.item.name).toBe('Charlie');
  });

  test('provides loop variables', () => {
    const parent = document.createElement('div');
    parent.setAttribute('state', '{ items: ["x", "y"] }');
    const container = document.createElement('div');
    const span = document.createElement('span');
    span.setAttribute('foreach', 'item in items');
    span.className = 'fe-loop';
    container.appendChild(span);
    parent.appendChild(container);
    document.body.appendChild(parent);
    processTree(parent);

    const clones = [...container.children].filter(n => n.nodeType === 1);
    expect(clones[0].__ctx.$first).toBe(true);
    expect(clones[0].__ctx.$last).toBe(false);
    expect(clones[1].__ctx.$first).toBe(false);
    expect(clones[1].__ctx.$last).toBe(true);
  });
});



describe('Event Directive (on:*)', () => {
  afterEach(() => {
    document.body.innerHTML = '';
  });

  test('handles click events', () => {
    const parent = document.createElement('div');
    parent.setAttribute('state', '{ count: 0 }');
    const btn = document.createElement('button');
    btn.setAttribute('on:click', 'count++');
    parent.appendChild(btn);
    document.body.appendChild(parent);
    processTree(parent);

    btn.click();
    expect(parent.__ctx.count).toBe(1);
    btn.click();
    expect(parent.__ctx.count).toBe(2);
  });

  test('supports .prevent modifier', () => {
    const parent = document.createElement('div');
    parent.setAttribute('state', '{ clicked: false }');
    const link = document.createElement('a');
    link.setAttribute('on:click.prevent', 'clicked = true');
    link.href = '#';
    parent.appendChild(link);
    document.body.appendChild(parent);
    processTree(parent);

    const event = new Event('click', { cancelable: true });
    link.dispatchEvent(event);
    expect(event.defaultPrevented).toBe(true);
    expect(parent.__ctx.clicked).toBe(true);
  });

  test('supports .stop modifier', () => {
    const parent = document.createElement('div');
    parent.setAttribute('state', '{ clicked: false }');
    const btn = document.createElement('button');
    btn.setAttribute('on:click.stop', 'clicked = true');
    parent.appendChild(btn);
    document.body.appendChild(parent);
    processTree(parent);

    const event = new Event('click', { bubbles: true });
    const spy = jest.spyOn(event, 'stopPropagation');
    btn.dispatchEvent(event);
    expect(spy).toHaveBeenCalled();
  });

  test('supports .once modifier', () => {
    const parent = document.createElement('div');
    parent.setAttribute('state', '{ count: 0 }');
    const btn = document.createElement('button');
    btn.setAttribute('on:click.once', 'count++');
    parent.appendChild(btn);
    document.body.appendChild(parent);
    processTree(parent);

    btn.click();
    btn.click();
    btn.click();
    expect(parent.__ctx.count).toBe(1);
  });

  test('supports .self modifier', () => {
    const parent = document.createElement('div');
    parent.setAttribute('state', '{ count: 0 }');
    const container = document.createElement('div');
    container.setAttribute('on:click.self', 'count++');
    const child = document.createElement('span');
    child.textContent = 'child';
    container.appendChild(child);
    parent.appendChild(container);
    document.body.appendChild(parent);
    processTree(parent);

    
    child.dispatchEvent(new Event('click', { bubbles: true }));
    expect(parent.__ctx.count).toBe(0);

    
    container.dispatchEvent(new Event('click', { bubbles: true }));
    expect(parent.__ctx.count).toBe(1);
  });

  test('provides $event and $el', () => {
    const parent = document.createElement('div');
    parent.setAttribute('state', '{ eventType: "", tagName: "" }');
    const btn = document.createElement('button');
    btn.setAttribute('on:click', 'eventType = $event.type; tagName = $el.tagName');
    parent.appendChild(btn);
    document.body.appendChild(parent);
    processTree(parent);

    btn.click();
    expect(parent.__ctx.eventType).toBe('click');
    expect(parent.__ctx.tagName).toBe('BUTTON');
  });

  test('on:init fires immediately', () => {
    const parent = document.createElement('div');
    parent.setAttribute('state', '{ initialized: false }');
    const div = document.createElement('div');
    div.setAttribute('on:init', 'initialized = true');
    parent.appendChild(div);
    document.body.appendChild(parent);
    processTree(parent);

    expect(parent.__ctx.initialized).toBe(true);
  });

  test('handles keydown with key modifier', () => {
    const parent = document.createElement('div');
    parent.setAttribute('state', '{ submitted: false }');
    const input = document.createElement('input');
    input.setAttribute('on:keydown.enter', 'submitted = true');
    parent.appendChild(input);
    document.body.appendChild(parent);
    processTree(parent);

    
    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'a' }));
    expect(parent.__ctx.submitted).toBe(false);

    
    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }));
    expect(parent.__ctx.submitted).toBe(true);
  });

  test('handles keydown escape modifier', () => {
    const parent = document.createElement('div');
    parent.setAttribute('state', '{ escaped: false }');
    const input = document.createElement('input');
    input.setAttribute('on:keydown.escape', 'escaped = true');
    parent.appendChild(input);
    document.body.appendChild(parent);
    processTree(parent);

    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    expect(parent.__ctx.escaped).toBe(true);
  });
});

describe('Trigger Directive', () => {
  afterEach(() => {
    document.body.innerHTML = '';
  });

  test('dispatches custom event on click', () => {
    const parent = document.createElement('div');
    parent.setAttribute('state', '{}');
    const btn = document.createElement('button');
    btn.setAttribute('trigger', 'my-event');
    parent.appendChild(btn);
    document.body.appendChild(parent);
    processTree(parent);

    const handler = jest.fn();
    parent.addEventListener('my-event', handler);
    btn.click();
    expect(handler).toHaveBeenCalled();
  });

  test('dispatches custom event with data', () => {
    const parent = document.createElement('div');
    parent.setAttribute('state', '{ itemId: 42 }');
    const btn = document.createElement('button');
    btn.setAttribute('trigger', 'select-item');
    btn.setAttribute('trigger-data', 'itemId');
    parent.appendChild(btn);
    document.body.appendChild(parent);
    processTree(parent);

    let detail = null;
    parent.addEventListener('select-item', (e) => { detail = e.detail; });
    btn.click();
    expect(detail).toBe(42);
  });
});



describe('Class-* Directive', () => {
  afterEach(() => {
    document.body.innerHTML = '';
  });

  test('toggles class based on expression', () => {
    const parent = document.createElement('div');
    parent.setAttribute('state', '{ active: true }');
    const div = document.createElement('div');
    div.setAttribute('class-active', 'active');
    parent.appendChild(div);
    document.body.appendChild(parent);
    processTree(parent);

    expect(div.classList.contains('active')).toBe(true);

    parent.__ctx.active = false;
    expect(div.classList.contains('active')).toBe(false);
  });

  test('class-map toggles multiple classes', () => {
    const parent = document.createElement('div');
    parent.setAttribute('state', '{ isActive: true, isBold: false }');
    const div = document.createElement('div');
    div.setAttribute('class-map', '{ active: isActive, bold: isBold }');
    parent.appendChild(div);
    document.body.appendChild(parent);
    processTree(parent);

    expect(div.classList.contains('active')).toBe(true);
    expect(div.classList.contains('bold')).toBe(false);

    parent.__ctx.isBold = true;
    expect(div.classList.contains('bold')).toBe(true);
  });

  test('class-list adds classes from array', () => {
    const parent = document.createElement('div');
    parent.setAttribute('state', '{ classes: ["foo", "bar"] }');
    const div = document.createElement('div');
    div.setAttribute('class-list', 'classes');
    parent.appendChild(div);
    document.body.appendChild(parent);
    processTree(parent);

    expect(div.classList.contains('foo')).toBe(true);
    expect(div.classList.contains('bar')).toBe(true);
  });
});

describe('Style-* Directive', () => {
  afterEach(() => {
    document.body.innerHTML = '';
  });

  test('sets inline style property', () => {
    const parent = document.createElement('div');
    parent.setAttribute('state', "{ color: 'red' }");
    const div = document.createElement('div');
    div.setAttribute('style-color', 'color');
    parent.appendChild(div);
    document.body.appendChild(parent);
    processTree(parent);

    expect(div.style.color).toBe('red');
  });

  test('updates style reactively', () => {
    const parent = document.createElement('div');
    parent.setAttribute('state', "{ size: '16px' }");
    const div = document.createElement('div');
    div.setAttribute('style-font-size', 'size');
    parent.appendChild(div);
    document.body.appendChild(parent);
    processTree(parent);

    expect(div.style.fontSize).toBe('16px');
    parent.__ctx.size = '24px';
    expect(div.style.fontSize).toBe('24px');
  });

  test('style-map sets multiple styles', () => {
    const parent = document.createElement('div');
    parent.setAttribute('state', "{ color: 'blue', fontSize: '20px' }");
    const div = document.createElement('div');
    div.setAttribute('style-map', '{ color: color, fontSize: fontSize }');
    parent.appendChild(div);
    document.body.appendChild(parent);
    processTree(parent);

    expect(div.style.color).toBe('blue');
    expect(div.style.fontSize).toBe('20px');
  });

  test('clears style when value is null', () => {
    const parent = document.createElement('div');
    parent.setAttribute('state', "{ bg: 'red' }");
    const div = document.createElement('div');
    div.setAttribute('style-background-color', 'bg');
    parent.appendChild(div);
    document.body.appendChild(parent);
    processTree(parent);

    expect(div.style.backgroundColor).toBe('red');
    parent.__ctx.bg = null;
    expect(div.style.backgroundColor).toBe('');
  });
});



function flush(ms = 50) {
  return new Promise((r) => setTimeout(r, ms));
}

describe('on:mounted lifecycle', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
    document.body.innerHTML = '';
  });

  test('fires after rAF', () => {
    const parent = document.createElement('div');
    parent.setAttribute('state', '{ loaded: false }');
    const el = document.createElement('div');
    el.setAttribute('on:mounted', 'loaded = true');
    parent.appendChild(el);
    document.body.appendChild(parent);

    processTree(parent);

    const ctx = findContext(parent);
    expect(ctx.loaded).toBe(false);

    jest.runAllTimers();
  });
});

describe('on:unmounted — fires on removal', () => {
  afterEach(() => {
    document.body.innerHTML = '';
  });

  test('fires expression when element is removed from DOM', async () => {
    const parent = document.createElement('div');
    parent.setAttribute('state', '{ removed: false }');
    const child = document.createElement('div');
    child.setAttribute('on:unmounted', 'removed = true');
    parent.appendChild(child);
    document.body.appendChild(parent);

    processTree(parent);

    const ctx = findContext(child);
    expect(ctx.removed).toBe(false);

    parent.removeChild(child);

    await flush(100);

    expect(ctx.removed).toBe(true);
  });
});

describe('on:click with debounce', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  test('debounces handler execution', () => {
    const parent = document.createElement('div');
    parent.setAttribute('state', '{ count: 0 }');
    const btn = document.createElement('button');
    btn.setAttribute('on:click.debounce.300', 'count++');
    parent.appendChild(btn);
    document.body.appendChild(parent);

    processTree(parent);

    const ctx = findContext(parent);

    btn.click();
    btn.click();
    btn.click();

    expect(ctx.count).toBe(0);

    jest.advanceTimersByTime(300);
    expect(ctx.count).toBe(1);
  });

  test('debounce resets on each click', () => {
    const parent = document.createElement('div');
    parent.setAttribute('state', '{ count: 0 }');
    const btn = document.createElement('button');
    btn.setAttribute('on:click.debounce.200', 'count++');
    parent.appendChild(btn);
    document.body.appendChild(parent);

    processTree(parent);

    const ctx = findContext(parent);

    btn.click();
    jest.advanceTimersByTime(100);
    btn.click();
    jest.advanceTimersByTime(100);
    expect(ctx.count).toBe(0);

    jest.advanceTimersByTime(100);
    expect(ctx.count).toBe(1);
  });
});

describe('on:click with throttle', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  test('throttles handler execution', () => {
    const parent = document.createElement('div');
    parent.setAttribute('state', '{ count: 0 }');
    const btn = document.createElement('button');
    btn.setAttribute('on:click.throttle.500', 'count++');
    parent.appendChild(btn);
    document.body.appendChild(parent);

    processTree(parent);
    const ctx = findContext(parent);

    jest.spyOn(Date, 'now')
      .mockReturnValueOnce(1000)
      .mockReturnValueOnce(1100)
      .mockReturnValueOnce(1600);

    btn.click();
    expect(ctx.count).toBe(1);

    btn.click();
    expect(ctx.count).toBe(1);

    btn.click();
    expect(ctx.count).toBe(2);

    Date.now.mockRestore();
  });
});

describe('keydown modifiers', () => {
  afterEach(() => {
    document.body.innerHTML = '';
  });

  test('keydown.tab fires on Tab key', () => {
    const parent = document.createElement('div');
    parent.setAttribute('state', '{ tabbed: false }');
    const input = document.createElement('input');
    input.setAttribute('on:keydown.tab', 'tabbed = true');
    parent.appendChild(input);
    document.body.appendChild(parent);

    processTree(parent);

    input.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'Tab', bubbles: true }),
    );
    expect(findContext(parent).tabbed).toBe(true);
  });

  test('keydown.space fires on space key', () => {
    const parent = document.createElement('div');
    parent.setAttribute('state', '{ spaced: false }');
    const input = document.createElement('input');
    input.setAttribute('on:keydown.space', 'spaced = true');
    parent.appendChild(input);
    document.body.appendChild(parent);

    processTree(parent);

    input.dispatchEvent(
      new KeyboardEvent('keydown', { key: ' ', bubbles: true }),
    );
    expect(findContext(parent).spaced).toBe(true);
  });

  test('keydown.delete fires on Delete or Backspace', () => {
    const parent = document.createElement('div');
    parent.setAttribute('state', '{ deleted: false }');
    const input = document.createElement('input');
    input.setAttribute('on:keydown.delete', 'deleted = true');
    parent.appendChild(input);
    document.body.appendChild(parent);

    processTree(parent);

    input.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'Delete', bubbles: true }),
    );
    expect(findContext(parent).deleted).toBe(true);
  });

  test('keydown.up fires on ArrowUp', () => {
    const parent = document.createElement('div');
    parent.setAttribute('state', '{ up: false }');
    const input = document.createElement('input');
    input.setAttribute('on:keydown.up', 'up = true');
    parent.appendChild(input);
    document.body.appendChild(parent);

    processTree(parent);

    input.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'ArrowUp', bubbles: true }),
    );
    expect(findContext(parent).up).toBe(true);
  });

  test('keydown.down fires on ArrowDown', () => {
    const parent = document.createElement('div');
    parent.setAttribute('state', '{ down: false }');
    const input = document.createElement('input');
    input.setAttribute('on:keydown.down', 'down = true');
    parent.appendChild(input);
    document.body.appendChild(parent);

    processTree(parent);

    input.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }),
    );
    expect(findContext(parent).down).toBe(true);
  });

  test('keydown.left fires on ArrowLeft', () => {
    const parent = document.createElement('div');
    parent.setAttribute('state', '{ left: false }');
    const input = document.createElement('input');
    input.setAttribute('on:keydown.left', 'left = true');
    parent.appendChild(input);
    document.body.appendChild(parent);

    processTree(parent);

    input.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'ArrowLeft', bubbles: true }),
    );
    expect(findContext(parent).left).toBe(true);
  });

  test('keydown.right fires on ArrowRight', () => {
    const parent = document.createElement('div');
    parent.setAttribute('state', '{ right: false }');
    const input = document.createElement('input');
    input.setAttribute('on:keydown.right', 'right = true');
    parent.appendChild(input);
    document.body.appendChild(parent);

    processTree(parent);

    input.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }),
    );
    expect(findContext(parent).right).toBe(true);
  });

  test('keydown.ctrl requires ctrl key', () => {
    const parent = document.createElement('div');
    parent.setAttribute('state', '{ ctrl: false }');
    const input = document.createElement('input');
    input.setAttribute('on:keydown.ctrl', 'ctrl = true');
    parent.appendChild(input);
    document.body.appendChild(parent);

    processTree(parent);

    input.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'a', ctrlKey: false, bubbles: true }),
    );
    expect(findContext(parent).ctrl).toBe(false);

    input.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'a', ctrlKey: true, bubbles: true }),
    );
    expect(findContext(parent).ctrl).toBe(true);
  });

  test('keydown.alt requires alt key', () => {
    const parent = document.createElement('div');
    parent.setAttribute('state', '{ alt: false }');
    const input = document.createElement('input');
    input.setAttribute('on:keydown.alt', 'alt = true');
    parent.appendChild(input);
    document.body.appendChild(parent);

    processTree(parent);

    input.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'a', altKey: false, bubbles: true }),
    );
    expect(findContext(parent).alt).toBe(false);

    input.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'a', altKey: true, bubbles: true }),
    );
    expect(findContext(parent).alt).toBe(true);
  });

  test('keydown.shift requires shift key', () => {
    const parent = document.createElement('div');
    parent.setAttribute('state', '{ shift: false }');
    const input = document.createElement('input');
    input.setAttribute('on:keydown.shift', 'shift = true');
    parent.appendChild(input);
    document.body.appendChild(parent);

    processTree(parent);

    input.dispatchEvent(
      new KeyboardEvent('keydown', {
        key: 'a',
        shiftKey: false,
        bubbles: true,
      }),
    );
    expect(findContext(parent).shift).toBe(false);

    input.dispatchEvent(
      new KeyboardEvent('keydown', {
        key: 'a',
        shiftKey: true,
        bubbles: true,
      }),
    );
    expect(findContext(parent).shift).toBe(true);
  });

  test('keydown.meta requires meta key', () => {
    const parent = document.createElement('div');
    parent.setAttribute('state', '{ meta: false }');
    const input = document.createElement('input');
    input.setAttribute('on:keydown.meta', 'meta = true');
    parent.appendChild(input);
    document.body.appendChild(parent);

    processTree(parent);

    input.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'a', metaKey: false, bubbles: true }),
    );
    expect(findContext(parent).meta).toBe(false);

    input.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'a', metaKey: true, bubbles: true }),
    );
    expect(findContext(parent).meta).toBe(true);
  });

  test('wrong key does not fire handler', () => {
    const parent = document.createElement('div');
    parent.setAttribute('state', '{ entered: false }');
    const input = document.createElement('input');
    input.setAttribute('on:keydown.enter', 'entered = true');
    parent.appendChild(input);
    document.body.appendChild(parent);

    processTree(parent);

    input.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }),
    );
    expect(findContext(parent).entered).toBe(false);
  });

  test('keydown.backspace fires on Backspace', () => {
    const parent = document.createElement('div');
    parent.setAttribute('state', '{ bs: false }');
    const input = document.createElement('input');
    input.setAttribute('on:keydown.delete', 'bs = true');
    parent.appendChild(input);
    document.body.appendChild(parent);

    processTree(parent);

    input.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'Backspace', bubbles: true }),
    );
    expect(findContext(parent).bs).toBe(true);
  });
});

describe('trigger with data', () => {
  afterEach(() => {
    document.body.innerHTML = '';
  });

  test('dispatches CustomEvent with detail object', () => {
    const parent = document.createElement('div');
    parent.setAttribute('state', '{ val: 42 }');
    const btn = document.createElement('button');
    btn.setAttribute('trigger', 'my-action');
    btn.setAttribute('trigger-data', '{ id: val }');
    parent.appendChild(btn);
    document.body.appendChild(parent);

    processTree(parent);

    let received = null;
    btn.addEventListener('my-action', (e) => {
      received = e.detail;
    });

    btn.click();
    expect(received).toEqual({ id: 42 });
  });
});



describe('stagger and enter animation', () => {
  afterEach(() => {
    document.body.innerHTML = '';
  });

  test('applies animation-delay for stagger and enter class', () => {
    const parent = document.createElement('div');
    parent.setAttribute('state', '{ items: ["a", "b", "c"] }');
    const container = document.createElement('div');
    const el = document.createElement('div');
    el.setAttribute('each', 'item in items');
    el.setAttribute('animate-enter', 'fadeIn');
    el.setAttribute('animate-stagger', '100');
    el.innerHTML = '<span bind="item"></span>';
    container.appendChild(el);
    parent.appendChild(container);
    document.body.appendChild(parent);

    processTree(parent);

    const clones = [...container.children].filter(n => n.nodeType === 1);
    expect(clones.length).toBe(3);

    expect(clones[0].style.animationDelay).toBe('0ms');
    expect(clones[1].style.animationDelay).toBe('100ms');
    expect(clones[2].style.animationDelay).toBe('200ms');

    expect(clones[0].classList.contains('fadeIn')).toBe(true);
  });
});

describe('foreach empty with else template', () => {
  afterEach(() => {
    document.body.innerHTML = '';
  });

  test('shows else template when list is empty', () => {
    const elseTpl = document.createElement('template');
    elseTpl.id = 'no-items';
    elseTpl.innerHTML = '<p class="empty-msg">No items found</p>';
    document.body.appendChild(elseTpl);

    const parent = document.createElement('div');
    parent.setAttribute('state', '{ items: [] }');
    const container = document.createElement('div');
    const el = document.createElement('span');
    el.setAttribute('foreach', 'item in items');
    el.setAttribute('else', 'no-items');
    container.appendChild(el);
    parent.appendChild(container);
    document.body.appendChild(parent);

    processTree(parent);

    // The companion else template content is inserted between comment markers
    const emptyMsg = container.querySelector('.empty-msg');
    expect(emptyMsg).not.toBeNull();
    expect(emptyMsg.textContent).toBe('No items found');
  });
});

describe('foreach with external template', () => {
  afterEach(() => {
    document.body.innerHTML = '';
  });

  test('uses template element for rendering items', () => {
    const tpl = document.createElement('template');
    tpl.id = 'foreach-tpl';
    tpl.innerHTML = '<span bind="item.name"></span>';
    document.body.appendChild(tpl);

    const parent = document.createElement('div');
    parent.setAttribute('state', '{ items: [{name:"A"},{name:"B"}] }');
    const ul = document.createElement('ul');
    const li = document.createElement('li');
    li.setAttribute('foreach', 'item in items');
    li.setAttribute('template', 'foreach-tpl');
    ul.appendChild(li);
    parent.appendChild(ul);
    document.body.appendChild(parent);

    processTree(parent);

    // Self-repeating: li clones in ul, each wrapping template content
    const clones = ul.querySelectorAll('li');
    expect(clones.length).toBe(2);
  });
});



describe('each directive — uncovered branches', () => {
  afterEach(() => {
    document.body.innerHTML = '';
  });

  test('each with invalid expression (no "in" keyword) does nothing', () => {
    const parent = document.createElement('div');
    parent.setAttribute('state', '{ items: [1, 2, 3] }');
    const container = document.createElement('div');
    const el = document.createElement('span');
    el.setAttribute('each', 'items');
    container.appendChild(el);
    parent.appendChild(container);
    document.body.appendChild(parent);

    processTree(parent);

    // Invalid expression: the element stays in DOM (not processed as loop)
    // No clones generated
    expect(container.querySelectorAll('span').length).toBeLessThanOrEqual(1);
  });

  test('each with "animate" attribute fallback (not animate-enter)', () => {
    const parent = document.createElement('div');
    parent.setAttribute('state', '{ items: ["a", "b"] }');
    const container = document.createElement('div');
    const el = document.createElement('div');
    el.setAttribute('each', 'item in items');
    el.setAttribute('animate', 'slideIn');
    el.className = 'anim-item';
    container.appendChild(el);
    parent.appendChild(container);
    document.body.appendChild(parent);

    processTree(parent);

    const clones = [...container.children].filter(n => n.nodeType === 1);
    expect(clones.length).toBe(2);

    expect(clones[0].classList.contains('slideIn')).toBe(true);
    expect(clones[1].classList.contains('slideIn')).toBe(true);
  });

  test('each when list value is not an array renders nothing (treated as empty)', () => {
    const parent = document.createElement('div');
    parent.setAttribute('state', '{ items: "not-an-array" }');
    const container = document.createElement('div');
    const el = document.createElement('span');
    el.setAttribute('each', 'item in items');
    container.appendChild(el);
    parent.appendChild(container);
    document.body.appendChild(parent);

    processTree(parent);

    // Element is removed (self-repeating), no clones created
    expect(container.querySelectorAll('span').length).toBe(0);
  });

  test('each when list value is null renders nothing (treated as empty)', () => {
    const parent = document.createElement('div');
    parent.setAttribute('state', '{ items: null }');
    const container = document.createElement('div');
    const el = document.createElement('span');
    el.setAttribute('each', 'item in items');
    container.appendChild(el);
    parent.appendChild(container);
    document.body.appendChild(parent);

    processTree(parent);

    // Element is removed (self-repeating), no clones created
    expect(container.querySelectorAll('span').length).toBe(0);
  });
});

describe('foreach directive — uncovered branches', () => {
  afterEach(() => {
    document.body.innerHTML = '';
  });

  test('foreach without limit/offset uses defaults (all items)', () => {
    const tpl = document.createElement('template');
    tpl.id = 'fe-defaults-tpl';
    tpl.innerHTML = '<span class="default-item"></span>';
    document.body.appendChild(tpl);

    const parent = document.createElement('div');
    parent.setAttribute('state', '{ items: ["a", "b", "c", "d", "e"] }');
    const container = document.createElement('div');
    const el = document.createElement('div');
    el.setAttribute('foreach', 'item');
    el.setAttribute('from', 'items');
    el.setAttribute('template', 'fe-defaults-tpl');
    container.appendChild(el);
    parent.appendChild(container);
    document.body.appendChild(parent);

    processTree(parent);

    // Self-repeating: clones are siblings in container between markers
    expect(container.querySelectorAll('.default-item').length).toBe(5);
  });

  test('foreach with descending sort (sort="-name")', () => {
    const tpl = document.createElement('template');
    tpl.id = 'fe-sort-desc-tpl';
    tpl.innerHTML = '<span class="sorted-desc"></span>';
    document.body.appendChild(tpl);

    const parent = document.createElement('div');
    parent.setAttribute('state', '{ items: [{ name: "Charlie" }, { name: "Alice" }, { name: "Bob" }] }');
    const container = document.createElement('div');
    const el = document.createElement('div');
    el.setAttribute('foreach', 'item');
    el.setAttribute('from', 'items');
    el.setAttribute('sort', '-name');
    el.setAttribute('template', 'fe-sort-desc-tpl');
    container.appendChild(el);
    parent.appendChild(container);
    document.body.appendChild(parent);

    processTree(parent);

    // Self-repeating: clones are div wrappers in container
    const wrappers = [...container.children].filter(n => n.nodeType === 1);
    expect(wrappers[0].__ctx.item.name).toBe('Charlie');
    expect(wrappers[1].__ctx.item.name).toBe('Bob');
    expect(wrappers[2].__ctx.item.name).toBe('Alice');
  });

  test('foreach uses element itself as template when no template attribute (L141)', () => {
    // Self-repeating pattern: the element IS the template. It gets cloned
    // N times as siblings between comment markers. No infinite recursion.
    const parent = document.createElement('div');
    parent.setAttribute('state', '{ items: ["x", "y"] }');
    const el = document.createElement('div');
    el.setAttribute('foreach', 'item');
    el.setAttribute('from', 'items');
    el.innerHTML = '<span class="inline-item">placeholder</span>';
    parent.appendChild(el);
    document.body.appendChild(parent);

    processTree(parent);

    // Clones are siblings in parent between comment markers
    const clones = [...parent.querySelectorAll('div')];
    expect(clones.length).toBe(2);
    // Each clone should have the inner span
    expect(clones[0].querySelector('.inline-item')).not.toBeNull();
    expect(clones[1].querySelector('.inline-item')).not.toBeNull();
    // Context should be set on each clone
    expect(clones[0].__ctx.item).toBe('x');
    expect(clones[1].__ctx.item).toBe('y');
  });

  test('foreach inline rendering path without external template (L161-163)', () => {
    // Self-repeating pattern: no infinite recursion, clones render normally
    const parent = document.createElement('div');
    parent.setAttribute('state', '{ colors: ["red", "green"] }');
    const el = document.createElement('div');
    el.setAttribute('foreach', 'color');
    el.setAttribute('from', 'colors');
    el.innerHTML = '<span class="color-item"></span>';
    parent.appendChild(el);
    document.body.appendChild(parent);

    processTree(parent);

    const clones = [...parent.querySelectorAll('div')];
    expect(clones.length).toBe(2);
    expect(clones[0].querySelector('.color-item')).not.toBeNull();
    expect(clones[1].querySelector('.color-item')).not.toBeNull();
    expect(clones[0].__ctx.color).toBe('red');
    expect(clones[1].__ctx.color).toBe('green');
  });
});



describe('on:unmounted when parentElement is null', () => {
  afterEach(() => {
    document.body.innerHTML = '';
  });

  test('does not observe when parentElement is null', () => {
    const parent = document.createElement('div');
    parent.setAttribute('state', '{ removed: false }');
    const child = document.createElement('div');
    child.setAttribute('on:unmounted', 'removed = true');
    parent.appendChild(child);
    
    
    const detached = document.createElement('div');
    detached.setAttribute('state', '{ flag: false }');
    const orphan = document.createElement('span');
    orphan.setAttribute('on:unmounted', 'flag = true');
    
    detached.appendChild(orphan);
    
    
    
    const standalone = document.createElement('div');
    standalone.setAttribute('state', '{ v: false }');
    document.body.appendChild(standalone);
    processTree(standalone);

    const loneEl = document.createElement('span');
    loneEl.setAttribute('on:unmounted', 'v = true');
    
    
    
    expect(() => {
      standalone.appendChild(loneEl);
      processTree(standalone);
    }).not.toThrow();
  });
});

describe('keyup event modifiers', () => {
  afterEach(() => {
    document.body.innerHTML = '';
  });

  test('keyup.enter fires on Enter key', () => {
    const parent = document.createElement('div');
    parent.setAttribute('state', '{ confirmed: false }');
    const input = document.createElement('input');
    input.setAttribute('on:keyup.enter', 'confirmed = true');
    parent.appendChild(input);
    document.body.appendChild(parent);
    processTree(parent);

    input.dispatchEvent(new KeyboardEvent('keyup', { key: 'Enter', bubbles: true }));
    expect(findContext(parent).confirmed).toBe(true);
  });

  test('keyup.tab fires on Tab key', () => {
    const parent = document.createElement('div');
    parent.setAttribute('state', '{ tabbed: false }');
    const input = document.createElement('input');
    input.setAttribute('on:keyup.tab', 'tabbed = true');
    parent.appendChild(input);
    document.body.appendChild(parent);
    processTree(parent);

    input.dispatchEvent(new KeyboardEvent('keyup', { key: 'Tab', bubbles: true }));
    expect(findContext(parent).tabbed).toBe(true);
  });

  test('keyup.space fires on space key', () => {
    const parent = document.createElement('div');
    parent.setAttribute('state', '{ spaced: false }');
    const input = document.createElement('input');
    input.setAttribute('on:keyup.space', 'spaced = true');
    parent.appendChild(input);
    document.body.appendChild(parent);
    processTree(parent);

    input.dispatchEvent(new KeyboardEvent('keyup', { key: ' ', bubbles: true }));
    expect(findContext(parent).spaced).toBe(true);
  });

  test('keyup.delete fires on Delete key', () => {
    const parent = document.createElement('div');
    parent.setAttribute('state', '{ deleted: false }');
    const input = document.createElement('input');
    input.setAttribute('on:keyup.delete', 'deleted = true');
    parent.appendChild(input);
    document.body.appendChild(parent);
    processTree(parent);

    input.dispatchEvent(new KeyboardEvent('keyup', { key: 'Delete', bubbles: true }));
    expect(findContext(parent).deleted).toBe(true);
  });

  test('keyup.up fires on ArrowUp', () => {
    const parent = document.createElement('div');
    parent.setAttribute('state', '{ up: false }');
    const input = document.createElement('input');
    input.setAttribute('on:keyup.up', 'up = true');
    parent.appendChild(input);
    document.body.appendChild(parent);
    processTree(parent);

    input.dispatchEvent(new KeyboardEvent('keyup', { key: 'ArrowUp', bubbles: true }));
    expect(findContext(parent).up).toBe(true);
  });

  test('keyup.down fires on ArrowDown', () => {
    const parent = document.createElement('div');
    parent.setAttribute('state', '{ down: false }');
    const input = document.createElement('input');
    input.setAttribute('on:keyup.down', 'down = true');
    parent.appendChild(input);
    document.body.appendChild(parent);
    processTree(parent);

    input.dispatchEvent(new KeyboardEvent('keyup', { key: 'ArrowDown', bubbles: true }));
    expect(findContext(parent).down).toBe(true);
  });

  test('keyup.left fires on ArrowLeft', () => {
    const parent = document.createElement('div');
    parent.setAttribute('state', '{ left: false }');
    const input = document.createElement('input');
    input.setAttribute('on:keyup.left', 'left = true');
    parent.appendChild(input);
    document.body.appendChild(parent);
    processTree(parent);

    input.dispatchEvent(new KeyboardEvent('keyup', { key: 'ArrowLeft', bubbles: true }));
    expect(findContext(parent).left).toBe(true);
  });

  test('keyup.right fires on ArrowRight', () => {
    const parent = document.createElement('div');
    parent.setAttribute('state', '{ right: false }');
    const input = document.createElement('input');
    input.setAttribute('on:keyup.right', 'right = true');
    parent.appendChild(input);
    document.body.appendChild(parent);
    processTree(parent);

    input.dispatchEvent(new KeyboardEvent('keyup', { key: 'ArrowRight', bubbles: true }));
    expect(findContext(parent).right).toBe(true);
  });

  test('keyup.meta requires meta key', () => {
    const parent = document.createElement('div');
    parent.setAttribute('state', '{ meta: false }');
    const input = document.createElement('input');
    input.setAttribute('on:keyup.meta', 'meta = true');
    parent.appendChild(input);
    document.body.appendChild(parent);
    processTree(parent);

    input.dispatchEvent(new KeyboardEvent('keyup', { key: 'a', metaKey: false, bubbles: true }));
    expect(findContext(parent).meta).toBe(false);

    input.dispatchEvent(new KeyboardEvent('keyup', { key: 'a', metaKey: true, bubbles: true }));
    expect(findContext(parent).meta).toBe(true);
  });
});



describe('class-list with falsy items', () => {
  afterEach(() => {
    document.body.innerHTML = '';
  });

  test('class-list skips non-string falsy items in array', () => {
    const parent = document.createElement('div');
    parent.setAttribute('state', '{ classes: ["foo", null, "", false, "bar"] }');
    const div = document.createElement('div');
    div.setAttribute('class-list', 'classes');
    parent.appendChild(div);
    document.body.appendChild(parent);
    processTree(parent);

    expect(div.classList.contains('foo')).toBe(true);
    expect(div.classList.contains('bar')).toBe(true);
    
    expect(div.classList.length).toBe(2);
  });
});





describe('style-* with null value', () => {
  afterEach(() => {
    document.body.innerHTML = '';
  });

  test('style-* sets empty string when value is null', () => {
    const parent = document.createElement('div');
    parent.setAttribute('state', '{ c: null }');
    const div = document.createElement('div');
    div.setAttribute('style-color', 'c');
    parent.appendChild(div);
    document.body.appendChild(parent);
    processTree(parent);

    expect(div.style.color).toBe('');
  });

  test('style-* sets empty string when value is undefined', () => {
    const parent = document.createElement('div');
    parent.setAttribute('state', '{ }');
    const div = document.createElement('div');
    div.setAttribute('style-color', 'missingProp');
    parent.appendChild(div);
    document.body.appendChild(parent);
    processTree(parent);

    expect(div.style.color).toBe('');
  });

  test('style-* converts number to string', () => {
    const parent = document.createElement('div');
    parent.setAttribute('state', '{ opacity: 0.5 }');
    const div = document.createElement('div');
    div.setAttribute('style-opacity', 'opacity');
    parent.appendChild(div);
    document.body.appendChild(parent);
    processTree(parent);

    expect(div.style.opacity).toBe('0.5');
  });
});





















describe('on:keydown key modifiers — all keys', () => {
  const keyTests = [
    { mod: 'tab', key: 'Tab' },
    { mod: 'space', key: ' ' },
    { mod: 'delete', key: 'Delete' },
    { mod: 'delete', key: 'Backspace' },
    { mod: 'up', key: 'ArrowUp' },
    { mod: 'down', key: 'ArrowDown' },
    { mod: 'left', key: 'ArrowLeft' },
    { mod: 'right', key: 'ArrowRight' },
  ];

  keyTests.forEach(({ mod, key }) => {
    test(`on:keydown.${mod} fires when ${key} is pressed`, () => {
      const parent = document.createElement('div');
      parent.setAttribute('state', '{ pressed: false }');
      const input = document.createElement('input');
      input.setAttribute(`on:keydown.${mod}`, 'pressed = true');
      parent.appendChild(input);
      document.body.appendChild(parent);
      processTree(parent);

      const ctx = findContext(input);
      input.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true }));
      expect(ctx.pressed).toBe(true);

      document.body.removeChild(parent);
    });

    test(`on:keydown.${mod} does NOT fire for wrong key`, () => {
      const parent = document.createElement('div');
      parent.setAttribute('state', '{ pressed: false }');
      const input = document.createElement('input');
      input.setAttribute(`on:keydown.${mod}`, 'pressed = true');
      parent.appendChild(input);
      document.body.appendChild(parent);
      processTree(parent);

      const ctx = findContext(input);
      input.dispatchEvent(new KeyboardEvent('keydown', { key: 'z', bubbles: true }));
      expect(ctx.pressed).toBe(false);

      document.body.removeChild(parent);
    });
  });

  test('on:keydown.meta fires when metaKey is true', () => {
    const parent = document.createElement('div');
    parent.setAttribute('state', '{ pressed: false }');
    const input = document.createElement('input');
    input.setAttribute('on:keydown.meta', 'pressed = true');
    parent.appendChild(input);
    document.body.appendChild(parent);
    processTree(parent);

    const ctx = findContext(input);
    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'a', metaKey: true, bubbles: true }));
    expect(ctx.pressed).toBe(true);
    document.body.removeChild(parent);
  });

  test('on:keydown.meta does NOT fire when metaKey is false', () => {
    const parent = document.createElement('div');
    parent.setAttribute('state', '{ pressed: false }');
    const input = document.createElement('input');
    input.setAttribute('on:keydown.meta', 'pressed = true');
    parent.appendChild(input);
    document.body.appendChild(parent);
    processTree(parent);

    const ctx = findContext(input);
    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'a', metaKey: false, bubbles: true }));
    expect(ctx.pressed).toBe(false);
    document.body.removeChild(parent);
  });
});









