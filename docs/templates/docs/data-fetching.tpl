<!-- Data Fetching — from data-fetching.md -->

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
    <div class="code-block"><pre highlight>&lt;script&gt;
  NoJS.config({
    baseApiUrl: 'https://api.myapp.com/v1',
    headers: {
      'Authorization': 'Bearer ' + localStorage.getItem('token'),
      'Content-Type': 'application/json'
    },
    timeout: 10000,
    retries: 2,
    retryDelay: 1000
  });
&lt;/script&gt;</pre></div>
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

  <!-- QUERY (RFC 10008) -->
  <div class="doc-section">
    <h2 class="doc-title" id="data-fetching-query" t="docs.dataFetching.query.title"></h2>
    <p class="doc-text" t="docs.dataFetching.query.text"></p>
    <div class="code-block"><pre><span class="hl-cmt">&lt;!-- A read whose criteria are too large for the URL --&gt;</span>
<span class="hl-tag">&lt;div</span> <span class="hl-attr">query</span>=<span class="hl-str">"/search"</span>
     <span class="hl-attr">body</span>=<span class="hl-str">'{"filters": {"status": "active"}}'</span>
     <span class="hl-attr">as</span>=<span class="hl-str">"results"</span><span class="hl-tag">&gt;</span>
  <span class="hl-tag">&lt;div</span> <span class="hl-attr">each</span>=<span class="hl-str">"hit in results"</span> <span class="hl-attr">template</span>=<span class="hl-str">"hitCard"</span><span class="hl-tag">&gt;&lt;/div&gt;</span>
<span class="hl-tag">&lt;/div&gt;</span></pre></div>

    <h3 class="doc-title" id="data-fetching-query-form" t="docs.dataFetching.query.formTitle"></h3>
    <div class="code-block"><pre><span class="hl-tag">&lt;form</span> <span class="hl-attr">query</span>=<span class="hl-str">"/products/search"</span> <span class="hl-attr">success</span>=<span class="hl-str">"#resultsTpl"</span><span class="hl-tag">&gt;</span>
  <span class="hl-tag">&lt;input</span> <span class="hl-attr">name</span>=<span class="hl-str">"q"</span> <span class="hl-attr">type</span>=<span class="hl-str">"text"</span> <span class="hl-tag">/&gt;</span>
  <span class="hl-tag">&lt;button</span> <span class="hl-attr">type</span>=<span class="hl-str">"submit"</span><span class="hl-tag">&gt;</span>Search<span class="hl-tag">&lt;/button&gt;</span>
<span class="hl-tag">&lt;/form&gt;</span></pre></div>
    <p class="doc-text" t="docs.dataFetching.query.cacheNote"></p>
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

  <!-- URL Interpolation and Encoding -->
  <div class="doc-section">
    <h2 class="doc-title" id="data-fetching-url-encoding" t="docs.dataFetching.urlEncoding.title"></h2>
    <p class="doc-text" t="docs.dataFetching.urlEncoding.text"></p>
    <div class="code-block"><pre><span class="hl-cmt">&lt;!-- Safe — query value, encoding is correct --&gt;</span>
<span class="hl-tag">&lt;div</span> <span class="hl-attr">get</span>=<span class="hl-str">"/search?q={query}"</span><span class="hl-tag">&gt;</span>...<span class="hl-tag">&lt;/div&gt;</span>

<span class="hl-cmt">&lt;!-- Safe — single-level path segment, no slashes --&gt;</span>
<span class="hl-tag">&lt;div</span> <span class="hl-attr">get</span>=<span class="hl-str">"/users/{user.id}/profile"</span><span class="hl-tag">&gt;</span>...<span class="hl-tag">&lt;/div&gt;</span>

<span class="hl-cmt">&lt;!-- Broken — path contains "/", will become "%2F" --&gt;</span>
<span class="hl-tag">&lt;div</span> <span class="hl-attr">get</span>=<span class="hl-str">"/files/{path}"</span><span class="hl-tag">&gt;</span>...<span class="hl-tag">&lt;/div&gt;</span>  <span class="hl-cmt">&lt;!-- path = "reports/2026" --&gt;</span>

<span class="hl-cmt">&lt;!-- Workaround — concatenate outside {} --&gt;</span>
<span class="hl-tag">&lt;div</span> <span class="hl-attr">get</span>=<span class="hl-str">"'/files/' + path"</span><span class="hl-tag">&gt;</span>...<span class="hl-tag">&lt;/div&gt;</span></pre></div>
  </div>

  <!-- Skeleton Placeholders -->
  <div class="doc-section">
    <h2 class="doc-title" id="data-fetching-skeleton" t="docs.dataFetching.skeleton.title"></h2>
    <p class="doc-text" t="docs.dataFetching.skeleton.text"></p>
    <div class="code-block"><pre><span class="hl-cmt">&lt;!-- Skeleton lives in the DOM (SSG-friendly, no JS needed to render it) --&gt;</span>
<span class="hl-tag">&lt;div</span> <span class="hl-attr">id</span>=<span class="hl-str">"product-skeleton"</span> <span class="hl-attr">class</span>=<span class="hl-str">"skeleton-card"</span><span class="hl-tag">&gt;</span>
  <span class="hl-tag">&lt;div</span> <span class="hl-attr">class</span>=<span class="hl-str">"skeleton-line"</span><span class="hl-tag">&gt;&lt;/div&gt;</span>
  <span class="hl-tag">&lt;div</span> <span class="hl-attr">class</span>=<span class="hl-str">"skeleton-line short"</span><span class="hl-tag">&gt;&lt;/div&gt;</span>
<span class="hl-tag">&lt;/div&gt;</span>

<span class="hl-cmt">&lt;!-- skeleton= points to the element's id (without #) --&gt;</span>
<span class="hl-tag">&lt;div</span> <span class="hl-attr">get</span>=<span class="hl-str">"/api/products/42"</span> <span class="hl-attr">as</span>=<span class="hl-str">"product"</span> <span class="hl-attr">skeleton</span>=<span class="hl-str">"product-skeleton"</span><span class="hl-tag">&gt;</span>
  <span class="hl-tag">&lt;h1</span> <span class="hl-attr">bind</span>=<span class="hl-str">"product.name"</span><span class="hl-tag">&gt;&lt;/h1&gt;</span>
  <span class="hl-tag">&lt;p</span> <span class="hl-attr">bind</span>=<span class="hl-str">"product.description"</span><span class="hl-tag">&gt;&lt;/p&gt;</span>
<span class="hl-tag">&lt;/div&gt;</span></pre></div>

    <p class="doc-text" t="docs.dataFetching.skeleton.hiddenWhen"></p>

    <h3 class="doc-title" id="data-fetching-skeleton-vs-loading" t="docs.dataFetching.skeleton.combinedTitle"></h3>
    <p class="doc-text" t="docs.dataFetching.skeleton.combinedText"></p>
    <table class="doc-table">
      <thead><tr><th></th><th><code>skeleton=</code></th><th><code>loading=</code></th></tr></thead>
      <tbody>
        <tr><td t="docs.dataFetching.skeleton.colContent"></td><td t="docs.dataFetching.skeleton.skeletonContent"></td><td t="docs.dataFetching.skeleton.loadingContent"></td></tr>
        <tr><td t="docs.dataFetching.skeleton.colVisibility"></td><td t="docs.dataFetching.skeleton.skeletonVisibility"></td><td t="docs.dataFetching.skeleton.loadingVisibility"></td></tr>
        <tr><td t="docs.dataFetching.skeleton.colCLS"></td><td t="docs.dataFetching.skeleton.skeletonCLS"></td><td t="docs.dataFetching.skeleton.loadingCLS"></td></tr>
        <tr><td t="docs.dataFetching.skeleton.colSSG"></td><td t="docs.dataFetching.skeleton.skeletonSSG"></td><td t="docs.dataFetching.skeleton.loadingSSG"></td></tr>
      </tbody>
    </table>

    <div class="code-block"><pre><span class="hl-tag">&lt;div</span> <span class="hl-attr">id</span>=<span class="hl-str">"skeleton"</span> <span class="hl-attr">class</span>=<span class="hl-str">"skeleton-pulse"</span><span class="hl-tag">&gt;</span><span class="hl-cmt">&lt;!-- pre-rendered placeholder --&gt;</span><span class="hl-tag">&lt;/div&gt;</span>

<span class="hl-tag">&lt;div</span> <span class="hl-attr">get</span>=<span class="hl-str">"/api/feed"</span> <span class="hl-attr">as</span>=<span class="hl-str">"items"</span>
     <span class="hl-attr">skeleton</span>=<span class="hl-str">"skeleton"</span>
     <span class="hl-attr">loading</span>=<span class="hl-str">"#spinnerTpl"</span>
     <span class="hl-attr">empty</span>=<span class="hl-str">"#emptyTpl"</span><span class="hl-tag">&gt;</span>
  <span class="hl-tag">&lt;div</span> <span class="hl-attr">each</span>=<span class="hl-str">"item in items"</span> <span class="hl-attr">template</span>=<span class="hl-str">"feedItem"</span><span class="hl-tag">&gt;&lt;/div&gt;</span>
<span class="hl-tag">&lt;/div&gt;</span></pre></div>

    <h3 class="doc-title" id="data-fetching-skeleton-visibility" t="docs.dataFetching.skeleton.visibilityTitle"></h3>
    <p class="doc-text" t="docs.dataFetching.skeleton.visibilityText"></p>
    <div class="code-block"><pre><span class="hl-cmt">&lt;!-- Correct: starts visible, No.JS hides after response --&gt;</span>
<span class="hl-tag">&lt;div</span> <span class="hl-attr">id</span>=<span class="hl-str">"skeleton"</span> <span class="hl-attr">class</span>=<span class="hl-str">"skeleton-pulse"</span><span class="hl-tag">&gt;</span>...placeholder...<span class="hl-tag">&lt;/div&gt;</span>

<span class="hl-cmt">&lt;!-- Incorrect: display:none in CSS conflicts with No.JS show/hide logic --&gt;</span>
<span class="hl-tag">&lt;div</span> <span class="hl-attr">id</span>=<span class="hl-str">"skeleton"</span> <span class="hl-attr">class</span>=<span class="hl-str">"hidden skeleton-pulse"</span><span class="hl-tag">&gt;</span>...placeholder...<span class="hl-tag">&lt;/div&gt;</span></pre></div>
  </div>

  <!-- Pagination & Infinite Scroll -->
  <div class="doc-section">
    <h2 class="doc-title" id="data-fetching-pagination" t="docs.dataFetching.pagination.title"></h2>
    <p class="doc-text" t="docs.dataFetching.pagination.text"></p>
    <div class="code-block"><pre><span class="hl-tag">&lt;div</span> <span class="hl-attr">get</span>=<span class="hl-str">"/api/posts?page={page}&amp;limit=10"</span>
     <span class="hl-attr">as</span>=<span class="hl-str">"posts"</span>
     <span class="hl-attr">get-trigger</span>=<span class="hl-str">"scroll"</span>
     <span class="hl-attr">get-insert</span>=<span class="hl-str">"append"</span>
     <span class="hl-attr">get-page</span>=<span class="hl-str">"1"</span>
     <span class="hl-attr">get-threshold</span>=<span class="hl-str">"300px"</span><span class="hl-tag">&gt;</span>
  <span class="hl-tag">&lt;div</span> <span class="hl-attr">each</span>=<span class="hl-str">"post in posts"</span> <span class="hl-attr">key</span>=<span class="hl-str">"post.id"</span><span class="hl-tag">&gt;</span>
    <span class="hl-tag">&lt;h3</span> <span class="hl-attr">bind</span>=<span class="hl-str">"post.title"</span><span class="hl-tag">&gt;&lt;/h3&gt;</span>
  <span class="hl-tag">&lt;/div&gt;</span>
<span class="hl-tag">&lt;/div&gt;</span></pre></div>
    <p class="doc-text" t="docs.dataFetching.pagination.seeAlso"></p>
  </div>

  <!-- Interceptors -->
  <div class="doc-section">
    <h2 class="doc-title" id="data-fetching-interceptors" t="docs.dataFetching.interceptors.title"></h2>
    <p class="doc-text" t="docs.dataFetching.interceptors.text"></p>

    <h3 class="doc-title" id="data-fetching-interceptors-basic" t="docs.dataFetching.interceptors.basicTitle"></h3>
    <div class="code-block"><pre highlight>&lt;script&gt;
  // Add a header to every request
  NoJS.interceptor('request', (url, options) =&gt; {
    options.headers['X-Request-ID'] = crypto.randomUUID();
    return options;
  });

  // Handle 401 responses globally
  NoJS.interceptor('response', (response, url) =&gt; {
    if (response.status === 401) {
      NoJS.store.auth.user = null;
      NoJS.notify();
      NoJS.router.push('/login');
      throw new Error('Unauthorized');
    }
    return response;
  });
&lt;/script&gt;</pre></div>

    <h3 class="doc-title" id="data-fetching-interceptors-async" t="docs.dataFetching.interceptors.asyncTitle"></h3>
    <p class="doc-text" t="docs.dataFetching.interceptors.asyncText"></p>
    <div class="code-block"><pre highlight>&lt;script&gt;
  NoJS.interceptor('request', async (url, options) =&gt; {
    const token = await refreshTokenIfExpired();
    options.headers['Authorization'] = 'Bearer ' + token;
    return options;
  });
&lt;/script&gt;</pre></div>

    <h3 class="doc-title" id="data-fetching-interceptors-cancel" t="docs.dataFetching.interceptors.cancelTitle"></h3>
    <p class="doc-text" t="docs.dataFetching.interceptors.cancelText"></p>
    <div class="code-block"><pre highlight>&lt;script&gt;
  NoJS.interceptor('request', (url, opts) =&gt; {
    if (!navigator.onLine) {
      return { [NoJS.CANCEL]: true };
    }
    return opts;
  });
&lt;/script&gt;</pre></div>

    <h3 class="doc-title" id="data-fetching-interceptors-respond" t="docs.dataFetching.interceptors.respondTitle"></h3>
    <p class="doc-text" t="docs.dataFetching.interceptors.respondText"></p>
    <div class="code-block"><pre highlight>&lt;script&gt;
  const cache = new Map();

  NoJS.interceptor('request', (url, opts) =&gt; {
    if (opts.method === 'GET' &amp;&amp; cache.has(url)) {
      return { [NoJS.RESPOND]: cache.get(url) };
    }
    return opts;
  });
&lt;/script&gt;</pre></div>

    <h3 class="doc-title" id="data-fetching-interceptors-replace" t="docs.dataFetching.interceptors.replaceTitle"></h3>
    <p class="doc-text" t="docs.dataFetching.interceptors.replaceText"></p>
    <div class="code-block"><pre highlight>&lt;script&gt;
  NoJS.interceptor('response', (response, url) =&gt; {
    if (url.includes('/users')) {
      return { [NoJS.REPLACE]: { users: [], normalized: true } };
    }
    return response;
  });
&lt;/script&gt;</pre></div>

    <h3 class="doc-title" id="data-fetching-interceptors-redaction" t="docs.dataFetching.interceptors.redactionTitle"></h3>
    <p class="doc-text" t="docs.dataFetching.interceptors.redactionText"></p>

    <h3 class="doc-title" id="data-fetching-interceptors-sentinels" t="docs.dataFetching.interceptors.sentinelTitle"></h3>
    <table class="doc-table">
      <thead><tr><th t="docs.dataFetching.interceptors.colSentinel"></th><th t="docs.dataFetching.interceptors.colType"></th><th t="docs.dataFetching.interceptors.colEffect"></th></tr></thead>
      <tbody>
        <tr><td><code>NoJS.CANCEL</code></td><td t="docs.dataFetching.interceptors.typeRequest"></td><td t="docs.dataFetching.interceptors.cancelEffect"></td></tr>
        <tr><td><code>NoJS.RESPOND</code></td><td t="docs.dataFetching.interceptors.typeRequest"></td><td t="docs.dataFetching.interceptors.respondEffect"></td></tr>
        <tr><td><code>NoJS.REPLACE</code></td><td t="docs.dataFetching.interceptors.typeResponse"></td><td t="docs.dataFetching.interceptors.replaceEffect"></td></tr>
      </tbody>
    </table>
  </div>

</div>


