/**
 * Playground Engine — powers the No.JS interactive sandbox
 *
 * Responsibilities:
 * 1. Build complete HTML from virtual files and inject into iframe via srcdoc
 * 2. Intercept console.* from iframe and pipe to Console Panel
 * 3. Create Blob URLs for .tpl and .json files (simulated file-based routing)
 * 4. Debounce updates (300ms)
 * 5. Persist state to localStorage
 * 6. Manage editor: syntax highlighting, cursor, tabs, line numbers
 */
(function PlaygroundEngine() {
  'use strict';

  // ── Constants ──
  var STORAGE_KEY = 'nojs-playground';
  var DEBOUNCE_MS = 300;
  var MAX_HISTORY = 50;
  var MAX_CONSOLE_LINES = 200;

  // ── Wait for NoJS to be ready ──
  // Element may not exist yet (template still loading).
  // Also handles re-navigation (user leaves and comes back).
  var _initialized = false;

  function waitForContext(cb) {
    _initialized = false;
    var tries = 0;
    var poll = setInterval(function() {
      var el = document.querySelector('.playground-page');
      if (!el) {
        if (++tries > 200) clearInterval(poll);
        return;
      }
      var c = typeof NoJS !== 'undefined' && NoJS.findContext ? NoJS.findContext(el) : null;
      if (c && c.files !== undefined) {
        clearInterval(poll);
        if (!_initialized) {
          _initialized = true;
          cb(c, el);
        }
      } else if (++tries > 200) {
        clearInterval(poll);
      }
    }, 50);
  }

  // Re-initialize on hashchange (user navigates away and comes back)
  window.addEventListener('hashchange', function() {
    if (location.hash.indexOf('#/playground') === 0 || location.hash === '#/playground') {
      // Small delay to let router load the template
      setTimeout(function() {
        if (!document.querySelector('.playground-page')) return;
        waitForContext(boot);
      }, 100);
    } else {
      _initialized = false;
    }
  });

  function boot(ctx, pageEl) {
    var iframe = pageEl.querySelector('.preview-iframe');
    var updateTimer = null;
    var blobUrls = [];

    // ── Dialog helpers (replace alert / confirm / prompt) ──
    var dialogEl     = pageEl.querySelector('.pg-dialog');
    var dialogTitle  = dialogEl.querySelector('.pg-dialog-title');
    var dialogMsg    = dialogEl.querySelector('.pg-dialog-msg');
    var dialogInput  = dialogEl.querySelector('.pg-dialog-input');
    var dialogOk     = dialogEl.querySelector('.pg-dialog-ok');
    var dialogCancel = dialogEl.querySelector('.pg-dialog-cancel');
    var _dialogResolve = null;

    function _showDialog(opts) {
      dialogTitle.textContent = opts.title || '';
      dialogMsg.textContent   = opts.message || '';
      dialogInput.style.display = opts.input ? '' : 'none';
      dialogInput.value = opts.inputValue || '';
      dialogInput.placeholder = opts.inputPlaceholder || '';
      dialogCancel.style.display = opts.showCancel ? '' : 'none';
      dialogOk.textContent = opts.okLabel || 'OK';
      dialogCancel.textContent = opts.cancelLabel || 'Cancel';
      dialogEl.classList.toggle('pg-dialog--success', opts.variant === 'success');
      dialogEl.classList.toggle('pg-dialog--error',   opts.variant === 'error');
      dialogEl.showModal();
      if (opts.input) {
        dialogInput.focus();
        dialogInput.select();
      } else {
        dialogOk.focus();
      }
      return new Promise(function(resolve) { _dialogResolve = resolve; });
    }

    dialogOk.addEventListener('click', function() {
      var val = dialogInput.style.display === 'none' ? true : dialogInput.value;
      dialogEl.close();
      if (_dialogResolve) _dialogResolve(val);
    });
    dialogCancel.addEventListener('click', function() {
      dialogEl.close();
      if (_dialogResolve) _dialogResolve(null);
    });
    dialogEl.addEventListener('cancel', function() {
      if (_dialogResolve) _dialogResolve(null);
    });
    dialogInput.addEventListener('keydown', function(e) {
      if (e.key === 'Enter') { e.preventDefault(); dialogOk.click(); }
    });

    function pgAlert(message, opts)  { return _showDialog({ title: (opts && opts.title) || '', message: message, variant: (opts && opts.variant) || '', okLabel: 'OK' }); }
    function pgConfirm(message)      { return _showDialog({ title: '⚠️', message: message, showCancel: true, okLabel: 'Confirm', cancelLabel: 'Cancel' }); }
    function pgPrompt(message, dflt) { return _showDialog({ title: '', message: message, input: true, inputValue: dflt || '', showCancel: true, okLabel: 'OK', cancelLabel: 'Cancel' }); }

    // ── Default examples (fetched from separate files) ──
    var EXAMPLE_FILES = ['kanban.html', 'chat.html', 'settings.html'];
    var EXAMPLE_BASE = 'playground/examples/';
    var defaultFiles = {};
    var defaultTabs = EXAMPLE_FILES.slice();

    // ── Syntax Highlighting ──
    // Placeholder system: each regex pass inserts a token (\x00N\x00) instead
    // of a real <span>. This prevents later regexes from matching class= and
    // "hl-xxx" inside spans that were added by earlier passes.
    function escapeHTML(str) {
      return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    }

    function _hl(escaped, passes) {
      var ph = [], n = 0;
      function mk(cls, text) {
        var tok = '\x00' + (n++) + '\x00';
        ph.push('<span class="hl-' + cls + '">' + text + '</span>');
        return tok;
      }
      var r = escaped;
      for (var i = 0; i < passes.length; i++) {
        r = r.replace(passes[i][0], passes[i][1](mk));
      }
      for (var j = 0; j < ph.length; j++) {
        r = r.split('\x00' + j + '\x00').join(ph[j]);
      }
      return r;
    }

    function highlightHTML(code) {
      return _hl(escapeHTML(code), [
        [/(&lt;!--[\s\S]*?--&gt;)/g,  function(mk) { return function(_, c) { return mk('cmt', c); }; }],
        [/(&lt;\/?)([\w-]+)/g,        function(mk) { return function(_, o, t) { return o + mk('tag', t); }; }],
        [/([\w-]+)(=)/g,               function(mk) { return function(_, a, e) { return mk('attr', a) + e; }; }],
        [/("[^"]*"|'[^']*')/g,       function(mk) { return function(_, s) { return mk('str', s); }; }]
      ]);
    }

    function highlightCSS(code) {
      return _hl(escapeHTML(code), [
        [/(\/\*[\s\S]*?\*\/)/g,    function(mk) { return function(_, c) { return mk('cmt', c); }; }],
        [/([\w.-]+)(\s*\{)/g,        function(mk) { return function(_, s, b) { return mk('tag', s) + b; }; }],
        [/([\w-]+)(\s*:)/g,           function(mk) { return function(_, p, c) { return mk('attr', p) + c; }; }],
        [/("[^"]*"|'[^']*')/g,      function(mk) { return function(_, s) { return mk('str', s); }; }],
        [/(\d+(?:\.\d+)?(?:px|em|rem|%|vh|vw|s|ms)?)/g, function(mk) { return function(_, n) { return mk('num', n); }; }]
      ]);
    }

    function highlightJS(code) {
      return _hl(escapeHTML(code), [
        [/(\/\/.*$)/gm,              function(mk) { return function(_, c) { return mk('cmt', c); }; }],
        [/(\/\*[\s\S]*?\*\/)/g,    function(mk) { return function(_, c) { return mk('cmt', c); }; }],
        [/\b(const|let|var|function|return|if|else|for|while|true|false|null|undefined|new|this|class|import|export|default|async|await)\b/g, function(mk) { return function(_, k) { return mk('kw', k); }; }],
        [/("[^"]*"|'[^']*'|`[^`]*`)/g, function(mk) { return function(_, s) { return mk('str', s); }; }],
        [/(\d+(?:\.\d+)?)/g,        function(mk) { return function(_, n) { return mk('num', n); }; }]
      ]);
    }

    function highlightJSON(code) {
      return _hl(escapeHTML(code), [
        [/("(?:\\.|[^"\\])*")(\s*:)/g, function(mk) { return function(_, k, c) { return mk('attr', k) + c; }; }],
        [/:\s*("(?:\\.|[^"\\])*")/g,  function(mk) { return function(_, v) { return ': ' + mk('str', v); }; }],
        [/\b(true|false|null)\b/g,        function(mk) { return function(_, k) { return mk('kw', k); }; }],
        [/(\d+(?:\.\d+)?)/g,             function(mk) { return function(_, n) { return mk('num', n); }; }]
      ]);
    }

    function getLanguage(path) {
      if (path.endsWith('.html') || path.endsWith('.tpl')) return 'html';
      if (path.endsWith('.css')) return 'css';
      if (path.endsWith('.js')) return 'js';
      if (path.endsWith('.json')) return 'json';
      return 'html';
    }

    function highlight(code, lang) {
      var highlighters = { html: highlightHTML, css: highlightCSS, js: highlightJS, json: highlightJSON };
      return (highlighters[lang] || highlightHTML)(code);
    }

    // ── Cursor Save / Restore (Selection API) ──
    function saveSelection(el) {
      var sel = window.getSelection();
      if (!sel.rangeCount) return null;
      var range = sel.getRangeAt(0);
      var preRange = range.cloneRange();
      preRange.selectNodeContents(el);
      preRange.setEnd(range.startContainer, range.startOffset);
      return preRange.toString().length;
    }

    function restoreSelection(el, offset) {
      if (offset === null || offset === undefined) return;
      var walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
      var charCount = 0;
      while (walker.nextNode()) {
        var nodeLen = walker.currentNode.length;
        if (charCount + nodeLen >= offset) {
          var range = document.createRange();
          range.setStart(walker.currentNode, offset - charCount);
          range.collapse(true);
          var sel = window.getSelection();
          sel.removeAllRanges();
          sel.addRange(range);
          return;
        }
        charCount += nodeLen;
      }
    }

    // ── Line Numbers ──
    function updateLineNumbers() {
      var codeEl = pageEl.querySelector('.code-editable');
      var lineNumEl = pageEl.querySelector('.line-numbers');
      if (!codeEl || !lineNumEl) return;
      var text = codeEl.textContent || '';
      var count = text.split('\n').length;
      var nums = [];
      for (var i = 1; i <= count; i++) { nums.push(i); }
      lineNumEl.textContent = nums.join('\n');
    }

    // ── Render with highlight (preserving cursor) ──
    function renderHighlighted(code, lang) {
      var codeEl = pageEl.querySelector('.code-editable');
      if (!codeEl) return;
      var offset = saveSelection(codeEl);
      codeEl.innerHTML = highlight(code, lang);
      restoreSelection(codeEl, offset);
      updateLineNumbers();
    }

    // ── Build Preview HTML ──
    function escapeRegex(str) {
      return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    }

    function getMimeType(path) {
      if (path.endsWith('.html') || path.endsWith('.tpl')) return 'text/html';
      if (path.endsWith('.css')) return  'text/css';
      if (path.endsWith('.js')) return 'application/javascript';
      if (path.endsWith('.json')) return 'application/json';
      return 'text/plain';
    }

    function revokeBlobs() {
      blobUrls.forEach(function(u) { try { URL.revokeObjectURL(u); } catch(e) {} });
      blobUrls = [];
    }

    function buildPreview(files) {
      revokeBlobs();

      var mainFile = ctx.activeFile || 'kanban.html';
      var mainHtml = files[mainFile] ? files[mainFile].content : '';

      // Create Blob URLs for each non-main file
      var blobMap = {};
      Object.keys(files).forEach(function(path) {
        if (path === mainFile) return;
        var blob = new Blob([files[path].content], { type: getMimeType(path) });
        var blobUrl = URL.createObjectURL(blob);
        blobMap[path] = blobUrl;
        blobUrls.push(blobUrl);
      });

      // Rewrite src/href/get paths to Blob URLs
      var processedHtml = mainHtml;
      Object.keys(blobMap).forEach(function(path) {
        processedHtml = processedHtml.replace(
          new RegExp('(src|href|get)=["\']' + escapeRegex(path) + '["\']', 'g'),
          '$1="' + blobMap[path] + '"'
        );
      });

      // Build complete HTML document
      return '<!DOCTYPE html>\n'
        + '<html>\n'
        + '<head>\n'
        + '  <base href="' + location.origin + '/">\n'
        + '  <meta charset="UTF-8">\n'
        + '  <meta name="viewport" content="width=device-width, initial-scale=1.0">\n'
        + '  <script>\n'
        + '    // Intercept console to send to parent\n'
        + '    ["log","warn","error","info"].forEach(function(method) {\n'
        + '      var orig = console[method];\n'
        + '      console[method] = function() {\n'
        + '        var args = Array.prototype.slice.call(arguments);\n'
        + '        orig.apply(console, args);\n'
        + '        try {\n'
        + '          window.parent.postMessage({\n'
        + '            type: "playground-console",\n'
        + '            method: method,\n'
        + '            args: args.map(function(a) { return typeof a === "object" ? JSON.stringify(a, null, 2) : String(a); }),\n'
        + '            time: new Date().toLocaleTimeString()\n'
        + '          }, "*");\n'
        + '        } catch(e) {}\n'
        + '      };\n'
        + '    });\n'
        + '    // Intercept errors\n'
        + '    window.onerror = function(msg, src, line, col) {\n'
        + '      window.parent.postMessage({\n'
        + '        type: "playground-console",\n'
        + '        method: "error",\n'
        + '        args: [msg + " (line " + line + ")"],\n'
        + '        time: new Date().toLocaleTimeString()\n'
        + '      }, "*");\n'
        + '    };\n'
        + '  <\/script>\n'
        + '  <script src="https://cdn.jsdelivr.net/npm/@tailwindcss/browser@latest"><\/script>\n'
        + '  <script src="' + (location.hostname === 'localhost' ? '/__local__/no.js' : 'https://cdn.no-js.dev/') + '"><\/script>\n'
        + '  <script src="https://cdn-elements.no-js.dev/"><\/script>\n'
        + '</head>\n'
        + '<body class="font-sans">\n'
        + processedHtml + '\n'
        + '</body>\n'
        + '</html>';
    }

    // ── Console Message Listener ──
    window.addEventListener('message', function(e) {
      if (e.data && e.data.type === 'playground-console') {
        var lines = ctx.consoleLines.slice();
        lines.push({
          type: e.data.method,
          message: e.data.args.join(' '),
          time: e.data.time
        });
        // Cap at max lines
        if (lines.length > MAX_CONSOLE_LINES) {
          lines = lines.slice(lines.length - MAX_CONSOLE_LINES);
        }
        ctx.consoleLines = lines;
        // Auto-scroll
        requestAnimationFrame(function() {
          var body = pageEl.querySelector('.console-body');
          if (body) body.scrollTop = body.scrollHeight;
        });
      }
    });

    // ── localStorage Persistence ──
    function saveToLocalStorage() {
      try {
        var data = {
          files: ctx.files,
          openTabs: ctx.openTabs,
          activeFile: ctx.activeFile
        };
        localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
      } catch(e) { /* quota exceeded or private mode */ }
    }

    function loadFromLocalStorage() {
      try {
        var raw = localStorage.getItem(STORAGE_KEY);
        if (!raw) return null;
        var data = JSON.parse(raw);
        if (!data.files || !Object.keys(data.files).length) return null;
        return data;
      } catch(e) {
        return null;
      }
    }

    // ── Debounced Preview Update ──
    function scheduleUpdate() {
      clearTimeout(updateTimer);
      updateTimer = setTimeout(function() {
        // Push to history
        var historySnapshot = JSON.parse(JSON.stringify(ctx.files));
        var history = ctx.history.slice(0, ctx.historyIndex + 1);
        history.push(historySnapshot);
        if (history.length > MAX_HISTORY) {
          history = history.slice(history.length - MAX_HISTORY);
        }
        ctx.history = history;
        ctx.historyIndex = history.length - 1;

        // Rebuild preview
        ctx.consoleLines = [];
        iframe.srcdoc = buildPreview(ctx.files);

        // Persist
        saveToLocalStorage();
      }, DEBOUNCE_MS);
    }

    // ── Editor Handlers ──
    ctx.onCodeChange = function() {
      var codeEl = pageEl.querySelector('.code-editable');
      if (!codeEl) return;
      var plainText = codeEl.textContent;
      if (ctx.files[ctx.activeFile]) {
        ctx.files[ctx.activeFile].content = plainText;
      }
      // Re-highlight preserving cursor
      renderHighlighted(plainText, getLanguage(ctx.activeFile));
      // Schedule preview update
      scheduleUpdate();
    };

    // ── Tab key (inserts 2 spaces) ──
    ctx.insertTab = function(e) {
      if (e) e.preventDefault();
      var sel = window.getSelection();
      if (!sel.rangeCount) return;
      var range = sel.getRangeAt(0);
      var spaces = document.createTextNode('  ');
      range.deleteContents();
      range.insertNode(spaces);
      range.setStartAfter(spaces);
      range.collapse(true);
      sel.removeAllRanges();
      sel.addRange(range);
      ctx.onCodeChange();
    };

    // ── Enter (auto-indent) ──
    ctx.insertNewline = function(e) {
      if (e) e.preventDefault();
      var codeEl = pageEl.querySelector('.code-editable');
      if (!codeEl) return;
      var sel = window.getSelection();
      if (!sel.rangeCount) return;
      var range = sel.getRangeAt(0);
      var offset = saveSelection(codeEl);
      var textBefore = codeEl.textContent.substring(0, offset);
      var currentLine = textBefore.split('\n').pop();
      var indent = (currentLine.match(/^(\s*)/) || ['', ''])[1];
      var extraIndent = currentLine.trimEnd().endsWith('>') ? '  ' : '';
      var newline = document.createTextNode('\n' + indent + extraIndent);
      range.deleteContents();
      range.insertNode(newline);
      range.setStartAfter(newline);
      range.collapse(true);
      sel.removeAllRanges();
      sel.addRange(range);
      ctx.onCodeChange();
    };

    // ── Paste (plain text only) ──
    ctx.handlePaste = function(e) {
      if (e) e.preventDefault();
      var text = (e.clipboardData || window.clipboardData).getData('text/plain');
      var sel = window.getSelection();
      if (!sel.rangeCount) return;
      var range = sel.getRangeAt(0);
      range.deleteContents();
      range.insertNode(document.createTextNode(text));
      range.collapse(false);
      sel.removeAllRanges();
      sel.addRange(range);
      ctx.onCodeChange();
    };

    // ── Tab Management ──
    ctx.switchTab = function(path) {
      if (path === ctx.activeFile) return;
      // Save scroll position of current tab
      var editorBody = pageEl.querySelector('.editor-body');
      if (editorBody) {
        ctx.tabScrollPositions[ctx.activeFile] = editorBody.scrollTop;
      }
      ctx.activeFile = path;
      // Re-render editor content and preview
      if (ctx.files[path]) {
        ctx.consoleLines = [];
        iframe.srcdoc = buildPreview(ctx.files);
        requestAnimationFrame(function() {
          renderHighlighted(ctx.files[path].content, getLanguage(path));
          if (editorBody) {
            editorBody.scrollTop = ctx.tabScrollPositions[path] || 0;
          }
        });
      }
      saveToLocalStorage();
    };

    ctx.closeTab = function(path) {
      if (ctx.openTabs.length <= 1) return; // minimum 1 tab
      var idx = ctx.openTabs.indexOf(path);
      ctx.openTabs = ctx.openTabs.filter(function(t) { return t !== path; });
      delete ctx.tabScrollPositions[path];
      // If closed the active tab, activate adjacent
      if (ctx.activeFile === path) {
        ctx.activeFile = ctx.openTabs[Math.min(idx, ctx.openTabs.length - 1)];
        var newPath = ctx.activeFile;
        ctx.consoleLines = [];
        iframe.srcdoc = buildPreview(ctx.files);
        requestAnimationFrame(function() {
          if (ctx.files[newPath]) {
            renderHighlighted(ctx.files[newPath].content, getLanguage(newPath));
          }
        });
      }
      saveToLocalStorage();
    };

    // ── Create File ──
    ctx.promptCreateFile = function() {
      pgPrompt('File name (e.g. app.js, about.html):').then(function(name) {
        if (name) ctx.createFile(name.trim());
      });
    };

    ctx.createFile = function(name) {
      if (!name || ctx.files[name]) return;
      var ext = name.split('.').pop();
      var defaults = {
        html: '<!-- New file -->\n',
        css: '/* New styles */\n',
        js: '// New script\n',
        json: '{\n  \n}\n',
        tpl: '<!-- New template -->\n'
      };
      ctx.files[name] = {
        name: name,
        content: defaults[ext] || ''
      };
      ctx.openTabs = ctx.openTabs.concat([name]);
      ctx.activeFile = name;
      requestAnimationFrame(function() {
        renderHighlighted(ctx.files[name].content, getLanguage(name));
      });
      saveToLocalStorage();
    };

    // ── Toolbar Actions ──
    ctx.resetProject = function() {
      pgConfirm('Reset to original? Your changes will be lost.').then(function(ok) {
        if (!ok) return;
        localStorage.removeItem(STORAGE_KEY);
        return fetchDefaults().then(function() {
          ctx.files = JSON.parse(JSON.stringify(defaultFiles));
          ctx.openTabs = defaultTabs.slice();
          ctx.activeFile = 'kanban.html';
          ctx.tabScrollPositions = {};
          ctx.history = [JSON.parse(JSON.stringify(defaultFiles))];
          ctx.historyIndex = 0;
          ctx.consoleLines = [];
          requestAnimationFrame(function() {
            renderHighlighted(ctx.files['kanban.html'].content, 'html');
            iframe.srcdoc = buildPreview(ctx.files);
          });
        });
      });
    };

    ctx.sharePlayground = function() {
      try {
        var json = JSON.stringify(ctx.files);
        // Simple base64 encoding (works for most cases, ~1.3x size)
        var encoded = btoa(unescape(encodeURIComponent(json)));
        var url = location.origin + location.pathname + '#/playground?code=' + encodeURIComponent(encoded);
        if (navigator.clipboard && navigator.clipboard.writeText) {
          navigator.clipboard.writeText(url).then(function() {
            pgAlert('Link copied to clipboard!', { title: '\u2705', variant: 'success' });
          });
        } else {
          // Fallback — show link in prompt-style dialog for manual copy
          pgPrompt('Copy this link:', url);
        }
      } catch(e) {
        pgAlert('Could not generate share link.', { title: '\u274C', variant: 'error' });
      }
    };

    ctx.downloadProject = function() {
      try {
        var html = buildPreview(ctx.files);
        var blob = new Blob([html], { type: 'text/html' });
        var url = URL.createObjectURL(blob);
        var a = document.createElement('a');
        a.href = url;
        a.download = 'nojs-playground.html';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      } catch(e) {
        pgAlert('Could not download project.', { title: '\u274C', variant: 'error' });
      }
    };

    ctx.refreshPreview = function() {
      ctx.consoleLines = [];
      iframe.srcdoc = buildPreview(ctx.files);
    };

    // ── Splitter Drag ──
    ctx.startSplitterDrag = function(e) {
      e.preventDefault();
      var main = pageEl.querySelector('.playground-main');
      var splitter = pageEl.querySelector('.playground-splitter');
      if (!main) return;
      splitter.classList.add('dragging');
      var startX = e.clientX;
      var mainRect = main.getBoundingClientRect();
      var startWidth = mainRect.width;
      var currentPos = ctx.splitterPos;

      function onMove(ev) {
        var dx = ev.clientX - startX;
        var pct = currentPos + (dx / startWidth) * 100;
        pct = Math.max(20, Math.min(80, pct));
        ctx.splitterPos = pct;
        main.style.gridTemplateColumns = pct + '% 4px ' + (100 - pct) + '%';
      }

      function onUp() {
        splitter.classList.remove('dragging');
        document.removeEventListener('mousemove', onMove);
        document.removeEventListener('mouseup', onUp);
      }

      document.addEventListener('mousemove', onMove);
      document.addEventListener('mouseup', onUp);
    };

    // ── Undo / Redo (Ctrl+Z / Ctrl+Y) ──
    document.addEventListener('keydown', function(e) {
      // Only intercept in playground context
      if (!pageEl.contains(document.activeElement)) return;

      if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
        e.preventDefault();
        if (ctx.historyIndex > 0) {
          ctx.historyIndex--;
          ctx.files = JSON.parse(JSON.stringify(ctx.history[ctx.historyIndex]));
          refreshEditorAndPreview();
        }
      } else if ((e.ctrlKey || e.metaKey) && (e.key === 'y' || (e.key === 'z' && e.shiftKey))) {
        e.preventDefault();
        if (ctx.historyIndex < ctx.history.length - 1) {
          ctx.historyIndex++;
          ctx.files = JSON.parse(JSON.stringify(ctx.history[ctx.historyIndex]));
          refreshEditorAndPreview();
        }
      } else if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault(); // prevent browser save dialog
        saveToLocalStorage();
      }
    });

    function refreshEditorAndPreview() {
      var path = ctx.activeFile;
      if (ctx.files[path]) {
        renderHighlighted(ctx.files[path].content, getLanguage(path));
      }
      ctx.consoleLines = [];
      iframe.srcdoc = buildPreview(ctx.files);
      saveToLocalStorage();
    }

    // ── Fetch default example files ──
    function fetchDefaults() {
      return Promise.all(EXAMPLE_FILES.map(function(name) {
        return fetch(EXAMPLE_BASE + name).then(function(r) { return r.text(); }).then(function(html) {
          defaultFiles[name] = { name: name, content: html };
        });
      }));
    }

    // ── Initialize ──
    function init() {
      fetchDefaults().then(function() {
        // Priority: 1) share link, 2) localStorage, 3) defaultFiles
        var hashParts = location.hash.split('?');
        var urlParams = new URLSearchParams(hashParts[1] || '');
        var sharedCode = urlParams.get('code');

        if (sharedCode) {
          try {
            var decoded = decodeURIComponent(sharedCode);
            var json = decodeURIComponent(escape(atob(decoded)));
            ctx.files = JSON.parse(json);
            ctx.openTabs = Object.keys(ctx.files);
            ctx.activeFile = ctx.openTabs[0];
            ctx.tabScrollPositions = {};
          } catch(e) {
            // Fallback to defaults
            ctx.files = JSON.parse(JSON.stringify(defaultFiles));
            ctx.openTabs = defaultTabs.slice();
            ctx.activeFile = 'kanban.html';
          }
        } else {
          var saved = loadFromLocalStorage();
          if (saved) {
            ctx.files = saved.files;
            ctx.openTabs = saved.openTabs || Object.keys(saved.files);
            ctx.activeFile = saved.activeFile || Object.keys(saved.files)[0];
          } else {
            ctx.files = JSON.parse(JSON.stringify(defaultFiles));
            ctx.openTabs = defaultTabs.slice();
            ctx.activeFile = 'kanban.html';
          }
        }

        ctx.history = [JSON.parse(JSON.stringify(ctx.files))];
        ctx.historyIndex = 0;
        ctx.consoleLines = [];
        ctx.tabScrollPositions = {};

        // Initial render
        requestAnimationFrame(function() {
          renderHighlighted(ctx.files[ctx.activeFile].content, getLanguage(ctx.activeFile));
          iframe.srcdoc = buildPreview(ctx.files);
        });
      });
    }

    init();
  }

  waitForContext(boot);
})();
