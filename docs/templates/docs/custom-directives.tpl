<!-- Custom Directives — from custom-directives.md -->

<div class="doc-content">

  <!-- NoJS.directive() -->
  <div class="doc-section">
    <h2 class="doc-title" id="custom-directives-directive" t="docs.customDirectives.directive.title"></h2>
    <div class="code-block"><pre highlight>&lt;script&gt;
  NoJS.directive('tooltip', {
    priority: 25,
    init(el, name, value) {
      const ctx = NoJS.findContext(el);
      const text = NoJS.evaluate(value, ctx);

      const tip = document.createElement('div');
      tip.className = 'tooltip';
      tip.textContent = text;

      el.addEventListener('mouseenter', () =&gt; document.body.appendChild(tip));
      el.addEventListener('mouseleave', () =&gt; tip.remove());
    }
  });

  NoJS.directive('clipboard', {
    priority: 25,
    init(el, name, value) {
      el.addEventListener('click', () =&gt; {
        const ctx = NoJS.findContext(el);
        const text = NoJS.evaluate(value, ctx);
        navigator.clipboard.writeText(text);
      });
    }
  });

  NoJS.directive('lazy-src', {
    priority: 25,
    init(el, name, value) {
      const observer = new IntersectionObserver(([entry]) =&gt; {
        if (entry.isIntersecting) {
          const ctx = NoJS.findContext(el);
          el.src = NoJS.evaluate(value, ctx);
          observer.disconnect();
        }
      });
      observer.observe(el);
    }
  });
&lt;/script&gt;</pre></div>
  </div>

  <!-- Usage -->
  <div class="doc-section">
    <h2 class="doc-title" id="custom-directives-usage" t="docs.customDirectives.usage.title"></h2>
    <div class="code-block"><pre><span class="hl-tag">&lt;button</span> <span class="hl-attr">tooltip</span>=<span class="hl-str">"'Click to copy'"</span> <span class="hl-attr">clipboard</span>=<span class="hl-str">"user.email"</span><span class="hl-tag">&gt;</span>📋 Copy Email<span class="hl-tag">&lt;/button&gt;</span>
<span class="hl-tag">&lt;img</span> <span class="hl-attr">lazy-src</span>=<span class="hl-str">"user.avatarUrl"</span> <span class="hl-attr">alt</span>=<span class="hl-str">"avatar"</span> <span class="hl-tag">/&gt;</span></pre></div>
  </div>

  <!-- Priority -->
  <div class="doc-section">
    <h2 class="doc-title" id="custom-directives-priority" t="docs.customDirectives.priority.title"></h2>
    <p class="doc-text" t="docs.customDirectives.priority.text"></p>
    <table class="doc-table">
      <thead><tr><th t="docs.customDirectives.priority.col1"></th><th t="docs.customDirectives.priority.col2"></th></tr></thead>
      <tbody>
        <tr><td><code>0</code></td><td t="docs.customDirectives.priority.range0"></td></tr>
        <tr><td><code>1</code></td><td t="docs.customDirectives.priority.range1"></td></tr>
        <tr><td><code>10</code></td><td t="docs.customDirectives.priority.range10"></td></tr>
        <tr><td><code>20</code></td><td t="docs.customDirectives.priority.range20"></td></tr>
        <tr><td><code>30+</code></td><td t="docs.customDirectives.priority.range30"></td></tr>
      </tbody>
    </table>
  </div>

  <!-- Disposal -->
  <div class="doc-section">
    <h2 class="doc-title" id="custom-directives-disposal" t="docs.customDirectives.disposal.title"></h2>
    <p class="doc-text" t="docs.customDirectives.disposal.text"></p>
    <div class="code-block"><pre highlight>NoJS.directive('tooltip', {
  priority: 20,
  init(el, attr, value) {
    const handler = () => showTooltip(el, value);
    el.addEventListener('mouseenter', handler);
    _onDispose(() => el.removeEventListener('mouseenter', handler));
  }
});</pre></div>
    <div class="callout">
      <p t="docs.customDirectives.disposal.callout"></p>
    </div>
  </div>

  <!-- Web Components -->
  <div class="doc-section">
    <h2 class="doc-title" id="custom-directives-web-components" t="docs.customDirectives.webComponents.title"></h2>
    <p class="doc-text" t="docs.customDirectives.webComponents.text"></p>
    <div class="code-block"><pre><span class="hl-cmt">&lt;!-- Pass reactive data to web components --&gt;</span>
<span class="hl-tag">&lt;user-avatar</span> <span class="hl-attr">bind-prop-name</span>=<span class="hl-str">"user.name"</span>
             <span class="hl-attr">bind-prop-size</span>=<span class="hl-str">"avatarSize"</span>
             <span class="hl-attr">on:avatar-clicked</span>=<span class="hl-str">"handleClick()"</span><span class="hl-tag">&gt;</span>
<span class="hl-tag">&lt;/user-avatar&gt;</span>

<span class="hl-cmt">&lt;!-- Use No.JS inside shadow DOM --&gt;</span>
<span class="hl-tag">&lt;my-widget&gt;</span>
  <span class="hl-tag">&lt;template</span> <span class="hl-attr">shadowroot</span>=<span class="hl-str">"open"</span><span class="hl-tag">&gt;</span>
    <span class="hl-tag">&lt;div</span> <span class="hl-attr">state</span>=<span class="hl-str">"{ count: 0 }"</span><span class="hl-tag">&gt;</span>
      <span class="hl-tag">&lt;button</span> <span class="hl-attr">on:click</span>=<span class="hl-str">"count++"</span><span class="hl-tag">&gt;</span>+<span class="hl-tag">&lt;/button&gt;</span>
      <span class="hl-tag">&lt;span</span> <span class="hl-attr">bind</span>=<span class="hl-str">"count"</span><span class="hl-tag">&gt;&lt;/span&gt;</span>
    <span class="hl-tag">&lt;/div&gt;</span>
  <span class="hl-tag">&lt;/template&gt;</span>
<span class="hl-tag">&lt;/my-widget&gt;</span></pre></div>
  </div>

  <!-- Component-like Patterns -->
  <div class="doc-section">
    <h2 class="doc-title" id="custom-directives-component-patterns" t="docs.customDirectives.componentPatterns.title"></h2>
    <div class="code-block"><pre><span class="hl-cmt">&lt;!-- Define a reusable "component" --&gt;</span>
<span class="hl-tag">&lt;template</span> <span class="hl-attr">id</span>=<span class="hl-str">"counter-component"</span> <span class="hl-attr">var</span>=<span class="hl-str">"config"</span><span class="hl-tag">&gt;</span>
  <span class="hl-tag">&lt;div</span> <span class="hl-attr">state</span>=<span class="hl-str">"{ count: config.initial || 0 }"</span><span class="hl-tag">&gt;</span>
    <span class="hl-tag">&lt;span</span> <span class="hl-attr">bind</span>=<span class="hl-str">"config.label + ': '"</span><span class="hl-tag">&gt;&lt;/span&gt;</span>
    <span class="hl-tag">&lt;button</span> <span class="hl-attr">on:click</span>=<span class="hl-str">"count--"</span><span class="hl-tag">&gt;</span>−<span class="hl-tag">&lt;/button&gt;</span>
    <span class="hl-tag">&lt;span</span> <span class="hl-attr">bind</span>=<span class="hl-str">"count"</span><span class="hl-tag">&gt;&lt;/span&gt;</span>
    <span class="hl-tag">&lt;button</span> <span class="hl-attr">on:click</span>=<span class="hl-str">"count++"</span><span class="hl-tag">&gt;</span>+<span class="hl-tag">&lt;/button&gt;</span>
  <span class="hl-tag">&lt;/div&gt;</span>
<span class="hl-tag">&lt;/template&gt;</span>

<span class="hl-cmt">&lt;!-- Use it multiple times --&gt;</span>
<span class="hl-tag">&lt;div</span> <span class="hl-attr">use</span>=<span class="hl-str">"counter-component"</span> <span class="hl-attr">var-config</span>=<span class="hl-str">"{ label: 'Apples', initial: 5 }"</span><span class="hl-tag">&gt;&lt;/div&gt;</span>
<span class="hl-tag">&lt;div</span> <span class="hl-attr">use</span>=<span class="hl-str">"counter-component"</span> <span class="hl-attr">var-config</span>=<span class="hl-str">"{ label: 'Oranges', initial: 3 }"</span><span class="hl-tag">&gt;&lt;/div&gt;</span></pre></div>
  </div>

</div>