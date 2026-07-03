<!-- Hero Content -->
<header class="hero-content hero-left">
  <div class="hero-left-inner">
    <div class="hero-left-text">
      <div class="hero-header">
        <h1 class="headline headline-left headline-oversized">
          <span t="home.hero.headline1"></span><br>
          <span class="headline-highlight" t="home.hero.headline2"></span> JavaScript.
        </h1>

        <p class="subtitle subtitle-left subtitle-wide" t="home.hero.subtitle"></p>
      </div>

      <div class="actions-container actions-left">
        <a route="/docs" class="btn btn-primary" id="btn-get-started">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <polyline points="4 17 10 11 4 5"></polyline>
            <line x1="12" y1="19" x2="20" y2="19"></line>
          </svg>
          <span t="home.hero.getStarted"></span>
        </a>
        <a href="https://github.com/no-js-dev/nojs" class="btn btn-secondary" id="btn-github" target="_blank" rel="noopener noreferrer">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
            <path d="M12 .5C5.37.5 0 5.78 0 12.29c0 5.21 3.44 9.63 8.21 11.19.6.11.82-.25.82-.57 0-.28-.01-1.02-.02-2-3.34.71-4.04-1.58-4.04-1.58-.55-1.36-1.34-1.73-1.34-1.73-1.09-.73.08-.72.08-.72 1.21.08 1.84 1.22 1.84 1.22 1.07 1.8 2.81 1.28 3.5.98.11-.76.42-1.28.76-1.58-2.67-.3-5.47-1.31-5.47-5.81 0-1.28.47-2.33 1.23-3.15-.12-.3-.53-1.51.12-3.15 0 0 1-.32 3.3 1.2.96-.26 1.98-.39 3-.4 1.02.01 2.04.14 3 .4 2.29-1.52 3.29-1.2 3.29-1.2.65 1.64.24 2.85.12 3.15.77.82 1.23 1.87 1.23 3.15 0 4.51-2.81 5.5-5.49 5.79.43.36.81 1.08.81 2.18 0 1.58-.01 2.85-.01 3.24 0 .32.21.69.83.57C20.56 21.91 24 17.5 24 12.29 24 5.78 18.63.5 12 .5z"></path>
          </svg>
          <span t="home.hero.github"></span>
        </a>
      </div>

      <div class="hero-stats">
        <div class="hero-stat">
          <span class="hero-stat-value">0</span>
          <span class="hero-stat-label">dependencies</span>
        </div>
        <div class="hero-stat-divider"></div>
        <div class="hero-stat">
          <span class="hero-stat-value">40+</span>
          <span class="hero-stat-label">directives</span>
        </div>
      </div>

      <div class="cdn-snippet" use="cdn-snippet"></div>
    </div>

    <div class="hero-left-code" state="{ expanded: false }" class-expanded="expanded">
      <div class="hero-editor-backdrop" on:click="expanded = false"></div>
      <div class="hero-editor-placeholder"></div>
      <div class="editor-window">
        <div class="editor-header">
          <span class="editor-dot editor-dot-red"></span>
          <span class="editor-dot editor-dot-yellow"></span>
          <span class="editor-dot editor-dot-green"></span>
          <span class="editor-title">example.html</span>
          <span class="hero-editor-exp-label">Live Editor</span>
          <button class="editor-expand-btn" on:click="expanded = !expanded" aria-label="Try it live">
            <svg class="icon-expand" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 3 21 3 21 9"></polyline><polyline points="9 21 3 21 3 15"></polyline><line x1="21" y1="3" x2="14" y2="10"></line><line x1="3" y1="21" x2="10" y2="14"></line></svg>
            <svg class="icon-collapse" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="4 14 10 14 10 20"></polyline><polyline points="20 10 14 10 14 4"></polyline><line x1="14" y1="10" x2="21" y2="3"></line><line x1="3" y1="21" x2="10" y2="14"></line></svg>
          </button>
        </div>
        <div class="editor-body">
          <div id="hero-editor-mount"></div>
          <div class="hero-editor-preview-wrap">
            <div class="hero-editor-preview-bar">Preview</div>
            <iframe id="hero-live-preview" class="hero-editor-preview"></iframe>
          </div>
        </div>
      </div>
    </div>

  </div>
</header>

<!-- Main Content Body -->
<main class="page-body">
  <!-- Features Section -->
  <section id="features" class="page-section">
    <h2 class="section-title" t="home.features.title"></h2>
    <p class="section-subtitle" t="home.features.subtitle"></p>

    <div class="features-list">
      <div class="feature-item">
        <span class="feature-num">01</span>
        <div class="feature-body">
          <h3 class="feature-title" t="home.features.f1Title"></h3>
          <p class="feature-desc" t="home.features.f1Desc" t-html></p>
        </div>
      </div>
      <div class="feature-item">
        <span class="feature-num">02</span>
        <div class="feature-body">
          <h3 class="feature-title" t="home.features.f2Title"></h3>
          <p class="feature-desc" t="home.features.f2Desc" t-html></p>
        </div>
      </div>
      <div class="feature-item">
        <span class="feature-num">03</span>
        <div class="feature-body">
          <h3 class="feature-title" t="home.features.f3Title"></h3>
          <p class="feature-desc" t="home.features.f3Desc"></p>
        </div>
      </div>
      <div class="feature-item">
        <span class="feature-num">04</span>
        <div class="feature-body">
          <h3 class="feature-title" t="home.features.f4Title"></h3>
          <p class="feature-desc" t="home.features.f4Desc"></p>
        </div>
      </div>
    </div>
  </section>

  <div class="section-divider" use="section-divider"></div>

  <!-- Directives Section -->
  <section id="directives" class="page-section">
    <h2 class="section-title" t="home.directives.title"></h2>
    <p class="section-subtitle" t="home.directives.subtitle"></p>

    <div class="directives-container">
      <div class="directive-showcase" use="directive-card" state="{ badgeKey: 'home.directives.s1Badge', nameKey: 'home.directives.s1Name', descKey: 'home.directives.s1Desc', filename: 'form-binding.html' }">
        <pre class="editor-code"><code><span class="tok-punc">&lt;</span><span class="tok-tag">div</span> <span class="tok-attr">state</span><span class="tok-punc">=</span><span class="tok-str">"{ email: '' }"</span><span class="tok-punc">&gt;</span>
  <span class="tok-punc">&lt;</span><span class="tok-tag">input</span> <span class="tok-attr">type</span><span class="tok-punc">=</span><span class="tok-str">"email"</span> <span class="tok-attr">model</span><span class="tok-punc">=</span><span class="tok-str">"email"</span> <span class="tok-punc">/&gt;</span>
  <span class="tok-punc">&lt;</span><span class="tok-tag">p</span><span class="tok-punc">&gt;</span>Sending login link to <span class="tok-mustache">{{ email }}</span><span class="tok-punc">&lt;/</span><span class="tok-tag">p</span><span class="tok-punc">&gt;</span>
<span class="tok-punc">&lt;/</span><span class="tok-tag">div</span><span class="tok-punc">&gt;</span></code></pre>
      </div>

      <div class="directive-showcase" use="directive-card" state="{ badgeKey: 'home.directives.s2Badge', nameKey: 'home.directives.s2Name', descKey: 'home.directives.s2Desc', filename: 'conditional.html' }">
        <pre class="editor-code"><code><span class="tok-punc">&lt;</span><span class="tok-tag">button</span> <span class="tok-attr">on:click</span><span class="tok-punc">=</span><span class="tok-str">"expanded = !expanded"</span><span class="tok-punc">&gt;</span>Toggle Details<span class="tok-punc">&lt;/</span><span class="tok-tag">button</span><span class="tok-punc">&gt;</span>
<span class="tok-punc">&lt;</span><span class="tok-tag">div</span> <span class="tok-attr">show</span><span class="tok-punc">=</span><span class="tok-str">"expanded"</span><span class="tok-punc">&gt;</span>
  <span class="tok-punc">&lt;</span><span class="tok-tag">p</span><span class="tok-punc">&gt;</span>Interactive details layer loaded reactively.<span class="tok-punc">&lt;/</span><span class="tok-tag">p</span><span class="tok-punc">&gt;</span>
<span class="tok-punc">&lt;/</span><span class="tok-tag">div</span><span class="tok-punc">&gt;</span></code></pre>
      </div>

      <div class="directive-showcase" use="directive-card" state="{ badgeKey: 'home.directives.s3Badge', nameKey: 'home.directives.s3Name', descKey: 'home.directives.s3Desc', filename: 'list-rendering.html' }">
        <pre class="editor-code"><code><span class="tok-punc">&lt;</span><span class="tok-tag">ul</span><span class="tok-punc">&gt;</span>
  <span class="tok-punc">&lt;</span><span class="tok-tag">li</span> <span class="tok-attr">foreach</span><span class="tok-punc">=</span><span class="tok-str">"user in users"</span><span class="tok-punc">&gt;</span>
    <span class="tok-mustache">{{ $index + 1 }}</span>. <span class="tok-mustache">{{ user.name }}</span>
  <span class="tok-punc">&lt;/</span><span class="tok-tag">li</span><span class="tok-punc">&gt;</span>
<span class="tok-punc">&lt;/</span><span class="tok-tag">ul</span><span class="tok-punc">&gt;</span></code></pre>
      </div>
    </div>
  </section>

  <div class="section-divider" use="section-divider"></div>

  <!-- HTTP & Skeletons Section -->
  <section id="http" class="page-section">
    <h2 class="section-title" t="home.http.title"></h2>
    <p class="section-subtitle" t="home.http.subtitle"></p>

    <div class="http-showcase">
      <div class="http-explanation">
        <h3 class="feature-title" t="home.http.featureTitle"></h3>
        <p class="feature-desc" t="home.http.featureDesc" t-html></p>
        <div class="http-list">
          <div class="http-item">
            <div class="http-bullet">1</div>
            <div class="http-item-text">
              <strong t="home.http.item1Title"></strong>: <span t="home.http.item1Desc" t-html></span>
            </div>
          </div>
          <div class="http-item">
            <div class="http-bullet">2</div>
            <div class="http-item-text">
              <strong t="home.http.item2Title"></strong>: <span t="home.http.item2Desc" t-html></span>
            </div>
          </div>
          <div class="http-item">
            <div class="http-bullet">3</div>
            <div class="http-item-text">
              <strong t="home.http.item3Title"></strong>: <span t="home.http.item3Desc" t-html></span>
            </div>
          </div>
        </div>
      </div>

      <div class="http-preview-card">
        <div class="preview-tab-bar">
          <span class="preview-tab active" t="home.http.previewTab"></span>
        </div>
        <div class="skeleton-loader" aria-label="Loading profile content">
          <div class="sk-line title"></div>
          <div class="sk-line"></div>
          <div class="sk-line half"></div>
        </div>
      </div>
    </div>
  </section>

  <div class="section-divider" use="section-divider"></div>

  <!-- Manifesto Section -->
  <section id="manifesto" class="manifesto-section">
    <span class="manifesto-kicker" t="home.manifesto.kicker"></span>
    <div class="manifesto-columns">
      <div class="manifesto-col">
        <p t="home.manifesto.col1p1"></p>
        <p t="home.manifesto.col1p2"></p>
      </div>
      <div class="manifesto-col">
        <p t="home.manifesto.col2p1"></p>
        <p t="home.manifesto.col2p2"></p>
      </div>
      <div class="manifesto-col">
        <p t="home.manifesto.col3p1"></p>
        <p class="manifesto-closer" t="home.manifesto.col3p2"></p>
      </div>
    </div>
  </section>

  <div class="section-divider" use="section-divider"></div>

  <!-- Getting Started Section -->
  <section id="getting-started" class="page-section">
    <h2 class="section-title" t="home.getStarted.title"></h2>
    <p class="section-subtitle" t="home.getStarted.subtitle"></p>

    <div class="install-steps">
      <div class="install-step">
        <div class="install-step-number">1</div>
        <div class="install-step-content">
          <div class="install-step-header">
            <span class="install-option-label" t="home.getStarted.step1Label"></span>
            <span class="install-option-badge" t="home.getStarted.step1Badge"></span>
          </div>
          <p class="install-desc" t="home.getStarted.step1Desc" t-html></p>
          <a href="https://github.com/no-js-dev/nojs-skill" class="install-skill-link" target="_blank" rel="noopener noreferrer">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 .5C5.37.5 0 5.78 0 12.29c0 5.21 3.44 9.63 8.21 11.19.6.11.82-.25.82-.57 0-.28-.01-1.02-.02-2-3.34.71-4.04-1.58-4.04-1.58-.55-1.36-1.34-1.73-1.34-1.73-1.09-.73.08-.72.08-.72 1.21.08 1.84 1.22 1.84 1.22 1.07 1.8 2.81 1.28 3.5.98.11-.76.42-1.28.76-1.58-2.67-.3-5.47-1.31-5.47-5.81 0-1.28.47-2.33 1.23-3.15-.12-.3-.53-1.51.12-3.15 0 0 1-.32 3.3 1.2.96-.26 1.98-.39 3-.4 1.02.01 2.04.14 3 .4 2.29-1.52 3.29-1.2 3.29-1.2.65 1.64.24 2.85.12 3.15.77.82 1.23 1.87 1.23 3.15 0 4.51-2.81 5.5-5.49 5.79.43.36.81 1.08.81 2.18 0 1.58-.01 2.85-.01 3.24 0 .32.21.69.83.57C20.56 21.91 24 17.5 24 12.29 24 5.78 18.63.5 12 .5z"></path></svg>
            no-js-dev/nojs-skill
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M7 17L17 7"></path><path d="M7 7h10v10"></path></svg>
          </a>
        </div>
      </div>
      <div class="install-step">
        <div class="install-step-number">2</div>
        <div class="install-step-content">
          <div class="install-step-header">
            <span class="install-option-label" t="home.getStarted.step2Label"></span>
          </div>
          <p class="install-desc" t="home.getStarted.step2Desc"></p>
          <div class="cdn-snippet" use="cdn-snippet"></div>
        </div>
      </div>
    </div>
  </section>
</main>
