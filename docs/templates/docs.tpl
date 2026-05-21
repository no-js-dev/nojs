<div class="page-wrapper">
<style>
/* ══════════════════════════════════════════════════════════════════
   DOCUMENTATION PAGE
   ══════════════════════════════════════════════════════════════════ */

/* Doc section titles */
.doc-title {
  font-family: var(--font-heading);
  font-size: 32px;
  font-weight: bold;
  color: var(--text);
}
.doc-subtitle {
  font-family: var(--font-heading);
  font-size: 20px;
  font-weight: 600;
  color: var(--text);
  margin-top: 32px;
}
.doc-text {
  font-family: var(--font-body);
  font-size: 16px;
  color: var(--text-secondary);
  line-height: 1.7;
}
.doc-section {
  display: flex;
  flex-direction: column;
  gap: 16px;
}
.doc-section + .doc-section {
  padding-top: 48px;
  border-top: 1px solid var(--border);
}
.doc-section > .doc-subtitle:first-child {
  margin-top: 0;
}

/* Concepts grid */
.concepts-grid {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

/* Next steps buttons */
.next-steps {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
}
.next-steps .btn {
  padding: 10px 20px;
  font-size: 14px;
}

/* ══════════════════════════════════════════════════════════════════
   DOC PAGE TABLES
   ══════════════════════════════════════════════════════════════════ */
.doc-table {
  width: 100%;
  border-collapse: collapse;
  font-family: var(--font-body);
  font-size: 14px;
  margin: 16px 0;
}
.doc-table th {
  text-align: left;
  padding: 12px 16px;
  background: var(--surface);
  border: 1px solid var(--border);
  font-weight: 600;
  color: var(--text);
}
.doc-table td {
  padding: 10px 16px;
  border: 1px solid var(--border);
  color: var(--text-secondary);
  vertical-align: top;
}
.doc-table code {
  font-size: 13px;
}

/* ══════════════════════════════════════════════════════════════════
   DEMO COMPONENTS (for live interactive demos in doc pages)
   ══════════════════════════════════════════════════════════════════ */
.demo-card {
  border: 1px solid var(--border);
  border-radius: var(--radius);
  overflow: hidden;
  margin: 16px 0;
}
.demo-card-header {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px 20px;
  background: var(--surface);
  border-bottom: 1px solid var(--border);
}
.demo-card-header h3 {
  font-family: var(--font-heading);
  font-size: 16px;
  font-weight: 600;
  color: var(--text);
}
.demo-tag {
  font-size: 11px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  color: var(--primary);
  background: var(--primary-surface);
  padding: 4px 8px;
  border-radius: 4px;
}
.demo-card-body {
  padding: 20px;
}
.demo-split {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0;
  border: 1px solid var(--border);
  border-radius: var(--radius);
  overflow: hidden;
  margin: 12px 0;
}
.demo-code {
  background: var(--code-bg);
  padding: 20px;
  overflow: auto;
}
.demo-code pre {
  margin: 0;
  font-family: var(--font-mono);
  font-size: 13px;
  line-height: 1.7;
  color: #E2E8F0;
}
.demo-preview {
  padding: 20px;
  background: var(--white);
  border-left: 1px solid var(--border);
}
.demo-result-label {
  font-family: var(--font-mono);
  font-size: 11px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  color: var(--text-dim);
  margin-bottom: 12px;
}
.demo-note {
  margin-top: 12px;
  padding: 12px 16px;
  background: var(--surface);
  border-radius: var(--radius-sm);
  font-size: 13px;
  color: var(--text-muted);
  line-height: 1.6;
}

/* ══════════════════════════════════════════════════════════════════
   CHEATSHEET
   ══════════════════════════════════════════════════════════════════ */
.cheatsheet-grid {
  display: flex;
  flex-direction: column;
  gap: 24px;
}
.cheatsheet-group-title {
  font-family: var(--font-heading);
  font-size: 24px;
  font-weight: 600;
  color: var(--text);
  margin-bottom: 12px;
  padding-bottom: 8px;
  border-bottom: 2px solid var(--primary);
}

/* ══════════════════════════════════════════════════════════════════
   DEMO SUPPORT (progress, alerts, misc)
   ══════════════════════════════════════════════════════════════════ */

/* ── Progress bar (for demos) ── */
.progress-bar {
  height: 8px;
  background: var(--border);
  border-radius: 4px;
  overflow: hidden;
}
.progress-fill {
  height: 100%;
  background: var(--primary);
  border-radius: 4px;
  transition: width 0.3s;
}

/* ── Alerts (for demos) ── */
.alert {
  padding: 12px 16px;
  border-radius: var(--radius-sm);
  font-size: 14px;
}
.alert-info {
  background: var(--primary-surface);
  color: var(--primary-dark);
  border: 1px solid var(--primary);
}
.alert-error {
  background: #FEF2F2;
  color: var(--error);
  border: 1px solid var(--error);
}
.alert-success {
  background: #F0FDF4;
  color: #16A34A;
  border: 1px solid var(--success);
}

/* ── Misc demo support ── */
.item-row {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  border-radius: var(--radius-sm);
  transition: background 0.15s;
}
.item-row:hover {
  background: var(--surface);
}
.item-index {
  font-family: var(--font-mono);
  font-size: 12px;
  color: var(--text-dim);
  width: 24px;
}
.item-name {
  font-family: var(--font-body);
  font-size: 14px;
  color: var(--text);
}
.item-meta {
  font-family: var(--font-body);
  font-size: 13px;
  color: var(--text-muted);
  margin-left: auto;
}
.animate-pulse {
  animation: pulse 1.5s infinite;
}
@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}
.badge-success { background: #F0FDF4; color: var(--success); }
.badge-warning { background: #FFFBEB; color: var(--warning); }
.badge-primary { background: var(--primary-surface); color: var(--primary); }

.table {
  width: 100%;
  border-collapse: collapse;
}
.table td {
  padding: 8px 12px;
  border-bottom: 1px solid var(--border);
  font-size: 14px;
}
.btn-primary.btn-sm { background: var(--primary); color: var(--white); }
.btn-danger { background: var(--error); color: var(--white); }
.btn-success { background: var(--success); color: var(--white); }
.checkbox-label {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
  cursor: pointer;
}
.user-card {
  padding: 16px;
  border: 1px solid var(--border);
  border-radius: var(--radius);
  background: var(--surface);
}

/* ─── Doc Section Skeletons ─────────────────────────────────────── */
@keyframes skl-shimmer {
  0%   { background-position: -600px 0; }
  100% { background-position: 600px 0; }
}
.doc-skeleton {
  padding: 48px 0 64px;
}
.doc-skeleton > * {
  background: linear-gradient(90deg, var(--border) 25%, var(--surface) 50%, var(--border) 75%);
  background-size: 600px 100%;
  animation: skl-shimmer 1.5s infinite linear;
  border-radius: 6px;
  display: block;
}
.skl-badge  { width: 72px;  height: 22px; margin-bottom: 20px; }
.skl-h1     { width: 52%;   height: 36px; margin-bottom: 14px; }
.skl-sub    { width: 70%;   height: 18px; margin-bottom: 40px; }
.skl-code   { width: 100%;  height: 120px; border-radius: 10px; margin-bottom: 32px; }
.skl-h2     { width: 36%;   height: 24px; margin-bottom: 14px; }
.skl-line   { width: 100%;  height: 15px; margin-bottom: 10px; }
.skl-line.w85 { width: 85%; }
.skl-line.w65 { width: 65%; }
.skl-line.w50 { width: 50%; }
.skl-code.sm  { height: 80px; margin-top: 4px; }

/* Hide skeleton once real content has arrived
   (router wraps content in display:contents divs, so use :has instead of >) */
.doc-with-sidebar .doc-main:has(.doc-section) .doc-skeleton,
.doc-with-sidebar .doc-main:has(.hero-section) .doc-skeleton {
  display: none;
}

/* ── Sidebar skeleton ── */
.sidebar-skeleton {
  width: var(--sidebar-w);
  min-width: var(--sidebar-w);
  background: var(--white);
  border-right: 1px solid var(--border);
  padding: 24px 0;
  align-self: flex-start;
  position: sticky;
  top: var(--header-h);
  max-height: calc(100vh - var(--header-h));
  overflow: hidden;
}
.sidebar-skeleton-inner {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 0 16px;
}
.skl-sidebar-group {
  margin-bottom: 16px;
}
.skl-sidebar-title {
  width: 55%;
  height: 11px;
  margin-bottom: 10px;
  background: linear-gradient(90deg, var(--border) 25%, #f1f5f9 50%, var(--border) 75%);
  background-size: 600px 100%;
  animation: skl-shimmer 1.5s infinite linear;
  border-radius: 4px;
}
.skl-sidebar-link {
  width: 100%;
  height: 12px;
  margin-bottom: 6px;
  background: linear-gradient(90deg, var(--border) 25%, #f1f5f9 50%, var(--border) 75%);
  background-size: 600px 100%;
  animation: skl-shimmer 1.5s infinite linear;
  border-radius: 4px;
}
.skl-sidebar-link.w85 { width: 85%; }
.skl-sidebar-link.w75 { width: 75%; }
.skl-sidebar-link.w65 { width: 65%; }

/* Hide sidebar skeleton once the real sidebar arrives */
.doc-with-sidebar:has(.sidebar) .sidebar-skeleton {
  display: none;
}

/* ── Responsive ── */
@media (max-width: 768px) {
  .demo-split { grid-template-columns: 1fr; }
  .demo-preview { border-left: none; border-top: 1px solid var(--border); }
  .doc-table { display: block; overflow-x: auto; -webkit-overflow-scrolling: touch; font-size: 12px; }
  .doc-table th, .doc-table td { padding: 8px 10px; }
}
</style>
<!-- Documentation — Nested routing layout (sidebar + route outlet) -->

<!-- Reusable skeleton — injected by NoJS via template[include] -->
<template id="doc-skeleton">
  <div class="doc-skeleton"><span class="skl-badge"></span><div class="skl-h1"></div><div class="skl-sub"></div><div class="skl-code"></div><div class="skl-h2"></div><div class="skl-line"></div><div class="skl-line w85"></div><div class="skl-line w65"></div><div class="skl-code sm"></div></div>
</template>

<div class="doc-with-sidebar">

    <div class="sidebar-skeleton">
        <div class="sidebar-skeleton-inner">
            <div class="skl-sidebar-group"><div class="skl-sidebar-title"></div><div class="skl-sidebar-link"></div><div class="skl-sidebar-link w75"></div><div class="skl-sidebar-link w85"></div><div class="skl-sidebar-link w65"></div></div>
            <div class="skl-sidebar-group"><div class="skl-sidebar-title"></div><div class="skl-sidebar-link"></div><div class="skl-sidebar-link w85"></div><div class="skl-sidebar-link w75"></div><div class="skl-sidebar-link"></div><div class="skl-sidebar-link w65"></div></div>
            <div class="skl-sidebar-group"><div class="skl-sidebar-title"></div><div class="skl-sidebar-link w85"></div><div class="skl-sidebar-link"></div><div class="skl-sidebar-link w75"></div></div>
            <div class="skl-sidebar-group"><div class="skl-sidebar-title"></div><div class="skl-sidebar-link"></div><div class="skl-sidebar-link w75"></div><div class="skl-sidebar-link w65"></div><div class="skl-sidebar-link w85"></div></div>
        </div>
    </div>
    <template src="./docs/sidebar.tpl"></template>

    <div class="doc-main" route-view="docs" src="./docs/" route-index="getting-started" transition="fade" page-toc>
    </div>

</div><!-- /doc-with-sidebar -->
</div>

