<!-- Directive Compatibility — from directive-compatibility.md -->

<div class="doc-content">

  <!-- Intro -->
  <div class="doc-section">
    <h2 class="doc-title" id="directive-compatibility-overview" t="docs.directiveCompatibility.overview.title"></h2>
    <p t="docs.directiveCompatibility.overview.text"></p>
    <div class="callout callout-info">
      <p t="docs.directiveCompatibility.overview.callout"></p>
    </div>
  </div>

  <!-- Compatibility Matrix -->
  <div class="doc-section">
    <h2 class="doc-title" id="compatibility-matrix" t="docs.directiveCompatibility.matrix.title"></h2>

    <h3 id="structural-structural" t="docs.directiveCompatibility.matrix.structuralTitle"></h3>
    <div class="table-wrap">
      <table>
        <thead><tr><th>Combination</th><th>Status</th><th>Notes</th></tr></thead>
        <tbody>
          <tr><td><code>if</code> + <code>each</code>/<code>foreach</code>/<code>for</code></td><td>Use workaround</td><td>Cannot combine on the same element. Wrap the loop in a container with the <code>if</code>.</td></tr>
          <tr><td><code>else-if</code> + <code>each</code>/<code>foreach</code>/<code>for</code></td><td>Use workaround</td><td>Cannot combine on the same element. Wrap the loop in a container with the <code>else-if</code>.</td></tr>
          <tr><td><code>switch</code> + loop on <code>case</code> child</td><td>Use workaround</td><td>Wrap the loop in a container inside the case.</td></tr>
        </tbody>
      </table>
    </div>

    <h3 id="conditional-other" t="docs.directiveCompatibility.matrix.conditionalTitle"></h3>
    <div class="table-wrap">
      <table>
        <thead><tr><th>Combination</th><th>Status</th><th>Notes</th></tr></thead>
        <tbody>
          <tr><td><code>if</code> + <code>bind</code>, <code>model</code>, <code>on:*</code></td><td>Compatible</td><td><code>if</code> gates the entire element.</td></tr>
          <tr><td><code>if</code> + <code>get</code>/<code>post</code>/HTTP</td><td>Defined semantics</td><td>Request only fires when the condition is true.</td></tr>
          <tr><td><code>if</code> + <code>computed</code>/<code>watch</code></td><td>Defined semantics</td><td>Reactive machinery only runs when the condition is true.</td></tr>
          <tr><td><code>if</code> + <code>page-*</code> head directives</td><td>Defined semantics</td><td>SEO metadata only applies when the condition is true.</td></tr>
          <tr><td><code>if</code> + <code>use</code></td><td>Compatible</td><td><code>use</code> runs at priority 9; <code>if</code> correctly gates instantiation.</td></tr>
          <tr><td><code>if</code> + <code>i18n-ns</code></td><td>Compatible</td><td>Namespace loading is correctly handed off across toggles.</td></tr>
          <tr><td><code>show</code>/<code>hide</code> + any</td><td>Compatible</td><td>CSS-only toggle; all directives remain active.</td></tr>
        </tbody>
      </table>
    </div>

    <h3 id="loop-other" t="docs.directiveCompatibility.matrix.loopTitle"></h3>
    <div class="table-wrap">
      <table>
        <thead><tr><th>Combination</th><th>Status</th><th>Notes</th></tr></thead>
        <tbody>
          <tr><td><code>each</code> + <code>bind</code>, <code>model</code>, <code>on:*</code></td><td>Compatible</td><td>Clones inherit the loop item context.</td></tr>
          <tr><td><code>each</code> + <code>computed</code>/<code>watch</code></td><td>Defined semantics</td><td>Each clone gets its own instance.</td></tr>
          <tr><td><code>each</code> + HTTP verbs</td><td>Use workaround</td><td>Fires once per clone. Place HTTP on a parent element.</td></tr>
          <tr><td><code>each</code> + <code>page-*</code></td><td>Defined semantics</td><td>Head directives are stripped from clones.</td></tr>
          <tr><td><code>each</code> + <code>else</code></td><td>Compatible</td><td>Shows fallback template when the collection is empty.</td></tr>
          <tr><td><code>each</code> + <code>ref</code></td><td>Use workaround</td><td>Only the last clone's ref survives.</td></tr>
        </tbody>
      </table>
    </div>

    <h3 id="binding-binding" t="docs.directiveCompatibility.matrix.bindingTitle"></h3>
    <div class="table-wrap">
      <table>
        <thead><tr><th>Combination</th><th>Status</th><th>Notes</th></tr></thead>
        <tbody>
          <tr><td><code>bind</code> + <code>bind-*</code></td><td>Compatible</td><td>Text content and attribute bindings are independent.</td></tr>
          <tr><td><code>bind-value</code> + <code>model</code></td><td>Use workaround</td><td>Both set up two-way pipelines. Use only <code>model</code>.</td></tr>
          <tr><td><code>t</code> + <code>bind</code></td><td>Use workaround</td><td>Both write to <code>textContent</code>. Use <code>t</code> with <code>t-name</code> params instead.</td></tr>
        </tbody>
      </table>
    </div>
  </div>

  <!-- Defined Semantics -->
  <div class="doc-section">
    <h2 class="doc-title" id="defined-semantics" t="docs.directiveCompatibility.semantics.title"></h2>

    <h3 id="if-gates-element" t="docs.directiveCompatibility.semantics.ifGates.title"></h3>
    <p t="docs.directiveCompatibility.semantics.ifGates.text"></p>
    <ul>
      <li t="docs.directiveCompatibility.semantics.ifGates.http"></li>
      <li t="docs.directiveCompatibility.semantics.ifGates.computed"></li>
      <li t="docs.directiveCompatibility.semantics.ifGates.head"></li>
      <li t="docs.directiveCompatibility.semantics.ifGates.binding"></li>
    </ul>
    <div class="code-block"><pre><span class="hl-cmt">&lt;!-- HTTP request only fires when loggedIn is true --&gt;</span>
<span class="hl-tag">&lt;div</span> <span class="hl-attr">if</span>=<span class="hl-str">"loggedIn"</span> <span class="hl-attr">get</span>=<span class="hl-str">"/api/private"</span> <span class="hl-attr">as</span>=<span class="hl-str">"data"</span><span class="hl-tag">&gt;</span>
  <span class="hl-tag">&lt;p</span> <span class="hl-attr">bind</span>=<span class="hl-str">"data.name"</span><span class="hl-tag">&gt;&lt;/p&gt;</span>
<span class="hl-tag">&lt;/div&gt;</span>

<span class="hl-cmt">&lt;!-- Computed only runs when showStats is true --&gt;</span>
<span class="hl-tag">&lt;div</span> <span class="hl-attr">if</span>=<span class="hl-str">"showStats"</span> <span class="hl-attr">computed</span>=<span class="hl-str">"total"</span> <span class="hl-attr">expr</span>=<span class="hl-str">"price * qty"</span><span class="hl-tag">&gt;</span>
  Total: <span class="hl-tag">&lt;span</span> <span class="hl-attr">bind</span>=<span class="hl-str">"total | currency"</span><span class="hl-tag">&gt;&lt;/span&gt;</span>
<span class="hl-tag">&lt;/div&gt;</span></pre></div>

    <h3 id="per-clone-computed" t="docs.directiveCompatibility.semantics.perClone.title"></h3>
    <p t="docs.directiveCompatibility.semantics.perClone.text"></p>
    <div class="code-block"><pre><span class="hl-tag">&lt;div</span> <span class="hl-attr">each</span>=<span class="hl-str">"item in cart"</span> <span class="hl-attr">key</span>=<span class="hl-str">"item.id"</span>
     <span class="hl-attr">computed</span>=<span class="hl-str">"total"</span> <span class="hl-attr">expr</span>=<span class="hl-str">"item.price * item.qty"</span><span class="hl-tag">&gt;</span>
  <span class="hl-tag">&lt;span</span> <span class="hl-attr">bind</span>=<span class="hl-str">"item.name"</span><span class="hl-tag">&gt;&lt;/span&gt;</span>: <span class="hl-tag">&lt;span</span> <span class="hl-attr">bind</span>=<span class="hl-str">"total | currency"</span><span class="hl-tag">&gt;&lt;/span&gt;</span>
<span class="hl-tag">&lt;/div&gt;</span></pre></div>

    <h3 id="use-priority" t="docs.directiveCompatibility.semantics.usePriority.title"></h3>
    <p t="docs.directiveCompatibility.semantics.usePriority.text"></p>

    <h3 id="http-verb-placement" t="docs.directiveCompatibility.semantics.httpPlacement.title"></h3>
    <p t="docs.directiveCompatibility.semantics.httpPlacement.text"></p>
    <div class="code-block"><pre><span class="hl-cmt">&lt;!-- Correct: HTTP on parent, loop on child --&gt;</span>
<span class="hl-tag">&lt;ul</span> <span class="hl-attr">get</span>=<span class="hl-str">"/api/tasks"</span> <span class="hl-attr">as</span>=<span class="hl-str">"tasks"</span><span class="hl-tag">&gt;</span>
  <span class="hl-tag">&lt;li</span> <span class="hl-attr">each</span>=<span class="hl-str">"task in tasks"</span> <span class="hl-attr">key</span>=<span class="hl-str">"task.id"</span> <span class="hl-attr">bind</span>=<span class="hl-str">"task.title"</span><span class="hl-tag">&gt;&lt;/li&gt;</span>
<span class="hl-tag">&lt;/ul&gt;</span></pre></div>
  </div>

  <!-- Known Limitations -->
  <div class="doc-section">
    <h2 class="doc-title" id="known-limitations" t="docs.directiveCompatibility.limitations.title"></h2>

    <h3 id="switch-loop" t="docs.directiveCompatibility.limitations.switchLoop.title"></h3>
    <p t="docs.directiveCompatibility.limitations.switchLoop.text"></p>
    <div class="code-block"><pre><span class="hl-cmt">&lt;!-- Correct: wrap loop in container inside case --&gt;</span>
<span class="hl-tag">&lt;div</span> <span class="hl-attr">switch</span>=<span class="hl-str">"view"</span><span class="hl-tag">&gt;</span>
  <span class="hl-tag">&lt;div</span> <span class="hl-attr">case</span>=<span class="hl-str">"'list'"</span><span class="hl-tag">&gt;</span>
    <span class="hl-tag">&lt;li</span> <span class="hl-attr">each</span>=<span class="hl-str">"item in items"</span> <span class="hl-attr">key</span>=<span class="hl-str">"item.id"</span> <span class="hl-attr">bind</span>=<span class="hl-str">"item.name"</span><span class="hl-tag">&gt;&lt;/li&gt;</span>
  <span class="hl-tag">&lt;/div&gt;</span>
  <span class="hl-tag">&lt;p</span> <span class="hl-attr">case</span>=<span class="hl-str">"'empty'"</span><span class="hl-tag">&gt;</span>No items<span class="hl-tag">&lt;/p&gt;</span>
<span class="hl-tag">&lt;/div&gt;</span></pre></div>

    <h3 id="if-loop" t="docs.directiveCompatibility.limitations.ifLoop.title"></h3>
    <p t="docs.directiveCompatibility.limitations.ifLoop.text"></p>
    <div class="code-block"><pre><span class="hl-cmt">&lt;!-- Correct: wrap loop in container with if --&gt;</span>
<span class="hl-tag">&lt;div</span> <span class="hl-attr">if</span>=<span class="hl-str">"showList"</span><span class="hl-tag">&gt;</span>
  <span class="hl-tag">&lt;li</span> <span class="hl-attr">each</span>=<span class="hl-str">"item in items"</span> <span class="hl-attr">key</span>=<span class="hl-str">"item.id"</span> <span class="hl-attr">bind</span>=<span class="hl-str">"item.name"</span><span class="hl-tag">&gt;&lt;/li&gt;</span>
<span class="hl-tag">&lt;/div&gt;</span></pre></div>

    <h3 id="else-if-loop" t="docs.directiveCompatibility.limitations.elseIfLoop.title"></h3>
    <p t="docs.directiveCompatibility.limitations.elseIfLoop.text"></p>
    <div class="code-block"><pre><span class="hl-cmt">&lt;!-- Correct: wrap loop in container with else-if --&gt;</span>
<span class="hl-tag">&lt;p</span> <span class="hl-attr">if</span>=<span class="hl-str">"mode === 'a'"</span><span class="hl-tag">&gt;</span>Mode A<span class="hl-tag">&lt;/p&gt;</span>
<span class="hl-tag">&lt;div</span> <span class="hl-attr">else-if</span>=<span class="hl-str">"items.length &gt; 0"</span><span class="hl-tag">&gt;</span>
  <span class="hl-tag">&lt;li</span> <span class="hl-attr">each</span>=<span class="hl-str">"n in items"</span> <span class="hl-attr">key</span>=<span class="hl-str">"$index"</span> <span class="hl-attr">bind</span>=<span class="hl-str">"n"</span><span class="hl-tag">&gt;&lt;/li&gt;</span>
<span class="hl-tag">&lt;/div&gt;</span>
<span class="hl-tag">&lt;p</span> <span class="hl-attr">else</span><span class="hl-tag">&gt;</span>Fallback<span class="hl-tag">&lt;/p&gt;</span></pre></div>

    <h3 id="duplicate-ref" t="docs.directiveCompatibility.limitations.duplicateRef.title"></h3>
    <p t="docs.directiveCompatibility.limitations.duplicateRef.text"></p>

    <h3 id="bind-value-model" t="docs.directiveCompatibility.limitations.bindValueModel.title"></h3>
    <p t="docs.directiveCompatibility.limitations.bindValueModel.text"></p>

    <h3 id="watch-onchange" t="docs.directiveCompatibility.limitations.watchOnChange.title"></h3>
    <p t="docs.directiveCompatibility.limitations.watchOnChange.text"></p>

    <h3 id="t-bind" t="docs.directiveCompatibility.limitations.tBind.title"></h3>
    <p t="docs.directiveCompatibility.limitations.tBind.text"></p>

    <h3 id="http-on-loop" t="docs.directiveCompatibility.limitations.httpOnLoop.title"></h3>
    <p t="docs.directiveCompatibility.limitations.httpOnLoop.text"></p>
  </div>

  <!-- Migration Notes -->
  <div class="doc-section">
    <h2 class="doc-title" id="migration-notes" t="docs.directiveCompatibility.migration.title"></h2>

    <h3 id="if-gates-migration" t="docs.directiveCompatibility.migration.ifGates.title"></h3>
    <p t="docs.directiveCompatibility.migration.ifGates.before"></p>
    <p t="docs.directiveCompatibility.migration.ifGates.after"></p>
    <div class="callout callout-warning">
      <p t="docs.directiveCompatibility.migration.ifGates.check"></p>
    </div>

    <h3 id="use-priority-migration" t="docs.directiveCompatibility.migration.usePriority.title"></h3>
    <p t="docs.directiveCompatibility.migration.usePriority.text"></p>
  </div>

</div>
