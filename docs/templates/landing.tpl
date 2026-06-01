<div class="page-wrapper">
<style>
/* ══════════════════════════════════════════════════════════════════
   LANDING PAGE v8
   ══════════════════════════════════════════════════════════════════ */

/* ── Hero ── */
.landing-hero {
  background: linear-gradient(180deg, var(--code-bg), var(--code-surface));
  min-height: calc(100vh - var(--header-h));
  padding: calc(var(--header-h) + 60px) 80px 80px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 32px;
  text-align: center;
}
.landing-hero-badge {
  display: inline-flex;
  align-items: center;
  padding: 8px 16px;
  border-radius: 100px;
  background: #0EA5E91A;
  border: 1px solid #0EA5E966;
  font-family: var(--font-heading);
  font-size: 13px;
  font-weight: 600;
  color: var(--primary);
}
.landing-hero-headline {
  font-family: var(--font-heading);
  font-size: 72px;
  font-weight: bold;
  color: var(--white);
  letter-spacing: -2px;
  line-height: 1.1;
  max-width: 900px;
  white-space: pre-line;
}
.landing-hero-sub {
  font-family: var(--font-body);
  font-size: 20px;
  color: var(--text-dim);
  line-height: 1.6;
  max-width: 700px;
}
.landing-hero-cta {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 16px;
}
.landing-hero-cta .btn-hero-outline {
  background: transparent;
  color: #CBD5E1;
  padding: 14px 32px;
  font-size: 16px;
  font-family: var(--font-heading);
  font-weight: 600;
  border: 1px solid #475569;
  border-radius: var(--radius);
  transition: border-color 0.2s;
}
.landing-hero-cta .btn-hero-outline:hover {
  border-color: var(--text-dim);
}
.landing-hero-install {
  background: var(--code-surface);
  border: 1px solid #334155;
  border-radius: var(--radius);
  overflow: hidden;
  width: 560px;
}
.landing-hero-install-tab {
  display: flex;
  background: var(--code-bg);
}
.landing-hero-install-tab span {
  padding: 10px 18px;
  font-family: var(--font-heading);
  font-size: 13px;
  font-weight: 600;
  color: var(--primary);
  background: var(--code-surface);
}
.landing-hero-install-code {
  padding: 14px 20px;
  text-align: left;
}
.landing-hero-install-code pre {
  font-family: var(--font-mono);
  font-size: 13px;
  color: #E2E8F0;
  margin: 0;
  white-space: pre;
  overflow-x: auto;
}
.hl-tag { color: #F47067; }
.hl-attr { color: #79C0FF; }
.hl-punct { color: #E2E8F0; }
.hl-string { color: #A5D6FF; }

/* ── Code Compare ── */
.landing-code-compare {
  background: var(--white);
  padding: 80px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 40px;
}
.landing-code-compare-title {
  font-family: var(--font-heading);
  font-size: 48px;
  font-weight: bold;
  color: var(--code-bg);
  text-align: center;
  letter-spacing: -2px;
  line-height: 1.2;
  max-width: 700px;
}
.landing-code-compare-sub {
  font-family: var(--font-body);
  font-size: 16px;
  color: var(--text-muted);
  text-align: center;
}
.landing-panels {
  display: flex;
  gap: 24px;
  width: 100%;
}
.landing-panel {
  flex: 1;
  background: var(--code-bg);
  border-radius: var(--radius-lg);
  padding: 28px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}
.landing-panel-topbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.landing-panel-label {
  font-family: var(--font-heading);
  font-size: 13px;
  font-weight: 600;
}
.landing-panel-label--react { color: #F87171; }
.landing-panel-label--nojs { color: var(--primary); }
.landing-panel-meta {
  font-family: var(--font-mono);
  font-size: 11px;
  color: var(--text-muted);
}
.landing-panel-code {
  font-family: var(--font-mono);
  font-size: 13px;
  line-height: 1.7;
  color: #E2E8F0;
  margin: 0;
  white-space: pre;
  overflow-x: auto;
}
.landing-panel-code--nojs { color: #A5F3FC; }
.landing-ln {
  display: inline-block;
  width: 2.5ch;
  text-align: right;
  margin-right: 1.5ch;
  color: #475569;
  user-select: none;
  pointer-events: none;
  opacity: .45;
}
.landing-panel-note {
  font-family: var(--font-body);
  font-size: 13px;
  font-weight: 500;
  color: var(--primary);
}

/* ── Features Grid ── */
.landing-features {
  background: var(--surface);
  padding: 100px 80px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 48px;
}
.landing-kicker {
  font-family: var(--font-heading);
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 4px;
  color: var(--primary);
  text-transform: uppercase;
}
.landing-features-title {
  font-family: var(--font-heading);
  font-size: 48px;
  font-weight: bold;
  color: var(--code-bg);
  letter-spacing: -2px;
  line-height: 1.2;
  max-width: 700px;
  text-align: center;
  white-space: pre-line;
}
.landing-features-sub {
  font-family: var(--font-body);
  font-size: 18px;
  color: var(--text-muted);
  text-align: center;
  max-width: 700px;
}
.landing-features-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 24px;
  width: 100%;
}
.landing-feature-card {
  background: var(--surface);
  border-radius: var(--radius-lg);
  padding: 28px;
  border: 1px solid var(--border);
  display: flex;
  flex-direction: column;
  gap: 16px;
}
.landing-feature-title {
  font-family: var(--font-heading);
  font-size: 18px;
  font-weight: 600;
  color: var(--code-bg);
}
.landing-feature-desc {
  font-family: var(--font-body);
  font-size: 14px;
  color: var(--text-muted);
  line-height: 1.6;
}

/* ── Bundle Stats ── */
.landing-bundle {
  background: var(--white);
  padding: 100px 80px 80px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 24px;
  text-align: center;
}
.landing-bundle-badge {
  display: inline-flex;
  align-items: center;
  padding: 8px 16px;
  border-radius: 100px;
  background: var(--primary-surface);
  border: 1px solid #BAE6FD;
  font-family: var(--font-heading);
  font-size: 13px;
  font-weight: 600;
  color: var(--primary-dark);
}
.landing-bundle-h1 {
  font-family: var(--font-heading);
  font-size: 64px;
  font-weight: bold;
  color: var(--text);
  letter-spacing: -2px;
}
.landing-bundle-h2 {
  font-family: var(--font-heading);
  font-size: 64px;
  font-weight: bold;
  color: var(--primary);
  letter-spacing: -2px;
}
.landing-bundle-sub {
  font-family: var(--font-body);
  font-size: 20px;
  color: var(--text-dim);
  max-width: 520px;
}
.landing-bundle-btns {
  display: flex;
  align-items: center;
  gap: 16px;
}

/* ── Manifesto ── */
.landing-manifesto {
  background: var(--code-bg);
  padding: 120px 80px 100px;
  display: flex;
  flex-direction: column;
  gap: 32px;
}
.landing-manifesto-kicker {
  font-family: var(--font-heading);
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 4px;
  color: #475569;
  text-transform: uppercase;
}
.landing-manifesto-h1 {
  font-family: var(--font-heading);
  font-size: 64px;
  font-weight: bold;
  color: var(--white);
  letter-spacing: -3px;
  max-width: 900px;
  line-height: 1.1;
}
.landing-manifesto-h2 {
  font-family: var(--font-heading);
  font-size: 36px;
  font-weight: normal;
  color: var(--primary);
  letter-spacing: -1px;
  max-width: 800px;
}
.landing-divider {
  width: 120px;
  height: 3px;
  background: var(--primary);
}

/* ── Problem Editorial ── */
.landing-problem {
  background: var(--code-bg);
  padding: 80px;
  display: flex;
  flex-direction: column;
  gap: 60px;
  border-top: 1px solid var(--code-surface);
}
.landing-problem-kicker {
  font-family: var(--font-heading);
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 4px;
  color: #475569;
  text-transform: uppercase;
}
.landing-columns {
  display: flex;
  gap: 48px;
  width: 100%;
}
.landing-column {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 1.2em;
}
.landing-column p {
  font-family: var(--font-body);
  font-size: 15px;
  color: var(--text-dim);
  line-height: 1.8;
}

/* ── Principles ── */
.landing-principles {
  background: #0A1020;
  padding: 80px;
  display: flex;
  flex-direction: column;
  gap: 48px;
  border-top: 1px solid var(--code-surface);
}
.landing-principles-kicker {
  font-family: var(--font-heading);
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 4px;
  color: #475569;
  text-transform: uppercase;
}
.landing-principles-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 24px;
  width: 100%;
}
.landing-principle-card {
  background: var(--code-bg);
  border: 1px solid var(--code-surface);
  border-radius: var(--radius);
  padding: 28px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.landing-principle-num {
  font-family: var(--font-heading);
  font-size: 24px;
  font-weight: bold;
  color: var(--primary);
}
.landing-principle-title {
  font-family: var(--font-heading);
  font-size: 18px;
  font-weight: 600;
  color: var(--white);
}
.landing-principle-desc {
  font-family: var(--font-body);
  font-size: 14px;
  color: var(--text-muted);
  line-height: 1.6;
}

/* ── Community ── */
.landing-community {
  background: var(--surface);
  padding: 80px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 40px;
  text-align: center;
}
.landing-community-title {
  font-family: var(--font-heading);
  font-size: 48px;
  font-weight: bold;
  color: var(--code-bg);
  letter-spacing: -2px;
  line-height: 1.2;
  max-width: 700px;
  white-space: pre-line;
}
.landing-community-sub {
  font-family: var(--font-body);
  font-size: 18px;
  color: var(--text-muted);
  max-width: 600px;
}
.landing-community-btns {
  display: flex;
  align-items: center;
  gap: 24px;
}
.landing-community-btns .btn-github {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  background: var(--code-bg);
  color: var(--white);
  padding: 14px 28px;
  border-radius: var(--radius);
  font-family: var(--font-heading);
  font-size: 16px;
  font-weight: 600;
  transition: background 0.2s;
}
.landing-community-btns .btn-github:hover {
  background: #1E293B;
}
.landing-community-btns .btn-github svg,
.landing-community-btns .btn-discord svg {
  width: 20px;
  height: 20px;
}
.landing-community-btns .btn-discord {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  background: transparent;
  color: var(--code-bg);
  padding: 14px 28px;
  border-radius: var(--radius);
  border: 1px solid #CBD5E1;
  font-family: var(--font-heading);
  font-size: 16px;
  font-weight: 600;
  transition: border-color 0.2s;
}
.landing-community-btns .btn-discord:hover {
  border-color: var(--text-dim);
}

/* ── Quote ── */
.landing-quote {
  background: var(--surface);
  padding: 80px 160px;
  display: flex;
  align-items: center;
  justify-content: center;
}
.landing-quote-text {
  font-family: var(--font-heading);
  font-size: 48px;
  font-weight: bold;
  color: var(--primary);
  text-align: center;
  letter-spacing: -2px;
  line-height: 1.3;
  max-width: 900px;
  margin: 0;
}

/* ── Responsive ── */
@media (max-width: 1024px) {
  .landing-hero { padding: calc(var(--header-h) + 40px) 24px 60px; }
  .landing-hero-headline { font-size: 48px; }
  .landing-hero-install { width: auto; max-width: 100%; }
  .landing-code-compare { padding: 60px 24px; }
  .landing-code-compare-title { font-size: 36px; }
  .landing-panels { flex-direction: column; }
  .landing-features { padding: 60px 24px; }
  .landing-features-title { font-size: 36px; }
  .landing-features-grid { grid-template-columns: repeat(2, 1fr); }
  .landing-bundle { padding: 60px 24px; }
  .landing-bundle-h1, .landing-bundle-h2 { font-size: 40px; }
  .landing-manifesto { padding: 60px 24px; }
  .landing-manifesto-h1 { font-size: 40px; }
  .landing-manifesto-h2 { font-size: 24px; }
  .landing-problem { padding: 40px 24px; }
  .landing-columns { flex-direction: column; gap: 32px; }
  .landing-principles { padding: 40px 24px; }
  .landing-principles-grid { grid-template-columns: repeat(2, 1fr); }
  .landing-community { padding: 60px 24px; }
  .landing-community-title { font-size: 36px; }
  .landing-quote { padding: 40px 24px; }
  .landing-quote-text { font-size: 32px; }
}
@media (max-width: 768px) {
  .landing-hero { min-height: auto; padding: calc(var(--header-h) + 32px) 20px 48px; }
  .landing-hero-headline { font-size: 36px; letter-spacing: -1px; }
  .landing-hero-sub { font-size: 16px; }
  .landing-hero-cta { flex-direction: column; width: 100%; }
  .landing-hero-cta .btn, .landing-hero-cta .btn-hero-outline { width: 100%; text-align: center; }
  .landing-hero-install-code pre { font-size: 11px; }
  .landing-panel-code { font-size: 11px; }
  .landing-code-compare { padding: 48px 20px; }
  .landing-code-compare-title { font-size: 28px; }
  .landing-features { padding: 48px 20px; }
  .landing-features-title { font-size: 28px; }
  .landing-features-sub { font-size: 16px; }
  .landing-features-grid { grid-template-columns: 1fr; }
  .landing-bundle { padding: 48px 20px; }
  .landing-bundle-h1, .landing-bundle-h2 { font-size: 32px; }
  .landing-bundle-btns { flex-direction: column; width: 100%; }
  .landing-bundle-btns .btn { width: 100%; text-align: center; }
  .landing-manifesto { padding: 48px 20px; }
  .landing-manifesto-h1 { font-size: 32px; letter-spacing: -1px; }
  .landing-manifesto-h2 { font-size: 20px; }
  .landing-problem { padding: 40px 20px; }
  .landing-principles { padding: 40px 20px; }
  .landing-principles-grid { grid-template-columns: 1fr; }
  .landing-community { padding: 48px 20px; }
  .landing-community-title { font-size: 28px; }
  .landing-community-btns { flex-direction: column; width: 100%; }
  .landing-community-btns .btn-github,
  .landing-community-btns .btn-discord { width: 100%; justify-content: center; }
  .landing-quote { padding: 40px 20px; }
  .landing-quote-text { font-size: 24px; }
}
@media (max-width: 480px) {
  .landing-hero-headline { font-size: 28px; }
  .landing-hero-sub { font-size: 15px; }
  .landing-hero-badge { font-size: 12px; }
  .landing-code-compare-title { font-size: 24px; }
  .landing-features-title { font-size: 24px; }
  .landing-bundle-h1, .landing-bundle-h2 { font-size: 26px; }
  .landing-manifesto-h1 { font-size: 26px; }
  .landing-manifesto-h2 { font-size: 18px; }
  .landing-community-title { font-size: 24px; }
  .landing-quote-text { font-size: 20px; }
  .landing-principle-num { font-size: 20px; }
  .landing-principle-title { font-size: 16px; }
}
</style>
<!-- Landing Page v8 — from design.pen frame JWtJT -->

<!-- ═══ Section 1: Hero — gradient dark bg ═══ -->
<section class="landing-hero">
  <span class="landing-hero-badge" t="landing.hero.badge"></span>
  <h1 class="landing-hero-headline" t="landing.hero.headline"></h1>
  <p class="landing-hero-sub" t="landing.hero.subtitle"></p>
  <div class="landing-hero-cta">
    <a route="/docs" class="btn btn-primary" t="landing.hero.getStarted"></a>
    <a route="/playground" class="btn btn-hero-outline" t="landing.hero.playground"></a>
  </div>
  <div class="landing-hero-install">
    <div class="landing-hero-install-tab"><span>CDN</span></div>
    <div class="landing-hero-install-code">
      <pre><span class="hl-tag">&lt;script</span> <span class="hl-attr">src</span><span class="hl-punct">=</span><span class="hl-string">"https://cdn.no-js.dev/"</span><span class="hl-tag">&gt;&lt;/script&gt;</span></pre>
    </div>
  </div>
</section>

<!-- ═══ Section 2: Code Compare — #FFFFFF bg ═══ -->
<section class="landing-code-compare">
  <h2 class="landing-code-compare-title" t="landing.codeCompare.title" t-html></h2>
  <p class="landing-code-compare-sub" t="landing.codeCompare.subtitle"></p>
  <div class="landing-panels">
    <div class="landing-panel">
      <div class="landing-panel-topbar">
        <span class="landing-panel-label landing-panel-label--react" t="landing.codeCompare.reactLabel"></span>
        <span class="landing-panel-meta" t="landing.codeCompare.reactMeta"></span>
      </div>
      <pre class="landing-panel-code"><span class="landing-ln"> 1</span><span class="hl-kw">import</span> { useState, useEffect } <span class="hl-kw">from</span> <span class="hl-str">'react'</span>;
<span class="landing-ln"> 2</span>
<span class="landing-ln"> 3</span><span class="hl-kw">const</span> <span class="hl-fn">Search</span> = () =&gt; {
<span class="landing-ln"> 4</span>  <span class="hl-kw">const</span> [query, setQuery] = <span class="hl-fn">useState</span>(<span class="hl-str">''</span>);
<span class="landing-ln"> 5</span>  <span class="hl-kw">const</span> [results, setResults] = <span class="hl-fn">useState</span>([]);
<span class="landing-ln"> 6</span>
<span class="landing-ln"> 7</span>  <span class="hl-fn">useEffect</span>(() =&gt; {
<span class="landing-ln"> 8</span>    <span class="hl-kw">if</span> (!query) <span class="hl-kw">return</span>;
<span class="landing-ln"> 9</span>    <span class="hl-fn">fetch</span>(<span class="hl-str">`/api/search?q=</span><span class="hl-op">${</span>query<span class="hl-op">}</span><span class="hl-str">`</span>)
<span class="landing-ln">10</span>      .then(r =&gt; r.json())
<span class="landing-ln">11</span>      .then(setResults);
<span class="landing-ln">12</span>  }, [query]);
<span class="landing-ln">13</span>
<span class="landing-ln">14</span>  <span class="hl-kw">return</span> (
<span class="landing-ln">15</span>    <span class="hl-tag">&lt;div&gt;</span>
<span class="landing-ln">16</span>      <span class="hl-tag">&lt;input</span>
<span class="landing-ln">17</span>        <span class="hl-attr">value</span>=<span class="hl-str">{query}</span>
<span class="landing-ln">18</span>        <span class="hl-attr">onChange</span>=<span class="hl-str">{e =&gt; setQuery(e.target.value)}</span>
<span class="landing-ln">19</span>        <span class="hl-attr">list</span>=<span class="hl-str">"suggestions"</span>
<span class="landing-ln">20</span>      <span class="hl-tag">/&gt;</span>
<span class="landing-ln">21</span>      <span class="hl-tag">&lt;datalist</span> <span class="hl-attr">id</span>=<span class="hl-str">"suggestions"</span><span class="hl-tag">&gt;</span>
<span class="landing-ln">22</span>        {results.map(r =&gt; (
<span class="landing-ln">23</span>          <span class="hl-tag">&lt;option</span> <span class="hl-attr">key</span>=<span class="hl-str">{r.id}</span> <span class="hl-attr">value</span>=<span class="hl-str">{r.name}</span> <span class="hl-tag">/&gt;</span>
<span class="landing-ln">24</span>        ))}
<span class="landing-ln">25</span>      <span class="hl-tag">&lt;/datalist&gt;</span>
<span class="landing-ln">26</span>    <span class="hl-tag">&lt;/div&gt;</span>
<span class="landing-ln">27</span>  );
<span class="landing-ln">28</span>};</pre>
    </div>
    <div class="landing-panel">
      <div class="landing-panel-topbar">
        <span class="landing-panel-label landing-panel-label--nojs" t="landing.codeCompare.nojsLabel"></span>
        <span class="landing-panel-meta" t="landing.codeCompare.nojsMeta"></span>
      </div>
      <pre class="landing-panel-code landing-panel-code--nojs"><span class="landing-ln">1</span><span class="hl-tag">&lt;div</span> <span class="hl-attr">state</span>=<span class="hl-str">"{ query: '' }"</span> <span class="hl-attr">get</span>=<span class="hl-str">"/api/search?q={{ query }}"</span> <span class="hl-attr">as</span>=<span class="hl-str">"results"</span><span class="hl-tag">&gt;</span>
<span class="landing-ln">2</span>  <span class="hl-tag">&lt;input</span> <span class="hl-attr">model</span>=<span class="hl-str">"query"</span> <span class="hl-attr">list</span>=<span class="hl-str">"suggestions"</span> <span class="hl-tag">/&gt;</span>
<span class="landing-ln">3</span>  <span class="hl-tag">&lt;datalist</span> <span class="hl-attr">id</span>=<span class="hl-str">"suggestions"</span><span class="hl-tag">&gt;</span>
<span class="landing-ln">4</span>    <span class="hl-tag">&lt;option</span> <span class="hl-attr">each</span>=<span class="hl-str">"r in results"</span> <span class="hl-attr">bind-value</span>=<span class="hl-str">"r.name"</span> <span class="hl-tag">/&gt;</span>
<span class="landing-ln">5</span>  <span class="hl-tag">&lt;/datalist&gt;</span>
<span class="landing-ln">6</span><span class="hl-tag">&lt;/div&gt;</span></pre>
      <span class="landing-panel-note" t="landing.codeCompare.nojsNote"></span>
    </div>
  </div>
</section>

<!-- ═══ Section 3: Features Grid — #F8FAFC bg ═══ -->
<section class="landing-features">
  <span class="landing-kicker" t="landing.featuresGrid.kicker"></span>
  <h2 class="landing-features-title" t="landing.featuresGrid.title"></h2>
  <p class="landing-features-sub" t="landing.featuresGrid.subtitle"></p>
  <div class="landing-features-grid">
    <div class="landing-feature-card">
      <h3 class="landing-feature-title" t="landing.featuresGrid.f1Title"></h3>
      <p class="landing-feature-desc" t="landing.featuresGrid.f1Desc"></p>
    </div>
    <div class="landing-feature-card">
      <h3 class="landing-feature-title" t="landing.featuresGrid.f2Title"></h3>
      <p class="landing-feature-desc" t="landing.featuresGrid.f2Desc"></p>
    </div>
    <div class="landing-feature-card">
      <h3 class="landing-feature-title" t="landing.featuresGrid.f3Title"></h3>
      <p class="landing-feature-desc" t="landing.featuresGrid.f3Desc"></p>
    </div>
    <div class="landing-feature-card">
      <h3 class="landing-feature-title" t="landing.featuresGrid.f4Title"></h3>
      <p class="landing-feature-desc" t="landing.featuresGrid.f4Desc"></p>
    </div>
    <div class="landing-feature-card">
      <h3 class="landing-feature-title" t="landing.featuresGrid.f5Title"></h3>
      <p class="landing-feature-desc" t="landing.featuresGrid.f5Desc"></p>
      <span style="font-size: 12px; color: #92400E; background: #FEF3C7; padding: 3px 8px; border-radius: 4px; align-self: flex-start;">Now in <a href="/docs/plugins" style="color: #92400E; font-weight: 600;">NoJS Elements</a></span>
    </div>
    <div class="landing-feature-card">
      <h3 class="landing-feature-title" t="landing.featuresGrid.f6Title"></h3>
      <p class="landing-feature-desc" t="landing.featuresGrid.f6Desc"></p>
    </div>
  </div>
</section>

<!-- ═══ Section 4: Bundle Stats — #FFFFFF bg ═══ -->
<section class="landing-bundle">
  <span class="landing-bundle-badge" t="landing.bundle.badge"></span>
  <h2 class="landing-bundle-h1" t="landing.bundle.h1"></h2>
  <h2 class="landing-bundle-h2" t="landing.bundle.h2"></h2>
  <p class="landing-bundle-sub" t="landing.bundle.subtitle"></p>
  <div class="landing-bundle-btns">
    <a route="/docs" class="btn btn-primary" t="landing.bundle.getStarted"></a>
    <a route="/docs" class="btn btn-secondary" t="landing.bundle.seeFeatures"></a>
  </div>
</section>

<!-- ═══ Section 5: Manifesto — #0F172A bg ═══ -->
<section class="landing-manifesto">
  <span class="landing-manifesto-kicker" t="landing.manifesto.kicker"></span>
  <h1 class="landing-manifesto-h1" t="landing.manifesto.h1"></h1>
  <h2 class="landing-manifesto-h2" t="landing.manifesto.h2"></h2>
  <div class="landing-divider"></div>
</section>

<!-- ═══ Section 6: Problem Editorial — #0F172A bg ═══ -->
<section class="landing-problem">
  <span class="landing-problem-kicker" t="landing.problem.kicker"></span>
  <div class="landing-columns">
    <div class="landing-column">
      <p t="landing.problem.col1p1"></p>
      <p t="landing.problem.col1p2"></p>
    </div>
    <div class="landing-column">
      <p t="landing.problem.col2p1"></p>
      <p t="landing.problem.col2p2"></p>
    </div>
    <div class="landing-column">
      <p t="landing.problem.col3p1"></p>
      <p t="landing.problem.col3p2"></p>
    </div>
  </div>
</section>

<!-- ═══ Section 7: Principles — #0A1020 bg ═══ -->
<section class="landing-principles">
  <span class="landing-principles-kicker" t="landing.principles.kicker"></span>
  <div class="landing-principles-grid">
    <div class="landing-principle-card">
      <span class="landing-principle-num">01</span>
      <h3 class="landing-principle-title" t="landing.principles.p1Title"></h3>
      <p class="landing-principle-desc" t="landing.principles.p1Desc"></p>
    </div>
    <div class="landing-principle-card">
      <span class="landing-principle-num">02</span>
      <h3 class="landing-principle-title" t="landing.principles.p2Title"></h3>
      <p class="landing-principle-desc" t="landing.principles.p2Desc"></p>
    </div>
    <div class="landing-principle-card">
      <span class="landing-principle-num">03</span>
      <h3 class="landing-principle-title" t="landing.principles.p3Title"></h3>
      <p class="landing-principle-desc" t="landing.principles.p3Desc"></p>
    </div>
    <div class="landing-principle-card">
      <span class="landing-principle-num">04</span>
      <h3 class="landing-principle-title" t="landing.principles.p4Title"></h3>
      <p class="landing-principle-desc" t="landing.principles.p4Desc"></p>
    </div>
  </div>
</section>

<!-- ═══ Section 8: Community — #F8FAFC bg ═══ -->
<section class="landing-community">
  <span class="landing-kicker" t="landing.community.kicker"></span>
  <h2 class="landing-community-title" t="landing.community.title"></h2>
  <p class="landing-community-sub" t="landing.community.subtitle"></p>
  <div class="landing-community-btns">
    <a href="https://github.com/ErickXavier/no-js" target="_blank" rel="noopener noreferrer" class="btn-github">
      <svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z"/></svg>
      <span t="landing.community.github"></span>
    </a>
    <a href="https://discord.gg/CaSbGYg3xY" target="_blank" rel="noopener noreferrer" class="btn-discord">
      <svg viewBox="0 0 24 24" fill="currentColor"><path d="M20.317 4.37a19.791 19.791 0 00-4.885-1.515.074.074 0 00-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 00-5.487 0 12.64 12.64 0 00-.617-1.25.077.077 0 00-.079-.037A19.736 19.736 0 003.677 4.37a.07.07 0 00-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 00.031.057 19.9 19.9 0 005.993 3.03.078.078 0 00.084-.028c.462-.63.874-1.295 1.226-1.994a.076.076 0 00-.041-.106 13.107 13.107 0 01-1.872-.892.077.077 0 01-.008-.128 10.2 10.2 0 00.372-.292.074.074 0 01.077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 01.078.01c.12.098.246.198.373.292a.077.077 0 01-.006.127 12.299 12.299 0 01-1.873.892.077.077 0 00-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 00.084.028 19.839 19.839 0 006.002-3.03.077.077 0 00.032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 00-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z"/></svg>
      <span t="landing.community.discord"></span>
    </a>
  </div>
</section>

<!-- ═══ Section 9: Quote — #F8FAFC bg ═══ -->
<section class="landing-quote">
  <blockquote class="landing-quote-text" t="landing.quote" t-html></blockquote>
</section>
</div>
