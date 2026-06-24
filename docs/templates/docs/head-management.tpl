<!-- Head Management — from head-management.md -->

<div class="doc-content">

  <!-- Introduction -->
  <div class="doc-section">
    <p class="doc-text" t="docs.headManagement.intro.text"></p>
    <div class="callout">
      <p t="docs.headManagement.intro.routingTip" t-html></p>
    </div>
  </div>

  <!-- Placement -->
  <div class="doc-section">
    <h2 class="doc-title" id="head-placement" t="docs.headManagement.placement.title"></h2>
    <p class="doc-text" t="docs.headManagement.placement.text"></p>
    <div class="code-block"><pre><span class="hl-tag">&lt;div</span> <span class="hl-attr">hidden</span> <span class="hl-attr">page-title</span>=<span class="hl-str">"product.name + ' | My Store'"</span><span class="hl-tag">&gt;&lt;/div&gt;</span>
<span class="hl-tag">&lt;div</span> <span class="hl-attr">hidden</span> <span class="hl-attr">page-description</span>=<span class="hl-str">"product.description"</span><span class="hl-tag">&gt;&lt;/div&gt;</span>
<span class="hl-tag">&lt;div</span> <span class="hl-attr">hidden</span> <span class="hl-attr">page-canonical</span>=<span class="hl-str">"'/products/' + product.slug"</span><span class="hl-tag">&gt;&lt;/div&gt;</span>
<span class="hl-tag">&lt;div</span> <span class="hl-attr">hidden</span> <span class="hl-attr">page-jsonld</span><span class="hl-tag">&gt;</span>{"@type":"Product","name":"{product.name}","price":"{product.price}"}<span class="hl-tag">&lt;/div&gt;</span></pre></div>
    <p class="doc-text" t="docs.headManagement.placement.reactive"></p>
  </div>

  <!-- page-title -->
  <div class="doc-section">
    <h2 class="doc-title" id="head-page-title" t="docs.headManagement.pageTitle.title"></h2>
    <p class="doc-text" t="docs.headManagement.pageTitle.text"></p>
    <div class="code-block"><pre><span class="hl-cmt">&lt;!-- Static string --&gt;</span>
<span class="hl-tag">&lt;div</span> <span class="hl-attr">hidden</span> <span class="hl-attr">page-title</span>=<span class="hl-str">"'About Us | My Store'"</span><span class="hl-tag">&gt;&lt;/div&gt;</span>

<span class="hl-cmt">&lt;!-- Expression against local state --&gt;</span>
<span class="hl-tag">&lt;div</span> <span class="hl-attr">state</span>=<span class="hl-str">'{"name":"Sneaker X"}'</span><span class="hl-tag">&gt;</span>
  <span class="hl-tag">&lt;div</span> <span class="hl-attr">hidden</span> <span class="hl-attr">page-title</span>=<span class="hl-str">"name + ' | Store'"</span><span class="hl-tag">&gt;&lt;/div&gt;</span>
<span class="hl-tag">&lt;/div&gt;</span></pre></div>
    <p class="doc-text" t="docs.headManagement.pageTitle.expression"></p>
  </div>

  <!-- page-description -->
  <div class="doc-section">
    <h2 class="doc-title" id="head-page-description" t="docs.headManagement.pageDescription.title"></h2>
    <p class="doc-text" t="docs.headManagement.pageDescription.text"></p>
    <div class="code-block"><pre><span class="hl-tag">&lt;div</span> <span class="hl-attr">hidden</span> <span class="hl-attr">page-description</span>=<span class="hl-str">"product.description"</span><span class="hl-tag">&gt;&lt;/div&gt;</span>

<span class="hl-cmt">&lt;!-- Static --&gt;</span>
<span class="hl-tag">&lt;div</span> <span class="hl-attr">hidden</span> <span class="hl-attr">page-description</span>=<span class="hl-str">"'The best sneakers online'"</span><span class="hl-tag">&gt;&lt;/div&gt;</span></pre></div>
    <p class="doc-text" t="docs.headManagement.pageDescription.duplicate"></p>
  </div>

  <!-- page-canonical -->
  <div class="doc-section">
    <h2 class="doc-title" id="head-page-canonical" t="docs.headManagement.pageCanonical.title"></h2>
    <p class="doc-text" t="docs.headManagement.pageCanonical.text"></p>
    <div class="code-block"><pre><span class="hl-tag">&lt;div</span> <span class="hl-attr">hidden</span> <span class="hl-attr">page-canonical</span>=<span class="hl-str">"'/products/' + product.slug"</span><span class="hl-tag">&gt;&lt;/div&gt;</span>

<span class="hl-cmt">&lt;!-- Static --&gt;</span>
<span class="hl-tag">&lt;div</span> <span class="hl-attr">hidden</span> <span class="hl-attr">page-canonical</span>=<span class="hl-str">"'https://mystore.com/about'"</span><span class="hl-tag">&gt;&lt;/div&gt;</span></pre></div>
    <p class="doc-text" t="docs.headManagement.pageCanonical.existing"></p>
  </div>

  <!-- page-jsonld -->
  <div class="doc-section">
    <h2 class="doc-title" id="head-page-jsonld" t="docs.headManagement.pageJsonld.title"></h2>
    <p class="doc-text" t="docs.headManagement.pageJsonld.text"></p>
    <div class="code-block"><pre><span class="hl-tag">&lt;div</span> <span class="hl-attr">hidden</span> <span class="hl-attr">page-jsonld</span><span class="hl-tag">&gt;</span>
  {
    <span class="hl-str">"@context"</span>: <span class="hl-str">"https://schema.org"</span>,
    <span class="hl-str">"@type"</span>: <span class="hl-str">"Product"</span>,
    <span class="hl-str">"name"</span>: <span class="hl-str">"{product.name}"</span>,
    <span class="hl-str">"description"</span>: <span class="hl-str">"{product.description}"</span>,
    <span class="hl-str">"offers"</span>: {
      <span class="hl-str">"@type"</span>: <span class="hl-str">"Offer"</span>,
      <span class="hl-str">"price"</span>: <span class="hl-str">"{product.price}"</span>,
      <span class="hl-str">"priceCurrency"</span>: <span class="hl-str">"USD"</span>
    }
  }
<span class="hl-tag">&lt;/div&gt;</span></pre></div>
    <div class="callout">
      <p t="docs.headManagement.pageJsonld.scriptNote" t-html></p>
    </div>
    <p class="doc-text" t="docs.headManagement.pageJsonld.marker" t-html></p>

    <!-- Full product page example -->
    <h3 class="doc-subtitle" id="head-jsonld-full-example" t="docs.headManagement.pageJsonld.fullExampleTitle"></h3>
    <div class="code-block"><pre><span class="hl-tag">&lt;div</span> <span class="hl-attr">state</span>=<span class="hl-str">'{"product": null}'</span><span class="hl-tag">&gt;</span>
  <span class="hl-tag">&lt;div</span> <span class="hl-attr">get</span>=<span class="hl-str">"/api/products/{slug}"</span> <span class="hl-attr">as</span>=<span class="hl-str">"product"</span><span class="hl-tag">&gt;&lt;/div&gt;</span>

  <span class="hl-tag">&lt;div</span> <span class="hl-attr">hidden</span> <span class="hl-attr">page-title</span>=<span class="hl-str">"product.name + ' | My Store'"</span><span class="hl-tag">&gt;&lt;/div&gt;</span>
  <span class="hl-tag">&lt;div</span> <span class="hl-attr">hidden</span> <span class="hl-attr">page-description</span>=<span class="hl-str">"product.description"</span><span class="hl-tag">&gt;&lt;/div&gt;</span>
  <span class="hl-tag">&lt;div</span> <span class="hl-attr">hidden</span> <span class="hl-attr">page-canonical</span>=<span class="hl-str">"'/products/' + product.slug"</span><span class="hl-tag">&gt;&lt;/div&gt;</span>
  <span class="hl-tag">&lt;div</span> <span class="hl-attr">hidden</span> <span class="hl-attr">page-jsonld</span><span class="hl-tag">&gt;</span>
    {
      <span class="hl-str">"@context"</span>: <span class="hl-str">"https://schema.org"</span>,
      <span class="hl-str">"@type"</span>: <span class="hl-str">"Product"</span>,
      <span class="hl-str">"name"</span>: <span class="hl-str">"{product.name}"</span>,
      <span class="hl-str">"offers"</span>: {<span class="hl-str">"@type"</span>:<span class="hl-str">"Offer"</span>,<span class="hl-str">"price"</span>:<span class="hl-str">"{product.price}"</span>,<span class="hl-str">"priceCurrency"</span>:<span class="hl-str">"USD"</span>}
    }
  <span class="hl-tag">&lt;/div&gt;</span>

  <span class="hl-tag">&lt;h1</span> <span class="hl-attr">bind</span>=<span class="hl-str">"product.name"</span><span class="hl-tag">&gt;&lt;/h1&gt;</span>
  <span class="hl-tag">&lt;p</span> <span class="hl-attr">bind</span>=<span class="hl-str">"product.description"</span><span class="hl-tag">&gt;&lt;/p&gt;</span>
<span class="hl-tag">&lt;/div&gt;</span></pre></div>
  </div>

  <!-- Notes and edge cases -->
  <div class="doc-section">
    <h2 class="doc-title" id="head-notes" t="docs.headManagement.notes.title"></h2>

    <!-- Multiple directives competing -->
    <h3 class="doc-subtitle" id="head-notes-competing" t="docs.headManagement.notes.competingTitle"></h3>
    <p class="doc-text" t="docs.headManagement.notes.competingText"></p>

    <!-- Cleanup on unmount -->
    <h3 class="doc-subtitle" id="head-notes-cleanup" t="docs.headManagement.notes.cleanupTitle"></h3>
    <p class="doc-text" t="docs.headManagement.notes.cleanupText"></p>

    <!-- page-jsonld template capture -->
    <h3 class="doc-subtitle" id="head-notes-capture" t="docs.headManagement.notes.captureTitle"></h3>
    <p class="doc-text" t="docs.headManagement.notes.captureText"></p>
  </div>

</div>
