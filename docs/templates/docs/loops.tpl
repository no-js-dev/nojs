<!-- Loops — Iteration Directives -->

<section class="hero-section">
  <span class="badge" t="docs.loops.hero.badge"></span>
  <h1 class="hero-title" t="docs.loops.hero.title"></h1>
  <p class="hero-subtitle" t="docs.loops.hero.subtitle"></p>
</section>

<div class="doc-content">

  <!-- foreach — primary -->
  <div class="doc-section">
    <h2 class="doc-title" id="loops-foreach" t="docs.loops.foreach.title"></h2>
    <p class="doc-text" t="docs.loops.foreach.text"></p>
    <div class="demo-split">
      <div class="demo-code"><pre><span class="hl-tag">&lt;div</span> <span class="hl-attr">get</span>=<span class="hl-str">"/posts"</span> <span class="hl-attr">as</span>=<span class="hl-str">"posts"</span><span class="hl-tag">&gt;</span>
  <span class="hl-tag">&lt;article</span> <span class="hl-attr">foreach</span>=<span class="hl-str">"post in posts"</span><span class="hl-tag">&gt;</span>
    <span class="hl-tag">&lt;h2</span> <span class="hl-attr">bind</span>=<span class="hl-str">"post.title"</span><span class="hl-tag">&gt;&lt;/h2&gt;</span>
    <span class="hl-tag">&lt;span</span> <span class="hl-attr">bind</span>=<span class="hl-str">"'#' + $index"</span><span class="hl-tag">&gt;&lt;/span&gt;</span>
  <span class="hl-tag">&lt;/article&gt;</span>
<span class="hl-tag">&lt;/div&gt;</span></pre></div>
      <div class="demo-preview" state="{ fruits: ['Apple', 'Banana', 'Cherry', 'Date'] }">
        <div class="demo-result-label" t="docs.loops.foreach.preview"></div>
        <div class="item-row" foreach="fruit in fruits">
          <span class="item-index" bind="$index + 1"></span>
          <span class="item-name" bind="fruit"></span>
        </div>
      </div>
    </div>
  </div>

  <!-- full example with all attributes -->
  <div class="doc-section">
    <h2 class="doc-title" id="loops-full-example" t="docs.loops.fullExample.title"></h2>
    <p class="doc-text" t="docs.loops.fullExample.text"></p>
    <div class="code-block"><pre><span class="hl-tag">&lt;ul&gt;</span>
  <span class="hl-tag">&lt;li</span> <span class="hl-attr">foreach</span>=<span class="hl-str">"item in menuItems"</span>
      <span class="hl-attr">index</span>=<span class="hl-str">"idx"</span>
      <span class="hl-attr">key</span>=<span class="hl-str">"item.id"</span>
      <span class="hl-attr">else</span>=<span class="hl-str">"noMenuItems"</span>
      <span class="hl-attr">filter</span>=<span class="hl-str">"item.active"</span>
      <span class="hl-attr">sort</span>=<span class="hl-str">"order"</span>
      <span class="hl-attr">limit</span>=<span class="hl-str">"10"</span><span class="hl-tag">&gt;</span>
    <span class="hl-tag">&lt;a</span> <span class="hl-attr">bind-href</span>=<span class="hl-str">"item.link"</span><span class="hl-tag">&gt;</span>
      <span class="hl-tag">&lt;span</span> <span class="hl-attr">bind</span>=<span class="hl-str">"item.label"</span><span class="hl-tag">&gt;&lt;/span&gt;</span>
    <span class="hl-tag">&lt;/a&gt;</span>
  <span class="hl-tag">&lt;/li&gt;</span>
<span class="hl-tag">&lt;/ul&gt;</span>
<span class="hl-tag">&lt;template</span> <span class="hl-attr">id</span>=<span class="hl-str">"noMenuItems"</span><span class="hl-tag">&gt;</span>
  <span class="hl-tag">&lt;li</span> <span class="hl-attr">class</span>=<span class="hl-str">"empty"</span><span class="hl-tag">&gt;</span>No items available<span class="hl-tag">&lt;/li&gt;</span>
<span class="hl-tag">&lt;/template&gt;</span></pre></div>

    <table class="doc-table">
      <thead>
        <tr><th t="docs.loops.foreach.col1"></th><th t="docs.loops.foreach.col2"></th></tr>
      </thead>
      <tbody>
        <tr><td><code>foreach</code> / <code>each</code> / <code>for</code></td><td t="docs.loops.foreach.foreach"></td></tr>
        <tr><td><code>template</code></td><td t="docs.loops.foreach.template"></td></tr>
        <tr><td><code>index</code></td><td t="docs.loops.foreach.index"></td></tr>
        <tr><td><code>key</code></td><td t="docs.loops.foreach.key"></td></tr>
        <tr><td><code>else</code></td><td t="docs.loops.foreach.elseTpl"></td></tr>
        <tr><td><code>filter</code></td><td t="docs.loops.foreach.filter"></td></tr>
        <tr><td><code>sort</code></td><td t="docs.loops.foreach.sort"></td></tr>
        <tr><td><code>limit</code></td><td t="docs.loops.foreach.limit"></td></tr>
        <tr><td><code>offset</code></td><td t="docs.loops.foreach.offset"></td></tr>
        <tr class="deprecated-row"><td><code>from</code></td><td t="docs.loops.foreach.from"></td></tr>
      </tbody>
    </table>
  </div>

  <!-- self-repeating pattern -->
  <div class="doc-section">
    <h2 class="doc-title" t="docs.loops.inline.title"></h2>
    <p class="doc-text" t="docs.loops.inline.text"></p>
    <div class="code-block"><pre><span class="hl-tag">&lt;ul&gt;</span>
  <span class="hl-tag">&lt;li</span> <span class="hl-attr">foreach</span>=<span class="hl-str">"user in users"</span>
      <span class="hl-attr">else</span>=<span class="hl-str">"noUsers"</span>
      <span class="hl-attr">bind</span>=<span class="hl-str">"user.name"</span><span class="hl-tag">&gt;&lt;/li&gt;</span>
<span class="hl-tag">&lt;/ul&gt;</span>
<span class="hl-tag">&lt;template</span> <span class="hl-attr">id</span>=<span class="hl-str">"noUsers"</span><span class="hl-tag">&gt;</span>
  <span class="hl-tag">&lt;li&gt;</span>No users found<span class="hl-tag">&lt;/li&gt;</span>
<span class="hl-tag">&lt;/template&gt;</span></pre></div>
  </div>

  <!-- else template reference -->
  <div class="doc-section">
    <h2 class="doc-title" t="docs.loops.elseTpl.title"></h2>
    <p class="doc-text" t="docs.loops.elseTpl.text"></p>
    <div class="code-block"><pre><span class="hl-tag">&lt;article</span> <span class="hl-attr">foreach</span>=<span class="hl-str">"item in items"</span> <span class="hl-attr">else</span>=<span class="hl-str">"no-items"</span><span class="hl-tag">&gt;</span>
  <span class="hl-tag">&lt;h2</span> <span class="hl-attr">bind</span>=<span class="hl-str">"item.title"</span><span class="hl-tag">&gt;&lt;/h2&gt;</span>
<span class="hl-tag">&lt;/article&gt;</span>

<span class="hl-tag">&lt;template</span> <span class="hl-attr">id</span>=<span class="hl-str">"no-items"</span><span class="hl-tag">&gt;</span>
  <span class="hl-tag">&lt;p&gt;</span>No items found.<span class="hl-tag">&lt;/p&gt;</span>
<span class="hl-tag">&lt;/template&gt;</span></pre></div>
    <div class="callout">
      <p t="docs.loops.elseTpl.callout"></p>
    </div>
    <div class="callout callout-warning">
      <p t="docs.loops.elseTpl.breaking"></p>
    </div>
  </div>

  <!-- aliases -->
  <div class="doc-section">
    <h2 class="doc-title" t="docs.loops.aliases.title"></h2>
    <p class="doc-text" t="docs.loops.aliases.text"></p>
    <div class="code-block"><pre><span class="hl-cmt">&lt;!-- All three are identical: --&gt;</span>
<span class="hl-tag">&lt;div</span> <span class="hl-attr">foreach</span>=<span class="hl-str">"item in items"</span> <span class="hl-attr">bind</span>=<span class="hl-str">"item.name"</span><span class="hl-tag">&gt;&lt;/div&gt;</span>
<span class="hl-tag">&lt;div</span> <span class="hl-attr">each</span>=<span class="hl-str">"item in items"</span> <span class="hl-attr">bind</span>=<span class="hl-str">"item.name"</span><span class="hl-tag">&gt;&lt;/div&gt;</span>
<span class="hl-tag">&lt;div</span> <span class="hl-attr">for</span>=<span class="hl-str">"item in items"</span> <span class="hl-attr">bind</span>=<span class="hl-str">"item.name"</span><span class="hl-tag">&gt;&lt;/div&gt;</span></pre></div>
  </div>

  <!-- deprecated from -->
  <div class="doc-section deprecated-section">
    <h2 class="doc-title" t="docs.loops.deprecated.title"></h2>
    <p class="doc-text" t="docs.loops.deprecated.text"></p>
    <div class="code-block"><pre><span class="hl-cmt">&lt;!-- DEPRECATED — still works, emits console warning --&gt;</span>
<span class="hl-tag">&lt;div</span> <span class="hl-attr">foreach</span>=<span class="hl-str">"item"</span> <span class="hl-attr">from</span>=<span class="hl-str">"items"</span> <span class="hl-attr">bind</span>=<span class="hl-str">"item.name"</span><span class="hl-tag">&gt;&lt;/div&gt;</span>

<span class="hl-cmt">&lt;!-- Use this instead: --&gt;</span>
<span class="hl-tag">&lt;div</span> <span class="hl-attr">foreach</span>=<span class="hl-str">"item in items"</span> <span class="hl-attr">bind</span>=<span class="hl-str">"item.name"</span><span class="hl-tag">&gt;&lt;/div&gt;</span></pre></div>
  </div>

  <!-- loop context variables -->
  <div class="doc-section">
    <h2 class="doc-title" id="loops-context-vars" t="docs.loops.contextVars.title"></h2>
    <table class="doc-table">
      <thead>
        <tr><th t="docs.loops.contextVars.col1"></th><th t="docs.loops.contextVars.col2"></th></tr>
      </thead>
      <tbody>
        <tr><td><code>$index</code></td><td t="docs.loops.contextVars.index"></td></tr>
        <tr><td><code>$count</code></td><td t="docs.loops.contextVars.count"></td></tr>
        <tr><td><code>$first</code></td><td t="docs.loops.contextVars.first"></td></tr>
        <tr><td><code>$last</code></td><td t="docs.loops.contextVars.last"></td></tr>
        <tr><td><code>$even</code></td><td t="docs.loops.contextVars.even"></td></tr>
        <tr><td><code>$odd</code></td><td t="docs.loops.contextVars.odd"></td></tr>
      </tbody>
    </table>
    <div class="code-block"><pre><span class="hl-tag">&lt;div</span> <span class="hl-attr">foreach</span>=<span class="hl-str">"item in items"</span>
     <span class="hl-attr">class-first</span>=<span class="hl-str">"$first"</span>
     <span class="hl-attr">class-last</span>=<span class="hl-str">"$last"</span>
     <span class="hl-attr">class-striped</span>=<span class="hl-str">"$odd"</span><span class="hl-tag">&gt;</span>
  <span class="hl-tag">&lt;span</span> <span class="hl-attr">bind</span>=<span class="hl-str">"$index + 1"</span><span class="hl-tag">&gt;&lt;/span&gt;</span>. <span class="hl-tag">&lt;span</span> <span class="hl-attr">bind</span>=<span class="hl-str">"item.name"</span><span class="hl-tag">&gt;&lt;/span&gt;</span>
<span class="hl-tag">&lt;/div&gt;</span></pre></div>
  </div>

  <!-- nested loops -->
  <div class="doc-section">
    <h2 class="doc-title" id="loops-nested" t="docs.loops.nested.title"></h2>
    <p class="doc-text" t="docs.loops.nested.text"></p>
    <div class="code-block"><pre><span class="hl-tag">&lt;section</span> <span class="hl-attr">foreach</span>=<span class="hl-str">"category in categories"</span><span class="hl-tag">&gt;</span>
  <span class="hl-tag">&lt;h3</span> <span class="hl-attr">bind</span>=<span class="hl-str">"category.name"</span><span class="hl-tag">&gt;&lt;/h3&gt;</span>
  <span class="hl-cmt">&lt;!-- Access both product AND category --&gt;</span>
  <span class="hl-tag">&lt;p</span> <span class="hl-attr">foreach</span>=<span class="hl-str">"product in category.products"</span><span class="hl-tag">&gt;</span>
    <span class="hl-tag">&lt;span</span> <span class="hl-attr">bind</span>=<span class="hl-str">"category.name"</span><span class="hl-tag">&gt;&lt;/span&gt;</span>: <span class="hl-tag">&lt;span</span> <span class="hl-attr">bind</span>=<span class="hl-str">"product.name"</span><span class="hl-tag">&gt;&lt;/span&gt;</span>
  <span class="hl-tag">&lt;/p&gt;</span>
<span class="hl-tag">&lt;/section&gt;</span></pre></div>
  </div>

  <!-- Reactivity -->
  <div class="doc-section">
    <h2 class="doc-title" id="loops-reactivity" t="docs.loops.reactivity.title"></h2>
    <p class="doc-text" t="docs.loops.reactivity.text"></p>
    <div class="code-block"><pre><span class="hl-tag">&lt;div</span> <span class="hl-attr">state</span>=<span class="hl-str">"{ items: ['A', 'B', 'C'] }"</span><span class="hl-tag">&gt;</span>
  <span class="hl-tag">&lt;span</span> <span class="hl-attr">foreach</span>=<span class="hl-str">"item in items"</span> <span class="hl-attr">key</span>=<span class="hl-str">"item"</span>
        <span class="hl-attr">bind</span>=<span class="hl-str">"item"</span><span class="hl-tag">&gt;&lt;/span&gt;</span>
  <span class="hl-tag">&lt;button</span> <span class="hl-attr">on:click</span>=<span class="hl-str">"items.push('D')"</span><span class="hl-tag">&gt;</span>Add<span class="hl-tag">&lt;/button&gt;</span>
<span class="hl-tag">&lt;/div&gt;</span></pre></div>
  </div>

  <!-- Object Iteration -->
  <div class="doc-section">
    <h2 class="doc-title" id="loops-object-iteration" t="docs.loops.objectIteration.title"></h2>
    <p class="doc-text" t="docs.loops.objectIteration.text"></p>
    <div class="code-block"><pre><span class="hl-tag">&lt;div</span> <span class="hl-attr">state</span>=<span class="hl-str">"{ config: { theme: 'dark', lang: 'en' } }"</span><span class="hl-tag">&gt;</span>
  <span class="hl-tag">&lt;span</span> <span class="hl-attr">foreach</span>=<span class="hl-str">"key in config | keys"</span>
        <span class="hl-attr">bind</span>=<span class="hl-str">"key"</span><span class="hl-tag">&gt;&lt;/span&gt;</span>
<span class="hl-tag">&lt;/div&gt;</span></pre></div>
    <div class="callout">
      <p t="docs.loops.objectIteration.callout"></p>
    </div>
  </div>

</div>
