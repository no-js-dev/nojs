<!-- Animations — from animations.md -->

<section class="hero-section">
  <span class="badge" t="docs.animations.hero.badge"></span>
  <h1 class="hero-title" t="docs.animations.hero.title"></h1>
  <p class="hero-subtitle" t="docs.animations.hero.subtitle"></p>
</section>

<div class="doc-content">

  <!-- animate -->
  <div class="doc-section">
    <h2 class="doc-title" id="animations-enter-leave" t="docs.animations.enterLeave.title"></h2>
    <div class="code-block"><pre><span class="hl-cmt">&lt;!-- CSS animation name on enter --&gt;</span>
<span class="hl-tag">&lt;div</span> <span class="hl-attr">if</span>=<span class="hl-str">"visible"</span> <span class="hl-attr">animate</span>=<span class="hl-str">"fadeIn"</span><span class="hl-tag">&gt;</span>Content<span class="hl-tag">&lt;/div&gt;</span>

<span class="hl-cmt">&lt;!-- Enter and leave animations --&gt;</span>
<span class="hl-tag">&lt;div</span> <span class="hl-attr">if</span>=<span class="hl-str">"visible"</span>
     <span class="hl-attr">animate-enter</span>=<span class="hl-str">"slideInRight"</span>
     <span class="hl-attr">animate-leave</span>=<span class="hl-str">"slideOutLeft"</span>
     <span class="hl-attr">animate-duration</span>=<span class="hl-str">"300"</span><span class="hl-tag">&gt;</span>
  Content
<span class="hl-tag">&lt;/div&gt;</span></pre></div>

    <h3 class="doc-subtitle" id="animations-enter-leave-attrs" t="docs.animations.enterLeave.attrsTitle"></h3>
    <table class="doc-table">
      <thead>
        <tr><th t="docs.animations.enterLeave.col1"></th><th t="docs.animations.enterLeave.col2"></th></tr>
      </thead>
      <tbody>
        <tr><td><code>animate</code> / <code>animate-enter</code></td><td t="docs.animations.enterLeave.row1"></td></tr>
        <tr><td><code>animate-leave</code></td><td t="docs.animations.enterLeave.row2"></td></tr>
        <tr><td><code>animate-duration</code></td><td t="docs.animations.enterLeave.row3"></td></tr>
        <tr><td><code>animate-stagger</code></td><td t="docs.animations.enterLeave.row4"></td></tr>
      </tbody>
    </table>

    <div class="callout"><p t="docs.animations.enterLeave.fallbackCallout"></p></div>
  </div>

  <!-- transition -->
  <div class="doc-section">
    <h2 class="doc-title" id="animations-transition" t="docs.animations.transition.title"></h2>
    <div class="callout">
      <p t="docs.animations.transition.viewTransitionNote" t-html></p>
    </div>
    <p class="doc-text" t="docs.animations.transition.text1"></p>
    <div class="code-block"><pre><span class="hl-tag">&lt;div</span> <span class="hl-attr">if</span>=<span class="hl-str">"show"</span> <span class="hl-attr">transition</span>=<span class="hl-str">"fade"</span><span class="hl-tag">&gt;</span>Content<span class="hl-tag">&lt;/div&gt;</span></pre></div>

    <p class="doc-text" t="docs.animations.transition.text2"></p>
    <table class="doc-table">
      <thead><tr><th t="docs.animations.transition.col1"></th><th t="docs.animations.transition.col2"></th></tr></thead>
      <tbody>
        <tr><td><code>fade-enter</code></td><td t="docs.animations.transition.row1"></td></tr>
        <tr><td><code>fade-enter-active</code></td><td t="docs.animations.transition.row2"></td></tr>
        <tr><td><code>fade-enter-to</code></td><td t="docs.animations.transition.row3"></td></tr>
        <tr><td><code>fade-leave</code></td><td t="docs.animations.transition.row4"></td></tr>
        <tr><td><code>fade-leave-active</code></td><td t="docs.animations.transition.row5"></td></tr>
        <tr><td><code>fade-leave-to</code></td><td t="docs.animations.transition.row6"></td></tr>
      </tbody>
    </table>

    <div class="code-block"><pre><span class="hl-kw">.fade-enter-active</span>, <span class="hl-kw">.fade-leave-active</span> {
  <span class="hl-attr">transition</span>: opacity <span class="hl-num">0.3s</span> ease;
}
<span class="hl-kw">.fade-enter</span>, <span class="hl-kw">.fade-leave-to</span> {
  <span class="hl-attr">opacity</span>: <span class="hl-num">0</span>;
}</pre></div>
  </div>

  <!-- Loop Animations -->
  <div class="doc-section">
    <h2 class="doc-title" id="animations-loop" t="docs.animations.loopAnimations.title"></h2>
    <p class="doc-text" t="docs.animations.loopAnimations.text"></p>
    <div class="code-block"><pre><span class="hl-tag">&lt;div</span> <span class="hl-attr">each</span>=<span class="hl-str">"item in items"</span>
     <span class="hl-attr">animate-enter</span>=<span class="hl-str">"fadeInUp"</span>
     <span class="hl-attr">animate-leave</span>=<span class="hl-str">"fadeOutDown"</span>
     <span class="hl-attr">animate-stagger</span>=<span class="hl-str">"50"</span><span class="hl-tag">&gt;</span>  <span class="hl-cmt">&lt;!-- 50ms delay between each item --&gt;</span>
  <span class="hl-tag">&lt;span</span> <span class="hl-attr">bind</span>=<span class="hl-str">"item.name"</span><span class="hl-tag">&gt;&lt;/span&gt;</span>
<span class="hl-tag">&lt;/div&gt;</span></pre></div>
  </div>

  <!-- Built-in Animation Names -->
  <div class="doc-section">
    <h2 class="doc-title" id="animations-built-in" t="docs.animations.builtIn.title"></h2>
    <p class="doc-text" t="docs.animations.builtIn.text"></p>
    <div style="display: flex; flex-wrap: wrap; gap: 8px;">
      <span class="badge">fadeIn</span>
      <span class="badge">fadeOut</span>
      <span class="badge">fadeInUp</span>
      <span class="badge">fadeInDown</span>
      <span class="badge">fadeOutUp</span>
      <span class="badge">fadeOutDown</span>
      <span class="badge">slideInLeft</span>
      <span class="badge">slideInRight</span>
      <span class="badge">slideOutLeft</span>
      <span class="badge">slideOutRight</span>
      <span class="badge">zoomIn</span>
      <span class="badge">zoomOut</span>
      <span class="badge">bounceIn</span>
      <span class="badge">bounceOut</span>
    </div>
  </div>

  <!-- Accessibility -->
  <div class="doc-section">
    <h2 class="doc-title" id="animations-a11y" t="docs.animations.a11y.title"></h2>
    <p class="doc-text" t="docs.animations.a11y.text"></p>
    <div class="code-block"><pre><span class="hl-cmt">/* Built-in — No.JS adds this automatically */</span>
<span class="hl-sel">@media</span> (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    <span class="hl-prop">animation-duration</span>: <span class="hl-num">0.01ms</span> !important;
    <span class="hl-prop">transition-duration</span>: <span class="hl-num">0.01ms</span> !important;
  }
}</pre></div>
    <div class="callout">
      <p t="docs.animations.a11y.callout"></p>
    </div>
  </div>

  <!-- Live Demo -->
  <div class="doc-section">
    <h2 class="doc-title" id="animations-live-demo" t="docs.animations.liveDemo.title"></h2>
    <div class="demo-split">
      <div class="demo-code">
        <div class="code-block"><pre><span class="hl-tag">&lt;div</span> <span class="hl-attr">state</span>=<span class="hl-str">"{ show: true }"</span><span class="hl-tag">&gt;</span>
  <span class="hl-tag">&lt;button</span> <span class="hl-attr">on:click</span>=<span class="hl-str">"show = !show"</span><span class="hl-tag">&gt;</span>Toggle<span class="hl-tag">&lt;/button&gt;</span>
  <span class="hl-tag">&lt;div</span> <span class="hl-attr">if</span>=<span class="hl-str">"show"</span>
       <span class="hl-attr">animate-enter</span>=<span class="hl-str">"fadeIn"</span>
       <span class="hl-attr">animate-leave</span>=<span class="hl-str">"fadeOut"</span><span class="hl-tag">&gt;</span>
    Hello, Animated World!
  <span class="hl-tag">&lt;/div&gt;</span>
<span class="hl-tag">&lt;/div&gt;</span></pre></div>
      </div>
      <div class="demo-preview">
        <span class="demo-result-label" t="docs.animations.liveDemo.label"></span>
        <div state="{ show: true }">
          <button class="btn btn-primary btn-sm" on:click="show = !show" style="margin-bottom: 12px;" t="docs.animations.liveDemo.toggleButton"></button>
          <div if="show" animate-enter="fadeIn" animate-leave="fadeOut" style="padding: 16px; background: var(--primary-surface); border-radius: 8px; color: var(--primary);">
            <span t="docs.animations.liveDemo.demoText"></span>
          </div>
        </div>
      </div>
    </div>
  </div>

</div>