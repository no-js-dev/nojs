<!-- Events — from events.md -->

<div class="doc-content">

  <!-- on:* -->
  <div class="doc-section">
    <h2 class="doc-title" id="events-handlers" t="docs.events.handlers.title"></h2>
    <p class="doc-text" t="docs.events.handlers.text"></p>
    <div class="demo-split">
      <div class="demo-code"><pre><span class="hl-cmt">&lt;!-- Click --&gt;</span>
<span class="hl-tag">&lt;button</span> <span class="hl-attr">on:click</span>=<span class="hl-str">"count++"</span><span class="hl-tag">&gt;</span>Increment<span class="hl-tag">&lt;/button&gt;</span>

<span class="hl-cmt">&lt;!-- Input --&gt;</span>
<span class="hl-tag">&lt;input</span> <span class="hl-attr">on:input</span>=<span class="hl-str">"search = $event.target.value"</span> <span class="hl-tag">/&gt;</span>

<span class="hl-cmt">&lt;!-- Keyboard --&gt;</span>
<span class="hl-tag">&lt;input</span> <span class="hl-attr">on:keydown.enter</span>=<span class="hl-str">"submitForm()"</span>
       <span class="hl-attr">on:keydown.escape</span>=<span class="hl-str">"cancel()"</span> <span class="hl-tag">/&gt;</span>

<span class="hl-cmt">&lt;!-- Mouse --&gt;</span>
<span class="hl-tag">&lt;div</span> <span class="hl-attr">on:mouseenter</span>=<span class="hl-str">"hovered = true"</span>
     <span class="hl-attr">on:mouseleave</span>=<span class="hl-str">"hovered = false"</span><span class="hl-tag">&gt;</span><span class="hl-tag">&lt;/div&gt;</span></pre></div>
      <div class="demo-preview" state="{ count: 0, msg: '' }">
        <div class="demo-result-label" t="docs.events.handlers.preview"></div>
        <p><span t="docs.events.handlers.countLabel"></span> <strong bind="count"></strong></p>
        <div class="flex gap-2 mb-3">
          <button class="btn btn-primary btn-sm" on:click="count++">+1</button>
          <button class="btn btn-outline btn-sm" on:click="count--">-1</button>
          <button class="btn btn-outline btn-sm" on:click="count = 0">Reset</button>
        </div>
        <input class="input" model="msg" placeholder="Type something..." t-placeholder="docs.events.handlers.inputPlaceholder" />
        <p class="text-sm text-muted mt-2"><span t="docs.events.handlers.youTyped"></span> <span bind="msg"></span></p>
      </div>
    </div>
  </div>

  <!-- modifiers -->
  <div class="doc-section">
    <h2 class="doc-title" id="events-modifiers" t="docs.events.modifiers.title"></h2>
    <p class="doc-text" t="docs.events.modifiers.text"></p>
    <table class="doc-table">
      <thead><tr><th t="docs.events.modifiers.col1"></th><th t="docs.events.modifiers.col2"></th></tr></thead>
      <tbody>
        <tr><td><code>.prevent</code></td><td t="docs.events.modifiers.prevent"></td></tr>
        <tr><td><code>.stop</code></td><td t="docs.events.modifiers.stop"></td></tr>
        <tr><td><code>.once</code></td><td t="docs.events.modifiers.once"></td></tr>
        <tr><td><code>.self</code></td><td t="docs.events.modifiers.self"></td></tr>
        <tr><td><code>.debounce</code></td><td t="docs.events.modifiers.debounce"></td></tr>
        <tr><td><code>.throttle</code></td><td t="docs.events.modifiers.throttle"></td></tr>
      </tbody>
    </table>
    <div class="code-block"><pre><span class="hl-cmt">&lt;!-- .prevent — calls preventDefault() --&gt;</span>
<span class="hl-tag">&lt;form</span> <span class="hl-attr">on:submit.prevent</span>=<span class="hl-str">"handleSubmit()"</span><span class="hl-tag">&gt;</span>

<span class="hl-cmt">&lt;!-- .stop — calls stopPropagation() --&gt;</span>
<span class="hl-tag">&lt;button</span> <span class="hl-attr">on:click.stop</span>=<span class="hl-str">"handleClick()"</span><span class="hl-tag">&gt;</span>

<span class="hl-cmt">&lt;!-- .once — fires only once --&gt;</span>
<span class="hl-tag">&lt;button</span> <span class="hl-attr">on:click.once</span>=<span class="hl-str">"initializeApp()"</span><span class="hl-tag">&gt;</span>

<span class="hl-cmt">&lt;!-- .debounce — debounce the handler --&gt;</span>
<span class="hl-tag">&lt;input</span> <span class="hl-attr">on:input.debounce.300</span>=<span class="hl-str">"search($event.target.value)"</span> <span class="hl-tag">/&gt;</span>

<span class="hl-cmt">&lt;!-- Key modifiers --&gt;</span>
<span class="hl-tag">&lt;input</span> <span class="hl-attr">on:keydown.enter</span>=<span class="hl-str">"submit()"</span>
       <span class="hl-attr">on:keydown.ctrl.enter</span>=<span class="hl-str">"save()"</span> <span class="hl-tag">/&gt;</span>
<span class="hl-cmt">&lt;!-- Note: single-letter keys (e.g. .s) are not supported as modifiers. Use named keys like .enter, .escape, .space, etc. --&gt;</span>

<span class="hl-cmt">&lt;!-- Combine modifiers --&gt;</span>
<span class="hl-tag">&lt;form</span> <span class="hl-attr">on:submit.prevent.once</span>=<span class="hl-str">"register()"</span><span class="hl-tag">&gt;</span></pre></div>
  </div>

  <!-- $event & $el -->
  <div class="doc-section">
    <h2 class="doc-title" id="events-event-and-el" t="docs.events.eventAndEl.title" t-html></h2>
    <p class="doc-text" t="docs.events.eventAndEl.text"></p>
    <div class="code-block"><pre><span class="hl-tag">&lt;input</span> <span class="hl-attr">on:input</span>=<span class="hl-str">"name = $event.target.value"</span> <span class="hl-tag">/&gt;</span>
<span class="hl-tag">&lt;input</span> <span class="hl-attr">on:focus</span>=<span class="hl-str">"$el.select()"</span> <span class="hl-tag">/&gt;</span>
<span class="hl-tag">&lt;div</span> <span class="hl-attr">on:click</span>=<span class="hl-str">"$el.classList.toggle('expanded')"</span><span class="hl-tag">&gt;&lt;/div&gt;</span></pre></div>
  </div>

  <!-- lifecycle -->
  <div class="doc-section">
    <h2 class="doc-title" id="events-lifecycle" t="docs.events.lifecycle.title"></h2>
    <table class="doc-table">
      <thead>
        <tr><th t="docs.events.lifecycle.col1"></th><th t="docs.events.lifecycle.col2"></th></tr>
      </thead>
      <tbody>
        <tr><td><code>on:init</code></td><td t="docs.events.lifecycle.onInit"></td></tr>
        <tr><td><code>on:mounted</code></td><td t="docs.events.lifecycle.onMounted"></td></tr>
        <tr><td><code>on:updated</code></td><td t="docs.events.lifecycle.onUpdated"></td></tr>
        <tr><td><code>on:unmounted</code></td><td t="docs.events.lifecycle.onUnmounted"></td></tr>
        <tr><td><code>on:error</code></td><td t="docs.events.lifecycle.onError"></td></tr>
      </tbody>
    </table>
    <div class="code-block"><pre><span class="hl-tag">&lt;div</span> <span class="hl-attr">on:mounted</span>=<span class="hl-str">"initChart($el)"</span><span class="hl-tag">&gt;</span>
  <span class="hl-tag">&lt;canvas</span> <span class="hl-attr">ref</span>=<span class="hl-str">"chart"</span><span class="hl-tag">&gt;&lt;/canvas&gt;</span>
<span class="hl-tag">&lt;/div&gt;</span>
<span class="hl-tag">&lt;div</span> <span class="hl-attr">on:unmounted</span>=<span class="hl-str">"cleanup()"</span><span class="hl-tag">&gt;&lt;/div&gt;</span></pre></div>
  </div>

  <!-- Key Modifiers -->
  <div class="doc-section">
    <h2 class="doc-title" id="events-key-modifiers" t="docs.events.keyModifiers.title"></h2>
    <p class="doc-text" t="docs.events.keyModifiers.text"></p>
    <table class="doc-table">
      <thead><tr><th t="docs.events.keyModifiers.col1"></th><th t="docs.events.keyModifiers.col2"></th></tr></thead>
      <tbody>
        <tr><td><code>.enter</code></td><td t="docs.events.keyModifiers.enter"></td></tr>
        <tr><td><code>.escape</code></td><td t="docs.events.keyModifiers.escape"></td></tr>
        <tr><td><code>.space</code></td><td t="docs.events.keyModifiers.space"></td></tr>
        <tr><td><code>.tab</code></td><td t="docs.events.keyModifiers.tab"></td></tr>
        <tr><td><code>.backspace</code></td><td t="docs.events.keyModifiers.backspace"></td></tr>
        <tr><td><code>.delete</code></td><td t="docs.events.keyModifiers.delete"></td></tr>
        <tr><td><code>.up</code></td><td t="docs.events.keyModifiers.arrowUp"></td></tr>
        <tr><td><code>.down</code></td><td t="docs.events.keyModifiers.arrowDown"></td></tr>
        <tr><td><code>.left</code></td><td t="docs.events.keyModifiers.arrowLeft"></td></tr>
        <tr><td><code>.right</code></td><td t="docs.events.keyModifiers.arrowRight"></td></tr>
        <tr><td><code>.ctrl</code></td><td t="docs.events.keyModifiers.ctrl"></td></tr>
        <tr><td><code>.alt</code></td><td t="docs.events.keyModifiers.alt"></td></tr>
        <tr><td><code>.shift</code></td><td t="docs.events.keyModifiers.shift"></td></tr>
        <tr><td><code>.meta</code></td><td t="docs.events.keyModifiers.meta"></td></tr>
      </tbody>
    </table>
    <div class="code-block"><pre><span class="hl-cmt">&lt;!-- Single key --&gt;</span>
<span class="hl-tag">&lt;input</span> <span class="hl-attr">on:keydown.enter</span>=<span class="hl-str">"submit()"</span> <span class="hl-tag">/&gt;</span>

<span class="hl-cmt">&lt;!-- Combination --&gt;</span>
<span class="hl-tag">&lt;input</span> <span class="hl-attr">on:keydown.ctrl.enter</span>=<span class="hl-str">"save()"</span> <span class="hl-tag">/&gt;</span>

<span class="hl-cmt">&lt;!-- Multiple modifiers --&gt;</span>
<span class="hl-tag">&lt;input</span> <span class="hl-attr">on:keydown.ctrl.shift.enter</span>=<span class="hl-str">"submitAll()"</span> <span class="hl-tag">/&gt;</span></pre></div>
  </div>

</div>

