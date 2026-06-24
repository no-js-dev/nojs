<!-- Custom Directives — from custom-directives.md -->

<div class="doc-content">

  <!-- NoJS.directive() -->
  <div class="doc-section">
    <h2 class="doc-title" id="custom-directives-directive" t="docs.customDirectives.directive.title"></h2>
    <div class="code-block"><pre><span class="hl-tag">&lt;script&gt;</span>
  <span class="hl-fn">NoJS</span>.<span class="hl-fn">directive</span>(<span class="hl-str">'tooltip'</span>, {
    <span class="hl-attr">priority</span>: <span class="hl-num">25</span>,
    <span class="hl-fn">init</span>(<span class="hl-attr">el</span>, <span class="hl-attr">name</span>, <span class="hl-attr">value</span>) {
      <span class="hl-kw">const</span> ctx <span class="hl-op">=</span> <span class="hl-fn">NoJS</span>.<span class="hl-fn">findContext</span>(el);
      <span class="hl-kw">const</span> text <span class="hl-op">=</span> <span class="hl-fn">NoJS</span>.<span class="hl-fn">evaluate</span>(value, ctx);

      <span class="hl-kw">const</span> tip <span class="hl-op">=</span> document.<span class="hl-fn">createElement</span>(<span class="hl-str">'div'</span>);
      tip.className <span class="hl-op">=</span> <span class="hl-str">'tooltip'</span>;
      tip.textContent <span class="hl-op">=</span> text;

      el.<span class="hl-fn">addEventListener</span>(<span class="hl-str">'mouseenter'</span>, () <span class="hl-op">=&gt;</span> document.body.<span class="hl-fn">appendChild</span>(tip));
      el.<span class="hl-fn">addEventListener</span>(<span class="hl-str">'mouseleave'</span>, () <span class="hl-op">=&gt;</span> tip.<span class="hl-fn">remove</span>());
    }
  });

  <span class="hl-fn">NoJS</span>.<span class="hl-fn">directive</span>(<span class="hl-str">'clipboard'</span>, {
    <span class="hl-attr">priority</span>: <span class="hl-num">25</span>,
    <span class="hl-fn">init</span>(<span class="hl-attr">el</span>, <span class="hl-attr">name</span>, <span class="hl-attr">value</span>) {
      el.<span class="hl-fn">addEventListener</span>(<span class="hl-str">'click'</span>, () <span class="hl-op">=&gt;</span> {
        <span class="hl-kw">const</span> ctx <span class="hl-op">=</span> <span class="hl-fn">NoJS</span>.<span class="hl-fn">findContext</span>(el);
        <span class="hl-kw">const</span> text <span class="hl-op">=</span> <span class="hl-fn">NoJS</span>.<span class="hl-fn">evaluate</span>(value, ctx);
        navigator.clipboard.<span class="hl-fn">writeText</span>(text);
      });
    }
  });

  <span class="hl-fn">NoJS</span>.<span class="hl-fn">directive</span>(<span class="hl-str">'lazy-src'</span>, {
    <span class="hl-attr">priority</span>: <span class="hl-num">25</span>,
    <span class="hl-fn">init</span>(<span class="hl-attr">el</span>, <span class="hl-attr">name</span>, <span class="hl-attr">value</span>) {
      <span class="hl-kw">const</span> observer <span class="hl-op">=</span> <span class="hl-kw">new</span> <span class="hl-fn">IntersectionObserver</span>(([entry]) <span class="hl-op">=&gt;</span> {
        <span class="hl-kw">if</span> (entry.isIntersecting) {
          <span class="hl-kw">const</span> ctx <span class="hl-op">=</span> <span class="hl-fn">NoJS</span>.<span class="hl-fn">findContext</span>(el);
          el.src <span class="hl-op">=</span> <span class="hl-fn">NoJS</span>.<span class="hl-fn">evaluate</span>(value, ctx);
          observer.<span class="hl-fn">disconnect</span>();
        }
      });
      observer.<span class="hl-fn">observe</span>(el);
    }
  });
<span class="hl-tag">&lt;/script&gt;</span></pre></div>
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
    <div class="code-block"><pre><span class="hl-kw">NoJS</span>.directive(<span class="hl-str">'tooltip'</span>, {
  priority: <span class="hl-num">20</span>,
  init(el, attr, value) {
    <span class="hl-kw">const</span> handler = () =&gt; showTooltip(el, value);
    el.addEventListener(<span class="hl-str">'mouseenter'</span>, handler);
    _onDispose(() =&gt; el.removeEventListener(<span class="hl-str">'mouseenter'</span>, handler));
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