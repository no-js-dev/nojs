<aside class="docs-sidebar" class-open="sidebarOpen">
  <nav state="{ sections: [
         { heading: $i18n.shell.sidebar.gettingStarted, links: [
           { route: '/docs/getting-started', label: $i18n.shell.sidebar.introduction }
         ]},
         { heading: $i18n.shell.sidebar.apiReference, links: [
           { route: '/docs/cheatsheet', label: $i18n.shell.sidebar.directives },
           { route: '/docs/actions-refs', label: $i18n.shell.sidebar.actionsRefs },
           { route: '/docs/custom-directives', label: $i18n.shell.sidebar.customDirectives },
           { route: '/docs/plugins', label: $i18n.shell.sidebar.plugins },
           { route: '/docs/error-handling', label: $i18n.shell.sidebar.errorHandling },
           { route: '/docs/configuration', label: $i18n.shell.sidebar.configuration },
           { route: '/docs/directive-compatibility', label: $i18n.shell.sidebar.directiveCompatibility }
         ]},
         { heading: $i18n.shell.sidebar.guides, links: [
           { route: '/docs/state-management', label: $i18n.shell.sidebar.stateManagement },
           { route: '/docs/events', label: $i18n.shell.sidebar.eventHandling },
           { route: '/docs/data-binding', label: $i18n.shell.sidebar.dataBinding },
           { route: '/docs/conditionals', label: $i18n.shell.sidebar.conditionals },
           { route: '/docs/loops', label: $i18n.shell.sidebar.loops },
           { route: '/docs/templates', label: $i18n.shell.sidebar.templates },
           { route: '/docs/data-fetching', label: $i18n.shell.sidebar.fetchApi },
           { route: '/docs/pagination', label: $i18n.shell.sidebar.pagination },
           { route: '/docs/routing', label: $i18n.shell.sidebar.routing },
           { route: '/docs/head-management', label: $i18n.shell.sidebar.headManagement },
           { route: '/docs/forms-validation', label: $i18n.shell.sidebar.forms },
           { route: '/docs/styling', label: $i18n.shell.sidebar.styling },
           { route: '/docs/drag-and-drop', label: $i18n.shell.sidebar.dragAndDrop },
           { route: '/docs/animations', label: $i18n.shell.sidebar.animations },
           { route: '/docs/filters', label: $i18n.shell.sidebar.filters },
           { route: '/docs/i18n', label: $i18n.shell.sidebar.i18n }
         ]}
       ]}" >
    <div class="sidebar-group" foreach="section in sections" key="section.heading">
      <h4 class="sidebar-heading" bind="section.heading"></h4>
      <ul class="sidebar-list">
        <li foreach="link in section.links" key="link.route">
          <a bind-route="link.route" class="sidebar-link" route-active="active"
             on:click="sidebarOpen = false" bind="link.label"></a>
        </li>
      </ul>
    </div>
  </nav>
</aside>
