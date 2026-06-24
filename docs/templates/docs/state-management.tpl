<!-- State Management — from state-management.md -->

<div class="doc-content">

  <!-- state -->
  <div class="doc-section">
    <h2 class="doc-title" id="state-state" t="docs.stateManagement.state.title"></h2>
    <p class="doc-text" t="docs.stateManagement.state.text"></p>
    <div class="demo-split">
      <div class="demo-code"><pre><span class="hl-tag">&lt;div</span> <span class="hl-attr">state</span>=<span class="hl-str">"{ count: 0, name: 'World' }"</span><span class="hl-tag">&gt;</span>
  <span class="hl-tag">&lt;h1&gt;</span>Hello, <span class="hl-tag">&lt;span</span> <span class="hl-attr">bind</span>=<span class="hl-str">"name"</span><span class="hl-tag">&gt;&lt;/span&gt;</span>!<span class="hl-tag">&lt;/h1&gt;</span>
  <span class="hl-tag">&lt;p&gt;</span>Count: <span class="hl-tag">&lt;span</span> <span class="hl-attr">bind</span>=<span class="hl-str">"count"</span><span class="hl-tag">&gt;&lt;/span&gt;&lt;/p&gt;</span>
  <span class="hl-tag">&lt;button</span> <span class="hl-attr">on:click</span>=<span class="hl-str">"count++"</span><span class="hl-tag">&gt;</span>+1<span class="hl-tag">&lt;/button&gt;</span>
  <span class="hl-tag">&lt;button</span> <span class="hl-attr">on:click</span>=<span class="hl-str">"count = 0"</span><span class="hl-tag">&gt;</span>Reset<span class="hl-tag">&lt;/button&gt;</span>
<span class="hl-tag">&lt;/div&gt;</span></pre></div>
      <div class="demo-preview" state="{ count: 0, name: 'World' }">
        <div class="demo-result-label" t="docs.stateManagement.state.preview"></div>
        <h3><span t="docs.stateManagement.state.helloLabel"></span> <span bind="name"></span>!</h3>
        <p><span t="docs.stateManagement.state.countLabel"></span> <span bind="count"></span></p>
        <div class="flex gap-2">
          <button class="btn btn-primary btn-sm" on:click="count++">+1</button>
          <button class="btn btn-outline btn-sm" on:click="count = 0" t="docs.stateManagement.state.resetBtn"></button>
        </div>
      </div>
    </div>
  </div>

  <!-- store -->
  <div class="doc-section">
    <h2 class="doc-title" id="state-store" t="docs.stateManagement.store.title"></h2>
    <p class="doc-text" t="docs.stateManagement.store.text"></p>
    <div class="code-block"><pre><span class="hl-cmt">&lt;!-- Define store (once, typically at top of page) --&gt;</span>
<span class="hl-tag">&lt;div</span> <span class="hl-attr">store</span>=<span class="hl-str">"app"</span> <span class="hl-attr">value</span>=<span class="hl-str">"{
  user: null,
  theme: 'dark',
  lang: 'en',
  notifications: []
}"</span><span class="hl-tag">&gt;&lt;/div&gt;</span>

<span class="hl-cmt">&lt;!-- Access store from anywhere --&gt;</span>
<span class="hl-tag">&lt;nav&gt;</span>
  <span class="hl-tag">&lt;span</span> <span class="hl-attr">bind</span>=<span class="hl-str">"$store.app.user.name"</span><span class="hl-tag">&gt;&lt;/span&gt;</span>
<span class="hl-tag">&lt;/nav&gt;</span></pre></div>
  </div>

  <!-- configStores -->
  <div class="doc-section">
    <h2 class="doc-title" id="state-config-stores" t="docs.stateManagement.configStores.title"></h2>
    <p class="doc-text" t="docs.stateManagement.configStores.text"></p>
    <div class="code-block"><pre><span class="hl-tag">&lt;script&gt;</span>
  <span class="hl-fn">NoJS</span>.<span class="hl-fn">config</span>({
    <span class="hl-attr">stores</span>: {
      <span class="hl-attr">auth</span>: { <span class="hl-attr">user</span>: <span class="hl-kw">null</span>, <span class="hl-attr">token</span>: <span class="hl-str">''</span> },
      <span class="hl-attr">cart</span>: { <span class="hl-attr">items</span>: [], <span class="hl-attr">total</span>: <span class="hl-num">0</span> }
    }
  });
<span class="hl-tag">&lt;/script&gt;</span>

<span class="hl-cmt">&lt;!-- Access from anywhere --&gt;</span>
<span class="hl-tag">&lt;span</span> <span class="hl-attr">bind</span>=<span class="hl-str">"$store.auth.user.name"</span><span class="hl-tag">&gt;&lt;/span&gt;</span>
<span class="hl-tag">&lt;span</span> <span class="hl-attr">bind</span>=<span class="hl-str">"$store.cart.items.length"</span><span class="hl-tag">&gt;&lt;/span&gt;</span></pre></div>
    <div class="callout"><p t="docs.stateManagement.configStores.callout"></p></div>
  </div>

  <!-- into -->
  <div class="doc-section">
    <h2 class="doc-title" id="state-into" t="docs.stateManagement.into.title"></h2>
    <p class="doc-text" t="docs.stateManagement.into.text"></p>
    <div class="code-block"><pre><span class="hl-cmt">&lt;!-- Define an empty store --&gt;</span>
<span class="hl-tag">&lt;div</span> <span class="hl-attr">store</span>=<span class="hl-str">"currentUser"</span> <span class="hl-attr">value</span>=<span class="hl-str">"{}"</span><span class="hl-tag">&gt;&lt;/div&gt;</span>

<span class="hl-cmt">&lt;!-- Fetch and write into the store --&gt;</span>
<span class="hl-tag">&lt;div</span> <span class="hl-attr">get</span>=<span class="hl-str">"/me"</span> <span class="hl-attr">as</span>=<span class="hl-str">"user"</span> <span class="hl-attr">into</span>=<span class="hl-str">"currentUser"</span><span class="hl-tag">&gt;&lt;/div&gt;</span>

<span class="hl-cmt">&lt;!-- Read from the store anywhere --&gt;</span>
<span class="hl-tag">&lt;nav&gt;</span>
  <span class="hl-tag">&lt;span</span> <span class="hl-attr">bind</span>=<span class="hl-str">"$store.currentUser.user.name"</span><span class="hl-tag">&gt;&lt;/span&gt;</span>
<span class="hl-tag">&lt;/nav&gt;</span></pre></div>
    <div class="callout"><p t="docs.stateManagement.into.callout"></p></div>
  </div>

  <!-- computed -->
  <div class="doc-section">
    <h2 class="doc-title" id="state-computed" t="docs.stateManagement.computed.title"></h2>
    <p class="doc-text" t="docs.stateManagement.computed.text"></p>
    <div class="demo-split">
      <div class="demo-code"><pre><span class="hl-tag">&lt;div</span> <span class="hl-attr">state</span>=<span class="hl-str">"{ price: 100, qty: 2, tax: 0.1 }"</span><span class="hl-tag">&gt;</span>
  <span class="hl-tag">&lt;div</span> <span class="hl-attr">computed</span>=<span class="hl-str">"subtotal"</span>
       <span class="hl-attr">expr</span>=<span class="hl-str">"price * qty"</span><span class="hl-tag">&gt;&lt;/div&gt;</span>
  <span class="hl-tag">&lt;div</span> <span class="hl-attr">computed</span>=<span class="hl-str">"total"</span>
       <span class="hl-attr">expr</span>=<span class="hl-str">"subtotal * (1 + tax)"</span><span class="hl-tag">&gt;&lt;/div&gt;</span>

  <span class="hl-tag">&lt;p&gt;</span>Total: $<span class="hl-tag">&lt;span</span> <span class="hl-attr">bind</span>=<span class="hl-str">"total"</span><span class="hl-tag">&gt;&lt;/span&gt;&lt;/p&gt;</span>
  <span class="hl-tag">&lt;input</span> <span class="hl-attr">type</span>=<span class="hl-str">"number"</span> <span class="hl-attr">model</span>=<span class="hl-str">"qty"</span> <span class="hl-tag">/&gt;</span>
<span class="hl-tag">&lt;/div&gt;</span></pre></div>
      <div class="demo-preview" state="{ price: 100, qty: 2, tax: 0.1 }">
        <div class="demo-result-label" t="docs.stateManagement.computed.preview"></div>
        <div computed="subtotal" expr="price * qty"></div>
        <div computed="total" expr="subtotal * (1 + tax)"></div>
        <p><span t="docs.stateManagement.computed.priceLabel"></span> $<span bind="price"></span></p>
        <p><span t="docs.stateManagement.computed.qtyLabel"></span> <input type="number" model="qty" class="input" style="width:80px;display:inline-block" /></p>
        <p><span t="docs.stateManagement.computed.subtotalLabel"></span> $<span bind="subtotal"></span></p>
        <p><strong><span t="docs.stateManagement.computed.totalLabel"></span> $<span bind="total"></span></strong></p>
      </div>
    </div>
  </div>

  <!-- watch -->
  <div class="doc-section">
    <h2 class="doc-title" id="state-watch" t="docs.stateManagement.watch.title"></h2>
    <p class="doc-text" t="docs.stateManagement.watch.text"></p>
    <div class="code-block"><pre><span class="hl-tag">&lt;div</span> <span class="hl-attr">state</span>=<span class="hl-str">"{ search: '' }"</span>
     <span class="hl-attr">watch</span>=<span class="hl-str">"search"</span>
     <span class="hl-attr">on:change</span>=<span class="hl-str">"console.log('Search:', search)"</span><span class="hl-tag">&gt;</span>
  <span class="hl-tag">&lt;input</span> <span class="hl-attr">model</span>=<span class="hl-str">"search"</span> <span class="hl-tag">/&gt;</span>
<span class="hl-tag">&lt;/div&gt;</span></pre></div>
  </div>

  <!-- persistence -->
  <div class="doc-section">
    <h2 class="doc-title" id="state-persistence" t="docs.stateManagement.persistence.title"></h2>
    <p class="doc-text" t="docs.stateManagement.persistence.text"></p>
    <div class="code-block"><pre><span class="hl-cmt">&lt;!-- Persists to localStorage --&gt;</span>
<span class="hl-tag">&lt;div</span> <span class="hl-attr">state</span>=<span class="hl-str">"{ theme: 'dark', sidebar: true }"</span>
     <span class="hl-attr">persist</span>=<span class="hl-str">"localStorage"</span>
     <span class="hl-attr">persist-key</span>=<span class="hl-str">"app-settings"</span><span class="hl-tag">&gt;</span>
<span class="hl-tag">&lt;/div&gt;</span>

<span class="hl-cmt">&lt;!-- Persists to sessionStorage --&gt;</span>
<span class="hl-tag">&lt;div</span> <span class="hl-attr">state</span>=<span class="hl-str">"{ cartItems: [] }"</span>
     <span class="hl-attr">persist</span>=<span class="hl-str">"sessionStorage"</span>
     <span class="hl-attr">persist-key</span>=<span class="hl-str">"cart"</span><span class="hl-tag">&gt;</span>
<span class="hl-tag">&lt;/div&gt;</span></pre></div>
  </div>

  <!-- persist-fields -->
  <div class="doc-section">
    <h2 class="doc-title" id="state-persist-fields" t="docs.stateManagement.persistFields.title"></h2>
    <p class="doc-text" t="docs.stateManagement.persistFields.text"></p>
    <div class="code-block"><pre><span class="hl-cmt">&lt;!-- Only theme and sidebar are persisted — token never touches storage --&gt;</span>
<span class="hl-tag">&lt;div</span> <span class="hl-attr">state</span>=<span class="hl-str">"{ theme: 'dark', sidebar: true, token: '' }"</span>
     <span class="hl-attr">persist</span>=<span class="hl-str">"localStorage"</span>
     <span class="hl-attr">persist-key</span>=<span class="hl-str">"app-settings"</span>
     <span class="hl-attr">persist-fields</span>=<span class="hl-str">"theme, sidebar"</span><span class="hl-tag">&gt;</span>
<span class="hl-tag">&lt;/div&gt;</span></pre></div>
    <p class="doc-text" t="docs.stateManagement.persistFields.text2"></p>
    <div class="callout"><p t="docs.stateManagement.persistFields.callout"></p></div>
  </div>

  <!-- persist-schema -->
  <div class="doc-section">
    <h2 class="doc-title" id="state-persist-schema" t="docs.stateManagement.persistSchema.title"></h2>
    <p class="doc-text" t="docs.stateManagement.persistSchema.text"></p>
    <div class="code-block"><pre><span class="hl-tag">&lt;div</span> <span class="hl-attr">state</span>=<span class="hl-str">"{ theme: 'light', lang: 'en' }"</span>
     <span class="hl-attr">persist</span>=<span class="hl-str">"localStorage"</span>
     <span class="hl-attr">persist-key</span>=<span class="hl-str">"prefs"</span>
     <span class="hl-attr">persist-fields</span>=<span class="hl-str">"theme,lang"</span>
     <span class="hl-attr">persist-schema</span><span class="hl-tag">&gt;</span>
  <span class="hl-cmt">&lt;!-- Old keys not in initial state are discarded on restore --&gt;</span>
<span class="hl-tag">&lt;/div&gt;</span></pre></div>
  </div>

  <!-- NoJS.notify() -->
  <div class="doc-section">
    <h2 class="doc-title" id="state-notify" t="docs.stateManagement.notify.title"></h2>
    <p class="doc-text" t="docs.stateManagement.notify.text"></p>
    <div class="code-block"><pre><span class="hl-cmt">// External JS mutates a store</span>
<span class="hl-fn">NoJS</span>.<span class="hl-attr">store</span>.<span class="hl-attr">cart</span>.<span class="hl-attr">items</span>.<span class="hl-fn">push</span>({ <span class="hl-attr">id</span>: <span class="hl-num">1</span>, <span class="hl-attr">name</span>: <span class="hl-str">'Widget'</span> });
<span class="hl-fn">NoJS</span>.<span class="hl-fn">notify</span>();  <span class="hl-cmt">// Flush DOM updates</span></pre></div>
    <div class="callout"><p t="docs.stateManagement.notify.callout"></p></div>
  </div>

  <!-- Context Scoping -->
  <div class="doc-section">
    <h2 class="doc-title" id="state-scoping" t="docs.stateManagement.scoping.title"></h2>
    <p class="doc-text" t="docs.stateManagement.scoping.text"></p>
    <div class="code-block"><pre><span class="hl-tag">&lt;div</span> <span class="hl-attr">state</span>=<span class="hl-str">"{ color: 'red' }"</span><span class="hl-tag">&gt;</span>
  <span class="hl-tag">&lt;p</span> <span class="hl-attr">bind</span>=<span class="hl-str">"color"</span><span class="hl-tag">&gt;&lt;/p&gt;</span>  <span class="hl-cmt">&lt;!-- red --&gt;</span>
  <span class="hl-tag">&lt;div</span> <span class="hl-attr">state</span>=<span class="hl-str">"{ color: 'blue' }"</span><span class="hl-tag">&gt;</span>
    <span class="hl-tag">&lt;p</span> <span class="hl-attr">bind</span>=<span class="hl-str">"color"</span><span class="hl-tag">&gt;&lt;/p&gt;</span>  <span class="hl-cmt">&lt;!-- blue (shadowed) --&gt;</span>
  <span class="hl-tag">&lt;/div&gt;</span>
<span class="hl-tag">&lt;/div&gt;</span></pre></div>
    <div class="callout">
      <p t="docs.stateManagement.scoping.callout"></p>
    </div>
  </div>

</div>

