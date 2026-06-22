<!-- Getting Started — from getting-started.md -->

<section class="hero-section">
  <span class="badge" t="docs.gettingStarted.hero.badge"></span>
  <h1 class="hero-title" t="docs.gettingStarted.hero.title"></h1>
  <p class="hero-subtitle" t="docs.gettingStarted.hero.subtitle"></p>
</section>

<div class="doc-content">

  <!-- Introduction -->
  <div class="doc-section">
    <h2 class="doc-title" id="getting-started-introduction" t="docs.gettingStarted.introduction.title"></h2>
    <p class="doc-text" t="docs.gettingStarted.introduction.text"></p>
    <div class="callout">
      <p t="docs.gettingStarted.introduction.callout"></p>
    </div>
  </div>

  <!-- Installation -->
  <div class="doc-section">
    <h2 class="doc-title" id="getting-started-installation" t="docs.gettingStarted.installation.title"></h2>

    <h3 class="doc-subtitle" id="getting-started-cdn" t="docs.gettingStarted.installation.cdnSubtitle"></h3>
    <div class="code-block"><pre><span class="hl-tag">&lt;script</span> <span class="hl-attr">src</span>=<span class="hl-str">"https://cdn.no-js.dev/"</span><span class="hl-tag">&gt;&lt;/script&gt;</span></pre></div>

    <h3 class="doc-subtitle" id="getting-started-self-hosted" t="docs.gettingStarted.installation.selfHostedSubtitle"></h3>
    <p class="doc-text" t="docs.gettingStarted.installation.selfHostedText"></p>

  </div>

  <!-- Quick Start -->
  <div class="doc-section" id="quick-start">
    <h2 class="doc-title" id="getting-started-quick-start" t="docs.gettingStarted.quickStart.title"></h2>
    <p class="doc-text" t="docs.gettingStarted.quickStart.text"></p>
    <div class="code-block"><pre><span class="hl-tag">&lt;!DOCTYPE html&gt;</span>
<span class="hl-tag">&lt;html&gt;</span>
<span class="hl-tag">&lt;head&gt;</span>
  <span class="hl-tag">&lt;script</span> <span class="hl-attr">src</span>=<span class="hl-str">"https://cdn.no-js.dev/"</span><span class="hl-tag">&gt;&lt;/script&gt;</span>
<span class="hl-tag">&lt;/head&gt;</span>
<span class="hl-tag">&lt;body</span> <span class="hl-attr">base</span>=<span class="hl-str">"https://jsonplaceholder.typicode.com"</span><span class="hl-tag">&gt;</span>

  <span class="hl-tag">&lt;div</span> <span class="hl-attr">get</span>=<span class="hl-str">"/users/1"</span> <span class="hl-attr">as</span>=<span class="hl-str">"user"</span><span class="hl-tag">&gt;</span>
    <span class="hl-tag">&lt;h1</span> <span class="hl-attr">bind</span>=<span class="hl-str">"user.name"</span><span class="hl-tag">&gt;</span>Loading...<span class="hl-tag">&lt;/h1&gt;</span>
    <span class="hl-tag">&lt;p</span> <span class="hl-attr">bind</span>=<span class="hl-str">"user.email"</span><span class="hl-tag">&gt;&lt;/p&gt;</span>
  <span class="hl-tag">&lt;/div&gt;</span>

<span class="hl-tag">&lt;/body&gt;</span>
<span class="hl-tag">&lt;/html&gt;</span></pre></div>
  </div>

  <!-- How It Works -->
  <div class="doc-section">
    <h2 class="doc-title" id="getting-started-how-it-works" t="docs.gettingStarted.howItWorks.title"></h2>
    <p class="doc-text" t="docs.gettingStarted.howItWorks.text"></p>
    <div class="concepts-grid">
      <div class="concept-card">
        <div class="concept-card-title" t="docs.gettingStarted.howItWorks.card1Title"></div>
        <div class="concept-card-desc" t="docs.gettingStarted.howItWorks.card1Desc"></div>
      </div>
      <div class="concept-card">
        <div class="concept-card-title" t="docs.gettingStarted.howItWorks.card2Title"></div>
        <div class="concept-card-desc" t="docs.gettingStarted.howItWorks.card2Desc"></div>
      </div>
      <div class="concept-card">
        <div class="concept-card-title" t="docs.gettingStarted.howItWorks.card3Title"></div>
        <div class="concept-card-desc" t="docs.gettingStarted.howItWorks.card3Desc"></div>
      </div>
      <div class="concept-card">
        <div class="concept-card-title" t="docs.gettingStarted.howItWorks.card4Title"></div>
        <div class="concept-card-desc" t="docs.gettingStarted.howItWorks.card4Desc"></div>
      </div>
    </div>
  </div>

  <!-- Core Concepts -->
  <div class="doc-section" id="core-concepts">
    <h2 class="doc-title" id="getting-started-core-concepts" t="docs.gettingStarted.coreConcepts.title"></h2>

    <h3 class="doc-subtitle" id="getting-started-reactive-context" t="docs.gettingStarted.coreConcepts.reactiveContextSubtitle"></h3>
    <p class="doc-text" t="docs.gettingStarted.coreConcepts.reactiveContextText"></p>
    <div class="code-block"><pre><span class="hl-cmt">body          → context: { baseUrl }</span>
<span class="hl-cmt">  div[get]    → context: { user: { name, email } }  ← inherits from body</span>
<span class="hl-cmt">    span[bind="user.name"]                           ← reads from div's context</span>
<span class="hl-cmt">    p[each]   → context: { post: { title } }         ← self-repeating, inherits from div</span></pre></div>

    <h3 class="doc-subtitle" id="getting-started-directive-priority" t="docs.gettingStarted.coreConcepts.directivePrioritySubtitle"></h3>
    <table class="doc-table">
      <thead>
        <tr><th t="docs.gettingStarted.coreConcepts.tableCol1"></th><th t="docs.gettingStarted.coreConcepts.tableCol2"></th><th t="docs.gettingStarted.coreConcepts.tableCol3"></th></tr>
      </thead>
      <tbody>
        <tr><td>0</td><td><code>state</code>, <code>store</code></td><td t="docs.gettingStarted.coreConcepts.tableRow1"></td></tr>
        <tr><td>1</td><td><code>get</code>, <code>post</code>, <code>put</code>, <code>patch</code>, <code>delete</code>, <code>error-boundary</code>, <code>i18n-ns</code></td><td t="docs.gettingStarted.coreConcepts.tableRow1b"></td></tr>
        <tr><td>2</td><td><code>computed</code>, <code>watch</code></td><td t="docs.gettingStarted.coreConcepts.tableRow2b"></td></tr>
        <tr><td>5</td><td><code>ref</code></td><td t="docs.gettingStarted.coreConcepts.tableRow5b"></td></tr>
        <tr><td>10</td><td><code>if</code>, <code>switch</code>, <code>foreach</code>, <code>each</code>, <code>for</code>, <code>use</code>, <code>drag-list</code> <sup style="color:#B45309;">*</sup></td><td t="docs.gettingStarted.coreConcepts.tableRow4"></td></tr>
        <tr><td>15</td><td><code>drag</code> <sup style="color:#B45309;">*</sup>, <code>drop</code> <sup style="color:#B45309;">*</sup></td><td t="docs.gettingStarted.coreConcepts.tableRow15"></td></tr>
        <tr><td>20</td><td><code>bind</code>, <code>bind-*</code>, <code>model</code>, <code>class-*</code>, <code>style-*</code>, <code>on:*</code>, <code>show</code>, <code>hide</code>, <code>t</code>, <code>call</code>, <code>trigger</code></td><td t="docs.gettingStarted.coreConcepts.tableRow5"></td></tr>
        <tr><td>30</td><td><code>validate</code> <sup style="color:#B45309;">*</sup></td><td t="docs.gettingStarted.coreConcepts.tableRow7"></td></tr>
      </tbody>
    </table>
    <p style="font-size: 13px; color: #78350F; margin-top: 8px;"><sup style="color:#B45309;">*</sup> Moved to <a href="https://github.com/no-js-dev/nojs-elements" style="color: #92400E; font-weight: 600;">NoJS Elements</a>. Core retains deprecation stubs. See <a href="#/docs/plugins" style="color: #92400E; font-weight: 600;">Plugins</a>.</p>

    <h3 class="doc-subtitle" id="getting-started-expressions" t="docs.gettingStarted.coreConcepts.expressionSubtitle"></h3>
    <p class="doc-text" t="docs.gettingStarted.coreConcepts.expressionText"></p>
    <div class="code-block"><pre><span class="hl-cmt">&lt;!-- Simple path --&gt;</span>
<span class="hl-tag">&lt;span</span> <span class="hl-attr">bind</span>=<span class="hl-str">"user.name"</span><span class="hl-tag">&gt;&lt;/span&gt;</span>

<span class="hl-cmt">&lt;!-- Ternary --&gt;</span>
<span class="hl-tag">&lt;span</span> <span class="hl-attr">bind</span>=<span class="hl-str">"user.age >= 18 ? 'Adult' : 'Minor'"</span><span class="hl-tag">&gt;&lt;/span&gt;</span>

<span class="hl-cmt">&lt;!-- Arithmetic --&gt;</span>
<span class="hl-tag">&lt;span</span> <span class="hl-attr">bind</span>=<span class="hl-str">"cart.total * 1.1"</span><span class="hl-tag">&gt;&lt;/span&gt;</span>

<span class="hl-cmt">&lt;!-- Filters (pipes) --&gt;</span>
<span class="hl-tag">&lt;span</span> <span class="hl-attr">bind</span>=<span class="hl-str">"user.name | uppercase"</span><span class="hl-tag">&gt;&lt;/span&gt;</span>

<span class="hl-cmt">&lt;!-- Template literals (bind-html) --&gt;</span>
<span class="hl-tag">&lt;div</span> <span class="hl-attr">bind-html</span>=<span class="hl-str">"`&lt;strong&gt;${user.name}&lt;/strong&gt;`"</span><span class="hl-tag">&gt;&lt;/div&gt;</span></pre></div>
  </div>

</div>
