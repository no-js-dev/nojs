<!-- Configuration — from configuration.md -->

<div class="doc-content">

  <!-- Global Settings -->
  <div class="doc-section">
    <h2 class="doc-title" id="config-global-settings" t="docs.configuration.globalSettings.title"></h2>
    <div class="code-block"><pre><span class="hl-tag">&lt;script&gt;</span>
  <span class="hl-fn">NoJS</span>.<span class="hl-fn">config</span>({
    <span class="hl-cmt">// API</span>
    <span class="hl-attr">baseApiUrl</span>: <span class="hl-str">'https://api.myapp.com/v1'</span>,
    <span class="hl-attr">headers</span>: { <span class="hl-str">'Authorization'</span>: <span class="hl-str">'Bearer xxx'</span> },
    <span class="hl-attr">timeout</span>: <span class="hl-num">10000</span>,
    <span class="hl-attr">retries</span>: <span class="hl-num">2</span>,
    <span class="hl-attr">retryDelay</span>: <span class="hl-num">1000</span>,
    <span class="hl-attr">credentials</span>: <span class="hl-str">'include'</span>,    <span class="hl-cmt">// fetch credentials mode</span>

    <span class="hl-cmt">// CSRF</span>
    <span class="hl-attr">csrf</span>: {
      <span class="hl-attr">header</span>: <span class="hl-str">'X-CSRF-Token'</span>,
      <span class="hl-attr">token</span>: <span class="hl-str">'...'</span>
    },

    <span class="hl-cmt">// Caching</span>
    <span class="hl-attr">cache</span>: {
      <span class="hl-attr">strategy</span>: <span class="hl-str">'memory'</span>,     <span class="hl-cmt">// 'none' | 'memory' | 'session' | 'local'</span>
      <span class="hl-attr">ttl</span>: <span class="hl-num">300000</span>              <span class="hl-cmt">// 5 minutes</span>
    },

    <span class="hl-cmt">// Templates</span>
    <span class="hl-attr">templates</span>: {
      <span class="hl-attr">cache</span>: <span class="hl-kw">true</span>               <span class="hl-cmt">// Cache fetched .tpl HTML in memory (default: true)</span>
    },

    <span class="hl-cmt">// Router</span>
    <span class="hl-attr">router</span>: {
      <span class="hl-attr">useHash</span>: <span class="hl-kw">false</span>,          <span class="hl-cmt">// true = hash mode, false = history mode (default)</span>
      <span class="hl-attr">base</span>: <span class="hl-str">'/'</span>,
      <span class="hl-attr">scrollBehavior</span>: <span class="hl-str">'top'</span>,  <span class="hl-cmt">// 'top' | 'preserve' | 'smooth'</span>
      <span class="hl-attr">templates</span>: <span class="hl-str">'pages'</span>,      <span class="hl-cmt">// Default base path for file-based routing</span>
      <span class="hl-attr">ext</span>: <span class="hl-str">'.tpl'</span>,              <span class="hl-cmt">// Default file extension (fallback: '.html')</span>
      <span class="hl-attr">suppressHashWarning</span>: <span class="hl-kw">false</span>, <span class="hl-cmt">// Suppress hash-in-history-mode warning</span>
      <span class="hl-attr">focusBehavior</span>: <span class="hl-str">'none'</span>,   <span class="hl-cmt">// Focus management after navigation</span>
      <span class="hl-attr">viewTransition</span>: <span class="hl-kw">true</span>    <span class="hl-cmt">// Enable View Transition API (default: true)</span>
    },
    <span class="hl-cmt">// Anchor links (href="#id") are automatically</span>
    <span class="hl-cmt">// intercepted in both modes — they scroll to the</span>
    <span class="hl-cmt">// target element without triggering route navigation.</span>

    <span class="hl-cmt">// i18n</span>
    <span class="hl-attr">i18n</span>: {
      <span class="hl-attr">defaultLocale</span>: <span class="hl-str">'en'</span>,
      <span class="hl-attr">fallbackLocale</span>: <span class="hl-str">'en'</span>,
      <span class="hl-attr">detectBrowser</span>: <span class="hl-kw">true</span>,
      <span class="hl-attr">loadPath</span>: <span class="hl-str">'/locales/{locale}.json'</span>,  <span class="hl-cmt">// Load from external JSON (default: null)</span>
      <span class="hl-attr">ns</span>: [<span class="hl-str">'common'</span>],           <span class="hl-cmt">// Namespaces to preload (default: [])</span>
      <span class="hl-attr">cache</span>: <span class="hl-kw">true</span>,              <span class="hl-cmt">// Cache fetched locale files (default: true)</span>
      <span class="hl-attr">persist</span>: <span class="hl-kw">false</span>            <span class="hl-cmt">// Persist selected locale to localStorage (default: false)</span>
    },

    <span class="hl-cmt">// Debugging</span>
    <span class="hl-attr">debug</span>: <span class="hl-kw">true</span>,               <span class="hl-cmt">// Logs directive processing</span>
    <span class="hl-attr">devtools</span>: <span class="hl-kw">true</span>,            <span class="hl-cmt">// Enables browser devtools panel</span>

    <span class="hl-cmt">// Security</span>
    <span class="hl-attr">sanitize</span>: <span class="hl-kw">true</span>,            <span class="hl-cmt">// Sanitize bind-html (default: true)</span>
    <span class="hl-attr">sanitizeHtml</span>: <span class="hl-kw">null</span>,        <span class="hl-cmt">// Custom sanitizer function (default: null)</span>
    <span class="hl-attr">dangerouslyDisableSanitize</span>: <span class="hl-kw">false</span>, <span class="hl-cmt">// Bypass ALL sanitization (default: false)</span>

    <span class="hl-cmt">// Performance</span>
    <span class="hl-attr">exprCacheSize</span>: <span class="hl-num">500</span>,        <span class="hl-cmt">// Max entries in expression LRU caches</span>
    <span class="hl-attr">maxEventListeners</span>: <span class="hl-num">100</span>,    <span class="hl-cmt">// Max listeners per event on the event bus</span>

    <span class="hl-cmt">// App identity</span>
    <span class="hl-attr">appId</span>: <span class="hl-str">''</span>,                 <span class="hl-cmt">// Application identifier (exposed via devtools)</span>
  });
<span class="hl-tag">&lt;/script&gt;</span></pre></div>
  </div>

  <!-- Pre-initializing Stores -->
  <div class="doc-section">
    <h2 class="doc-title" id="config-stores" t="docs.configuration.configStores.title"></h2>
    <p class="doc-text" t="docs.configuration.configStores.text"></p>
    <div class="code-block"><pre><span class="hl-fn">NoJS</span>.<span class="hl-fn">config</span>({
  <span class="hl-attr">stores</span>: {
    <span class="hl-attr">auth</span>: { <span class="hl-attr">user</span>: <span class="hl-kw">null</span>, <span class="hl-attr">token</span>: <span class="hl-str">''</span> },
    <span class="hl-attr">ui</span>:   { <span class="hl-attr">theme</span>: <span class="hl-str">'dark'</span>, <span class="hl-attr">sidebar</span>: <span class="hl-kw">true</span> },
    <span class="hl-attr">cart</span>: { <span class="hl-attr">items</span>: [], <span class="hl-attr">total</span>: <span class="hl-num">0</span> }
  }
});</pre></div>
    <div class="callout"><p t="docs.configuration.configStores.callout"></p></div>
  </div>

  <!-- Config Option Details -->
  <div class="doc-section">
    <h2 class="doc-title" id="config-options" t="docs.configuration.configOptions.title"></h2>

    <h3 class="doc-title" id="config-sanitize" t="docs.configuration.configOptions.sanitizeTitle"></h3>
    <p class="doc-text" t="docs.configuration.configOptions.sanitizeType"></p>
    <p class="doc-text" t="docs.configuration.configOptions.sanitizeText"></p>
    <div class="code-block"><pre><span class="hl-fn">NoJS</span>.<span class="hl-fn">config</span>({ <span class="hl-attr">sanitize</span>: <span class="hl-kw">false</span> }); <span class="hl-cmt">// ⚠ Disable at your own risk — allows raw HTML</span></pre></div>

    <h3 class="doc-title" id="config-devtools" t="docs.configuration.configOptions.devtoolsTitle"></h3>
    <p class="doc-text" t="docs.configuration.configOptions.devtoolsType"></p>
    <p class="doc-text" t="docs.configuration.configOptions.devtoolsText"></p>
    <div class="code-block"><pre><span class="hl-fn">NoJS</span>.<span class="hl-fn">config</span>({ <span class="hl-attr">devtools</span>: <span class="hl-kw">true</span> });
<span class="hl-cmt">// Then inspect in console:</span>
<span class="hl-cmt">// window.__NOJS_DEVTOOLS__.state</span>
<span class="hl-cmt">// window.__NOJS_DEVTOOLS__.routes</span></pre></div>

    <h3 class="doc-title" id="config-templates-cache" t="docs.configuration.configOptions.templatesCacheTitle"></h3>
    <p class="doc-text" t="docs.configuration.configOptions.templatesCacheType"></p>
    <p class="doc-text" t="docs.configuration.configOptions.templatesCacheText1"></p>
    <div class="code-block"><pre><span class="hl-cmt">// Disable template caching (always re-fetch .tpl files)</span>
<span class="hl-fn">NoJS</span>.<span class="hl-fn">config</span>({ <span class="hl-attr">templates</span>: { <span class="hl-attr">cache</span>: <span class="hl-kw">false</span> } });

<span class="hl-cmt">// Default — caching is on, no configuration needed</span>
<span class="hl-fn">NoJS</span>.<span class="hl-fn">config</span>({ <span class="hl-attr">templates</span>: { <span class="hl-attr">cache</span>: <span class="hl-kw">true</span> } });</pre></div>
    <p class="doc-text" t="docs.configuration.configOptions.templatesCacheText2"></p>

    <h3 class="doc-title" id="config-load-path" t="docs.configuration.configOptions.loadPathTitle"></h3>
    <p class="doc-text" t="docs.configuration.configOptions.loadPathType"></p>
    <p class="doc-text" t="docs.configuration.configOptions.loadPathText"></p>
    <div class="code-block"><pre><span class="hl-fn">NoJS</span>.<span class="hl-fn">i18n</span>({
  <span class="hl-attr">loadPath</span>: <span class="hl-str">'/locales/{locale}.json'</span>          <span class="hl-cmt">// Flat mode</span>
  <span class="hl-attr">loadPath</span>: <span class="hl-str">'/locales/{locale}/{ns}.json'</span>   <span class="hl-cmt">// Namespace mode</span>
});</pre></div>

    <h3 class="doc-title" id="config-ns" t="docs.configuration.configOptions.nsTitle"></h3>
    <p class="doc-text" t="docs.configuration.configOptions.nsType"></p>
    <p class="doc-text" t="docs.configuration.configOptions.nsText"></p>
    <div class="code-block"><pre><span class="hl-fn">NoJS</span>.<span class="hl-fn">i18n</span>({
  <span class="hl-attr">loadPath</span>: <span class="hl-str">'/locales/{locale}/{ns}.json'</span>,
  <span class="hl-attr">ns</span>: [<span class="hl-str">'common'</span>, <span class="hl-str">'auth'</span>]
});</pre></div>

    <h3 class="doc-title" id="config-cache" t="docs.configuration.configOptions.cacheTitle"></h3>
    <p class="doc-text" t="docs.configuration.configOptions.cacheType"></p>
    <p class="doc-text" t="docs.configuration.configOptions.cacheText"></p>
    <div class="code-block"><pre><span class="hl-fn">NoJS</span>.<span class="hl-fn">i18n</span>({ <span class="hl-attr">cache</span>: <span class="hl-kw">false</span> }); <span class="hl-cmt">// Always re-fetch locale files</span></pre></div>

    <h3 class="doc-title" id="config-i18n-persist" t="docs.configuration.configOptions.i18nPersistTitle"></h3>
    <p class="doc-text" t="docs.configuration.configOptions.i18nPersistType"></p>
    <p class="doc-text" t="docs.configuration.configOptions.i18nPersistText"></p>
    <div class="code-block"><pre><span class="hl-fn">NoJS</span>.<span class="hl-fn">i18n</span>({ <span class="hl-attr">persist</span>: <span class="hl-kw">true</span> }); <span class="hl-cmt">// Remember locale across sessions</span></pre></div>

    <h3 class="doc-title" id="config-expr-cache-size" t="docs.configuration.configOptions.exprCacheSizeTitle"></h3>
    <p class="doc-text" t="docs.configuration.configOptions.exprCacheSizeType"></p>
    <p class="doc-text" t="docs.configuration.configOptions.exprCacheSizeText"></p>
    <div class="code-block"><pre><span class="hl-cmt">// Larger cache for apps with many distinct expressions</span>
<span class="hl-fn">NoJS</span>.<span class="hl-fn">config</span>({ <span class="hl-attr">exprCacheSize</span>: <span class="hl-num">1000</span> });

<span class="hl-cmt">// Smaller cache for memory-constrained environments</span>
<span class="hl-fn">NoJS</span>.<span class="hl-fn">config</span>({ <span class="hl-attr">exprCacheSize</span>: <span class="hl-num">100</span> });</pre></div>

    <h3 class="doc-title" id="config-max-event-listeners" t="docs.configuration.configOptions.maxEventListenersTitle"></h3>
    <p class="doc-text" t="docs.configuration.configOptions.maxEventListenersType"></p>
    <p class="doc-text" t="docs.configuration.configOptions.maxEventListenersText"></p>

    <h3 class="doc-title" id="config-app-id" t="docs.configuration.configOptions.appIdTitle"></h3>
    <p class="doc-text" t="docs.configuration.configOptions.appIdType"></p>
    <p class="doc-text" t="docs.configuration.configOptions.appIdText"></p>

    <h3 class="doc-title" id="config-sanitize-html" t="docs.configuration.configOptions.sanitizeHtmlTitle"></h3>
    <p class="doc-text" t="docs.configuration.configOptions.sanitizeHtmlType"></p>
    <p class="doc-text" t="docs.configuration.configOptions.sanitizeHtmlText"></p>
    <div class="code-block"><pre><span class="hl-fn">NoJS</span>.<span class="hl-fn">config</span>({
  <span class="hl-attr">sanitizeHtml</span>: (<span class="hl-attr">html</span>) <span class="hl-op">=&gt;</span> DOMPurify.<span class="hl-fn">sanitize</span>(html)
});</pre></div>

    <h3 class="doc-title" id="config-dangerously-disable-sanitize" t="docs.configuration.configOptions.dangerouslyDisableSanitizeTitle"></h3>
    <p class="doc-text" t="docs.configuration.configOptions.dangerouslyDisableSanitizeType"></p>
    <p class="doc-text" t="docs.configuration.configOptions.dangerouslyDisableSanitizeText"></p>
    <div class="code-block"><pre><span class="hl-fn">NoJS</span>.<span class="hl-fn">config</span>({ <span class="hl-attr">dangerouslyDisableSanitize</span>: <span class="hl-kw">true</span> }); <span class="hl-cmt">// ⚠ Not recommended</span></pre></div>
    <div class="callout"><p t="docs.configuration.configOptions.sanitizeLockCallout"></p></div>

    <h3 class="doc-title" id="config-router-suppress-hash-warning" t="docs.configuration.configOptions.suppressHashWarningTitle"></h3>
    <p class="doc-text" t="docs.configuration.configOptions.suppressHashWarningType"></p>
    <p class="doc-text" t="docs.configuration.configOptions.suppressHashWarningText"></p>
    <div class="code-block"><pre><span class="hl-fn">NoJS</span>.<span class="hl-fn">config</span>({ <span class="hl-attr">router</span>: { <span class="hl-attr">suppressHashWarning</span>: <span class="hl-kw">true</span> } });</pre></div>

    <h3 class="doc-title" id="config-router-focus-behavior" t="docs.configuration.configOptions.focusBehaviorTitle"></h3>
    <p class="doc-text" t="docs.configuration.configOptions.focusBehaviorType"></p>
    <p class="doc-text" t="docs.configuration.configOptions.focusBehaviorText"></p>

    <h3 class="doc-title" id="config-router-view-transition" t="docs.configuration.configOptions.viewTransitionTitle"></h3>
    <p class="doc-text" t="docs.configuration.configOptions.viewTransitionType"></p>
    <p class="doc-text" t="docs.configuration.configOptions.viewTransitionText"></p>
    <div class="code-block"><pre><span class="hl-fn">NoJS</span>.<span class="hl-fn">config</span>({ <span class="hl-attr">router</span>: { <span class="hl-attr">viewTransition</span>: <span class="hl-kw">false</span> } }); <span class="hl-cmt">// Fall back to class-based transitions</span></pre></div>
  </div>

  <!-- API Properties -->
  <div class="doc-section">
    <h2 class="doc-title" id="config-api-properties" t="docs.configuration.apiProperties.title"></h2>

    <h3 class="doc-title" id="config-base-api-url" t="docs.configuration.apiProperties.baseApiUrlTitle"></h3>
    <p class="doc-text" t="docs.configuration.apiProperties.baseApiUrlText"></p>
    <div class="code-block"><pre><span class="hl-cmt">// Set at init</span>
<span class="hl-fn">NoJS</span>.<span class="hl-fn">config</span>({ <span class="hl-attr">baseApiUrl</span>: <span class="hl-str">'https://api.myapp.com/v1'</span> });

<span class="hl-cmt">// Read at runtime</span>
console.<span class="hl-fn">log</span>(<span class="hl-fn">NoJS</span>.baseApiUrl); <span class="hl-cmt">// 'https://api.myapp.com/v1'</span>

<span class="hl-cmt">// Update at runtime</span>
<span class="hl-fn">NoJS</span>.baseApiUrl <span class="hl-op">=</span> <span class="hl-str">'https://staging-api.myapp.com/v1'</span>;</pre></div>

    <h3 class="doc-title" id="config-version" t="docs.configuration.apiProperties.versionTitle"></h3>
    <p class="doc-text" t="docs.configuration.apiProperties.versionText"></p>
    <div class="code-block"><pre>console.<span class="hl-fn">log</span>(<span class="hl-fn">NoJS</span>.version); <span class="hl-cmt">// e.g. '1.4.0'</span></pre></div>
  </div>

  <!-- Request Interceptors -->
  <div class="doc-section">
    <h2 class="doc-title" id="config-interceptors" t="docs.configuration.interceptors.title"></h2>
    <div class="code-block"><pre><span class="hl-tag">&lt;script&gt;</span>
  <span class="hl-cmt">// Before every request</span>
  <span class="hl-fn">NoJS</span>.<span class="hl-fn">interceptor</span>(<span class="hl-str">'request'</span>, (<span class="hl-attr">url</span>, <span class="hl-attr">options</span>) <span class="hl-op">=&gt;</span> {
    options.headers[<span class="hl-str">'X-Request-ID'</span>] <span class="hl-op">=</span> crypto.<span class="hl-fn">randomUUID</span>();
    <span class="hl-kw">return</span> options;
  });

  <span class="hl-cmt">// After every response</span>
  <span class="hl-fn">NoJS</span>.<span class="hl-fn">interceptor</span>(<span class="hl-str">'response'</span>, (<span class="hl-attr">response</span>, <span class="hl-attr">url</span>) <span class="hl-op">=&gt;</span> {
    <span class="hl-kw">if</span> (response.status <span class="hl-op">===</span> <span class="hl-num">401</span>) {
      <span class="hl-fn">NoJS</span>.store.auth.user <span class="hl-op">=</span> <span class="hl-kw">null</span>;
      <span class="hl-kw">await</span> <span class="hl-fn">NoJS</span>.router.<span class="hl-fn">push</span>(<span class="hl-str">'/login'</span>);
      <span class="hl-kw">throw new</span> <span class="hl-fn">Error</span>(<span class="hl-str">'Unauthorized'</span>);
    }
    <span class="hl-kw">return</span> response;
  });
<span class="hl-tag">&lt;/script&gt;</span></pre></div>
  </div>

  <!-- XSS Protection -->
  <div class="doc-section">
    <h2 class="doc-title" id="config-security" t="docs.configuration.security.title"></h2>

    <h3 class="doc-title" id="config-xss" t="docs.configuration.security.xssTitle"></h3>
    <ul class="doc-text">
      <li t="docs.configuration.security.xssList1"></li>
      <li t="docs.configuration.security.xssList2"></li>
      <li t="docs.configuration.security.xssList3"></li>
    </ul>

    <h3 class="doc-title" id="config-csrf" t="docs.configuration.security.csrfTitle"></h3>
    <div class="code-block"><pre><span class="hl-tag">&lt;script&gt;</span>
  <span class="hl-fn">NoJS</span>.<span class="hl-fn">config</span>({
    <span class="hl-attr">csrf</span>: {
      <span class="hl-attr">header</span>: <span class="hl-str">'X-CSRF-Token'</span>,
      <span class="hl-attr">token</span>: document.<span class="hl-fn">querySelector</span>(<span class="hl-str">'meta[name="csrf-token"]'</span>).content
    }
  });
<span class="hl-tag">&lt;/script&gt;</span></pre></div>

    <h3 class="doc-title" id="config-csp" t="docs.configuration.security.cspSecTitle"></h3>
    <p class="doc-text" t="docs.configuration.security.cspSecText1"></p>
  </div>

</div>

