<!-- Plugins — from plugins.md -->

<section class="hero-section">
  <span class="badge" t="docs.plugins.hero.badge"></span>
  <h1 class="hero-title" t="docs.plugins.hero.title"></h1>
  <p class="hero-subtitle" t="docs.plugins.hero.subtitle"></p>
</section>

<div class="doc-content">

  <!-- NoJS.use() -->
  <div class="doc-section">
    <h2 class="doc-title" id="plugins-use" t="docs.plugins.use.title"></h2>
    <p class="doc-text" t="docs.plugins.use.text"></p>
    <div class="code-block"><pre><span class="hl-tag">&lt;script&gt;</span>
  <span class="hl-fn">NoJS</span>.<span class="hl-fn">use</span>(analyticsPlugin);
  <span class="hl-fn">NoJS</span>.<span class="hl-fn">use</span>(authPlugin, { <span class="hl-attr">trusted</span>: <span class="hl-kw">true</span> });
<span class="hl-tag">&lt;/script&gt;</span></pre></div>

    <h3 class="doc-title" id="plugins-object-form" t="docs.plugins.use.objectFormTitle"></h3>
    <p class="doc-text" t="docs.plugins.use.objectFormText"></p>
    <div class="code-block"><pre><span class="hl-tag">&lt;script&gt;</span>
  <span class="hl-kw">const</span> analyticsPlugin <span class="hl-op">=</span> {
    <span class="hl-attr">name</span>: <span class="hl-str">'analytics'</span>,
    <span class="hl-attr">version</span>: <span class="hl-str">'1.0.0'</span>,
    <span class="hl-attr">capabilities</span>: [<span class="hl-str">'interceptor'</span>, <span class="hl-str">'global'</span>],

    <span class="hl-fn">install</span>(<span class="hl-attr">app</span>, <span class="hl-attr">options</span>) {
      <span class="hl-cmt">// Called immediately by NoJS.use()</span>
      <span class="hl-cmt">// Register interceptors, globals, directives, etc.</span>
      app.<span class="hl-fn">global</span>(<span class="hl-str">'analytics'</span>, { <span class="hl-attr">pageViews</span>: <span class="hl-num">0</span> });

      app.<span class="hl-fn">interceptor</span>(<span class="hl-str">'response'</span>, (<span class="hl-attr">response</span>, <span class="hl-attr">url</span>) <span class="hl-op">=&gt;</span> {
        app.store.analytics?.<span class="hl-fn">track</span>(<span class="hl-str">'api_call'</span>, { url });
        <span class="hl-kw">return</span> response;
      });
    },

    <span class="hl-fn">init</span>(<span class="hl-attr">app</span>) {
      <span class="hl-cmt">// Called after NoJS.init() completes</span>
      <span class="hl-cmt">// Safe to access the DOM, router, stores</span>
      console.<span class="hl-fn">log</span>(<span class="hl-str">'Analytics ready'</span>);
    },

    <span class="hl-fn">dispose</span>(<span class="hl-attr">app</span>) {
      <span class="hl-cmt">// Called during NoJS.dispose()</span>
      <span class="hl-cmt">// Clean up timers, listeners, connections</span>
      console.<span class="hl-fn">log</span>(<span class="hl-str">'Analytics disposed'</span>);
    }
  };

  <span class="hl-fn">NoJS</span>.<span class="hl-fn">use</span>(analyticsPlugin);
<span class="hl-tag">&lt;/script&gt;</span></pre></div>

    <h3 class="doc-title" id="plugins-function-form" t="docs.plugins.use.functionTitle"></h3>
    <p class="doc-text" t="docs.plugins.use.functionText"></p>
    <div class="code-block"><pre><span class="hl-tag">&lt;script&gt;</span>
  <span class="hl-kw">function</span> <span class="hl-fn">myLogger</span>(<span class="hl-attr">app</span>, <span class="hl-attr">options</span>) {
    app.<span class="hl-fn">interceptor</span>(<span class="hl-str">'request'</span>, (<span class="hl-attr">url</span>, <span class="hl-attr">opts</span>) <span class="hl-op">=&gt;</span> {
      console.<span class="hl-fn">log</span>(<span class="hl-str">`[${options.prefix || 'LOG'}]`</span>, url);
      <span class="hl-kw">return</span> opts;
    });
  }

  <span class="hl-fn">NoJS</span>.<span class="hl-fn">use</span>(myLogger, { <span class="hl-attr">prefix</span>: <span class="hl-str">'API'</span> });
<span class="hl-tag">&lt;/script&gt;</span></pre></div>
    <div class="callout"><p t="docs.plugins.use.functionCallout"></p></div>

    <h3 class="doc-title" id="plugins-options" t="docs.plugins.use.optionsTitle"></h3>
    <p class="doc-text" t="docs.plugins.use.optionsText"></p>
    <div class="code-block"><pre><span class="hl-tag">&lt;script&gt;</span>
  <span class="hl-fn">NoJS</span>.<span class="hl-fn">use</span>(analyticsPlugin, {
    <span class="hl-attr">trackingId</span>: <span class="hl-str">'UA-123456'</span>,
    <span class="hl-attr">debug</span>: <span class="hl-kw">true</span>
  });
<span class="hl-tag">&lt;/script&gt;</span></pre></div>
    <p class="doc-text" t="docs.plugins.use.optionsTrustedNote"></p>
  </div>

  <!-- Plugin Interface -->
  <div class="doc-section">
    <h2 class="doc-title" id="plugins-interface" t="docs.plugins.interface.title"></h2>
    <table class="doc-table">
      <thead>
        <tr>
          <th t="docs.plugins.interface.thProperty"></th>
          <th t="docs.plugins.interface.thType"></th>
          <th t="docs.plugins.interface.thRequired"></th>
          <th t="docs.plugins.interface.thDescription"></th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td><code>name</code></td>
          <td><code>string</code></td>
          <td t="docs.plugins.interface.yes"></td>
          <td t="docs.plugins.interface.nameDesc"></td>
        </tr>
        <tr>
          <td><code>version</code></td>
          <td><code>string</code></td>
          <td t="docs.plugins.interface.no"></td>
          <td t="docs.plugins.interface.versionDesc"></td>
        </tr>
        <tr>
          <td><code>capabilities</code></td>
          <td><code>string[]</code></td>
          <td t="docs.plugins.interface.no"></td>
          <td t="docs.plugins.interface.capabilitiesDesc"></td>
        </tr>
        <tr>
          <td><code>install</code></td>
          <td><code>function(app, options)</code></td>
          <td t="docs.plugins.interface.yes"></td>
          <td t="docs.plugins.interface.installDesc"></td>
        </tr>
        <tr>
          <td><code>init</code></td>
          <td><code>function(app)</code></td>
          <td t="docs.plugins.interface.no"></td>
          <td t="docs.plugins.interface.initDesc"></td>
        </tr>
        <tr>
          <td><code>dispose</code></td>
          <td><code>function(app)</code></td>
          <td t="docs.plugins.interface.no"></td>
          <td t="docs.plugins.interface.disposeDesc"></td>
        </tr>
      </tbody>
    </table>

    <h3 class="doc-title" id="plugins-lifecycle" t="docs.plugins.interface.lifecycleTitle"></h3>
    <div class="code-block"><pre><span class="hl-fn">NoJS</span>.<span class="hl-fn">use</span>(plugin)     <span class="hl-op">=&gt;</span>  plugin.<span class="hl-fn">install</span>(app, options)
<span class="hl-fn">NoJS</span>.<span class="hl-fn">init</span>()          <span class="hl-op">=&gt;</span>  ... DOM processed ...  <span class="hl-op">=&gt;</span>  plugin.<span class="hl-fn">init</span>(app)
<span class="hl-fn">NoJS</span>.<span class="hl-fn">dispose</span>()       <span class="hl-op">=&gt;</span>  plugin.<span class="hl-fn">dispose</span>(app)  <span class="hl-op">=&gt;</span>  ... teardown ...</pre></div>
    <ul class="doc-text">
      <li t="docs.plugins.interface.lifecycleInstall"></li>
      <li t="docs.plugins.interface.lifecycleInit"></li>
      <li t="docs.plugins.interface.lifecycleDispose"></li>
    </ul>

    <h3 class="doc-title" id="plugins-duplicate" t="docs.plugins.interface.duplicateTitle"></h3>
    <p class="doc-text" t="docs.plugins.interface.duplicateText"></p>
    <div class="code-block"><pre><span class="hl-tag">&lt;script&gt;</span>
  <span class="hl-fn">NoJS</span>.<span class="hl-fn">use</span>(pluginA);     <span class="hl-cmt">// installed</span>
  <span class="hl-fn">NoJS</span>.<span class="hl-fn">use</span>(pluginA);     <span class="hl-cmt">// silently skipped (same object)</span>
  <span class="hl-fn">NoJS</span>.<span class="hl-fn">use</span>(pluginB);     <span class="hl-cmt">// warning: name collision (different object, same name)</span>
<span class="hl-tag">&lt;/script&gt;</span></pre></div>

    <h3 class="doc-title" id="plugins-freezing" t="docs.plugins.interface.freezingTitle"></h3>
    <p class="doc-text" t="docs.plugins.interface.freezingText"></p>
    <div class="code-block"><pre><span class="hl-tag">&lt;script&gt;</span>
  <span class="hl-kw">const</span> myPlugin <span class="hl-op">=</span> {
    <span class="hl-attr">name</span>: <span class="hl-str">'charts'</span>,
    <span class="hl-fn">install</span>(<span class="hl-attr">app</span>) {
      app.<span class="hl-fn">directive</span>(<span class="hl-str">'chart'</span>, {            <span class="hl-cmt">// new directive — allowed</span>
        <span class="hl-attr">priority</span>: <span class="hl-num">25</span>,
        <span class="hl-fn">init</span>(<span class="hl-attr">el</span>, <span class="hl-attr">name</span>, <span class="hl-attr">value</span>) { <span class="hl-cmt">/* ... */</span> }
      });
      app.<span class="hl-fn">directive</span>(<span class="hl-str">'bind'</span>, { <span class="hl-cmt">/* ... */</span> }); <span class="hl-cmt">// core directive — warning, ignored</span>
    }
  };
<span class="hl-tag">&lt;/script&gt;</span></pre></div>
  </div>

  <!-- NoJS.global() -->
  <div class="doc-section">
    <h2 class="doc-title" id="plugins-globals" t="docs.plugins.globals.title"></h2>
    <p class="doc-text" t="docs.plugins.globals.text"></p>
    <div class="code-block"><pre><span class="hl-tag">&lt;script&gt;</span>
  <span class="hl-fn">NoJS</span>.<span class="hl-fn">global</span>(<span class="hl-str">'theme'</span>, { <span class="hl-attr">mode</span>: <span class="hl-str">'dark'</span>, <span class="hl-attr">accent</span>: <span class="hl-str">'blue'</span> });
<span class="hl-tag">&lt;/script&gt;</span>

<span class="hl-tag">&lt;span</span> <span class="hl-attr">bind</span>=<span class="hl-str">"$theme.mode"</span><span class="hl-tag">&gt;&lt;/span&gt;</span>
<span class="hl-tag">&lt;button</span> <span class="hl-attr">on:click</span>=<span class="hl-str">"$theme.mode = $theme.mode === 'dark' ? 'light' : 'dark'"</span><span class="hl-tag">&gt;</span>
  Toggle
<span class="hl-tag">&lt;/button&gt;</span></pre></div>

    <h3 class="doc-title" id="plugins-naming" t="docs.plugins.globals.namingTitle"></h3>
    <ul class="doc-text">
      <li t="docs.plugins.globals.namingPrefix"></li>
      <li t="docs.plugins.globals.namingNamespace"></li>
    </ul>

    <h3 class="doc-title" id="plugins-reserved" t="docs.plugins.globals.reservedTitle"></h3>
    <p class="doc-text" t="docs.plugins.globals.reservedText"></p>
    <div class="code-block"><pre>store, route, router, i18n, refs, form, parent, watch, set, notify,
raw, isProxy, listeners, app, config, env, debug, version, plugins,
globals, el, event, self, this, super, window, document, toString,
valueOf, hasOwnProperty</pre></div>
    <p class="doc-text" t="docs.plugins.globals.reservedProto"></p>

    <h3 class="doc-title" id="plugins-reactivity" t="docs.plugins.globals.reactivityTitle"></h3>
    <p class="doc-text" t="docs.plugins.globals.reactivityText"></p>
    <div class="code-block"><pre><span class="hl-tag">&lt;script&gt;</span>
  <span class="hl-fn">NoJS</span>.<span class="hl-fn">global</span>(<span class="hl-str">'user'</span>, { <span class="hl-attr">name</span>: <span class="hl-str">'Guest'</span>, <span class="hl-attr">role</span>: <span class="hl-str">'viewer'</span> });
<span class="hl-tag">&lt;/script&gt;</span>

<span class="hl-cmt">&lt;!-- Updates reactively when $user.name changes --&gt;</span>
<span class="hl-tag">&lt;span</span> <span class="hl-attr">bind</span>=<span class="hl-str">"$user.name"</span><span class="hl-tag">&gt;&lt;/span&gt;</span></pre></div>

    <h3 class="doc-title" id="plugins-ownership" t="docs.plugins.globals.ownershipTitle"></h3>
    <p class="doc-text" t="docs.plugins.globals.ownershipText"></p>
    <div class="code-block"><pre><span class="hl-cmt">// [No.JS] Global "$theme" owned by "ui-kit" is being overwritten.</span></pre></div>
  </div>

  <!-- Interceptor Sentinels -->
  <div class="doc-section">
    <h2 class="doc-title" id="plugins-sentinels" t="docs.plugins.sentinels.title"></h2>
    <p class="doc-text" t="docs.plugins.sentinels.text"></p>

    <h3 class="doc-title" id="plugins-cancel" t="docs.plugins.sentinels.cancelTitle"></h3>
    <p class="doc-text" t="docs.plugins.sentinels.cancelText"></p>
    <div class="code-block"><pre><span class="hl-tag">&lt;script&gt;</span>
  <span class="hl-fn">NoJS</span>.<span class="hl-fn">use</span>({
    <span class="hl-attr">name</span>: <span class="hl-str">'offline-guard'</span>,
    <span class="hl-fn">install</span>(<span class="hl-attr">app</span>) {
      app.<span class="hl-fn">interceptor</span>(<span class="hl-str">'request'</span>, (<span class="hl-attr">url</span>, <span class="hl-attr">opts</span>) <span class="hl-op">=&gt;</span> {
        <span class="hl-kw">if</span> (!navigator.onLine) {
          <span class="hl-kw">return</span> { [app.CANCEL]: <span class="hl-kw">true</span> };
        }
        <span class="hl-kw">return</span> opts;
      });
    }
  });
<span class="hl-tag">&lt;/script&gt;</span></pre></div>

    <h3 class="doc-title" id="plugins-respond" t="docs.plugins.sentinels.respondTitle"></h3>
    <p class="doc-text" t="docs.plugins.sentinels.respondText"></p>
    <div class="code-block"><pre><span class="hl-tag">&lt;script&gt;</span>
  <span class="hl-kw">const</span> cache <span class="hl-op">=</span> <span class="hl-kw">new</span> <span class="hl-fn">Map</span>();

  <span class="hl-fn">NoJS</span>.<span class="hl-fn">use</span>({
    <span class="hl-attr">name</span>: <span class="hl-str">'cache-plugin'</span>,
    <span class="hl-fn">install</span>(<span class="hl-attr">app</span>) {
      app.<span class="hl-fn">interceptor</span>(<span class="hl-str">'request'</span>, (<span class="hl-attr">url</span>, <span class="hl-attr">opts</span>) <span class="hl-op">=&gt;</span> {
        <span class="hl-kw">if</span> (opts.method <span class="hl-op">===</span> <span class="hl-str">'GET'</span> <span class="hl-op">&amp;&amp;</span> cache.<span class="hl-fn">has</span>(url)) {
          <span class="hl-kw">return</span> { [app.RESPOND]: cache.<span class="hl-fn">get</span>(url) };
        }
        <span class="hl-kw">return</span> opts;
      });

      app.<span class="hl-fn">interceptor</span>(<span class="hl-str">'response'</span>, (<span class="hl-attr">response</span>, <span class="hl-attr">url</span>) <span class="hl-op">=&gt;</span> {
        <span class="hl-cmt">// Cache successful responses by URL</span>
        <span class="hl-kw">if</span> (response.ok) {
          cache.<span class="hl-fn">set</span>(url, response);
        }
        <span class="hl-kw">return</span> response;
      });
    }
  });
<span class="hl-tag">&lt;/script&gt;</span></pre></div>

    <h3 class="doc-title" id="plugins-replace" t="docs.plugins.sentinels.replaceTitle"></h3>
    <p class="doc-text" t="docs.plugins.sentinels.replaceText"></p>
    <div class="code-block"><pre><span class="hl-tag">&lt;script&gt;</span>
  <span class="hl-fn">NoJS</span>.<span class="hl-fn">use</span>({
    <span class="hl-attr">name</span>: <span class="hl-str">'transform-plugin'</span>,
    <span class="hl-fn">install</span>(<span class="hl-attr">app</span>) {
      app.<span class="hl-fn">interceptor</span>(<span class="hl-str">'response'</span>, (<span class="hl-attr">response</span>, <span class="hl-attr">url</span>) <span class="hl-op">=&gt;</span> {
        <span class="hl-kw">if</span> (url.<span class="hl-fn">includes</span>(<span class="hl-str">'/users'</span>)) {
          <span class="hl-cmt">// Replace the response with a normalized shape</span>
          <span class="hl-kw">return</span> {
            [app.REPLACE]: {
              <span class="hl-attr">timestamp</span>: Date.<span class="hl-fn">now</span>(),
              <span class="hl-attr">source</span>: url
            }
          };
        }
        <span class="hl-kw">return</span> response;
      });
    }
  });
<span class="hl-tag">&lt;/script&gt;</span></pre></div>

    <h3 class="doc-title" id="plugins-summary" t="docs.plugins.sentinels.summaryTitle"></h3>
    <table class="doc-table">
      <thead>
        <tr>
          <th t="docs.plugins.sentinels.thSentinel"></th>
          <th t="docs.plugins.sentinels.thUsedIn"></th>
          <th t="docs.plugins.sentinels.thEffect"></th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td><code>NoJS.CANCEL</code></td>
          <td t="docs.plugins.sentinels.cancelUsedIn"></td>
          <td t="docs.plugins.sentinels.cancelEffect"></td>
        </tr>
        <tr>
          <td><code>NoJS.RESPOND</code></td>
          <td t="docs.plugins.sentinels.respondUsedIn"></td>
          <td t="docs.plugins.sentinels.respondEffect"></td>
        </tr>
        <tr>
          <td><code>NoJS.REPLACE</code></td>
          <td t="docs.plugins.sentinels.replaceUsedIn"></td>
          <td t="docs.plugins.sentinels.replaceEffect"></td>
        </tr>
      </tbody>
    </table>
  </div>

  <!-- Trusted Interceptors -->
  <div class="doc-section">
    <h2 class="doc-title" id="plugins-trusted" t="docs.plugins.trusted.title"></h2>
    <p class="doc-text" t="docs.plugins.trusted.text"></p>
    <div class="code-block"><pre><span class="hl-tag">&lt;script&gt;</span>
  <span class="hl-fn">NoJS</span>.<span class="hl-fn">use</span>(authPlugin, { <span class="hl-attr">trusted</span>: <span class="hl-kw">true</span> });
<span class="hl-tag">&lt;/script&gt;</span></pre></div>
    <p class="doc-text" t="docs.plugins.trusted.fullAccess"></p>
    <div class="callout"><p t="docs.plugins.trusted.callout"></p></div>

    <h3 class="doc-title" id="plugins-redacted" t="docs.plugins.trusted.redactedTitle"></h3>
    <p class="doc-text" t="docs.plugins.trusted.requestLabel"></p>
    <div class="code-block"><pre>authorization, x-api-key, x-auth-token, cookie,
proxy-authorization, set-cookie, x-csrf-token</pre></div>
    <p class="doc-text" t="docs.plugins.trusted.responseLabel"></p>
    <div class="code-block"><pre>set-cookie, x-csrf-token, x-auth-token,
www-authenticate, proxy-authenticate</pre></div>
  </div>

  <!-- NoJS.dispose() -->
  <div class="doc-section">
    <h2 class="doc-title" id="plugins-dispose" t="docs.plugins.dispose.title"></h2>
    <p class="doc-text" t="docs.plugins.dispose.text"></p>
    <div class="code-block"><pre><span class="hl-tag">&lt;script&gt;</span>
  <span class="hl-cmt">// Full app teardown</span>
  <span class="hl-kw">await</span> <span class="hl-fn">NoJS</span>.<span class="hl-fn">dispose</span>();
<span class="hl-tag">&lt;/script&gt;</span></pre></div>

    <h3 class="doc-title" id="plugins-dispose-order" t="docs.plugins.dispose.orderTitle"></h3>
    <ul class="doc-text">
      <li t="docs.plugins.dispose.orderStep1"></li>
      <li t="docs.plugins.dispose.orderStep2"></li>
      <li t="docs.plugins.dispose.orderStep3"></li>
    </ul>
    <div class="code-block"><pre><span class="hl-fn">NoJS</span>.<span class="hl-fn">dispose</span>()
  <span class="hl-op">=&gt;</span> pluginC.<span class="hl-fn">dispose</span>()   <span class="hl-cmt">// last installed</span>
  <span class="hl-op">=&gt;</span> pluginB.<span class="hl-fn">dispose</span>()
  <span class="hl-op">=&gt;</span> pluginA.<span class="hl-fn">dispose</span>()   <span class="hl-cmt">// first installed</span>
  <span class="hl-op">=&gt;</span> clear globals
  <span class="hl-op">=&gt;</span> clear interceptors</pre></div>

    <h3 class="doc-title" id="plugins-dispose-async" t="docs.plugins.dispose.asyncTitle"></h3>
    <p class="doc-text" t="docs.plugins.dispose.asyncText"></p>
    <div class="code-block"><pre><span class="hl-tag">&lt;script&gt;</span>
  <span class="hl-kw">const</span> analyticsPlugin <span class="hl-op">=</span> {
    <span class="hl-attr">name</span>: <span class="hl-str">'analytics'</span>,
    <span class="hl-fn">install</span>(<span class="hl-attr">app</span>) { <span class="hl-cmt">/* ... */</span> },
    <span class="hl-kw">async</span> <span class="hl-fn">dispose</span>(<span class="hl-attr">app</span>) {
      <span class="hl-kw">await</span> <span class="hl-fn">flushPendingEvents</span>();   <span class="hl-cmt">// Runs within 3s timeout</span>
    }
  };
<span class="hl-tag">&lt;/script&gt;</span></pre></div>
    <div class="callout"><p t="docs.plugins.dispose.callout"></p></div>
  </div>

  <!-- Security Guidelines -->
  <div class="doc-section">
    <h2 class="doc-title" id="plugins-security" t="docs.plugins.security.title"></h2>
    <p class="doc-text" t="docs.plugins.security.text"></p>

    <h3 class="doc-title" id="plugins-namespace" t="docs.plugins.security.namespaceTitle"></h3>
    <p class="doc-text" t="docs.plugins.security.namespaceText"></p>
    <div class="code-block"><pre><span class="hl-cmt">// Good</span>
app.<span class="hl-fn">global</span>(<span class="hl-str">'myPlugin'</span>, { ... });
app.<span class="hl-fn">on</span>(<span class="hl-str">'myPlugin:ready'</span>, fn);

<span class="hl-cmt">// Bad</span>
app.<span class="hl-fn">global</span>(<span class="hl-str">'data'</span>, { ... });
app.<span class="hl-fn">on</span>(<span class="hl-str">'ready'</span>, fn);</pre></div>

    <h3 class="doc-title" id="plugins-eval" t="docs.plugins.security.evalTitle"></h3>
    <p class="doc-text" t="docs.plugins.security.evalText"></p>
    <div class="code-block"><pre><span class="hl-cmt">// Rejected</span>
app.<span class="hl-fn">global</span>(<span class="hl-str">'run'</span>, eval);
app.<span class="hl-fn">global</span>(<span class="hl-str">'exec'</span>, Function);</pre></div>

    <h3 class="doc-title" id="plugins-cleanup" t="docs.plugins.security.cleanupTitle"></h3>
    <p class="doc-text" t="docs.plugins.security.cleanupText"></p>
    <div class="code-block"><pre><span class="hl-kw">const</span> myPlugin <span class="hl-op">=</span> {
  <span class="hl-attr">name</span>: <span class="hl-str">'heartbeat'</span>,
  <span class="hl-attr">_interval</span>: <span class="hl-kw">null</span>,
  <span class="hl-fn">install</span>(<span class="hl-attr">app</span>) {
    <span class="hl-kw">this</span>._interval <span class="hl-op">=</span> <span class="hl-fn">setInterval</span>(() <span class="hl-op">=&gt;</span> <span class="hl-fn">fetch</span>(<span class="hl-str">'/ping'</span>), <span class="hl-num">30000</span>);
  },
  <span class="hl-fn">dispose</span>() {
    <span class="hl-fn">clearInterval</span>(<span class="hl-kw">this</span>._interval);
  }
};</pre></div>

    <h3 class="doc-title" id="plugins-overwrite" t="docs.plugins.security.overwriteTitle"></h3>
    <p class="doc-text" t="docs.plugins.security.overwriteText"></p>

    <h3 class="doc-title" id="plugins-validate" t="docs.plugins.security.validateTitle"></h3>
    <p class="doc-text" t="docs.plugins.security.validateText"></p>
    <div class="code-block"><pre><span class="hl-fn">install</span>(<span class="hl-attr">app</span>, <span class="hl-attr">options</span>) {
  <span class="hl-kw">if</span> (!options.apiKey) {
    console.<span class="hl-fn">warn</span>(<span class="hl-str">'[my-plugin] Missing required option: apiKey'</span>);
    <span class="hl-kw">return</span>;
  }
}</pre></div>
  </div>

  <!-- Official Plugins -->
  <div class="doc-section">
    <h2 class="doc-title" id="plugins-official">Official Plugins</h2>

    <h3 class="doc-title" id="plugins-elements">NoJS Elements</h3>
    <p class="doc-text">The <code>@erickxavier/nojs-elements</code> package provides UI-centric directives that were extracted from core in v1.13.0 for a leaner default bundle.</p>

    <table class="doc-table">
      <thead>
        <tr>
          <th>Capability</th>
          <th>Directives</th>
          <th>Description</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td><strong>Drag &amp; Drop</strong></td>
          <td><code>drag</code>, <code>drop</code>, <code>drag-list</code>, <code>drag-multiple</code></td>
          <td>Full drag-and-drop system with sortable lists, multi-select, keyboard accessibility, and type-safe drop zones.</td>
        </tr>
        <tr>
          <td><strong>Validation</strong></td>
          <td><code>validate</code>, <code>validate-on</code>, <code>validate-if</code>, <code>error-*</code></td>
          <td>Declarative form validation with per-field state, custom validators, and the <code>$form</code> reactive context.</td>
        </tr>
      </tbody>
    </table>

    <h4 style="margin-top: 16px; font-family: var(--font-heading); font-size: 15px; font-weight: 600;">Installation</h4>
    <div class="code-block"><pre><span class="hl-cmt">&lt;!-- CDN --&gt;</span>
<span class="hl-tag">&lt;script</span> <span class="hl-attr">src</span>=<span class="hl-str">"https://cdn.no-js.dev/"</span><span class="hl-tag">&gt;&lt;/script&gt;</span>
<span class="hl-tag">&lt;script</span> <span class="hl-attr">src</span>=<span class="hl-str">"https://cdn.no-js.dev/elements"</span><span class="hl-tag">&gt;&lt;/script&gt;</span>

<span class="hl-cmt">&lt;!-- npm --&gt;</span>
<span class="hl-tag">&lt;script&gt;</span>
  <span class="hl-kw">import</span> NoJS <span class="hl-kw">from</span> <span class="hl-str">'@erickxavier/nojs'</span>;
  <span class="hl-kw">import</span> NoJSElements <span class="hl-kw">from</span> <span class="hl-str">'@erickxavier/nojs-elements'</span>;

  <span class="hl-fn">NoJS</span>.<span class="hl-fn">use</span>(NoJSElements);
<span class="hl-tag">&lt;/script&gt;</span></pre></div>

    <div class="callout" style="margin-top: 12px;">
      <p>Core retains deprecation stubs for all moved directives. They work but emit console warnings guiding you to install the Elements plugin. The stubs will be removed in a future major version.</p>
    </div>
  </div>

  <!-- Complete Example -->
  <div class="doc-section">
    <h2 class="doc-title" id="plugins-example" t="docs.plugins.example.title"></h2>
    <p class="doc-text" t="docs.plugins.example.text"></p>
    <div class="code-block"><pre><span class="hl-tag">&lt;script&gt;</span>
  <span class="hl-kw">const</span> analyticsPlugin <span class="hl-op">=</span> {
    <span class="hl-attr">name</span>: <span class="hl-str">'analytics'</span>,
    <span class="hl-attr">version</span>: <span class="hl-str">'1.0.0'</span>,
    <span class="hl-attr">capabilities</span>: [<span class="hl-str">'interceptor'</span>, <span class="hl-str">'global'</span>],

    <span class="hl-attr">_queue</span>: [],
    <span class="hl-attr">_flushInterval</span>: <span class="hl-kw">null</span>,

    <span class="hl-fn">install</span>(<span class="hl-attr">app</span>, <span class="hl-attr">options</span>) {
      <span class="hl-kw">const</span> trackingId <span class="hl-op">=</span> options.trackingId;
      <span class="hl-kw">if</span> (!trackingId) {
        console.<span class="hl-fn">warn</span>(<span class="hl-str">'[analytics] Missing trackingId option'</span>);
        <span class="hl-kw">return</span>;
      }

      <span class="hl-cmt">// Inject reactive global</span>
      app.<span class="hl-fn">global</span>(<span class="hl-str">'analytics'</span>, {
        <span class="hl-attr">pageViews</span>: <span class="hl-num">0</span>,
        <span class="hl-attr">events</span>: []
      });

      <span class="hl-cmt">// Track all API calls</span>
      app.<span class="hl-fn">interceptor</span>(<span class="hl-str">'response'</span>, (<span class="hl-attr">response</span>, <span class="hl-attr">url</span>) <span class="hl-op">=&gt;</span> {
        <span class="hl-kw">this</span>._queue.<span class="hl-fn">push</span>({
          <span class="hl-attr">type</span>: <span class="hl-str">'api_call'</span>,
          url,
          <span class="hl-attr">status</span>: response.status,
          <span class="hl-attr">timestamp</span>: Date.<span class="hl-fn">now</span>()
        });
        <span class="hl-kw">return</span> response;
      });

      <span class="hl-cmt">// Flush events periodically</span>
      <span class="hl-kw">this</span>._flushInterval <span class="hl-op">=</span> <span class="hl-fn">setInterval</span>(() <span class="hl-op">=&gt;</span> {
        <span class="hl-kw">this</span>.<span class="hl-fn">_flush</span>(trackingId);
      }, options.flushInterval || <span class="hl-num">10000</span>);
    },

    <span class="hl-fn">init</span>(<span class="hl-attr">app</span>) {
      <span class="hl-cmt">// Track initial page view after DOM is ready</span>
      <span class="hl-kw">this</span>._queue.<span class="hl-fn">push</span>({
        <span class="hl-attr">type</span>: <span class="hl-str">'page_view'</span>,
        <span class="hl-attr">path</span>: location.pathname,
        <span class="hl-attr">timestamp</span>: Date.<span class="hl-fn">now</span>()
      });
    },

    <span class="hl-kw">async</span> <span class="hl-fn">dispose</span>(<span class="hl-attr">app</span>) {
      <span class="hl-fn">clearInterval</span>(<span class="hl-kw">this</span>._flushInterval);
      <span class="hl-cmt">// Flush remaining events before shutdown</span>
      <span class="hl-kw">await</span> <span class="hl-kw">this</span>.<span class="hl-fn">_flush</span>(app);
    },

    <span class="hl-fn">_flush</span>(<span class="hl-attr">trackingId</span>) {
      <span class="hl-kw">if</span> (<span class="hl-kw">this</span>._queue.length <span class="hl-op">===</span> <span class="hl-num">0</span>) <span class="hl-kw">return</span>;
      <span class="hl-kw">const</span> events <span class="hl-op">=</span> <span class="hl-kw">this</span>._queue.<span class="hl-fn">splice</span>(<span class="hl-num">0</span>);
      <span class="hl-kw">return</span> <span class="hl-fn">fetch</span>(<span class="hl-str">'/analytics/collect'</span>, {
        <span class="hl-attr">method</span>: <span class="hl-str">'POST'</span>,
        <span class="hl-attr">headers</span>: { <span class="hl-str">'Content-Type'</span>: <span class="hl-str">'application/json'</span> },
        <span class="hl-attr">body</span>: JSON.<span class="hl-fn">stringify</span>({ trackingId, events })
      }).<span class="hl-fn">catch</span>(() <span class="hl-op">=&gt;</span> {
        <span class="hl-cmt">// Re-queue on failure</span>
        <span class="hl-kw">this</span>._queue.<span class="hl-fn">unshift</span>(...events);
      });
    }
  };

  <span class="hl-fn">NoJS</span>.<span class="hl-fn">use</span>(analyticsPlugin, { <span class="hl-attr">trackingId</span>: <span class="hl-str">'UA-123456'</span> });
<span class="hl-tag">&lt;/script&gt;</span>

<span class="hl-cmt">&lt;!-- Use the injected global in templates --&gt;</span>
<span class="hl-tag">&lt;span</span> <span class="hl-attr">bind</span>=<span class="hl-str">"$analytics.pageViews + ' page views'"</span><span class="hl-tag">&gt;&lt;/span&gt;</span></pre></div>
  </div>

</div>
