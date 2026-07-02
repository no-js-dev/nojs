<div>
  <header class="subpage-hero" use="subpage-hero" state="{ titleKey: 'docs.gettingStarted.hero.title', subtitleKey: 'docs.gettingStarted.hero.subtitle' }"></header>

  <div class="docs-layout" state="{ sidebarOpen: false }">
    <div class="sidebar-mobile-wrapper">
      <button class="sidebar-toggle" on:click="sidebarOpen = !sidebarOpen" bind-aria-expanded="sidebarOpen" aria-label="Toggle page menu">
        <svg class="sidebar-toggle-chevron" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="6 9 12 15 18 9"></polyline></svg>
        Menu
      </button>
      <template src="./docs/sidebar.tpl"></template>
    </div>

    <article class="docs-content" route-view="docs" src="/templates/docs/" route-index="getting-started" transition="fade" on:mounted="window.buildToc && window.buildToc()" on:updated="window.buildToc && window.buildToc()">
    </article>

    <aside class="toc-sidebar" id="toc-sidebar">
      <div class="toc-sticky">
        <h4 class="toc-heading">On this page</h4>
        <nav class="toc-nav" id="toc-nav"></nav>
        <a href="#" class="toc-back-to-top" id="toc-back-top">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="18 15 12 9 6 15"></polyline></svg>
          Back to top
        </a>
      </div>
    </aside>
  </div>
</div>
