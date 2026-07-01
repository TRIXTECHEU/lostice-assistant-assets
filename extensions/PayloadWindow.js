/* TrixTech s.r.o. @2025 */

(function (window, document) {
  if (window.__VFBubbleLoaded) return;
  window.__VFBubbleLoaded = true;

  var DEFAULTS = {
    name:        'Pan Tvarůžek',
    message:     'Dobrý den, jak vám můžeme pomoci?',
    showTitle:   true,
    anim:        'typewriter',
    delay:       2000,      // pauza po objevení launcheru, než se bublina ukáže
    color:       '#D9A426',
    openOnHover: false,     // true = najetí myší otevře chat (agresivní, viz pozn.)
    once:        true,      // true = ukáže se jen jednou za relaci (sessionStorage)
    launcherTimeout: 6000,  // max čekání na Voiceflow launcher, pak fallback
  };

  var cfg = Object.assign({}, DEFAULTS, window.VFBubbleConfig || {});

  var SESSION_KEY = 'vfb_shown';

  function seen() {
    if (!cfg.once) return false;
    try { return sessionStorage.getItem(SESSION_KEY) === '1'; } catch (e) { return false; }
  }
  function markSeen() {
    if (!cfg.once) return;
    try { sessionStorage.setItem(SESSION_KEY, '1'); } catch (e) {}
  }

  // Už se v této relaci ukázala → vůbec nic nestavíme.
  if (seen()) return;

  var CSS = `
    .vfb-wrap {
      position: fixed;
      bottom: 118px;
      right: 20px;
      z-index: 101;
      display: flex;
      flex-direction: column;
      align-items: flex-end;
      pointer-events: none;
    }

    .vfb-bubble {
      pointer-events: auto;
      position: relative;
      width: 230px;
      background: #fff;
      color: #374151;
      border-radius: 15px;
      border: none;
      padding: 12px 30px 12px 14px;
      box-shadow: 0 10px 30px rgba(0,0,0,0.12), 0 2px 6px rgba(0,0,0,0.06);
      opacity: 0;
      transform: translateY(6px) scale(0.97);
      transition: opacity 0.25s ease, transform 0.25s ease;
      box-sizing: border-box;
      font-family: system-ui, -apple-system, sans-serif;
      font-size: 13px;
      line-height: 1.4;
      cursor: pointer;
    }

    .vfb-bubble.vfb-show {
      opacity: 1;
      transform: translateY(0) scale(1);
    }

    .vfb-bubble.vfb-hide {
      opacity: 0;
      transform: scale(0.92);
      transition: opacity 0.25s ease, transform 0.25s ease;
    }

    .vfb-bubble::after {
      content: "";
      display: block;
      position: absolute;
      right: 18px;
      bottom: -6px;
      width: 12px;
      height: 12px;
      background: #fff;
      transform: rotate(45deg);
      box-shadow: 2px 2px 4px rgba(0, 0, 0, 0.04);
      border-radius: 0 0 3px 0;
    }

    .vfb-label {
      font-size: 10px;
      font-weight: 700;
      letter-spacing: 0.08em;
      text-transform: uppercase;
      color: var(--vfb-color, #3e68a7);
      margin-bottom: 4px;
      font-family: system-ui, -apple-system, sans-serif;
    }

    .vfb-text {
      font-size: 13px;
      line-height: 1.4;
      color: #374151;
      min-height: 1.4em;
    }

    .vfb-close {
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

    .vfb-close:hover {
      background: #f3f4f6;
      color: #374151;
    }

    .vfb-caret {
      display: inline-block;
      width: 1px;
      height: 1em;
      background: currentColor;
      margin-left: 1px;
      vertical-align: -2px;
      animation: vfb-blink 0.9s steps(1, end) infinite;
    }

    @keyframes vfb-blink {
      0%, 50%   { opacity: 1; }
      51%, 100% { opacity: 0; }
    }

    @media (max-width: 480px) {
      .vfb-bubble {
        max-width: calc(100vw - 100px);
        width: auto;
      }
    }

    @media (prefers-reduced-motion: reduce) {
      .vfb-bubble { transition: none !important; }
      .vfb-caret  { animation: none !important; }
    }
  `;

  function injectCSS() {
    if (document.getElementById('vfb-styles')) return;
    var s = document.createElement('style');
    s.id = 'vfb-styles';
    s.textContent = CSS;
    document.head.appendChild(s);
  }

  var wrap, bubble, labelEl, textEl, closeBtn;
  var dismissed = false;
  var animTimer = null;
  var shown = false;

  function openChat() {
    try {
      if (window.voiceflow && window.voiceflow.chat && window.voiceflow.chat.open) {
        window.voiceflow.chat.open();
      }
    } catch (e) { console.error('[vfb] openChat', e); }
  }

  function buildDOM() {
    wrap = document.createElement('div');
    wrap.className = 'vfb-wrap';
    wrap.style.setProperty('--vfb-color', cfg.color);

    bubble = document.createElement('div');
    bubble.className = 'vfb-bubble';
    bubble.setAttribute('role', 'button');
    bubble.setAttribute('tabindex', '0');
    bubble.setAttribute('aria-label', (cfg.name ? cfg.name + ': ' : '') + cfg.message);

    // Klik na bublinu → otevře chat + bublina zmizí
    bubble.addEventListener('click', function () {
      markSeen();
      openChat();
      hideBubble();
    });
    bubble.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); bubble.click(); }
    });

    // Volitelně: najetí myší → otevře chat + zmizí
    if (cfg.openOnHover) {
      bubble.addEventListener('mouseenter', function () {
        markSeen();
        openChat();
        hideBubble();
      });
    }

    closeBtn = document.createElement('button');
    closeBtn.className = 'vfb-close';
    closeBtn.setAttribute('aria-label', 'Zavřít');
    closeBtn.textContent = '✕';
    closeBtn.addEventListener('click', function (e) {
      e.stopPropagation();
      dismissed = true;
      markSeen();
      hideBubble();
    });

    if (cfg.showTitle && cfg.name) {
      labelEl = document.createElement('div');
      labelEl.className = 'vfb-label';
      labelEl.textContent = cfg.name.toUpperCase();
      bubble.appendChild(labelEl);
    }

    textEl = document.createElement('div');
    textEl.className = 'vfb-text';
    bubble.appendChild(closeBtn);
    bubble.appendChild(textEl);
    wrap.appendChild(bubble);
    document.body.appendChild(wrap);
  }

  function clearAnim() {
    if (animTimer) { clearTimeout(animTimer); animTimer = null; }
  }

  function runTypewriter() {
    clearAnim();
    textEl.textContent = '';
    var caret = document.createElement('span');
    caret.className = 'vfb-caret';
    textEl.appendChild(caret);
    var i = 0;
    var msg = cfg.message;
    var tick = function () {
      if (i >= msg.length) {
        animTimer = setTimeout(function () { if (caret.parentNode) caret.remove(); }, 1500);
        return;
      }
      caret.insertAdjacentText('beforebegin', msg.charAt(i));
      i++;
      var ch = msg.charAt(i - 1);
      var delay = ch === ' ' ? 30 : /[.,!?]/.test(ch) ? 180 : 28 + Math.random() * 40;
      animTimer = setTimeout(tick, delay);
    };
    animTimer = setTimeout(tick, 300);
  }

  function runLive() {
    clearAnim();
    textEl.textContent = '';
    var caret = document.createElement('span');
    caret.className = 'vfb-caret';
    textEl.appendChild(caret);
    var full = cfg.message;
    var hesitateAt = Math.max(6, Math.floor(full.length * 0.45));
    var rewind = Math.min(3, hesitateAt - 2);
    var i = 0;
    var phase = 'type1';
    var tick = function () {
      if (phase === 'type1') {
        if (i >= hesitateAt) { phase = 'pause'; animTimer = setTimeout(tick, 520); return; }
        caret.insertAdjacentText('beforebegin', full.charAt(i++));
        var ch = full.charAt(i - 1);
        animTimer = setTimeout(tick, ch === ' ' ? 38 : /[.,!?]/.test(ch) ? 200 : 30 + Math.random() * 45);
      } else if (phase === 'pause') {
        phase = 'delete';
        animTimer = setTimeout(tick, 60);
      } else if (phase === 'delete') {
        if (i <= hesitateAt - rewind) { phase = 'type2'; animTimer = setTimeout(tick, 180); return; }
        var prev = caret.previousSibling;
        if (prev) prev.remove();
        i--;
        animTimer = setTimeout(tick, 55);
      } else {
        if (i >= full.length) {
          animTimer = setTimeout(function () { if (caret.parentNode) caret.remove(); }, 1500);
          return;
        }
        caret.insertAdjacentText('beforebegin', full.charAt(i++));
        var ch2 = full.charAt(i - 1);
        animTimer = setTimeout(tick, ch2 === ' ' ? 38 : /[.,!?]/.test(ch2) ? 200 : 30 + Math.random() * 45);
      }
    };
    animTimer = setTimeout(tick, 300);
  }

  function startAnim() {
    if (cfg.anim === 'live') runLive();
    else runTypewriter();
  }

  function showBubble() {
    if (dismissed || shown) return;
    shown = true;
    markSeen();                       // od teď se v této relaci už znovu neukáže
    bubble.classList.remove('vfb-hide');
    bubble.offsetHeight;              // reflow
    bubble.classList.add('vfb-show');
    animTimer = setTimeout(startAnim, 400);
  }

  function hideBubble() {
    clearAnim();
    bubble.classList.add('vfb-hide');
    bubble.classList.remove('vfb-show');
  }

  window.VFBubble = {
    show:    showBubble,
    hide:    hideBubble,
    destroy: function () { wrap && wrap.remove(); },
  };

  // Detekce otevření chatu (přes launcher i odjinud) → bublina zmizí.
  function onVFMessage(e) {
    if (typeof e.data !== 'string' || e.data.indexOf('voiceflow:') === -1) return;
    try {
      var d = JSON.parse(e.data);
      if (d && typeof d.type === 'string' && d.type.indexOf('open') !== -1) {
        markSeen();
        hideBubble();
      }
    } catch (_) {}
  }
  window.addEventListener('message', onVFMessage);

  // Počká, dokud se v DOM neobjeví Voiceflow launcher, pak (po delay) ukáže bublinu.
  // Fallback: pokud se launcher do launcherTimeout nenajde, ukáže se stejně.
  function waitForLauncher(cb) {
    var start = Date.now();
    var step = 150;
    (function poll() {
      var el =
        document.getElementById('voiceflow-chat') ||
        document.querySelector('#voiceflow-chat, [id^="voiceflow"], .vfrc-launcher');
      if (el || Date.now() - start >= cfg.launcherTimeout) return cb();
      setTimeout(poll, step);
    })();
  }

  function init() {
    if (seen()) return;
    injectCSS();
    buildDOM();
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
