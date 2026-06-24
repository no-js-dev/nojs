<!-- Routing — from routing.md -->

<div class="doc-content">

  <!-- Route Definition -->
  <div class="doc-section">
    <h2 class="doc-title" id="routing-definition" t="docs.routing.definition.title"></h2>
    <div class="code-block"><pre><span class="hl-tag">&lt;body&gt;</span>
  <span class="hl-tag">&lt;nav&gt;</span>
    <span class="hl-tag">&lt;a</span> <span class="hl-attr">route</span>=<span class="hl-str">"/"</span><span class="hl-tag">&gt;</span>Home<span class="hl-tag">&lt;/a&gt;</span>
    <span class="hl-tag">&lt;a</span> <span class="hl-attr">route</span>=<span class="hl-str">"/about"</span><span class="hl-tag">&gt;</span>About<span class="hl-tag">&lt;/a&gt;</span>
    <span class="hl-tag">&lt;a</span> <span class="hl-attr">route</span>=<span class="hl-str">"/users"</span><span class="hl-tag">&gt;</span>Users<span class="hl-tag">&lt;/a&gt;</span>
    <span class="hl-tag">&lt;a</span> <span class="hl-attr">route</span>=<span class="hl-str">"/users/:id"</span><span class="hl-tag">&gt;</span>User Detail<span class="hl-tag">&lt;/a&gt;</span>
  <span class="hl-tag">&lt;/nav&gt;</span>

  <span class="hl-cmt">&lt;!-- This is where route content renders --&gt;</span>
  <span class="hl-tag">&lt;main</span> <span class="hl-attr">route-view</span><span class="hl-tag">&gt;&lt;/main&gt;</span>

  <span class="hl-cmt">&lt;!-- Route templates --&gt;</span>
  <span class="hl-tag">&lt;template</span> <span class="hl-attr">route</span>=<span class="hl-str">"/"</span> <span class="hl-attr">id</span>=<span class="hl-str">"homePage"</span><span class="hl-tag">&gt;</span>
    <span class="hl-tag">&lt;h1&gt;</span>Home<span class="hl-tag">&lt;/h1&gt;</span>
    <span class="hl-tag">&lt;p&gt;</span>Welcome to No.JS<span class="hl-tag">&lt;/p&gt;</span>
  <span class="hl-tag">&lt;/template&gt;</span>

  <span class="hl-tag">&lt;template</span> <span class="hl-attr">route</span>=<span class="hl-str">"/users"</span> <span class="hl-attr">id</span>=<span class="hl-str">"usersPage"</span><span class="hl-tag">&gt;</span>
    <span class="hl-tag">&lt;div</span> <span class="hl-attr">get</span>=<span class="hl-str">"/api/users"</span> <span class="hl-attr">as</span>=<span class="hl-str">"users"</span><span class="hl-tag">&gt;</span>
      <span class="hl-tag">&lt;div</span> <span class="hl-attr">each</span>=<span class="hl-str">"user in users"</span> <span class="hl-attr">template</span>=<span class="hl-str">"userLink"</span><span class="hl-tag">&gt;&lt;/div&gt;</span>
    <span class="hl-tag">&lt;/div&gt;</span>
  <span class="hl-tag">&lt;/template&gt;</span>

  <span class="hl-tag">&lt;template</span> <span class="hl-attr">route</span>=<span class="hl-str">"/users/:id"</span> <span class="hl-attr">id</span>=<span class="hl-str">"userDetail"</span><span class="hl-tag">&gt;</span>
    <span class="hl-tag">&lt;div</span> <span class="hl-attr">get</span>=<span class="hl-str">"/api/users/{$route.params.id}"</span> <span class="hl-attr">as</span>=<span class="hl-str">"user"</span><span class="hl-tag">&gt;</span>
      <span class="hl-tag">&lt;h1</span> <span class="hl-attr">bind</span>=<span class="hl-str">"user.name"</span><span class="hl-tag">&gt;&lt;/h1&gt;</span>
    <span class="hl-tag">&lt;/div&gt;</span>
  <span class="hl-tag">&lt;/template&gt;</span>
<span class="hl-tag">&lt;/body&gt;</span></pre></div>
  </div>

  <!-- Route Parameters & Query -->
  <div class="doc-section">
    <h2 class="doc-title" id="routing-params" t="docs.routing.params.title" t-html></h2>
    <div class="code-block"><pre><span class="hl-cmt">&lt;!-- Params: /users/42 --&gt;</span>
<span class="hl-tag">&lt;template</span> <span class="hl-attr">route</span>=<span class="hl-str">"/users/:id"</span><span class="hl-tag">&gt;</span>
  <span class="hl-tag">&lt;span</span> <span class="hl-attr">bind</span>=<span class="hl-str">"$route.params.id"</span><span class="hl-tag">&gt;&lt;/span&gt;</span>    <span class="hl-cmt">&lt;!-- "42" --&gt;</span>
<span class="hl-tag">&lt;/template&gt;</span>

<span class="hl-cmt">&lt;!-- Query: /search?q=hello&amp;page=2 --&gt;</span>
<span class="hl-tag">&lt;template</span> <span class="hl-attr">route</span>=<span class="hl-str">"/search"</span><span class="hl-tag">&gt;</span>
  <span class="hl-tag">&lt;span</span> <span class="hl-attr">bind</span>=<span class="hl-str">"$route.query.q"</span><span class="hl-tag">&gt;&lt;/span&gt;</span>      <span class="hl-cmt">&lt;!-- "hello" --&gt;</span>
  <span class="hl-tag">&lt;span</span> <span class="hl-attr">bind</span>=<span class="hl-str">"$route.query.page"</span><span class="hl-tag">&gt;&lt;/span&gt;</span>   <span class="hl-cmt">&lt;!-- "2" --&gt;</span>
<span class="hl-tag">&lt;/template&gt;</span></pre></div>
  </div>

  <!-- $route Context -->
  <div class="doc-section">
    <h2 class="doc-title" id="routing-context" t="docs.routing.context.title"></h2>
    <table class="doc-table">
      <thead><tr><th t="docs.routing.context.col1"></th><th t="docs.routing.context.col2"></th></tr></thead>
      <tbody>
        <tr><td><code>$route.path</code></td><td t="docs.routing.context.path"></td></tr>
        <tr><td><code>$route.params</code></td><td t="docs.routing.context.params"></td></tr>
        <tr><td><code>$route.query</code></td><td t="docs.routing.context.query"></td></tr>
        <tr><td><code>$route.hash</code></td><td t="docs.routing.context.hash"></td></tr>
        <tr><td><code>$route.matched</code></td><td t="docs.routing.context.matched"></td></tr>
      </tbody>
    </table>
  </div>

  <!-- Active Route Styling -->
  <div class="doc-section">
    <h2 class="doc-title" id="routing-active-style" t="docs.routing.activeStyle.title"></h2>
    <div class="code-block"><pre><span class="hl-tag">&lt;a</span> <span class="hl-attr">route</span>=<span class="hl-str">"/"</span> <span class="hl-attr">route-active</span>=<span class="hl-str">"active"</span><span class="hl-tag">&gt;</span>Home<span class="hl-tag">&lt;/a&gt;</span>
<span class="hl-tag">&lt;a</span> <span class="hl-attr">route</span>=<span class="hl-str">"/about"</span> <span class="hl-attr">route-active</span>=<span class="hl-str">"active"</span><span class="hl-tag">&gt;</span>About<span class="hl-tag">&lt;/a&gt;</span>

<span class="hl-cmt">&lt;!-- Exact match only (won't match /users/123) --&gt;</span>
<span class="hl-tag">&lt;a</span> <span class="hl-attr">route</span>=<span class="hl-str">"/users"</span> <span class="hl-attr">route-active-exact</span>=<span class="hl-str">"active"</span><span class="hl-tag">&gt;</span>Users<span class="hl-tag">&lt;/a&gt;</span></pre></div>
  </div>

  <!-- Route Guards -->
  <div class="doc-section">
    <h2 class="doc-title" id="routing-guards" t="docs.routing.guards.title"></h2>
    <div class="code-block"><pre><span class="hl-cmt">&lt;!-- Redirect if not authenticated --&gt;</span>
<span class="hl-tag">&lt;template</span> <span class="hl-attr">route</span>=<span class="hl-str">"/dashboard"</span>
          <span class="hl-attr">guard</span>=<span class="hl-str">"$store.auth.user"</span>
          <span class="hl-attr">redirect</span>=<span class="hl-str">"/login"</span><span class="hl-tag">&gt;</span>
  <span class="hl-tag">&lt;h1&gt;</span>Dashboard<span class="hl-tag">&lt;/h1&gt;</span>
<span class="hl-tag">&lt;/template&gt;</span>

<span class="hl-cmt">&lt;!-- Redirect if already logged in --&gt;</span>
<span class="hl-tag">&lt;template</span> <span class="hl-attr">route</span>=<span class="hl-str">"/login"</span>
          <span class="hl-attr">guard</span>=<span class="hl-str">"!$store.auth.user"</span>
          <span class="hl-attr">redirect</span>=<span class="hl-str">"/dashboard"</span><span class="hl-tag">&gt;</span>
  <span class="hl-tag">&lt;form</span> <span class="hl-attr">post</span>=<span class="hl-str">"/api/login"</span><span class="hl-tag">&gt;</span>...<span class="hl-tag">&lt;/form&gt;</span>
<span class="hl-tag">&lt;/template&gt;</span></pre></div>
  </div>

  <!-- Programmatic Navigation -->
  <div class="doc-section">
    <h2 class="doc-title" id="routing-programmatic" t="docs.routing.programmatic.title"></h2>
    <div class="code-block"><pre><span class="hl-tag">&lt;button</span> <span class="hl-attr">on:click</span>=<span class="hl-str">"$router.push('/users/42')"</span><span class="hl-tag">&gt;</span>Go to User<span class="hl-tag">&lt;/button&gt;</span>
<span class="hl-tag">&lt;button</span> <span class="hl-attr">on:click</span>=<span class="hl-str">"$router.back()"</span><span class="hl-tag">&gt;</span>Go Back<span class="hl-tag">&lt;/button&gt;</span>
<span class="hl-tag">&lt;button</span> <span class="hl-attr">on:click</span>=<span class="hl-str">"$router.replace('/new-path')"</span><span class="hl-tag">&gt;</span>Replace<span class="hl-tag">&lt;/button&gt;</span>
<span class="hl-tag">&lt;button</span> <span class="hl-attr">on:click</span>=<span class="hl-str">"$router.forward()"</span><span class="hl-tag">&gt;</span>Go Forward<span class="hl-tag">&lt;/button&gt;</span></pre></div>
    <div class="callout">
      <p t="docs.routing.programmatic.callout"></p>
    </div>
    <div class="code-block"><pre highlight>&lt;script&gt;
  await NoJS.router.push('/dashboard');
&lt;/script&gt;</pre></div>
  </div>

  <!-- Nested Routes -->
  <div class="doc-section">
    <h2 class="doc-title" id="routing-nested" t="docs.routing.nested.title"></h2>
    <div class="code-block"><pre><span class="hl-tag">&lt;template</span> <span class="hl-attr">route</span>=<span class="hl-str">"/settings"</span> <span class="hl-attr">id</span>=<span class="hl-str">"settingsPage"</span><span class="hl-tag">&gt;</span>
  <span class="hl-tag">&lt;nav&gt;</span>
    <span class="hl-tag">&lt;a</span> <span class="hl-attr">route</span>=<span class="hl-str">"/settings/profile"</span><span class="hl-tag">&gt;</span>Profile<span class="hl-tag">&lt;/a&gt;</span>
    <span class="hl-tag">&lt;a</span> <span class="hl-attr">route</span>=<span class="hl-str">"/settings/security"</span><span class="hl-tag">&gt;</span>Security<span class="hl-tag">&lt;/a&gt;</span>
  <span class="hl-tag">&lt;/nav&gt;</span>
  <span class="hl-tag">&lt;div</span> <span class="hl-attr">route-view</span><span class="hl-tag">&gt;&lt;/div&gt;</span>  <span class="hl-cmt">&lt;!-- Nested route content renders here --&gt;</span>
<span class="hl-tag">&lt;/template&gt;</span>

<span class="hl-tag">&lt;template</span> <span class="hl-attr">route</span>=<span class="hl-str">"/settings/profile"</span><span class="hl-tag">&gt;</span>
  <span class="hl-tag">&lt;h2&gt;</span>Profile Settings<span class="hl-tag">&lt;/h2&gt;</span>
<span class="hl-tag">&lt;/template&gt;</span>

<span class="hl-tag">&lt;template</span> <span class="hl-attr">route</span>=<span class="hl-str">"/settings/security"</span><span class="hl-tag">&gt;</span>
  <span class="hl-tag">&lt;h2&gt;</span>Security Settings<span class="hl-tag">&lt;/h2&gt;</span>
<span class="hl-tag">&lt;/template&gt;</span></pre></div>
  </div>

  <!-- Remote Templates in Routes -->
  <div class="doc-section">
    <h2 class="doc-title" id="routing-remote-templates" t="docs.routing.remoteTemplates.title"></h2>
    <p class="doc-text" t="docs.routing.remoteTemplates.text1"></p>
    <div class="code-block"><pre><span class="hl-tag">&lt;template</span> <span class="hl-attr">route</span>=<span class="hl-str">"/dashboard"</span><span class="hl-tag">&gt;</span>
  <span class="hl-tag">&lt;template</span> <span class="hl-attr">src</span>=<span class="hl-str">"/partials/dash-header.html"</span><span class="hl-tag">&gt;&lt;/template&gt;</span>
  <span class="hl-tag">&lt;template</span> <span class="hl-attr">src</span>=<span class="hl-str">"/partials/dash-stats.html"</span><span class="hl-tag">&gt;&lt;/template&gt;</span>
  <span class="hl-tag">&lt;p&gt;</span>Dashboard content<span class="hl-tag">&lt;/p&gt;</span>
<span class="hl-tag">&lt;/template&gt;</span></pre></div>
    <p class="doc-text" t="docs.routing.remoteTemplates.text2"></p>
  </div>

  <!-- File-Based Routing -->
  <div class="doc-section">
    <h2 class="doc-title" id="routing-file-based" t="docs.routing.fileBased.title"></h2>
    <p class="doc-text" t="docs.routing.fileBased.text"></p>
    <div class="code-block"><pre><span class="hl-cmt">&lt;!-- Traditional (explicit) routing --&gt;</span>
<span class="hl-tag">&lt;template</span> <span class="hl-attr">route</span>=<span class="hl-str">"/"</span> <span class="hl-attr">src</span>=<span class="hl-str">"./pages/overview.tpl"</span><span class="hl-tag">&gt;&lt;/template&gt;</span>
<span class="hl-tag">&lt;template</span> <span class="hl-attr">route</span>=<span class="hl-str">"/analytics"</span> <span class="hl-attr">src</span>=<span class="hl-str">"./pages/analytics.tpl"</span><span class="hl-tag">&gt;&lt;/template&gt;</span>
<span class="hl-tag">&lt;template</span> <span class="hl-attr">route</span>=<span class="hl-str">"/users"</span> <span class="hl-attr">src</span>=<span class="hl-str">"./pages/users.tpl"</span><span class="hl-tag">&gt;&lt;/template&gt;</span>

<span class="hl-cmt">&lt;!-- File-based routing &mdash; one line replaces all of the above! --&gt;</span>
<span class="hl-tag">&lt;main</span> <span class="hl-attr">route-view</span> <span class="hl-attr">src</span>=<span class="hl-str">"./pages/"</span> <span class="hl-attr">route-index</span>=<span class="hl-str">"overview"</span><span class="hl-tag">&gt;&lt;/main&gt;</span></pre></div>
    <h3 class="doc-subtitle" id="routing-file-based-how-it-works" t="docs.routing.fileBased.howItWorks"></h3>
    <ol class="doc-list">
      <li t="docs.routing.fileBased.list1"></li>
      <li t="docs.routing.fileBased.list2"></li>
      <li t="docs.routing.fileBased.list3"></li>
    </ol>
    <h3 class="doc-subtitle" id="routing-file-based-attributes" t="docs.routing.fileBased.attributesTitle"></h3>
    <table class="doc-table">
      <thead><tr><th t="docs.routing.fileBased.colAttr"></th><th t="docs.routing.fileBased.colDefault"></th><th t="docs.routing.fileBased.colDesc"></th></tr></thead>
      <tbody>
        <tr><td><code>src</code></td><td><code>"pages"</code></td><td t="docs.routing.fileBased.srcDesc"></td></tr>
        <tr><td><code>route-index</code></td><td><code>"index"</code></td><td t="docs.routing.fileBased.routeIndexDesc"></td></tr>
        <tr><td><code>ext</code></td><td><code>".tpl"</code></td><td t="docs.routing.fileBased.extDesc"></td></tr>
        <tr><td><code>i18n-ns</code></td><td>&mdash;</td><td t="docs.routing.fileBased.i18nNsDesc"></td></tr>
      </tbody>
    </table>
    <div class="callout">
      <p t="docs.routing.fileBased.callout"></p>
    </div>
    <h3 class="doc-subtitle" id="routing-file-based-example" t="docs.routing.fileBased.exampleTitle"></h3>
    <div class="code-block"><pre><span class="hl-cmt">pages/</span>
<span class="hl-cmt">├── overview.tpl    ← /</span>
<span class="hl-cmt">├── analytics.tpl   ← /analytics</span>
<span class="hl-cmt">├── users.tpl       ← /users</span>
<span class="hl-cmt">├── revenue.tpl     ← /revenue</span>
<span class="hl-cmt">├── billing.tpl     ← /billing</span>
<span class="hl-cmt">└── settings.tpl    ← /settings</span></pre></div>
    <div class="code-block"><pre><span class="hl-tag">&lt;template</span> <span class="hl-attr">src</span>=<span class="hl-str">"./components/sidebar.tpl"</span><span class="hl-tag">&gt;&lt;/template&gt;</span>

<span class="hl-tag">&lt;main</span> <span class="hl-attr">route-view</span> <span class="hl-attr">src</span>=<span class="hl-str">"./pages/"</span> <span class="hl-attr">route-index</span>=<span class="hl-str">"overview"</span><span class="hl-tag">&gt;&lt;/main&gt;</span></pre></div>
    <p class="doc-text" t="docs.routing.fileBased.exampleText"></p>
    <h3 class="doc-subtitle" id="routing-file-based-mixing" t="docs.routing.fileBased.mixingTitle"></h3>
    <p class="doc-text" t="docs.routing.fileBased.mixingText"></p>
    <div class="code-block"><pre><span class="hl-cmt">&lt;!-- File-based routing handles most pages automatically --&gt;</span>
<span class="hl-tag">&lt;main</span> <span class="hl-attr">route-view</span> <span class="hl-attr">src</span>=<span class="hl-str">"./pages/"</span><span class="hl-tag">&gt;&lt;/main&gt;</span>

<span class="hl-cmt">&lt;!-- Explicit route for param-based pages --&gt;</span>
<span class="hl-tag">&lt;template</span> <span class="hl-attr">route</span>=<span class="hl-str">"/users/:id"</span> <span class="hl-attr">src</span>=<span class="hl-str">"./pages/user-detail.tpl"</span><span class="hl-tag">&gt;&lt;/template&gt;</span>

<span class="hl-cmt">&lt;!-- Explicit route with guard --&gt;</span>
<span class="hl-tag">&lt;template</span> <span class="hl-attr">route</span>=<span class="hl-str">"/admin"</span> <span class="hl-attr">src</span>=<span class="hl-str">"./pages/admin.tpl"</span>
          <span class="hl-attr">guard</span>=<span class="hl-str">"$store.auth.isAdmin"</span> <span class="hl-attr">redirect</span>=<span class="hl-str">"/"</span><span class="hl-tag">&gt;&lt;/template&gt;</span></pre></div>
    <h3 class="doc-subtitle" id="routing-file-based-auto-i18n" t="docs.routing.fileBased.autoI18nTitle"></h3>
    <p class="doc-text" t="docs.routing.fileBased.autoI18nText"></p>
    <div class="code-block"><pre><span class="hl-cmt">&lt;!-- Auto-derives namespace: "/" &rarr; "landing", "/features" &rarr; "features", etc. --&gt;</span>
<span class="hl-tag">&lt;main</span> <span class="hl-attr">route-view</span> <span class="hl-attr">src</span>=<span class="hl-str">"templates/"</span> <span class="hl-attr">route-index</span>=<span class="hl-str">"landing"</span> <span class="hl-attr">i18n-ns</span><span class="hl-tag">&gt;&lt;/main&gt;</span></pre></div>
    <p class="doc-text" t="docs.routing.fileBased.autoI18nText2"></p>
  </div>

  <!-- Lazy Template Loading -->
  <div class="doc-section">
    <h2 class="doc-title" id="routing-lazy-loading" t="docs.routing.lazyLoading.title"></h2>
    <p class="doc-text" t="docs.routing.lazyLoading.text"></p>
    <table class="doc-table">
      <thead><tr><th t="docs.routing.lazyLoading.col1"></th><th t="docs.routing.lazyLoading.col2"></th><th t="docs.routing.lazyLoading.col3"></th></tr></thead>
      <tbody>
        <tr><td><em t="docs.routing.lazyLoading.absent"></em></td><td t="docs.routing.lazyLoading.absentPhase"></td><td t="docs.routing.lazyLoading.absentDesc"></td></tr>
        <tr><td><code>lazy="priority"</code></td><td t="docs.routing.lazyLoading.priorityPhase"></td><td t="docs.routing.lazyLoading.priorityDesc"></td></tr>
        <tr><td><code>lazy="ondemand"</code></td><td t="docs.routing.lazyLoading.ondemandPhase"></td><td t="docs.routing.lazyLoading.ondemandDesc"></td></tr>
      </tbody>
    </table>
    <div class="code-block"><pre><span class="hl-cmt">&lt;!-- Priority: fetched first, before any other template --&gt;</span>
<span class="hl-tag">&lt;template</span> <span class="hl-attr">src</span>=<span class="hl-str">"./components/critical-layout.tpl"</span> <span class="hl-attr">lazy</span>=<span class="hl-str">"priority"</span><span class="hl-tag">&gt;&lt;/template&gt;</span>

<span class="hl-cmt">&lt;!-- Default route (auto Phase 1) — no lazy attribute needed --&gt;</span>
<span class="hl-tag">&lt;template</span> <span class="hl-attr">route</span>=<span class="hl-str">"/"</span> <span class="hl-attr">src</span>=<span class="hl-str">"./pages/home.tpl"</span><span class="hl-tag">&gt;&lt;/template&gt;</span>

<span class="hl-cmt">&lt;!-- Auto Phase 2: preloaded in background after first render --&gt;</span>
<span class="hl-tag">&lt;template</span> <span class="hl-attr">route</span>=<span class="hl-str">"/about"</span> <span class="hl-attr">src</span>=<span class="hl-str">"./pages/about.tpl"</span><span class="hl-tag">&gt;&lt;/template&gt;</span>

<span class="hl-cmt">&lt;!-- On demand: fetched only when user first navigates here --&gt;</span>
<span class="hl-tag">&lt;template</span> <span class="hl-attr">route</span>=<span class="hl-str">"/heavy-page"</span> <span class="hl-attr">src</span>=<span class="hl-str">"./pages/heavy.tpl"</span> <span class="hl-attr">lazy</span>=<span class="hl-str">"ondemand"</span><span class="hl-tag">&gt;&lt;/template&gt;</span></pre></div>
  </div>

  <!-- Anchor Links in Hash Mode -->
  <div class="doc-section">
    <h2 class="doc-title" id="routing-anchor" t="docs.routing.anchor.title"></h2>
    <p class="doc-text" t="docs.routing.anchor.text1"></p>
    <p class="doc-text" t="docs.routing.anchor.text2"></p>
    <div class="code-block"><pre><span class="hl-cmt">&lt;!-- These work in hash mode &mdash; no special attributes needed --&gt;</span>
<span class="hl-tag">&lt;nav&gt;</span>
  <span class="hl-tag">&lt;a</span> <span class="hl-attr">href</span>=<span class="hl-str">"#introduction"</span><span class="hl-tag">&gt;</span>Introduction<span class="hl-tag">&lt;/a&gt;</span>
  <span class="hl-tag">&lt;a</span> <span class="hl-attr">href</span>=<span class="hl-str">"#getting-started"</span><span class="hl-tag">&gt;</span>Getting Started<span class="hl-tag">&lt;/a&gt;</span>
  <span class="hl-tag">&lt;a</span> <span class="hl-attr">href</span>=<span class="hl-str">"#api"</span><span class="hl-tag">&gt;</span>API Reference<span class="hl-tag">&lt;/a&gt;</span>
<span class="hl-tag">&lt;/nav&gt;</span>

<span class="hl-tag">&lt;div</span> <span class="hl-attr">id</span>=<span class="hl-str">"introduction"</span><span class="hl-tag">&gt;</span>
  <span class="hl-tag">&lt;h2&gt;</span>Introduction<span class="hl-tag">&lt;/h2&gt;</span>
<span class="hl-tag">&lt;/div&gt;</span>

<span class="hl-tag">&lt;div</span> <span class="hl-attr">id</span>=<span class="hl-str">"getting-started"</span><span class="hl-tag">&gt;</span>
  <span class="hl-tag">&lt;h2&gt;</span>Getting Started<span class="hl-tag">&lt;/h2&gt;</span>
<span class="hl-tag">&lt;/div&gt;</span>

<span class="hl-tag">&lt;div</span> <span class="hl-attr">id</span>=<span class="hl-str">"api"</span><span class="hl-tag">&gt;</span>
  <span class="hl-tag">&lt;h2&gt;</span>API Reference<span class="hl-tag">&lt;/h2&gt;</span>
<span class="hl-tag">&lt;/div&gt;</span></pre></div>
    <p class="doc-text" t="docs.routing.anchor.howItWorks"></p>
    <ul class="doc-list">
      <li t="docs.routing.anchor.list1"></li>
      <li t="docs.routing.anchor.list2"></li>
      <li t="docs.routing.anchor.list3"></li>
      <li t="docs.routing.anchor.list4"></li>
    </ul>
    <div class="callout">
      <p t="docs.routing.anchor.tip"></p>
    </div>
  </div>

  <!-- Named Outlets (route-view) -->
  <div class="doc-section">
    <h2 class="doc-title" id="routing-named-outlets" t="docs.routing.namedOutlets.title"></h2>
    <p class="doc-text" t="docs.routing.namedOutlets.text"></p>
    <div class="code-block"><pre><span class="hl-cmt">&lt;!-- Layout with named outlets --&gt;</span>
<span class="hl-tag">&lt;main</span> <span class="hl-attr">route-view</span><span class="hl-tag">&gt;&lt;/main&gt;</span>            <span class="hl-cmt">&lt;!-- "default" outlet --&gt;</span>
<span class="hl-tag">&lt;aside</span> <span class="hl-attr">route-view</span>=<span class="hl-str">"sidebar"</span><span class="hl-tag">&gt;&lt;/aside&gt;</span>
<span class="hl-tag">&lt;header</span> <span class="hl-attr">route-view</span>=<span class="hl-str">"topbar"</span><span class="hl-tag">&gt;&lt;/header&gt;</span>

<span class="hl-cmt">&lt;!-- /home fills all three outlets --&gt;</span>
<span class="hl-tag">&lt;template</span> <span class="hl-attr">route</span>=<span class="hl-str">"/home"</span><span class="hl-tag">&gt;</span>
  <span class="hl-tag">&lt;h1&gt;</span>Home page<span class="hl-tag">&lt;/h1&gt;</span>
<span class="hl-tag">&lt;/template&gt;</span>

<span class="hl-tag">&lt;template</span> <span class="hl-attr">route</span>=<span class="hl-str">"/home"</span> <span class="hl-attr">outlet</span>=<span class="hl-str">"sidebar"</span><span class="hl-tag">&gt;</span>
  <span class="hl-tag">&lt;nav&gt;</span>Home navigation<span class="hl-tag">&lt;/nav&gt;</span>
<span class="hl-tag">&lt;/template&gt;</span>

<span class="hl-tag">&lt;template</span> <span class="hl-attr">route</span>=<span class="hl-str">"/home"</span> <span class="hl-attr">outlet</span>=<span class="hl-str">"topbar"</span><span class="hl-tag">&gt;</span>
  <span class="hl-tag">&lt;span&gt;</span>Home breadcrumb<span class="hl-tag">&lt;/span&gt;</span>
<span class="hl-tag">&lt;/template&gt;</span>

<span class="hl-cmt">&lt;!-- /about only fills default; sidebar and topbar are cleared --&gt;</span>
<span class="hl-tag">&lt;template</span> <span class="hl-attr">route</span>=<span class="hl-str">"/about"</span><span class="hl-tag">&gt;</span>
  <span class="hl-tag">&lt;h1&gt;</span>About us<span class="hl-tag">&lt;/h1&gt;</span>
<span class="hl-tag">&lt;/template&gt;</span></pre></div>
    <div class="callout">
      <p t="docs.routing.namedOutlets.callout"></p>
    </div>
  </div>

  <!-- 404 / Catch-All Routes -->
  <div class="doc-section">
    <h2 class="doc-title" id="routing-catch-all" t="docs.routing.catchAll.title"></h2>
    <p class="doc-text" t="docs.routing.catchAll.text" t-html></p>
    <div class="code-block"><pre><span class="hl-tag">&lt;template</span> <span class="hl-attr">route</span>=<span class="hl-str">"*"</span><span class="hl-tag">&gt;</span>
  <span class="hl-tag">&lt;h1&gt;</span>404 &mdash; Page Not Found<span class="hl-tag">&lt;/h1&gt;</span>
  <span class="hl-tag">&lt;p&gt;</span>The page <span class="hl-tag">&lt;code</span> <span class="hl-attr">bind</span>=<span class="hl-str">"$route.path"</span><span class="hl-tag">&gt;&lt;/code&gt;</span> does not exist.<span class="hl-tag">&lt;/p&gt;</span>
  <span class="hl-tag">&lt;a</span> <span class="hl-attr">route</span>=<span class="hl-str">"/"</span><span class="hl-tag">&gt;</span>Go Home<span class="hl-tag">&lt;/a&gt;</span>
<span class="hl-tag">&lt;/template&gt;</span></pre></div>
    <p class="doc-text" t="docs.routing.catchAll.text2" t-html></p>

    <!-- Automatic 404 Fallback -->
    <h3 class="doc-subtitle" id="routing-catch-all-fallback" t="docs.routing.catchAll.fallbackTitle"></h3>
    <p class="doc-text" t="docs.routing.catchAll.fallbackText" t-html></p>
    <div class="callout">
      <p t="docs.routing.catchAll.fallbackTip" t-html></p>
    </div>

    <!-- Named Outlet Wildcards -->
    <h3 class="doc-subtitle" id="routing-catch-all-named" t="docs.routing.catchAll.namedTitle"></h3>
    <p class="doc-text" t="docs.routing.catchAll.namedText"></p>
    <ol class="doc-list">
      <li t="docs.routing.catchAll.namedList1" t-html></li>
      <li t="docs.routing.catchAll.namedList2" t-html></li>
      <li t="docs.routing.catchAll.namedList3" t-html></li>
    </ol>
    <div class="code-block"><pre><span class="hl-cmt">&lt;!-- Global wildcard (default outlet) --&gt;</span>
<span class="hl-tag">&lt;template</span> <span class="hl-attr">route</span>=<span class="hl-str">"*"</span><span class="hl-tag">&gt;</span>
  <span class="hl-tag">&lt;h1&gt;</span>404<span class="hl-tag">&lt;/h1&gt;</span>
<span class="hl-tag">&lt;/template&gt;</span>

<span class="hl-cmt">&lt;!-- Sidebar-specific wildcard --&gt;</span>
<span class="hl-tag">&lt;template</span> <span class="hl-attr">route</span>=<span class="hl-str">"*"</span> <span class="hl-attr">outlet</span>=<span class="hl-str">"sidebar"</span><span class="hl-tag">&gt;</span>
  <span class="hl-tag">&lt;p&gt;</span>No sidebar for this page<span class="hl-tag">&lt;/p&gt;</span>
<span class="hl-tag">&lt;/template&gt;</span></pre></div>
    <p class="doc-text" t="docs.routing.catchAll.namedText2" t-html></p>

    <!-- $route.matched -->
    <h3 class="doc-subtitle" id="routing-catch-all-matched" t="docs.routing.catchAll.matchedTitle"></h3>
    <p class="doc-text" t="docs.routing.catchAll.matchedText" t-html></p>
    <div class="code-block"><pre><span class="hl-tag">&lt;div</span> <span class="hl-attr">show</span>=<span class="hl-str">"!$route.matched"</span><span class="hl-tag">&gt;</span>
  <span class="hl-tag">&lt;p&gt;</span>You seem lost!<span class="hl-tag">&lt;/p&gt;</span>
<span class="hl-tag">&lt;/div&gt;</span></pre></div>
    <p class="doc-text" t="docs.routing.catchAll.matchedText2" t-html></p>

    <!-- Remote 404 Template -->
    <h3 class="doc-subtitle" id="routing-catch-all-remote" t="docs.routing.catchAll.remoteTitle"></h3>
    <p class="doc-text" t="docs.routing.catchAll.remoteText" t-html></p>
    <div class="code-block"><pre><span class="hl-tag">&lt;template</span> <span class="hl-attr">route</span>=<span class="hl-str">"*"</span> <span class="hl-attr">src</span>=<span class="hl-str">"./pages/404.tpl"</span><span class="hl-tag">&gt;&lt;/template&gt;</span></pre></div>
    <p class="doc-text" t="docs.routing.catchAll.remoteText2" t-html></p>

    <!-- File-Based Routing 404 -->
    <h3 class="doc-subtitle" id="routing-catch-all-file-based" t="docs.routing.catchAll.fileBasedTitle"></h3>
    <p class="doc-text" t="docs.routing.catchAll.fileBasedText" t-html></p>
    <p class="doc-text" t="docs.routing.catchAll.fileBasedText2" t-html></p>
  </div>

  <!-- Route Head Attributes -->
  <div class="doc-section" id="route-head-attributes">
    <h2 class="doc-title" id="routing-head-attributes" t="docs.routing.headAttributes.title"></h2>
    <p class="doc-text" t="docs.routing.headAttributes.text" t-html></p>
    <div class="code-block"><pre><span class="hl-tag">&lt;template</span> <span class="hl-attr">route</span>=<span class="hl-str">"/about"</span>
          <span class="hl-attr">page-title</span>=<span class="hl-str">"'About Us | My App'"</span>
          <span class="hl-attr">page-description</span>=<span class="hl-str">"'Learn more about our mission'"</span><span class="hl-tag">&gt;</span>
  <span class="hl-tag">&lt;h1&gt;</span>About Us<span class="hl-tag">&lt;/h1&gt;</span>
<span class="hl-tag">&lt;/template&gt;</span>

<span class="hl-cmt">&lt;!-- Dynamic expressions work too --&gt;</span>
<span class="hl-tag">&lt;template</span> <span class="hl-attr">route</span>=<span class="hl-str">"/users/:id"</span>
          <span class="hl-attr">page-title</span>=<span class="hl-str">"user.name + ' | My App'"</span>
          <span class="hl-attr">page-description</span>=<span class="hl-str">"user.bio"</span><span class="hl-tag">&gt;</span>
  <span class="hl-tag">&lt;div</span> <span class="hl-attr">get</span>=<span class="hl-str">"/api/users/{$route.params.id}"</span> <span class="hl-attr">as</span>=<span class="hl-str">"user"</span><span class="hl-tag">&gt;</span>
    <span class="hl-tag">&lt;h1</span> <span class="hl-attr">bind</span>=<span class="hl-str">"user.name"</span><span class="hl-tag">&gt;&lt;/h1&gt;</span>
  <span class="hl-tag">&lt;/div&gt;</span>
<span class="hl-tag">&lt;/template&gt;</span></pre></div>
    <p class="doc-text" t="docs.routing.headAttributes.text2" t-html></p>
    <table class="doc-table">
      <thead><tr><th t="docs.routing.headAttributes.colAttr"></th><th t="docs.routing.headAttributes.colDesc"></th></tr></thead>
      <tbody>
        <tr><td><code>page-title</code></td><td t="docs.routing.headAttributes.pageTitleDesc"></td></tr>
        <tr><td><code>page-description</code></td><td t="docs.routing.headAttributes.pageDescriptionDesc"></td></tr>
        <tr><td><code>page-canonical</code></td><td t="docs.routing.headAttributes.pageCanonicalDesc"></td></tr>
        <tr><td><code>page-jsonld</code></td><td t="docs.routing.headAttributes.pageJsonldDesc"></td></tr>
      </tbody>
    </table>
    <div class="callout">
      <p t="docs.routing.headAttributes.callout" t-html></p>
    </div>
  </div>

  <!-- Accessibility — Focus Management -->
  <div class="doc-section">
    <h2 class="doc-title" id="routing-focus-behavior" t="docs.routing.focusBehavior.title"></h2>
    <p class="doc-text" t="docs.routing.focusBehavior.text"></p>
    <div class="code-block"><pre highlight>NoJS.config({
  router: { focusBehavior: 'auto' }
});</pre></div>
    <p class="doc-text" t="docs.routing.focusBehavior.text2"></p>
    <ol class="doc-list">
      <li t="docs.routing.focusBehavior.priority1" t-html></li>
      <li t="docs.routing.focusBehavior.priority2" t-html></li>
      <li t="docs.routing.focusBehavior.priority3" t-html></li>
      <li t="docs.routing.focusBehavior.priority4"></li>
    </ol>
    <div class="code-block"><pre><span class="hl-cmt">&lt;!-- Option 1: explicit autofocus on the primary action --&gt;</span>
<span class="hl-tag">&lt;template</span> <span class="hl-attr">route</span>=<span class="hl-str">"/login"</span><span class="hl-tag">&gt;</span>
  <span class="hl-tag">&lt;h1&gt;</span>Login<span class="hl-tag">&lt;/h1&gt;</span>
  <span class="hl-tag">&lt;input</span> <span class="hl-attr">type</span>=<span class="hl-str">"email"</span> <span class="hl-attr">autofocus</span> <span class="hl-tag">/&gt;</span>
<span class="hl-tag">&lt;/template&gt;</span>

<span class="hl-cmt">&lt;!-- Option 2: focus the heading (default fallback) --&gt;</span>
<span class="hl-tag">&lt;template</span> <span class="hl-attr">route</span>=<span class="hl-str">"/about"</span><span class="hl-tag">&gt;</span>
  <span class="hl-tag">&lt;h1&gt;</span>About Us<span class="hl-tag">&lt;/h1&gt;</span>
  <span class="hl-tag">&lt;p&gt;</span>...<span class="hl-tag">&lt;/p&gt;</span>
<span class="hl-tag">&lt;/template&gt;</span></pre></div>

    <!-- Default -->
    <h3 class="doc-subtitle" id="routing-focus-default" t="docs.routing.focusBehavior.defaultTitle"></h3>
    <p class="doc-text" t="docs.routing.focusBehavior.defaultText" t-html></p>

    <!-- Timing -->
    <h3 class="doc-subtitle" id="routing-focus-timing" t="docs.routing.focusBehavior.timingTitle"></h3>
    <p class="doc-text" t="docs.routing.focusBehavior.timingText" t-html></p>

    <!-- Side effects -->
    <h3 class="doc-subtitle" id="routing-focus-side-effects" t="docs.routing.focusBehavior.sideEffectsTitle"></h3>
    <p class="doc-text" t="docs.routing.focusBehavior.sideEffectsText" t-html></p>

    <!-- Future values -->
    <h3 class="doc-subtitle" id="routing-focus-future" t="docs.routing.focusBehavior.futureTitle"></h3>
    <p class="doc-text" t="docs.routing.focusBehavior.futureText" t-html></p>

    <!-- Aria live region -->
    <h3 class="doc-subtitle" id="routing-focus-aria-live" t="docs.routing.focusBehavior.ariaLiveTitle"></h3>
    <p class="doc-text" t="docs.routing.focusBehavior.ariaLiveText" t-html></p>
    <div class="code-block"><pre><span class="hl-tag">&lt;div</span> <span class="hl-attr">route-view</span> <span class="hl-attr">aria-live</span>=<span class="hl-str">"polite"</span> <span class="hl-attr">aria-atomic</span>=<span class="hl-str">"true"</span><span class="hl-tag">&gt;&lt;/div&gt;</span></pre></div>
  </div>

  <!-- View Transitions -->
  <div class="doc-section" id="view-transitions">
    <h2 class="doc-title" t="docs.routing.viewTransitions.title"></h2>
    <p class="doc-text" t="docs.routing.viewTransitions.text" t-html></p>

    <div class="code-block"><pre><span class="hl-cmt">&lt;!-- Add a transition preset to your route outlet --&gt;</span>
<span class="hl-tag">&lt;main</span> <span class="hl-attr">route-view</span> <span class="hl-attr">transition</span>=<span class="hl-str">"slide"</span><span class="hl-tag">&gt;&lt;/main&gt;</span></pre></div>

    <!-- Built-in Presets -->
    <h3 class="doc-subtitle" t="docs.routing.viewTransitions.presetsTitle"></h3>
    <p class="doc-text" t="docs.routing.viewTransitions.presetsText"></p>
    <table class="doc-table">
      <thead><tr><th t="docs.routing.viewTransitions.colPreset"></th><th t="docs.routing.viewTransitions.colEffect"></th></tr></thead>
      <tbody>
        <tr><td><code>slide</code></td><td t="docs.routing.viewTransitions.presetSlide"></td></tr>
        <tr><td><code>fade</code></td><td t="docs.routing.viewTransitions.presetFade"></td></tr>
        <tr><td><code>scale</code></td><td t="docs.routing.viewTransitions.presetScale"></td></tr>
        <tr><td><code>none</code></td><td t="docs.routing.viewTransitions.presetNone"></td></tr>
      </tbody>
    </table>

    <div class="code-block"><pre><span class="hl-cmt">&lt;!-- Slide with direction detection --&gt;</span>
<span class="hl-tag">&lt;main</span> <span class="hl-attr">route-view</span> <span class="hl-attr">transition</span>=<span class="hl-str">"slide"</span><span class="hl-tag">&gt;&lt;/main&gt;</span>

<span class="hl-cmt">&lt;!-- Fade crossfade --&gt;</span>
<span class="hl-tag">&lt;main</span> <span class="hl-attr">route-view</span> <span class="hl-attr">transition</span>=<span class="hl-str">"fade"</span><span class="hl-tag">&gt;&lt;/main&gt;</span>

<span class="hl-cmt">&lt;!-- Scale zoom effect --&gt;</span>
<span class="hl-tag">&lt;main</span> <span class="hl-attr">route-view</span> <span class="hl-attr">transition</span>=<span class="hl-str">"scale"</span><span class="hl-tag">&gt;&lt;/main&gt;</span>

<span class="hl-cmt">&lt;!-- Instant swap, no animation --&gt;</span>
<span class="hl-tag">&lt;main</span> <span class="hl-attr">route-view</span> <span class="hl-attr">transition</span>=<span class="hl-str">"none"</span><span class="hl-tag">&gt;&lt;/main&gt;</span></pre></div>

    <!-- Configuration -->
    <h3 class="doc-subtitle" t="docs.routing.viewTransitions.configTitle"></h3>
    <p class="doc-text" t="docs.routing.viewTransitions.configText" t-html></p>
    <div class="code-block"><pre highlight>// View Transition API is enabled by default
NoJS.config({
  router: { viewTransition: true }  // default
});

// Fall back to legacy class-based transitions
NoJS.config({
  router: { viewTransition: false }
});</pre></div>

    <!-- Custom CSS -->
    <h3 class="doc-subtitle" t="docs.routing.viewTransitions.customCssTitle"></h3>
    <p class="doc-text" t="docs.routing.viewTransitions.customCssText" t-html></p>
    <div class="code-block"><pre><span class="hl-cmt">/* Target the route outlet's view transition */</span>
<span class="hl-kw">::view-transition-old</span>(<span class="hl-str">route-content</span>) {
  <span class="hl-attr">animation</span>: <span class="hl-num">0.3s</span> ease-out fade-out;
}
<span class="hl-kw">::view-transition-new</span>(<span class="hl-str">route-content</span>) {
  <span class="hl-attr">animation</span>: <span class="hl-num">0.3s</span> ease-in fade-in;
}

<span class="hl-cmt">/* Direction-aware styles using active-view-transition-type */</span>
<span class="hl-kw">:active-view-transition-type</span>(<span class="hl-str">forward</span>) {
  <span class="hl-kw">::view-transition-old</span>(<span class="hl-str">route-content</span>) {
    <span class="hl-attr">animation</span>: <span class="hl-num">0.3s</span> slide-out-left;
  }
  <span class="hl-kw">::view-transition-new</span>(<span class="hl-str">route-content</span>) {
    <span class="hl-attr">animation</span>: <span class="hl-num">0.3s</span> slide-in-right;
  }
}

<span class="hl-cmt">/* Respect reduced motion */</span>
<span class="hl-kw">@media</span> (prefers-reduced-motion: reduce) {
  <span class="hl-kw">::view-transition-old</span>(<span class="hl-str">route-content</span>),
  <span class="hl-kw">::view-transition-new</span>(<span class="hl-str">route-content</span>) {
    <span class="hl-attr">animation-duration</span>: <span class="hl-num">0.01ms</span>;
  }
}</pre></div>

    <!-- How it Works -->
    <h3 class="doc-subtitle" t="docs.routing.viewTransitions.howItWorksTitle"></h3>
    <p class="doc-text" t="docs.routing.viewTransitions.howItWorksText" t-html></p>
    <ol class="doc-list">
      <li t="docs.routing.viewTransitions.howStep1" t-html></li>
      <li t="docs.routing.viewTransitions.howStep2" t-html></li>
      <li t="docs.routing.viewTransitions.howStep3" t-html></li>
      <li t="docs.routing.viewTransitions.howStep4" t-html></li>
    </ol>

    <!-- Deprecation -->
    <h3 class="doc-subtitle" t="docs.routing.viewTransitions.deprecationTitle"></h3>
    <p class="doc-text" t="docs.routing.viewTransitions.deprecationText" t-html></p>
    <div class="callout">
      <p t="docs.routing.viewTransitions.deprecationCallout" t-html></p>
    </div>
    <div class="code-block"><pre><span class="hl-cmt">&lt;!-- Old approach (still works with viewTransition: false) --&gt;</span>
<span class="hl-tag">&lt;main</span> <span class="hl-attr">route-view</span> <span class="hl-attr">transition</span>=<span class="hl-str">"fade"</span><span class="hl-tag">&gt;&lt;/main&gt;</span>
<span class="hl-cmt">&lt;!-- + manual CSS: .fade-enter, .fade-enter-active, .fade-leave, ... --&gt;</span>

<span class="hl-cmt">&lt;!-- New approach (default, no extra CSS needed for presets) --&gt;</span>
<span class="hl-tag">&lt;main</span> <span class="hl-attr">route-view</span> <span class="hl-attr">transition</span>=<span class="hl-str">"fade"</span><span class="hl-tag">&gt;&lt;/main&gt;</span>
<span class="hl-cmt">&lt;!-- Works out of the box — uses View Transition API --&gt;</span></pre></div>
  </div>

  <!-- Deployment -->
  <div class="doc-section">
    <h2 class="doc-title" id="routing-deployment" t="docs.routing.deployment.title"></h2>
    <p class="doc-text" t="docs.routing.deployment.text" t-html></p>

    <!-- nginx -->
    <h3 class="doc-subtitle" id="routing-deployment-nginx" t="docs.routing.deployment.nginxTitle"></h3>
    <div class="code-block"><pre><span class="hl-kw">server</span> {
  <span class="hl-attr">listen</span> <span class="hl-num">80</span>;
  <span class="hl-attr">root</span> /var/www/your-app;
  <span class="hl-attr">index</span> index.html;

  <span class="hl-kw">location</span> / {
    <span class="hl-attr">try_files</span> $uri $uri/ /index.html;
  }
}</pre></div>

    <!-- Apache -->
    <h3 class="doc-subtitle" id="routing-deployment-apache" t="docs.routing.deployment.apacheTitle"></h3>
    <p class="doc-text" t="docs.routing.deployment.apacheText"></p>
    <div class="code-block"><pre>Options -MultiViews
RewriteEngine On
RewriteCond %{REQUEST_FILENAME} !-f
RewriteRule ^ index.html [QSA,L]</pre></div>

    <!-- Netlify -->
    <h3 class="doc-subtitle" id="routing-deployment-netlify" t="docs.routing.deployment.netlifyTitle"></h3>
    <p class="doc-text" t="docs.routing.deployment.netlifyText"></p>
    <div class="code-block"><pre>/*  /index.html  200</pre></div>
    <p class="doc-text" t="docs.routing.deployment.netlifyToml"></p>
    <div class="code-block"><pre>[[redirects]]
  from = "/*"
  to = "/index.html"
  status = 200</pre></div>

    <!-- Vercel -->
    <h3 class="doc-subtitle" id="routing-deployment-vercel" t="docs.routing.deployment.vercelTitle"></h3>
    <p class="doc-text" t="docs.routing.deployment.vercelText"></p>
    <div class="code-block"><pre>{
  <span class="hl-str">"rewrites"</span>: [{ <span class="hl-str">"source"</span>: <span class="hl-str">"/(.*)"</span>, <span class="hl-str">"destination"</span>: <span class="hl-str">"/index.html"</span> }]
}</pre></div>

    <!-- Cloudflare Pages -->
    <h3 class="doc-subtitle" id="routing-deployment-cloudflare" t="docs.routing.deployment.cloudflareTitle"></h3>
    <p class="doc-text" t="docs.routing.deployment.cloudflareText"></p>
    <div class="code-block"><pre>/*  /index.html  200</pre></div>

    <!-- Firebase Hosting -->
    <h3 class="doc-subtitle" id="routing-deployment-firebase" t="docs.routing.deployment.firebaseTitle"></h3>
    <p class="doc-text" t="docs.routing.deployment.firebaseText"></p>
    <div class="code-block"><pre>{
  <span class="hl-str">"hosting"</span>: {
    <span class="hl-str">"rewrites"</span>: [
      { <span class="hl-str">"source"</span>: <span class="hl-str">"**"</span>, <span class="hl-str">"destination"</span>: <span class="hl-str">"/index.html"</span> }
    ]
  }
}</pre></div>

    <!-- Hash mode -->
    <h3 class="doc-subtitle" id="routing-deployment-hash" t="docs.routing.deployment.hashTitle"></h3>
    <p class="doc-text" t="docs.routing.deployment.hashText" t-html></p>
    <div class="code-block"><pre highlight>NoJS.config({ router: { useHash: true } });</pre></div>
    <div class="callout">
      <p t="docs.routing.deployment.hashCallout" t-html></p>
    </div>
  </div>

</div>

