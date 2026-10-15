# Directive Cheatsheet

Complete reference of every No.JS directive.

## Data

| Directive | Example | Description |
|-----------|---------|-------------|
| `base` | `base="https://api.com"` | Set API base URL for descendants |
| `get` | `get="/users"` | Fetch data (GET) |
| `post` | `post="/login"` | Submit data (POST) |
| `put` | `put="/users/1"` | Update data (PUT) |
| `patch` | `patch="/users/1"` | Partial update (PATCH) |
| `delete` | `delete="/users/1"` | Delete data (DELETE) |
| `as` | `as="users"` | Name for fetched data in context |
| `body` | `body='{"key":"val"}'` | Request body |
| `headers` | `headers='{"Auth":"Bearer x"}'` | Request headers |
| `params` | `params="{ page: 1 }"` | Query parameters |
| `cached` | `cached` or `cached="local"` | Cache responses (memory/local/session) |
| `into` | `into="currentUser"` | Write response to a named global store |
| `debounce` | `debounce="300"` | Debounce reactive URL refetches (ms) |
| `refresh` | `refresh="5000"` | Auto-refresh interval in ms (polling) |
| `skeleton` | `skeleton="cardSkel"` | Show/hide a placeholder element during loading |
| `retry` | `retry="3"` | Number of retry attempts on failure |
| `retry-delay` | `retry-delay="1000"` | Delay between retries in ms |
| `get-trigger` | `get-trigger="scroll"` | Pagination trigger: `"scroll"` (infinite), `"button"` (load more), or `"visible"` |
| `get-trigger-label` | `get-trigger-label="Show more"` | Label for the auto-generated load-more button (default `"Load More"`) |
| `get-insert` | `get-insert="append"` | How new pages are inserted: `"append"` or `"prepend"` (default replaces content) |
| `get-page` | `get-page="1"` | Enable offset-based pagination starting at the given page number |
| `get-cursor` | `get-cursor` | Enable cursor-based pagination |
| `get-cursor-field` | `get-cursor-field="next"` | JSON field name containing the next cursor value |
| `get-threshold` | `get-threshold="300px"` | `rootMargin` for the IntersectionObserver (default `"200px"` for scroll, `"0px"` for visible) |

## State

| Directive | Example | Description |
|-----------|---------|-------------|
| `state` | `state="{ count: 0 }"` | Create local reactive state |
| `store` | `store="auth"` | Define/access global store |
| `computed` | `computed="total" expr="a+b"` | Derived reactive value |
| `watch` | `watch="search"` | React to value changes |
| `persist` | `persist="localStorage"` | Persist state to storage |
| `persist-key` | `persist-key="settings"` | Storage key for persistence |
| `persist-fields` | `persist-fields="theme,lang"` | Comma-separated fields to persist |
| `persist-schema` | `persist-schema` | Validate restored keys against initial state |
| `model` | `model="name"` | Two-way binding for inputs |

## Rendering

| Directive | Example | Description |
|-----------|---------|-------------|
| `bind` | `bind="user.name"` | Set text content |
| `bind-html` | `bind-html="content"` | Set innerHTML (sanitized) |
| `bind-*` | `bind-src="url"` | Bind any attribute |
| `if` | `if="condition"` | Conditional render |
| `else-if` | `else-if="cond"` | Chained conditional |
| `then` | `then="templateId"` | Template for truthy |
| `else` | `else="templateId"` | Template for falsy |
| `show` | `show="condition"` | Toggle visibility (CSS) |
| `hide` | `hide="condition"` | Inverse of show |
| `switch` | `switch="value"` | Switch/case render |
| `case` | `case="'admin'"` | Case match |
| `default` | `default` | Default case |

## Loops

The element with the loop directive IS the repeating template. It is removed from the DOM and clones are inserted as siblings.

| Directive | Example | Description |
|-----------|---------|-------------|
| `foreach` | `foreach="item in items"` | Iterate over arrays (primary directive). The element repeats as siblings. |
| `each` | `each="item in items"` | Alias for `foreach` |
| `for` | `for="item in items"` | Alias for `foreach` |
| `else` (template) | `else="noItemsTpl"` | Template rendered when the array is empty or null/undefined |
| `template` | `template="tplId"` | Template to clone for each item (optional — own children used when omitted) |
| `index` | `index="i"` | Index variable name |
| `key` | `key="item.id"` | Unique key for diffing |
| `filter` | `filter="item.active"` | Filter expression |
| `sort` | `sort="item.name"` | Sort property |
| `limit` | `limit="10"` | Max items |
| `offset` | `offset="5"` | Skip items |

## Events

| Directive | Example | Description |
|-----------|---------|-------------|
| `on:click` | `on:click="count++"` | Click handler |
| `on:submit` | `on:submit.prevent="..."` | Submit handler |
| `on:input` | `on:input="..."` | Input handler |
| `on:keydown.*` | `on:keydown.enter="..."` | Key handler |
| `on:mounted` | `on:mounted="init()"` | Lifecycle: mounted |
| `on:unmounted` | `on:unmounted="cleanup()"` | Lifecycle: unmounted |
| `on:init` | `on:init="setup()"` | Lifecycle: first processed |
| `on:updated` | `on:updated="refresh()"` | Lifecycle: DOM mutation observed |
| `on:error` | `on:error="log($error)"` | Lifecycle: error in subtree |

## Styling

| Directive | Example | Description |
|-----------|---------|-------------|
| `class-*` | `class-active="isOn"` | Toggle CSS class |
| `class-list` | `class-list="['a', cond && 'b']"` | Class from array |
| `class-map` | `class-map="{ a: x }"` | Class from object |
| `style-*` | `style-color="c"` | Set inline style |
| `style-map` | `style-map="{ ... }"` | Style from object |

## Forms

> **Note:** Form validation requires the [`@no-js-dev/nojs-elements`](https://github.com/no-js-dev/nojs-elements) plugin. Core includes only a stub that disables submission with a console warning.

| Directive | Example | Description |
|-----------|---------|-------------|
| `validate` | `validate` or `validate="email"` | Enable form/field validation |
| `error` | `error="#tpl"` | Error template for field |
| `success` | `success="#tpl"` | Success template |
| `loading` | `loading="#tpl"` | Loading template |
| `confirm` | `confirm="Sure?"` | Confirmation dialog |
| `redirect` | `redirect="/home"` | Redirect on success |

## Routing

| Directive | Example | Description |
|-----------|---------|-------------|
| `route` | `route="/path"` | Define route or link |
| `route="*"` | `route="*"` | Catch-all 404 wildcard route |
| `route-view` | `route-view` | Route outlet |
| `route-view="name"` | `route-view="sidebar"` | Named route outlet |
| `route-view[src]` | `route-view src="./pages/"` | File-based routing outlet |
| `route-index` | `route-index="overview"` | Filename for root `/` (default `"index"`) |
| `ext` | `ext=".html"` | File extension for file-based routing (default `".tpl"`) |
| `i18n-ns` | `i18n-ns` | Auto-derive i18n namespace from route filename |
| `outlet` | `outlet="sidebar"` | Target a named outlet from a route template |
| `route-active` | `route-active="cls"` | Active link class |
| `guard` | `guard="expr"` | Route guard condition |
| `lazy` | `lazy="ondemand"` | Defer route template fetch until first visit |
| `lazy` | `lazy="priority"` | Force template to load before all others |
| `$route.matched` | `if="$route.matched"` | `true` if an explicit route matched, `false` for wildcard/fallback |
| `transition` | `transition="slide"` | View Transition API preset (slide/fade/scale/none) |
| `page-title` | `page-title="'Title'"` | Route document title |
| `page-description` | `page-description="'...'"` | Route meta description |
| `page-canonical` | `page-canonical="'/path'"` | Route canonical URL |
| `page-jsonld` | `page-jsonld='{"@type":"..."}'` | Route JSON-LD data |
| `redirect` | `redirect="/login"` | Redirect path when guard fails |

## Animation

| Directive | Example | Description |
|-----------|---------|-------------|
| `animate` | `animate="fadeIn"` | Enter animation |
| `animate-enter` | `animate-enter="slideIn"` | Enter animation |
| `animate-leave` | `animate-leave="slideOut"` | Leave animation |
| `animate-duration` | `animate-duration="300"` | Duration in ms |
| `animate-stagger` | `animate-stagger="50"` | Stagger delay |
| `transition` | `transition="fade"` | CSS transition |

## Drag and Drop

> **Note:** Drag and Drop requires the [`@no-js-dev/nojs-elements`](https://github.com/no-js-dev/nojs-elements) plugin. Core includes only stubs that log a console warning.

| Directive | Example | Description |
|-----------|---------|-------------|
| `drag` | `drag` | Make element draggable |
| `drag-type` | `drag-type="task"` | Data type identifier |
| `drag-effect` | `drag-effect="move"` | Allowed effect (move/copy/link/all) |
| `drag-handle` | `drag-handle=".handle"` | Restrict drag to handle selector |
| `drag-disabled` | `drag-disabled="locked"` | Disable drag conditionally |
| `drag-class` | `drag-class="dragging"` | Class added while dragging |
| `drag-group` | `drag-group="board"` | Scope drag to a named group |
| `drop` | `drop` | Make element a drop zone |
| `drop-accept` | `drop-accept="task"` | Accepted drag type(s) |
| `drop-effect` | `drop-effect="move"` | Visual feedback effect |
| `drop-class` | `drop-class="over"` | Class added on drag-over |
| `drop-reject-class` | `drop-reject-class="nope"` | Class added on rejected drag-over |
| `drop-disabled` | `drop-disabled="full"` | Disable drop conditionally |
| `drop-max` | `drop-max="5"` | Maximum items in drop zone |
| `drop-sort` | `drop-sort` | Enable positional sorting |
| `drop-placeholder` | `drop-placeholder="#ph"` | Placeholder template during drag-over |
| `drop-settle-class` | `drop-settle-class="my-settle"` | Custom CSS class for settle animation |
| `drop-empty-class` | `drop-empty-class="empty"` | Custom CSS class for empty state on drag-list |
| `drag-list` | `drag-list="items"` | Sortable list bound to state array |
| `drag-list-key` | `drag-list-key="id"` | Unique key for each item |
| `drag-list-item` | `drag-list-item="task"` | Loop variable name in template |
| `drag-list-copy` | `drag-list-copy` | Copy instead of move on transfer |
| `drag-list-remove` | `drag-list-remove` | Remove items from source on transfer |
| `drag-multiple` | `drag-multiple` | Lasso / multi-select on children |
| `drag-multiple-class` | `drag-multiple-class="selected"` | Class added to selected items |

## i18n

| Directive | Example | Description |
|-----------|---------|-------------|
| `t` | `t="greeting"` | Translate key |
| `t-*` | `t-name="user.name"` | Translation param |
| `t-html` | `t="key" t-html` | Render translation as sanitized HTML |

## Head Management

| Directive | Example | Description |
|-----------|---------|-------------|
| `page-title` | `page-title="'About \| Store'"` | Set `document.title` reactively |
| `page-description` | `page-description="product.desc"` | Set `<meta name="description">` |
| `page-canonical` | `page-canonical="'/about'"` | Set `<link rel="canonical">` |
| `page-jsonld` | `<div hidden page-jsonld>` | Set `<script type="application/ld+json">` |

## Misc

| Directive | Example | Description |
|-----------|---------|-------------|
| `ref` | `ref="input"` | Named element ref |
| `call` | `call="/api/action" method="post"` | Trigger API call on click |
| `trigger` | `trigger="event-name"` | Emit custom event |
| `use` | `use="templateId"` | Instantiate template |
| `src` (on template) | `src="/tpl.html"` | Remote template (see also: `lazy`) |
| `loading` (on template) | `<template src="..." loading="#skl">` | Placeholder shown while remote template loads; removed on arrival |
| `include` (on template) | `<template include="#fragment">` | Synchronously clone an inline template into the current position |
| `error-boundary` | `error-boundary="#fb"` | Error boundary |
| `var` | `<template var="data">` | Template variable name |

---

**Previous:** [Playground ←](playground.md) | **Next:** [Examples →](examples.md)
