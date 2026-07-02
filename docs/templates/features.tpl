<header class="subpage-hero" use="subpage-hero" state="{ titleKey: 'features.hero.title', subtitleKey: 'features.hero.subtitle' }"></header>

<main class="page-body">
  <!-- Showcase 1 — Reactive State -->
  <section class="page-section">
    <h2 class="section-title" t="features.showcase1.title"></h2>
    <p class="section-subtitle" t="features.showcase1.desc"></p>

    <div class="directives-container" style="margin-top: 3.5rem;">
      <div class="directive-showcase" use="directive-card" state="{ badge: $i18n.t('features.showcase1.badge'), name: $i18n.t('features.showcase1.title'), desc: $i18n.t('features.showcase1.highlights'), filename: 'reactive-state.html' }">
        <pre class="editor-code"><code><span class="tok-punc">&lt;</span><span class="tok-tag">div</span> <span class="tok-attr">state</span><span class="tok-punc">=</span><span class="tok-str">"{ user: 'World' }"</span><span class="tok-punc">&gt;</span>
  <span class="tok-punc">&lt;</span><span class="tok-tag">input</span> <span class="tok-attr">model</span><span class="tok-punc">=</span><span class="tok-str">"user"</span> <span class="tok-attr">placeholder</span><span class="tok-punc">=</span><span class="tok-str">"Enter name..."</span> <span class="tok-punc">/&gt;</span>
  <span class="tok-punc">&lt;</span><span class="tok-tag">h1</span> <span class="tok-attr">bind</span><span class="tok-punc">=</span><span class="tok-str">"'Hello, ' + user"</span><span class="tok-punc">&gt;&lt;/</span><span class="tok-tag">h1</span><span class="tok-punc">&gt;</span>
<span class="tok-punc">&lt;/</span><span class="tok-tag">div</span><span class="tok-punc">&gt;</span></code></pre>
      </div>
    </div>
  </section>

  <div class="section-divider" use="section-divider"></div>

  <!-- Showcase 2 — Declarative Rendering -->
  <section class="page-section">
    <h2 class="section-title" t="features.showcase2.title"></h2>
    <p class="section-subtitle" t="features.showcase2.desc"></p>

    <div class="directives-container showcase-reverse" style="margin-top: 3.5rem;">
      <div class="directive-showcase" use="directive-card" state="{ badge: $i18n.t('features.showcase2.badge'), name: $i18n.t('features.showcase2.title'), desc: $i18n.t('features.showcase2.highlights'), filename: 'list-rendering.html' }">
        <pre class="editor-code"><code><span class="tok-punc">&lt;</span><span class="tok-tag">ul</span><span class="tok-punc">&gt;</span>
  <span class="tok-punc">&lt;</span><span class="tok-tag">li</span> <span class="tok-attr">foreach</span><span class="tok-punc">=</span><span class="tok-str">"item in items"</span>
      <span class="tok-attr">bind</span><span class="tok-punc">=</span><span class="tok-str">"item.name"</span>
      <span class="tok-attr">if</span><span class="tok-punc">=</span><span class="tok-str">"item.active"</span><span class="tok-punc">&gt;&lt;/</span><span class="tok-tag">li</span><span class="tok-punc">&gt;</span>
  <span class="tok-punc">&lt;</span><span class="tok-tag">li</span> <span class="tok-attr">else</span><span class="tok-punc">&gt;</span>No items<span class="tok-punc">&lt;/</span><span class="tok-tag">li</span><span class="tok-punc">&gt;</span>
<span class="tok-punc">&lt;/</span><span class="tok-tag">ul</span><span class="tok-punc">&gt;</span></code></pre>
      </div>
    </div>
  </section>

  <div class="section-divider" use="section-divider"></div>

  <!-- Showcase 3 — Event Handling -->
  <section class="page-section">
    <h2 class="section-title" t="features.showcase3.title"></h2>
    <p class="section-subtitle" t="features.showcase3.desc"></p>

    <div class="directives-container" style="margin-top: 3.5rem;">
      <div class="directive-showcase" use="directive-card" state="{ badge: $i18n.t('features.showcase3.badge'), name: $i18n.t('features.showcase3.title'), desc: $i18n.t('features.showcase3.highlights'), filename: 'event-handling.html' }">
        <pre class="editor-code"><code><span class="tok-punc">&lt;</span><span class="tok-tag">div</span> <span class="tok-attr">state</span><span class="tok-punc">=</span><span class="tok-str">"{ count: 0 }"</span><span class="tok-punc">&gt;</span>
  <span class="tok-punc">&lt;</span><span class="tok-tag">button</span> <span class="tok-attr">on:click</span><span class="tok-punc">=</span><span class="tok-str">"count++"</span><span class="tok-punc">&gt;</span>
    Clicked: <span class="tok-mustache">{{ count }}</span>
  <span class="tok-punc">&lt;/</span><span class="tok-tag">button</span><span class="tok-punc">&gt;</span>
<span class="tok-punc">&lt;/</span><span class="tok-tag">div</span><span class="tok-punc">&gt;</span></code></pre>
      </div>
    </div>
  </section>

  <div class="section-divider" use="section-divider"></div>

  <!-- Feature Grid -->
  <section class="page-section">
    <h2 class="section-title" t="features.grid.title"></h2>
    <p class="section-subtitle" t="features.grid.subtitle"></p>

    <div class="feature-table">
      <div class="feature-table-row">
        <div class="feature-table-icon">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <circle cx="18" cy="18" r="3"/><circle cx="18" cy="6" r="3"/><circle cx="6" cy="12" r="3"/>
            <line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/>
          </svg>
        </div>
        <h3 class="feature-table-title" t="features.grid.routing.title"></h3>
        <p class="feature-table-desc" t="features.grid.routing.desc" t-html></p>
      </div>
      <div class="feature-table-row">
        <div class="feature-table-icon">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
            <polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/>
          </svg>
        </div>
        <h3 class="feature-table-title" t="features.grid.forms.title"></h3>
        <p class="feature-table-desc" t="features.grid.forms.desc" t-html></p>
      </div>
      <div class="feature-table-row">
        <div class="feature-table-icon">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/>
            <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>
          </svg>
        </div>
        <h3 class="feature-table-title" t="features.grid.fetch.title"></h3>
        <p class="feature-table-desc" t="features.grid.fetch.desc" t-html></p>
      </div>
      <div class="feature-table-row">
        <div class="feature-table-icon">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <circle cx="13.5" cy="6.5" r=".5"/><circle cx="17.5" cy="10.5" r=".5"/><circle cx="8.5" cy="7.5" r=".5"/><circle cx="6.5" cy="12" r=".5"/>
            <path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.926 0 1.648-.746 1.648-1.688 0-.437-.18-.835-.437-1.125-.29-.289-.438-.652-.438-1.125a1.64 1.64 0 0 1 1.668-1.668h1.996c3.051 0 5.555-2.503 5.555-5.554C21.965 6.012 17.461 2 12 2z"/>
          </svg>
        </div>
        <h3 class="feature-table-title" t="features.grid.css.title"></h3>
        <p class="feature-table-desc" t="features.grid.css.desc" t-html></p>
      </div>
      <div class="feature-table-row">
        <div class="feature-table-icon">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/>
            <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/>
          </svg>
        </div>
        <h3 class="feature-table-title" t="features.grid.lifecycle.title"></h3>
        <p class="feature-table-desc" t="features.grid.lifecycle.desc" t-html></p>
      </div>
      <div class="feature-table-row">
        <div class="feature-table-icon">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <line x1="16.5" y1="9.4" x2="7.5" y2="4.21"/>
            <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/>
            <polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/>
          </svg>
        </div>
        <h3 class="feature-table-title" t="features.grid.zero.title"></h3>
        <p class="feature-table-desc" t="features.grid.zero.desc" t-html></p>
      </div>
    </div>
  </section>

  <div class="section-divider" use="section-divider"></div>

  <!-- CTA Section -->
  <section class="page-section" style="text-align: center; padding-bottom: 8rem;">
    <h2 class="section-title" t="features.cta.title"></h2>
    <p class="section-subtitle" t="features.cta.subtitle"></p>
    <div style="margin-top: 2.5rem; display: flex; justify-content: center; gap: 1rem;">
      <a route="/docs" class="btn btn-primary">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
          <polyline points="4 17 10 11 4 5"></polyline>
          <line x1="12" y1="19" x2="20" y2="19"></line>
        </svg>
        <span t="features.cta.button"></span>
      </a>
    </div>
  </section>
</main>
