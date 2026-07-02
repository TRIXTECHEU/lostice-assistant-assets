/* TrixTech s.r.o. @2026 */

(function (window, document) {
  'use strict';

  if (window.__GreetingBubbleLoaded) return;
  window.__GreetingBubbleLoaded = true;

  var DEFAULTS = {
    name:        'Pan Tvarůžek',
    message:     'Dobrý den, jak vám můžeme pomoci?',
    showTitle:   true,
    anim:        'typewriter',
    delay:       3000,
    autoHide:    40000,
    once:        true,
    openOnHover: false,
    launcherTimeout: 6000,
    color:        '#D9A426',
    bg:           '#ffffff',
    textColor:    '#374151',
    radius:       '15px',
    width:        '230px',
    font:         'system-ui, -apple-system, sans-serif',
    bottomOffset: '115px',
    rightOffset:  '20px',
  };

  var cfg = Object.assign({}, DEFAULTS, window.GreetingBubbleConfig || {});

  var SESSION_KEY = 'gb_shown';

  function seen() {
    if (!cfg.once) return false;
    try { return sessionStorage.getItem(SESSION_KEY) === '1'; } catch (e) { return false; }
  }
  function markSeen() {
    if (!cfg.once) return;
    try { sessionStorage.setItem(SESSION_KEY, '1'); } catch (e) {}
  }

  if (seen()) return;

  var CSS = `
    .gb-wrap {
      position: fixed;
      bottom: var(--gb-bottom);
      right: var(--gb-right);
      z-index: 101;
      display: flex;
      flex-direction: column;
      align-items: flex-end;
      pointer-events: none;
    }

    .gb-bubble {
      pointer-events: auto;
      position: relative;
      width: min(var(--gb-width), calc(100vw - 100px));
      background: var(--gb-bg);
      color: var(--gb-text);
      border-radius: var(--gb-radius);
      border: none;
      padding: 12px 30px 12px 14px;
      box-shadow: 0 10px 30px rgba(0,0,0,0.12), 0 2px 6px rgba(0,0,0,0.06);
      opacity: 0;
      transform: translateY(6px) scale(0.97);
      transition: opacity 0.3s ease, transform 0.3s ease;
      box-sizing: border-box;
      font-family: var(--gb-font);
      font-size: 13px;
      line-height: 1.4;
      cursor: pointer;
    }

    .gb-bubble.gb-show {
      opacity: 1;
      transform: translateY(0) scale(1);
    }

    .gb-bubble.gb-hide {
      opacity: 0;
      transform: translateY(6px) scale(0.94);
      transition: opacity 0.45s ease, transform 0.45s ease;
      pointer-events: none;
    }

    .gb-bubble::after {
      content: "";
      display: block;
      position: absolute;
      right: 18px;
      bottom: -6px;
      width: 12px;
      height: 12px;
      background: var(--gb-bg);
      transform: rotate(45deg);
      box-shadow: 2px 2px 4px rgba(0, 0, 0, 0.04);
      border-radius: 0 0 3px 0;
    }

    .gb-label {
      font-size: 10px;
      font-weight: 700;
      letter-spacing: 0.08em;
      text-transform: uppercase;
      color: var(--gb-color);
      margin-bottom: 4px;
      font-family: inherit;
    }

    .gb-text {
      font-size: 13px;
      line-height: 1.4;
      color: var(--gb-text);
      min-height: 1.4em;
    }

    .gb-close {
      display: flex;
      position: absolute;
      top: 6px;
      right: 6px;
      width: 20px;
      height: 20px;
      border: none;
      background: transparent;
      color: #9ca3af;
      font-size: 14px;
      line-height: 1;
      cursor: pointer;
      border-radius: 50%;
      align-items: center;
      justify-content: center;
      padding: 0;
      transition: background 0.15s ease, color 0.15s ease;
    }

    .gb-close:hover {
      background: #f3f4f6;
      color: #374151;
    }

    .gb-caret {
      display: inline-block;
      width: 1px;
      height: 1em;
      background: currentColor;
      margin-left: 1px;
      vertical-align: -2px;
      animation: gb-blink 0.9s steps(1, end) infinite;
    }

    @keyframes gb-blink {
      0%, 50%   { opacity: 1; }
      51%, 100% { opacity: 0; }
    }

    @media (prefers-reduced-motion: reduce) {
      .gb-bubble { transition: none !important; }
      .gb-caret  { animation: none !important; }
    }
  `;

  function injectCSS() {
    if (document.getElementById('gb-styles')) return;
    var s = document.createElement('style');
    s.id = 'gb-styles';
    s.textContent = CSS;
    document.head.appendChild(s);
  }

  var wrap, bubble, textEl;
  var dismissed = false;
  var shown = false;
  var animTimer = null;
  var hideTimer = null;

  function clearAnim() { if (animTimer) { clearTimeout(animTimer); animTimer = null; } }
  function clearHide() { if (hideTimer) { clearTimeout(hideTimer); hideTimer = null; } }

  function openChat() {
    try {
      var c = window.voiceflow && window.voiceflow.chat;
      if (c && c.open) c.open();
    } catch (e) { console.error(e); }
  }

  function onChatMessage(e) {
    if (typeof e.data !== 'string' || e.data.indexOf('voiceflow:') === -1) return;
    try {
      var d = JSON.parse(e.data);
      if (d && typeof d.type === 'string' && d.type.indexOf('open') !== -1) {
        markSeen();
        hideBubble();
      }
    } catch (_) {}
  }

  function removeChatListener() {
    window.removeEventListener('message', onChatMessage);
  }

  function applyVars() {
    wrap.style.setProperty('--gb-color',  cfg.color);
    wrap.style.setProperty('--gb-bg',     cfg.bg);
    wrap.style.setProperty('--gb-text',   cfg.textColor);
    wrap.style.setProperty('--gb-radius', cfg.radius);
    wrap.style.setProperty('--gb-width',  cfg.width);
    wrap.style.setProperty('--gb-font',   cfg.font);
    wrap.style.setProperty('--gb-bottom', cfg.bottomOffset);
    wrap.style.setProperty('--gb-right',  cfg.rightOffset);
  }

  function buildDOM() {
    wrap = document.createElement('div');
    wrap.className = 'gb-wrap';
    applyVars();

    bubble = document.createElement('div');
    bubble.className = 'gb-bubble';
    bubble.setAttribute('role', 'button');
    bubble.setAttribute('tabindex', '0');
    bubble.setAttribute('aria-label', (cfg.name ? cfg.name + ': ' : '') + cfg.message);

    bubble.addEventListener('click', function () {
      markSeen();
      openChat();
      hideBubble();
    });
    bubble.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); bubble.click(); }
    });

    if (cfg.openOnHover) {
      bubble.addEventListener('mouseenter', function () {
        markSeen();
        openChat();
        hideBubble();
      });
    }

    var closeBtn = document.createElement('button');
    closeBtn.className = 'gb-close';
    closeBtn.setAttribute('aria-label', 'Zavřít');
    closeBtn.textContent = '✕';
    closeBtn.addEventListener('click', function (e) {
      e.stopPropagation();
      dismissed = true;
      markSeen();
      hideBubble();
    });

    if (cfg.showTitle && cfg.name) {
      var labelEl = document.createElement('div');
      labelEl.className = 'gb-label';
      labelEl.textContent = cfg.name.toUpperCase();
      bubble.appendChild(labelEl);
    }

    textEl = document.createElement('div');
    textEl.className = 'gb-text';

    bubble.appendChild(closeBtn);
    bubble.appendChild(textEl);
    wrap.appendChild(bubble);
    document.body.appendChild(wrap);
  }

  function typeChars(full, opts) {
    clearAnim();
    textEl.textContent = '';
    var caret = document.createElement('span');
    caret.className = 'gb-caret';
    textEl.appendChild(caret);

    var hesitateAt = opts.hesitate ? Math.max(6, Math.floor(full.length * 0.45)) : -1;
    var rewind = opts.hesitate ? Math.min(3, hesitateAt - 2) : 0;
    var i = 0;
    var phase = 'type';

    function charDelay(ch) {
      return ch === ' ' ? 32 : /[.,!?]/.test(ch) ? 190 : 28 + Math.random() * 42;
    }
    function finish() {
      animTimer = setTimeout(function () { if (caret.parentNode) caret.remove(); }, 1500);
    }
    function tick() {
      if (phase === 'type') {
        if (opts.hesitate && i === hesitateAt) { phase = 'del'; animTimer = setTimeout(tick, 520); return; }
        if (i >= full.length) return finish();
        caret.insertAdjacentText('beforebegin', full.charAt(i++));
        animTimer = setTimeout(tick, charDelay(full.charAt(i - 1)));
      } else if (phase === 'del') {
        if (i <= hesitateAt - rewind) { phase = 'type2'; animTimer = setTimeout(tick, 180); return; }
        var prev = caret.previousSibling;
        if (prev) prev.remove();
        i--;
        animTimer = setTimeout(tick, 55);
      } else {
        if (i >= full.length) return finish();
        caret.insertAdjacentText('beforebegin', full.charAt(i++));
        animTimer = setTimeout(tick, charDelay(full.charAt(i - 1)));
      }
    }
    animTimer = setTimeout(tick, 300);
  }

  function startAnim() {
    if (cfg.anim === 'none') { textEl.textContent = cfg.message; return; }
    typeChars(cfg.message, { hesitate: cfg.anim === 'live' });
  }

  function showBubble() {
    if (dismissed || shown) return;
    shown = true;
    markSeen();

    bubble.classList.remove('gb-hide');
    bubble.offsetHeight;
    bubble.classList.add('gb-show');
    animTimer = setTimeout(startAnim, 400);

    if (cfg.autoHide > 0) {
      hideTimer = setTimeout(hideBubble, cfg.autoHide);
    }
  }

  function hideBubble() {
    clearAnim();
    clearHide();
    removeChatListener();
    if (!bubble) return;
    bubble.classList.add('gb-hide');
    bubble.classList.remove('gb-show');
    if (wrap) {
      setTimeout(function () { if (wrap) wrap.style.display = 'none'; }, 500);
    }
  }

  window.GreetingBubble = {
    show:    showBubble,
    hide:    hideBubble,
    destroy: function () { clearAnim(); clearHide(); removeChatListener(); if (wrap) wrap.remove(); },
  };

  function waitForLauncher(cb) {
    var start = Date.now();
    (function poll() {
      var el = document.getElementById('voiceflow-chat') ||
               document.querySelector('#voiceflow-chat, [id^="voiceflow"], .vfrc-launcher');
      if (el || Date.now() - start >= cfg.launcherTimeout) return cb();
      setTimeout(poll, 150);
    })();
  }

  function init() {
    if (seen()) return;
    injectCSS();
    buildDOM();
    window.addEventListener('message', onChatMessage);
    waitForLauncher(function () {
      setTimeout(showBubble, cfg.delay);
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})(window, document);
