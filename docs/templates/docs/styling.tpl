<!-- Styling — from styling.md -->

<div class="doc-content">

  <!-- class-* -->
  <div class="doc-section">
    <h2 class="doc-title" id="styling-class-toggle" t="docs.styling.classToggle.title"></h2>
    <p class="doc-text" t="docs.styling.classToggle.text"></p>
    <div class="code-block"><pre><span class="hl-cmt">&lt;!-- Toggle a single class based on expression --&gt;</span>
<span class="hl-tag">&lt;div</span> <span class="hl-attr">class-active</span>=<span class="hl-str">"isActive"</span>
     <span class="hl-attr">class-disabled</span>=<span class="hl-str">"!isEnabled"</span>
     <span class="hl-attr">class-highlighted</span>=<span class="hl-str">"score > 90"</span><span class="hl-tag">&gt;</span>
<span class="hl-tag">&lt;/div&gt;</span></pre></div>

    <h3 class="doc-subtitle" id="styling-class-multi-object" t="docs.styling.classToggle.multiObject"></h3>
    <p class="doc-text" t="docs.styling.classToggle.multiObjectText"></p>
    <div class="code-block"><pre><span class="hl-tag">&lt;div</span> <span class="hl-attr">class-map</span>=<span class="hl-str">"{ active: isActive, 'text-bold': isBold, error: hasError }"</span><span class="hl-tag">&gt;&lt;/div&gt;</span></pre></div>

    <h3 class="doc-subtitle" id="styling-class-from-array" t="docs.styling.classToggle.fromArray"></h3>
    <div class="code-block"><pre><span class="hl-tag">&lt;div</span> <span class="hl-attr">class-list</span>=<span class="hl-str">"['base-class', isAdmin ? 'admin' : 'user']"</span><span class="hl-tag">&gt;&lt;/div&gt;</span></pre></div>
  </div>

  <!-- Static class Interaction -->
  <div class="doc-section">
    <h2 class="doc-title" id="styling-class-static" t="docs.styling.classStatic.title"></h2>
    <p class="doc-text" t="docs.styling.classStatic.text"></p>
    <div class="code-block"><pre><span class="hl-cmt">&lt;!-- Static "card" always stays; "active" is toggled --&gt;</span>
<span class="hl-tag">&lt;div</span> <span class="hl-attr">class</span>=<span class="hl-str">"card"</span> <span class="hl-attr">class-active</span>=<span class="hl-str">"isActive"</span><span class="hl-tag">&gt;&lt;/div&gt;</span></pre></div>
    <div class="callout">
      <p t="docs.styling.classStatic.callout"></p>
    </div>
  </div>

  <!-- style-* -->
  <div class="doc-section">
    <h2 class="doc-title" id="styling-inline-styles" t="docs.styling.inlineStyles.title"></h2>
    <p class="doc-text" t="docs.styling.inlineStyles.text"></p>
    <div class="code-block"><pre><span class="hl-tag">&lt;div</span> <span class="hl-attr">style-color</span>=<span class="hl-str">"isError ? 'red' : 'green'"</span>
     <span class="hl-attr">style-font-size</span>=<span class="hl-str">"fontSize + 'px'"</span>
     <span class="hl-attr">style-opacity</span>=<span class="hl-str">"isVisible ? 1 : 0.5"</span>
     <span class="hl-attr">style-background</span>=<span class="hl-str">"'linear-gradient(135deg, ' + color1 + ', ' + color2 + ')'"</span><span class="hl-tag">&gt;</span>
<span class="hl-tag">&lt;/div&gt;</span></pre></div>

    <h3 class="doc-subtitle" id="styling-inline-from-object" t="docs.styling.inlineStyles.fromObject"></h3>
    <p class="doc-text" t="docs.styling.inlineStyles.fromObjectText"></p>
    <div class="code-block"><pre><span class="hl-tag">&lt;div</span> <span class="hl-attr">style-map</span>=<span class="hl-str">"{
  color: textColor,
  fontSize: size + 'px',
  transform: 'rotate(' + rotation + 'deg)'
}"</span><span class="hl-tag">&gt;&lt;/div&gt;</span></pre></div>
  </div>

  <!-- CSS Custom Properties -->
  <div class="doc-section">
    <h2 class="doc-title" id="styling-css-vars" t="docs.styling.cssCustomProperties.title"></h2>
    <p class="doc-text" t="docs.styling.cssCustomProperties.text"></p>
    <div class="code-block"><pre><span class="hl-tag">&lt;div</span> <span class="hl-attr">state</span>=<span class="hl-str">"{ brand: '#3b82f6' }"</span>
     <span class="hl-attr">style---brand-color</span>=<span class="hl-str">"brand"</span><span class="hl-tag">&gt;</span>
  <span class="hl-tag">&lt;p</span> <span class="hl-attr">style</span>=<span class="hl-str">"color: var(--brand-color)"</span><span class="hl-tag">&gt;</span>Themed text<span class="hl-tag">&lt;/p&gt;</span>
<span class="hl-tag">&lt;/div&gt;</span></pre></div>
    <div class="callout">
      <p t="docs.styling.cssCustomProperties.callout"></p>
    </div>
  </div>

  <!-- Live Demo -->
  <div class="doc-section">
    <h2 class="doc-title" id="styling-live-demo" t="docs.styling.liveDemo.title"></h2>
    <div class="demo-split">
      <div class="demo-code">
        <div class="code-block"><pre><span class="hl-tag">&lt;div</span> <span class="hl-attr">state</span>=<span class="hl-str">"{ active: false, color: '#0EA5E9' }"</span><span class="hl-tag">&gt;</span>
  <span class="hl-tag">&lt;button</span> <span class="hl-attr">on:click</span>=<span class="hl-str">"active = !active"</span><span class="hl-tag">&gt;</span>Toggle<span class="hl-tag">&lt;/button&gt;</span>
  <span class="hl-tag">&lt;div</span> <span class="hl-attr">class-active</span>=<span class="hl-str">"active"</span>
       <span class="hl-attr">style-color</span>=<span class="hl-str">"color"</span><span class="hl-tag">&gt;</span>
    Styled box
  <span class="hl-tag">&lt;/div&gt;</span>
<span class="hl-tag">&lt;/div&gt;</span></pre></div>
      </div>
      <div class="demo-preview">
        <span class="demo-result-label" t="docs.styling.liveDemo.label"></span>
        <div state="{ active: false, color: '#0EA5E9' }">
          <button class="btn btn-primary btn-sm" on:click="active = !active" style="margin-bottom: 12px;" t="docs.styling.liveDemo.toggleButton"></button>
          <div class-active="active"
               style-color="color"
               style="padding: 16px; border-radius: 8px; border: 2px solid var(--border); transition: all 0.2s;">
            <span bind="active ? '✓ Active' : '✗ Inactive'"></span>
          </div>
        </div>
      </div>
    </div>
  </div>

</div>
