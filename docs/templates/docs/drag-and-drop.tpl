<!-- Drag and Drop — from drag-and-drop.md -->

<section class="hero-section">
  <span class="badge" t="docs.dnd.hero.badge"></span>
  <h1 class="hero-title" t="docs.dnd.hero.title"></h1>
  <p class="hero-subtitle" t="docs.dnd.hero.subtitle"></p>
</section>

<div class="doc-content">

  <!-- Deprecation Banner -->
  <div class="nojs-deprecation-banner" style="background: #FEF3C7; border: 1px solid #F59E0B; border-radius: 8px; padding: 16px; margin-bottom: 24px;">
    <strong style="color: #92400E; font-size: 15px;">&#x26A0;&#xFE0F; Moved to NoJS Elements</strong>
    <p style="color: #78350F; margin: 8px 0 0; font-size: 14px; line-height: 1.6;">The <code>drag</code>, <code>drop</code>, <code>drag-list</code>, and <code>drag-multiple</code> directives have moved to <code>@erickxavier/nojs-elements</code> as of v1.13.0. They are still available in core as deprecation stubs that emit warnings. Install the Elements plugin for full functionality.</p>
    <p style="margin: 8px 0 0;"><a href="/docs/plugins" style="color: #92400E; font-weight: 600; text-decoration: underline;">Migration Guide &rarr;</a></p>
  </div>

  <!-- drag -->
  <div class="doc-section">
    <h2 class="doc-title" id="dnd-drag" t="docs.dnd.drag.title"></h2>
    <div class="demo-split">
      <div class="demo-code"><pre><span class="hl-cmt">&lt;!-- Basic draggable --&gt;</span>
<span class="hl-tag">&lt;div</span> <span class="hl-attr">drag</span>=<span class="hl-str">"item"</span><span class="hl-tag">&gt;</span>Drag me<span class="hl-tag">&lt;/div&gt;</span>

<span class="hl-cmt">&lt;!-- With type --&gt;</span>
<span class="hl-tag">&lt;div</span> <span class="hl-attr">drag</span>=<span class="hl-str">"task"</span> <span class="hl-attr">drag-type</span>=<span class="hl-str">"task"</span><span class="hl-tag">&gt;</span>Task<span class="hl-tag">&lt;/div&gt;</span>

<span class="hl-cmt">&lt;!-- With handle --&gt;</span>
<span class="hl-tag">&lt;div</span> <span class="hl-attr">drag</span>=<span class="hl-str">"item"</span> <span class="hl-attr">drag-handle</span>=<span class="hl-str">".grip"</span><span class="hl-tag">&gt;</span>
  <span class="hl-tag">&lt;span</span> <span class="hl-attr">class</span>=<span class="hl-str">"grip"</span><span class="hl-tag">&gt;</span>&amp;#x2801;&amp;#x2801;<span class="hl-tag">&lt;/span&gt;</span>
  <span class="hl-tag">&lt;span</span> <span class="hl-attr">bind</span>=<span class="hl-str">"item.name"</span><span class="hl-tag">&gt;&lt;/span&gt;</span>
<span class="hl-tag">&lt;/div&gt;</span>

<span class="hl-cmt">&lt;!-- Disabled state --&gt;</span>
<span class="hl-tag">&lt;div</span> <span class="hl-attr">drag</span>=<span class="hl-str">"item"</span> <span class="hl-attr">drag-disabled</span>=<span class="hl-str">"isLocked"</span><span class="hl-tag">&gt;&lt;/div&gt;</span></pre></div>
      <div class="demo-preview" state="{ fruits: ['Apple', 'Banana', 'Cherry'], bin: [] }">
        <div class="demo-result-label" t="docs.dnd.drag.preview"></div>
        <p class="text-sm text-muted mb-2" t="docs.dnd.drag.demoText"></p>
        <div style="display:flex;gap:16px;">
          <div style="flex:1;">
            <p class="text-sm" style="margin-bottom:8px;font-weight:600;" t="docs.dnd.drag.fruitsLabel"></p>
            <div style="display:flex;flex-direction:column;gap:6px;">
              <div foreach="fruit in fruits" template="dnd-fruit-tpl" style="display:contents"></div>
            </div>
          </div>
          <div style="flex:1;">
            <p class="text-sm" style="margin-bottom:8px;font-weight:600;"><span t="docs.dnd.drag.basketLabel"></span> (<span bind="bin.length"></span>)</p>
            <div drop="bin = [...bin, $drag]" drop-accept="fruit"
                 style="min-height:100px;padding:8px;border:2px dashed var(--border);border-radius:8px;display:flex;flex-direction:column;gap:6px;transition:border-color .2s;">
              <div foreach="item in bin" template="dnd-bin-tpl" style="display:contents"></div>
            </div>
          </div>
        </div>
        <template id="dnd-fruit-tpl">
          <div drag="fruit" drag-type="fruit" style="padding:8px 12px;background:var(--primary-surface);border:1px solid var(--primary);border-radius:6px;cursor:grab;font-size:0.9rem;">
            <span bind="fruit"></span>
          </div>
        </template>
        <template id="dnd-bin-tpl">
          <div style="padding:8px 12px;background:var(--success-surface);border:1px solid var(--success, #22c55e);border-radius:6px;font-size:0.9rem;">
            <span bind="item"></span>
          </div>
        </template>
      </div>
    </div>

    <table class="doc-table">
      <thead><tr><th t="docs.dnd.drag.col1"></th><th t="docs.dnd.drag.col2"></th><th t="docs.dnd.drag.col3"></th><th t="docs.dnd.drag.col4"></th></tr></thead>
      <tbody>
        <tr><td><code>drag</code></td><td>expression</td><td><em>required</em></td><td t="docs.dnd.drag.dragDesc"></td></tr>
        <tr><td><code>drag-type</code></td><td>string</td><td><code>"default"</code></td><td t="docs.dnd.drag.dragTypeDesc" t-html></td></tr>
        <tr><td><code>drag-effect</code></td><td><code>"copy"</code> | <code>"move"</code> | <code>"link"</code></td><td><code>"move"</code></td><td t="docs.dnd.drag.dragEffectDesc" t-html></td></tr>
        <tr><td><code>drag-handle</code></td><td>CSS selector</td><td>—</td><td t="docs.dnd.drag.dragHandleDesc"></td></tr>
        <tr><td><code>drag-image</code></td><td>CSS selector | <code>"none"</code></td><td>—</td><td t="docs.dnd.drag.dragImageDesc"></td></tr>
        <tr><td><code>drag-image-offset</code></td><td><code>"x,y"</code></td><td><code>"0,0"</code></td><td t="docs.dnd.drag.dragImageOffsetDesc"></td></tr>
        <tr><td><code>drag-disabled</code></td><td>expression</td><td><code>false</code></td><td t="docs.dnd.drag.dragDisabledDesc"></td></tr>
        <tr><td><code>drag-class</code></td><td>string</td><td><code>"nojs-dragging"</code></td><td t="docs.dnd.drag.dragClassDesc"></td></tr>
        <tr><td><code>drag-ghost-class</code></td><td>string</td><td>—</td><td t="docs.dnd.drag.dragGhostClassDesc"></td></tr>
        <tr><td><code>drag-group</code></td><td>string</td><td>—</td><td t="docs.dnd.drag.dragGroupDesc"></td></tr>
      </tbody>
    </table>
  </div>

  <!-- drop -->
  <div class="doc-section">
    <h2 class="doc-title" id="dnd-drop" t="docs.dnd.drop.title"></h2>
    <div class="demo-split">
      <div class="demo-code"><pre><span class="hl-cmt">&lt;!-- Basic drop zone --&gt;</span>
<span class="hl-tag">&lt;div</span> <span class="hl-attr">drop</span>=<span class="hl-str">"items = [...items, $drag]"</span>
     <span class="hl-attr">drop-accept</span>=<span class="hl-str">"task"</span><span class="hl-tag">&gt;</span>
  Drop tasks here
<span class="hl-tag">&lt;/div&gt;</span>

<span class="hl-cmt">&lt;!-- Max capacity --&gt;</span>
<span class="hl-tag">&lt;div</span> <span class="hl-attr">drop</span>=<span class="hl-str">"slots = [...slots, $drag]"</span>
     <span class="hl-attr">drop-accept</span>=<span class="hl-str">"*"</span>
     <span class="hl-attr">drop-max</span>=<span class="hl-str">"3"</span><span class="hl-tag">&gt;</span>
  Max 3 items
<span class="hl-tag">&lt;/div&gt;</span></pre></div>
      <div class="demo-preview" state="{ colors: ['Red', 'Blue', 'Green', 'Yellow'], zone1: [], zone2: [] }">
        <div class="demo-result-label" t="docs.dnd.drop.preview"></div>
        <p class="text-sm text-muted mb-2" t="docs.dnd.drop.demoText"></p>
        <div style="display:flex;flex-direction:column;gap:6px;margin-bottom:12px;">
          <div foreach="color in colors" template="dnd-color-tpl" style="display:contents"></div>
        </div>
        <div style="display:flex;gap:12px;">
          <div style="flex:1;">
            <p class="text-sm" style="margin-bottom:6px;font-weight:600;" t="docs.dnd.drop.zoneALabel"></p>
            <div drop="zone1 = [...zone1, $drag]" drop-accept="color"
                 style="min-height:80px;padding:8px;border:2px dashed var(--border);border-radius:8px;display:flex;flex-direction:column;gap:4px;">
              <div foreach="c in zone1" template="dnd-dropped-color" style="display:contents"></div>
            </div>
          </div>
          <div style="flex:1;">
            <p class="text-sm" style="margin-bottom:6px;font-weight:600;" t="docs.dnd.drop.zoneBLabel"></p>
            <div drop="zone2 = [...zone2, $drag]" drop-accept="color" drop-max="2"
                 style="min-height:80px;padding:8px;border:2px dashed var(--border);border-radius:8px;display:flex;flex-direction:column;gap:4px;">
              <div foreach="c in zone2" template="dnd-dropped-color" style="display:contents"></div>
            </div>
          </div>
        </div>
        <template id="dnd-color-tpl">
          <div drag="color" drag-type="color" style="padding:6px 12px;background:var(--primary-surface);border:1px solid var(--primary);border-radius:6px;cursor:grab;font-size:0.9rem;">
            <span bind="color"></span>
          </div>
        </template>
        <template id="dnd-dropped-color">
          <div style="padding:6px 10px;background:var(--success-surface);border:1px solid var(--success, #22c55e);border-radius:6px;font-size:0.85rem;">
            <span bind="c"></span>
          </div>
        </template>
      </div>
    </div>

    <table class="doc-table">
      <thead><tr><th t="docs.dnd.drop.col1"></th><th t="docs.dnd.drop.col2"></th><th t="docs.dnd.drop.col3"></th><th t="docs.dnd.drop.col4"></th></tr></thead>
      <tbody>
        <tr><td><code>drop</code></td><td>statement</td><td><em>required</em></td><td t="docs.dnd.drop.dropDesc"></td></tr>
        <tr><td><code>drop-accept</code></td><td>string</td><td><code>"default"</code></td><td t="docs.dnd.drop.dropAcceptDesc" t-html></td></tr>
        <tr><td><code>drop-effect</code></td><td><code>"copy"</code> | <code>"move"</code> | <code>"link"</code></td><td><code>"move"</code></td><td t="docs.dnd.drop.dropEffectDesc" t-html></td></tr>
        <tr><td><code>drop-class</code></td><td>string</td><td><code>"nojs-drag-over"</code></td><td t="docs.dnd.drop.dropClassDesc"></td></tr>
        <tr><td><code>drop-reject-class</code></td><td>string</td><td><code>"nojs-drop-reject"</code></td><td t="docs.dnd.drop.dropRejectClassDesc"></td></tr>
        <tr><td><code>drop-disabled</code></td><td>expression</td><td><code>false</code></td><td t="docs.dnd.drop.dropDisabledDesc"></td></tr>
        <tr><td><code>drop-max</code></td><td>expression (number)</td><td><code>Infinity</code></td><td t="docs.dnd.drop.dropMaxDesc"></td></tr>
        <tr><td><code>drop-sort</code></td><td><code>"vertical"</code> | <code>"horizontal"</code> | <code>"grid"</code></td><td>—</td><td t="docs.dnd.drop.dropSortDesc"></td></tr>
        <tr><td><code>drop-placeholder</code></td><td>template ID | <code>"auto"</code></td><td>—</td><td t="docs.dnd.drop.dropPlaceholderDesc"></td></tr>
        <tr><td><code>drop-placeholder-class</code></td><td>string</td><td><code>"nojs-drop-placeholder"</code></td><td t="docs.dnd.drop.dropPlaceholderClassDesc"></td></tr>
        <tr><td><code>drop-settle-class</code></td><td>string</td><td><code>"nojs-drop-settle"</code></td><td t="docs.dnd.drop.dropSettleClassDesc"></td></tr>
        <tr><td><code>drop-empty-class</code></td><td>string</td><td><code>"nojs-drag-list-empty"</code></td><td t="docs.dnd.drop.dropEmptyClassDesc"></td></tr>
      </tbody>
    </table>
  </div>

  <!-- drag-list -->
  <div class="doc-section">
    <h2 class="doc-title" id="dnd-drag-list" t="docs.dnd.dragList.title"></h2>
    <p class="doc-text" t="docs.dnd.dragList.text" t-html></p>
    <div class="demo-split">
      <div class="demo-code"><pre><span class="hl-tag">&lt;div</span> <span class="hl-attr">state</span>=<span class="hl-str">"{ todo: [...], done: [] }"</span><span class="hl-tag">&gt;</span>
  <span class="hl-cmt">&lt;!-- To Do --&gt;</span>
  <span class="hl-tag">&lt;div</span> <span class="hl-attr">drag-list</span>=<span class="hl-str">"todo"</span>
       <span class="hl-attr">template</span>=<span class="hl-str">"task-tpl"</span>
       <span class="hl-attr">drag-list-key</span>=<span class="hl-str">"id"</span>
       <span class="hl-attr">drag-type</span>=<span class="hl-str">"task"</span>
       <span class="hl-attr">drop-accept</span>=<span class="hl-str">"task"</span>
       <span class="hl-attr">drop-sort</span>=<span class="hl-str">"vertical"</span>
       <span class="hl-attr">drop-placeholder</span>=<span class="hl-str">"auto"</span>
       <span class="hl-attr">drag-list-remove</span><span class="hl-tag">&gt;</span>
  <span class="hl-tag">&lt;/div&gt;</span>

  <span class="hl-cmt">&lt;!-- Done --&gt;</span>
  <span class="hl-tag">&lt;div</span> <span class="hl-attr">drag-list</span>=<span class="hl-str">"done"</span>
       <span class="hl-attr">template</span>=<span class="hl-str">"task-tpl"</span>
       <span class="hl-attr">drag-list-key</span>=<span class="hl-str">"id"</span>
       <span class="hl-attr">drag-type</span>=<span class="hl-str">"task"</span>
       <span class="hl-attr">drop-accept</span>=<span class="hl-str">"task"</span>
       <span class="hl-attr">drop-sort</span>=<span class="hl-str">"vertical"</span>
       <span class="hl-attr">drop-placeholder</span>=<span class="hl-str">"auto"</span>
       <span class="hl-attr">drag-list-remove</span><span class="hl-tag">&gt;</span>
  <span class="hl-tag">&lt;/div&gt;</span>
<span class="hl-tag">&lt;/div&gt;</span>

<span class="hl-tag">&lt;template</span> <span class="hl-attr">id</span>=<span class="hl-str">"task-tpl"</span><span class="hl-tag">&gt;</span>
  <span class="hl-tag">&lt;div</span> <span class="hl-attr">class</span>=<span class="hl-str">"card"</span><span class="hl-tag">&gt;</span>
    <span class="hl-tag">&lt;span</span> <span class="hl-attr">bind</span>=<span class="hl-str">"item.title"</span><span class="hl-tag">&gt;&lt;/span&gt;</span>
  <span class="hl-tag">&lt;/div&gt;</span>
<span class="hl-tag">&lt;/template&gt;</span></pre></div>
      <div class="demo-preview" state="{ todo: [{id:1,title:'Design mockup'},{id:2,title:'Write tests'},{id:3,title:'Deploy v2'}], done: [] }">
        <div class="demo-result-label" t="docs.dnd.dragList.preview"></div>
        <div style="display:flex;gap:16px;">
          <div style="flex:1;">
            <p class="text-sm" style="margin-bottom:8px;font-weight:600;"><span t="docs.dnd.dragList.todoLabel"></span> (<span bind="todo.length"></span>)</p>
            <div drag-list="todo" template="demo-task-tpl" drag-list-key="id" drag-type="task" drop-accept="task" drop-sort="vertical" drag-list-remove drop-placeholder="auto"
                 style="min-height:40px;padding:8px;border:1px solid var(--border);border-radius:8px;display:flex;flex-direction:column;gap:6px;">
            </div>
          </div>
          <div style="flex:1;">
            <p class="text-sm" style="margin-bottom:8px;font-weight:600;"><span t="docs.dnd.dragList.doneLabel"></span> (<span bind="done.length"></span>)</p>
            <div drag-list="done" template="demo-task-tpl" drag-list-key="id" drag-type="task" drop-accept="task" drop-sort="vertical" drag-list-remove drop-placeholder="auto"
                 style="min-height:40px;padding:8px;border:1px solid var(--border);border-radius:8px;display:flex;flex-direction:column;gap:6px;">
            </div>
          </div>
        </div>
        <template id="demo-task-tpl">
          <div style="padding:8px 12px;background:var(--primary-surface);border:1px solid var(--primary);border-radius:6px;cursor:grab;font-size:0.9rem;">
            <span bind="item.title"></span>
          </div>
        </template>
      </div>
    </div>

    <table class="doc-table">
      <thead><tr><th t="docs.dnd.dragList.col1"></th><th t="docs.dnd.dragList.col2"></th><th t="docs.dnd.dragList.col3"></th><th t="docs.dnd.dragList.col4"></th></tr></thead>
      <tbody>
        <tr><td><code>drag-list</code></td><td>path</td><td><em>required</em></td><td t="docs.dnd.dragList.dragListDesc"></td></tr>
        <tr><td><code>template</code></td><td>template ID</td><td>—</td><td t="docs.dnd.dragList.templateDesc"></td></tr>
        <tr><td><code>drag-list-key</code></td><td>property name</td><td>—</td><td t="docs.dnd.dragList.dragListKeyDesc"></td></tr>
        <tr><td><code>drag-list-item</code></td><td>variable name</td><td><code>"item"</code></td><td t="docs.dnd.dragList.dragListItemDesc"></td></tr>
        <tr><td><code>drop-sort</code></td><td><code>"vertical"</code> | <code>"horizontal"</code> | <code>"grid"</code></td><td><code>"vertical"</code></td><td t="docs.dnd.dragList.dropSortDesc"></td></tr>
        <tr><td><code>drop-accept</code></td><td>string</td><td><em>self</em></td><td t="docs.dnd.dragList.dropAcceptDesc"></td></tr>
        <tr><td><code>drag-list-copy</code></td><td>boolean attr</td><td>—</td><td t="docs.dnd.dragList.dragListCopyDesc"></td></tr>
        <tr><td><code>drag-list-remove</code></td><td>boolean attr</td><td>—</td><td t="docs.dnd.dragList.dragListRemoveDesc"></td></tr>
        <tr><td><code>drag-disabled</code></td><td>expression</td><td><code>false</code></td><td t="docs.dnd.dragList.dragDisabledDesc"></td></tr>
        <tr><td><code>drop-disabled</code></td><td>expression</td><td><code>false</code></td><td t="docs.dnd.dragList.dropDisabledDesc"></td></tr>
        <tr><td><code>drop-max</code></td><td>expression (number)</td><td><code>Infinity</code></td><td t="docs.dnd.dragList.dropMaxDesc"></td></tr>
        <tr><td><code>drop-settle-class</code></td><td>string</td><td><code>"nojs-drop-settle"</code></td><td t="docs.dnd.dragList.dropSettleClassDesc"></td></tr>
        <tr><td><code>drop-empty-class</code></td><td>string</td><td><code>"nojs-drag-list-empty"</code></td><td t="docs.dnd.dragList.dropEmptyClassDesc"></td></tr>
        <tr><td><code>drop-placeholder</code></td><td>template ID | <code>"auto"</code></td><td>—</td><td t="docs.dnd.dragList.dropPlaceholderDesc"></td></tr>
      </tbody>
    </table>
  </div>

  <!-- drag-list events -->
  <div class="doc-section">
    <h2 class="doc-title" id="dnd-drag-list-events" t="docs.dnd.dragListEvents.title"></h2>
    <table class="doc-table">
      <thead><tr><th t="docs.dnd.dragListEvents.col1"></th><th><code>$event.detail</code></th><th t="docs.dnd.dragListEvents.col3"></th></tr></thead>
      <tbody>
        <tr><td><code>on:reorder</code></td><td><code>{ list, item, from, to }</code></td><td t="docs.dnd.dragListEvents.reorderDesc"></td></tr>
        <tr><td><code>on:receive</code></td><td><code>{ list, item, from, fromList }</code></td><td t="docs.dnd.dragListEvents.receiveDesc"></td></tr>
        <tr><td><code>on:remove</code></td><td><code>{ list, item, index }</code></td><td t="docs.dnd.dragListEvents.removeDesc"></td></tr>
      </tbody>
    </table>
    <div class="demo-split">
      <div class="demo-code"><pre><span class="hl-tag">&lt;div</span> <span class="hl-attr">drag-list</span>=<span class="hl-str">"tasks"</span>
     <span class="hl-attr">template</span>=<span class="hl-str">"tpl"</span>
     <span class="hl-attr">on:reorder</span>=<span class="hl-str">"log = 'Reordered #' + $event.detail.from + ' → #' + $event.detail.to"</span>
     <span class="hl-attr">on:receive</span>=<span class="hl-str">"log = 'Received: ' + $event.detail.item.title"</span>
     <span class="hl-attr">on:remove</span>=<span class="hl-str">"log = 'Removed #' + $event.detail.index"</span><span class="hl-tag">&gt;</span>
<span class="hl-tag">&lt;/div&gt;</span></pre></div>
      <div class="demo-preview" state="{ inbox: [{id:1,title:'Bug report'},{id:2,title:'Feature req'},{id:3,title:'Refactor'}], archive: [], log: 'Reorder or move items to see events' }">
        <div class="demo-result-label" t="docs.dnd.dragListEvents.preview"></div>
        <div style="display:flex;gap:16px;">
          <div style="flex:1;">
            <p class="text-sm" style="margin-bottom:8px;font-weight:600;"><span t="docs.dnd.dragListEvents.inboxLabel"></span> (<span bind="inbox.length"></span>)</p>
            <div drag-list="inbox" template="evt-task-tpl" drag-list-key="id" drag-type="evt-task" drop-accept="evt-task" drop-sort="vertical" drag-list-remove drop-placeholder="auto"
                 on:reorder="log = '↕ Reordered #' + $event.detail.from + ' → #' + $event.detail.to"
                 on:remove="log = '✗ Removed: ' + $event.detail.item.title"
                 style="min-height:40px;padding:8px;border:1px solid var(--border);border-radius:8px;display:flex;flex-direction:column;gap:6px;">
            </div>
          </div>
          <div style="flex:1;">
            <p class="text-sm" style="margin-bottom:8px;font-weight:600;"><span t="docs.dnd.dragListEvents.archiveLabel"></span> (<span bind="archive.length"></span>)</p>
            <div drag-list="archive" template="evt-task-tpl" drag-list-key="id" drag-type="evt-task" drop-accept="evt-task" drop-sort="vertical" drag-list-remove drop-placeholder="auto"
                 on:receive="log = '✓ Received: ' + $event.detail.item.title"
                 on:reorder="log = '↕ Archive reordered #' + $event.detail.from + ' → #' + $event.detail.to"
                 style="min-height:40px;padding:8px;border:1px solid var(--border);border-radius:8px;display:flex;flex-direction:column;gap:6px;">
            </div>
          </div>
        </div>
        <div style="margin-top:12px;padding:8px 12px;background:var(--code-bg, #f4f5f7);border-radius:6px;font-family:monospace;font-size:0.85rem;color:var(--text-dim);">
          <span style="opacity:0.5;" t="docs.dnd.dragListEvents.eventLogLabel"></span> <span bind="log"></span>
        </div>
        <template id="evt-task-tpl">
          <div style="padding:8px 12px;background:var(--primary-surface);border:1px solid var(--primary);border-radius:6px;cursor:grab;font-size:0.9rem;">
            <span bind="item.title"></span>
          </div>
        </template>
      </div>
    </div>
  </div>

  <!-- drag-multiple -->
  <div class="doc-section">
    <h2 class="doc-title" id="dnd-drag-multiple" t="docs.dnd.dragMultiple.title"></h2>
    <p class="doc-text" t="docs.dnd.dragMultiple.text"></p>
    <div class="demo-split">
      <div class="demo-code"><pre><span class="hl-tag">&lt;div</span> <span class="hl-attr">drag</span>=<span class="hl-str">"card"</span>
     <span class="hl-attr">drag-type</span>=<span class="hl-str">"card"</span>
     <span class="hl-attr">drag-group</span>=<span class="hl-str">"kanban"</span>
     <span class="hl-attr">drag-multiple</span><span class="hl-tag">&gt;</span>
  <span class="hl-tag">&lt;span</span> <span class="hl-attr">bind</span>=<span class="hl-str">"card.title"</span><span class="hl-tag">&gt;&lt;/span&gt;</span>
<span class="hl-tag">&lt;/div&gt;</span></pre></div>
      <div class="demo-preview" state="{ items: ['Alpha', 'Beta', 'Gamma', 'Delta', 'Epsilon'], collected: [] }">
        <div class="demo-result-label" t="docs.dnd.dragMultiple.preview"></div>
        <style>
          .sel-demo-item { padding:8px 12px;background:var(--primary-surface);border:1px solid var(--primary);border-radius:6px;cursor:pointer;font-size:0.9rem;transition:all .15s;user-select:none; }
          .sel-demo-item:hover { background:color-mix(in srgb, var(--primary) 15%, transparent); }
          .sel-demo-selected { background:var(--primary) !important;color:#fff !important;border-color:var(--primary) !important; }
        </style>
        <p class="text-sm text-muted mb-2" t="docs.dnd.dragMultiple.demoText" t-html></p>
        <div style="display:flex;gap:16px;">
          <div style="flex:1;">
            <p class="text-sm" style="margin-bottom:8px;font-weight:600;" t="docs.dnd.dragMultiple.availableLabel"></p>
            <div style="display:flex;flex-direction:column;gap:6px;">
              <div foreach="card in items" template="sel-card-tpl" style="display:contents"></div>
            </div>
          </div>
          <div style="flex:1;">
            <p class="text-sm" style="margin-bottom:8px;font-weight:600;"><span t="docs.dnd.dragMultiple.collectedLabel"></span> (<span bind="collected.length"></span>)</p>
            <div drop="collected = [...collected, ...(Array.isArray($drag) ? $drag : [$drag])]" drop-accept="sel-card"
                 style="min-height:100px;padding:8px;border:2px dashed var(--border);border-radius:8px;display:flex;flex-direction:column;gap:6px;">
              <div foreach="c in collected" template="sel-collected-tpl" style="display:contents"></div>
            </div>
          </div>
        </div>
        <template id="sel-card-tpl">
          <div class="sel-demo-item" drag="card" drag-type="sel-card" drag-group="sel-demo" drag-multiple drag-multiple-class="sel-demo-selected">
            <span bind="card"></span>
          </div>
        </template>
        <template id="sel-collected-tpl">
          <div style="padding:6px 10px;background:var(--success-surface);border:1px solid var(--success, #22c55e);border-radius:6px;font-size:0.85rem;">
            <span bind="c"></span>
          </div>
        </template>
      </div>
    </div>

    <table class="doc-table">
      <thead><tr><th t="docs.dnd.dragMultiple.col1"></th><th t="docs.dnd.dragMultiple.col2"></th><th t="docs.dnd.dragMultiple.col3"></th></tr></thead>
      <tbody>
        <tr><td><code>drag-multiple</code></td><td>—</td><td t="docs.dnd.dragMultiple.dragMultipleDesc"></td></tr>
        <tr><td><code>drag-multiple-class</code></td><td><code>"nojs-selected"</code></td><td t="docs.dnd.dragMultiple.dragMultipleClassDesc"></td></tr>
        <tr><td><code>drag-group</code></td><td><em>required</em></td><td t="docs.dnd.dragMultiple.dragGroupDesc"></td></tr>
      </tbody>
    </table>

    <p class="doc-text" style="margin-top:12px;" t="docs.dnd.dragMultiple.selectionTitle"></p>
    <table class="doc-table">
      <thead><tr><th t="docs.dnd.dragMultiple.selCol1"></th><th t="docs.dnd.dragMultiple.selCol2"></th></tr></thead>
      <tbody>
        <tr><td t="docs.dnd.dragMultiple.selClick"></td><td t="docs.dnd.dragMultiple.selClickResult"></td></tr>
        <tr><td t="docs.dnd.dragMultiple.selCtrlClick"></td><td t="docs.dnd.dragMultiple.selCtrlClickResult"></td></tr>
        <tr><td t="docs.dnd.dragMultiple.selEscape"></td><td t="docs.dnd.dragMultiple.selEscapeResult"></td></tr>
        <tr><td t="docs.dnd.dragMultiple.selDrag"></td><td t="docs.dnd.dragMultiple.selDragResult" t-html></td></tr>
      </tbody>
    </table>
  </div>

  <!-- implicit variables -->
  <div class="doc-section">
    <h2 class="doc-title" id="dnd-implicit-vars" t="docs.dnd.implicitVars.title"></h2>
    <p class="doc-text" t="docs.dnd.implicitVars.text" t-html></p>
    <table class="doc-table">
      <thead><tr><th t="docs.dnd.implicitVars.col1"></th><th t="docs.dnd.implicitVars.col2"></th><th t="docs.dnd.implicitVars.col3"></th></tr></thead>
      <tbody>
        <tr><td><code>$drag</code></td><td>any</td><td t="docs.dnd.implicitVars.dragDesc"></td></tr>
        <tr><td><code>$dragType</code></td><td>string</td><td t="docs.dnd.implicitVars.dragTypeDesc" t-html></td></tr>
        <tr><td><code>$dragEffect</code></td><td>string</td><td t="docs.dnd.implicitVars.dragEffectDesc" t-html></td></tr>
        <tr><td><code>$dropIndex</code></td><td>number</td><td t="docs.dnd.implicitVars.dropIndexDesc"></td></tr>
        <tr><td><code>$source</code></td><td>object | null</td><td t="docs.dnd.implicitVars.sourceDesc" t-html></td></tr>
        <tr><td><code>$target</code></td><td>object | null</td><td t="docs.dnd.implicitVars.targetDesc" t-html></td></tr>
      </tbody>
    </table>
    <div class="demo-split">
      <div class="demo-code"><pre><span class="hl-cmt">&lt;!-- Inspect implicit variables --&gt;</span>
<span class="hl-tag">&lt;div</span> <span class="hl-attr">drop</span>=<span class="hl-str">"info = 'Value: ' + $drag
  + ' | Type: ' + $dragType
  + ' | Effect: ' + $dragEffect"</span>
     <span class="hl-attr">drop-accept</span>=<span class="hl-str">"*"</span><span class="hl-tag">&gt;</span>
  Drop here to inspect
<span class="hl-tag">&lt;/div&gt;</span></pre></div>
      <div class="demo-preview" state="{ info: 'Drop an item here to see its implicit variables', items: [{v:'File', t:'doc'}, {v:'Image', t:'media'}, {v:'Link', t:'link'}] }">
        <div class="demo-result-label" t="docs.dnd.implicitVars.preview"></div>
        <p class="text-sm text-muted mb-2" t="docs.dnd.implicitVars.demoText" t-html></p>
        <div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:12px;">
          <div foreach="it in items" template="iv-item-tpl" style="display:contents"></div>
        </div>
        <div drop="info = '📦 $drag = ' + $drag + '\n📝 $dragType = ' + $dragType + '\n🔧 $dragEffect = ' + $dragEffect" drop-accept="*"
             style="min-height:60px;padding:12px;border:2px dashed var(--border);border-radius:8px;text-align:center;color:var(--text-dim);" t="docs.dnd.implicitVars.dropHere">
          Drop here to inspect
        </div>
        <div style="margin-top:10px;padding:10px 12px;background:var(--code-bg, #f4f5f7);border-radius:6px;font-family:monospace;font-size:0.85rem;white-space:pre-line;color:var(--text-dim);min-height:40px;">
          <span bind="info"></span>
        </div>
        <template id="iv-item-tpl">
          <div drag="it.v" drag-type="it.t" style="padding:6px 14px;background:var(--primary-surface);border:1px solid var(--primary);border-radius:6px;cursor:grab;font-size:0.9rem;">
            <span bind="it.v"></span>
            <span style="opacity:0.5;font-size:0.75rem;margin-left:4px;" bind="'(' + it.t + ')'"></span>
          </div>
        </template>
      </div>
    </div>
  </div>

  <!-- CSS classes -->
  <div class="doc-section">
    <h2 class="doc-title" id="dnd-css-classes" t="docs.dnd.cssClasses.title"></h2>
    <p class="doc-text" t="docs.dnd.cssClasses.text"></p>
    <table class="doc-table">
      <thead><tr><th t="docs.dnd.cssClasses.col1"></th><th t="docs.dnd.cssClasses.col2"></th></tr></thead>
      <tbody>
        <tr><td><code>.nojs-dragging</code></td><td t="docs.dnd.cssClasses.draggingDesc"></td></tr>
        <tr><td><code>.nojs-drag-over</code></td><td t="docs.dnd.cssClasses.dragOverDesc"></td></tr>
        <tr><td><code>.nojs-drop-reject</code></td><td t="docs.dnd.cssClasses.dropRejectDesc"></td></tr>
        <tr><td><code>.nojs-drop-placeholder</code></td><td t="docs.dnd.cssClasses.dropPlaceholderDesc"></td></tr>
        <tr><td><code>.nojs-selected</code></td><td t="docs.dnd.cssClasses.selectedDesc"></td></tr>
        <tr><td><code>.nojs-drop-settle</code></td><td t="docs.dnd.cssClasses.dropSettleDesc"></td></tr>
        <tr><td><code>.nojs-drag-list-empty</code></td><td t="docs.dnd.cssClasses.dragListEmptyDesc" t-html></td></tr>
      </tbody>
    </table>
    <div class="demo-split">
      <div class="demo-code"><pre><span class="hl-cmt">&lt;!-- Style the automatic classes --&gt;</span>
<span class="hl-tag">&lt;style&gt;</span>
  <span class="hl-attr">.nojs-dragging</span>  { <span class="hl-str">opacity: 0.4;</span> }
  <span class="hl-attr">.nojs-drag-over</span> { <span class="hl-str">border-color: var(--primary);</span>
                     <span class="hl-str">background: color-mix(...);</span> }
  <span class="hl-attr">.nojs-drop-reject</span> { <span class="hl-str">outline: 2px dashed var(--danger);</span> }
  <span class="hl-attr">.nojs-selected</span>  { <span class="hl-str">outline: 2px solid var(--primary);</span> }
<span class="hl-tag">&lt;/style&gt;</span></pre></div>
      <div class="demo-preview" state="{ cssItems: ['Drag me!', 'Try me too!'], cssBin: [] }">
        <div class="demo-result-label" t="docs.dnd.cssClasses.preview"></div>
        <style>
          .css-demo-item.nojs-dragging { opacity:0.4;transform:scale(0.95); }
          .css-demo-zone.nojs-drag-over { border-color:var(--primary) !important;background:color-mix(in srgb, var(--primary) 8%, transparent) !important; }
          .css-demo-zone.nojs-drop-reject { border-color:var(--danger, #ef4444) !important;background:color-mix(in srgb, var(--danger, #ef4444) 6%, transparent) !important; }
        </style>
        <p class="text-sm text-muted mb-2" t="docs.dnd.cssClasses.demoText"></p>
        <div style="display:flex;flex-direction:column;gap:6px;margin-bottom:12px;">
          <div foreach="ci in cssItems" template="css-item-tpl" style="display:contents"></div>
        </div>
        <div class="css-demo-zone" drop="cssBin = [...cssBin, $drag]" drop-accept="css-demo" drop-max="2"
             style="min-height:60px;padding:10px;border:2px dashed var(--border);border-radius:8px;display:flex;flex-direction:column;gap:4px;transition:all .2s;">
          <span style="color:var(--text-dim);font-size:0.85rem;" show="cssBin.length === 0" t="docs.dnd.cssClasses.dropZoneHint" t-html></span>
          <div foreach="ci in cssBin" template="css-dropped-tpl" style="display:contents"></div>
        </div>
        <template id="css-item-tpl">
          <div class="css-demo-item" drag="ci" drag-type="css-demo" style="padding:8px 12px;background:var(--primary-surface);border:1px solid var(--primary);border-radius:6px;cursor:grab;font-size:0.9rem;transition:all .2s;">
            <span bind="ci"></span>
          </div>
        </template>
        <template id="css-dropped-tpl">
          <div style="padding:6px 10px;background:var(--success-surface);border:1px solid var(--success, #22c55e);border-radius:6px;font-size:0.85rem;">
            <span bind="ci"></span>
          </div>
        </template>
      </div>
    </div>
  </div>

  <!-- accessibility -->
  <div class="doc-section">
    <h2 class="doc-title" id="dnd-a11y" t="docs.dnd.a11y.title"></h2>
    <p class="doc-text" t="docs.dnd.a11y.text"></p>
    <table class="doc-table">
      <thead><tr><th t="docs.dnd.a11y.col1"></th><th t="docs.dnd.a11y.col2"></th></tr></thead>
      <tbody>
        <tr><td><code>draggable="true"</code></td><td t="docs.dnd.a11y.draggableDesc"></td></tr>
        <tr><td><code>aria-grabbed</code></td><td t="docs.dnd.a11y.ariaGrabbedDesc" t-html></td></tr>
        <tr><td><code>aria-dropeffect</code></td><td t="docs.dnd.a11y.ariaDropeffectDesc"></td></tr>
        <tr><td><code>role="listbox"</code></td><td t="docs.dnd.a11y.roleListboxDesc" t-html></td></tr>
        <tr><td><code>role="option"</code></td><td t="docs.dnd.a11y.roleOptionDesc" t-html></td></tr>
        <tr><td><code>tabindex="0"</code></td><td t="docs.dnd.a11y.tabindexDesc"></td></tr>
      </tbody>
    </table>
    <p class="doc-text" style="margin-top:12px;" t="docs.dnd.a11y.keyboardTitle"></p>
    <table class="doc-table">
      <thead><tr><th t="docs.dnd.a11y.keyCol1"></th><th t="docs.dnd.a11y.keyCol2"></th></tr></thead>
      <tbody>
        <tr><td><kbd>Space</kbd></td><td t="docs.dnd.a11y.spaceDesc"></td></tr>
        <tr><td><kbd>Escape</kbd></td><td t="docs.dnd.a11y.escapeDesc"></td></tr>
        <tr><td><kbd>Arrow keys</kbd></td><td t="docs.dnd.a11y.arrowDesc"></td></tr>
        <tr><td><kbd>Enter</kbd></td><td t="docs.dnd.a11y.enterDesc"></td></tr>
      </tbody>
    </table>
    <div class="demo-split">
      <div class="demo-code"><pre><span class="hl-cmt">&lt;!-- Keyboard-accessible list --&gt;</span>
<span class="hl-cmt">&lt;!-- ARIA attrs are added automatically --&gt;</span>
<span class="hl-tag">&lt;div</span> <span class="hl-attr">drag-list</span>=<span class="hl-str">"items"</span>
     <span class="hl-attr">template</span>=<span class="hl-str">"tpl"</span>
     <span class="hl-attr">drop-sort</span>=<span class="hl-str">"vertical"</span><span class="hl-tag">&gt;</span>
<span class="hl-tag">&lt;/div&gt;</span>

<span class="hl-cmt">&lt;!-- Each item gets: --&gt;</span>
<span class="hl-cmt">&lt;!--   draggable="true"   --&gt;</span>
<span class="hl-cmt">&lt;!--   aria-grabbed="false" --&gt;</span>
<span class="hl-cmt">&lt;!--   tabindex="0"        --&gt;</span>
<span class="hl-cmt">&lt;!--   role="option"       --&gt;</span></pre></div>
      <div class="demo-preview" state="{ a11yItems: [{id:1,title:'First item'},{id:2,title:'Second item'},{id:3,title:'Third item'},{id:4,title:'Fourth item'}] }">
        <div class="demo-result-label" t="docs.dnd.a11y.preview"></div>
        <p class="text-sm text-muted mb-2" t="docs.dnd.a11y.demoText" t-html></p>
        <div drag-list="a11yItems" template="a11y-item-tpl" drag-list-key="id" drop-sort="vertical" drop-placeholder="auto"
             style="padding:8px;border:1px solid var(--border);border-radius:8px;display:flex;flex-direction:column;gap:6px;">
        </div>
        <template id="a11y-item-tpl">
          <div style="padding:8px 12px;background:var(--primary-surface);border:1px solid var(--primary);border-radius:6px;cursor:grab;font-size:0.9rem;">
            <span bind="item.title"></span>
          </div>
        </template>
      </div>
    </div>
  </div>

</div>
