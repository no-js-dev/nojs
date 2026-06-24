<!-- Templates — from templates.md -->

<div class="doc-content">

  <div class="doc-section">
    <h2 class="doc-title" id="templates-basic" t="docs.templates.basic.title"></h2>
    <p class="doc-text" t="docs.templates.basic.text"></p>
    <div class="code-block"><pre><span class="hl-tag">&lt;template</span> <span class="hl-attr">id</span>=<span class="hl-str">"userCard"</span><span class="hl-tag">&gt;</span>
  <span class="hl-tag">&lt;div</span> <span class="hl-attr">class</span>=<span class="hl-str">"card"</span><span class="hl-tag">&gt;</span>
    <span class="hl-tag">&lt;h3</span> <span class="hl-attr">bind</span>=<span class="hl-str">"user.name"</span><span class="hl-tag">&gt;&lt;/h3&gt;</span>
    <span class="hl-tag">&lt;p</span> <span class="hl-attr">bind</span>=<span class="hl-str">"user.email"</span><span class="hl-tag">&gt;&lt;/p&gt;</span>
  <span class="hl-tag">&lt;/div&gt;</span>
<span class="hl-tag">&lt;/template&gt;</span></pre></div>
  </div>

  <div class="doc-section">
    <h2 class="doc-title" id="templates-var" t="docs.templates.var.title"></h2>
    <p class="doc-text" t="docs.templates.var.text"></p>
    <div class="code-block"><pre><span class="hl-tag">&lt;form</span> <span class="hl-attr">post</span>=<span class="hl-str">"/login"</span> <span class="hl-attr">success</span>=<span class="hl-str">"#loginOk"</span> <span class="hl-attr">error</span>=<span class="hl-str">"#loginFail"</span><span class="hl-tag">&gt;</span>
  ...
<span class="hl-tag">&lt;/form&gt;</span>

<span class="hl-tag">&lt;template</span> <span class="hl-attr">id</span>=<span class="hl-str">"loginOk"</span> <span class="hl-attr">var</span>=<span class="hl-str">"result"</span><span class="hl-tag">&gt;</span>
  <span class="hl-tag">&lt;p&gt;</span>Welcome, <span class="hl-tag">&lt;span</span> <span class="hl-attr">bind</span>=<span class="hl-str">"result.user.name"</span><span class="hl-tag">&gt;&lt;/span&gt;</span>!<span class="hl-tag">&lt;/p&gt;</span>
<span class="hl-tag">&lt;/template&gt;</span>

<span class="hl-tag">&lt;template</span> <span class="hl-attr">id</span>=<span class="hl-str">"loginFail"</span> <span class="hl-attr">var</span>=<span class="hl-str">"error"</span><span class="hl-tag">&gt;</span>
  <span class="hl-tag">&lt;p&gt;</span>Error: <span class="hl-tag">&lt;span</span> <span class="hl-attr">bind</span>=<span class="hl-str">"error.message"</span><span class="hl-tag">&gt;&lt;/span&gt;&lt;/p&gt;</span>
<span class="hl-tag">&lt;/template&gt;</span></pre></div>
  </div>

  <div class="doc-section">
    <h2 class="doc-title" id="templates-slots" t="docs.templates.slots.title"></h2>
    <p class="doc-text" t="docs.templates.slots.text"></p>
    <div class="code-block"><pre><span class="hl-tag">&lt;template</span> <span class="hl-attr">id</span>=<span class="hl-str">"card"</span><span class="hl-tag">&gt;</span>
  <span class="hl-tag">&lt;div</span> <span class="hl-attr">class</span>=<span class="hl-str">"card"</span><span class="hl-tag">&gt;</span>
    <span class="hl-tag">&lt;div</span> <span class="hl-attr">class</span>=<span class="hl-str">"card-header"</span><span class="hl-tag">&gt;&lt;slot</span> <span class="hl-attr">name</span>=<span class="hl-str">"header"</span><span class="hl-tag">&gt;&lt;/slot&gt;&lt;/div&gt;</span>
    <span class="hl-tag">&lt;div</span> <span class="hl-attr">class</span>=<span class="hl-str">"card-body"</span><span class="hl-tag">&gt;&lt;slot&gt;&lt;/slot&gt;&lt;/div&gt;</span>
    <span class="hl-tag">&lt;div</span> <span class="hl-attr">class</span>=<span class="hl-str">"card-footer"</span><span class="hl-tag">&gt;&lt;slot</span> <span class="hl-attr">name</span>=<span class="hl-str">"footer"</span><span class="hl-tag">&gt;&lt;/slot&gt;&lt;/div&gt;</span>
  <span class="hl-tag">&lt;/div&gt;</span>
<span class="hl-tag">&lt;/template&gt;</span>

<span class="hl-cmt">&lt;!-- Usage --&gt;</span>
<span class="hl-tag">&lt;div</span> <span class="hl-attr">use</span>=<span class="hl-str">"card"</span><span class="hl-tag">&gt;</span>
  <span class="hl-tag">&lt;span</span> <span class="hl-attr">slot</span>=<span class="hl-str">"header"</span><span class="hl-tag">&gt;</span>My Title<span class="hl-tag">&lt;/span&gt;</span>
  <span class="hl-tag">&lt;p&gt;</span>Main content goes here<span class="hl-tag">&lt;/p&gt;</span>
  <span class="hl-tag">&lt;span</span> <span class="hl-attr">slot</span>=<span class="hl-str">"footer"</span><span class="hl-tag">&gt;</span>Footer info<span class="hl-tag">&lt;/span&gt;</span>
<span class="hl-tag">&lt;/div&gt;</span></pre></div>
  </div>

  <div class="doc-section">
    <h2 class="doc-title" id="templates-remote" t="docs.templates.remote.title"></h2>
    <p class="doc-text" t="docs.templates.remote.text"></p>
    <div class="code-block"><pre><span class="hl-tag">&lt;template</span> <span class="hl-attr">id</span>=<span class="hl-str">"header"</span> <span class="hl-attr">src</span>=<span class="hl-str">"/templates/header.html"</span><span class="hl-tag">&gt;&lt;/template&gt;</span>
<span class="hl-tag">&lt;template</span> <span class="hl-attr">id</span>=<span class="hl-str">"footer"</span> <span class="hl-attr">src</span>=<span class="hl-str">"/templates/footer.html"</span><span class="hl-tag">&gt;&lt;/template&gt;</span></pre></div>
  </div>

  <div class="doc-section">
    <h3 class="doc-subtitle" id="templates-recursive" t="docs.templates.recursive.subtitle"></h3>
    <p class="doc-text" t="docs.templates.recursive.text"></p>
    <div class="code-block"><pre><span class="hl-cmt">&lt;!-- main page --&gt;</span>
<span class="hl-tag">&lt;template</span> <span class="hl-attr">id</span>=<span class="hl-str">"layout"</span> <span class="hl-attr">src</span>=<span class="hl-str">"/templates/layout.html"</span><span class="hl-tag">&gt;&lt;/template&gt;</span>

<span class="hl-cmt">&lt;!-- /templates/layout.html can itself contain: --&gt;</span>
<span class="hl-tag">&lt;nav&gt;</span>
  <span class="hl-tag">&lt;template</span> <span class="hl-attr">src</span>=<span class="hl-str">"/templates/nav.html"</span><span class="hl-tag">&gt;&lt;/template&gt;</span>
<span class="hl-tag">&lt;/nav&gt;</span></pre></div>

    <h3 class="doc-subtitle" id="templates-remote-routes" t="docs.templates.remoteRoutes.subtitle"></h3>
    <p class="doc-text" t="docs.templates.remoteRoutes.text"></p>
  </div>

  <div class="doc-section">
    <h2 class="doc-title" id="templates-lazy" t="docs.templates.lazy.title"></h2>
    <p class="doc-text" t="docs.templates.lazy.text"></p>
    <table class="doc-table">
      <thead><tr><th t="docs.templates.lazy.col1"></th><th t="docs.templates.lazy.col2"></th></tr></thead>
      <tbody>
        <tr><td><em t="docs.templates.lazy.absent"></em></td><td t="docs.templates.lazy.absentDesc"></td></tr>
        <tr><td><code>lazy="priority"</code></td><td t="docs.templates.lazy.priorityDesc"></td></tr>
        <tr><td><code>lazy="ondemand"</code></td><td t="docs.templates.lazy.ondemandDesc"></td></tr>
      </tbody>
    </table>
    <h3 class="doc-subtitle" id="templates-phases" t="docs.templates.phases.subtitle"></h3>
    <p class="doc-text" t="docs.templates.phases.text"></p>
    <div class="code-block"><pre><span class="hl-cmt">&lt;!-- Default: loads in Phase 1, perfect for content includes --&gt;</span>
<span class="hl-tag">&lt;template</span> <span class="hl-attr">src</span>=<span class="hl-str">"./components/header.tpl"</span><span class="hl-tag">&gt;&lt;/template&gt;</span>

<span class="hl-cmt">&lt;!-- Priority: loads before everything, guaranteed first --&gt;</span>
<span class="hl-tag">&lt;template</span> <span class="hl-attr">src</span>=<span class="hl-str">"./components/critical-layout.tpl"</span> <span class="hl-attr">lazy</span>=<span class="hl-str">"priority"</span><span class="hl-tag">&gt;&lt;/template&gt;</span>

<span class="hl-cmt">&lt;!-- Default route (auto Phase 1), no lazy needed --&gt;</span>
<span class="hl-tag">&lt;template</span> <span class="hl-attr">route</span>=<span class="hl-str">"/"</span> <span class="hl-attr">src</span>=<span class="hl-str">"./pages/home.tpl"</span><span class="hl-tag">&gt;&lt;/template&gt;</span>

<span class="hl-cmt">&lt;!-- Auto Phase 2: preloaded in background after first render --&gt;</span>
<span class="hl-tag">&lt;template</span> <span class="hl-attr">route</span>=<span class="hl-str">"/about"</span> <span class="hl-attr">src</span>=<span class="hl-str">"./pages/about.tpl"</span><span class="hl-tag">&gt;&lt;/template&gt;</span>

<span class="hl-cmt">&lt;!-- On demand: only fetched when user navigates to /heavy-page --&gt;</span>
<span class="hl-tag">&lt;template</span> <span class="hl-attr">route</span>=<span class="hl-str">"/heavy-page"</span> <span class="hl-attr">src</span>=<span class="hl-str">"./pages/heavy.tpl"</span> <span class="hl-attr">lazy</span>=<span class="hl-str">"ondemand"</span><span class="hl-tag">&gt;&lt;/template&gt;</span></pre></div>
  </div>

  <div class="doc-section">
    <h2 class="doc-title" id="templates-loading" t="docs.templates.loading.title"></h2>
    <p class="doc-text" t="docs.templates.loading.text1"></p>
    <div class="code-block"><pre><span class="hl-tag">&lt;template</span> <span class="hl-attr">src</span>=<span class="hl-str">"./dashboard.tpl"</span> <span class="hl-attr">loading</span>=<span class="hl-str">"#spinner"</span><span class="hl-tag">&gt;&lt;/template&gt;</span>

<span class="hl-tag">&lt;template</span> <span class="hl-attr">id</span>=<span class="hl-str">"spinner"</span><span class="hl-tag">&gt;</span>
  <span class="hl-tag">&lt;div</span> <span class="hl-attr">class</span>=<span class="hl-str">"skeleton"</span><span class="hl-tag">&gt;</span>Loading...<span class="hl-tag">&lt;/div&gt;</span>
<span class="hl-tag">&lt;/template&gt;</span></pre></div>
    <p class="doc-text" t="docs.templates.loading.text2"></p>
    <div class="code-block"><pre><span class="hl-tag">&lt;template</span> <span class="hl-attr">src</span>=<span class="hl-str">"./section-a.tpl"</span> <span class="hl-attr">loading</span>=<span class="hl-str">"#page-skeleton"</span><span class="hl-tag">&gt;&lt;/template&gt;</span>
<span class="hl-tag">&lt;template</span> <span class="hl-attr">src</span>=<span class="hl-str">"./section-b.tpl"</span> <span class="hl-attr">loading</span>=<span class="hl-str">"#page-skeleton"</span><span class="hl-tag">&gt;&lt;/template&gt;</span>
<span class="hl-tag">&lt;template</span> <span class="hl-attr">src</span>=<span class="hl-str">"./section-c.tpl"</span> <span class="hl-attr">loading</span>=<span class="hl-str">"#page-skeleton"</span><span class="hl-tag">&gt;&lt;/template&gt;</span>

<span class="hl-tag">&lt;template</span> <span class="hl-attr">id</span>=<span class="hl-str">"page-skeleton"</span><span class="hl-tag">&gt;</span>
  <span class="hl-tag">&lt;div</span> <span class="hl-attr">class</span>=<span class="hl-str">"skeleton"</span><span class="hl-tag">&gt;&lt;/div&gt;</span>
<span class="hl-tag">&lt;/template&gt;</span></pre></div>
  </div>

  <div class="doc-section">
    <h2 class="doc-title" id="templates-include" t="docs.templates.include.title"></h2>
    <p class="doc-text" t="docs.templates.include.text1"></p>
    <div class="code-block"><pre><span class="hl-tag">&lt;template</span> <span class="hl-attr">include</span>=<span class="hl-str">"#icon-set"</span><span class="hl-tag">&gt;&lt;/template&gt;</span>

<span class="hl-tag">&lt;template</span> <span class="hl-attr">id</span>=<span class="hl-str">"icon-set"</span><span class="hl-tag">&gt;</span>
  <span class="hl-tag">&lt;svg</span> <span class="hl-attr">hidden</span><span class="hl-tag">&gt;</span>...<span class="hl-tag">&lt;/svg&gt;</span>
<span class="hl-tag">&lt;/template&gt;</span></pre></div>
    <p class="doc-text" t="docs.templates.include.text2"></p>
  </div>

</div>

