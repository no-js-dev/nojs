/**
 * NoJS Live Editor — lightweight, reusable code editor with syntax highlighting.
 *
 * Usage:
 *   NoJSEditor.create(container, {
 *     code: '<div state="{x: 0}">...</div>',
 *     lang: 'html',            // html | css | js | json
 *     preview: iframeElement,  // optional — renders code into this iframe
 *     onChange: fn,            // optional callback(code)
 *     readOnly: false
 *   });
 *
 * The container gets populated with line numbers + a textarea overlaid on
 * a highlighted <pre>. All styling uses existing hl-* classes.
 */
;(function(root) {
  'use strict';

  // ── Syntax Highlighting ──
  function escapeHTML(s) {
    return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  function _hl(escaped, passes) {
    var ph = [], n = 0;
    function mk(cls, text) {
      var tok = '\x00#' + (n++) + '#\x00';
      ph.push('<span class="hl-' + cls + '">' + text + '</span>');
      return tok;
    }
    var r = escaped;
    for (var i = 0; i < passes.length; i++)
      r = r.replace(passes[i][0], passes[i][1](mk));
    for (var j = 0; j < ph.length; j++)
      r = r.split('\x00#' + j + '#\x00').join(ph[j]);
    return r;
  }

  var highlighters = {
    html: function(code) {
      return _hl(escapeHTML(code), [
        [/(&lt;!--[\s\S]*?--&gt;)/g,  function(mk) { return function(_, c) { return mk('cmt', c); }; }],
        [/(&lt;\/?)([\w-]+)/g,        function(mk) { return function(_, o, t) { return o + mk('tag', t); }; }],
        [/([\w:.-]+)(=)/g,              function(mk) { return function(_, a, e) { return mk('attr', a) + e; }; }],
        [/("[^"]*"|'[^']*')/g,         function(mk) { return function(_, s) { return mk('str', s); }; }]
      ]);
    },
    css: function(code) {
      return _hl(escapeHTML(code), [
        [/(\/\*[\s\S]*?\*\/)/g,        function(mk) { return function(_, c) { return mk('cmt', c); }; }],
        [/([\w.-]+)(\s*\{)/g,          function(mk) { return function(_, s, b) { return mk('tag', s) + b; }; }],
        [/([\w-]+)(\s*:)/g,            function(mk) { return function(_, p, c) { return mk('attr', p) + c; }; }],
        [/("[^"]*"|'[^']*')/g,         function(mk) { return function(_, s) { return mk('str', s); }; }],
        [/(\d+(?:\.\d+)?(?:px|em|rem|%|vh|vw|s|ms)?)/g, function(mk) { return function(_, n) { return mk('num', n); }; }]
      ]);
    },
    js: function(code) {
      return _hl(escapeHTML(code), [
        [/(\/\/.*$)/gm,                function(mk) { return function(_, c) { return mk('cmt', c); }; }],
        [/(\/\*[\s\S]*?\*\/)/g,        function(mk) { return function(_, c) { return mk('cmt', c); }; }],
        [/\b(const|let|var|function|return|if|else|for|while|true|false|null|undefined|new|this|class|import|export|default|async|await)\b/g, function(mk) { return function(_, k) { return mk('kw', k); }; }],
        [/("[^"]*"|'[^']*'|`[^`]*`)/g, function(mk) { return function(_, s) { return mk('str', s); }; }],
        [/(\d+(?:\.\d+)?)/g,           function(mk) { return function(_, n) { return mk('num', n); }; }]
      ]);
    },
    json: function(code) {
      return _hl(escapeHTML(code), [
        [/("(?:\\.|[^"\\])*")(\s*:)/g, function(mk) { return function(_, k, c) { return mk('attr', k) + c; }; }],
        [/:\s*("(?:\\.|[^"\\])*")/g,   function(mk) { return function(_, v) { return ': ' + mk('str', v); }; }],
        [/\b(true|false|null)\b/g,     function(mk) { return function(_, k) { return mk('kw', k); }; }],
        [/(\d+(?:\.\d+)?)/g,           function(mk) { return function(_, n) { return mk('num', n); }; }]
      ]);
    }
  };

  function highlight(code, lang) {
    return (highlighters[lang] || highlighters.html)(code);
  }

  // ── Preview Rendering ──
  function renderPreview(iframe, code) {
    if (!iframe) return;
    var doc = '<!DOCTYPE html><html><head><style>'
      + 'body{font-family:system-ui,-apple-system,sans-serif;color:#e2e8f0;background:#0d0f14;padding:1.5rem;margin:0;font-size:14px;line-height:1.6}'
      + 'button{background:#2563eb;color:#fff;border:none;padding:.5rem 1.25rem;border-radius:4px;cursor:pointer;font-size:14px;font-family:inherit;transition:background .15s}'
      + 'button:hover{background:#1d4ed8}'
      + 'input,select,textarea{background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.1);color:#e2e8f0;padding:.5rem .75rem;border-radius:4px;font-size:14px;font-family:inherit;outline:none}'
      + 'input:focus,textarea:focus{border-color:#2563eb}'
      + 'p{margin:.75rem 0}ul,ol{padding-left:1.25rem}li{margin:.25rem 0}'
      + 'h1,h2,h3{margin:.5rem 0}'
      + '</style></head><body>' + code
      + '<script src="https://cdn.no-js.dev/"><\/script></body></html>';
    iframe.srcdoc = doc;
  }

  // ── Editor Instance ──
  function create(container, opts) {
    opts = opts || {};
    var lang = opts.lang || 'html';
    var code = opts.code || '';
    var preview = opts.preview || null;
    var onChange = opts.onChange || null;
    var readOnly = opts.readOnly || false;
    var debounceMs = opts.debounce || 350;
    var timer;

    // Build DOM
    var wrap = document.createElement('div');
    wrap.className = 'nj-editor';

    var lines = document.createElement('div');
    lines.className = 'nj-editor-lines';
    lines.setAttribute('aria-hidden', 'true');

    var codeWrap = document.createElement('div');
    codeWrap.className = 'nj-editor-code-wrap';

    var pre = document.createElement('pre');
    pre.className = 'nj-editor-highlight';
    pre.setAttribute('aria-hidden', 'true');

    var ta = document.createElement('textarea');
    ta.className = 'nj-editor-textarea';
    ta.spellcheck = false;
    ta.autocomplete = 'off';
    ta.autocorrect = 'off';
    ta.autocapitalize = 'off';
    if (readOnly) ta.readOnly = true;

    codeWrap.appendChild(pre);
    codeWrap.appendChild(ta);
    wrap.appendChild(lines);
    wrap.appendChild(codeWrap);
    container.appendChild(wrap);

    function updateLineNumbers(text) {
      var count = (text.match(/\n/g) || []).length + 1;
      var html = '';
      for (var i = 1; i <= count; i++) html += '<div>' + i + '</div>';
      lines.innerHTML = html;
    }

    function render() {
      var val = ta.value;
      pre.innerHTML = highlight(val, lang) + '\n';
      updateLineNumbers(val);
      if (onChange) onChange(val);
    }

    function schedulePreview() {
      clearTimeout(timer);
      timer = setTimeout(function() {
        renderPreview(preview, ta.value);
      }, debounceMs);
    }

    // Scroll sync
    ta.addEventListener('scroll', function() {
      pre.scrollTop = ta.scrollTop;
      pre.scrollLeft = ta.scrollLeft;
      lines.scrollTop = ta.scrollTop;
    });

    // Input handling
    ta.addEventListener('input', function() {
      render();
      if (preview) schedulePreview();
    });

    // Tab key support
    ta.addEventListener('keydown', function(e) {
      if (e.key === 'Tab') {
        e.preventDefault();
        var start = ta.selectionStart;
        var end = ta.selectionEnd;
        ta.value = ta.value.substring(0, start) + '  ' + ta.value.substring(end);
        ta.selectionStart = ta.selectionEnd = start + 2;
        render();
        if (preview) schedulePreview();
      }
    });

    // Set initial code
    ta.value = code;
    render();
    if (preview) renderPreview(preview, code);

    return {
      getCode: function() { return ta.value; },
      setCode: function(c) { ta.value = c; render(); if (preview) renderPreview(preview, c); },
      setLang: function(l) { lang = l; render(); },
      setReadOnly: function(v) { readOnly = v; ta.readOnly = v; },
      focus: function() { ta.focus(); },
      destroy: function() { container.removeChild(wrap); },
      element: wrap,
      textarea: ta
    };
  }

  root.NoJSEditor = { create: create, highlight: highlight, renderPreview: renderPreview };

})(window);
