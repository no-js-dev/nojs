<!-- Data Binding — from data-binding.md -->

<div class="doc-content">

  <!-- bind -->
  <div class="doc-section">
    <h2 class="doc-title" id="data-binding-bind" t="docs.dataBinding.bind.title"></h2>
    <p class="doc-text" t="docs.dataBinding.bind.text"></p>
    <div class="code-block"><pre><span class="hl-tag">&lt;span</span> <span class="hl-attr">bind</span>=<span class="hl-str">"user.name"</span><span class="hl-tag">&gt;&lt;/span&gt;</span>
<span class="hl-tag">&lt;span</span> <span class="hl-attr">bind</span>=<span class="hl-str">"user.age + ' years old'"</span><span class="hl-tag">&gt;&lt;/span&gt;</span>
<span class="hl-tag">&lt;span</span> <span class="hl-attr">bind</span>=<span class="hl-str">"items.length === 0 ? 'Empty' : items.length + ' items'"</span><span class="hl-tag">&gt;&lt;/span&gt;</span></pre></div>
    <p class="doc-text" t="docs.dataBinding.bind.filtersNote"></p>
    <div class="code-block"><pre><span class="hl-tag">&lt;span</span> <span class="hl-attr">bind</span>=<span class="hl-str">"price | currency"</span><span class="hl-tag">&gt;&lt;/span&gt;</span>
<span class="hl-tag">&lt;span</span> <span class="hl-attr">bind</span>=<span class="hl-str">"user.name | uppercase"</span><span class="hl-tag">&gt;&lt;/span&gt;</span>
<span class="hl-tag">&lt;span</span> <span class="hl-attr">bind</span>=<span class="hl-str">"user.bio | truncate:100"</span><span class="hl-tag">&gt;&lt;/span&gt;</span></pre></div>
  </div>

  <!-- bind-html -->
  <div class="doc-section">
    <h2 class="doc-title" id="data-binding-bind-html" t="docs.dataBinding.bindHtml.title"></h2>
    <p class="doc-text" t="docs.dataBinding.bindHtml.text"></p>
    <div class="code-block"><pre><span class="hl-tag">&lt;div</span> <span class="hl-attr">bind-html</span>=<span class="hl-str">"article.content"</span><span class="hl-tag">&gt;&lt;/div&gt;</span>
<span class="hl-tag">&lt;div</span> <span class="hl-attr">bind-html</span>=<span class="hl-str">"`&lt;em&gt;${user.bio}&lt;/em&gt;`"</span><span class="hl-tag">&gt;&lt;/div&gt;</span></pre></div>
    <div class="callout"><p t="docs.dataBinding.bindHtml.callout"></p></div>
    <div class="callout callout-tip"><p t-html="docs.dataBinding.bindHtml.sanitizerTip"></p></div>
  </div>

  <!-- bind-* -->
  <div class="doc-section">
    <h2 class="doc-title" id="data-binding-bind-attr" t="docs.dataBinding.bindAttr.title"></h2>
    <p class="doc-text" t="docs.dataBinding.bindAttr.text"></p>
    <div class="code-block"><pre><span class="hl-cmt">&lt;!-- src, href, alt, title --&gt;</span>
<span class="hl-tag">&lt;img</span> <span class="hl-attr">bind-src</span>=<span class="hl-str">"user.avatarUrl"</span>
     <span class="hl-attr">bind-alt</span>=<span class="hl-str">"user.name + ' avatar'"</span> <span class="hl-tag">/&gt;</span>

<span class="hl-tag">&lt;a</span> <span class="hl-attr">bind-href</span>=<span class="hl-str">"'/users/' + user.id"</span>
   <span class="hl-attr">bind-title</span>=<span class="hl-str">"'View ' + user.name"</span><span class="hl-tag">&gt;</span>Profile<span class="hl-tag">&lt;/a&gt;</span>

<span class="hl-cmt">&lt;!-- disabled, readonly, checked --&gt;</span>
<span class="hl-tag">&lt;button</span> <span class="hl-attr">bind-disabled</span>=<span class="hl-str">"!form.isValid"</span><span class="hl-tag">&gt;</span>Submit<span class="hl-tag">&lt;/button&gt;</span>
<span class="hl-tag">&lt;input</span> <span class="hl-attr">type</span>=<span class="hl-str">"checkbox"</span> <span class="hl-attr">bind-checked</span>=<span class="hl-str">"user.isActive"</span> <span class="hl-tag">/&gt;</span>

<span class="hl-cmt">&lt;!-- Data attributes --&gt;</span>
<span class="hl-tag">&lt;div</span> <span class="hl-attr">bind-data-id</span>=<span class="hl-str">"user.id"</span>
     <span class="hl-attr">bind-data-role</span>=<span class="hl-str">"user.role"</span><span class="hl-tag">&gt;&lt;/div&gt;</span></pre></div>
  </div>

  <!-- model -->
  <div class="doc-section">
    <h2 class="doc-title" id="data-binding-model" t="docs.dataBinding.model.title"></h2>
    <p class="doc-text" t="docs.dataBinding.model.text"></p>
    <div class="code-block"><pre><span class="hl-tag">&lt;div</span> <span class="hl-attr">state</span>=<span class="hl-str">"{ name: '', age: 0, agreed: false, role: 'user', bio: '' }"</span><span class="hl-tag">&gt;</span>

  <span class="hl-tag">&lt;input</span> <span class="hl-attr">type</span>=<span class="hl-str">"text"</span> <span class="hl-attr">model</span>=<span class="hl-str">"name"</span> <span class="hl-tag">/&gt;</span>
  <span class="hl-tag">&lt;input</span> <span class="hl-attr">type</span>=<span class="hl-str">"number"</span> <span class="hl-attr">model</span>=<span class="hl-str">"age"</span> <span class="hl-tag">/&gt;</span>
  <span class="hl-tag">&lt;input</span> <span class="hl-attr">type</span>=<span class="hl-str">"checkbox"</span> <span class="hl-attr">model</span>=<span class="hl-str">"agreed"</span> <span class="hl-tag">/&gt;</span>
  <span class="hl-tag">&lt;select</span> <span class="hl-attr">model</span>=<span class="hl-str">"role"</span><span class="hl-tag">&gt;</span>
    <span class="hl-tag">&lt;option</span> <span class="hl-attr">value</span>=<span class="hl-str">"admin"</span><span class="hl-tag">&gt;</span>Admin<span class="hl-tag">&lt;/option&gt;</span>
    <span class="hl-tag">&lt;option</span> <span class="hl-attr">value</span>=<span class="hl-str">"user"</span><span class="hl-tag">&gt;</span>User<span class="hl-tag">&lt;/option&gt;</span>
  <span class="hl-tag">&lt;/select&gt;</span>
  <span class="hl-tag">&lt;textarea</span> <span class="hl-attr">model</span>=<span class="hl-str">"bio"</span><span class="hl-tag">&gt;&lt;/textarea&gt;</span>

  <span class="hl-tag">&lt;p&gt;</span>Hello, <span class="hl-tag">&lt;span</span> <span class="hl-attr">bind</span>=<span class="hl-str">"name"</span><span class="hl-tag">&gt;&lt;/span&gt;</span>. You are <span class="hl-tag">&lt;span</span> <span class="hl-attr">bind</span>=<span class="hl-str">"age"</span><span class="hl-tag">&gt;&lt;/span&gt;</span>.<span class="hl-tag">&lt;/p&gt;</span>

<span class="hl-tag">&lt;/div&gt;</span></pre></div>
    <div class="demo-split">
      <div class="demo-code"><pre><span class="hl-cmt">&lt;!-- Live demo --&gt;</span>
<span class="hl-tag">&lt;input</span> <span class="hl-attr">type</span>=<span class="hl-str">"text"</span> <span class="hl-attr">model</span>=<span class="hl-str">"name"</span> <span class="hl-tag">/&gt;</span>
<span class="hl-tag">&lt;input</span> <span class="hl-attr">type</span>=<span class="hl-str">"checkbox"</span> <span class="hl-attr">model</span>=<span class="hl-str">"agreed"</span> <span class="hl-tag">/&gt;</span></pre></div>
      <div class="demo-preview" state="{ name: '', agreed: false }">
        <div class="demo-result-label" t="docs.dataBinding.model.preview"></div>
        <div class="form-group">
          <label class="form-label" t="docs.dataBinding.model.nameLabel"></label>
          <input type="text" model="name" class="input" bind-placeholder="$i18n.t('docs.dataBinding.model.placeholder')" />
        </div>
        <label class="checkbox-label">
          <input type="checkbox" model="agreed" /> <span t="docs.dataBinding.model.checkbox"></span>
        </label>
        <p class="mt-3"><span t="docs.dataBinding.model.helloPrefix"></span> <strong bind="name || '...'"></strong></p>
        <p class="text-sm text-muted"><span t="docs.dataBinding.model.agreedLabel"></span> <span bind="agreed"></span></p>
      </div>
    </div>
  </div>

  <!-- Radio & Multi-Select -->
  <div class="doc-section">
    <h2 class="doc-title" id="binding-radio-select" t="docs.dataBinding.radioSelect.title"></h2>
    <p class="doc-text" t="docs.dataBinding.radioSelect.text"></p>
    <div class="code-block"><pre><span class="hl-cmt">&lt;!-- Radio group --&gt;</span>
<span class="hl-tag">&lt;div</span> <span class="hl-attr">state</span>=<span class="hl-str">"{ size: 'md' }"</span><span class="hl-tag">&gt;</span>
  <span class="hl-tag">&lt;label&gt;&lt;input</span> <span class="hl-attr">type</span>=<span class="hl-str">"radio"</span> <span class="hl-attr">model</span>=<span class="hl-str">"size"</span> <span class="hl-attr">value</span>=<span class="hl-str">"sm"</span><span class="hl-tag">&gt;</span> Small<span class="hl-tag">&lt;/label&gt;</span>
  <span class="hl-tag">&lt;label&gt;&lt;input</span> <span class="hl-attr">type</span>=<span class="hl-str">"radio"</span> <span class="hl-attr">model</span>=<span class="hl-str">"size"</span> <span class="hl-attr">value</span>=<span class="hl-str">"md"</span><span class="hl-tag">&gt;</span> Medium<span class="hl-tag">&lt;/label&gt;</span>
  <span class="hl-tag">&lt;label&gt;&lt;input</span> <span class="hl-attr">type</span>=<span class="hl-str">"radio"</span> <span class="hl-attr">model</span>=<span class="hl-str">"size"</span> <span class="hl-attr">value</span>=<span class="hl-str">"lg"</span><span class="hl-tag">&gt;</span> Large<span class="hl-tag">&lt;/label&gt;</span>
  <span class="hl-tag">&lt;p&gt;</span>Selected: <span class="hl-tag">&lt;span</span> <span class="hl-attr">bind</span>=<span class="hl-str">"size"</span><span class="hl-tag">&gt;&lt;/span&gt;&lt;/p&gt;</span>
<span class="hl-tag">&lt;/div&gt;</span></pre></div>
    <div class="callout callout-warning"><p t="docs.dataBinding.radioSelect.multiSelectWarning"></p></div>
    <div class="code-block"><pre><span class="hl-cmt">&lt;!-- NOT YET FUNCTIONAL — shown for reference only --&gt;</span>
<span class="hl-tag">&lt;div</span> <span class="hl-attr">state</span>=<span class="hl-str">"{ langs: [] }"</span><span class="hl-tag">&gt;</span>
  <span class="hl-tag">&lt;select</span> <span class="hl-attr">model</span>=<span class="hl-str">"langs"</span> <span class="hl-attr">multiple</span><span class="hl-tag">&gt;</span>
    <span class="hl-tag">&lt;option</span> <span class="hl-attr">value</span>=<span class="hl-str">"js"</span><span class="hl-tag">&gt;</span>JavaScript<span class="hl-tag">&lt;/option&gt;</span>
    <span class="hl-tag">&lt;option</span> <span class="hl-attr">value</span>=<span class="hl-str">"py"</span><span class="hl-tag">&gt;</span>Python<span class="hl-tag">&lt;/option&gt;</span>
    <span class="hl-tag">&lt;option</span> <span class="hl-attr">value</span>=<span class="hl-str">"go"</span><span class="hl-tag">&gt;</span>Go<span class="hl-tag">&lt;/option&gt;</span>
  <span class="hl-tag">&lt;/select&gt;</span>
<span class="hl-tag">&lt;/div&gt;</span></pre></div>
  </div>

  <!-- Common Mistakes -->
  <div class="doc-section">
    <h2 class="doc-title" id="binding-common-mistakes" t="docs.dataBinding.commonMistakes.title"></h2>
    <p class="doc-text" t="docs.dataBinding.commonMistakes.text"></p>
    <ul class="doc-list">
      <li t="docs.dataBinding.commonMistakes.mistake1"></li>
      <li t="docs.dataBinding.commonMistakes.mistake2"></li>
      <li t="docs.dataBinding.commonMistakes.mistake3"></li>
    </ul>
  </div>

</div>

