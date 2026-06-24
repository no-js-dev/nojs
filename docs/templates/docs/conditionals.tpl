<!-- Conditionals — from conditionals.md -->

<div class="doc-content">

  <!-- if/then/else -->
  <div class="doc-section">
    <h2 class="doc-title" id="conditionals-if-then-else" t="docs.conditionals.ifThenElse.title"></h2>
    <p class="doc-text" t="docs.conditionals.ifThenElse.text"></p>
    <div class="demo-split">
      <div class="demo-code"><pre><span class="hl-cmt">&lt;!-- Inline content --&gt;</span>
<span class="hl-tag">&lt;div</span> <span class="hl-attr">if</span>=<span class="hl-str">"user.isLoggedIn"</span><span class="hl-tag">&gt;</span>
  <span class="hl-tag">&lt;p&gt;</span>Welcome back!<span class="hl-tag">&lt;/p&gt;</span>
<span class="hl-tag">&lt;/div&gt;</span>

<span class="hl-cmt">&lt;!-- With templates --&gt;</span>
<span class="hl-tag">&lt;div</span> <span class="hl-attr">if</span>=<span class="hl-str">"user.isAdmin"</span>
     <span class="hl-attr">then</span>=<span class="hl-str">"adminPanel"</span>
     <span class="hl-attr">else</span>=<span class="hl-str">"userPanel"</span><span class="hl-tag">&gt;&lt;/div&gt;</span>

<span class="hl-cmt">&lt;!-- Negation --&gt;</span>
<span class="hl-tag">&lt;div</span> <span class="hl-attr">if</span>=<span class="hl-str">"!user.isLoggedIn"</span>
     <span class="hl-attr">then</span>=<span class="hl-str">"loginPrompt"</span><span class="hl-tag">&gt;&lt;/div&gt;</span>

<span class="hl-cmt">&lt;!-- Complex expressions --&gt;</span>
<span class="hl-tag">&lt;div</span> <span class="hl-attr">if</span>=<span class="hl-str">"user.role === 'admin' &amp;&amp; user.verified"</span>
     <span class="hl-attr">then</span>=<span class="hl-str">"adminTpl"</span><span class="hl-tag">&gt;&lt;/div&gt;</span>
<span class="hl-tag">&lt;div</span> <span class="hl-attr">if</span>=<span class="hl-str">"cart.items.length > 0"</span>
     <span class="hl-attr">then</span>=<span class="hl-str">"cartTpl"</span>
     <span class="hl-attr">else</span>=<span class="hl-str">"emptyCartTpl"</span><span class="hl-tag">&gt;&lt;/div&gt;</span></pre></div>
      <div class="demo-preview" state="{ loggedIn: true }">
        <div class="demo-result-label" t="docs.conditionals.ifThenElse.preview"></div>
        <label class="checkbox-label mb-3">
          <input type="checkbox" model="loggedIn" /> <span t="docs.conditionals.ifThenElse.checkbox"></span>
        </label>
        <div if="loggedIn">
          <div class="alert alert-success" t="docs.conditionals.ifThenElse.welcome"></div>
        </div>
        <div if="!loggedIn">
          <div class="alert alert-info" t="docs.conditionals.ifThenElse.login"></div>
        </div>
      </div>
    </div>
  </div>

  <!-- else-if -->
  <div class="doc-section">
    <h2 class="doc-title" id="conditionals-else-if" t="docs.conditionals.elseIf.title"></h2>
    <div class="code-block"><pre><span class="hl-tag">&lt;div</span> <span class="hl-attr">if</span>=<span class="hl-str">"status === 'loading'"</span> <span class="hl-attr">then</span>=<span class="hl-str">"loadingTpl"</span><span class="hl-tag">&gt;&lt;/div&gt;</span>
<span class="hl-tag">&lt;div</span> <span class="hl-attr">else-if</span>=<span class="hl-str">"status === 'error'"</span> <span class="hl-attr">then</span>=<span class="hl-str">"errorTpl"</span><span class="hl-tag">&gt;&lt;/div&gt;</span>
<span class="hl-tag">&lt;div</span> <span class="hl-attr">else-if</span>=<span class="hl-str">"status === 'empty'"</span> <span class="hl-attr">then</span>=<span class="hl-str">"emptyTpl"</span><span class="hl-tag">&gt;&lt;/div&gt;</span>
<span class="hl-tag">&lt;div</span> <span class="hl-attr">else</span> <span class="hl-attr">then</span>=<span class="hl-str">"contentTpl"</span><span class="hl-tag">&gt;&lt;/div&gt;</span></pre></div>
  </div>

  <!-- show/hide -->
  <div class="doc-section">
    <h2 class="doc-title" id="conditionals-show-hide" t="docs.conditionals.showHide.title"></h2>
    <p class="doc-text" t="docs.conditionals.showHide.text"></p>
    <div class="code-block"><pre><span class="hl-tag">&lt;div</span> <span class="hl-attr">show</span>=<span class="hl-str">"user.isLoggedIn"</span><span class="hl-tag">&gt;</span>Welcome!<span class="hl-tag">&lt;/div&gt;</span>
<span class="hl-tag">&lt;div</span> <span class="hl-attr">hide</span>=<span class="hl-str">"user.isLoggedIn"</span><span class="hl-tag">&gt;</span>Please log in.<span class="hl-tag">&lt;/div&gt;</span>

<span class="hl-tag">&lt;button</span> <span class="hl-attr">show</span>=<span class="hl-str">"!editing"</span> <span class="hl-attr">on:click</span>=<span class="hl-str">"editing = true"</span><span class="hl-tag">&gt;</span>Edit<span class="hl-tag">&lt;/button&gt;</span>
<span class="hl-tag">&lt;button</span> <span class="hl-attr">show</span>=<span class="hl-str">"editing"</span> <span class="hl-attr">on:click</span>=<span class="hl-str">"editing = false"</span><span class="hl-tag">&gt;</span>Save<span class="hl-tag">&lt;/button&gt;</span></pre></div>

    <h3 class="doc-subtitle" id="conditionals-show-hide-comparison" t="docs.conditionals.showHide.comparisonTitle"></h3>
    <table class="doc-table">
      <thead>
        <tr><th></th><th t="docs.conditionals.showHide.colIf"></th><th t="docs.conditionals.showHide.colShow"></th></tr>
      </thead>
      <tbody>
        <tr><td t="docs.conditionals.showHide.mechanism"></td><td t="docs.conditionals.showHide.mechanismIf"></td><td t="docs.conditionals.showHide.mechanismShow"></td></tr>
        <tr><td t="docs.conditionals.showHide.bestFor"></td><td t="docs.conditionals.showHide.bestForIf"></td><td t="docs.conditionals.showHide.bestForShow"></td></tr>
        <tr><td t="docs.conditionals.showHide.preservesState"></td><td t="docs.conditionals.showHide.preservesIf"></td><td t="docs.conditionals.showHide.preservesShow"></td></tr>
      </tbody>
    </table>
  </div>

  <!-- switch -->
  <div class="doc-section">
    <h2 class="doc-title" id="conditionals-switch-case" t="docs.conditionals.switchCase.title"></h2>
    <p class="doc-text" t="docs.conditionals.switchCase.text"></p>
    <div class="code-block"><pre><span class="hl-tag">&lt;div</span> <span class="hl-attr">get</span>=<span class="hl-str">"/me"</span> <span class="hl-attr">as</span>=<span class="hl-str">"user"</span><span class="hl-tag">&gt;</span>
  <span class="hl-tag">&lt;div</span> <span class="hl-attr">switch</span>=<span class="hl-str">"user.role"</span><span class="hl-tag">&gt;</span>
    <span class="hl-tag">&lt;div</span> <span class="hl-attr">case</span>=<span class="hl-str">"'admin'"</span>    <span class="hl-attr">then</span>=<span class="hl-str">"adminDashboard"</span><span class="hl-tag">&gt;&lt;/div&gt;</span>
    <span class="hl-tag">&lt;div</span> <span class="hl-attr">case</span>=<span class="hl-str">"'editor'"</span>   <span class="hl-attr">then</span>=<span class="hl-str">"editorDashboard"</span><span class="hl-tag">&gt;&lt;/div&gt;</span>
    <span class="hl-tag">&lt;div</span> <span class="hl-attr">case</span>=<span class="hl-str">"'viewer'"</span>   <span class="hl-attr">then</span>=<span class="hl-str">"viewerDashboard"</span><span class="hl-tag">&gt;&lt;/div&gt;</span>
    <span class="hl-tag">&lt;div</span> <span class="hl-attr">default</span>           <span class="hl-attr">then</span>=<span class="hl-str">"guestDashboard"</span><span class="hl-tag">&gt;&lt;/div&gt;</span>
  <span class="hl-tag">&lt;/div&gt;</span>
<span class="hl-tag">&lt;/div&gt;</span></pre></div>

    <h3 class="doc-subtitle" id="conditionals-switch-inline" t="docs.conditionals.switchCase.inlineSubtitle"></h3>
    <div class="code-block"><pre><span class="hl-tag">&lt;div</span> <span class="hl-attr">switch</span>=<span class="hl-str">"order.status"</span><span class="hl-tag">&gt;</span>
  <span class="hl-tag">&lt;span</span> <span class="hl-attr">case</span>=<span class="hl-str">"'pending'"</span><span class="hl-tag">&gt;</span>⏳ Pending<span class="hl-tag">&lt;/span&gt;</span>
  <span class="hl-tag">&lt;span</span> <span class="hl-attr">case</span>=<span class="hl-str">"'shipped'"</span><span class="hl-tag">&gt;</span>📦 Shipped<span class="hl-tag">&lt;/span&gt;</span>
  <span class="hl-tag">&lt;span</span> <span class="hl-attr">case</span>=<span class="hl-str">"'delivered'"</span><span class="hl-tag">&gt;</span>✅ Delivered<span class="hl-tag">&lt;/span&gt;</span>
  <span class="hl-tag">&lt;span</span> <span class="hl-attr">default</span><span class="hl-tag">&gt;</span>Unknown<span class="hl-tag">&lt;/span&gt;</span>
<span class="hl-tag">&lt;/div&gt;</span></pre></div>

    <h3 class="doc-subtitle" id="conditionals-switch-multi-value" t="docs.conditionals.switchCase.multiValueSubtitle"></h3>
    <div class="code-block"><pre><span class="hl-tag">&lt;div</span> <span class="hl-attr">switch</span>=<span class="hl-str">"user.role"</span><span class="hl-tag">&gt;</span>
  <span class="hl-tag">&lt;div</span> <span class="hl-attr">case</span>=<span class="hl-str">"'admin','superadmin'"</span> <span class="hl-attr">then</span>=<span class="hl-str">"adminPanel"</span><span class="hl-tag">&gt;&lt;/div&gt;</span>
  <span class="hl-tag">&lt;div</span> <span class="hl-attr">case</span>=<span class="hl-str">"'editor','writer'"</span>    <span class="hl-attr">then</span>=<span class="hl-str">"editorPanel"</span><span class="hl-tag">&gt;&lt;/div&gt;</span>
  <span class="hl-tag">&lt;div</span> <span class="hl-attr">default</span>                     <span class="hl-attr">then</span>=<span class="hl-str">"viewerPanel"</span><span class="hl-tag">&gt;&lt;/div&gt;</span>
<span class="hl-tag">&lt;/div&gt;</span></pre></div>
  </div>

  <!-- else on loop elements -->
  <div class="doc-section">
    <h2 class="doc-title" id="conditionals-else-on-loops" t="docs.conditionals.elseOnLoops.title"></h2>
    <p class="doc-text" t="docs.conditionals.elseOnLoops.text"></p>
    <div class="code-block"><pre><span class="hl-tag">&lt;article</span> <span class="hl-attr">foreach</span>=<span class="hl-str">"item in items"</span> <span class="hl-attr">else</span>=<span class="hl-str">"noItems"</span><span class="hl-tag">&gt;</span>
  <span class="hl-tag">&lt;h2</span> <span class="hl-attr">bind</span>=<span class="hl-str">"item.title"</span><span class="hl-tag">&gt;&lt;/h2&gt;</span>
<span class="hl-tag">&lt;/article&gt;</span>

<span class="hl-tag">&lt;template</span> <span class="hl-attr">id</span>=<span class="hl-str">"noItems"</span><span class="hl-tag">&gt;</span>
  <span class="hl-tag">&lt;p&gt;</span>No items found.<span class="hl-tag">&lt;/p&gt;</span>
<span class="hl-tag">&lt;/template&gt;</span></pre></div>
    <div class="callout" t="docs.conditionals.elseOnLoops.callout"></div>
  </div>

</div>

