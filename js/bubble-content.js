(function () {
  'use strict';

  var MIN_CHARS = 3;
  var BUBBLE_SIZE = 30;
  var BUBBLE_GAP = 8;

  var state = 'idle';
  var playMode = null;
  var bubbleHost = null;
  var shadow = null;
  var bubbleBtn = null;
  var selectionText = '';
  var destroyed = false;  // set true when context is invalid


  /* ========== Extension context guard ========== */

  function isExtensionValid() {
    try {
      // This throws if context is invalidated
      return !!chrome.runtime && !!chrome.runtime.id;
    } catch (e) {
      return false;
    }
  }

  /** Call when context is invalidated: tear down everything */
  function handleContextInvalidated() {
    if (destroyed) return;
    destroyed = true;
    stopCloudAudioElement();
    destroyBubble();
    removeAllListeners();
  }

  /** Safe wrapper for chrome.runtime.sendMessage */
  function safeSendMessage(msg, callback) {
    if (!isExtensionValid()) { handleContextInvalidated(); return; }
    try {
      chrome.runtime.sendMessage(msg, function (response) {
        if (chrome.runtime.lastError) { /* ignore */ }
        if (callback) callback(response);
      });
    } catch (e) {
      handleContextInvalidated();
    }
  }


  /* ========== Bubble DOM (Shadow DOM for isolation) ========== */

  var BUBBLE_STYLES = [
    ':host { all: initial; }',
    '.ra-btn {',
    '  all: initial;',
    '  box-sizing: border-box;',
    '  width: ' + BUBBLE_SIZE + 'px;',
    '  height: ' + BUBBLE_SIZE + 'px;',
    '  border-radius: 50%;',
    '  border: none;',
    '  cursor: pointer;',
    '  display: flex;',
    '  align-items: center;',
    '  justify-content: center;',
    '  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);',
    '  box-shadow: 0 2px 10px rgba(0,0,0,0.3);',
    '  transition: background 0.2s ease, transform 0.15s ease, box-shadow 0.2s ease;',
    '  padding: 0;',
    '  margin: 0;',
    '  outline: none;',
    '}',
    '.ra-btn:hover {',
    '  transform: scale(1.12);',
    '  box-shadow: 0 4px 16px rgba(0,0,0,0.4);',
    '}',
    '.ra-btn:active { transform: scale(0.95); }',
    '.ra-btn.loading {',
    '  background: linear-gradient(135deg, #f6d365 0%, #fda085 100%);',
    '  animation: ra-pulse 1s infinite ease-in-out;',
    '}',
    '.ra-btn.playing {',
    '  background: linear-gradient(135deg, #f5576c 0%, #ff6a88 100%);',
    '}',
    '.ra-btn.error {',
    '  background: linear-gradient(135deg, #e74c3c 0%, #c0392b 100%);',
    '  animation: ra-shake 0.4s ease;',
    '}',
    '@keyframes ra-pulse {',
    '  0%, 100% { opacity: 1; transform: scale(1); }',
    '  50% { opacity: 0.7; transform: scale(0.95); }',
    '}',
    '@keyframes ra-shake {',
    '  0%, 100% { transform: translateX(0); }',
    '  20% { transform: translateX(-3px); }',
    '  40% { transform: translateX(3px); }',
    '  60% { transform: translateX(-2px); }',
    '  80% { transform: translateX(2px); }',
    '}',
    '.ra-btn svg {',
    '  width: 16px;',
    '  height: 16px;',
    '  fill: #fff;',
    '  pointer-events: none;',
    '}'
  ].join('\n');

  var SVG_PLAY = '<svg viewBox="0 0 24 24"><path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3A4.5 4.5 0 0014 7.97v8.05A4.49 4.49 0 0016.5 12z"/></svg>';
  var SVG_STOP = '<svg viewBox="0 0 24 24"><rect x="6" y="6" width="12" height="12" rx="1"/></svg>';
  var SVG_LOADING = '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="8" fill="none" stroke="#fff" stroke-width="2" stroke-dasharray="25 25" opacity="0.8"><animateTransform attributeName="transform" type="rotate" dur="0.8s" from="0 12 12" to="360 12 12" repeatCount="indefinite"/></circle></svg>';
  var SVG_ERROR = '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" fill="none" stroke="#fff" stroke-width="2"/><line x1="12" y1="7" x2="12" y2="13" stroke="#fff" stroke-width="2" stroke-linecap="round"/><circle cx="12" cy="16.5" r="1.2" fill="#fff"/></svg>';

  function createBubble() {
    if (destroyed || bubbleHost) return;

    bubbleHost = document.createElement('div');
    bubbleHost.id = 'ra-mini-bubble-host';
    bubbleHost.style.cssText = 'all:initial; position:fixed; z-index:2147483647; pointer-events:auto; display:block;';

    shadow = bubbleHost.attachShadow({ mode: 'closed' });

    var style = document.createElement('style');
    style.textContent = BUBBLE_STYLES;
    shadow.appendChild(style);

    bubbleBtn = document.createElement('button');
    bubbleBtn.className = 'ra-btn';
    bubbleBtn.innerHTML = SVG_PLAY;
    bubbleBtn.setAttribute('aria-label', 'Bubble TTS');
    bubbleBtn.addEventListener('click', onBubbleClick, true);
    bubbleBtn.addEventListener('mousedown', function (e) {
      e.preventDefault();
      e.stopPropagation();
    }, true);
    shadow.appendChild(bubbleBtn);

    document.documentElement.appendChild(bubbleHost);
  }

  function destroyBubble() {
    if (bubbleHost) {
      bubbleHost.remove();
      bubbleHost = null;
      shadow = null;
      bubbleBtn = null;
    }
  }

  var errorRevertTimer = null;

  function setBubbleState(newState) {
    state = newState;
    if (!bubbleBtn) return;

    if (errorRevertTimer) { clearTimeout(errorRevertTimer); errorRevertTimer = null; }

    bubbleBtn.classList.remove('loading', 'playing', 'error');
    if (state === 'loading') {
      bubbleBtn.classList.add('loading');
      bubbleBtn.innerHTML = SVG_LOADING;
    } else if (state === 'playing') {
      bubbleBtn.classList.add('playing');
      bubbleBtn.innerHTML = SVG_STOP;
    } else if (state === 'error') {
      bubbleBtn.classList.add('error');
      bubbleBtn.innerHTML = SVG_ERROR;
      errorRevertTimer = setTimeout(function () {
        setBubbleState('idle');
      }, 2000);
    } else {
      bubbleBtn.innerHTML = SVG_PLAY;
    }
  }

  function positionBubble() {
    var sel = window.getSelection();
    if (!sel || sel.rangeCount === 0 || sel.isCollapsed || !bubbleHost) return;

    var range = sel.getRangeAt(0);
    var rects = range.getClientRects();
    if (rects.length === 0) return;

    var last = rects[rects.length - 1];
    var vw = window.innerWidth;
    var vh = window.innerHeight;

    var left = last.right + BUBBLE_GAP;
    var top = last.top + (last.height - BUBBLE_SIZE) / 2;

    if (left + BUBBLE_SIZE + 4 > vw) {
      left = last.left - BUBBLE_SIZE - BUBBLE_GAP;
    }
    if (left < 4) left = 4;
    if (top < 4) top = 4;
    if (top + BUBBLE_SIZE + 4 > vh) {
      top = vh - BUBBLE_SIZE - 4;
    }

    bubbleHost.style.left = left + 'px';
    bubbleHost.style.top = top + 'px';
  }


  /* ========== Selection Monitoring ========== */

  function getSelectedText() {
    var sel = window.getSelection();
    return sel ? sel.toString().trim() : '';
  }

  function checkSelection() {
    if (destroyed) return;
    var text = getSelectedText();
    if (text.length >= MIN_CHARS) {
      selectionText = text;
      createBubble();
      positionBubble();
    } else {
      selectionText = '';
      if (state === 'idle') {
        destroyBubble();
      }
    }
  }

  /* Named handlers for clean up */
  function onMouseUp() {
    if (destroyed) return;
    setTimeout(checkSelection, 20);
  }

  function onSelectionChange() {
    if (destroyed) return;
    var text = getSelectedText();
    if (text.length < MIN_CHARS && state === 'idle') {
      selectionText = '';
      destroyBubble();
    }
  }

  var repositionTimer = null;
  function scheduleReposition() {
    if (destroyed) return;
    if (repositionTimer) clearTimeout(repositionTimer);
    repositionTimer = setTimeout(function () {
      if (destroyed || !bubbleHost) return;
      var text = getSelectedText();
      if (text.length >= MIN_CHARS) {
        positionBubble();
      } else if (state === 'idle') {
        destroyBubble();
      }
    }, 80);
  }

  /* Register listeners */
  document.addEventListener('mouseup', onMouseUp);
  document.addEventListener('selectionchange', onSelectionChange);
  window.addEventListener('scroll', scheduleReposition, true);
  window.addEventListener('resize', scheduleReposition);

  /** Remove all listeners — called on context invalidation */
  function removeAllListeners() {
    document.removeEventListener('mouseup', onMouseUp);
    document.removeEventListener('selectionchange', onSelectionChange);
    window.removeEventListener('scroll', scheduleReposition, true);
    window.removeEventListener('resize', scheduleReposition);
    if (repositionTimer) { clearTimeout(repositionTimer); repositionTimer = null; }
    if (errorRevertTimer) { clearTimeout(errorRevertTimer); errorRevertTimer = null; }
  }


  /* ========== Playback Control ========== */

  function onBubbleClick(e) {
    e.preventDefault();
    e.stopPropagation();

    if (state === 'playing' || state === 'loading') {
      stopPlayback();
    } else {
      startPlayback();
    }
  }

  function startPlayback() {
    if (destroyed) return;
    var text = selectionText;
    if (!text || text.length < MIN_CHARS) return;

    setBubbleState('loading');

    safeSendMessage(
      { type: 'bubblePlay', text: text },
      function (response) {
        if (!response) {
          setBubbleState('idle');
          return;
        }
        if (response.error) {
          setBubbleState('error');
          return;
        }
        if (response.mode) {
          playMode = response.mode;
        }
      }
    );
  }

  function stopPlayback() {
    safeSendMessage({ type: 'bubbleStop' });
    playMode = null;
    setBubbleState('idle');
  }


  /* ========== Messages from Background ========== */

  function onMessage(msg, sender, sendResponse) {
    if (destroyed) return;

    try {
      if (msg.type === 'bubbleState') {
        if (msg.state === 'playing') {
          setBubbleState('playing');
        } else if (msg.state === 'loading') {
          setBubbleState('loading');
        } else if (msg.state === 'error') {
          playMode = null;
          setBubbleState('error');
        } else if (msg.state === 'stopped') {
          playMode = null;
          setBubbleState('idle');
        }
      } else if (msg.type === 'getSelection') {
        var text = getSelectedText();
        sendResponse({ text: text });
      }
    } catch (e) {
      if (e.message && e.message.indexOf('Extension context invalidated') !== -1) {
        handleContextInvalidated();
      }
    }
  }

  // Guard the listener registration itself
  try {
    chrome.runtime.onMessage.addListener(onMessage);
  } catch (e) {
    handleContextInvalidated();
  }

})();
