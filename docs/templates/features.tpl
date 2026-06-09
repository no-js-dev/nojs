<div class="page-wrapper">
<style>
/* ══════════════════════════════════════════════════════════════════
   FEATURES PAGE
   ══════════════════════════════════════════════════════════════════ */

.features-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 24px;
  width: 100%;
}

/* Showcase sections: 2-column, padding 80, gap 60 */
.showcase-section {
  display: flex;
  align-items: flex-start;
  gap: 60px;
  padding: 80px;
}
.showcase-section.alt {
  background: var(--surface);
  flex-direction: row-reverse;
}
.showcase-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 20px;
}
.showcase-title {
  font-family: var(--font-heading);
  font-size: 36px;
  font-weight: bold;
  color: var(--text);
}
.showcase-desc {
  font-family: var(--font-body);
  font-size: 16px;
  color: var(--text-secondary);
  line-height: 1.7;
}
.showcase-highlights {
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.showcase-code {
  width: 500px;
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

/* Stats strip: #F8FAFC bg, borders top/bottom, padding 44/80 */
.stats-strip {
  background: var(--surface);
  border-top: 1px solid var(--border);
  border-bottom: 1px solid var(--border);
  padding: 44px 80px;
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.stat-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
}
.stat-value {
  font-family: var(--font-heading);
  font-size: 40px;
  font-weight: bold;
  color: var(--primary);
  letter-spacing: -1px;
}
.stat-label {
  font-family: var(--font-body);
  font-size: 14px;
  color: var(--text-muted);
}

/* Showcase preview panel (stacked above code block inside .showcase-code) */
.showcase-preview {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  padding: 20px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.showcase-section.alt .showcase-preview {
  background: var(--white);
}
.showcase-preview-label {
  font-family: var(--font-heading);
  font-size: 10px;
  font-weight: 600;
  color: var(--text-dim);
  letter-spacing: 0.5px;
}
.showcase-preview-inner {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 8px 0;
}
.showcase-preview-output {
  font-family: var(--font-heading);
  font-size: 22px;
  font-weight: bold;
  color: var(--text);
  text-align: center;
}
.showcase-list-item {
  display: flex;
  align-items: center;
  gap: 8px;
  font-family: var(--font-body);
  font-size: 13px;
  color: var(--text);
  padding: 4px 0;
}
.showcase-list-item.inactive {
  color: var(--text-dim);
}
.showcase-list-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--border);
  flex-shrink: 0;
}
.showcase-list-dot.active {
  background: var(--primary);
}
.showcase-counter {
  font-family: var(--font-heading);
  font-size: 48px;
  font-weight: bold;
  color: var(--text);
  text-align: center;
  letter-spacing: -2px;
}

/* Feature Grid Section: #F8FAFC bg, padding 80, gap 40 */
.feature-grid-section {
  background: var(--surface);
  padding: 80px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 40px;
}

/* ── Responsive ── */
@media (max-width: 1024px) {
  .showcase-section { flex-direction: column; padding: 40px 24px; }
  .showcase-section.alt { flex-direction: column; }
  .showcase-code { width: 100%; }
  .feature-grid-section { padding: 40px 24px; }
  .features-grid { grid-template-columns: repeat(2, 1fr); }
}
@media (max-width: 768px) {
  .features-grid { grid-template-columns: 1fr; }
  .showcase-title { font-size: 28px; }
}
</style>
<!-- Features Page — from design.pen "Features Page" (wejNg) -->

<!-- ═══ Hero: #F8FAFC, padding 80, center, gap 20 ═══ -->
<section class="hero-section">
  <span class="badge" t="features.hero.badge"></span>
  <h1 class="hero-title" t="features.hero.title"></h1>
  <p class="hero-subtitle" t="features.hero.subtitle"></p>
</section>

<!-- ═══ Showcase 1 — Reactive State (white bg) ═══ -->
<section class="showcase-section">
  <div class="showcase-content">
    <span class="badge" t="features.showcase1.badge"></span>
    <h2 class="showcase-title" t="features.showcase1.title"></h2>
    <p class="showcase-desc" t="features.showcase1.desc"></p>
    <div class="showcase-highlights">
      <div class="highlight-item"><span class="highlight-dot">✓</span><span class="highlight-text" t="features.showcase1.h1"></span></div>
      <div class="highlight-item"><span class="highlight-dot">✓</span><span class="highlight-text" t="features.showcase1.h2"></span></div>
      <div class="highlight-item"><span class="highlight-dot">✓</span><span class="highlight-text" t="features.showcase1.h3"></span></div>
      <div class="highlight-item"><span class="highlight-dot">✓</span><span class="highlight-text" t="features.showcase1.h4"></span></div>
    </div>
  </div>
  <div class="showcase-code">
    <div class="showcase-preview" state="{ user: 'World' }">
      <span class="showcase-preview-label" t="features.showcase.previewLabel"></span>
      <div class="showcase-preview-inner">
        <input class="input" model="user" placeholder="Enter name..." style="margin-bottom:0">
        <p class="showcase-preview-output" bind="'Hello, ' + user"></p>
      </div>
    </div>
    <div class="code-block">
      <pre><span class="hl-tag">&lt;div</span> <span class="hl-attr">state</span>=<span class="hl-str">"{ user: 'World' }"</span><span class="hl-tag">&gt;</span>
  <span class="hl-line-highlight"><span class="hl-tag">&lt;h1</span> <span class="hl-attr">bind</span>=<span class="hl-str">"'Hello, ' + user"</span><span class="hl-tag">&gt;</span></span>
  <span class="hl-tag">&lt;/h1&gt;</span>
<span class="hl-tag">&lt;/div&gt;</span></pre>
    </div>
  </div>
</section>

<!-- ═══ Showcase 2 — Declarative Rendering (#F8FAFC bg, reversed) ═══ -->
<section class="showcase-section alt">
  <div class="showcase-content">
    <span class="badge" t="features.showcase2.badge"></span>
    <h2 class="showcase-title" t="features.showcase2.title"></h2>
    <p class="showcase-desc" t="features.showcase2.desc"></p>
    <div class="showcase-highlights">
      <div class="highlight-item"><span class="highlight-dot">✓</span><span class="highlight-text" t="features.showcase2.h1"></span></div>
      <div class="highlight-item"><span class="highlight-dot">✓</span><span class="highlight-text" t="features.showcase2.h2"></span></div>
      <div class="highlight-item"><span class="highlight-dot">✓</span><span class="highlight-text" t="features.showcase2.h3"></span></div>
      <div class="highlight-item"><span class="highlight-dot">✓</span><span class="highlight-text" t="features.showcase2.h4"></span></div>
    </div>
  </div>
  <div class="showcase-code">
    <div class="showcase-preview">
      <span class="showcase-preview-label" t="features.showcase.previewLabel"></span>
      <div class="showcase-preview-inner">
        <div class="showcase-list-item"><span class="showcase-list-dot active"></span> <span t="features.showcase2.item1"></span></div>
        <div class="showcase-list-item"><span class="showcase-list-dot active"></span> <span t="features.showcase2.item2"></span></div>
        <div class="showcase-list-item inactive"><span class="showcase-list-dot"></span> <span t="features.showcase2.item3"></span></div>
      </div>
    </div>
    <div class="code-block">
      <pre><span class="hl-tag">&lt;ul&gt;</span>
  <span class="hl-line-highlight"><span class="hl-tag">&lt;li</span> <span class="hl-attr">each</span>=<span class="hl-str">"item in items"</span></span>
<span class="hl-line-highlight">      <span class="hl-attr">bind</span>=<span class="hl-str">"item.name"</span></span>
<span class="hl-line-highlight">      <span class="hl-attr">if</span>=<span class="hl-str">"item.active"</span><span class="hl-tag">&gt;&lt;/li&gt;</span></span>
  <span class="hl-tag">&lt;li</span> <span class="hl-attr">else</span><span class="hl-tag">&gt;</span>No items<span class="hl-tag">&lt;/li&gt;</span>
<span class="hl-tag">&lt;/ul&gt;</span></pre>
    </div>
  </div>
</section>

<!-- ═══ Showcase 3 — Event Handling (white bg) ═══ -->
<section class="showcase-section">
  <div class="showcase-content">
    <span class="badge" t="features.showcase3.badge"></span>
    <h2 class="showcase-title" t="features.showcase3.title"></h2>
    <p class="showcase-desc" t="features.showcase3.desc"></p>
    <div class="showcase-highlights">
      <div class="highlight-item"><span class="highlight-dot">✓</span><span class="highlight-text" t="features.showcase3.h1"></span></div>
      <div class="highlight-item"><span class="highlight-dot">✓</span><span class="highlight-text" t="features.showcase3.h2"></span></div>
      <div class="highlight-item"><span class="highlight-dot">✓</span><span class="highlight-text" t="features.showcase3.h3"></span></div>
      <div class="highlight-item"><span class="highlight-dot">✓</span><span class="highlight-text" t="features.showcase3.h4"></span></div>
    </div>
  </div>
  <div class="showcase-code">
    <div class="showcase-preview" state="{ count: 0 }">
      <span class="showcase-preview-label" t="features.showcase.previewLabel"></span>
      <div class="showcase-preview-inner" style="align-items:center">
        <p class="showcase-counter" bind="count"></p>
        <button class="btn btn-primary" on:click="count++"><span t="features.showcase3.clickedLabel"></span>&nbsp;<span bind="count"></span></button>
      </div>
    </div>
    <div class="code-block">
      <pre><span class="hl-tag">&lt;div</span> <span class="hl-attr">state</span>=<span class="hl-str">"{ count: 0 }"</span><span class="hl-tag">&gt;</span>
  <span class="hl-line-highlight"><span class="hl-tag">&lt;button</span> <span class="hl-attr">on:click</span>=<span class="hl-str">"count++"</span><span class="hl-tag">&gt;</span></span>
    <span class="hl-tag">&lt;span</span> <span class="hl-attr">bind</span>=<span class="hl-str">"count"</span><span class="hl-tag">&gt;&lt;/span&gt;</span>
  <span class="hl-tag">&lt;/button&gt;</span>
<span class="hl-tag">&lt;/div&gt;</span></pre>
    </div>
  </div>
</section>

<!-- ═══ Feature Grid Section: #F8FAFC bg, padding 80, gap 40 ═══ -->
<section class="feature-grid-section">
  <div class="section-header">
    <h2 class="section-title" t="features.grid.title"></h2>
    <p class="section-subtitle" t="features.grid.subtitle"></p>
  </div>
  <div class="features-grid">
    <div class="feature-card">
      <div class="feature-card-icon"><svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="18" cy="18" r="3"/><circle cx="18" cy="6" r="3"/><circle cx="6" cy="12" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></svg></div>
      <div class="feature-card-title" t="features.grid.routing.title"></div>
      <div class="feature-card-desc" t="features.grid.routing.desc"></div>
    </div>
    <div class="feature-card">
      <div class="feature-card-icon"><svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg></div>
      <div class="feature-card-title" t="features.grid.forms.title"></div>
      <div class="feature-card-desc" t="features.grid.forms.desc"></div>
    </div>
    <div class="feature-card">
      <div class="feature-card-icon"><svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg></div>
      <div class="feature-card-title" t="features.grid.fetch.title"></div>
      <div class="feature-card-desc" t="features.grid.fetch.desc"></div>
    </div>
    <div class="feature-card">
      <div class="feature-card-icon"><svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="13.5" cy="6.5" r=".5"/><circle cx="17.5" cy="10.5" r=".5"/><circle cx="8.5" cy="7.5" r=".5"/><circle cx="6.5" cy="12" r=".5"/><path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.926 0 1.648-.746 1.648-1.688 0-.437-.18-.835-.437-1.125-.29-.289-.438-.652-.438-1.125a1.64 1.64 0 0 1 1.668-1.668h1.996c3.051 0 5.555-2.503 5.555-5.554C21.965 6.012 17.461 2 12 2z"/></svg></div>
      <div class="feature-card-title" t="features.grid.css.title"></div>
      <div class="feature-card-desc" t="features.grid.css.desc"></div>
    </div>
    <div class="feature-card">
      <div class="feature-card-icon"><svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/></svg></div>
      <div class="feature-card-title" t="features.grid.lifecycle.title"></div>
      <div class="feature-card-desc" t="features.grid.lifecycle.desc"></div>
    </div>
    <div class="feature-card">
      <div class="feature-card-icon"><svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="16.5" y1="9.4" x2="7.5" y2="4.21"/><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/></svg></div>
      <div class="feature-card-title" t="features.grid.zero.title"></div>
      <div class="feature-card-desc" t="features.grid.zero.desc"></div>
    </div>
  </div>
</section>

<!-- ═══ CTA: #0F172A bg ═══ -->
<section class="cta-section">
  <h2 class="cta-title" t="features.cta.title"></h2>
  <p class="cta-subtitle" t="features.cta.subtitle"></p>
  <div class="cta-buttons">
    <a route="/docs" class="btn btn-cta-primary" t="features.cta.button"></a>
  </div>
</section>
</div>
