<!-- Playground Page — Interactive NoJS sandbox -->
<div class="playground-page" i18n-ns="playground"
     state="{
       files: {},
       openTabs: ['kanban.html'],
       activeFile: 'kanban.html',
       tabScrollPositions: {},
       history: [],
       historyIndex: -1,
       consoleLines: [],
       showConsole: true
     }">
<style>
/* ═══ PLAYGROUND (self-contained — window chrome design) ═══ */

.playground-page {
  display: flex;
  flex-direction: column;
}
.playground-page .page-body {
  max-width: 1280px;
  margin: 0 auto;
  width: 100%;
}

/* ── File selector pills ── */
.pg-file-selector {
  display: flex;
  justify-content: center;
  gap: 0.5rem;
  padding: 1.5rem 1rem;
  flex-wrap: wrap;
}
.pg-file-pill {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  padding: 0.4rem 1rem;
  border: 1px solid var(--border-color);
  border-radius: 999px;
  background: transparent;
  color: var(--text-muted);
  font-family: var(--font-mono);
  font-size: 13px;
  cursor: pointer;
  transition: all 0.2s ease;
  white-space: nowrap;
}
.pg-file-pill:hover {
  color: var(--text-primary);
  border-color: var(--text-secondary);
  background: rgba(255, 255, 255, 0.03);
}
.pg-file-pill.active {
  color: var(--accent-blue);
  border-color: var(--accent-blue);
  background: rgba(37, 99, 235, 0.08);
}
.pg-file-pill-icon {
  font-size: 11px;
  font-weight: 700;
  opacity: 0.7;
  flex-shrink: 0;
}
.pg-file-pill.active .pg-file-pill-icon {
  opacity: 1;
}
.pg-file-pill-add {
  padding: 0.4rem 0.75rem;
  font-size: 16px;
  line-height: 1;
}
.pg-file-pill:hover .pg-pill-close {
  opacity: 1;
}

/* ── Window chrome (shared) ── */
.pg-window {
  background-color: #0d0f14;
  border: 1px solid var(--border-color);
  border-radius: 0.75rem;
  overflow: hidden;
  box-shadow: 0 20px 40px rgba(0, 0, 0, 0.6),
              0 1px 0 rgba(255, 255, 255, 0.05) inset;
}
.pg-window-header {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.75rem 1rem;
  border-bottom: 1px solid var(--border-color);
  background-color: rgba(13, 15, 20, 0.7);
  position: relative;
}
.pg-dot { width: 0.75rem; height: 0.75rem; border-radius: 50%; flex-shrink: 0; }
.pg-dot-red { background-color: #ff5f57; }
.pg-dot-yellow { background-color: #febc2e; }
.pg-dot-green { background-color: #28c840; }
.pg-window-title {
  position: absolute;
  left: 50%;
  transform: translateX(-50%);
  font-family: var(--font-mono);
  font-size: 13px;
  color: var(--text-secondary);
  white-space: nowrap;
  pointer-events: none;
}
.pg-window-actions {
  margin-left: auto;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  position: relative;
  z-index: 1;
}
.pg-window-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.35rem;
  padding: 3px 8px;
  border: 1px solid var(--border-color);
  border-radius: 5px;
  font-size: 12px;
  font-family: var(--font-sans);
  background: transparent;
  color: var(--text-muted);
  cursor: pointer;
  transition: all 0.15s;
}
.pg-window-btn:hover {
  color: var(--text-primary);
  background: rgba(255, 255, 255, 0.05);
}
.pg-window-body {
  position: relative;
}

/* ── Two-column layout ── */
.pg-columns {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1rem;
  padding: 0 1rem;
}

/* ── Code Editor window ── */
.pg-editor-body.editor-body {
  position: relative;
  height: 440px;
  overflow: auto;
  font-family: var(--font-mono);
  font-size: 13px;
  line-height: 1.6;
}
.line-numbers {
  position: absolute;
  left: 0;
  top: 0;
  width: 48px;
  padding: 12px 8px 12px 0;
  text-align: right;
  color: #475569;
  font-size: 13px;
  line-height: 1.6;
  white-space: pre;
  user-select: none;
  pointer-events: none;
}
.code-editor {
  position: absolute;
  inset: 0;
  margin: 0;
  padding: 0;
  background: transparent;
  font: inherit;
  line-height: inherit;
}
.code-editable {
  display: block;
  padding: 12px 16px 12px 56px;
  min-height: 100%;
  background: transparent;
  color: var(--text-primary);
  border: none;
  outline: none;
  font: inherit;
  line-height: inherit;
  tab-size: 2;
  white-space: pre;
  overflow: auto;
  caret-color: var(--accent-blue);
  word-wrap: normal;
  overflow-wrap: normal;
}

/* Syntax highlighting */
.code-editable .hl-tag  { color: #7DD3FC; }
.code-editable .hl-attr { color: #C084FC; }
.code-editable .hl-str  { color: #86EFAC; }
.code-editable .hl-cmt  { color: #64748B; font-style: italic; }
.code-editable .hl-kw   { color: #F472B6; }
.code-editable .hl-fn   { color: #FCD34D; }
.code-editable .hl-op   { color: #94A3B8; }
.code-editable .hl-num  { color: #FB923C; }

/* ── Preview window ── */
.pg-preview-body {
  height: 440px;
  overflow: hidden;
  background: #0f1117;
}
.preview-iframe {
  width: 100%;
  height: 100%;
  border: none;
  background: #0f1117;
}

/* ── Console window ── */
.pg-console-wrap {
  padding: 1rem 1rem 2rem;
}
.pg-console-body.console-body {
  max-height: 120px;
  overflow-y: auto;
  padding: 4px 0;
  font-family: var(--font-mono);
  font-size: 11px;
}
.console-line {
  display: flex;
  gap: 6px;
  padding: 2px 10px;
  color: var(--text-muted);
  border-bottom: 1px solid rgba(255, 255, 255, 0.04);
}
.console-line.warn  { color: #EAB308; }
.console-line.error { color: #EF4444; }
.console-line.info  { color: var(--accent-blue); }
.console-time { flex-shrink: 0; opacity: 0.5; }
.console-msg  { white-space: pre-wrap; word-break: break-word; }

/* ── Dialog (window chrome style) ── */
.pg-dialog {
  border: none;
  border-radius: 0.75rem;
  padding: 0;
  position: fixed;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: min(380px, 90vw);
  max-height: 85vh;
  background: #0d0f14;
  color: var(--text-primary);
  border: 1px solid var(--border-color);
  box-shadow: 0 20px 40px rgba(0, 0, 0, 0.6),
              0 1px 0 rgba(255, 255, 255, 0.05) inset;
  font-family: var(--font-sans);
  overflow: hidden;
}
.pg-dialog::backdrop {
  background: rgba(0, 0, 0, 0.5);
  backdrop-filter: blur(6px);
}
.pg-dialog-header {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.75rem 1rem;
  border-bottom: 1px solid var(--border-color);
  background-color: rgba(13, 15, 20, 0.7);
}
.pg-dialog-dots {
  display: flex;
  gap: 6px;
  flex-shrink: 0;
}
.pg-dialog-dots span {
  width: 0.75rem;
  height: 0.75rem;
  border-radius: 50%;
}
.pg-dialog-dots .dot-red { background-color: #ff5f57; }
.pg-dialog-dots .dot-yellow { background-color: #febc2e; }
.pg-dialog-dots .dot-green { background-color: #28c840; }
.pg-dialog-title {
  flex: 1;
  text-align: center;
  font-family: var(--font-mono);
  font-size: 13px;
  color: var(--text-secondary);
  font-weight: 400;
}
.pg-dialog-msg {
  padding: 20px 20px 4px;
  font-size: 13px;
  line-height: 1.6;
  color: var(--text-secondary);
}
.pg-dialog-input {
  display: block;
  width: calc(100% - 40px);
  margin: 12px 20px 0;
  padding: 8px 12px;
  border-radius: 6px;
  border: 1px solid var(--border-color);
  background: var(--bg-color);
  color: var(--text-primary);
  font-size: 13px;
  font-family: var(--font-mono);
  outline: none;
  transition: border-color 0.15s;
}
.pg-dialog-input:focus { border-color: var(--accent-blue); }
.pg-dialog-actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  padding: 16px 20px;
}
.pg-dialog-actions button {
  padding: 6px 16px;
  border-radius: 6px;
  border: 1px solid transparent;
  font-size: 12px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.15s;
}
.pg-dialog-ok { background: var(--accent-blue); color: white; border-color: var(--accent-blue); }
.pg-dialog-ok:hover { background: #1d4ed8; }
.pg-dialog-cancel { background: transparent; color: var(--text-secondary); border-color: var(--border-color); }
.pg-dialog-cancel:hover { background: rgba(255, 255, 255, 0.05); color: var(--text-primary); }
.pg-dialog--success .pg-dialog-ok { background: #22C55E; border-color: #22C55E; }
.pg-dialog--success .pg-dialog-ok:hover { background: #16A34A; }
.pg-dialog--error .pg-dialog-ok { background: #EF4444; border-color: #EF4444; }
.pg-dialog--error .pg-dialog-ok:hover { background: #DC2626; }

/* ── Responsive ── */
@media (max-width: 768px) {
  .pg-columns {
    grid-template-columns: 1fr;
  }
  .pg-editor-body.editor-body,
  .pg-preview-body {
    height: 300px;
  }
  .pg-file-selector {
    padding: 1.5rem 0.5rem 1rem;
  }
  .pg-global-actions {
    flex-wrap: wrap;
  }
  .pg-window-btn span {
    display: none;
  }
  .pg-window-title {
    font-size: 11px;
  }
}

@media (max-width: 480px) {
  .pg-file-pill {
    font-size: 12px;
    padding: 0.35rem 0.75rem;
  }
  .pg-editor-body.editor-body,
  .pg-preview-body {
    height: 240px;
  }
}
</style>

  <header class="subpage-hero" use="subpage-hero" state="{ titleKey: 'playground.hero.title', subtitleKey: 'playground.hero.subtitle' }"></header>

  <main class="page-body">

    <!-- File selector pills -->
    <div class="pg-file-selector">
      <button each="tab in openTabs" template="editor-tab-tpl" style="display:contents"></button>
      <button class="pg-file-pill pg-file-pill-add" on:click="promptCreateFile()"
              title="New file" aria-label="Create new file">+</button>
    </div>

    <!-- Two-column: Editor + Preview -->
    <div class="pg-columns">

      <!-- Code Editor window -->
      <div class="pg-window">
        <div class="pg-window-header">
          <span class="pg-dot pg-dot-red"></span>
          <span class="pg-dot pg-dot-yellow"></span>
          <span class="pg-dot pg-dot-green"></span>
          <span class="pg-window-title" bind="files[activeFile] ? files[activeFile].name : activeFile"></span>
          <div class="pg-window-actions">
            <button class="pg-window-btn" on:click="downloadProject()">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
              <span t="playground.toolbar.download"></span>
            </button>
            <button class="pg-window-btn" on:click="resetProject()">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="1 4 1 10 7 10"></polyline><path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"></path></svg>
              <span t="playground.toolbar.reset"></span>
            </button>
          </div>
        </div>
        <div class="pg-window-body pg-editor-body editor-body">
          <div class="line-numbers" ref="lineNumbers"></div>
          <pre class="code-editor"><code class="code-editable" ref="codeArea"
               contenteditable="true"
               on:input="onCodeChange()"
               on:keydown.tab.prevent="insertTab($event)"
               on:keydown.enter.prevent="insertNewline($event)"
               on:paste.prevent="handlePaste($event)"
               spellcheck="false"
               autocomplete="off"
               autocorrect="off"
               autocapitalize="off"
               role="textbox"
               aria-multiline="true"
               aria-label="Code editor"></code></pre>
        </div>
      </div>

      <!-- Preview window -->
      <div class="pg-window">
        <div class="pg-window-header">
          <span class="pg-dot pg-dot-red"></span>
          <span class="pg-dot pg-dot-yellow"></span>
          <span class="pg-dot pg-dot-green"></span>
          <span class="pg-window-title" t="playground.preview.label"></span>
          <div class="pg-window-actions">
            <button class="pg-window-btn" on:click="refreshPreview()" aria-label="Refresh preview">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="23 4 23 10 17 10"></polyline><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"></path></svg>
            </button>
          </div>
        </div>
        <div class="pg-window-body pg-preview-body">
          <iframe ref="previewFrame" class="preview-iframe"
                  sandbox="allow-scripts allow-same-origin"
                  title="Preview"></iframe>
        </div>
      </div>

    </div>

    <!-- Console window (full width) -->
    <div class="pg-console-wrap">
      <div class="pg-window" show="showConsole" role="log" aria-live="polite">
        <div class="pg-window-header">
          <span class="pg-dot pg-dot-red"></span>
          <span class="pg-dot pg-dot-yellow"></span>
          <span class="pg-dot pg-dot-green"></span>
          <span class="pg-window-title" t="playground.console.title"></span>
          <div class="pg-window-actions">
            <button class="pg-window-btn" on:click="consoleLines = []" aria-label="Clear console">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
            </button>
          </div>
        </div>
        <div class="pg-window-body pg-console-body console-body" ref="consoleBody">
          <div each="line in consoleLines" template="console-line-tpl"></div>
        </div>
      </div>
    </div>

  </main>

  <!-- Dialog (replaces native alert / confirm / prompt) -->
  <dialog class="pg-dialog">
    <div class="pg-dialog-header">
      <div class="pg-dialog-dots">
        <span class="dot-red"></span>
        <span class="dot-yellow"></span>
        <span class="dot-green"></span>
      </div>
      <span class="pg-dialog-title"></span>
    </div>
    <p class="pg-dialog-msg"></p>
    <input class="pg-dialog-input" type="text" style="display:none">
    <div class="pg-dialog-actions">
      <button class="pg-dialog-cancel" t="playground.dialog.cancel"></button>
      <button class="pg-dialog-ok" t="playground.dialog.ok"></button>
    </div>
  </dialog>

  <!-- Templates -->
  <template id="editor-tab-tpl">
    <button class="pg-file-pill"
         class-active="tab === activeFile"
         on:click="switchTab(tab)">
      <span class="pg-file-pill-icon" bind="tab.endsWith('.html') ? '&lt;/&gt;' : tab.endsWith('.css') ? '#' : tab.endsWith('.json') ? '{}' : tab.endsWith('.js') ? 'js' : tab.endsWith('.tpl') ? '&lt;&gt;' : '&#8226;'"></span>
      <span bind="files[tab] ? files[tab].name : tab"></span>
      <span class="pg-pill-close" style="font-size:10px; padding:2px; opacity:0; cursor:pointer; transition: opacity 0.15s;"
            on:click.stop="closeTab(tab)"
            show="openTabs.length > 1">&#x2715;</span>
    </button>
  </template>

  <template id="console-line-tpl">
    <div class="console-line"
         class-warn="line.type === 'warn'"
         class-error="line.type === 'error'"
         class-info="line.type === 'info'">
      <span class="console-time" bind="line.time"></span>
      <span class="console-msg" bind="line.message"></span>
    </div>
  </template>
</div>
