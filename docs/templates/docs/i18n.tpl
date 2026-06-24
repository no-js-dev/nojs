<!-- i18n — from i18n.md -->

<div class="doc-content">

  <!-- Setup -->
  <div class="doc-section">
    <h2 class="doc-title" id="i18n-setup" t="docs.i18n.setup.title"></h2>
    <div class="code-block"><pre highlight>&lt;script&gt;
  NoJS.i18n({
    defaultLocale: 'en',
    locales: {
      en: {
        welcome: 'Welcome to No.JS',
        greeting: 'Hello, {name}!',
        items: '{count} item | {count} items',  // Pluralization
        nav: { home: 'Home', docs: 'Documentation' }
      },
      es: {
        welcome: 'Bienvenido a No.JS',
        greeting: '¡Hola, {name}!',
        items: '{count} elemento | {count} elementos',
        nav: { home: 'Inicio', docs: 'Documentación' }
      },
      fr: {
        welcome: 'Bienvenue sur No.JS',
        greeting: 'Bonjour, {name} !',
        items: '{count} élément | {count} éléments',
        nav: { home: 'Accueil', docs: 'Documentation' }
      },
      pt: {
        welcome: 'Bem-vindo ao No.JS',
        greeting: 'Olá, {name}!',
        items: '{count} item | {count} itens',
        nav: { home: 'Início', docs: 'Documentação' }
      }
    }
  });
&lt;/script&gt;</pre></div>
  </div>

  <!-- External Locale Files -->
  <div class="doc-section">
    <h2 class="doc-title" id="i18n-external-files" t="docs.i18n.externalFiles.title"></h2>
    <p class="doc-text" t="docs.i18n.externalFiles.text"></p>

    <h3 class="doc-title" id="i18n-flat-mode" t="docs.i18n.externalFiles.flatSubtitle"></h3>
    <p class="doc-text" t="docs.i18n.externalFiles.flatText"></p>
    <div class="code-block"><pre>/locales/en.json
/locales/es.json
/locales/pt.json</pre></div>

    <div class="code-block"><pre><span class="hl-cmt">// /locales/en.json</span>
{
  <span class="hl-attr">"welcome"</span>: <span class="hl-str">"Welcome to No.JS"</span>,
  <span class="hl-attr">"greeting"</span>: <span class="hl-str">"Hello, {name}!"</span>,
  <span class="hl-attr">"nav"</span>: { <span class="hl-attr">"home"</span>: <span class="hl-str">"Home"</span>, <span class="hl-attr">"docs"</span>: <span class="hl-str">"Docs"</span> }
}</pre></div>

    <div class="code-block"><pre highlight>&lt;script&gt;
  NoJS.i18n({
    defaultLocale: 'en',
    loadPath: '/locales/{locale}.json'
  });
&lt;/script&gt;</pre></div>

    <h3 class="doc-title" id="i18n-namespace-mode" t="docs.i18n.externalFiles.nsSubtitle"></h3>
    <p class="doc-text" t="docs.i18n.externalFiles.nsText"></p>
    <div class="code-block"><pre>/locales/en/common.json
/locales/en/dashboard.json
/locales/es/common.json
/locales/es/dashboard.json</pre></div>

    <div class="code-block"><pre highlight>&lt;script&gt;
  NoJS.i18n({
    defaultLocale: 'en',
    loadPath: '/locales/{locale}/{ns}.json',
    ns: ['common']   // Loaded at init
  });
&lt;/script&gt;</pre></div>

    <h3 class="doc-title" id="i18n-ns-route" t="docs.i18n.externalFiles.nsRouteSubtitle"></h3>
    <p class="doc-text" t="docs.i18n.externalFiles.nsRouteText"></p>
    <div class="code-block"><pre><span class="hl-tag">&lt;template</span> <span class="hl-attr">route</span>=<span class="hl-str">"/dashboard"</span> <span class="hl-attr">src</span>=<span class="hl-str">"./pages/dashboard.tpl"</span> <span class="hl-attr">i18n-ns</span>=<span class="hl-str">"dashboard"</span><span class="hl-tag">&gt;&lt;/template&gt;</span></pre></div>

    <h3 class="doc-title" id="i18n-ns-element" t="docs.i18n.externalFiles.nsElementSubtitle"></h3>
    <p class="doc-text" t="docs.i18n.externalFiles.nsElementText"></p>
    <div class="code-block"><pre><span class="hl-tag">&lt;div</span> <span class="hl-attr">i18n-ns</span>=<span class="hl-str">"settings"</span><span class="hl-tag">&gt;</span>
  <span class="hl-tag">&lt;h2</span> <span class="hl-attr">t</span>=<span class="hl-str">"settings.title"</span><span class="hl-tag">&gt;&lt;/h2&gt;</span>
  <span class="hl-tag">&lt;p</span> <span class="hl-attr">t</span>=<span class="hl-str">"settings.desc"</span><span class="hl-tag">&gt;&lt;/p&gt;</span>
<span class="hl-tag">&lt;/div&gt;</span></pre></div>

    <h3 class="doc-title" id="i18n-caching" t="docs.i18n.externalFiles.cachingSubtitle"></h3>
    <p class="doc-text" t="docs.i18n.externalFiles.cachingText"></p>
    <div class="code-block"><pre highlight>NoJS.i18n({ loadPath: '/locales/{locale}.json', cache: false });</pre></div>
  </div>

  <!-- Usage -->
  <div class="doc-section">
    <h2 class="doc-title" id="i18n-usage" t="docs.i18n.usage.title"></h2>
    <div class="code-block"><pre><span class="hl-cmt">&lt;!-- Simple translation --&gt;</span>
<span class="hl-tag">&lt;h1</span> <span class="hl-attr">t</span>=<span class="hl-str">"welcome"</span><span class="hl-tag">&gt;&lt;/h1&gt;</span>
<span class="hl-cmt">&lt;!-- Output: "Welcome to No.JS" / "Bienvenido a No.JS" / "Bienvenue sur No.JS" --&gt;</span>

<span class="hl-cmt">&lt;!-- Interpolation --&gt;</span>
<span class="hl-tag">&lt;h1</span> <span class="hl-attr">t</span>=<span class="hl-str">"greeting"</span> <span class="hl-attr">t-name</span>=<span class="hl-str">"user.name"</span><span class="hl-tag">&gt;&lt;/h1&gt;</span>
<span class="hl-cmt">&lt;!-- Output: "Hello, John!" / "¡Hola, John!" / "Bonjour, John !" / "Olá, John!" --&gt;</span>

<span class="hl-cmt">&lt;!-- Nested keys --&gt;</span>
<span class="hl-tag">&lt;a</span> <span class="hl-attr">route</span>=<span class="hl-str">"/"</span> <span class="hl-attr">t</span>=<span class="hl-str">"nav.home"</span><span class="hl-tag">&gt;&lt;/a&gt;</span>

<span class="hl-cmt">&lt;!-- Pluralization --&gt;</span>
<span class="hl-tag">&lt;span</span> <span class="hl-attr">t</span>=<span class="hl-str">"items"</span> <span class="hl-attr">t-count</span>=<span class="hl-str">"cart.items.length"</span><span class="hl-tag">&gt;&lt;/span&gt;</span>
<span class="hl-cmt">&lt;!-- Output: "1 item" or "5 items" --&gt;</span>

<span class="hl-cmt">&lt;!-- Switch locale --&gt;</span>
<span class="hl-tag">&lt;button</span> <span class="hl-attr">on:click</span>=<span class="hl-str">"$i18n.locale = 'es'"</span><span class="hl-tag">&gt;</span>Español<span class="hl-tag">&lt;/button&gt;</span>
<span class="hl-tag">&lt;button</span> <span class="hl-attr">on:click</span>=<span class="hl-str">"$i18n.locale = 'en'"</span><span class="hl-tag">&gt;</span>English<span class="hl-tag">&lt;/button&gt;</span>
<span class="hl-tag">&lt;button</span> <span class="hl-attr">on:click</span>=<span class="hl-str">"$i18n.locale = 'pt'"</span><span class="hl-tag">&gt;</span>Português<span class="hl-tag">&lt;/button&gt;</span>

<span class="hl-cmt">&lt;!-- Current locale --&gt;</span>
<span class="hl-tag">&lt;span</span> <span class="hl-attr">bind</span>=<span class="hl-str">"$i18n.locale"</span><span class="hl-tag">&gt;&lt;/span&gt;</span></pre></div>
  </div>

  <!-- HTML Translations (t-html) -->
  <div class="doc-section">
    <h2 class="doc-title" id="i18n-t-html" t="docs.i18n.tHtml.title"></h2>
    <p class="doc-text" t="docs.i18n.tHtml.text"></p>
    <div class="code-block"><pre><span class="hl-cmt">&lt;!-- Translation: "Read our &lt;a href='/terms'&gt;terms&lt;/a&gt;" --&gt;</span>
<span class="hl-tag">&lt;div</span> <span class="hl-attr">t</span>=<span class="hl-str">"legal.notice"</span> <span class="hl-attr">t-html</span><span class="hl-tag">&gt;&lt;/div&gt;</span></pre></div>
    <div class="callout" t="docs.i18n.tHtml.callout"></div>
  </div>

  <!-- Number & Date Formatting -->
  <div class="doc-section">
    <h2 class="doc-title" id="i18n-formatting" t="docs.i18n.formatting.title" t-html></h2>
    <div class="code-block"><pre><span class="hl-cmt">&lt;!-- Currency --&gt;</span>
<span class="hl-tag">&lt;span</span> <span class="hl-attr">bind</span>=<span class="hl-str">"price | currency"</span><span class="hl-tag">&gt;&lt;/span&gt;</span>           <span class="hl-cmt">&lt;!-- $1,234.56 --&gt;</span>
<span class="hl-tag">&lt;span</span> <span class="hl-attr">bind</span>=<span class="hl-str">"price | currency:'BRL'"</span><span class="hl-tag">&gt;&lt;/span&gt;</span>     <span class="hl-cmt">&lt;!-- R$ 1.234,56 --&gt;</span>

<span class="hl-cmt">&lt;!-- Date --&gt;</span>
<span class="hl-tag">&lt;span</span> <span class="hl-attr">bind</span>=<span class="hl-str">"createdAt | date"</span><span class="hl-tag">&gt;&lt;/span&gt;</span>            <span class="hl-cmt">&lt;!-- 02/25/2026 --&gt;</span>
<span class="hl-tag">&lt;span</span> <span class="hl-attr">bind</span>=<span class="hl-str">"createdAt | date:'long'"</span><span class="hl-tag">&gt;&lt;/span&gt;</span>     <span class="hl-cmt">&lt;!-- February 25, 2026 --&gt;</span>
<span class="hl-tag">&lt;span</span> <span class="hl-attr">bind</span>=<span class="hl-str">"createdAt | datetime"</span><span class="hl-tag">&gt;&lt;/span&gt;</span>        <span class="hl-cmt">&lt;!-- 02/25/2026 3:45 PM --&gt;</span>
<span class="hl-tag">&lt;span</span> <span class="hl-attr">bind</span>=<span class="hl-str">"createdAt | relative"</span><span class="hl-tag">&gt;&lt;/span&gt;</span>        <span class="hl-cmt">&lt;!-- 2 hours ago --&gt;</span>

<span class="hl-cmt">&lt;!-- Number --&gt;</span>
<span class="hl-tag">&lt;span</span> <span class="hl-attr">bind</span>=<span class="hl-str">"value | number"</span><span class="hl-tag">&gt;&lt;/span&gt;</span>              <span class="hl-cmt">&lt;!-- 1,235 (default: 0 decimals) --&gt;</span>
<span class="hl-tag">&lt;span</span> <span class="hl-attr">bind</span>=<span class="hl-str">"value | number:2"</span><span class="hl-tag">&gt;&lt;/span&gt;</span>            <span class="hl-cmt">&lt;!-- 1,234.56 --&gt;</span>
<span class="hl-tag">&lt;span</span> <span class="hl-attr">bind</span>=<span class="hl-str">"value | percent"</span><span class="hl-tag">&gt;&lt;/span&gt;</span>             <span class="hl-cmt">&lt;!-- 45% --&gt;</span></pre></div>
  </div>

  <!-- Fallback Behavior -->
  <div class="doc-section">
    <h2 class="doc-title" id="i18n-fallback" t="docs.i18n.fallback.title"></h2>
    <p class="doc-text" t="docs.i18n.fallback.text"></p>
    <div class="code-block"><pre highlight>NoJS.i18n({
  defaultLocale: 'en',
  fallbackLocale: 'en',
  loadPath: '/locales/{locale}.json'
});</pre></div>
    <div class="callout">
      <p t="docs.i18n.fallback.callout"></p>
    </div>
  </div>

  <!-- Browser Locale Detection -->
  <div class="doc-section">
    <h2 class="doc-title" id="i18n-detection" t="docs.i18n.detection.title"></h2>
    <p class="doc-text" t="docs.i18n.detection.text"></p>
    <div class="code-block"><pre highlight>NoJS.i18n({
  detectBrowser: true,
  persist: true,
  defaultLocale: 'en',
  loadPath: '/locales/{locale}.json'
});</pre></div>
    <div class="callout">
      <p t="docs.i18n.detection.callout"></p>
    </div>
  </div>

  <!-- Live Demo -->
  <div class="doc-section">
    <h2 class="doc-title" id="i18n-live-demo" t="docs.i18n.liveDemo.title"></h2>
    <div class="demo-split">
      <div class="demo-code">
        <div class="code-block"><pre><span class="hl-tag">&lt;button</span> <span class="hl-attr">on:click</span>=<span class="hl-str">"$i18n.locale = 'en'"</span><span class="hl-tag">&gt;</span>EN<span class="hl-tag">&lt;/button&gt;</span>
<span class="hl-tag">&lt;button</span> <span class="hl-attr">on:click</span>=<span class="hl-str">"$i18n.locale = 'es'"</span><span class="hl-tag">&gt;</span>ES<span class="hl-tag">&lt;/button&gt;</span>
<span class="hl-tag">&lt;button</span> <span class="hl-attr">on:click</span>=<span class="hl-str">"$i18n.locale = 'fr'"</span><span class="hl-tag">&gt;</span>FR<span class="hl-tag">&lt;/button&gt;</span>
<span class="hl-tag">&lt;button</span> <span class="hl-attr">on:click</span>=<span class="hl-str">"$i18n.locale = 'it'"</span><span class="hl-tag">&gt;</span>IT<span class="hl-tag">&lt;/button&gt;</span>
<span class="hl-tag">&lt;button</span> <span class="hl-attr">on:click</span>=<span class="hl-str">"$i18n.locale = 'pt'"</span><span class="hl-tag">&gt;</span>PT<span class="hl-tag">&lt;/button&gt;</span>
<span class="hl-tag">&lt;h2</span> <span class="hl-attr">t</span>=<span class="hl-str">"welcome"</span><span class="hl-tag">&gt;&lt;/h2&gt;</span>
<span class="hl-tag">&lt;p</span> <span class="hl-attr">t</span>=<span class="hl-str">"greeting"</span> <span class="hl-attr">t-name</span>=<span class="hl-str">"'World'"</span><span class="hl-tag">&gt;&lt;/p&gt;</span></pre></div>
      </div>
      <div class="demo-preview">
        <span class="demo-result-label" t="docs.i18n.liveDemo.label"></span>
        <div>
          <div style="display: flex; gap: 8px; margin-bottom: 12px;">
            <button class="btn btn-sm" class-btn-primary="NoJS.locale === 'en'" class-btn-secondary="NoJS.locale !== 'en'" on:click="$i18n.locale = 'en'">EN</button>
            <button class="btn btn-sm" class-btn-primary="NoJS.locale === 'es'" class-btn-secondary="NoJS.locale !== 'es'" on:click="$i18n.locale = 'es'">ES</button>
            <button class="btn btn-sm" class-btn-primary="NoJS.locale === 'fr'" class-btn-secondary="NoJS.locale !== 'fr'" on:click="$i18n.locale = 'fr'">FR</button>
            <button class="btn btn-sm" class-btn-primary="NoJS.locale === 'it'" class-btn-secondary="NoJS.locale !== 'it'" on:click="$i18n.locale = 'it'">IT</button>
            <button class="btn btn-sm" class-btn-primary="NoJS.locale === 'pt'" class-btn-secondary="NoJS.locale !== 'pt'" on:click="$i18n.locale = 'pt'">PT</button>
          </div>
          <h3 t="shell.demo.welcome" style="margin-bottom: 8px;"></h3>
          <p t="shell.demo.greeting" t-name="'World'" style="color: var(--text-muted);"></p>
          <p style="margin-top: 8px; font-size: 0.8rem; color: var(--text-dim);"><span t="docs.i18n.liveDemo.localeLabel"></span> <span bind="NoJS.locale"></span></p>
        </div>
      </div>
    </div>
  </div>

</div>