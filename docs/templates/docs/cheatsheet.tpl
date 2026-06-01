<!-- Cheatsheet — from cheatsheet.md -->

<section class="hero-section">
  <span class="badge" t="docs.cheatsheet.hero.badge"></span>
  <h1 class="hero-title" t="docs.cheatsheet.hero.title"></h1>
  <p class="hero-subtitle" t="docs.cheatsheet.hero.subtitle"></p>
</section>

<div class="doc-content">

  <!-- Data -->
  <div class="doc-section">
    <h2 class="doc-title" id="cheatsheet-data" t="docs.cheatsheet.data.title"></h2>
    <table class="doc-table">
      <thead><tr><th t="docs.cheatsheet.data.col1"></th><th t="docs.cheatsheet.data.col2"></th><th t="docs.cheatsheet.data.col3"></th></tr></thead>
      <tbody>
        <tr><td><code>base</code></td><td><code>base="https://api.com"</code></td><td t="docs.cheatsheet.data.base"></td></tr>
        <tr><td><code>get</code></td><td><code>get="/users"</code></td><td t="docs.cheatsheet.data.get"></td></tr>
        <tr><td><code>post</code></td><td><code>post="/login"</code></td><td t="docs.cheatsheet.data.post"></td></tr>
        <tr><td><code>put</code></td><td><code>put="/users/1"</code></td><td t="docs.cheatsheet.data.put"></td></tr>
        <tr><td><code>patch</code></td><td><code>patch="/users/1"</code></td><td t="docs.cheatsheet.data.patch"></td></tr>
        <tr><td><code>delete</code></td><td><code>delete="/users/1"</code></td><td t="docs.cheatsheet.data.delete"></td></tr>
        <tr><td><code>as</code></td><td><code>as="users"</code></td><td t="docs.cheatsheet.data.as"></td></tr>
        <tr><td><code>body</code></td><td><code>body='{"key":"val"}'</code></td><td t="docs.cheatsheet.data.body"></td></tr>
        <tr><td><code>headers</code></td><td><code>headers='{"Auth":"Bearer x"}'</code></td><td t="docs.cheatsheet.data.headers"></td></tr>
        <tr><td><code>params</code></td><td><code>params="{ page: 1 }"</code></td><td t="docs.cheatsheet.data.params"></td></tr>
        <tr><td><code>cached</code></td><td><code>cached</code> or <code>cached="local"</code></td><td t="docs.cheatsheet.data.cached"></td></tr>
        <tr><td><code>into</code></td><td><code>into="currentUser"</code></td><td t="docs.cheatsheet.data.into"></td></tr>
        <tr><td><code>debounce</code></td><td><code>debounce="300"</code></td><td t="docs.cheatsheet.data.debounce"></td></tr>
        <tr><td><code>retry</code></td><td><code>retry="3"</code></td><td t="docs.cheatsheet.data.retry"></td></tr>
        <tr><td><code>refresh</code></td><td><code>refresh="5000"</code></td><td t="docs.cheatsheet.data.refresh"></td></tr>
        <tr><td><code>success</code></td><td><code>success="#ok-tpl"</code></td><td t="docs.cheatsheet.data.success"></td></tr>
        <tr><td><code>then</code></td><td><code>then="items = $data"</code></td><td t="docs.cheatsheet.data.then"></td></tr>
        <tr><td><code>redirect</code></td><td><code>redirect="/home"</code></td><td t="docs.cheatsheet.data.redirect"></td></tr>
        <tr><td><code>confirm</code></td><td><code>confirm="Are you sure?"</code></td><td t="docs.cheatsheet.data.confirm"></td></tr>
        <tr><td><code>skeleton</code></td><td><code>skeleton="cardSkel"</code></td><td t="docs.cheatsheet.data.skeleton"></td></tr>
        <tr><td><code>retry-delay</code></td><td><code>retry-delay="1000"</code></td><td t="docs.cheatsheet.data.retryDelay"></td></tr>
      </tbody>
    </table>
  </div>

  <!-- State -->
  <div class="doc-section">
    <h2 class="doc-title" id="cheatsheet-state" t="docs.cheatsheet.state.title"></h2>
    <table class="doc-table">
      <thead><tr><th t="docs.cheatsheet.state.col1"></th><th t="docs.cheatsheet.state.col2"></th><th t="docs.cheatsheet.state.col3"></th></tr></thead>
      <tbody>
        <tr><td><code>state</code></td><td><code>state="{ count: 0 }"</code></td><td t="docs.cheatsheet.state.state"></td></tr>
        <tr><td><code>store</code></td><td><code>store="auth"</code></td><td t="docs.cheatsheet.state.store"></td></tr>
        <tr><td><code>computed</code></td><td><code>computed="total" expr="a+b"</code></td><td t="docs.cheatsheet.state.computed"></td></tr>
        <tr><td><code>watch</code></td><td><code>watch="search"</code></td><td t="docs.cheatsheet.state.watch"></td></tr>
        <tr><td><code>persist</code></td><td><code>persist="localStorage"</code></td><td t="docs.cheatsheet.state.persist"></td></tr>
        <tr><td><code>persist-key</code></td><td><code>persist-key="settings"</code></td><td t="docs.cheatsheet.state.persistKey"></td></tr>
        <tr><td><code>persist-fields</code></td><td><code>persist-fields="theme,lang"</code></td><td t="docs.cheatsheet.state.persistFields"></td></tr>
        <tr><td><code>persist-schema</code></td><td><code>persist-schema</code></td><td t="docs.cheatsheet.state.persistSchema"></td></tr>
        <tr><td><code>model</code></td><td><code>model="name"</code></td><td t="docs.cheatsheet.state.model"></td></tr>
      </tbody>
    </table>
  </div>

  <!-- Rendering -->
  <div class="doc-section">
    <h2 class="doc-title" id="cheatsheet-rendering" t="docs.cheatsheet.rendering.title"></h2>
    <table class="doc-table">
      <thead><tr><th t="docs.cheatsheet.rendering.col1"></th><th t="docs.cheatsheet.rendering.col2"></th><th t="docs.cheatsheet.rendering.col3"></th></tr></thead>
      <tbody>
        <tr><td><code>bind</code></td><td><code>bind="user.name"</code></td><td t="docs.cheatsheet.rendering.bind"></td></tr>
        <tr><td><code>bind-html</code></td><td><code>bind-html="content"</code></td><td t="docs.cheatsheet.rendering.bindHtml"></td></tr>
        <tr><td><code>bind-*</code></td><td><code>bind-src="url"</code></td><td t="docs.cheatsheet.rendering.bindStar"></td></tr>
        <tr><td><code>if</code></td><td><code>if="condition"</code></td><td t="docs.cheatsheet.rendering.if"></td></tr>
        <tr><td><code>else-if</code></td><td><code>else-if="cond"</code></td><td t="docs.cheatsheet.rendering.elseIf"></td></tr>
        <tr><td><code>then</code></td><td><code>then="templateId"</code></td><td t="docs.cheatsheet.rendering.then"></td></tr>
        <tr><td><code>else</code></td><td><code>else="templateId"</code></td><td t="docs.cheatsheet.rendering.else"></td></tr>
        <tr><td><code>show</code></td><td><code>show="condition"</code></td><td t="docs.cheatsheet.rendering.show"></td></tr>
        <tr><td><code>hide</code></td><td><code>hide="condition"</code></td><td t="docs.cheatsheet.rendering.hide"></td></tr>
        <tr><td><code>switch</code></td><td><code>switch="value"</code></td><td t="docs.cheatsheet.rendering.switch"></td></tr>
        <tr><td><code>case</code></td><td><code>case="'admin'"</code></td><td t="docs.cheatsheet.rendering.case"></td></tr>
        <tr><td><code>default</code></td><td><code>default</code></td><td t="docs.cheatsheet.rendering.default"></td></tr>
      </tbody>
    </table>
  </div>

  <!-- Loops -->
  <div class="doc-section">
    <h2 class="doc-title" id="cheatsheet-loops" t="docs.cheatsheet.loops.title"></h2>
    <table class="doc-table">
      <thead><tr><th t="docs.cheatsheet.loops.col1"></th><th t="docs.cheatsheet.loops.col2"></th><th t="docs.cheatsheet.loops.col3"></th></tr></thead>
      <tbody>
        <tr><td><code>foreach</code></td><td><code>foreach="item in items"</code></td><td t="docs.cheatsheet.loops.foreach"></td></tr>
        <tr><td><code>each</code></td><td><code>each="item in items"</code></td><td t="docs.cheatsheet.loops.each"></td></tr>
        <tr><td><code>for</code></td><td><code>for="item in items"</code></td><td t="docs.cheatsheet.loops.for"></td></tr>
        <tr class="deprecated-row"><td><code>from</code></td><td><code>from="items"</code></td><td t="docs.cheatsheet.loops.from"></td></tr>
        <tr><td><code>template</code></td><td><code>template="tplId"</code></td><td t="docs.cheatsheet.loops.template"></td></tr>
        <tr><td><code>index</code></td><td><code>index="i"</code></td><td t="docs.cheatsheet.loops.index"></td></tr>
        <tr><td><code>key</code></td><td><code>key="item.id"</code></td><td t="docs.cheatsheet.loops.key"></td></tr>
        <tr><td><code>filter</code></td><td><code>filter="item.active"</code></td><td t="docs.cheatsheet.loops.filter"></td></tr>
        <tr><td><code>sort</code></td><td><code>sort="name"</code></td><td t="docs.cheatsheet.loops.sort"></td></tr>
        <tr><td><code>limit</code></td><td><code>limit="10"</code></td><td t="docs.cheatsheet.loops.limit"></td></tr>
        <tr><td><code>offset</code></td><td><code>offset="5"</code></td><td t="docs.cheatsheet.loops.offset"></td></tr>
      </tbody>
    </table>
  </div>

  <!-- Events -->
  <div class="doc-section">
    <h2 class="doc-title" id="cheatsheet-events" t="docs.cheatsheet.events.title"></h2>
    <table class="doc-table">
      <thead><tr><th t="docs.cheatsheet.events.col1"></th><th t="docs.cheatsheet.events.col2"></th><th t="docs.cheatsheet.events.col3"></th></tr></thead>
      <tbody>
        <tr><td><code>on:click</code></td><td><code>on:click="count++"</code></td><td t="docs.cheatsheet.events.onClick"></td></tr>
        <tr><td><code>on:submit</code></td><td><code>on:submit.prevent="..."</code></td><td t="docs.cheatsheet.events.onSubmit"></td></tr>
        <tr><td><code>on:input</code></td><td><code>on:input="..."</code></td><td t="docs.cheatsheet.events.onInput"></td></tr>
        <tr><td><code>on:keydown.*</code></td><td><code>on:keydown.enter="..."</code></td><td t="docs.cheatsheet.events.onKeydown"></td></tr>
        <tr><td><code>on:init</code></td><td><code>on:init="setup()"</code></td><td t="docs.cheatsheet.events.onInit"></td></tr>
        <tr><td><code>on:mounted</code></td><td><code>on:mounted="init()"</code></td><td t="docs.cheatsheet.events.onMounted"></td></tr>
        <tr><td><code>on:unmounted</code></td><td><code>on:unmounted="cleanup()"</code></td><td t="docs.cheatsheet.events.onUnmounted"></td></tr>
        <tr><td><code>.throttle</code></td><td><code>on:scroll.throttle.300="..."</code></td><td t="docs.cheatsheet.events.throttle"></td></tr>
        <tr><td><code>.self</code></td><td><code>on:click.self="..."</code></td><td t="docs.cheatsheet.events.self"></td></tr>
        <tr><td><code>backspace</code></td><td><code>on:keydown.backspace="..."</code></td><td t="docs.cheatsheet.events.backspace"></td></tr>
        <tr><td><code>on:updated</code></td><td><code>on:updated="refresh()"</code></td><td t="docs.cheatsheet.events.onUpdated"></td></tr>
        <tr><td><code>on:error</code></td><td><code>on:error="log($event)"</code></td><td t="docs.cheatsheet.events.onError"></td></tr>
      </tbody>
    </table>
  </div>

  <!-- Styling -->
  <div class="doc-section">
    <h2 class="doc-title" id="cheatsheet-styling" t="docs.cheatsheet.styling.title"></h2>
    <table class="doc-table">
      <thead><tr><th t="docs.cheatsheet.styling.col1"></th><th t="docs.cheatsheet.styling.col2"></th><th t="docs.cheatsheet.styling.col3"></th></tr></thead>
      <tbody>
        <tr><td><code>class-*</code></td><td><code>class-active="isOn"</code></td><td t="docs.cheatsheet.styling.classStar"></td></tr>
        <tr><td><code>class-map</code></td><td><code>class-map="{ a: x }"</code></td><td t="docs.cheatsheet.styling.classMap"></td></tr>
        <tr><td><code>style-*</code></td><td><code>style-color="c"</code></td><td t="docs.cheatsheet.styling.styleStar"></td></tr>
        <tr><td><code>style-map</code></td><td><code>style-map="{ ... }"</code></td><td t="docs.cheatsheet.styling.styleMap"></td></tr>
      </tbody>
    </table>
  </div>

  <!-- Forms -->
  <div class="doc-section">
    <h2 class="doc-title" id="cheatsheet-forms" t="docs.cheatsheet.forms.title"></h2>
    <p style="background: #FEF3C7; border: 1px solid #F59E0B; border-radius: 6px; padding: 10px 14px; font-size: 13px; color: #78350F; margin-bottom: 16px;">
      <strong>&#x26A0;&#xFE0F; <code>validate</code> moved to <code>@erickxavier/nojs-elements</code></strong> as of v1.13.0. Core stubs emit deprecation warnings. <a href="#/docs/plugins" style="color: #92400E; font-weight: 600;">Migration Guide &rarr;</a>
    </p>
    <table class="doc-table">
      <thead><tr><th t="docs.cheatsheet.forms.col1"></th><th t="docs.cheatsheet.forms.col2"></th><th t="docs.cheatsheet.forms.col3"></th></tr></thead>
      <tbody>
        <tr><td><code>validate</code></td><td><code>validate</code> or <code>validate="email"</code></td><td t="docs.cheatsheet.forms.validate"></td></tr>
        <tr><td><code>error</code></td><td><code>error="#tpl"</code></td><td t="docs.cheatsheet.forms.error"></td></tr>
        <tr><td><code>success</code></td><td><code>success="#tpl"</code></td><td t="docs.cheatsheet.forms.success"></td></tr>
        <tr><td><code>loading</code></td><td><code>loading="#tpl"</code></td><td t="docs.cheatsheet.forms.loading"></td></tr>
        <tr><td><code>confirm</code></td><td><code>confirm="Sure?"</code></td><td t="docs.cheatsheet.forms.confirm"></td></tr>
        <tr><td><code>redirect</code></td><td><code>redirect="/home"</code></td><td t="docs.cheatsheet.forms.redirect"></td></tr>
      </tbody>
    </table>
  </div>

  <!-- Routing -->
  <div class="doc-section">
    <h2 class="doc-title" id="cheatsheet-routing" t="docs.cheatsheet.routing.title"></h2>
    <table class="doc-table">
      <thead><tr><th t="docs.cheatsheet.routing.col1"></th><th t="docs.cheatsheet.routing.col2"></th><th t="docs.cheatsheet.routing.col3"></th></tr></thead>
      <tbody>
        <tr><td><code>route</code></td><td><code>route="/path"</code></td><td t="docs.cheatsheet.routing.route"></td></tr>
        <tr><td><code>route-view</code></td><td><code>route-view</code></td><td t="docs.cheatsheet.routing.routeView"></td></tr>
        <tr><td><code>route-view="name"</code></td><td><code>&lt;aside route-view="sidebar"&gt;</code></td><td t="docs.cheatsheet.routing.routeViewNamed"></td></tr>
        <tr><td><code>route-view[src]</code></td><td><code>&lt;main route-view src="./pages/"&gt;</code></td><td t="docs.cheatsheet.routing.routeViewSrc" t-html></td></tr>
        <tr><td><code>route-index</code></td><td><code>route-index="overview"</code></td><td t="docs.cheatsheet.routing.routeIndex" t-html></td></tr>
        <tr><td><code>ext</code></td><td><code>ext=".html"</code></td><td t="docs.cheatsheet.routing.routeExt" t-html></td></tr>
        <tr><td><code>i18n-ns</code></td><td><code>i18n-ns</code></td><td t="docs.cheatsheet.routing.i18nNs"></td></tr>
        <tr><td><code>outlet</code></td><td><code>&lt;template route="/x" outlet="sidebar"&gt;</code></td><td t="docs.cheatsheet.routing.outlet"></td></tr>
        <tr><td><code>route-active</code></td><td><code>route-active="cls"</code></td><td t="docs.cheatsheet.routing.routeActive"></td></tr>
        <tr><td><code>guard</code></td><td><code>guard="expr"</code></td><td t="docs.cheatsheet.routing.guard"></td></tr>
        <tr><td><code>route-active-exact</code></td><td><code>route-active-exact="cls"</code></td><td t="docs.cheatsheet.routing.routeActiveExact"></td></tr>
        <tr><td><code>redirect</code></td><td><code>redirect="/login"</code></td><td t="docs.cheatsheet.routing.redirect"></td></tr>
        <tr><td><code>lazy="priority"</code></td><td><code>&lt;template src="..." lazy="priority"&gt;</code></td><td t="docs.cheatsheet.routing.lazyPriority"></td></tr>
        <tr><td><code>lazy="ondemand"</code></td><td><code>&lt;template route="..." src="..." lazy="ondemand"&gt;</code></td><td t="docs.cheatsheet.routing.lazyOnDemand"></td></tr>
        <tr><td><code>$router.forward()</code></td><td><code>$router.forward()</code></td><td t="docs.cheatsheet.routing.routerForward"></td></tr>
        <tr><td><code>$router.on(fn)</code></td><td><code>$router.on(r =&gt; ...)</code></td><td t="docs.cheatsheet.routing.routerOn"></td></tr>
        <tr><td><code>$router.current</code></td><td><code>$router.current.path</code></td><td t="docs.cheatsheet.routing.routerCurrent"></td></tr>
        <tr><td><code>transition</code> <small>(route-view)</small></td><td><code>&lt;main route-view transition="slide"&gt;</code></td><td t="docs.cheatsheet.routing.transitionVT"></td></tr>
        <tr><td><code>route="*"</code></td><td><code>&lt;template route="*"&gt;404&lt;/template&gt;</code></td><td t="docs.cheatsheet.routing.routeWildcard"></td></tr>
        <tr><td><code>$route.matched</code></td><td><code>&lt;span bind="$route.matched"&gt;</code></td><td t="docs.cheatsheet.routing.routeMatched" t-html></td></tr>
      </tbody>
    </table>
  </div>

  <!-- Animation -->
  <div class="doc-section">
    <h2 class="doc-title" id="cheatsheet-animation" t="docs.cheatsheet.animation.title"></h2>
    <table class="doc-table">
      <thead><tr><th t="docs.cheatsheet.animation.col1"></th><th t="docs.cheatsheet.animation.col2"></th><th t="docs.cheatsheet.animation.col3"></th></tr></thead>
      <tbody>
        <tr><td><code>animate</code></td><td><code>animate="fadeIn"</code></td><td t="docs.cheatsheet.animation.animate"></td></tr>
        <tr><td><code>animate-enter</code></td><td><code>animate-enter="slideIn"</code></td><td t="docs.cheatsheet.animation.animateEnter"></td></tr>
        <tr><td><code>animate-leave</code></td><td><code>animate-leave="slideOut"</code></td><td t="docs.cheatsheet.animation.animateLeave"></td></tr>
        <tr><td><code>animate-duration</code></td><td><code>animate-duration="300"</code></td><td t="docs.cheatsheet.animation.animateDuration"></td></tr>
        <tr><td><code>animate-stagger</code></td><td><code>animate-stagger="50"</code></td><td t="docs.cheatsheet.animation.animateStagger"></td></tr>
        <tr><td><code>transition</code></td><td><code>transition="fade"</code></td><td t="docs.cheatsheet.animation.transition"></td></tr>
        <tr><td><code>transition</code> <small>(route-view)</small></td><td><code>&lt;main route-view transition="slide"&gt;</code></td><td t="docs.cheatsheet.animation.transitionVT"></td></tr>
      </tbody>
    </table>
  </div>

  <!-- Drag and Drop -->
  <div class="doc-section">
    <h2 class="doc-title" id="cheatsheet-dnd" t="docs.cheatsheet.dnd.title"></h2>
    <p style="background: #FEF3C7; border: 1px solid #F59E0B; border-radius: 6px; padding: 10px 14px; font-size: 13px; color: #78350F; margin-bottom: 16px;">
      <strong>&#x26A0;&#xFE0F; Moved to <code>@erickxavier/nojs-elements</code></strong> as of v1.13.0. Core stubs emit deprecation warnings. <a href="#/docs/plugins" style="color: #92400E; font-weight: 600;">Migration Guide &rarr;</a>
    </p>
    <table class="doc-table">
      <thead><tr><th t="docs.cheatsheet.dnd.col1"></th><th t="docs.cheatsheet.dnd.col2"></th><th t="docs.cheatsheet.dnd.col3"></th></tr></thead>
      <tbody>
        <tr><td><code>drag</code></td><td><code>drag</code></td><td t="docs.cheatsheet.dnd.drag"></td></tr>
        <tr><td><code>drag-type</code></td><td><code>drag-type="task"</code></td><td t="docs.cheatsheet.dnd.dragType"></td></tr>
        <tr><td><code>drag-effect</code></td><td><code>drag-effect="move"</code></td><td t="docs.cheatsheet.dnd.dragEffect"></td></tr>
        <tr><td><code>drag-handle</code></td><td><code>drag-handle=".handle"</code></td><td t="docs.cheatsheet.dnd.dragHandle"></td></tr>
        <tr><td><code>drag-disabled</code></td><td><code>drag-disabled="locked"</code></td><td t="docs.cheatsheet.dnd.dragDisabled"></td></tr>
        <tr><td><code>drag-class</code></td><td><code>drag-class="dragging"</code></td><td t="docs.cheatsheet.dnd.dragClass"></td></tr>
        <tr><td><code>drag-group</code></td><td><code>drag-group="board"</code></td><td t="docs.cheatsheet.dnd.dragGroup"></td></tr>
        <tr><td><code>drop</code></td><td><code>drop</code></td><td t="docs.cheatsheet.dnd.drop"></td></tr>
        <tr><td><code>drop-accept</code></td><td><code>drop-accept="task"</code></td><td t="docs.cheatsheet.dnd.dropAccept"></td></tr>
        <tr><td><code>drop-effect</code></td><td><code>drop-effect="move"</code></td><td t="docs.cheatsheet.dnd.dropEffect"></td></tr>
        <tr><td><code>drop-class</code></td><td><code>drop-class="over"</code></td><td t="docs.cheatsheet.dnd.dropClass"></td></tr>
        <tr><td><code>drop-reject-class</code></td><td><code>drop-reject-class="nope"</code></td><td t="docs.cheatsheet.dnd.dropRejectClass"></td></tr>
        <tr><td><code>drop-disabled</code></td><td><code>drop-disabled="full"</code></td><td t="docs.cheatsheet.dnd.dropDisabled"></td></tr>
        <tr><td><code>drop-max</code></td><td><code>drop-max="5"</code></td><td t="docs.cheatsheet.dnd.dropMax"></td></tr>
        <tr><td><code>drop-sort</code></td><td><code>drop-sort</code></td><td t="docs.cheatsheet.dnd.dropSort"></td></tr>
        <tr><td><code>drop-placeholder</code></td><td><code>drop-placeholder="#ph"</code></td><td t="docs.cheatsheet.dnd.dropPlaceholder"></td></tr>
        <tr><td><code>drop-settle-class</code></td><td><code>drop-settle-class="my-settle"</code></td><td t="docs.cheatsheet.dnd.dropSettleClass"></td></tr>
        <tr><td><code>drop-empty-class</code></td><td><code>drop-empty-class="empty"</code></td><td t="docs.cheatsheet.dnd.dropEmptyClass"></td></tr>
        <tr><td><code>drag-list</code></td><td><code>drag-list="items"</code></td><td t="docs.cheatsheet.dnd.dragList"></td></tr>
        <tr><td><code>drag-list-key</code></td><td><code>drag-list-key="id"</code></td><td t="docs.cheatsheet.dnd.dragListKey"></td></tr>
        <tr><td><code>drag-list-item</code></td><td><code>drag-list-item="task"</code></td><td t="docs.cheatsheet.dnd.dragListItem"></td></tr>
        <tr><td><code>drag-list-copy</code></td><td><code>drag-list-copy</code></td><td t="docs.cheatsheet.dnd.dragListCopy"></td></tr>
        <tr><td><code>drag-list-remove</code></td><td><code>drag-list-remove</code></td><td t="docs.cheatsheet.dnd.dragListRemove"></td></tr>
        <tr><td><code>drag-multiple</code></td><td><code>drag-multiple</code></td><td t="docs.cheatsheet.dnd.dragMultiple"></td></tr>
        <tr><td><code>drag-multiple-class</code></td><td><code>drag-multiple-class="selected"</code></td><td t="docs.cheatsheet.dnd.dragMultipleClass"></td></tr>
      </tbody>
    </table>
  </div>

  <!-- i18n -->
  <div class="doc-section">
    <h2 class="doc-title" id="cheatsheet-i18n" t="docs.cheatsheet.i18n.title"></h2>
    <table class="doc-table">
      <thead><tr><th t="docs.cheatsheet.i18n.col1"></th><th t="docs.cheatsheet.i18n.col2"></th><th t="docs.cheatsheet.i18n.col3"></th></tr></thead>
      <tbody>
        <tr><td><code>t</code></td><td><code>t="greeting"</code></td><td t="docs.cheatsheet.i18n.t"></td></tr>
        <tr><td><code>t-*</code></td><td><code>t-name="user.name"</code></td><td t="docs.cheatsheet.i18n.tStar"></td></tr>
        <tr><td><code>t-html</code></td><td><code>t="key" t-html</code></td><td t="docs.cheatsheet.i18n.tHtml"></td></tr>
      </tbody>
    </table>
  </div>

  <!-- Head Management -->
  <div class="doc-section">
    <h2 class="doc-title" id="cheatsheet-head-management" t="docs.cheatsheet.headManagement.title"></h2>
    <table class="doc-table">
      <thead><tr><th t="docs.cheatsheet.headManagement.col1"></th><th t="docs.cheatsheet.headManagement.col2"></th><th t="docs.cheatsheet.headManagement.col3"></th></tr></thead>
      <tbody>
        <tr><td><code>page-title</code></td><td><code>page-title="'About | Store'"</code></td><td t="docs.cheatsheet.headManagement.pageTitle"></td></tr>
        <tr><td><code>page-description</code></td><td><code>page-description="product.desc"</code></td><td t="docs.cheatsheet.headManagement.pageDescription"></td></tr>
        <tr><td><code>page-canonical</code></td><td><code>page-canonical="'/about'"</code></td><td t="docs.cheatsheet.headManagement.pageCanonical"></td></tr>
        <tr><td><code>page-jsonld</code></td><td><code>&lt;div hidden page-jsonld&gt;</code></td><td t="docs.cheatsheet.headManagement.pageJsonld"></td></tr>
      </tbody>
    </table>
  </div>

  <!-- Misc -->
  <div class="doc-section">
    <h2 class="doc-title" id="cheatsheet-misc" t="docs.cheatsheet.misc.title"></h2>
    <table class="doc-table">
      <thead><tr><th t="docs.cheatsheet.misc.col1"></th><th t="docs.cheatsheet.misc.col2"></th><th t="docs.cheatsheet.misc.col3"></th></tr></thead>
      <tbody>
        <tr><td><code>ref</code></td><td><code>ref="input"</code></td><td t="docs.cheatsheet.misc.ref"></td></tr>
        <tr><td><code>call</code></td><td><code>call="/api/action"</code></td><td t="docs.cheatsheet.misc.call"></td></tr>
        <tr><td><code>trigger</code></td><td><code>trigger="event-name"</code></td><td t="docs.cheatsheet.misc.trigger"></td></tr>
        <tr><td><code>use</code></td><td><code>use="templateId"</code></td><td t="docs.cheatsheet.misc.use"></td></tr>
        <tr><td><code>src</code> (on template)</td><td><code>src="/tpl.html"</code></td><td t="docs.cheatsheet.misc.src"></td></tr>
        <tr><td><code>loading</code> (on template)</td><td><code>&lt;template src="..." loading="#skl"&gt;</code></td><td t="docs.cheatsheet.misc.loading"></td></tr>
        <tr><td><code>include</code> (on template)</td><td><code>&lt;template include="#fragment"&gt;</code></td><td t="docs.cheatsheet.misc.include"></td></tr>
        <tr><td><code>error-boundary</code></td><td><code>error-boundary="#fb"</code></td><td t="docs.cheatsheet.misc.errorBoundary"></td></tr>
        <tr><td><code>var</code></td><td><code>&lt;template var="data"&gt;</code></td><td t="docs.cheatsheet.misc.var"></td></tr>
      </tbody>
    </table>
  </div>

</div>
