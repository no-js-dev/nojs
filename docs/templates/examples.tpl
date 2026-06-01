<div class="page-wrapper">
<style>
/* ══════════════════════════════════════════════════════════════════
   EXAMPLES PAGE
   ══════════════════════════════════════════════════════════════════ */

/* Example section: padding 60/80, gap 32 */
.example-section {
  padding: 60px 80px;
  display: flex;
  flex-direction: column;
  gap: 32px;
}
.example-section.alt {
  background: var(--surface);
}
.example-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
}
.example-title {
  font-family: var(--font-heading);
  font-size: 28px;
  font-weight: bold;
  color: var(--text);
}
.example-desc {
  font-family: var(--font-body);
  font-size: 16px;
  color: var(--text-muted);
}
.example-panels {
  display: flex;
  gap: 24px;
  width: 100%;
}
.example-code-panel {
  flex: 1;
  background: var(--code-bg);
  border-radius: var(--radius);
  padding: 24px 28px;
  display: flex;
  flex-direction: column;
  gap: 16px;
  overflow: auto;
}
.example-code-panel .code-tab {
  font-family: var(--font-mono);
  font-size: 12px;
  color: var(--text-dim);
}
.example-code-panel pre {
  font-family: var(--font-mono);
  font-size: 14px;
  line-height: 1.8;
  color: #E2E8F0;
  margin: 0;
}
.example-preview-panel {
  flex: 1;
  background: var(--white);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  padding: 32px;
  display: flex;
  flex-direction: column;
}

/* Preview panel item styles */
.preview-counter {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 24px;
  height: 100%;
}
.preview-counter-value {
  font-family: var(--font-heading);
  font-size: 48px;
  font-weight: bold;
  color: var(--text);
}
.preview-todo-input-row {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 16px;
}
.preview-input {
  flex: 1;
  height: 40px;
  padding: 0 12px;
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  font-family: var(--font-body);
  font-size: 14px;
  color: var(--text-dim);
  outline: none;
}
.preview-input:focus {
  border-color: var(--primary);
}
.preview-btn-add {
  background: var(--primary);
  color: var(--white);
  font-family: var(--font-heading);
  font-size: 14px;
  font-weight: 600;
  padding: 10px 20px;
  border-radius: var(--radius-sm);
}
.preview-todo-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 0;
  border-bottom: 1px solid var(--border);
  font-family: var(--font-body);
  font-size: 14px;
  color: var(--text);
}
.preview-todo-item:last-child {
  border-bottom: none;
}
.preview-todo-check {
  color: var(--primary);
  font-size: 18px;
}
.preview-todo-check.unchecked {
  color: var(--border);
}
.preview-user-card {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 12px;
}
.preview-user-card + .preview-user-card {
  border-top: 1px solid var(--border);
}
.preview-avatar {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: var(--border);
  flex-shrink: 0;
}
.preview-user-info {
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.preview-user-info-name {
  font-family: var(--font-body);
  font-size: 14px;
  font-weight: 500;
  color: var(--text);
}
.preview-user-info-email {
  font-family: var(--font-body);
  font-size: 12px;
  color: var(--text-dim);
}
.preview-nav {
  display: flex;
  align-items: center;
  gap: 24px;
  padding: 12px 24px;
  border-bottom: 1px solid var(--border);
}
.preview-nav-link {
  font-family: var(--font-body);
  font-size: 14px;
  color: var(--text-muted);
}
.preview-nav-link.active {
  color: var(--primary);
  font-weight: 600;
}
.preview-route-content {
  padding: 32px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.preview-route-title {
  font-family: var(--font-heading);
  font-size: 24px;
  font-weight: bold;
  color: var(--text);
}
.preview-route-text {
  font-family: var(--font-body);
  font-size: 14px;
  color: var(--text-muted);
}

/* ── Responsive ── */
@media (max-width: 1024px) {
  .example-section { padding: 40px 24px; }
  .example-panels { flex-direction: column; }
}
</style>
<!-- Examples Page — real-life patterns -->

<!-- ═══ Hero ═══ -->
<section class="hero-section">
  <span class="badge" t="examples.hero.badge"></span>
  <h1 class="hero-title" t="examples.hero.title"></h1>
  <p class="hero-subtitle" t="examples.hero.subtitle"></p>
</section>

<!-- ═══ Example 1 — Login with JWT (white bg, Intermediate) ═══ -->
<section class="example-section">
  <div class="example-header">
    <h2 class="example-title" t="examples.login.title"></h2>
    <span class="badge" t="examples.login.badge"></span>
  </div>
  <p style="background: #FEF3C7; border: 1px solid #F59E0B; border-radius: 6px; padding: 10px 14px; font-size: 13px; color: #78350F; margin-bottom: 12px;">
    <strong>Note:</strong> This example uses <code>validate</code>, which has moved to <code>@erickxavier/nojs-elements</code> as of v1.13.0. Add <code>NoJS.use(NoJSElements)</code> to enable validation. <a href="/docs/plugins" style="color: #92400E; font-weight: 600;">Details &rarr;</a>
  </p>
  <p class="example-desc" t="examples.login.desc">
    A complete login flow: form validation, POST to auth endpoint, save the JWT
    to a global store, and automatically attach the token to every subsequent
    request via a request interceptor.
  </p>
  <div class="example-panels">
    <div class="example-code-panel">
      <span class="code-tab">index.html</span>
      <pre><span class="hl-tag">&lt;script&gt;</span>
  <span class="hl-cmt">// Attach token to every outgoing request</span>
  <span class="hl-fn">NoJS</span>.<span class="hl-fn">interceptor</span>(<span class="hl-str">'request'</span>, (<span class="hl-attr">url</span>, <span class="hl-attr">opts</span>) <span class="hl-op">=&gt;</span> {
    <span class="hl-kw">const</span> <span class="hl-attr">token</span> <span class="hl-op">=</span> <span class="hl-fn">NoJS</span>.store.auth.token;
    <span class="hl-kw">if</span> (token)
      opts.headers[<span class="hl-str">'Authorization'</span>] <span class="hl-op">=</span> <span class="hl-str">'Bearer '</span> <span class="hl-op">+</span> token;
    <span class="hl-kw">return</span> opts;
  });
<span class="hl-tag">&lt;/script&gt;</span>

<span class="hl-cmt">&lt;!-- Global auth store --&gt;</span>
<span class="hl-tag">&lt;div</span> <span class="hl-attr">store</span>=<span class="hl-str">"auth"</span>
     <span class="hl-attr">value</span>=<span class="hl-str">"{ user: null, token: null }"</span><span class="hl-tag">&gt;&lt;/div&gt;</span>

<span class="hl-tag">&lt;template</span> <span class="hl-attr">route</span>=<span class="hl-str">"/login"</span>
          <span class="hl-attr">guard</span>=<span class="hl-str">"!$store.auth.token"</span>
          <span class="hl-attr">redirect</span>=<span class="hl-str">"/dashboard"</span><span class="hl-tag">&gt;</span>
  <span class="hl-cmt">&lt;!-- then runs after success; result = response data --&gt;</span>
  <span class="hl-tag">&lt;form</span> <span class="hl-attr">post</span>=<span class="hl-str">"/auth/login"</span> <span class="hl-attr">validate</span>
        <span class="hl-attr">then</span>=<span class="hl-str">"$store.auth.user = result.user;</span>
<span class="hl-str">              $store.auth.token = result.token"</span>
        <span class="hl-attr">redirect</span>=<span class="hl-str">"/dashboard"</span>
        <span class="hl-attr">error</span>=<span class="hl-str">"#auth-err"</span><span class="hl-tag">&gt;</span>
    <span class="hl-tag">&lt;input</span> <span class="hl-attr">name</span>=<span class="hl-str">"email"</span> <span class="hl-attr">type</span>=<span class="hl-str">"email"</span>
           <span class="hl-attr">required</span> <span class="hl-attr">validate</span>=<span class="hl-str">"email"</span><span class="hl-tag">&gt;</span>
    <span class="hl-tag">&lt;input</span> <span class="hl-attr">name</span>=<span class="hl-str">"password"</span> <span class="hl-attr">type</span>=<span class="hl-str">"password"</span>
           <span class="hl-attr">required</span> <span class="hl-attr">minlength</span>=<span class="hl-str">"8"</span><span class="hl-tag">&gt;</span>
    <span class="hl-tag">&lt;button</span> <span class="hl-attr">type</span>=<span class="hl-str">"submit"</span>
            <span class="hl-attr">bind-disabled</span>=<span class="hl-str">"!$form.valid || $form.submitting"</span><span class="hl-tag">&gt;</span>
      <span class="hl-tag">&lt;span</span> <span class="hl-attr">hide</span>=<span class="hl-str">"$form.submitting"</span><span class="hl-tag">&gt;</span>Sign in<span class="hl-tag">&lt;/span&gt;</span>
      <span class="hl-tag">&lt;span</span> <span class="hl-attr">show</span>=<span class="hl-str">"$form.submitting"</span><span class="hl-tag">&gt;</span>Signing in...<span class="hl-tag">&lt;/span&gt;</span>
    <span class="hl-tag">&lt;/button&gt;</span>
  <span class="hl-tag">&lt;/form&gt;</span>

  <span class="hl-tag">&lt;template</span> <span class="hl-attr">id</span>=<span class="hl-str">"auth-err"</span> <span class="hl-attr">var</span>=<span class="hl-str">"err"</span><span class="hl-tag">&gt;</span>
    <span class="hl-tag">&lt;p</span> <span class="hl-attr">class</span>=<span class="hl-str">"error"</span> <span class="hl-attr">bind</span>=<span class="hl-str">"err.message"</span>
       <span class="hl-attr">animate</span>=<span class="hl-str">"shake"</span><span class="hl-tag">&gt;&lt;/p&gt;</span>
  <span class="hl-tag">&lt;/template&gt;</span>
<span class="hl-tag">&lt;/template&gt;</span></pre>
    </div>
    <!-- Live preview: working login mock -->
    <div class="example-preview-panel" state="{ loggedIn: false, email: '', password: '' }" style="justify-content:flex-start;">
      <div show="!loggedIn" style="display:flex;flex-direction:column;gap:14px;width:100%">
        <div class="form-group" style="margin-bottom:0">
          <label class="form-label" t="examples.login.emailLabel"></label>
          <input type="email" class="input" model="email" placeholder="you@company.com">
        </div>
        <div class="form-group" style="margin-bottom:0">
          <label class="form-label" t="examples.login.passwordLabel"></label>
          <input type="password" class="input" model="password" placeholder="••••••••">
        </div>
        <button class="btn btn-primary" style="width:100%;margin-top:4px"
                on:click="loggedIn = (email && password) ? true : false"
                bind-disabled="!email || !password" t="examples.login.signIn">Sign in</button>
        <p style="font-size:12px;color:var(--text-muted);text-align:center" t="examples.login.previewHint">
          Fill both fields to try the interactive preview
        </p>
      </div>
      <div show="loggedIn" style="display:flex;flex-direction:column;align-items:center;gap:14px;padding:16px 0">
        <div style="width:52px;height:52px;border-radius:50%;background:var(--primary-surface);display:flex;align-items:center;justify-content:center;color:var(--primary);font-size:22px">✓</div>
        <p style="font-family:var(--font-heading);font-size:17px;font-weight:600;color:var(--text)" t="examples.login.signedIn"></p>
        <p style="font-size:13px;color:var(--text-muted)" bind="email"></p>
        <div style="background:var(--surface);border:1px solid var(--border);border-radius:6px;padding:10px 14px;font-size:12px;color:var(--text-muted);font-family:var(--font-mono);width:100%;text-align:center">
          Authorization: Bearer eyJ0eXAiOi...
        </div>
        <button class="btn btn-outline btn-sm" on:click="loggedIn=false;email='';password=''" t="examples.login.signOut"></button>
      </div>
    </div>
  </div>
</section>

<!-- ═══ Example 2 — Protected Dashboard + Token Validation (#F8FAFC bg, Intermediate) ═══ -->
<section class="example-section alt">
  <div class="example-header">
    <h2 class="example-title" t="examples.dashboard.title"></h2>
    <span class="badge" t="examples.dashboard.badge"></span>
  </div>
  <p class="example-desc" t="examples.dashboard.desc" t-html>
    A route guarded by the auth store, paired with a <strong>response interceptor</strong>
    that acts as a control script: on every API call, if the server returns
    <code>401</code> or <code>403</code>, the token is invalidated and the user
    is redirected to login automatically — no extra code needed in the route itself.
  </p>
  <div class="example-panels">
    <div class="example-code-panel">
      <span class="code-tab">index.html</span>
      <pre><span class="hl-tag">&lt;script&gt;</span>
  <span class="hl-cmt">// Control script: validate token on every response</span>
  <span class="hl-fn">NoJS</span>.<span class="hl-fn">interceptor</span>(<span class="hl-str">'response'</span>, (<span class="hl-attr">response</span>) <span class="hl-op">=&gt;</span> {
    <span class="hl-kw">if</span> (response.status <span class="hl-op">===</span> <span class="hl-num">401</span> <span class="hl-op">||</span>
        response.status <span class="hl-op">===</span> <span class="hl-num">403</span>) {
      <span class="hl-fn">NoJS</span>.store.auth.user  <span class="hl-op">=</span> <span class="hl-kw">null</span>;
      <span class="hl-fn">NoJS</span>.store.auth.token <span class="hl-op">=</span> <span class="hl-kw">null</span>;
      <span class="hl-fn">NoJS</span>.router.<span class="hl-fn">push</span>(<span class="hl-str">'/login'</span>);
      <span class="hl-kw">throw new</span> <span class="hl-fn">Error</span>(<span class="hl-str">'Session expired'</span>);
    }
    <span class="hl-kw">return</span> response;
  });
<span class="hl-tag">&lt;/script&gt;</span>

<span class="hl-cmt">&lt;!-- Guard: redirect to /login if no token --&gt;</span>
<span class="hl-tag">&lt;template</span> <span class="hl-attr">route</span>=<span class="hl-str">"/dashboard"</span>
          <span class="hl-attr">guard</span>=<span class="hl-str">"$store.auth.token"</span>
          <span class="hl-attr">redirect</span>=<span class="hl-str">"/login"</span><span class="hl-tag">&gt;</span>
  <span class="hl-cmt">&lt;!-- Token attached via request interceptor (Example 1) --&gt;</span>
  <span class="hl-tag">&lt;div</span> <span class="hl-attr">get</span>=<span class="hl-str">"/me/dashboard"</span> <span class="hl-attr">as</span>=<span class="hl-str">"data"</span>
       <span class="hl-attr">loading</span>=<span class="hl-str">"#dash-skeleton"</span><span class="hl-tag">&gt;</span>
    <span class="hl-tag">&lt;h2</span> <span class="hl-attr">bind</span>=<span class="hl-str">"'Welcome, ' + data.user.name"</span><span class="hl-tag">&gt;&lt;/h2&gt;</span>
    <span class="hl-tag">&lt;div</span> <span class="hl-attr">each</span>=<span class="hl-str">"m in data.metrics"</span><span class="hl-tag">&gt;</span>
      <span class="hl-tag">&lt;span</span> <span class="hl-attr">bind</span>=<span class="hl-str">"m.label"</span><span class="hl-tag">&gt;&lt;/span&gt;</span>
      <span class="hl-tag">&lt;span</span> <span class="hl-attr">bind</span>=<span class="hl-str">"m.value | number"</span><span class="hl-tag">&gt;&lt;/span&gt;</span>
    <span class="hl-tag">&lt;/div&gt;</span>
  <span class="hl-tag">&lt;/div&gt;</span>
  <span class="hl-tag">&lt;button</span> <span class="hl-attr">on:click</span>=<span class="hl-str">"$store.auth.user = null;
    $store.auth.token = null"</span><span class="hl-tag">&gt;</span>
    Sign out
  <span class="hl-tag">&lt;/button&gt;</span>
<span class="hl-tag">&lt;/template&gt;</span></pre>
    </div>
    <!-- Static preview: dashboard mock -->
    <div class="example-preview-panel" style="flex-direction:column;gap:14px;padding:24px">
      <div style="display:flex;align-items:center;justify-content:space-between;padding-bottom:14px;border-bottom:1px solid var(--border)">
        <span style="font-family:var(--font-heading);font-weight:600;color:var(--text)" t="examples.dashboard.welcome"></span>
        <span style="background:#DCFCE7;color:#16A34A;font-size:11px;font-weight:600;padding:4px 10px;border-radius:100px" t="examples.dashboard.activeSession"></span>
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">
        <div style="background:var(--surface);border:1px solid var(--border);border-radius:8px;padding:14px">
          <div style="font-size:11px;color:var(--text-muted);margin-bottom:4px" t="examples.dashboard.requestsToday"></div>
          <div style="font-family:var(--font-heading);font-size:20px;font-weight:700;color:var(--text)">1,284</div>
        </div>
        <div style="background:var(--surface);border:1px solid var(--border);border-radius:8px;padding:14px">
          <div style="font-size:11px;color:var(--text-muted);margin-bottom:4px" t="examples.dashboard.errorRate"></div>
          <div style="font-family:var(--font-heading);font-size:20px;font-weight:700;color:var(--success)">0.3%</div>
        </div>
        <div style="background:var(--surface);border:1px solid var(--border);border-radius:8px;padding:14px">
          <div style="font-size:11px;color:var(--text-muted);margin-bottom:4px" t="examples.dashboard.uptime"></div>
          <div style="font-family:var(--font-heading);font-size:20px;font-weight:700;color:var(--text)">99.9%</div>
        </div>
        <div style="background:var(--surface);border:1px solid var(--border);border-radius:8px;padding:14px">
          <div style="font-size:11px;color:var(--text-muted);margin-bottom:4px" t="examples.dashboard.activeUsers"></div>
          <div style="font-family:var(--font-heading);font-size:20px;font-weight:700;color:var(--primary)">342</div>
        </div>
      </div>
      <div style="background:var(--primary-surface);border-left:3px solid var(--primary);padding:10px 14px;border-radius:0 6px 6px 0;font-size:12px;color:var(--text-secondary)" t="examples.dashboard.interceptorNote" t-html>
        If any request returns <code>401</code> or <code>403</code>, the interceptor clears the token and redirects to <code>/login</code> automatically.
      </div>
    </div>
  </div>
</section>

<!-- ═══ Example 3 — Live Search (white bg, Beginner) ═══ -->
<section class="example-section">
  <div class="example-header">
    <h2 class="example-title" t="examples.search.title"></h2>
    <span class="badge" t="examples.search.badge"></span>
  </div>
  <p class="example-desc" t="examples.search.desc" t-html>
    An instant search input that fires a debounced GET request on every keystroke,
    rendering results reactively. No <code>addEventListener</code>, no
    <code>setTimeout</code>, no DOM manipulation.
  </p>
  <div class="example-panels">
    <div class="example-code-panel">
      <span class="code-tab">index.html</span>
      <pre><span class="hl-tag">&lt;div</span> <span class="hl-attr">state</span>=<span class="hl-str">"{ query: '' }"</span><span class="hl-tag">&gt;</span>

  <span class="hl-tag">&lt;input</span> <span class="hl-attr">model</span>=<span class="hl-str">"query"</span>
         <span class="hl-attr">placeholder</span>=<span class="hl-str">"Search products..."</span><span class="hl-tag">&gt;</span>

  <span class="hl-cmt">&lt;!-- GET fires 300ms after user stops typing --&gt;</span>
  <span class="hl-tag">&lt;div</span> <span class="hl-attr">get</span>=<span class="hl-str">"/products?q={query}"</span>
       <span class="hl-attr">watch</span>=<span class="hl-str">"query"</span>
       <span class="hl-attr">debounce</span>=<span class="hl-str">"300"</span>
       <span class="hl-attr">as</span>=<span class="hl-str">"results"</span><span class="hl-tag">&gt;</span>

    <span class="hl-tag">&lt;p</span> <span class="hl-attr">show</span>=<span class="hl-str">"!results.length &amp;&amp; query"</span><span class="hl-tag">&gt;</span>
      No results for
      <span class="hl-tag">&lt;strong</span> <span class="hl-attr">bind</span>=<span class="hl-str">"query"</span><span class="hl-tag">&gt;&lt;/strong&gt;</span>
    <span class="hl-tag">&lt;/p&gt;</span>

    <span class="hl-tag">&lt;div</span> <span class="hl-attr">each</span>=<span class="hl-str">"item in results"</span><span class="hl-tag">&gt;</span>
      <span class="hl-tag">&lt;span</span> <span class="hl-attr">bind</span>=<span class="hl-str">"item.name"</span><span class="hl-tag">&gt;&lt;/span&gt;</span>
      <span class="hl-tag">&lt;span</span> <span class="hl-attr">bind</span>=<span class="hl-str">"item.price | currency"</span><span class="hl-tag">&gt;&lt;/span&gt;</span>
    <span class="hl-tag">&lt;/div&gt;</span>

  <span class="hl-tag">&lt;/div&gt;</span>
<span class="hl-tag">&lt;/div&gt;</span></pre>
    </div>
    <!-- Live preview: searchable product list -->
    <div class="example-preview-panel"
         state="{
           query: '',
           products: [
             { name: 'iPhone 16', price: 999 },
             { name: 'MacBook Air M3', price: 1299 },
             { name: 'iPad Pro 13', price: 1099 },
             { name: 'AirPods Pro', price: 249 },
             { name: 'Apple Watch S10', price: 399 }
           ],
           filtered: []
         }">
      <!-- Row template -->
      <template id="srch-row-tpl">
        <div style="display:flex;justify-content:space-between;align-items:center;padding:9px 12px;font-size:13px;color:var(--text);border-bottom:1px solid var(--border)">
          <span bind="p.name"></span>
          <span style="color:var(--primary);font-weight:600;font-size:12px;margin-left:8px" bind="'$' + p.price"></span>
        </div>
      </template>
      <!-- Input -->
      <input class="input" placeholder="Search products..." style="margin-bottom:0"
             style-border-bottom-left-radius="query ? '0' : ''"
             style-border-bottom-right-radius="query ? '0' : ''"
             on:input="query = $event.target.value; filtered = products.filter(item => item.name.toLowerCase().includes(query.toLowerCase()))">
      <!-- Results panel: only visible when user has typed something -->
      <div show="query" style="width:100%;border:1px solid var(--border);border-top:none;border-radius:0 0 8px 8px;overflow:hidden;background:var(--white)">
        <div each="p in filtered" template="srch-row-tpl"></div>
        <div show="!filtered.length" style="padding:10px 12px;font-size:12px;color:var(--text-muted);text-align:center" t="examples.search.noResults"></div>
      </div>
    </div>
  </div>
</section>

<!-- ═══ Example 4 — Shopping Cart with Global Store (#F8FAFC bg, Intermediate) ═══ -->
<section class="example-section alt">
  <div class="example-header">
    <h2 class="example-title" t="examples.cart.title"></h2>
    <span class="badge" t="examples.cart.badge"></span>
  </div>
  <p class="example-desc" t="examples.cart.desc">
    A global store shared between a product list and a cart badge — in different
    parts of the page. When a product is added, the badge and the cart summary
    update simultaneously, with no event bus or shared component needed.
  </p>
  <div class="example-panels">
    <div class="example-code-panel">
      <span class="code-tab">index.html</span>
      <pre><span class="hl-cmt">&lt;!-- Global cart store --&gt;</span>
<span class="hl-tag">&lt;div</span> <span class="hl-attr">store</span>=<span class="hl-str">"cart"</span>
     <span class="hl-attr">value</span>=<span class="hl-str">"{ items: [] }"</span><span class="hl-tag">&gt;&lt;/div&gt;</span>

<span class="hl-cmt">&lt;!-- Badge: anywhere in the page --&gt;</span>
<span class="hl-tag">&lt;span</span> <span class="hl-attr">class</span>=<span class="hl-str">"cart-badge"</span>
      <span class="hl-attr">bind</span>=<span class="hl-str">"$store.cart.items.length"</span><span class="hl-tag">&gt;&lt;/span&gt;</span>

<span class="hl-cmt">&lt;!-- Product list --&gt;</span>
<span class="hl-tag">&lt;div</span> <span class="hl-attr">get</span>=<span class="hl-str">"/products"</span> <span class="hl-attr">as</span>=<span class="hl-str">"products"</span><span class="hl-tag">&gt;</span>
  <span class="hl-tag">&lt;div</span> <span class="hl-attr">each</span>=<span class="hl-str">"p in products"</span><span class="hl-tag">&gt;</span>
    <span class="hl-tag">&lt;span</span> <span class="hl-attr">bind</span>=<span class="hl-str">"p.name"</span><span class="hl-tag">&gt;&lt;/span&gt;</span>
    <span class="hl-tag">&lt;button</span>
      <span class="hl-attr">on:click</span>=<span class="hl-str">"$store.cart.items =
        [...$store.cart.items, p]"</span><span class="hl-tag">&gt;</span>
      Add to cart
    <span class="hl-tag">&lt;/button&gt;</span>
  <span class="hl-tag">&lt;/div&gt;</span>
<span class="hl-tag">&lt;/div&gt;</span>

<span class="hl-cmt">&lt;!-- Cart summary: elsewhere in the page --&gt;</span>
<span class="hl-tag">&lt;div</span> <span class="hl-attr">show</span>=<span class="hl-str">"$store.cart.items.length &gt; 0"</span><span class="hl-tag">&gt;</span>
  <span class="hl-tag">&lt;div</span> <span class="hl-attr">each</span>=<span class="hl-str">"item in $store.cart.items"</span><span class="hl-tag">&gt;</span>
    <span class="hl-tag">&lt;span</span> <span class="hl-attr">bind</span>=<span class="hl-str">"item.name"</span><span class="hl-tag">&gt;&lt;/span&gt;</span>
    <span class="hl-tag">&lt;span</span> <span class="hl-attr">bind</span>=<span class="hl-str">"item.price | currency"</span><span class="hl-tag">&gt;&lt;/span&gt;</span>
  <span class="hl-tag">&lt;/div&gt;</span>
<span class="hl-tag">&lt;/div&gt;</span></pre>
    </div>
    <!-- Live preview: working cart -->
    <div class="example-preview-panel"
         state="{ cart: [], products: [
           { id: 1, name: 'Mechanical Keyboard', price: 149 },
           { id: 2, name: 'Ergonomic Mouse', price: 79 },
           { id: 3, name: 'Monitor Stand', price: 59 }
         ] }">
      <!-- Item templates (each requires an external template element) -->
      <template id="cart-prod-tpl">
        <div class="preview-todo-item">
          <span style="flex:1;font-size:13px" bind="product.name"></span>
          <span style="color:var(--text-muted);font-size:12px;margin-right:8px" bind="'$' + product.price"></span>
          <button class="btn btn-outline btn-sm"
                  style="padding:3px 10px;font-size:12px"
                  on:click="cart = cart.some(c => c.id === product.id) ? cart.map(c => c.id === product.id ? {...c, qty: c.qty+1} : c) : [...cart, {...product, qty: 1}]">＋</button>
        </div>
      </template>
      <template id="cart-item-tpl">
        <div style="display:flex;align-items:center;font-size:12px;padding:5px 0;gap:8px">
          <span style="flex:1;color:var(--text)" bind="item.name"></span>
          <span style="color:var(--text-muted);min-width:32px;text-align:right" bind="'$' + item.price"></span>
          <button class="btn btn-outline btn-sm"
                  style="padding:1px 8px;font-size:14px;line-height:1.4;min-width:26px"
                  on:click="cart = item.qty > 1 ? cart.map(c => c.id === item.id ? {...c, qty: c.qty-1} : c) : cart.filter(c => c.id !== item.id)">−</button>
          <span style="min-width:16px;text-align:center;font-weight:600;color:var(--text)" bind="item.qty"></span>
          <button class="btn btn-outline btn-sm"
                  style="padding:1px 8px;font-size:14px;line-height:1.4;min-width:26px"
                  on:click="cart = cart.map(c => c.id === item.id ? {...c, qty: c.qty+1} : c)">＋</button>
        </div>
      </template>
      <!-- Badge -->
      <div style="display:flex;align-items:center;justify-content:space-between;width:100%;margin-bottom:12px;padding-bottom:12px;border-bottom:1px solid var(--border)">
        <span style="font-family:var(--font-heading);font-weight:600;font-size:14px;color:var(--text)" t="examples.cart.products"></span>
        <span style="background:var(--primary);color:white;font-size:11px;font-weight:700;padding:3px 10px;border-radius:100px">
          🛒 <span bind="cart.reduce((s,i) => s+i.qty, 0)"></span>
        </span>
      </div>
      <!-- Products -->
      <div each="product in products" template="cart-prod-tpl" style="width:100%"></div>
      <!-- Cart summary -->
      <div style="margin-top:12px;padding-top:12px;border-top:1px solid var(--border);width:100%"
           show="cart.length > 0">
        <p style="font-size:12px;color:var(--text-muted);margin-bottom:6px" t="examples.cart.cartLabel"></p>
        <div each="item in cart" template="cart-item-tpl"></div>
        <div style="display:flex;justify-content:space-between;font-size:13px;font-weight:600;color:var(--text);margin-top:8px;padding-top:8px;border-top:1px solid var(--border)">
          <span t="examples.cart.total"></span>
          <span bind="'$' + cart.reduce((s, i) => s + i.price * i.qty, 0)"></span>
        </div>
      </div>
      <p show="!cart.length" style="font-size:12px;color:var(--text-muted);margin-top:12px;text-align:center" t="examples.cart.addHint"></p>
    </div>
  </div>
</section>

<!-- ═══ Example 5 — Live Polling (white bg, Beginner) ═══ -->
<section class="example-section">
  <div class="example-header">
    <h2 class="example-title" t="examples.polling.title"></h2>
    <span class="badge" t="examples.polling.badge"></span>
  </div>
  <p class="example-desc" t="examples.polling.desc" t-html>
    A server-status dashboard that refreshes automatically every 5 seconds using
    the <code>refresh</code> attribute. Conditional styling reacts instantly to the
    current health state — no <code>setInterval</code>, no <code>fetch</code> loop.
  </p>
  <div class="example-panels">
    <div class="example-code-panel">
      <span class="code-tab">index.html</span>
      <pre><span class="hl-cmt">&lt;!-- Refetches /api/status every 5 seconds --&gt;</span>
<span class="hl-tag">&lt;div</span> <span class="hl-attr">get</span>=<span class="hl-str">"/api/status"</span>
     <span class="hl-attr">refresh</span>=<span class="hl-str">"5000"</span>
     <span class="hl-attr">as</span>=<span class="hl-str">"s"</span><span class="hl-tag">&gt;</span>

  <span class="hl-cmt">&lt;!-- Badge: green when healthy, red otherwise --&gt;</span>
  <span class="hl-tag">&lt;span</span> <span class="hl-attr">class-success</span>=<span class="hl-str">"s.healthy"</span>
        <span class="hl-attr">class-error</span>=<span class="hl-str">"!s.healthy"</span>
        <span class="hl-attr">bind</span>=<span class="hl-str">"s.healthy ? 'Online' : 'Degraded'"</span><span class="hl-tag">&gt;</span>
  <span class="hl-tag">&lt;/span&gt;</span>

  <span class="hl-tag">&lt;div</span> <span class="hl-attr">each</span>=<span class="hl-str">"metric in s.metrics"</span><span class="hl-tag">&gt;</span>
    <span class="hl-tag">&lt;span</span> <span class="hl-attr">bind</span>=<span class="hl-str">"metric.label"</span><span class="hl-tag">&gt;&lt;/span&gt;</span>
    <span class="hl-tag">&lt;span</span> <span class="hl-attr">bind</span>=<span class="hl-str">"metric.value | number"</span><span class="hl-tag">&gt;&lt;/span&gt;</span>
  <span class="hl-tag">&lt;/div&gt;</span>

<span class="hl-tag">&lt;/div&gt;</span></pre>
    </div>
    <!-- Static preview: server status mock -->
    <div class="example-preview-panel" style="flex-direction:column;gap:14px;padding:24px">
      <div style="display:flex;align-items:center;justify-content:space-between">
        <span style="font-family:var(--font-heading);font-weight:600;font-size:15px;color:var(--text)" t="examples.polling.serverStatus"></span>
        <span style="background:#DCFCE7;color:#16A34A;font-size:11px;font-weight:700;padding:4px 12px;border-radius:100px;display:flex;align-items:center;gap:5px">
          <span style="display:inline-block;width:6px;height:6px;background:#16A34A;border-radius:50%"></span>
          <span t="examples.polling.onlineBadge"></span>
        </span>
      </div>
      <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:8px">
        <div style="text-align:center;background:var(--surface);border:1px solid var(--border);border-radius:8px;padding:12px">
          <div style="font-size:10px;color:var(--text-muted);margin-bottom:4px;text-transform:uppercase;letter-spacing:0.5px" t="examples.polling.cpu"></div>
          <div style="font-family:var(--font-mono);font-size:17px;font-weight:700;color:var(--text)">42%</div>
        </div>
        <div style="text-align:center;background:var(--surface);border:1px solid var(--border);border-radius:8px;padding:12px">
          <div style="font-size:10px;color:var(--text-muted);margin-bottom:4px;text-transform:uppercase;letter-spacing:0.5px" t="examples.polling.reqPerSec"></div>
          <div style="font-family:var(--font-mono);font-size:17px;font-weight:700;color:var(--text)">318</div>
        </div>
        <div style="text-align:center;background:var(--surface);border:1px solid var(--border);border-radius:8px;padding:12px">
          <div style="font-size:10px;color:var(--text-muted);margin-bottom:4px;text-transform:uppercase;letter-spacing:0.5px" t="examples.polling.errors"></div>
          <div style="font-family:var(--font-mono);font-size:17px;font-weight:700;color:var(--success)">0.1%</div>
        </div>
      </div>
      <div style="background:var(--surface);border:1px solid var(--border);border-radius:6px;padding:10px 14px">
        <div style="display:flex;justify-content:space-between;font-size:12px;color:var(--text-muted);margin-bottom:4px">
          <span t="examples.polling.lastResponse"></span>
          <span style="color:var(--text);font-family:var(--font-mono)">84ms</span>
        </div>
        <div style="display:flex;justify-content:space-between;font-size:12px;color:var(--text-muted)">
          <span t="examples.polling.nextPoll"></span>
          <span style="color:var(--primary);font-family:var(--font-mono)">5s</span>
        </div>
      </div>
      <div style="font-size:11px;color:var(--text-muted);text-align:center" t="examples.polling.refreshNote" t-html>
        Refreshes automatically via <code>refresh="5000"</code>
      </div>
    </div>
  </div>
</section>

<!-- ═══ CTA: #0F172A bg ═══ -->
<section class="cta-section">
  <h2 class="cta-title" t="examples.cta.title"></h2>
  <p class="cta-subtitle" t="examples.cta.subtitle"></p>
  <div class="cta-buttons">
    <a route="/docs" class="btn btn-cta-primary" t="examples.cta.viewDocs"></a>
    <a href="https://github.com/ErickXavier/no-js" target="_blank" class="btn btn-cta-secondary" t="examples.cta.github"></a>
  </div>
</section>
</div>
