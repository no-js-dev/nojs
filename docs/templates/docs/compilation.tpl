<!-- Compilation — from compilation.md -->

<section class="hero-section">
  <span class="badge" t="docs.compilation.hero.badge"></span>
  <h1 class="hero-title" t-html="docs.compilation.hero.title"></h1>
  <p class="hero-subtitle" t="docs.compilation.hero.subtitle"></p>
</section>

<div class="doc-content">

  <!-- Why Compile? -->
  <div class="doc-section">
    <h2 class="doc-title" t="docs.compilation.why.title"></h2>
    <p class="doc-text" t="docs.compilation.why.text"></p>
    <div class="callout"><p t="docs.compilation.why.callout"></p></div>
    <table class="doc-table">
      <thead>
        <tr>
          <th t="docs.compilation.why.thMode"></th>
          <th t="docs.compilation.why.thPerformance"></th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td t="docs.compilation.why.interpreted"></td>
          <td>~3.84x</td>
        </tr>
        <tr>
          <td t="docs.compilation.why.compiled"></td>
          <td>~1.2x</td>
        </tr>
      </tbody>
    </table>
  </div>

  <!-- Compilation Levels -->
  <div class="doc-section">
    <h2 class="doc-title" t="docs.compilation.levels.title"></h2>
    <p class="doc-text" t="docs.compilation.levels.text"></p>

    <h3 class="doc-title" t="docs.compilation.levels.level1Title"></h3>
    <p class="doc-text" t="docs.compilation.levels.level1Text"></p>
    <div class="code-block"><pre><span class="hl-cmt">&lt;!-- Before --&gt;</span>
<span class="hl-tag">&lt;span</span> <span class="hl-attr">bind</span>=<span class="hl-str">"'Hello, ' + 'world'"</span><span class="hl-tag">&gt;&lt;/span&gt;</span>

<span class="hl-cmt">&lt;!-- After (level 1) --&gt;</span>
<span class="hl-tag">&lt;span&gt;</span>Hello, world<span class="hl-tag">&lt;/span&gt;</span></pre></div>

    <h3 class="doc-title" t="docs.compilation.levels.level2Title"></h3>
    <p class="doc-text" t="docs.compilation.levels.level2Text"></p>
    <div class="code-block"><pre><span class="hl-cmt">&lt;!-- Before --&gt;</span>
<span class="hl-tag">&lt;p</span> <span class="hl-attr">bind</span>=<span class="hl-str">"user.name"</span><span class="hl-tag">&gt;&lt;/p&gt;</span>

<span class="hl-cmt">&lt;!-- After (level 2) --&gt;</span>
<span class="hl-tag">&lt;p</span> <span class="hl-attr">data-nojs-c</span>=<span class="hl-str">"bind:user.name"</span><span class="hl-tag">&gt;&lt;/p&gt;</span></pre></div>

    <h3 class="doc-title" t="docs.compilation.levels.level3Title"></h3>
    <p class="doc-text" t="docs.compilation.levels.level3Text"></p>
    <div class="code-block"><pre><span class="hl-cmt">&lt;!-- Before --&gt;</span>
<span class="hl-tag">&lt;ul&gt;</span>
  <span class="hl-tag">&lt;li</span> <span class="hl-attr">each</span>=<span class="hl-str">"items"</span> <span class="hl-attr">bind</span>=<span class="hl-str">"name"</span><span class="hl-tag">&gt;&lt;/li&gt;</span>
<span class="hl-tag">&lt;/ul&gt;</span>

<span class="hl-cmt">&lt;!-- After (level 3) --&gt;</span>
<span class="hl-tag">&lt;ul</span> <span class="hl-attr">data-nojs-c</span>=<span class="hl-str">"each:items#tpl0"</span><span class="hl-tag">&gt;&lt;/ul&gt;</span></pre></div>

    <h3 class="doc-title" t="docs.compilation.levels.level4Title"></h3>
    <p class="doc-text" t="docs.compilation.levels.level4Text"></p>
    <div class="code-block"><pre><span class="hl-cmt">&lt;!-- Before --&gt;</span>
<span class="hl-tag">&lt;div</span> <span class="hl-attr">state</span>=<span class="hl-str">'{"count": 0}'</span><span class="hl-tag">&gt;</span>
  <span class="hl-tag">&lt;span</span> <span class="hl-attr">bind</span>=<span class="hl-str">"count"</span><span class="hl-tag">&gt;&lt;/span&gt;</span>
  <span class="hl-tag">&lt;button</span> <span class="hl-attr">on:click</span>=<span class="hl-str">"count = count + 1"</span><span class="hl-tag">&gt;</span>+1<span class="hl-tag">&lt;/button&gt;</span>
<span class="hl-tag">&lt;/div&gt;</span>

<span class="hl-cmt">&lt;!-- After (level 4) --&gt;</span>
<span class="hl-tag">&lt;div</span> <span class="hl-attr">data-nojs-c</span>=<span class="hl-str">"s0:count=0"</span><span class="hl-tag">&gt;</span>
  <span class="hl-tag">&lt;span</span> <span class="hl-attr">data-nojs-c</span>=<span class="hl-str">"b:s0.count"</span><span class="hl-tag">&gt;&lt;/span&gt;</span>
  <span class="hl-tag">&lt;button</span> <span class="hl-attr">data-nojs-c</span>=<span class="hl-str">"e:click:s0.count++"</span><span class="hl-tag">&gt;</span>+1<span class="hl-tag">&lt;/button&gt;</span>
<span class="hl-tag">&lt;/div&gt;</span></pre></div>
  </div>

  <!-- CLI Usage -->
  <div class="doc-section">
    <h2 class="doc-title" t="docs.compilation.cli.title"></h2>
    <p class="doc-text" t="docs.compilation.cli.text"></p>
    <div class="code-block"><pre><span class="hl-cmt"># Compile with defaults</span>
nojs build

<span class="hl-cmt"># Compile specific files</span>
nojs build src/index.html src/about.html

<span class="hl-cmt"># Compile an entire directory</span>
nojs build src/ --out dist/</pre></div>

    <h3 class="doc-title" t="docs.compilation.cli.flagsTitle"></h3>
    <table class="doc-table">
      <thead>
        <tr>
          <th t="docs.compilation.cli.thFlag"></th>
          <th t="docs.compilation.cli.thDefault"></th>
          <th t="docs.compilation.cli.thDescription"></th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td><code>--out</code></td>
          <td><code>dist/</code></td>
          <td t="docs.compilation.cli.flagOut"></td>
        </tr>
        <tr>
          <td><code>--sourcemap</code></td>
          <td><code>false</code></td>
          <td t="docs.compilation.cli.flagSourcemap"></td>
        </tr>
        <tr>
          <td><code>--minify</code></td>
          <td><code>true</code></td>
          <td t="docs.compilation.cli.flagMinify"></td>
        </tr>
        <tr>
          <td><code>--watch</code></td>
          <td><code>false</code></td>
          <td t="docs.compilation.cli.flagWatch"></td>
        </tr>
      </tbody>
    </table>
  </div>

  <!-- Dev vs Production -->
  <div class="doc-section">
    <h2 class="doc-title" t="docs.compilation.workflow.title"></h2>
    <table class="doc-table">
      <thead>
        <tr>
          <th></th>
          <th t="docs.compilation.workflow.thDev"></th>
          <th t="docs.compilation.workflow.thProd"></th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td t="docs.compilation.workflow.rowSource"></td>
          <td t="docs.compilation.workflow.rowSourceDev"></td>
          <td t="docs.compilation.workflow.rowSourceProd"></td>
        </tr>
        <tr>
          <td t="docs.compilation.workflow.rowBuild"></td>
          <td t="docs.compilation.workflow.rowBuildDev"></td>
          <td><code>nojs build</code></td>
        </tr>
        <tr>
          <td t="docs.compilation.workflow.rowRuntime"></td>
          <td t="docs.compilation.workflow.rowRuntimeDev"></td>
          <td t="docs.compilation.workflow.rowRuntimeProd"></td>
        </tr>
        <tr>
          <td t="docs.compilation.workflow.rowDebug"></td>
          <td t="docs.compilation.workflow.rowDebugDev"></td>
          <td t="docs.compilation.workflow.rowDebugProd"></td>
        </tr>
      </tbody>
    </table>
    <div class="callout"><p t="docs.compilation.workflow.callout"></p></div>
  </div>

  <!-- Configuration -->
  <div class="doc-section">
    <h2 class="doc-title" t="docs.compilation.config.title"></h2>
    <p class="doc-text" t="docs.compilation.config.text"></p>
    <div class="code-block"><pre>{
  <span class="hl-attr">"input"</span>: [<span class="hl-str">"src/"</span>],
  <span class="hl-attr">"output"</span>: <span class="hl-str">"dist/"</span>,

  <span class="hl-attr">"compile"</span>: {
    <span class="hl-attr">"sourcemap"</span>: <span class="hl-kw">false</span>,
    <span class="hl-attr">"minify"</span>: <span class="hl-kw">true</span>
  },

  <span class="hl-attr">"exclude"</span>: [
    <span class="hl-str">"src/admin/**"</span>,
    <span class="hl-str">"**/*.draft.html"</span>
  ],

  <span class="hl-attr">"assets"</span>: [<span class="hl-str">"public/"</span>]
}</pre></div>
    <p class="doc-text" t="docs.compilation.config.override"></p>
  </div>

  <!-- FAQ -->
  <div class="doc-section">
    <h2 class="doc-title" t="docs.compilation.faq.title"></h2>

    <h3 class="doc-title" t="docs.compilation.faq.needTitle"></h3>
    <p class="doc-text" t="docs.compilation.faq.needText"></p>

    <h3 class="doc-title" t="docs.compilation.faq.shouldTitle"></h3>
    <p class="doc-text" t="docs.compilation.faq.shouldText"></p>

    <h3 class="doc-title" t="docs.compilation.faq.sourceTitle"></h3>
    <p class="doc-text" t="docs.compilation.faq.sourceText"></p>

    <h3 class="doc-title" t="docs.compilation.faq.mixTitle"></h3>
    <p class="doc-text" t="docs.compilation.faq.mixText"></p>

    <h3 class="doc-title" t="docs.compilation.faq.ssgTitle"></h3>
    <p class="doc-text" t="docs.compilation.faq.ssgText"></p>
  </div>

</div>
