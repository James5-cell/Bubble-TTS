/**
 * Bubble TTS — Background Event Handlers
 * Bubble-based TTS + context-menu + popup stop.
 * No auto-play on icon click (popup handles that).
 */

/* ========== Playback state tracking (for popup status bar) ========== */
var playbackInfo = {
  state: 'idle',       // idle | loading | playing
  engine: null,        // 'local' | 'cloud' | null
  lang: null,          // 'zh' | 'en' | null
  voice: null,         // voice name string or null
  error: null          // short error string or null
};

function updatePlaybackInfo(patch) {
  for (var key in patch) {
    if (patch.hasOwnProperty(key)) playbackInfo[key] = patch[key];
  }
}

function resetPlaybackInfo() {
  playbackInfo.state = 'idle';
  playbackInfo.engine = null;
  playbackInfo.lang = null;
  playbackInfo.voice = null;
  playbackInfo.error = null;
}

/** Strip API key from error messages for safety */
function sanitizeError(msg, apiKey) {
  if (!msg) return msg;
  if (apiKey) {
    msg = msg.split(apiKey).join('[REDACTED]');
  }
  return msg.slice(0, 300);
}


/* ========== Offscreen document management ========== */
var offscreenCreating = null;

async function ensureOffscreen() {
  // Check if already exists
  var existing = await chrome.offscreen.hasDocument();
  if (existing) return;

  // Prevent concurrent creation
  if (offscreenCreating) {
    await offscreenCreating;
    return;
  }

  offscreenCreating = chrome.offscreen.createDocument({
    url: 'offscreen.html',
    reasons: ['AUDIO_PLAYBACK'],
    justification: 'Cloud TTS audio playback (avoids page CSP restrictions)'
  });

  try {
    await offscreenCreating;
  } finally {
    offscreenCreating = null;
  }
}


/* ========== onInstalled ========== */
brapi.runtime.onInstalled.addListener(function () {
  installContextMenus();
});


/* ========== Context menu ========== */
function installContextMenus() {
  if (!brapi.contextMenus) return;
  brapi.contextMenus.create({
    id: 'read-selection',
    title: 'Bubble TTS: Read selected text',
    contexts: ['selection']
  }, function () {
    if (brapi.runtime.lastError) { /* ignore duplicate */ }
  });
}

if (brapi.contextMenus)
  brapi.contextMenus.onClicked.addListener(function (info, tab) {
    if (info.menuItemId === 'read-selection' && info.selectionText && tab) {
      handleBubblePlay(info.selectionText, tab.id)
        .catch(function (err) { console.error('Context menu TTS error:', err.message); });
    }
  });


/* ========== Keyboard shortcut (Alt+O) → stop ========== */
if (brapi.commands)
  brapi.commands.onCommand.addListener(function (command) {
    if (command === 'stop') {
      handleGlobalStop();
    }
  });


/* ========== Message handlers (bubble + popup) ========== */
var bubblePlayingTabId = null;

brapi.runtime.onMessage.addListener(function (request, sender, sendResponse) {

  if (request.type === 'bubblePlay' && sender.tab) {
    handleBubblePlay(request.text, sender.tab.id)
      .then(function (result) { sendResponse(result); })
      .catch(function (err) { sendResponse({ error: err.message }); });
    return true;
  }

  if (request.type === 'bubbleStop') {
    handleGlobalStop();
    if (sender.tab) {
      brapi.tabs.sendMessage(sender.tab.id, { type: 'bubbleState', state: 'stopped' }).catch(function () { });
    }
    sendResponse({ ok: true });
    return false;
  }

  if (request.type === 'bubbleAudioEnded') {
    bubblePlayingTabId = null;
    resetPlaybackInfo();
    return false;
  }

  /* --- Offscreen audio ended --- */
  if (request.type === 'OFFSCREEN_AUDIO_ENDED') {
    if (request.error) {
      updatePlaybackInfo({ state: 'idle', error: request.error });
    } else {
      resetPlaybackInfo();
    }
    if (bubblePlayingTabId) {
      brapi.tabs.sendMessage(bubblePlayingTabId, {
        type: 'bubbleState',
        state: request.error ? 'error' : 'stopped'
      }).catch(function () { });
      bubblePlayingTabId = null;
    }
    return false;
  }

  if (request.type === 'miniStop') {
    handleGlobalStop();
    sendResponse({ ok: true });
    return false;
  }

  /* --- New: popup queries current playback status --- */
  if (request.type === 'getStatus') {
    sendResponse({
      state: playbackInfo.state,
      engine: playbackInfo.engine,
      lang: playbackInfo.lang,
      voice: playbackInfo.voice,
      error: playbackInfo.error
    });
    return false;
  }

  /* --- New: popup triggers play on active tab selection --- */
  if (request.type === 'popupPlaySelection') {
    brapi.tabs.query({ active: true, lastFocusedWindow: true }, function (tabs) {
      if (!tabs || !tabs[0]) return;
      var tabId = tabs[0].id;
      brapi.tabs.sendMessage(tabId, { type: 'getSelection' }, function (response) {
        if (brapi.runtime.lastError || !response || !response.text || response.text.length < 3) {
          sendResponse({ error: 'No selection (min 3 chars)' });
          return;
        }
        handleBubblePlay(response.text, tabId)
          .then(function (result) { sendResponse(result); })
          .catch(function (err) { sendResponse({ error: err.message }); });
      });
    });
    return true;
  }
});


/* ========== Core playback logic ========== */

async function handleBubblePlay(text, tabId) {
  if (bubblePlayingTabId && bubblePlayingTabId !== tabId) {
    brapi.tts.stop();
    brapi.tabs.sendMessage(bubblePlayingTabId, { type: 'bubbleState', state: 'stopped' }).catch(function () { });
  }
  bubblePlayingTabId = tabId;

  var settings = await brapi.storage.local.get([
    'bubbleMode', 'bubbleDefaultLang', 'bubbleSpeed', 'bubblePitch', 'bubbleVolume',
    'cloudEnabled', 'geminiApiKey',
    'geminiVoiceZhPrimary', 'geminiVoiceZhSecondary',
    'geminiVoiceEnPrimary', 'geminiVoiceEnSecondary'
  ]);

  var mode = settings.bubbleMode || 'auto';
  var defaultLang = settings.bubbleDefaultLang || 'zh';
  var speed = parseFloat(settings.bubbleSpeed) || 1.0;
  var pitch = parseFloat(settings.bubblePitch) || 1.0;
  var volume = parseFloat(settings.bubbleVolume) || 1.0;
  var detectedLang = detectZhEn(text);
  var lang = (detectedLang === 'unknown') ? defaultLang : detectedLang;

  // Reset error, set loading state
  updatePlaybackInfo({ state: 'loading', lang: lang, error: null });

  var useCloud = false;
  if (mode === 'cloud') {
    useCloud = true;
  } else if (mode === 'auto') {
    var voices = await new Promise(function (resolve) { brapi.tts.getVoices(resolve); }) || [];
    var prefix = (lang === 'zh') ? 'zh' : 'en';
    var hasLocalVoice = voices.some(function (v) {
      return v.lang && v.lang.toLowerCase().startsWith(prefix);
    });
    if (!hasLocalVoice && settings.cloudEnabled && settings.geminiApiKey) {
      useCloud = true;
    }
  }

  // Determine engine label for status
  var engineLabel;
  if (mode === 'auto') {
    engineLabel = useCloud ? 'Auto→Cloud' : 'Auto→Local';
  } else {
    engineLabel = useCloud ? 'Cloud' : 'Local';
  }
  updatePlaybackInfo({ engine: engineLabel });

  if (useCloud && settings.cloudEnabled && settings.geminiApiKey) {
    return await bubbleCloudPlay(text, lang, speed, volume, tabId, settings);
  } else if (useCloud) {
    // User explicitly chose Cloud (or Auto→Cloud) but it's not configured
    var reason = !settings.cloudEnabled ? 'Cloud TTS is disabled' : 'No Gemini API key';
    updatePlaybackInfo({ state: 'idle', error: reason });
    brapi.tabs.sendMessage(tabId, { type: 'bubbleState', state: 'error' }).catch(function () { });
    throw new Error(reason + ' — configure in options');
  } else {
    return await bubbleLocalPlay(text, lang, speed, pitch, volume, tabId);
  }
}


async function bubbleLocalPlay(text, lang, speed, pitch, volume, tabId) {
  var langCode = (lang === 'zh') ? 'zh-CN' : 'en-US';
  brapi.tts.stop();

  updatePlaybackInfo({ voice: langCode + ' (system)' });

  return new Promise(function (resolve) {
    brapi.tts.speak(text, {
      lang: langCode,
      rate: speed,
      pitch: pitch,
      volume: volume,
      onEvent: function (event) {
        if (event.type === 'start') {
          updatePlaybackInfo({ state: 'playing' });
          brapi.tabs.sendMessage(tabId, { type: 'bubbleState', state: 'playing' }).catch(function () { });
        } else if (event.type === 'end') {
          bubblePlayingTabId = null;
          resetPlaybackInfo();
          brapi.tabs.sendMessage(tabId, { type: 'bubbleState', state: 'stopped' }).catch(function () { });
        } else if (event.type === 'error') {
          bubblePlayingTabId = null;
          updatePlaybackInfo({ state: 'idle', error: 'Local TTS error' });
          brapi.tabs.sendMessage(tabId, { type: 'bubbleState', state: 'error' }).catch(function () { });
        } else if (event.type === 'interrupted' || event.type === 'cancelled') {
          bubblePlayingTabId = null;
          resetPlaybackInfo();
          brapi.tabs.sendMessage(tabId, { type: 'bubbleState', state: 'stopped' }).catch(function () { });
        }
      }
    });
    resolve({ mode: 'local', lang: lang });
  });
}


async function bubbleCloudPlay(text, lang, speed, volume, tabId, settings) {
  var primaryVoice = (lang === 'zh')
    ? (settings.geminiVoiceZhPrimary || 'Kore')
    : (settings.geminiVoiceEnPrimary || 'Puck');
  var secondaryVoice = (lang === 'zh')
    ? (settings.geminiVoiceZhSecondary || 'Aoede')
    : (settings.geminiVoiceEnSecondary || 'Charon');

  var apiKey = settings.geminiApiKey;
  var result = null;
  var usedVoice = primaryVoice;

  brapi.tabs.sendMessage(tabId, { type: 'bubbleState', state: 'loading' }).catch(function () { });
  updatePlaybackInfo({ voice: (lang === 'zh' ? 'ZH' : 'EN') + ' ' + primaryVoice });

  try {
    result = await geminiSpeechGenerate(text, primaryVoice, apiKey);
  } catch (primaryErr) {
    usedVoice = secondaryVoice;
    updatePlaybackInfo({ voice: (lang === 'zh' ? 'ZH' : 'EN') + ' ' + secondaryVoice });
    try {
      result = await geminiSpeechGenerate(text, secondaryVoice, apiKey);
    } catch (secondaryErr) {
      bubblePlayingTabId = null;
      var errMsg = secondaryErr.message || String(secondaryErr);
      var shortErr = extractShortError(errMsg);
      updatePlaybackInfo({ state: 'idle', error: shortErr, voice: null });
      brapi.tabs.sendMessage(tabId, { type: 'bubbleState', state: 'error' }).catch(function () { });
      throw new Error('Gemini TTS failed: ' + sanitizeError(errMsg, apiKey));
    }
  }

  updatePlaybackInfo({ state: 'playing' });

  // Route audio through offscreen document (avoids page CSP blob: restrictions)
  try {
    await ensureOffscreen();
  } catch (offErr) {
    bubblePlayingTabId = null;
    updatePlaybackInfo({ state: 'idle', error: 'Offscreen failed' });
    brapi.tabs.sendMessage(tabId, { type: 'bubbleState', state: 'error' }).catch(function () { });
    throw new Error('Failed to create offscreen document: ' + (offErr.message || offErr));
  }

  brapi.tabs.sendMessage(tabId, { type: 'bubbleState', state: 'playing' }).catch(function () { });

  chrome.runtime.sendMessage({
    type: 'OFFSCREEN_PLAY_AUDIO',
    audioBase64: result.audioData,
    mime: result.mimeType,
    speed: speed,
    volume: volume
  }).catch(function (err) {
    updatePlaybackInfo({ state: 'idle', error: 'Play failed' });
    brapi.tabs.sendMessage(tabId, { type: 'bubbleState', state: 'error' }).catch(function () { });
  });

  return { mode: 'cloud', lang: lang };
}


/** Extract short error code from Gemini error message (e.g. "401", "429", "timeout") */
function extractShortError(msg) {
  if (!msg) return 'Unknown error';
  if (/timed?\s*out/i.test(msg)) return 'Timeout';
  var statusMatch = msg.match(/\b(40[0-9]|429|5\d{2})\b/);
  if (statusMatch) return statusMatch[1];
  if (/network/i.test(msg)) return 'Network error';
  return msg.slice(0, 60);
}


/* ========== Global stop ========== */
function handleGlobalStop() {
  brapi.tts.stop();
  resetPlaybackInfo();

  // Stop offscreen audio
  chrome.runtime.sendMessage({ type: 'OFFSCREEN_STOP_AUDIO' }).catch(function () { });

  if (bubblePlayingTabId) {
    brapi.tabs.sendMessage(bubblePlayingTabId, { type: 'bubbleState', state: 'stopped' }).catch(function () { });
    bubblePlayingTabId = null;
  }
}
