<!-- Pagination & Triggers — from pagination docs -->

<style>
/* ══════════════════════════════════════════════════════════════════
   PAGINATION DEMOS
   ══════════════════════════════════════════════════════════════════ */
.pg-demo-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 14px;
  border-bottom: 1px solid var(--border);
  font-family: var(--font-body);
  font-size: 14px;
  color: var(--text);
}
.pg-demo-item:last-child { border-bottom: none; }
.pg-demo-num {
  font-family: var(--font-mono);
  font-size: 12px;
  color: var(--primary);
  min-width: 24px;
}
.pg-demo-feed .pg-demo-ts {
  margin-left: auto;
  font-size: 12px;
  color: var(--text-dim);
}
.pg-demo-lazy-loaded {
  padding: 16px;
}
.pg-demo-lazy-loaded strong {
  font-family: var(--font-heading);
  font-size: 16px;
  color: var(--text);
}
.pg-demo-lazy-loaded p {
  font-family: var(--font-body);
  font-size: 14px;
  color: var(--text-secondary);
  margin-top: 8px;
}
.pg-demo-hover-content {
  padding: 16px;
}
.pg-demo-hover-content strong {
  font-family: var(--font-heading);
  font-size: 16px;
  color: var(--text);
}
.pg-demo-hover-content p {
  font-family: var(--font-body);
  font-size: 14px;
  color: var(--text-secondary);
  margin-top: 4px;
}
.pg-demo-container {
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  max-height: 220px;
  overflow-y: auto;
}
.pg-demo-hover-card {
  border: 1px dashed var(--border);
  border-radius: var(--radius-sm);
  padding: 20px;
  text-align: center;
  color: var(--text-muted);
  font-size: 14px;
  cursor: pointer;
  transition: border-color 0.2s;
}
.pg-demo-hover-card:hover {
  border-color: var(--primary);
}
.pg-demo-cursor-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 14px;
  border-bottom: 1px solid var(--border);
  font-family: var(--font-body);
  font-size: 14px;
  color: var(--text);
}
.pg-demo-cursor-item:last-child { border-bottom: none; }

/* Matrix table */
.pg-matrix {
  width: 100%;
  border-collapse: collapse;
  font-family: var(--font-body);
  font-size: 13px;
  margin: 16px 0;
}
.pg-matrix th {
  text-align: left;
  padding: 10px 12px;
  background: var(--surface);
  border: 1px solid var(--border);
  font-weight: 600;
  color: var(--text);
}
.pg-matrix td {
  padding: 8px 12px;
  border: 1px solid var(--border);
  color: var(--text-secondary);
  vertical-align: top;
}
.pg-matrix td code {
  font-size: 12px;
}

/* Callout for end-of-data */
.pg-callout {
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin: 16px 0;
}
.pg-callout-item {
  padding: 12px 16px;
  background: var(--surface);
  border-radius: var(--radius-sm);
  border-left: 3px solid var(--primary);
}
.pg-callout-item strong {
  font-family: var(--font-heading);
  font-size: 14px;
  color: var(--text);
}
.pg-callout-item p {
  font-family: var(--font-body);
  font-size: 13px;
  color: var(--text-secondary);
  margin-top: 4px;
  line-height: 1.6;
}

@media (max-width: 768px) {
  .pg-matrix { display: block; overflow-x: auto; -webkit-overflow-scrolling: touch; }
  .pg-matrix th, .pg-matrix td { padding: 6px 8px; font-size: 12px; }
}
</style>

<section class="hero-section">
  <span class="badge" t="docs.pagination.hero.badge"></span>
  <h1 class="hero-title" t="docs.pagination.hero.title"></h1>
  <p class="hero-subtitle" t="docs.pagination.hero.subtitle"></p>
</section>

<div class="doc-content">

  <!-- Quick Start -->
  <div class="doc-section">
    <h2 class="doc-title" id="pagination-quick-start" t="docs.pagination.quickStart.title"></h2>
    <p class="doc-text" t="docs.pagination.quickStart.text"></p>
    <div class="code-block"><pre><span class="hl-tag">&lt;div</span> <span class="hl-attr">get</span>=<span class="hl-str">"/api/items?page={page}"</span>
     <span class="hl-attr">as</span>=<span class="hl-str">"items"</span>
     <span class="hl-attr">get-trigger</span>=<span class="hl-str">"scroll"</span>
     <span class="hl-attr">get-insert</span>=<span class="hl-str">"append"</span>
     <span class="hl-attr">get-page</span>=<span class="hl-str">"1"</span><span class="hl-tag">&gt;</span>
  <span class="hl-tag">&lt;div</span> <span class="hl-attr">foreach</span>=<span class="hl-str">"item in items"</span><span class="hl-tag">&gt;</span>
    <span class="hl-tag">&lt;p</span> <span class="hl-attr">bind</span>=<span class="hl-str">"item.name"</span><span class="hl-tag">&gt;&lt;/p&gt;</span>
  <span class="hl-tag">&lt;/div&gt;</span>
<span class="hl-tag">&lt;/div&gt;</span></pre></div>
    <div class="demo-note" t="docs.pagination.quickStart.note"></div>
  </div>

  <!-- Attributes Reference -->
  <div class="doc-section">
    <h2 class="doc-title" id="pagination-attributes" t="docs.pagination.attributes.title"></h2>
    <table class="doc-table">
      <thead>
        <tr>
          <th t="docs.pagination.attributes.col1"></th>
          <th t="docs.pagination.attributes.col2"></th>
          <th t="docs.pagination.attributes.col3"></th>
          <th t="docs.pagination.attributes.col4"></th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td><code>get-insert</code></td>
          <td><code>"append"</code>, <code>"prepend"</code></td>
          <td><em>(absent = replace)</em></td>
          <td t="docs.pagination.attributes.getInsert"></td>
        </tr>
        <tr>
          <td><code>get-trigger</code></td>
          <td><code>"scroll"</code>, <code>"button"</code>, <code>"visible"</code>, <code>"hover"</code>, <code>"none"</code></td>
          <td><em>(absent = immediate)</em></td>
          <td t="docs.pagination.attributes.getTrigger"></td>
        </tr>
        <tr>
          <td><code>get-page</code></td>
          <td>number</td>
          <td><code>1</code></td>
          <td t="docs.pagination.attributes.getPage"></td>
        </tr>
        <tr>
          <td><code>get-cursor</code></td>
          <td>(boolean)</td>
          <td>&mdash;</td>
          <td t="docs.pagination.attributes.getCursor"></td>
        </tr>
        <tr>
          <td><code>get-cursor-field</code></td>
          <td>string (dot notation)</td>
          <td>&mdash;</td>
          <td t="docs.pagination.attributes.getCursorField"></td>
        </tr>
        <tr>
          <td><code>get-threshold</code></td>
          <td>CSS margin</td>
          <td><code>"200px"</code> (scroll) / <code>"0px"</code> (visible)</td>
          <td t="docs.pagination.attributes.getThreshold"></td>
        </tr>
        <tr>
          <td><code>get-trigger-label</code></td>
          <td>string</td>
          <td><code>"Load More"</code></td>
          <td t="docs.pagination.attributes.getTriggerLabel"></td>
        </tr>
      </tbody>
    </table>
  </div>

  <!-- Live Examples -->
  <div class="doc-section">
    <h2 class="doc-title" id="pagination-examples" t="docs.pagination.examples.title"></h2>

    <!-- Example 1: Infinite Scroll -->
    <h3 class="doc-subtitle" id="pagination-infinite-scroll" t="docs.pagination.examples.infiniteScroll.title"></h3>
    <p class="doc-text" t="docs.pagination.examples.infiniteScroll.desc"></p>
    <div class="demo-split">
      <div class="demo-code">
        <div class="code-block"><pre><span class="hl-tag">&lt;div</span> <span class="hl-attr">get</span>=<span class="hl-str">"/api/demo/items?page={page}"</span>
     <span class="hl-attr">as</span>=<span class="hl-str">"items"</span>
     <span class="hl-attr">get-trigger</span>=<span class="hl-str">"scroll"</span>
     <span class="hl-attr">get-insert</span>=<span class="hl-str">"append"</span>
     <span class="hl-attr">get-page</span>=<span class="hl-str">"1"</span>
     <span class="hl-attr">get-threshold</span>=<span class="hl-str">"100px"</span><span class="hl-tag">&gt;</span>
  <span class="hl-cmt">&lt;!-- items are appended here --&gt;</span>
<span class="hl-tag">&lt;/div&gt;</span></pre></div>
      </div>
      <div class="demo-preview">
        <span class="demo-result-label" t="docs.pagination.examples.infiniteScroll.label"></span>
        <div class="pg-demo-container"
             get="/api/demo/items?page={page}"
             as="items"
             get-trigger="scroll"
             get-insert="append"
             get-page="1"
             get-threshold="100px">
        </div>
      </div>
    </div>

    <!-- Example 2: Load More Button -->
    <h3 class="doc-subtitle" id="pagination-load-more" t="docs.pagination.examples.loadMore.title"></h3>
    <p class="doc-text" t="docs.pagination.examples.loadMore.desc"></p>
    <div class="demo-split">
      <div class="demo-code">
        <div class="code-block"><pre><span class="hl-tag">&lt;div</span> <span class="hl-attr">get</span>=<span class="hl-str">"/api/demo/items?page={page}"</span>
     <span class="hl-attr">as</span>=<span class="hl-str">"items"</span>
     <span class="hl-attr">get-trigger</span>=<span class="hl-str">"button"</span>
     <span class="hl-attr">get-insert</span>=<span class="hl-str">"append"</span>
     <span class="hl-attr">get-page</span>=<span class="hl-str">"1"</span>
     <span class="hl-attr">get-trigger-label</span>=<span class="hl-str">"Show More Items"</span><span class="hl-tag">&gt;</span>
  <span class="hl-cmt">&lt;!-- items + auto button --&gt;</span>
<span class="hl-tag">&lt;/div&gt;</span></pre></div>
      </div>
      <div class="demo-preview">
        <span class="demo-result-label" t="docs.pagination.examples.loadMore.label"></span>
        <div get="/api/demo/items?page={page}"
             as="items"
             get-trigger="button"
             get-insert="append"
             get-page="1"
             get-trigger-label="Show More Items">
        </div>
      </div>
    </div>

    <!-- Example 3: Lazy Load on Visible -->
    <h3 class="doc-subtitle" id="pagination-lazy-load" t="docs.pagination.examples.lazyLoad.title"></h3>
    <p class="doc-text" t="docs.pagination.examples.lazyLoad.desc"></p>
    <div class="demo-split">
      <div class="demo-code">
        <div class="code-block"><pre><span class="hl-tag">&lt;div</span> <span class="hl-attr">get</span>=<span class="hl-str">"/api/demo/lazy-content"</span>
     <span class="hl-attr">as</span>=<span class="hl-str">"content"</span>
     <span class="hl-attr">get-trigger</span>=<span class="hl-str">"visible"</span><span class="hl-tag">&gt;</span>
  <span class="hl-cmt">&lt;!-- loaded when scrolled into view --&gt;</span>
<span class="hl-tag">&lt;/div&gt;</span></pre></div>
      </div>
      <div class="demo-preview">
        <span class="demo-result-label" t="docs.pagination.examples.lazyLoad.label"></span>
        <div get="/api/demo/lazy-content"
             as="content"
             get-trigger="visible">
        </div>
      </div>
    </div>

    <!-- Example 4: Hover Prefetch -->
    <h3 class="doc-subtitle" id="pagination-hover-prefetch" t="docs.pagination.examples.hoverPrefetch.title"></h3>
    <p class="doc-text" t="docs.pagination.examples.hoverPrefetch.desc"></p>
    <div class="demo-split">
      <div class="demo-code">
        <div class="code-block"><pre><span class="hl-tag">&lt;div</span> <span class="hl-attr">get</span>=<span class="hl-str">"/api/demo/hover-preview"</span>
     <span class="hl-attr">as</span>=<span class="hl-str">"preview"</span>
     <span class="hl-attr">get-trigger</span>=<span class="hl-str">"hover"</span><span class="hl-tag">&gt;</span>
  <span class="hl-tag">&lt;p&gt;</span>Hover to load<span class="hl-tag">&lt;/p&gt;</span>
<span class="hl-tag">&lt;/div&gt;</span></pre></div>
      </div>
      <div class="demo-preview">
        <span class="demo-result-label" t="docs.pagination.examples.hoverPrefetch.label"></span>
        <div class="pg-demo-hover-card"
             get="/api/demo/hover-preview"
             as="preview"
             get-trigger="hover">
          <p t="docs.pagination.examples.hoverPrefetch.hoverMe"></p>
        </div>
      </div>
    </div>

    <!-- Example 5: Programmatic Fetch -->
    <h3 class="doc-subtitle" id="pagination-programmatic" t="docs.pagination.examples.programmatic.title"></h3>
    <p class="doc-text" t="docs.pagination.examples.programmatic.desc"></p>
    <div class="demo-split">
      <div class="demo-code">
        <div class="code-block"><pre><span class="hl-tag">&lt;div</span> <span class="hl-attr">get</span>=<span class="hl-str">"/api/demo/lazy-content"</span>
     <span class="hl-attr">as</span>=<span class="hl-str">"content"</span>
     <span class="hl-attr">get-trigger</span>=<span class="hl-str">"none"</span>
     <span class="hl-attr">ref</span>=<span class="hl-str">"manualFetch"</span><span class="hl-tag">&gt;</span>
  <span class="hl-cmt">&lt;!-- empty until triggered --&gt;</span>
<span class="hl-tag">&lt;/div&gt;</span>
<span class="hl-tag">&lt;button</span> <span class="hl-attr">on:click</span>=<span class="hl-str">"$refs.manualFetch.refresh()"</span><span class="hl-tag">&gt;</span>
  Fetch Now
<span class="hl-tag">&lt;/button&gt;</span></pre></div>
      </div>
      <div class="demo-preview">
        <span class="demo-result-label" t="docs.pagination.examples.programmatic.label"></span>
        <p class="doc-text" style="margin-bottom: 12px;" t="docs.pagination.examples.programmatic.clickToLoad"></p>
        <div get="/api/demo/lazy-content"
             as="content"
             get-trigger="none"
             ref="manualFetch">
        </div>
        <button class="btn btn-primary" style="margin-top: 12px;" on:click="$refs.manualFetch.refresh()">Fetch Now</button>
      </div>
    </div>

    <!-- Example 6: Cursor Pagination -->
    <h3 class="doc-subtitle" id="pagination-cursor" t="docs.pagination.examples.cursorPagination.title"></h3>
    <p class="doc-text" t="docs.pagination.examples.cursorPagination.desc"></p>
    <div class="demo-split">
      <div class="demo-code">
        <div class="code-block"><pre><span class="hl-tag">&lt;div</span> <span class="hl-attr">get</span>=<span class="hl-str">"/api/demo/cursor-items?cursor={cursor}"</span>
     <span class="hl-attr">as</span>=<span class="hl-str">"result"</span>
     <span class="hl-attr">get-trigger</span>=<span class="hl-str">"button"</span>
     <span class="hl-attr">get-insert</span>=<span class="hl-str">"append"</span>
     <span class="hl-attr">get-cursor</span><span class="hl-tag">&gt;</span>
  <span class="hl-tag">&lt;div</span> <span class="hl-attr">foreach</span>=<span class="hl-str">"item in result.data"</span><span class="hl-tag">&gt;</span>
    <span class="hl-tag">&lt;p</span> <span class="hl-attr">bind</span>=<span class="hl-str">"item.title"</span><span class="hl-tag">&gt;&lt;/p&gt;</span>
  <span class="hl-tag">&lt;/div&gt;</span>
<span class="hl-tag">&lt;/div&gt;</span></pre></div>
      </div>
      <div class="demo-preview">
        <span class="demo-result-label" t="docs.pagination.examples.cursorPagination.label"></span>
        <div get="/api/demo/cursor-items?cursor={cursor}"
             as="result"
             get-trigger="button"
             get-insert="append"
             get-cursor>
          <div foreach="item in result.data" class="pg-demo-cursor-item">
            <span class="pg-demo-num" bind="item.id"></span>
            <span bind="item.title"></span>
          </div>
        </div>
      </div>
    </div>

    <!-- Example 7: Live Feed (Prepend) -->
    <h3 class="doc-subtitle" id="pagination-live-feed" t="docs.pagination.examples.liveFeed.title"></h3>
    <p class="doc-text" t="docs.pagination.examples.liveFeed.desc"></p>
    <div class="demo-split">
      <div class="demo-code">
        <div class="code-block"><pre><span class="hl-tag">&lt;div</span> <span class="hl-attr">get</span>=<span class="hl-str">"/api/demo/feed?page={page}"</span>
     <span class="hl-attr">as</span>=<span class="hl-str">"feed"</span>
     <span class="hl-attr">get-trigger</span>=<span class="hl-str">"button"</span>
     <span class="hl-attr">get-insert</span>=<span class="hl-str">"prepend"</span>
     <span class="hl-attr">get-page</span>=<span class="hl-str">"1"</span>
     <span class="hl-attr">get-trigger-label</span>=<span class="hl-str">"Load Newer"</span><span class="hl-tag">&gt;</span>
  <span class="hl-cmt">&lt;!-- new items prepended here --&gt;</span>
<span class="hl-tag">&lt;/div&gt;</span></pre></div>
      </div>
      <div class="demo-preview">
        <span class="demo-result-label" t="docs.pagination.examples.liveFeed.label"></span>
        <div get="/api/demo/feed?page={page}"
             as="feed"
             get-trigger="button"
             get-insert="prepend"
             get-page="1"
             get-trigger-label="Load Newer">
        </div>
      </div>
    </div>
  </div>

  <!-- Composition Matrix -->
  <div class="doc-section">
    <h2 class="doc-title" id="pagination-matrix" t="docs.pagination.matrix.title"></h2>
    <p class="doc-text" t="docs.pagination.matrix.text"></p>
    <table class="pg-matrix">
      <thead>
        <tr>
          <th t="docs.pagination.matrix.col1"></th>
          <th t="docs.pagination.matrix.col2"></th>
          <th t="docs.pagination.matrix.col3"></th>
          <th t="docs.pagination.matrix.col4"></th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td><code>(immediate)</code></td>
          <td t="docs.pagination.matrix.immediateReplace"></td>
          <td t="docs.pagination.matrix.immediateAppend"></td>
          <td t="docs.pagination.matrix.immediatePrepend"></td>
        </tr>
        <tr>
          <td><code>scroll</code></td>
          <td t="docs.pagination.matrix.scrollReplace"></td>
          <td t="docs.pagination.matrix.scrollAppend"></td>
          <td t="docs.pagination.matrix.scrollPrepend"></td>
        </tr>
        <tr>
          <td><code>button</code></td>
          <td t="docs.pagination.matrix.buttonReplace"></td>
          <td t="docs.pagination.matrix.buttonAppend"></td>
          <td t="docs.pagination.matrix.buttonPrepend"></td>
        </tr>
        <tr>
          <td><code>visible</code></td>
          <td t="docs.pagination.matrix.visibleReplace"></td>
          <td t="docs.pagination.matrix.visibleAppend"></td>
          <td t="docs.pagination.matrix.visiblePrepend"></td>
        </tr>
        <tr>
          <td><code>hover</code></td>
          <td t="docs.pagination.matrix.hoverReplace"></td>
          <td t="docs.pagination.matrix.hoverAppend"></td>
          <td t="docs.pagination.matrix.hoverPrepend"></td>
        </tr>
        <tr>
          <td><code>none</code></td>
          <td t="docs.pagination.matrix.noneReplace"></td>
          <td t="docs.pagination.matrix.noneAppend"></td>
          <td t="docs.pagination.matrix.nonePrepend"></td>
        </tr>
      </tbody>
    </table>
  </div>

  <!-- End-of-Data -->
  <div class="doc-section">
    <h2 class="doc-title" id="pagination-end-of-data" t="docs.pagination.endOfData.title"></h2>
    <p class="doc-text" t="docs.pagination.endOfData.text"></p>
    <div class="pg-callout">
      <div class="pg-callout-item">
        <strong t="docs.pagination.endOfData.emptyBody"></strong>
        <p t="docs.pagination.endOfData.emptyBodyText"></p>
      </div>
      <div class="pg-callout-item">
        <strong t="docs.pagination.endOfData.lastPageHeader"></strong>
        <p t="docs.pagination.endOfData.lastPageHeaderText"></p>
      </div>
      <div class="pg-callout-item">
        <strong t="docs.pagination.endOfData.nullCursor"></strong>
        <p t="docs.pagination.endOfData.nullCursorText"></p>
      </div>
    </div>
    <div class="code-block"><pre><span class="hl-cmt">&lt;!-- Server responses that stop pagination: --&gt;</span>

<span class="hl-cmt">&lt;!-- 1. Empty body (Content-Length: 0) --&gt;</span>
<span class="hl-cmt">&lt;!-- HTTP 200 with empty response body --&gt;</span>

<span class="hl-cmt">&lt;!-- 2. X-NoJS-Last-Page header --&gt;</span>
<span class="hl-cmt">&lt;!-- HTTP 200 with header: X-NoJS-Last-Page: true --&gt;</span>

<span class="hl-cmt">&lt;!-- 3. Null cursor (cursor-based only) --&gt;</span>
<span class="hl-cmt">&lt;!-- JSON: { "data": [...], "cursor": null } --&gt;</span></pre></div>
  </div>

  <!-- Templates with Pagination -->
  <div class="doc-section">
    <h2 class="doc-title" id="pagination-templates" t="docs.pagination.templates.title"></h2>
    <p class="doc-text" t="docs.pagination.templates.text"></p>
    <div class="code-block"><pre><span class="hl-tag">&lt;template</span> <span class="hl-attr">id</span>=<span class="hl-str">"itemsLoading"</span><span class="hl-tag">&gt;</span>
  <span class="hl-tag">&lt;p&gt;</span>Loading...<span class="hl-tag">&lt;/p&gt;</span>
<span class="hl-tag">&lt;/template&gt;</span>
<span class="hl-tag">&lt;template</span> <span class="hl-attr">id</span>=<span class="hl-str">"itemsError"</span><span class="hl-tag">&gt;</span>
  <span class="hl-tag">&lt;p&gt;</span>Failed to load items.<span class="hl-tag">&lt;/p&gt;</span>
<span class="hl-tag">&lt;/template&gt;</span>
<span class="hl-tag">&lt;template</span> <span class="hl-attr">id</span>=<span class="hl-str">"itemsEmpty"</span><span class="hl-tag">&gt;</span>
  <span class="hl-tag">&lt;p&gt;</span>No items found.<span class="hl-tag">&lt;/p&gt;</span>
<span class="hl-tag">&lt;/template&gt;</span>

<span class="hl-tag">&lt;div</span> <span class="hl-attr">get</span>=<span class="hl-str">"/api/items?page={page}"</span>
     <span class="hl-attr">as</span>=<span class="hl-str">"items"</span>
     <span class="hl-attr">get-trigger</span>=<span class="hl-str">"scroll"</span>
     <span class="hl-attr">get-insert</span>=<span class="hl-str">"append"</span>
     <span class="hl-attr">get-page</span>=<span class="hl-str">"1"</span>
     <span class="hl-attr">loading</span>=<span class="hl-str">"#itemsLoading"</span>
     <span class="hl-attr">error</span>=<span class="hl-str">"#itemsError"</span>
     <span class="hl-attr">empty</span>=<span class="hl-str">"#itemsEmpty"</span><span class="hl-tag">&gt;</span>
  <span class="hl-tag">&lt;div</span> <span class="hl-attr">foreach</span>=<span class="hl-str">"item in items"</span><span class="hl-tag">&gt;</span>
    <span class="hl-tag">&lt;p</span> <span class="hl-attr">bind</span>=<span class="hl-str">"item.name"</span><span class="hl-tag">&gt;&lt;/p&gt;</span>
  <span class="hl-tag">&lt;/div&gt;</span>
<span class="hl-tag">&lt;/div&gt;</span></pre></div>
    <div class="demo-note" t="docs.pagination.templates.loadingNote"></div>
    <div class="demo-note" t="docs.pagination.templates.emptyNote"></div>
  </div>

  <!-- Scroll Position Preservation -->
  <div class="doc-section">
    <h2 class="doc-title" id="pagination-scroll-position" t="docs.pagination.scrollPosition.title"></h2>
    <p class="doc-text" t="docs.pagination.scrollPosition.text"></p>
    <div class="code-block"><pre><span class="hl-cmt">&lt;!-- Scroll position is preserved automatically --&gt;</span>
<span class="hl-tag">&lt;div</span> <span class="hl-attr">get</span>=<span class="hl-str">"/api/feed?page={page}"</span>
     <span class="hl-attr">as</span>=<span class="hl-str">"feed"</span>
     <span class="hl-attr">get-trigger</span>=<span class="hl-str">"button"</span>
     <span class="hl-attr">get-insert</span>=<span class="hl-str">"prepend"</span>
     <span class="hl-attr">get-page</span>=<span class="hl-str">"1"</span><span class="hl-tag">&gt;</span>
  <span class="hl-cmt">&lt;!-- New items appear above without scroll jump --&gt;</span>
<span class="hl-tag">&lt;/div&gt;</span></pre></div>
  </div>

</div>
