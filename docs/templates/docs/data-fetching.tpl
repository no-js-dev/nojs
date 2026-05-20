<!-- Data Fetching — from data-fetching.md -->

<section class="hero-section">
  <span class="badge" t="docs.dataFetching.hero.badge"></span>
  <h1 class="hero-title" t="docs.dataFetching.hero.title"></h1>
  <p class="hero-subtitle" t="docs.dataFetching.hero.subtitle"></p>
</section>

<div class="doc-content">

  <!-- Base URL -->
  <div class="doc-section">
    <h2 class="doc-title" id="data-fetching-base-url" t="docs.dataFetching.baseUrl.title"></h2>
    <p class="doc-text" t="docs.dataFetching.baseUrl.text1"></p>
    <div class="code-block"><pre><span class="hl-tag">&lt;body</span> <span class="hl-attr">base</span>=<span class="hl-str">"https://api.myapp.com/v1"</span><span class="hl-tag">&gt;</span>
  <span class="hl-tag">&lt;div</span> <span class="hl-attr">get</span>=<span class="hl-str">"/users"</span><span class="hl-tag">&gt;</span>...<span class="hl-tag">&lt;/div&gt;</span>        <span class="hl-cmt">&lt;!-- → https://api.myapp.com/v1/users --&gt;</span>
  <span class="hl-tag">&lt;div</span> <span class="hl-attr">get</span>=<span class="hl-str">"/posts"</span><span class="hl-tag">&gt;</span>...<span class="hl-tag">&lt;/div&gt;</span>        <span class="hl-cmt">&lt;!-- → https://api.myapp.com/v1/posts --&gt;</span>
<span class="hl-tag">&lt;/body&gt;</span></pre></div>

    <p class="doc-text" t="docs.dataFetching.baseUrl.text2"></p>
    <div class="code-block"><pre><span class="hl-tag">&lt;div</span> <span class="hl-attr">base</span>=<span class="hl-str">"https://cms.myapp.com/api"</span><span class="hl-tag">&gt;</span>
  <span class="hl-tag">&lt;div</span> <span class="hl-attr">get</span>=<span class="hl-str">"/articles"</span><span class="hl-tag">&gt;</span>...<span class="hl-tag">&lt;/div&gt;</span>
<span class="hl-tag">&lt;/div&gt;</span></pre></div>

    <p class="doc-text" t="docs.dataFetching.baseUrl.text3"></p>
    <div class="code-block"><pre><span class="hl-tag">&lt;div</span> <span class="hl-attr">get</span>=<span class="hl-str">"https://other-api.com/data"</span><span class="hl-tag">&gt;</span>...<span class="hl-tag">&lt;/div&gt;</span></pre></div>
  </div>

  <!-- Programmatic Configuration -->
  <div class="doc-section">
    <h2 class="doc-title" id="data-fetching-config" t="docs.dataFetching.config.title"></h2>
    <div class="code-block"><pre><span class="hl-tag">&lt;script&gt;</span>
  <span class="hl-fn">NoJS</span>.<span class="hl-fn">config</span>({
    <span class="hl-attr">baseApiUrl</span>: <span class="hl-str">'https://api.myapp.com/v1'</span>,
    <span class="hl-attr">headers</span>: {
      <span class="hl-str">'Authorization'</span>: <span class="hl-str">'Bearer '</span> + localStorage.<span class="hl-fn">getItem</span>(<span class="hl-str">'token'</span>),
      <span class="hl-str">'Content-Type'</span>: <span class="hl-str">'application/json'</span>
    },
    <span class="hl-attr">timeout</span>: <span class="hl-num">10000</span>,
    <span class="hl-attr">retries</span>: <span class="hl-num">2</span>,
    <span class="hl-attr">retryDelay</span>: <span class="hl-num">1000</span>
  });
<span class="hl-tag">&lt;/script&gt;</span></pre></div>
  </div>

  <!-- Per-Request Headers -->
  <div class="doc-section">
    <h2 class="doc-title" id="data-fetching-headers" t="docs.dataFetching.headers.title"></h2>
    <div class="code-block"><pre><span class="hl-tag">&lt;div</span> <span class="hl-attr">get</span>=<span class="hl-str">"/me"</span>
     <span class="hl-attr">headers</span>=<span class="hl-str">'{"Authorization": "Bearer abc123"}'</span>
     <span class="hl-attr">as</span>=<span class="hl-str">"user"</span><span class="hl-tag">&gt;</span>
<span class="hl-tag">&lt;/div&gt;</span></pre></div>
  </div>

  <!-- GET -->
  <div class="doc-section">
    <h2 class="doc-title" id="data-fetching-get" t="docs.dataFetching.get.title"></h2>
    <div class="code-block"><pre><span class="hl-tag">&lt;div</span> <span class="hl-attr">get</span>=<span class="hl-str">"/users"</span> <span class="hl-attr">as</span>=<span class="hl-str">"users"</span><span class="hl-tag">&gt;</span>
  <span class="hl-cmt">&lt;!-- `users` is now available in this scope --&gt;</span>
<span class="hl-tag">&lt;/div&gt;</span></pre></div>

    <h3 class="doc-title" id="data-fetching-get-attributes" t="docs.dataFetching.get.attributesTitle"></h3>
    <table class="doc-table">
      <thead><tr><th t="docs.dataFetching.get.col1"></th><th t="docs.dataFetching.get.col2"></th><th t="docs.dataFetching.get.col3"></th></tr></thead>
      <tbody>
        <tr><td><code>get</code></td><td>string</td><td t="docs.dataFetching.get.get"></td></tr>
        <tr><td><code>as</code></td><td>string</td><td t="docs.dataFetching.get.as"></td></tr>
        <tr><td><code>loading</code></td><td>string</td><td t="docs.dataFetching.get.loading"></td></tr>
        <tr><td><code>error</code></td><td>string</td><td t="docs.dataFetching.get.error"></td></tr>
        <tr><td><code>empty</code></td><td>string</td><td t="docs.dataFetching.get.empty"></td></tr>
        <tr><td><code>refresh</code></td><td>number</td><td t="docs.dataFetching.get.refresh"></td></tr>
        <tr><td><code>cached</code></td><td>boolean|string</td><td t="docs.dataFetching.get.cached"></td></tr>
        <tr><td><code>into</code></td><td>string</td><td t="docs.dataFetching.get.into"></td></tr>
        <tr><td><code>debounce</code></td><td>number</td><td t="docs.dataFetching.get.debounce"></td></tr>
        <tr><td><code>headers</code></td><td>string</td><td t="docs.dataFetching.get.headers"></td></tr>
        <tr><td><code>params</code></td><td>string</td><td t="docs.dataFetching.get.params"></td></tr>
      </tbody>
    </table>
  </div>

  <!-- Full Example -->
  <div class="doc-section">
    <h2 class="doc-title" id="data-fetching-full-example" t="docs.dataFetching.fullExample.title"></h2>
    <div class="code-block"><pre><span class="hl-tag">&lt;div</span> <span class="hl-attr">get</span>=<span class="hl-str">"/users"</span>
     <span class="hl-attr">as</span>=<span class="hl-str">"users"</span>
     <span class="hl-attr">loading</span>=<span class="hl-str">"#usersSkeleton"</span>
     <span class="hl-attr">error</span>=<span class="hl-str">"#usersError"</span>
     <span class="hl-attr">empty</span>=<span class="hl-str">"#noUsers"</span>
     <span class="hl-attr">refresh</span>=<span class="hl-str">"30000"</span>
     <span class="hl-attr">cached</span><span class="hl-tag">&gt;</span>

  <span class="hl-tag">&lt;div</span> <span class="hl-attr">foreach</span>=<span class="hl-str">"user in users"</span> <span class="hl-attr">template</span>=<span class="hl-str">"userCard"</span><span class="hl-tag">&gt;&lt;/div&gt;</span>

<span class="hl-tag">&lt;/div&gt;</span>

<span class="hl-tag">&lt;template</span> <span class="hl-attr">id</span>=<span class="hl-str">"usersSkeleton"</span><span class="hl-tag">&gt;</span>
  <span class="hl-tag">&lt;div</span> <span class="hl-attr">class</span>=<span class="hl-str">"skeleton-pulse"</span><span class="hl-tag">&gt;</span>Loading users...<span class="hl-tag">&lt;/div&gt;</span>
<span class="hl-tag">&lt;/template&gt;</span>

<span class="hl-tag">&lt;template</span> <span class="hl-attr">id</span>=<span class="hl-str">"usersError"</span> <span class="hl-attr">var</span>=<span class="hl-str">"err"</span><span class="hl-tag">&gt;</span>
  <span class="hl-tag">&lt;div</span> <span class="hl-attr">class</span>=<span class="hl-str">"error"</span><span class="hl-tag">&gt;</span>Failed to load: <span class="hl-tag">&lt;span</span> <span class="hl-attr">bind</span>=<span class="hl-str">"err.message"</span><span class="hl-tag">&gt;&lt;/span&gt;&lt;/div&gt;</span>
<span class="hl-tag">&lt;/template&gt;</span>

<span class="hl-tag">&lt;template</span> <span class="hl-attr">id</span>=<span class="hl-str">"noUsers"</span><span class="hl-tag">&gt;</span>
  <span class="hl-tag">&lt;p&gt;</span>No users found.<span class="hl-tag">&lt;/p&gt;</span>
<span class="hl-tag">&lt;/template&gt;</span></pre></div>
  </div>

  <!-- Reactive URLs -->
  <div class="doc-section">
    <h2 class="doc-title" id="data-fetching-reactive-urls" t="docs.dataFetching.reactiveUrls.title"></h2>
    <p class="doc-text" t="docs.dataFetching.reactiveUrls.text"></p>
    <div class="code-block"><pre><span class="hl-tag">&lt;div</span> <span class="hl-attr">state</span>=<span class="hl-str">"{ page: 1, search: '' }"</span><span class="hl-tag">&gt;</span>
  <span class="hl-tag">&lt;input</span> <span class="hl-attr">type</span>=<span class="hl-str">"text"</span> <span class="hl-attr">bind-value</span>=<span class="hl-str">"search"</span>
         <span class="hl-attr">on:input</span>=<span class="hl-str">"search = $event.target.value"</span> <span class="hl-tag">/&gt;</span>

  <span class="hl-tag">&lt;div</span> <span class="hl-attr">get</span>=<span class="hl-str">"/users?page={page}&amp;q={search}"</span>
       <span class="hl-attr">as</span>=<span class="hl-str">"results"</span>
       <span class="hl-attr">debounce</span>=<span class="hl-str">"300"</span><span class="hl-tag">&gt;</span>
    ...
  <span class="hl-tag">&lt;/div&gt;</span>
<span class="hl-tag">&lt;/div&gt;</span></pre></div>
  </div>

  <!-- POST / PUT / PATCH / DELETE -->
  <div class="doc-section">
    <h2 class="doc-title" id="data-fetching-mutations" t="docs.dataFetching.mutations.title"></h2>
    <p class="doc-text" t="docs.dataFetching.mutations.text"></p>

    <h3 class="doc-title" id="data-fetching-form-submission" t="docs.dataFetching.mutations.formSubmissionTitle"></h3>
    <div class="code-block"><pre><span class="hl-tag">&lt;form</span> <span class="hl-attr">post</span>=<span class="hl-str">"/login"</span>
      <span class="hl-attr">success</span>=<span class="hl-str">"#loginSuccess"</span>
      <span class="hl-attr">error</span>=<span class="hl-str">"#loginError"</span>
      <span class="hl-attr">loading</span>=<span class="hl-str">"#loginLoading"</span><span class="hl-tag">&gt;</span>
  <span class="hl-tag">&lt;input</span> <span class="hl-attr">type</span>=<span class="hl-str">"text"</span> <span class="hl-attr">name</span>=<span class="hl-str">"email"</span> <span class="hl-tag">/&gt;</span>
  <span class="hl-tag">&lt;input</span> <span class="hl-attr">type</span>=<span class="hl-str">"password"</span> <span class="hl-attr">name</span>=<span class="hl-str">"password"</span> <span class="hl-tag">/&gt;</span>
  <span class="hl-tag">&lt;button</span> <span class="hl-attr">type</span>=<span class="hl-str">"submit"</span><span class="hl-tag">&gt;</span>Login<span class="hl-tag">&lt;/button&gt;</span>
<span class="hl-tag">&lt;/form&gt;</span>

<span class="hl-tag">&lt;template</span> <span class="hl-attr">id</span>=<span class="hl-str">"loginSuccess"</span> <span class="hl-attr">var</span>=<span class="hl-str">"result"</span><span class="hl-tag">&gt;</span>
  <span class="hl-tag">&lt;p&gt;</span>Welcome, <span class="hl-tag">&lt;span</span> <span class="hl-attr">bind</span>=<span class="hl-str">"result.user.name"</span><span class="hl-tag">&gt;&lt;/span&gt;</span>!<span class="hl-tag">&lt;/p&gt;</span>
<span class="hl-tag">&lt;/template&gt;</span>

<span class="hl-tag">&lt;template</span> <span class="hl-attr">id</span>=<span class="hl-str">"loginError"</span> <span class="hl-attr">var</span>=<span class="hl-str">"err"</span><span class="hl-tag">&gt;</span>
  <span class="hl-tag">&lt;p</span> <span class="hl-attr">class</span>=<span class="hl-str">"error"</span> <span class="hl-attr">bind</span>=<span class="hl-str">"err.message"</span><span class="hl-tag">&gt;&lt;/p&gt;</span>
<span class="hl-tag">&lt;/template&gt;</span></pre></div>

    <h3 class="doc-title" id="data-fetching-put-patch-delete" t="docs.dataFetching.mutations.putPatchDeleteTitle"></h3>
    <div class="code-block"><pre><span class="hl-tag">&lt;form</span> <span class="hl-attr">put</span>=<span class="hl-str">"/users/{user.id}"</span>
      <span class="hl-attr">body</span>=<span class="hl-str">'{"name": "{user.name}", "role": "{selectedRole}"}'</span>
      <span class="hl-attr">success</span>=<span class="hl-str">"#updateSuccess"</span><span class="hl-tag">&gt;</span>
  ...
<span class="hl-tag">&lt;/form&gt;</span>

<span class="hl-tag">&lt;button</span> <span class="hl-attr">delete</span>=<span class="hl-str">"/users/{user.id}"</span>
        <span class="hl-attr">as</span>=<span class="hl-str">"result"</span>
        <span class="hl-attr">confirm</span>=<span class="hl-str">"Are you sure?"</span>
        <span class="hl-attr">success</span>=<span class="hl-str">"#deleteSuccess"</span>
        <span class="hl-attr">error</span>=<span class="hl-str">"#deleteError"</span><span class="hl-tag">&gt;</span>
  Delete User
<span class="hl-tag">&lt;/button&gt;</span></pre></div>
  </div>

  <!-- Mutation Attributes -->
  <div class="doc-section">
    <h3 class="doc-title" id="data-fetching-mutation-attrs" t="docs.dataFetching.mutationAttrs.title"></h3>
    <table class="doc-table">
      <thead><tr><th t="docs.dataFetching.mutationAttrs.col1"></th><th t="docs.dataFetching.mutationAttrs.col2"></th></tr></thead>
      <tbody>
        <tr><td><code>post</code>, <code>put</code>, <code>patch</code>, <code>delete</code></td><td t="docs.dataFetching.mutationAttrs.method"></td></tr>
        <tr><td><code>body</code></td><td t="docs.dataFetching.mutationAttrs.body"></td></tr>
        <tr><td><code>success</code></td><td t="docs.dataFetching.mutationAttrs.success"></td></tr>
        <tr><td><code>error</code></td><td t="docs.dataFetching.mutationAttrs.error"></td></tr>
        <tr><td><code>loading</code></td><td t="docs.dataFetching.mutationAttrs.loading"></td></tr>
        <tr><td><code>confirm</code></td><td t="docs.dataFetching.mutationAttrs.confirm"></td></tr>
        <tr><td><code>redirect</code></td><td t="docs.dataFetching.mutationAttrs.redirect"></td></tr>
        <tr><td><code>then</code></td><td t="docs.dataFetching.mutationAttrs.then"></td></tr>
        <tr><td><code>into</code></td><td t="docs.dataFetching.mutationAttrs.into"></td></tr>
        <tr><td><code>cached</code></td><td t="docs.dataFetching.mutationAttrs.cached"></td></tr>
      </tbody>
    </table>
  </div>

  <!-- Request Lifecycle -->
  <div class="doc-section">
    <h3 class="doc-title" id="data-fetching-lifecycle" t="docs.dataFetching.lifecycle.title"></h3>
    <div class="code-block"><pre><span class="hl-cmt">[idle] → [loading] → [success | error]</span>
<span class="hl-cmt">                        ↓         ↓</span>
<span class="hl-cmt">                   render tpl   render tpl</span>
<span class="hl-cmt">                   exec `then`  log to console</span>
<span class="hl-cmt">                   `redirect`</span></pre></div>
  </div>

  <!-- Live Demo -->
  <div class="doc-section">
    <h2 class="doc-title" id="data-fetching-live-demo" t="docs.dataFetching.liveDemo.title"></h2>
    <div class="demo-split">
      <div class="demo-code">
        <div class="code-block"><pre><span class="hl-tag">&lt;div</span> <span class="hl-attr">get</span>=<span class="hl-str">"https://jsonplaceholder.typicode.com/users?_limit=3"</span>
     <span class="hl-attr">as</span>=<span class="hl-str">"users"</span><span class="hl-tag">&gt;</span>
  <span class="hl-tag">&lt;div</span> <span class="hl-attr">foreach</span>=<span class="hl-str">"user in users"</span><span class="hl-tag">&gt;</span>
    <span class="hl-tag">&lt;strong</span> <span class="hl-attr">bind</span>=<span class="hl-str">"user.name"</span><span class="hl-tag">&gt;&lt;/strong&gt;</span>
    <span class="hl-tag">&lt;span</span> <span class="hl-attr">bind</span>=<span class="hl-str">"user.email"</span><span class="hl-tag">&gt;&lt;/span&gt;</span>
  <span class="hl-tag">&lt;/div&gt;</span>
<span class="hl-tag">&lt;/div&gt;</span></pre></div>
      </div>
      <div class="demo-preview">
        <span class="demo-result-label" t="docs.dataFetching.liveDemo.label"></span>
        <div get="https://jsonplaceholder.typicode.com/users?_limit=3" as="users">
          <div foreach="user in users" style="padding: 8px 0; border-bottom: 1px solid var(--border);">
            <strong bind="user.name"></strong><br>
            <span style="color: var(--text-muted); font-size: 0.875rem;" bind="user.email"></span>
          </div>
        </div>
      </div>
    </div>
  </div>

</div>


