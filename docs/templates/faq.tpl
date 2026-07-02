<div>
  <header class="subpage-hero" use="subpage-hero" state="{ titleKey: 'faq.hero.title', subtitleKey: 'faq.hero.subtitle' }"></header>

  <div class="docs-layout" state="{ sidebarOpen: false }">
    <div class="sidebar-mobile-wrapper">
      <button class="sidebar-toggle" on:click="sidebarOpen = !sidebarOpen" bind-aria-expanded="sidebarOpen" aria-label="Toggle page menu">
        <svg class="sidebar-toggle-chevron" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="6 9 12 15 18 9"></polyline></svg>
        Menu
      </button>
      <aside class="docs-sidebar" class-open="sidebarOpen">
        <div class="sidebar-group">
          <h4 class="sidebar-heading" t="faq.sidebar.questions"></h4>
          <ul class="sidebar-list">
            <li><a href="#getting-started" class="sidebar-link active" spy-offset="64" on:click="sidebarOpen = false" t="faq.sidebar.gettingStarted"></a></li>
            <li><a href="#core-concepts" class="sidebar-link" spy-offset="64" on:click="sidebarOpen = false" t="faq.sidebar.coreConcepts"></a></li>
            <li><a href="#comparisons" class="sidebar-link" spy-offset="64" on:click="sidebarOpen = false" t="faq.sidebar.comparisons"></a></li>
            <li><a href="#security" class="sidebar-link" spy-offset="64" on:click="sidebarOpen = false" t="faq.sidebar.security"></a></li>
          </ul>
        </div>
        <div class="sidebar-group">
          <h4 class="sidebar-heading" t="faq.sidebar.resources"></h4>
          <ul class="sidebar-list">
            <li><a route="/docs" class="sidebar-link" on:click="sidebarOpen = false" t="faq.sidebar.documentation"></a></li>
            <li><a route="/examples" class="sidebar-link" on:click="sidebarOpen = false" t="faq.sidebar.examples"></a></li>
            <li><a href="https://discord.gg/CaSbGYg3xY" target="_blank" class="sidebar-link" on:click="sidebarOpen = false" t="faq.sidebar.discord"></a></li>
          </ul>
        </div>
      </aside>
    </div>

    <article class="docs-content">

      <!-- ═══ Getting Started ═══ -->
      <section id="getting-started" class="faq-section">
        <h2 class="docs-heading" style="margin-top: 0;" t="faq.gettingStarted.title"></h2>
        <div class="faq-list" accordion>
          <details class="faq-item">
            <summary class="faq-summary">
              <span t="faq.gettingStarted.q1.question"></span>
              <svg class="faq-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"></polyline></svg>
            </summary>
            <div class="faq-content" t="faq.gettingStarted.q1.answer" t-html></div>
          </details>
          <details class="faq-item">
            <summary class="faq-summary">
              <span t="faq.gettingStarted.q2.question"></span>
              <svg class="faq-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"></polyline></svg>
            </summary>
            <div class="faq-content" t="faq.gettingStarted.q2.answer" t-html></div>
          </details>
          <details class="faq-item">
            <summary class="faq-summary">
              <span t="faq.gettingStarted.q3.question"></span>
              <svg class="faq-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"></polyline></svg>
            </summary>
            <div class="faq-content" t="faq.gettingStarted.q3.answer" t-html></div>
          </details>
          <details class="faq-item">
            <summary class="faq-summary">
              <span t="faq.gettingStarted.q4.question"></span>
              <svg class="faq-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"></polyline></svg>
            </summary>
            <div class="faq-content" t="faq.gettingStarted.q4.answer" t-html></div>
          </details>
        </div>
      </section>

      <div class="section-divider" use="section-divider"></div>

      <!-- ═══ Core Concepts ═══ -->
      <section id="core-concepts" class="faq-section">
        <h2 class="docs-heading" t="faq.coreConcepts.title"></h2>
        <div class="faq-list" accordion>
          <details class="faq-item">
            <summary class="faq-summary">
              <span t="faq.coreConcepts.q5.question"></span>
              <svg class="faq-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"></polyline></svg>
            </summary>
            <div class="faq-content" t="faq.coreConcepts.q5.answer" t-html></div>
          </details>
          <details class="faq-item">
            <summary class="faq-summary">
              <span t="faq.coreConcepts.q6.question"></span>
              <svg class="faq-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"></polyline></svg>
            </summary>
            <div class="faq-content" t="faq.coreConcepts.q6.answer" t-html></div>
          </details>
          <details class="faq-item">
            <summary class="faq-summary">
              <span t="faq.coreConcepts.q7.question"></span>
              <svg class="faq-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"></polyline></svg>
            </summary>
            <div class="faq-content" t="faq.coreConcepts.q7.answer" t-html></div>
          </details>
          <details class="faq-item">
            <summary class="faq-summary">
              <span t="faq.coreConcepts.q8.question"></span>
              <svg class="faq-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"></polyline></svg>
            </summary>
            <div class="faq-content" t="faq.coreConcepts.q8.answer" t-html></div>
          </details>
        </div>
      </section>

      <div class="section-divider" use="section-divider"></div>

      <!-- ═══ Comparisons ═══ -->
      <section id="comparisons" class="faq-section">
        <h2 class="docs-heading" t="faq.comparisons.title"></h2>
        <div class="faq-list" accordion>
          <details class="faq-item">
            <summary class="faq-summary">
              <span t="faq.comparisons.q9.question"></span>
              <svg class="faq-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"></polyline></svg>
            </summary>
            <div class="faq-content" t="faq.comparisons.q9.answer" t-html></div>
          </details>
          <details class="faq-item">
            <summary class="faq-summary">
              <span t="faq.comparisons.q10.question"></span>
              <svg class="faq-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"></polyline></svg>
            </summary>
            <div class="faq-content" t="faq.comparisons.q10.answer" t-html></div>
          </details>
          <details class="faq-item">
            <summary class="faq-summary">
              <span t="faq.comparisons.q11.question"></span>
              <svg class="faq-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"></polyline></svg>
            </summary>
            <div class="faq-content" t="faq.comparisons.q11.answer" t-html></div>
          </details>
          <details class="faq-item">
            <summary class="faq-summary">
              <span t="faq.comparisons.q12.question"></span>
              <svg class="faq-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"></polyline></svg>
            </summary>
            <div class="faq-content" t="faq.comparisons.q12.answer" t-html></div>
          </details>
        </div>
      </section>

      <div class="section-divider" use="section-divider"></div>

      <!-- ═══ Security & Production ═══ -->
      <section id="security" class="faq-section">
        <h2 class="docs-heading" t="faq.security.title"></h2>
        <div class="faq-list" accordion>
          <details class="faq-item">
            <summary class="faq-summary">
              <span t="faq.security.q13.question"></span>
              <svg class="faq-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"></polyline></svg>
            </summary>
            <div class="faq-content" t="faq.security.q13.answer" t-html></div>
          </details>
          <details class="faq-item">
            <summary class="faq-summary">
              <span t="faq.security.q14.question"></span>
              <svg class="faq-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"></polyline></svg>
            </summary>
            <div class="faq-content" t="faq.security.q14.answer" t-html></div>
          </details>
          <details class="faq-item">
            <summary class="faq-summary">
              <span t="faq.security.q15.question"></span>
              <svg class="faq-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"></polyline></svg>
            </summary>
            <div class="faq-content" t="faq.security.q15.answer" t-html></div>
          </details>
          <details class="faq-item">
            <summary class="faq-summary">
              <span t="faq.security.q16.question"></span>
              <svg class="faq-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"></polyline></svg>
            </summary>
            <div class="faq-content" t="faq.security.q16.answer" t-html></div>
          </details>
        </div>
      </section>

    </article>
  </div>
</div>
