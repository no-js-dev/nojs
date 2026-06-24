<!-- Configuration — from configuration.md -->

<div class="doc-content">

  <!-- Global Settings -->
  <div class="doc-section">
    <h2 class="doc-title" id="config-global-settings" t="docs.configuration.globalSettings.title"></h2>
    <div class="code-block"><pre highlight>&lt;script&gt;
  NoJS.config({
    // API
    baseApiUrl: 'https://api.myapp.com/v1',
    headers: { 'Authorization': 'Bearer xxx' },
    timeout: 10000,
    retries: 2,
    retryDelay: 1000,
    credentials: 'include',    // fetch credentials mode

    // CSRF
    csrf: {
      header: 'X-CSRF-Token',
      token: '...'
    },

    // Caching
    cache: {
      strategy: 'memory',     // 'none' | 'memory' | 'session' | 'local'
      ttl: 300000              // 5 minutes
    },

    // Templates
    templates: {
      cache: true               // Cache fetched .tpl HTML in memory (default: true)
    },

    // Router
    router: {
      useHash: false,          // true = hash mode, false = history mode (default)
      base: '/',
      scrollBehavior: 'top',  // 'top' | 'preserve' | 'smooth'
      templates: 'pages',      // Default base path for file-based routing
      ext: '.tpl',              // Default file extension (fallback: '.html')
      suppressHashWarning: false, // Suppress hash-in-history-mode warning
      focusBehavior: 'none',   // Focus management after navigation
      viewTransition: true    // Enable View Transition API (default: true)
    },
    // Anchor links (href="#id") are automatically
    // intercepted in both modes — they scroll to the
    // target element without triggering route navigation.

    // i18n
    i18n: {
      defaultLocale: 'en',
      fallbackLocale: 'en',
      detectBrowser: true,
      loadPath: '/locales/{locale}.json',  // Load from external JSON (default: null)
      ns: ['common'],           // Namespaces to preload (default: [])
      cache: true,              // Cache fetched locale files (default: true)
      persist: false            // Persist selected locale to localStorage (default: false)
    },

    // Debugging
    debug: true,               // Logs directive processing
    devtools: true,            // Enables browser devtools panel

    // Security
    sanitize: true,            // Sanitize bind-html (default: true)
    sanitizeHtml: null,        // Custom sanitizer function (default: null)
    dangerouslyDisableSanitize: false, // Bypass ALL sanitization (default: false)

    // Performance
    exprCacheSize: 500,        // Max entries in expression LRU caches
    maxEventListeners: 100,    // Max listeners per event on the event bus

    // App identity
    appId: '',                 // Application identifier (exposed via devtools)
  });
&lt;/script&gt;</pre></div>
  </div>

  <!-- Pre-initializing Stores -->
  <div class="doc-section">
    <h2 class="doc-title" id="config-stores" t="docs.configuration.configStores.title"></h2>
    <p class="doc-text" t="docs.configuration.configStores.text"></p>
    <div class="code-block"><pre highlight>NoJS.config({
  stores: {
    auth: { user: null, token: '' },
    ui:   { theme: 'dark', sidebar: true },
    cart: { items: [], total: 0 }
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
    <div class="code-block"><pre highlight>NoJS.config({ sanitize: false }); // ⚠ Disable at your own risk — allows raw HTML</pre></div>

    <h3 class="doc-title" id="config-devtools" t="docs.configuration.configOptions.devtoolsTitle"></h3>
    <p class="doc-text" t="docs.configuration.configOptions.devtoolsType"></p>
    <p class="doc-text" t="docs.configuration.configOptions.devtoolsText"></p>
    <div class="code-block"><pre highlight>NoJS.config({ devtools: true });
// Then inspect in console:
// window.__NOJS_DEVTOOLS__.state
// window.__NOJS_DEVTOOLS__.routes</pre></div>

    <h3 class="doc-title" id="config-templates-cache" t="docs.configuration.configOptions.templatesCacheTitle"></h3>
    <p class="doc-text" t="docs.configuration.configOptions.templatesCacheType"></p>
    <p class="doc-text" t="docs.configuration.configOptions.templatesCacheText1"></p>
    <div class="code-block"><pre highlight>// Disable template caching (always re-fetch .tpl files)
NoJS.config({ templates: { cache: false } });

// Default — caching is on, no configuration needed
NoJS.config({ templates: { cache: true } });</pre></div>
    <p class="doc-text" t="docs.configuration.configOptions.templatesCacheText2"></p>

    <h3 class="doc-title" id="config-load-path" t="docs.configuration.configOptions.loadPathTitle"></h3>
    <p class="doc-text" t="docs.configuration.configOptions.loadPathType"></p>
    <p class="doc-text" t="docs.configuration.configOptions.loadPathText"></p>
    <div class="code-block"><pre highlight>NoJS.i18n({
  loadPath: '/locales/{locale}.json'          // Flat mode
  loadPath: '/locales/{locale}/{ns}.json'   // Namespace mode
});</pre></div>

    <h3 class="doc-title" id="config-ns" t="docs.configuration.configOptions.nsTitle"></h3>
    <p class="doc-text" t="docs.configuration.configOptions.nsType"></p>
    <p class="doc-text" t="docs.configuration.configOptions.nsText"></p>
    <div class="code-block"><pre highlight>NoJS.i18n({
  loadPath: '/locales/{locale}/{ns}.json',
  ns: ['common', 'auth']
});</pre></div>

    <h3 class="doc-title" id="config-cache" t="docs.configuration.configOptions.cacheTitle"></h3>
    <p class="doc-text" t="docs.configuration.configOptions.cacheType"></p>
    <p class="doc-text" t="docs.configuration.configOptions.cacheText"></p>
    <div class="code-block"><pre highlight>NoJS.i18n({ cache: false }); // Always re-fetch locale files</pre></div>

    <h3 class="doc-title" id="config-i18n-persist" t="docs.configuration.configOptions.i18nPersistTitle"></h3>
    <p class="doc-text" t="docs.configuration.configOptions.i18nPersistType"></p>
    <p class="doc-text" t="docs.configuration.configOptions.i18nPersistText"></p>
    <div class="code-block"><pre highlight>NoJS.i18n({ persist: true }); // Remember locale across sessions</pre></div>

    <h3 class="doc-title" id="config-expr-cache-size" t="docs.configuration.configOptions.exprCacheSizeTitle"></h3>
    <p class="doc-text" t="docs.configuration.configOptions.exprCacheSizeType"></p>
    <p class="doc-text" t="docs.configuration.configOptions.exprCacheSizeText"></p>
    <div class="code-block"><pre highlight>// Larger cache for apps with many distinct expressions
NoJS.config({ exprCacheSize: 1000 });

// Smaller cache for memory-constrained environments
NoJS.config({ exprCacheSize: 100 });</pre></div>

    <h3 class="doc-title" id="config-max-event-listeners" t="docs.configuration.configOptions.maxEventListenersTitle"></h3>
    <p class="doc-text" t="docs.configuration.configOptions.maxEventListenersType"></p>
    <p class="doc-text" t="docs.configuration.configOptions.maxEventListenersText"></p>

    <h3 class="doc-title" id="config-app-id" t="docs.configuration.configOptions.appIdTitle"></h3>
    <p class="doc-text" t="docs.configuration.configOptions.appIdType"></p>
    <p class="doc-text" t="docs.configuration.configOptions.appIdText"></p>

    <h3 class="doc-title" id="config-sanitize-html" t="docs.configuration.configOptions.sanitizeHtmlTitle"></h3>
    <p class="doc-text" t="docs.configuration.configOptions.sanitizeHtmlType"></p>
    <p class="doc-text" t="docs.configuration.configOptions.sanitizeHtmlText"></p>
    <div class="code-block"><pre highlight>NoJS.config({
  sanitizeHtml: (html) => DOMPurify.sanitize(html)
});</pre></div>

    <h3 class="doc-title" id="config-dangerously-disable-sanitize" t="docs.configuration.configOptions.dangerouslyDisableSanitizeTitle"></h3>
    <p class="doc-text" t="docs.configuration.configOptions.dangerouslyDisableSanitizeType"></p>
    <p class="doc-text" t="docs.configuration.configOptions.dangerouslyDisableSanitizeText"></p>
    <div class="code-block"><pre highlight>NoJS.config({ dangerouslyDisableSanitize: true }); // ⚠ Not recommended</pre></div>
    <div class="callout"><p t="docs.configuration.configOptions.sanitizeLockCallout"></p></div>

    <h3 class="doc-title" id="config-router-suppress-hash-warning" t="docs.configuration.configOptions.suppressHashWarningTitle"></h3>
    <p class="doc-text" t="docs.configuration.configOptions.suppressHashWarningType"></p>
    <p class="doc-text" t="docs.configuration.configOptions.suppressHashWarningText"></p>
    <div class="code-block"><pre highlight>NoJS.config({ router: { suppressHashWarning: true } });</pre></div>

    <h3 class="doc-title" id="config-router-focus-behavior" t="docs.configuration.configOptions.focusBehaviorTitle"></h3>
    <p class="doc-text" t="docs.configuration.configOptions.focusBehaviorType"></p>
    <p class="doc-text" t="docs.configuration.configOptions.focusBehaviorText"></p>

    <h3 class="doc-title" id="config-router-view-transition" t="docs.configuration.configOptions.viewTransitionTitle"></h3>
    <p class="doc-text" t="docs.configuration.configOptions.viewTransitionType"></p>
    <p class="doc-text" t="docs.configuration.configOptions.viewTransitionText"></p>
    <div class="code-block"><pre highlight>NoJS.config({ router: { viewTransition: false } }); // Fall back to class-based transitions</pre></div>
  </div>

  <!-- API Properties -->
  <div class="doc-section">
    <h2 class="doc-title" id="config-api-properties" t="docs.configuration.apiProperties.title"></h2>

    <h3 class="doc-title" id="config-base-api-url" t="docs.configuration.apiProperties.baseApiUrlTitle"></h3>
    <p class="doc-text" t="docs.configuration.apiProperties.baseApiUrlText"></p>
    <div class="code-block"><pre highlight>// Set at init
NoJS.config({ baseApiUrl: 'https://api.myapp.com/v1' });

// Read at runtime
console.log(NoJS.baseApiUrl); // 'https://api.myapp.com/v1'

// Update at runtime
NoJS.baseApiUrl = 'https://staging-api.myapp.com/v1';</pre></div>

    <h3 class="doc-title" id="config-version" t="docs.configuration.apiProperties.versionTitle"></h3>
    <p class="doc-text" t="docs.configuration.apiProperties.versionText"></p>
    <div class="code-block"><pre highlight>console.log(NoJS.version); // e.g. '1.4.0'</pre></div>
  </div>

  <!-- Request Interceptors -->
  <div class="doc-section">
    <h2 class="doc-title" id="config-interceptors" t="docs.configuration.interceptors.title"></h2>
    <div class="code-block"><pre highlight>&lt;script&gt;
  // Before every request
  NoJS.interceptor('request', (url, options) => {
    options.headers['X-Request-ID'] = crypto.randomUUID();
    return options;
  });

  // After every response
  NoJS.interceptor('response', (response, url) => {
    if (response.status === 401) {
      NoJS.store.auth.user = null;
      await NoJS.router.push('/login');
      throw new Error('Unauthorized');
    }
    return response;
  });
&lt;/script&gt;</pre></div>
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
    <div class="code-block"><pre highlight>&lt;script&gt;
  NoJS.config({
    csrf: {
      header: 'X-CSRF-Token',
      token: document.querySelector('meta[name="csrf-token"]').content
    }
  });
&lt;/script&gt;</pre></div>

    <h3 class="doc-title" id="config-csp" t="docs.configuration.security.cspSecTitle"></h3>
    <p class="doc-text" t="docs.configuration.security.cspSecText1"></p>
  </div>

</div>

