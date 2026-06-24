<!-- Actions & Refs — from actions-refs.md -->

<div class="doc-content">

  <!-- call -->
  <div class="doc-section">
    <h2 class="doc-title" id="actions-refs-call" t="docs.actionsRefs.call.title"></h2>
    <div class="code-block"><pre><span class="hl-cmt">&lt;!-- Logout button --&gt;</span>
<span class="hl-tag">&lt;a</span> <span class="hl-attr">call</span>=<span class="hl-str">"/api/logout"</span>
   <span class="hl-attr">method</span>=<span class="hl-str">"post"</span>
   <span class="hl-attr">success</span>=<span class="hl-str">"#loggedOut"</span>
   <span class="hl-attr">error</span>=<span class="hl-str">"#logoutError"</span>
   <span class="hl-attr">confirm</span>=<span class="hl-str">"Are you sure you want to logout?"</span><span class="hl-tag">&gt;</span>
  Logout
<span class="hl-tag">&lt;/a&gt;</span>

<span class="hl-cmt">&lt;!-- Like button --&gt;</span>
<span class="hl-tag">&lt;button</span> <span class="hl-attr">call</span>=<span class="hl-str">"/api/posts/{post.id}/like"</span>
        <span class="hl-attr">method</span>=<span class="hl-str">"post"</span>
        <span class="hl-attr">then</span>=<span class="hl-str">"post.likes++"</span><span class="hl-tag">&gt;</span>
  ❤️ <span class="hl-tag">&lt;span</span> <span class="hl-attr">bind</span>=<span class="hl-str">"post.likes"</span><span class="hl-tag">&gt;&lt;/span&gt;</span>
<span class="hl-tag">&lt;/button&gt;</span>

<span class="hl-cmt">&lt;!-- Delete with confirmation --&gt;</span>
<span class="hl-tag">&lt;button</span> <span class="hl-attr">call</span>=<span class="hl-str">"/api/items/{item.id}"</span>
        <span class="hl-attr">method</span>=<span class="hl-str">"delete"</span>
        <span class="hl-attr">confirm</span>=<span class="hl-str">"Delete this item?"</span>
        <span class="hl-attr">then</span>=<span class="hl-str">"items.splice($index, 1)"</span><span class="hl-tag">&gt;</span>
  🗑 Delete
<span class="hl-tag">&lt;/button&gt;</span>

<span class="hl-cmt">&lt;!-- Write result to a global store --&gt;</span>
<span class="hl-tag">&lt;button</span> <span class="hl-attr">call</span>=<span class="hl-str">"/api/me"</span>
        <span class="hl-attr">method</span>=<span class="hl-str">"get"</span>
        <span class="hl-attr">as</span>=<span class="hl-str">"user"</span>
        <span class="hl-attr">into</span>=<span class="hl-str">"currentUser"</span><span class="hl-tag">&gt;</span>
  Load Profile
<span class="hl-tag">&lt;/button&gt;</span></pre></div>
  </div>

  <!-- Call Attributes -->
  <div class="doc-section">
    <h3 class="doc-title" id="actions-refs-call-attrs" t="docs.actionsRefs.callAttrs.title"></h3>
    <p class="doc-text" t="docs.actionsRefs.callAttrs.text"></p>
    <table class="doc-table">
      <thead><tr><th t="docs.actionsRefs.callAttrs.col1"></th><th t="docs.actionsRefs.callAttrs.col2"></th><th t="docs.actionsRefs.callAttrs.col3"></th></tr></thead>
      <tbody>
        <tr><td><code>call</code></td><td><code>string</code></td><td t="docs.actionsRefs.callAttrs.call"></td></tr>
        <tr><td><code>method</code></td><td><code>string</code></td><td t="docs.actionsRefs.callAttrs.method"></td></tr>
        <tr><td><code>body</code></td><td><code>string</code></td><td t="docs.actionsRefs.callAttrs.body"></td></tr>
        <tr><td><code>headers</code></td><td><code>string</code></td><td t="docs.actionsRefs.callAttrs.headers"></td></tr>
        <tr><td><code>as</code></td><td><code>string</code></td><td t="docs.actionsRefs.callAttrs.as"></td></tr>
        <tr><td><code>into</code></td><td><code>string</code></td><td t="docs.actionsRefs.callAttrs.into"></td></tr>
        <tr><td><code>loading</code></td><td><code>string</code></td><td t="docs.actionsRefs.callAttrs.loading"></td></tr>
        <tr><td><code>error</code></td><td><code>string</code></td><td t="docs.actionsRefs.callAttrs.error"></td></tr>
        <tr><td><code>success</code></td><td><code>string</code></td><td t="docs.actionsRefs.callAttrs.success"></td></tr>
        <tr><td><code>then</code></td><td><code>string</code></td><td t="docs.actionsRefs.callAttrs.then"></td></tr>
        <tr><td><code>redirect</code></td><td><code>string</code></td><td t="docs.actionsRefs.callAttrs.redirect"></td></tr>
        <tr><td><code>confirm</code></td><td><code>string</code></td><td t="docs.actionsRefs.callAttrs.confirm"></td></tr>
      </tbody>
    </table>
  </div>

  <!-- Loading Template -->
  <div class="doc-section">
    <h3 class="doc-title" id="actions-refs-loading" t="docs.actionsRefs.loadingTpl.title"></h3>
    <p class="doc-text" t="docs.actionsRefs.loadingTpl.text"></p>
    <div class="code-block"><pre><span class="hl-tag">&lt;button</span> <span class="hl-attr">call</span>=<span class="hl-str">"/api/deploy"</span>
        <span class="hl-attr">method</span>=<span class="hl-str">"post"</span>
        <span class="hl-attr">loading</span>=<span class="hl-str">"#deploySpinner"</span>
        <span class="hl-attr">success</span>=<span class="hl-str">"#deployDone"</span><span class="hl-tag">&gt;</span>
  🚀 Deploy
<span class="hl-tag">&lt;/button&gt;</span>

<span class="hl-tag">&lt;template</span> <span class="hl-attr">id</span>=<span class="hl-str">"deploySpinner"</span><span class="hl-tag">&gt;</span>
  <span class="hl-tag">&lt;span</span> <span class="hl-attr">class</span>=<span class="hl-str">"spinner"</span><span class="hl-tag">&gt;&lt;/span&gt;</span> Deploying…
<span class="hl-tag">&lt;/template&gt;</span></pre></div>
  </div>

  <!-- Custom Headers -->
  <div class="doc-section">
    <h3 class="doc-title" id="actions-refs-headers" t="docs.actionsRefs.customHeaders.title"></h3>
    <p class="doc-text" t="docs.actionsRefs.customHeaders.text"></p>
    <div class="code-block"><pre><span class="hl-tag">&lt;button</span> <span class="hl-attr">call</span>=<span class="hl-str">"/api/admin/clear-cache"</span>
        <span class="hl-attr">method</span>=<span class="hl-str">"post"</span>
        <span class="hl-attr">headers</span>=<span class="hl-str">'{"X-Admin-Token": "abc123"}'</span><span class="hl-tag">&gt;</span>
  Clear Cache
<span class="hl-tag">&lt;/button&gt;</span></pre></div>
  </div>

  <!-- Redirect After Success -->
  <div class="doc-section">
    <h3 class="doc-title" id="actions-refs-redirect" t="docs.actionsRefs.redirectAfter.title"></h3>
    <p class="doc-text" t="docs.actionsRefs.redirectAfter.text"></p>
    <div class="code-block"><pre><span class="hl-tag">&lt;button</span> <span class="hl-attr">call</span>=<span class="hl-str">"/api/onboarding/complete"</span>
        <span class="hl-attr">method</span>=<span class="hl-str">"post"</span>
        <span class="hl-attr">redirect</span>=<span class="hl-str">"/dashboard"</span><span class="hl-tag">&gt;</span>
  Finish Setup →
<span class="hl-tag">&lt;/button&gt;</span></pre></div>
  </div>

  <!-- Abort / SwitchMap -->
  <div class="doc-section">
    <h3 class="doc-title" id="actions-refs-abort" t="docs.actionsRefs.abort.title"></h3>
    <p class="doc-text" t="docs.actionsRefs.abort.text"></p>
  </div>

  <!-- Events -->
  <div class="doc-section">
    <h3 class="doc-title" id="actions-refs-events" t="docs.actionsRefs.events.title"></h3>
    <p class="doc-text" t="docs.actionsRefs.events.text"></p>
    <table class="doc-table">
      <thead><tr><th t="docs.actionsRefs.events.col1"></th><th t="docs.actionsRefs.events.col2"></th></tr></thead>
      <tbody>
        <tr><td><code>fetch:success</code></td><td t="docs.actionsRefs.events.fetchSuccess"></td></tr>
        <tr><td><code>fetch:error</code></td><td t="docs.actionsRefs.events.fetchError"></td></tr>
        <tr><td><code>fetch:end</code></td><td t="docs.actionsRefs.events.fetchEnd"></td></tr>
      </tbody>
    </table>
  </div>

  <!-- Request Lifecycle -->
  <div class="doc-section">
    <h3 class="doc-title" id="actions-refs-lifecycle" t="docs.actionsRefs.lifecycle.title"></h3>
    <div class="code-block"><pre><span class="hl-cmt">click → [confirm?] → [loading] → [success | error]</span>
<span class="hl-cmt">                                      ↓         ↓</span>
<span class="hl-cmt">                                 render tpl   render tpl</span>
<span class="hl-cmt">                                 exec `then`  log warning</span>
<span class="hl-cmt">                                 `redirect`</span></pre></div>
  </div>

  <!-- trigger -->
  <div class="doc-section">
    <h2 class="doc-title" id="actions-refs-trigger" t="docs.actionsRefs.trigger.title"></h2>
    <div class="code-block"><pre><span class="hl-cmt">&lt;!-- Child emits an event --&gt;</span>
<span class="hl-tag">&lt;button</span> <span class="hl-attr">trigger</span>=<span class="hl-str">"item-selected"</span> <span class="hl-attr">trigger-data</span>=<span class="hl-str">"item"</span><span class="hl-tag">&gt;</span>
  Select
<span class="hl-tag">&lt;/button&gt;</span>

<span class="hl-cmt">&lt;!-- Parent listens --&gt;</span>
<span class="hl-tag">&lt;div</span> <span class="hl-attr">on:item-selected</span>=<span class="hl-str">"handleSelection($event.detail)"</span><span class="hl-tag">&gt;</span>
  <span class="hl-tag">&lt;div</span> <span class="hl-attr">each</span>=<span class="hl-str">"item in items"</span> <span class="hl-attr">template</span>=<span class="hl-str">"itemTpl"</span><span class="hl-tag">&gt;&lt;/div&gt;</span>
<span class="hl-tag">&lt;/div&gt;</span></pre></div>
  </div>

  <!-- Trigger Attributes -->
  <div class="doc-section">
    <h2 class="doc-title" id="actions-trigger-attrs" t="docs.actionsRefs.triggerAttrs.title"></h2>
    <p class="doc-text" t="docs.actionsRefs.triggerAttrs.text"></p>
    <table class="doc-table">
      <thead><tr><th t="docs.actionsRefs.triggerAttrs.col1"></th><th t="docs.actionsRefs.triggerAttrs.col2"></th></tr></thead>
      <tbody>
        <tr><td><code>trigger-data</code></td><td t="docs.actionsRefs.triggerAttrs.triggerData"></td></tr>
      </tbody>
    </table>
    <div class="code-block"><pre><span class="hl-tag">&lt;button</span>
  <span class="hl-attr">trigger</span>=<span class="hl-str">"item-selected"</span>
  <span class="hl-attr">trigger-data</span>=<span class="hl-str">"{ id: item.id, name: item.name }"</span><span class="hl-tag">&gt;</span>
  Select
<span class="hl-tag">&lt;/button&gt;</span>

<span class="hl-cmt">&lt;!-- Listen for the custom event --&gt;</span>
<span class="hl-tag">&lt;div</span> <span class="hl-attr">on:item-selected</span>=<span class="hl-str">"selected = $event.detail"</span><span class="hl-tag">&gt;</span><span class="hl-tag">&lt;/div&gt;</span></pre></div>
  </div>

  <!-- ref -->
  <div class="doc-section">
    <h2 class="doc-title" id="actions-refs-ref" t="docs.actionsRefs.ref.title"></h2>
    <p class="doc-text" t="docs.actionsRefs.ref.text"></p>
    <div class="code-block"><pre><span class="hl-tag">&lt;div</span> <span class="hl-attr">state</span>=<span class="hl-str">"{ }"</span><span class="hl-tag">&gt;</span>
  <span class="hl-tag">&lt;input</span> <span class="hl-attr">ref</span>=<span class="hl-str">"searchInput"</span> <span class="hl-attr">type</span>=<span class="hl-str">"text"</span> <span class="hl-tag">/&gt;</span>
  <span class="hl-tag">&lt;canvas</span> <span class="hl-attr">ref</span>=<span class="hl-str">"chart"</span><span class="hl-tag">&gt;&lt;/canvas&gt;</span>
  <span class="hl-tag">&lt;button</span> <span class="hl-attr">on:click</span>=<span class="hl-str">"$refs.searchInput.focus()"</span><span class="hl-tag">&gt;</span>Focus Search<span class="hl-tag">&lt;/button&gt;</span>
<span class="hl-tag">&lt;/div&gt;</span></pre></div>
  </div>

  <!-- $refs -->
  <div class="doc-section">
    <h2 class="doc-title" id="actions-refs-refs-map" t="docs.actionsRefs.refsMap.title"></h2>
    <p class="doc-text" t="docs.actionsRefs.refsMap.text"></p>
    <div class="code-block"><pre><span class="hl-tag">&lt;video</span> <span class="hl-attr">ref</span>=<span class="hl-str">"player"</span> <span class="hl-attr">src</span>=<span class="hl-str">"video.mp4"</span><span class="hl-tag">&gt;&lt;/video&gt;</span>
<span class="hl-tag">&lt;button</span> <span class="hl-attr">on:click</span>=<span class="hl-str">"$refs.player.play()"</span><span class="hl-tag">&gt;</span>▶ Play<span class="hl-tag">&lt;/button&gt;</span>
<span class="hl-tag">&lt;button</span> <span class="hl-attr">on:click</span>=<span class="hl-str">"$refs.player.pause()"</span><span class="hl-tag">&gt;</span>⏸ Pause<span class="hl-tag">&lt;/button&gt;</span></pre></div>
  </div>

</div>