<header class="subpage-hero" use="subpage-hero" state="{ titleKey: 'examples.hero.title', subtitleKey: 'examples.hero.subtitle' }"></header>

<main class="page-body">

  <!-- ═══ Category 1: State & Binding ═══ -->
  <section class="page-section">
    <h2 class="section-title" t="examples.cat1.title"></h2>
    <p class="section-subtitle" t="examples.cat1.subtitle"></p>

    <div class="directives-container" style="margin-top: 3.5rem;">
      <div class="directive-showcase" use="directive-card" state="{ badge: $i18n.t('examples.counter.badge'), name: $i18n.t('examples.counter.name'), desc: $i18n.t('examples.counter.desc'), filename: 'counter.html' }">
        <pre class="editor-code"><code><span class="tok-punc">&lt;</span><span class="tok-tag">div</span> <span class="tok-attr">state</span><span class="tok-punc">=</span><span class="tok-str">"{ count: 0 }"</span><span class="tok-punc">&gt;</span>
  <span class="tok-punc">&lt;</span><span class="tok-tag">button</span> <span class="tok-attr">on:click</span><span class="tok-punc">=</span><span class="tok-str">"count++"</span><span class="tok-punc">&gt;</span>
    Count: <span class="tok-mustache">{{ count }}</span>
  <span class="tok-punc">&lt;/</span><span class="tok-tag">button</span><span class="tok-punc">&gt;</span>
  <span class="tok-punc">&lt;</span><span class="tok-tag">p</span> <span class="tok-attr">if</span><span class="tok-punc">=</span><span class="tok-str">"count &gt; 0"</span><span class="tok-punc">&gt;</span>
    Clicked <span class="tok-mustache">{{ count }}</span> times!
  <span class="tok-punc">&lt;/</span><span class="tok-tag">p</span><span class="tok-punc">&gt;</span>
<span class="tok-punc">&lt;/</span><span class="tok-tag">div</span><span class="tok-punc">&gt;</span></code></pre>
      </div>
    </div>

    <div class="directives-container showcase-reverse" style="margin-top: 2rem;">
      <div class="directive-showcase" use="directive-card" state="{ badge: $i18n.t('examples.binding.badge'), name: $i18n.t('examples.binding.name'), desc: $i18n.t('examples.binding.desc'), filename: 'binding.html' }">
        <pre class="editor-code"><code><span class="tok-punc">&lt;</span><span class="tok-tag">div</span> <span class="tok-attr">state</span><span class="tok-punc">=</span><span class="tok-str">"{ user: 'World' }"</span><span class="tok-punc">&gt;</span>
  <span class="tok-punc">&lt;</span><span class="tok-tag">input</span> <span class="tok-attr">model</span><span class="tok-punc">=</span><span class="tok-str">"user"</span>
         <span class="tok-attr">placeholder</span><span class="tok-punc">=</span><span class="tok-str">"Enter name..."</span> <span class="tok-punc">/&gt;</span>
  <span class="tok-punc">&lt;</span><span class="tok-tag">h1</span><span class="tok-punc">&gt;</span>Hello, <span class="tok-mustache">{{ user }}</span>!<span class="tok-punc">&lt;/</span><span class="tok-tag">h1</span><span class="tok-punc">&gt;</span>
<span class="tok-punc">&lt;/</span><span class="tok-tag">div</span><span class="tok-punc">&gt;</span></code></pre>
      </div>
    </div>

    <div class="directives-container" style="margin-top: 2rem;">
      <div class="directive-showcase" use="directive-card" state="{ badge: $i18n.t('examples.computed.badge'), name: $i18n.t('examples.computed.name'), desc: $i18n.t('examples.computed.desc'), filename: 'computed.html' }">
        <pre class="editor-code"><code><span class="tok-punc">&lt;</span><span class="tok-tag">div</span> <span class="tok-attr">state</span><span class="tok-punc">=</span><span class="tok-str">"{ price: 100, qty: 2 }"</span><span class="tok-punc">&gt;</span>
  <span class="tok-punc">&lt;</span><span class="tok-tag">input</span> <span class="tok-attr">type</span><span class="tok-punc">=</span><span class="tok-str">"number"</span> <span class="tok-attr">model</span><span class="tok-punc">=</span><span class="tok-str">"qty"</span> <span class="tok-punc">/&gt;</span>
  <span class="tok-punc">&lt;</span><span class="tok-tag">span</span> <span class="tok-attr">computed</span><span class="tok-punc">=</span><span class="tok-str">"total"</span>
        <span class="tok-attr">expr</span><span class="tok-punc">=</span><span class="tok-str">"price * qty"</span><span class="tok-punc">&gt;&lt;/</span><span class="tok-tag">span</span><span class="tok-punc">&gt;</span>
  <span class="tok-punc">&lt;</span><span class="tok-tag">p</span><span class="tok-punc">&gt;</span>Total: <span class="tok-mustache">{{ total | currency }}</span><span class="tok-punc">&lt;/</span><span class="tok-tag">p</span><span class="tok-punc">&gt;</span>
<span class="tok-punc">&lt;/</span><span class="tok-tag">div</span><span class="tok-punc">&gt;</span></code></pre>
      </div>
    </div>
  </section>

  <div class="section-divider" use="section-divider"></div>

  <!-- ═══ Category 2: Conditionals & Loops ═══ -->
  <section class="page-section">
    <h2 class="section-title" t="examples.cat2.title"></h2>
    <p class="section-subtitle" t="examples.cat2.subtitle"></p>

    <div class="directives-container" style="margin-top: 3.5rem;">
      <div class="directive-showcase" use="directive-card" state="{ badge: $i18n.t('examples.search.badge'), name: $i18n.t('examples.search.name'), desc: $i18n.t('examples.search.desc'), filename: 'search.html' }">
        <pre class="editor-code"><code><span class="tok-punc">&lt;</span><span class="tok-tag">div</span> <span class="tok-attr">state</span><span class="tok-punc">=</span><span class="tok-str">"{ q: '', items: ['HTML', 'CSS', 'NoJS'] }"</span><span class="tok-punc">&gt;</span>
  <span class="tok-punc">&lt;</span><span class="tok-tag">input</span> <span class="tok-attr">model</span><span class="tok-punc">=</span><span class="tok-str">"q"</span> <span class="tok-attr">placeholder</span><span class="tok-punc">=</span><span class="tok-str">"Search..."</span> <span class="tok-punc">/&gt;</span>
  <span class="tok-punc">&lt;</span><span class="tok-tag">ul</span><span class="tok-punc">&gt;</span>
    <span class="tok-punc">&lt;</span><span class="tok-tag">li</span> <span class="tok-attr">foreach</span><span class="tok-punc">=</span><span class="tok-str">"item in items"</span>
        <span class="tok-attr">if</span><span class="tok-punc">=</span><span class="tok-str">"item.includes(q)"</span>
        <span class="tok-attr">bind</span><span class="tok-punc">=</span><span class="tok-str">"item"</span><span class="tok-punc">&gt;&lt;/</span><span class="tok-tag">li</span><span class="tok-punc">&gt;</span>
  <span class="tok-punc">&lt;/</span><span class="tok-tag">ul</span><span class="tok-punc">&gt;</span>
<span class="tok-punc">&lt;/</span><span class="tok-tag">div</span><span class="tok-punc">&gt;</span></code></pre>
      </div>
    </div>

    <div class="directives-container showcase-reverse" style="margin-top: 2rem;">
      <div class="directive-showcase" use="directive-card" state="{ badge: $i18n.t('examples.todo.badge'), name: $i18n.t('examples.todo.name'), desc: $i18n.t('examples.todo.desc'), filename: 'todo.html' }">
        <pre class="editor-code"><code><span class="tok-punc">&lt;</span><span class="tok-tag">div</span> <span class="tok-attr">state</span><span class="tok-punc">=</span><span class="tok-str">"{ task: '', todos: [] }"</span><span class="tok-punc">&gt;</span>
  <span class="tok-punc">&lt;</span><span class="tok-tag">input</span> <span class="tok-attr">model</span><span class="tok-punc">=</span><span class="tok-str">"task"</span>
         <span class="tok-attr">on:keydown.enter</span><span class="tok-punc">=</span><span class="tok-str">"todos.push(task); task = ''"</span> <span class="tok-punc">/&gt;</span>
  <span class="tok-punc">&lt;</span><span class="tok-tag">ul</span><span class="tok-punc">&gt;</span>
    <span class="tok-punc">&lt;</span><span class="tok-tag">li</span> <span class="tok-attr">foreach</span><span class="tok-punc">=</span><span class="tok-str">"t in todos"</span> <span class="tok-attr">key</span><span class="tok-punc">=</span><span class="tok-str">"$index"</span><span class="tok-punc">&gt;</span>
      <span class="tok-mustache">{{ t }}</span>
      <span class="tok-punc">&lt;</span><span class="tok-tag">button</span> <span class="tok-attr">on:click</span><span class="tok-punc">=</span><span class="tok-str">"todos.splice($index, 1)"</span><span class="tok-punc">&gt;</span>&times;<span class="tok-punc">&lt;/</span><span class="tok-tag">button</span><span class="tok-punc">&gt;</span>
    <span class="tok-punc">&lt;/</span><span class="tok-tag">li</span><span class="tok-punc">&gt;</span>
  <span class="tok-punc">&lt;/</span><span class="tok-tag">ul</span><span class="tok-punc">&gt;</span>
<span class="tok-punc">&lt;/</span><span class="tok-tag">div</span><span class="tok-punc">&gt;</span></code></pre>
      </div>
    </div>

    <div class="directives-container" style="margin-top: 2rem;">
      <div class="directive-showcase" use="directive-card" state="{ badge: $i18n.t('examples.switchCase.badge'), name: $i18n.t('examples.switchCase.name'), desc: $i18n.t('examples.switchCase.desc'), filename: 'switch.html' }">
        <pre class="editor-code"><code><span class="tok-punc">&lt;</span><span class="tok-tag">div</span> <span class="tok-attr">state</span><span class="tok-punc">=</span><span class="tok-str">"{ role: 'viewer' }"</span><span class="tok-punc">&gt;</span>
  <span class="tok-punc">&lt;</span><span class="tok-tag">select</span> <span class="tok-attr">model</span><span class="tok-punc">=</span><span class="tok-str">"role"</span><span class="tok-punc">&gt;</span>
    <span class="tok-punc">&lt;</span><span class="tok-tag">option</span> <span class="tok-attr">value</span><span class="tok-punc">=</span><span class="tok-str">"admin"</span><span class="tok-punc">&gt;</span>Admin<span class="tok-punc">&lt;/</span><span class="tok-tag">option</span><span class="tok-punc">&gt;</span>
    <span class="tok-punc">&lt;</span><span class="tok-tag">option</span> <span class="tok-attr">value</span><span class="tok-punc">=</span><span class="tok-str">"editor"</span><span class="tok-punc">&gt;</span>Editor<span class="tok-punc">&lt;/</span><span class="tok-tag">option</span><span class="tok-punc">&gt;</span>
    <span class="tok-punc">&lt;</span><span class="tok-tag">option</span> <span class="tok-attr">value</span><span class="tok-punc">=</span><span class="tok-str">"viewer"</span><span class="tok-punc">&gt;</span>Viewer<span class="tok-punc">&lt;/</span><span class="tok-tag">option</span><span class="tok-punc">&gt;</span>
  <span class="tok-punc">&lt;/</span><span class="tok-tag">select</span><span class="tok-punc">&gt;</span>
  <span class="tok-punc">&lt;</span><span class="tok-tag">div</span> <span class="tok-attr">switch</span><span class="tok-punc">=</span><span class="tok-str">"role"</span><span class="tok-punc">&gt;</span>
    <span class="tok-punc">&lt;</span><span class="tok-tag">p</span> <span class="tok-attr">case</span><span class="tok-punc">=</span><span class="tok-str">"'admin'"</span><span class="tok-punc">&gt;</span>Full access<span class="tok-punc">&lt;/</span><span class="tok-tag">p</span><span class="tok-punc">&gt;</span>
    <span class="tok-punc">&lt;</span><span class="tok-tag">p</span> <span class="tok-attr">case</span><span class="tok-punc">=</span><span class="tok-str">"'editor'"</span><span class="tok-punc">&gt;</span>Edit only<span class="tok-punc">&lt;/</span><span class="tok-tag">p</span><span class="tok-punc">&gt;</span>
    <span class="tok-punc">&lt;</span><span class="tok-tag">p</span> <span class="tok-attr">default</span><span class="tok-punc">&gt;</span>Read only<span class="tok-punc">&lt;/</span><span class="tok-tag">p</span><span class="tok-punc">&gt;</span>
  <span class="tok-punc">&lt;/</span><span class="tok-tag">div</span><span class="tok-punc">&gt;</span>
<span class="tok-punc">&lt;/</span><span class="tok-tag">div</span><span class="tok-punc">&gt;</span></code></pre>
      </div>
    </div>
  </section>

  <div class="section-divider" use="section-divider"></div>

  <!-- ═══ Category 3: Data Fetching ═══ -->
  <section class="page-section">
    <h2 class="section-title" t="examples.cat3.title"></h2>
    <p class="section-subtitle" t="examples.cat3.subtitle"></p>

    <div class="directives-container" style="margin-top: 3.5rem;">
      <div class="directive-showcase" use="directive-card" state="{ badge: $i18n.t('examples.fetch.badge'), name: $i18n.t('examples.fetch.name'), desc: $i18n.t('examples.fetch.desc'), filename: 'fetch.html' }">
        <pre class="editor-code"><code><span class="tok-punc">&lt;</span><span class="tok-tag">div</span> <span class="tok-attr">id</span><span class="tok-punc">=</span><span class="tok-str">"sk"</span> <span class="tok-attr">class</span><span class="tok-punc">=</span><span class="tok-str">"skeleton"</span><span class="tok-punc">&gt;</span>Loading...<span class="tok-punc">&lt;/</span><span class="tok-tag">div</span><span class="tok-punc">&gt;</span>
<span class="tok-punc">&lt;</span><span class="tok-tag">div</span> <span class="tok-attr">get</span><span class="tok-punc">=</span><span class="tok-str">"/api/user"</span> <span class="tok-attr">as</span><span class="tok-punc">=</span><span class="tok-str">"user"</span> <span class="tok-attr">skeleton</span><span class="tok-punc">=</span><span class="tok-str">"sk"</span><span class="tok-punc">&gt;</span>
  <span class="tok-punc">&lt;</span><span class="tok-tag">h2</span> <span class="tok-attr">bind</span><span class="tok-punc">=</span><span class="tok-str">"user.name"</span><span class="tok-punc">&gt;&lt;/</span><span class="tok-tag">h2</span><span class="tok-punc">&gt;</span>
  <span class="tok-punc">&lt;</span><span class="tok-tag">p</span> <span class="tok-attr">bind</span><span class="tok-punc">=</span><span class="tok-str">"user.email | lowercase"</span><span class="tok-punc">&gt;&lt;/</span><span class="tok-tag">p</span><span class="tok-punc">&gt;</span>
<span class="tok-punc">&lt;/</span><span class="tok-tag">div</span><span class="tok-punc">&gt;</span></code></pre>
      </div>
    </div>

    <div class="directives-container showcase-reverse" style="margin-top: 2rem;">
      <div class="directive-showcase" use="directive-card" state="{ badge: $i18n.t('examples.formPost.badge'), name: $i18n.t('examples.formPost.name'), desc: $i18n.t('examples.formPost.desc'), filename: 'form-post.html' }">
        <pre class="editor-code"><code><span class="tok-punc">&lt;</span><span class="tok-tag">form</span> <span class="tok-attr">state</span><span class="tok-punc">=</span><span class="tok-str">"{ email: '' }"</span>
      <span class="tok-attr">on:submit.prevent</span><span class="tok-punc">&gt;</span>
  <span class="tok-punc">&lt;</span><span class="tok-tag">input</span> <span class="tok-attr">model</span><span class="tok-punc">=</span><span class="tok-str">"email"</span> <span class="tok-attr">type</span><span class="tok-punc">=</span><span class="tok-str">"email"</span>
         <span class="tok-attr">placeholder</span><span class="tok-punc">=</span><span class="tok-str">"you@example.com"</span> <span class="tok-punc">/&gt;</span>
  <span class="tok-punc">&lt;</span><span class="tok-tag">p</span><span class="tok-punc">&gt;</span>Sending to: <span class="tok-mustache">{{ email }}</span><span class="tok-punc">&lt;/</span><span class="tok-tag">p</span><span class="tok-punc">&gt;</span>
  <span class="tok-punc">&lt;</span><span class="tok-tag">button</span> <span class="tok-attr">post</span><span class="tok-punc">=</span><span class="tok-str">"/subscribe"</span>
          <span class="tok-attr">body</span><span class="tok-punc">=</span><span class="tok-str">'{"email":"{email}"}'</span><span class="tok-punc">&gt;</span>
    Subscribe
  <span class="tok-punc">&lt;/</span><span class="tok-tag">button</span><span class="tok-punc">&gt;</span>
<span class="tok-punc">&lt;/</span><span class="tok-tag">form</span><span class="tok-punc">&gt;</span></code></pre>
      </div>
    </div>

    <div class="directives-container" style="margin-top: 2rem;">
      <div class="directive-showcase" use="directive-card" state="{ badge: $i18n.t('examples.pagination.badge'), name: $i18n.t('examples.pagination.name'), desc: $i18n.t('examples.pagination.desc'), filename: 'pagination.html' }">
        <pre class="editor-code"><code><span class="tok-punc">&lt;</span><span class="tok-tag">div</span> <span class="tok-attr">get</span><span class="tok-punc">=</span><span class="tok-str">"/posts?page={page}"</span>
     <span class="tok-attr">as</span><span class="tok-punc">=</span><span class="tok-str">"posts"</span>
     <span class="tok-attr">get-trigger</span><span class="tok-punc">=</span><span class="tok-str">"button"</span>
     <span class="tok-attr">get-insert</span><span class="tok-punc">=</span><span class="tok-str">"append"</span>
     <span class="tok-attr">get-page</span><span class="tok-punc">=</span><span class="tok-str">"1"</span><span class="tok-punc">&gt;</span>
  <span class="tok-punc">&lt;</span><span class="tok-tag">article</span> <span class="tok-attr">each</span><span class="tok-punc">=</span><span class="tok-str">"post in posts"</span> <span class="tok-attr">key</span><span class="tok-punc">=</span><span class="tok-str">"post.id"</span><span class="tok-punc">&gt;</span>
    <span class="tok-punc">&lt;</span><span class="tok-tag">h3</span> <span class="tok-attr">bind</span><span class="tok-punc">=</span><span class="tok-str">"post.title"</span><span class="tok-punc">&gt;&lt;/</span><span class="tok-tag">h3</span><span class="tok-punc">&gt;</span>
  <span class="tok-punc">&lt;/</span><span class="tok-tag">article</span><span class="tok-punc">&gt;</span>
<span class="tok-punc">&lt;/</span><span class="tok-tag">div</span><span class="tok-punc">&gt;</span></code></pre>
      </div>
    </div>
  </section>

  <div class="section-divider" use="section-divider"></div>

  <!-- ═══ Category 4: Routing & Templates ═══ -->
  <section class="page-section">
    <h2 class="section-title" t="examples.cat4.title"></h2>
    <p class="section-subtitle" t="examples.cat4.subtitle"></p>

    <div class="directives-container" style="margin-top: 3.5rem;">
      <div class="directive-showcase" use="directive-card" state="{ badge: $i18n.t('examples.router.badge'), name: $i18n.t('examples.router.name'), desc: $i18n.t('examples.router.desc'), filename: 'router.html' }">
        <pre class="editor-code"><code><span class="tok-punc">&lt;</span><span class="tok-tag">nav</span><span class="tok-punc">&gt;</span>
  <span class="tok-punc">&lt;</span><span class="tok-tag">a</span> <span class="tok-attr">route</span><span class="tok-punc">=</span><span class="tok-str">"/"</span> <span class="tok-attr">route-active</span><span class="tok-punc">=</span><span class="tok-str">"active"</span><span class="tok-punc">&gt;</span>Home<span class="tok-punc">&lt;/</span><span class="tok-tag">a</span><span class="tok-punc">&gt;</span>
  <span class="tok-punc">&lt;</span><span class="tok-tag">a</span> <span class="tok-attr">route</span><span class="tok-punc">=</span><span class="tok-str">"/about"</span> <span class="tok-attr">route-active</span><span class="tok-punc">=</span><span class="tok-str">"active"</span><span class="tok-punc">&gt;</span>About<span class="tok-punc">&lt;/</span><span class="tok-tag">a</span><span class="tok-punc">&gt;</span>
<span class="tok-punc">&lt;/</span><span class="tok-tag">nav</span><span class="tok-punc">&gt;</span>
<span class="tok-punc">&lt;</span><span class="tok-tag">main</span> <span class="tok-attr">route-view</span><span class="tok-punc">&gt;&lt;/</span><span class="tok-tag">main</span><span class="tok-punc">&gt;</span>
<span class="tok-punc">&lt;</span><span class="tok-tag">template</span> <span class="tok-attr">route</span><span class="tok-punc">=</span><span class="tok-str">"/"</span><span class="tok-punc">&gt;</span>
  <span class="tok-punc">&lt;</span><span class="tok-tag">h1</span><span class="tok-punc">&gt;</span>Welcome<span class="tok-punc">&lt;/</span><span class="tok-tag">h1</span><span class="tok-punc">&gt;</span>
<span class="tok-punc">&lt;/</span><span class="tok-tag">template</span><span class="tok-punc">&gt;</span>
<span class="tok-punc">&lt;</span><span class="tok-tag">template</span> <span class="tok-attr">route</span><span class="tok-punc">=</span><span class="tok-str">"/about"</span><span class="tok-punc">&gt;</span>
  <span class="tok-punc">&lt;</span><span class="tok-tag">h1</span><span class="tok-punc">&gt;</span>About Us<span class="tok-punc">&lt;/</span><span class="tok-tag">h1</span><span class="tok-punc">&gt;</span>
<span class="tok-punc">&lt;/</span><span class="tok-tag">template</span><span class="tok-punc">&gt;</span></code></pre>
      </div>
    </div>

    <div class="directives-container showcase-reverse" style="margin-top: 2rem;">
      <div class="directive-showcase" use="directive-card" state="{ badge: $i18n.t('examples.templates.badge'), name: $i18n.t('examples.templates.name'), desc: $i18n.t('examples.templates.desc'), filename: 'templates.html' }">
        <pre class="editor-code"><code><span class="tok-punc">&lt;</span><span class="tok-tag">template</span> <span class="tok-attr">id</span><span class="tok-punc">=</span><span class="tok-str">"card"</span><span class="tok-punc">&gt;</span>
  <span class="tok-punc">&lt;</span><span class="tok-tag">div</span> <span class="tok-attr">class</span><span class="tok-punc">=</span><span class="tok-str">"card"</span><span class="tok-punc">&gt;</span>
    <span class="tok-punc">&lt;</span><span class="tok-tag">h3</span> <span class="tok-attr">bind</span><span class="tok-punc">=</span><span class="tok-str">"title"</span><span class="tok-punc">&gt;&lt;/</span><span class="tok-tag">h3</span><span class="tok-punc">&gt;</span>
    <span class="tok-punc">&lt;</span><span class="tok-tag">slot</span><span class="tok-punc">&gt;&lt;/</span><span class="tok-tag">slot</span><span class="tok-punc">&gt;</span>
  <span class="tok-punc">&lt;/</span><span class="tok-tag">div</span><span class="tok-punc">&gt;</span>
<span class="tok-punc">&lt;/</span><span class="tok-tag">template</span><span class="tok-punc">&gt;</span>

<span class="tok-punc">&lt;</span><span class="tok-tag">div</span> <span class="tok-attr">use</span><span class="tok-punc">=</span><span class="tok-str">"card"</span>
     <span class="tok-attr">state</span><span class="tok-punc">=</span><span class="tok-str">"{ title: 'Hello' }"</span><span class="tok-punc">&gt;</span>
  <span class="tok-punc">&lt;</span><span class="tok-tag">p</span><span class="tok-punc">&gt;</span>Slot content here.<span class="tok-punc">&lt;/</span><span class="tok-tag">p</span><span class="tok-punc">&gt;</span>
<span class="tok-punc">&lt;/</span><span class="tok-tag">div</span><span class="tok-punc">&gt;</span></code></pre>
      </div>
    </div>

    <div class="directives-container" style="margin-top: 2rem;">
      <div class="directive-showcase" use="directive-card" state="{ badge: $i18n.t('examples.dynamicStyles.badge'), name: $i18n.t('examples.dynamicStyles.name'), desc: $i18n.t('examples.dynamicStyles.desc'), filename: 'styles.html' }">
        <pre class="editor-code"><code><span class="tok-punc">&lt;</span><span class="tok-tag">div</span> <span class="tok-attr">state</span><span class="tok-punc">=</span><span class="tok-str">"{ dark: false, size: 16 }"</span><span class="tok-punc">&gt;</span>
  <span class="tok-punc">&lt;</span><span class="tok-tag">button</span> <span class="tok-attr">on:click</span><span class="tok-punc">=</span><span class="tok-str">"dark = !dark"</span><span class="tok-punc">&gt;</span>
    Toggle Theme
  <span class="tok-punc">&lt;/</span><span class="tok-tag">button</span><span class="tok-punc">&gt;</span>
  <span class="tok-punc">&lt;</span><span class="tok-tag">input</span> <span class="tok-attr">type</span><span class="tok-punc">=</span><span class="tok-str">"range"</span> <span class="tok-attr">model</span><span class="tok-punc">=</span><span class="tok-str">"size"</span>
         <span class="tok-attr">min</span><span class="tok-punc">=</span><span class="tok-str">"12"</span> <span class="tok-attr">max</span><span class="tok-punc">=</span><span class="tok-str">"32"</span> <span class="tok-punc">/&gt;</span>
  <span class="tok-punc">&lt;</span><span class="tok-tag">p</span> <span class="tok-attr">class-dark</span><span class="tok-punc">=</span><span class="tok-str">"dark"</span>
     <span class="tok-attr">style-font-size</span><span class="tok-punc">=</span><span class="tok-str">"size + 'px'"</span><span class="tok-punc">&gt;</span>
    Styled text
  <span class="tok-punc">&lt;/</span><span class="tok-tag">p</span><span class="tok-punc">&gt;</span>
<span class="tok-punc">&lt;/</span><span class="tok-tag">div</span><span class="tok-punc">&gt;</span></code></pre>
      </div>
    </div>
  </section>

  <div class="section-divider" use="section-divider"></div>

  <!-- CTA Section -->
  <section class="page-section" style="text-align: center; padding-bottom: 8rem;">
    <h2 class="section-title">Ready to try it?</h2>
    <p class="section-subtitle">Copy any example, drop it in an HTML file, add the CDN script tag, and open in a browser.</p>
    <div style="margin-top: 2.5rem; display: flex; justify-content: center; gap: 1rem;">
      <a route="/docs" class="btn btn-primary">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
          <polyline points="4 17 10 11 4 5"></polyline>
          <line x1="12" y1="19" x2="20" y2="19"></line>
        </svg>
        Read the Docs
      </a>
      <a route="/playground" class="btn btn-secondary">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
          <polygon points="5 3 19 12 5 21 5 3"></polygon>
        </svg>
        Open Playground
      </a>
    </div>
  </section>
</main>
