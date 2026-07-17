<!-- Server-Sent Events (SSE) — from sse.md -->

<div class="doc-content">

  <!-- Basic Usage -->
  <div class="doc-section">
    <h2 class="doc-title" id="sse-basic" t="docs.sse.basicTitle"></h2>
    <p class="doc-text" t="docs.sse.basicText"></p>
    <div class="code-block"><pre><span class="hl-cmt">&lt;!-- Latest value from an SSE stream --&gt;</span>
<span class="hl-tag">&lt;div</span> <span class="hl-attr">sse</span>=<span class="hl-str">"/api/ticker"</span> <span class="hl-attr">as</span>=<span class="hl-str">"quote"</span><span class="hl-tag">&gt;</span>
  <span class="hl-tag">&lt;span</span> <span class="hl-attr">bind</span>=<span class="hl-str">"quote.price"</span><span class="hl-tag">&gt;&lt;/span&gt;</span>
<span class="hl-tag">&lt;/div&gt;</span></pre></div>

    <p class="doc-text" t="docs.sse.text"></p>
    <div class="code-block"><pre><span class="hl-cmt">&lt;!-- Plain text fallback — non-JSON data becomes a string --&gt;</span>
<span class="hl-tag">&lt;div</span> <span class="hl-attr">sse</span>=<span class="hl-str">"/api/log"</span> <span class="hl-attr">as</span>=<span class="hl-str">"line"</span><span class="hl-tag">&gt;</span>
  <span class="hl-tag">&lt;p</span> <span class="hl-attr">bind</span>=<span class="hl-str">"line"</span><span class="hl-tag">&gt;&lt;/p&gt;</span>
<span class="hl-tag">&lt;/div&gt;</span></pre></div>
  </div>

  <!-- Attributes Table -->
  <div class="doc-section">
    <h2 class="doc-title" id="sse-attributes" t="docs.sse.attributesTitle"></h2>
    <table class="doc-table">
      <thead><tr><th t="docs.sse.col1"></th><th t="docs.sse.col2"></th><th t="docs.sse.col3"></th></tr></thead>
      <tbody>
        <tr><td><code>sse</code></td><td>string</td><td t="docs.sse.sse"></td></tr>
        <tr><td><code>as</code></td><td>string</td><td t="docs.sse.as"></td></tr>
        <tr><td><code>sse-event</code></td><td>string</td><td t="docs.sse.sseEvent"></td></tr>
        <tr><td><code>sse-insert</code></td><td>string</td><td t="docs.sse.sseInsert"></td></tr>
        <tr><td><code>sse-limit</code></td><td>number</td><td t="docs.sse.sseLimit"></td></tr>
        <tr><td><code>sse-credentials</code></td><td>boolean</td><td t="docs.sse.sseCredentials"></td></tr>
        <tr><td><code>into</code></td><td>string</td><td t="docs.sse.into"></td></tr>
        <tr><td><code>error</code></td><td>string</td><td t="docs.sse.error"></td></tr>
        <tr><td><code>then</code></td><td>string</td><td t="docs.sse.then"></td></tr>
      </tbody>
    </table>
  </div>

  <!-- Insert Modes -->
  <div class="doc-section">
    <h2 class="doc-title" id="sse-insert-modes" t="docs.sse.insertModesTitle"></h2>
    <p class="doc-text" t="docs.sse.insertModesText"></p>
    <div class="code-block"><pre><span class="hl-cmt">&lt;!-- Replace (default): each message overwrites the previous value --&gt;</span>
<span class="hl-tag">&lt;div</span> <span class="hl-attr">sse</span>=<span class="hl-str">"/api/ticker"</span> <span class="hl-attr">as</span>=<span class="hl-str">"quote"</span><span class="hl-tag">&gt;</span>
  <span class="hl-tag">&lt;span</span> <span class="hl-attr">bind</span>=<span class="hl-str">"quote.symbol"</span><span class="hl-tag">&gt;&lt;/span&gt;</span>: <span class="hl-tag">&lt;span</span> <span class="hl-attr">bind</span>=<span class="hl-str">"quote.price"</span><span class="hl-tag">&gt;&lt;/span&gt;</span>
<span class="hl-tag">&lt;/div&gt;</span>

<span class="hl-cmt">&lt;!-- Append: messages accumulate oldest-first, capped at 50 --&gt;</span>
<span class="hl-tag">&lt;div</span> <span class="hl-attr">sse</span>=<span class="hl-str">"/api/feed"</span> <span class="hl-attr">as</span>=<span class="hl-str">"messages"</span>
     <span class="hl-attr">sse-insert</span>=<span class="hl-str">"append"</span> <span class="hl-attr">sse-limit</span>=<span class="hl-str">"50"</span><span class="hl-tag">&gt;</span>
  <span class="hl-tag">&lt;div</span> <span class="hl-attr">foreach</span>=<span class="hl-str">"msg in messages"</span><span class="hl-tag">&gt;</span>
    <span class="hl-tag">&lt;p</span> <span class="hl-attr">bind</span>=<span class="hl-str">"msg.text"</span><span class="hl-tag">&gt;&lt;/p&gt;</span>
  <span class="hl-tag">&lt;/div&gt;</span>
<span class="hl-tag">&lt;/div&gt;</span>

<span class="hl-cmt">&lt;!-- Prepend: newest first, capped at 20 --&gt;</span>
<span class="hl-tag">&lt;div</span> <span class="hl-attr">sse</span>=<span class="hl-str">"/api/notifications"</span> <span class="hl-attr">as</span>=<span class="hl-str">"notifs"</span>
     <span class="hl-attr">sse-insert</span>=<span class="hl-str">"prepend"</span> <span class="hl-attr">sse-limit</span>=<span class="hl-str">"20"</span><span class="hl-tag">&gt;</span>
  <span class="hl-tag">&lt;div</span> <span class="hl-attr">foreach</span>=<span class="hl-str">"n in notifs"</span><span class="hl-tag">&gt;</span>
    <span class="hl-tag">&lt;p</span> <span class="hl-attr">bind</span>=<span class="hl-str">"n.message"</span><span class="hl-tag">&gt;&lt;/p&gt;</span>
  <span class="hl-tag">&lt;/div&gt;</span>
<span class="hl-tag">&lt;/div&gt;</span></pre></div>
  </div>

  <!-- Named Events -->
  <div class="doc-section">
    <h2 class="doc-title" id="sse-named-events" t="docs.sse.namedEventsTitle"></h2>
    <p class="doc-text" t="docs.sse.namedEventsText"></p>
    <div class="code-block"><pre><span class="hl-cmt">&lt;!-- Only listens to "price-update" events; default messages are ignored --&gt;</span>
<span class="hl-tag">&lt;div</span> <span class="hl-attr">sse</span>=<span class="hl-str">"/api/stream"</span> <span class="hl-attr">sse-event</span>=<span class="hl-str">"price-update"</span> <span class="hl-attr">as</span>=<span class="hl-str">"price"</span><span class="hl-tag">&gt;</span>
  <span class="hl-tag">&lt;span</span> <span class="hl-attr">bind</span>=<span class="hl-str">"price.value"</span><span class="hl-tag">&gt;&lt;/span&gt;</span>
<span class="hl-tag">&lt;/div&gt;</span>

<span class="hl-cmt">&lt;!-- Multiple elements can listen to different events on the same endpoint --&gt;</span>
<span class="hl-tag">&lt;div</span> <span class="hl-attr">sse</span>=<span class="hl-str">"/api/stream"</span> <span class="hl-attr">sse-event</span>=<span class="hl-str">"user-joined"</span> <span class="hl-attr">as</span>=<span class="hl-str">"joined"</span><span class="hl-tag">&gt;</span>
  <span class="hl-tag">&lt;p</span> <span class="hl-attr">bind</span>=<span class="hl-str">"joined.name + ' joined'"</span><span class="hl-tag">&gt;&lt;/p&gt;</span>
<span class="hl-tag">&lt;/div&gt;</span></pre></div>
  </div>

  <!-- Connection State ($sse) -->
  <div class="doc-section">
    <h2 class="doc-title" id="sse-connection-state" t="docs.sse.connectionStateTitle"></h2>
    <p class="doc-text" t="docs.sse.connectionStateText"></p>
    <table class="doc-table">
      <thead><tr><th t="docs.sse.stateCol1"></th><th t="docs.sse.stateCol2"></th><th t="docs.sse.stateCol3"></th></tr></thead>
      <tbody>
        <tr><td><code>$sse.connecting</code></td><td>boolean</td><td t="docs.sse.connecting"></td></tr>
        <tr><td><code>$sse.open</code></td><td>boolean</td><td t="docs.sse.open"></td></tr>
        <tr><td><code>$sse.error</code></td><td>boolean</td><td t="docs.sse.errorProp"></td></tr>
      </tbody>
    </table>
    <div class="callout" t="docs.sse.statesCallout"></div>
    <div class="code-block"><pre><span class="hl-tag">&lt;div</span> <span class="hl-attr">sse</span>=<span class="hl-str">"/api/stream"</span> <span class="hl-attr">as</span>=<span class="hl-str">"data"</span><span class="hl-tag">&gt;</span>
  <span class="hl-tag">&lt;p</span> <span class="hl-attr">show</span>=<span class="hl-str">"$sse.connecting"</span><span class="hl-tag">&gt;</span>Connecting...<span class="hl-tag">&lt;/p&gt;</span>
  <span class="hl-tag">&lt;p</span> <span class="hl-attr">show</span>=<span class="hl-str">"$sse.open"</span> <span class="hl-attr">bind</span>=<span class="hl-str">"data"</span><span class="hl-tag">&gt;&lt;/p&gt;</span>
  <span class="hl-tag">&lt;p</span> <span class="hl-attr">show</span>=<span class="hl-str">"$sse.error"</span><span class="hl-tag">&gt;</span>Connection lost.<span class="hl-tag">&lt;/p&gt;</span>
<span class="hl-tag">&lt;/div&gt;</span></pre></div>
  </div>

  <!-- Live Feed Example -->
  <div class="doc-section">
    <h2 class="doc-title" id="sse-live-feed" t="docs.sse.liveFeedTitle"></h2>
    <p class="doc-text" t="docs.sse.liveFeedText"></p>
    <div class="code-block"><pre><span class="hl-tag">&lt;div</span> <span class="hl-attr">sse</span>=<span class="hl-str">"/api/activity"</span> <span class="hl-attr">as</span>=<span class="hl-str">"events"</span>
     <span class="hl-attr">sse-insert</span>=<span class="hl-str">"prepend"</span> <span class="hl-attr">sse-limit</span>=<span class="hl-str">"100"</span>
     <span class="hl-attr">error</span>=<span class="hl-str">"sseFailed"</span><span class="hl-tag">&gt;</span>

  <span class="hl-cmt">&lt;!-- Status indicator --&gt;</span>
  <span class="hl-tag">&lt;span</span> <span class="hl-attr">show</span>=<span class="hl-str">"$sse.connecting"</span> <span class="hl-attr">class</span>=<span class="hl-str">"badge warn"</span><span class="hl-tag">&gt;</span>Reconnecting...<span class="hl-tag">&lt;/span&gt;</span>
  <span class="hl-tag">&lt;span</span> <span class="hl-attr">show</span>=<span class="hl-str">"$sse.open"</span> <span class="hl-attr">class</span>=<span class="hl-str">"badge ok"</span><span class="hl-tag">&gt;</span>Live<span class="hl-tag">&lt;/span&gt;</span>

  <span class="hl-cmt">&lt;!-- Feed items --&gt;</span>
  <span class="hl-tag">&lt;ul</span> <span class="hl-attr">role</span>=<span class="hl-str">"log"</span> <span class="hl-attr">aria-live</span>=<span class="hl-str">"polite"</span><span class="hl-tag">&gt;</span>
    <span class="hl-tag">&lt;li</span> <span class="hl-attr">foreach</span>=<span class="hl-str">"ev in events"</span> <span class="hl-attr">key</span>=<span class="hl-str">"ev.id"</span><span class="hl-tag">&gt;</span>
      <span class="hl-tag">&lt;strong</span> <span class="hl-attr">bind</span>=<span class="hl-str">"ev.user"</span><span class="hl-tag">&gt;&lt;/strong&gt;</span>
      <span class="hl-tag">&lt;span</span> <span class="hl-attr">bind</span>=<span class="hl-str">"ev.action"</span><span class="hl-tag">&gt;&lt;/span&gt;</span>
    <span class="hl-tag">&lt;/li&gt;</span>
  <span class="hl-tag">&lt;/ul&gt;</span>
<span class="hl-tag">&lt;/div&gt;</span>

<span class="hl-tag">&lt;template</span> <span class="hl-attr">id</span>=<span class="hl-str">"sseFailed"</span> <span class="hl-attr">var</span>=<span class="hl-str">"err"</span><span class="hl-tag">&gt;</span>
  <span class="hl-tag">&lt;div</span> <span class="hl-attr">class</span>=<span class="hl-str">"error"</span><span class="hl-tag">&gt;</span>
    <span class="hl-tag">&lt;p</span> <span class="hl-attr">bind</span>=<span class="hl-str">"err.message"</span><span class="hl-tag">&gt;&lt;/p&gt;</span>
  <span class="hl-tag">&lt;/div&gt;</span>
<span class="hl-tag">&lt;/template&gt;</span></pre></div>
  </div>

  <!-- Reactive URL -->
  <div class="doc-section">
    <h2 class="doc-title" id="sse-reactive-url" t="docs.sse.reactiveUrlTitle"></h2>
    <p class="doc-text" t="docs.sse.reactiveUrlText"></p>
    <div class="code-block"><pre><span class="hl-tag">&lt;div</span> <span class="hl-attr">state</span>=<span class="hl-str">"{ channel: 'general' }"</span><span class="hl-tag">&gt;</span>
  <span class="hl-tag">&lt;select</span> <span class="hl-attr">model</span>=<span class="hl-str">"channel"</span><span class="hl-tag">&gt;</span>
    <span class="hl-tag">&lt;option</span> <span class="hl-attr">value</span>=<span class="hl-str">"general"</span><span class="hl-tag">&gt;</span>General<span class="hl-tag">&lt;/option&gt;</span>
    <span class="hl-tag">&lt;option</span> <span class="hl-attr">value</span>=<span class="hl-str">"alerts"</span><span class="hl-tag">&gt;</span>Alerts<span class="hl-tag">&lt;/option&gt;</span>
  <span class="hl-tag">&lt;/select&gt;</span>

  <span class="hl-cmt">&lt;!-- Connection closes and reopens when channel changes --&gt;</span>
  <span class="hl-tag">&lt;div</span> <span class="hl-attr">sse</span>=<span class="hl-str">"/api/stream/{channel}"</span> <span class="hl-attr">as</span>=<span class="hl-str">"messages"</span>
       <span class="hl-attr">sse-insert</span>=<span class="hl-str">"append"</span> <span class="hl-attr">sse-limit</span>=<span class="hl-str">"30"</span><span class="hl-tag">&gt;</span>
    <span class="hl-tag">&lt;p</span> <span class="hl-attr">foreach</span>=<span class="hl-str">"msg in messages"</span> <span class="hl-attr">bind</span>=<span class="hl-str">"msg.text"</span><span class="hl-tag">&gt;&lt;/p&gt;</span>
  <span class="hl-tag">&lt;/div&gt;</span>
<span class="hl-tag">&lt;/div&gt;</span></pre></div>
  </div>

  <!-- Store Integration -->
  <div class="doc-section">
    <h2 class="doc-title" id="sse-store" t="docs.sse.storeTitle"></h2>
    <p class="doc-text" t="docs.sse.storeText"></p>
    <div class="code-block"><pre><span class="hl-cmt">&lt;!-- SSE data written to both local context and the "live" store --&gt;</span>
<span class="hl-tag">&lt;div</span> <span class="hl-attr">sse</span>=<span class="hl-str">"/api/ticker"</span> <span class="hl-attr">as</span>=<span class="hl-str">"price"</span> <span class="hl-attr">into</span>=<span class="hl-str">"live"</span><span class="hl-tag">&gt;</span>
  <span class="hl-tag">&lt;span</span> <span class="hl-attr">bind</span>=<span class="hl-str">"price"</span><span class="hl-tag">&gt;&lt;/span&gt;</span>
<span class="hl-tag">&lt;/div&gt;</span>

<span class="hl-cmt">&lt;!-- Consumed from anywhere via the store --&gt;</span>
<span class="hl-tag">&lt;footer&gt;</span>
  <span class="hl-tag">&lt;span</span> <span class="hl-attr">bind</span>=<span class="hl-str">"$store.live.price"</span><span class="hl-tag">&gt;&lt;/span&gt;</span>
<span class="hl-tag">&lt;/footer&gt;</span></pre></div>
  </div>

  <!-- Error Handling -->
  <div class="doc-section">
    <h2 class="doc-title" id="sse-error-handling" t="docs.sse.errorHandlingTitle"></h2>
    <p class="doc-text" t="docs.sse.errorHandlingText"></p>
    <div class="code-block"><pre><span class="hl-tag">&lt;div</span> <span class="hl-attr">sse</span>=<span class="hl-str">"/api/stream"</span> <span class="hl-attr">as</span>=<span class="hl-str">"data"</span> <span class="hl-attr">error</span>=<span class="hl-str">"sseError"</span><span class="hl-tag">&gt;</span>
  <span class="hl-tag">&lt;p</span> <span class="hl-attr">show</span>=<span class="hl-str">"$sse.connecting"</span><span class="hl-tag">&gt;</span>Reconnecting...<span class="hl-tag">&lt;/p&gt;</span>
  <span class="hl-tag">&lt;p</span> <span class="hl-attr">show</span>=<span class="hl-str">"$sse.open"</span> <span class="hl-attr">bind</span>=<span class="hl-str">"data"</span><span class="hl-tag">&gt;&lt;/p&gt;</span>
<span class="hl-tag">&lt;/div&gt;</span>

<span class="hl-tag">&lt;template</span> <span class="hl-attr">id</span>=<span class="hl-str">"sseError"</span> <span class="hl-attr">var</span>=<span class="hl-str">"err"</span><span class="hl-tag">&gt;</span>
  <span class="hl-tag">&lt;div</span> <span class="hl-attr">class</span>=<span class="hl-str">"error"</span><span class="hl-tag">&gt;</span>
    <span class="hl-tag">&lt;p</span> <span class="hl-attr">bind</span>=<span class="hl-str">"err.message"</span><span class="hl-tag">&gt;&lt;/p&gt;</span>
  <span class="hl-tag">&lt;/div&gt;</span>
<span class="hl-tag">&lt;/template&gt;</span></pre></div>
  </div>

  <!-- Per-Message Callback -->
  <div class="doc-section">
    <h2 class="doc-title" id="sse-then" t="docs.sse.thenTitle"></h2>
    <p class="doc-text" t="docs.sse.thenText"></p>
    <div class="code-block"><pre><span class="hl-tag">&lt;div</span> <span class="hl-attr">state</span>=<span class="hl-str">"{ count: 0 }"</span><span class="hl-tag">&gt;</span>
  <span class="hl-tag">&lt;div</span> <span class="hl-attr">sse</span>=<span class="hl-str">"/api/notifications"</span> <span class="hl-attr">as</span>=<span class="hl-str">"notif"</span>
       <span class="hl-attr">then</span>=<span class="hl-str">"count = count + 1"</span><span class="hl-tag">&gt;</span>
    <span class="hl-tag">&lt;p</span> <span class="hl-attr">bind</span>=<span class="hl-str">"notif.title"</span><span class="hl-tag">&gt;&lt;/p&gt;</span>
    <span class="hl-tag">&lt;small</span> <span class="hl-attr">bind</span>=<span class="hl-str">"count + ' received'"</span><span class="hl-tag">&gt;&lt;/small&gt;</span>
  <span class="hl-tag">&lt;/div&gt;</span>
<span class="hl-tag">&lt;/div&gt;</span></pre></div>
  </div>

  <!-- No Loading Template -->
  <div class="doc-section">
    <h2 class="doc-title" id="sse-no-loading" t="docs.sse.noLoadingTitle"></h2>
    <p class="doc-text" t="docs.sse.noLoadingText"></p>
  </div>

  <!-- Authentication Limitations -->
  <div class="doc-section">
    <h2 class="doc-title" id="sse-authentication" t="docs.sse.authTitle"></h2>
    <p class="doc-text" t="docs.sse.authText"></p>
    <div class="callout" t="docs.sse.authCallout" t-html></div>
    <div class="code-block"><pre><span class="hl-cmt">&lt;!-- Query-string token --&gt;</span>
<span class="hl-tag">&lt;div</span> <span class="hl-attr">sse</span>=<span class="hl-str">"/api/stream?token={authToken}"</span> <span class="hl-attr">as</span>=<span class="hl-str">"data"</span><span class="hl-tag">&gt;</span>...<span class="hl-tag">&lt;/div&gt;</span>

<span class="hl-cmt">&lt;!-- Cookie-based auth with sse-credentials --&gt;</span>
<span class="hl-tag">&lt;div</span> <span class="hl-attr">sse</span>=<span class="hl-str">"https://api.example.com/stream"</span>
     <span class="hl-attr">sse-credentials</span> <span class="hl-attr">as</span>=<span class="hl-str">"data"</span><span class="hl-tag">&gt;</span>...<span class="hl-tag">&lt;/div&gt;</span></pre></div>
    <p class="doc-text" t="docs.sse.interceptorsNote"></p>
  </div>

  <!-- HTTP/1.1 Connection Limit -->
  <div class="doc-section">
    <h2 class="doc-title" id="sse-connection-limit" t="docs.sse.connectionLimitTitle"></h2>
    <p class="doc-text" t="docs.sse.connectionLimitText"></p>
  </div>

</div>
