(function () {
  'use strict';

  var KEYS = ['bubbleMode', 'bubbleSpeed', 'bubblePitch', 'bubbleVolume', 'cloudEnabled', 'geminiApiKey'];
  var DEFAULTS = { bubbleMode: 'auto', bubbleSpeed: 1.0, bubblePitch: 1.0, bubbleVolume: 1.0 };
  var DEBOUNCE_MS = 150;
  var saveTimer = null;

  function $(id) { return document.getElementById(id); }

  /* ========== Format helpers ========== */
  function fmtSpeed(v) { return parseFloat(v).toFixed(1) + 'x'; }
  function fmtPercent(v) { return Math.round(parseFloat(v) * 100) + '%'; }

  /* ========== Load settings ========== */
  function load() {
    chrome.storage.local.get(KEYS, function (items) {
      var mode = items.bubbleMode || DEFAULTS.bubbleMode;
      var speed = items.bubbleSpeed != null ? items.bubbleSpeed : DEFAULTS.bubbleSpeed;
      var pitch = items.bubblePitch != null ? items.bubblePitch : DEFAULTS.bubblePitch;
      var vol = items.bubbleVolume != null ? items.bubbleVolume : DEFAULTS.bubbleVolume;

      setActiveMode(mode);
      setSlider('sl-speed', 'val-speed', speed, fmtSpeed);
      setSlider('sl-pitch', 'val-pitch', pitch, fmtPercent);
      setSlider('sl-volume', 'val-volume', vol, fmtPercent);

      // Show cloud warning if needed
      checkCloudConfig(mode, items.cloudEnabled, items.geminiApiKey);
    });
  }

  function setActiveMode(mode) {
    document.querySelectorAll('#mode-group button').forEach(function (btn) {
      btn.classList.toggle('active', btn.dataset.mode === mode);
    });
  }

  function setSlider(inputId, valId, value, formatter) {
    $(inputId).value = value;
    $(valId).textContent = formatter(value);
  }

  /* ========== Save with debounce ========== */
  function debounceSave(key, value) {
    if (saveTimer) clearTimeout(saveTimer);
    saveTimer = setTimeout(function () {
      var obj = {};
      obj[key] = value;
      chrome.storage.local.set(obj);
    }, DEBOUNCE_MS);
  }

  function saveImmediate(key, value) {
    var obj = {};
    obj[key] = value;
    chrome.storage.local.set(obj);
  }

  /* ========== Cloud config check ========== */
  function checkCloudConfig(mode, cloudEnabled, apiKey) {
    var warn = $('cloud-warn');
    if (!warn) return;
    if ((mode === 'cloud' || mode === 'auto') && (!cloudEnabled || !apiKey)) {
      warn.classList.remove('hidden');
    } else {
      warn.classList.add('hidden');
    }
  }

  /* ========== Status bar ========== */
  function refreshStatus() {
    chrome.runtime.sendMessage({ type: 'getStatus' }, function (info) {
      if (chrome.runtime.lastError || !info) return;
      $('pill-engine').textContent = 'Engine: ' + (info.engine || '—');
      $('pill-lang').textContent = 'Lang: ' + (info.lang ? info.lang.toUpperCase() : '—');
      $('pill-voice').textContent = 'Voice: ' + (info.voice || '—');

      var errPill = $('pill-error');
      if (info.error) {
        errPill.textContent = 'Error: ' + info.error;
        errPill.title = 'Click to copy: ' + info.error;
        errPill.classList.remove('hidden');
      } else {
        errPill.classList.add('hidden');
      }

      // Highlight engine pill when playing
      $('pill-engine').classList.toggle('pm-pill-active', info.state === 'playing');
    });
  }

  /* ========== Init ========== */
  document.addEventListener('DOMContentLoaded', function () {
    load();
    refreshStatus();

    // Mode buttons
    document.querySelectorAll('#mode-group button').forEach(function (btn) {
      btn.addEventListener('click', function () {
        document.querySelectorAll('#mode-group button').forEach(function (b) { b.classList.remove('active'); });
        btn.classList.add('active');
        saveImmediate('bubbleMode', btn.dataset.mode);
        // Re-check cloud config when mode changes
        chrome.storage.local.get(['cloudEnabled', 'geminiApiKey'], function (items) {
          checkCloudConfig(btn.dataset.mode, items.cloudEnabled, items.geminiApiKey);
        });
      });
    });

    // Speed slider
    $('sl-speed').addEventListener('input', function () {
      $('val-speed').textContent = fmtSpeed(this.value);
    });
    $('sl-speed').addEventListener('change', function () {
      debounceSave('bubbleSpeed', parseFloat(this.value));
    });

    // Pitch slider
    $('sl-pitch').addEventListener('input', function () {
      $('val-pitch').textContent = fmtPercent(this.value);
    });
    $('sl-pitch').addEventListener('change', function () {
      debounceSave('bubblePitch', parseFloat(this.value));
    });

    // Volume slider
    $('sl-volume').addEventListener('input', function () {
      $('val-volume').textContent = fmtPercent(this.value);
    });
    $('sl-volume').addEventListener('change', function () {
      debounceSave('bubbleVolume', parseFloat(this.value));
    });

    // Reset button
    $('btn-reset').addEventListener('click', function () {
      setSlider('sl-speed', 'val-speed', DEFAULTS.bubbleSpeed, fmtSpeed);
      setSlider('sl-pitch', 'val-pitch', DEFAULTS.bubblePitch, fmtPercent);
      setSlider('sl-volume', 'val-volume', DEFAULTS.bubbleVolume, fmtPercent);
      chrome.storage.local.set({
        bubbleSpeed: DEFAULTS.bubbleSpeed,
        bubblePitch: DEFAULTS.bubblePitch,
        bubbleVolume: DEFAULTS.bubbleVolume
      });
    });

    // Stop button
    $('btn-stop').addEventListener('click', function () {
      chrome.runtime.sendMessage({ type: 'miniStop' }, function () {
        refreshStatus();
      });
    });

    // Play Selection button
    $('btn-play').addEventListener('click', function () {
      chrome.runtime.sendMessage({ type: 'popupPlaySelection' }, function (response) {
        if (chrome.runtime.lastError) return;
        // Refresh status after a brief delay to allow playback to start
        setTimeout(refreshStatus, 500);
      });
    });

    // Settings link
    $('link-options').addEventListener('click', function (e) {
      e.preventDefault();
      chrome.runtime.openOptionsPage();
      window.close();
    });

    // Cloud setup link in warning banner
    var cloudSetupLink = $('link-cloud-setup');
    if (cloudSetupLink) {
      cloudSetupLink.addEventListener('click', function (e) {
        e.preventDefault();
        chrome.runtime.openOptionsPage();
        window.close();
      });
    }

    // Error pill — click to copy
    $('pill-error').addEventListener('click', function () {
      var errText = this.textContent.replace(/^Error:\s*/, '');
      navigator.clipboard.writeText(errText).catch(function () { });
    });

    // Poll status while popup is open
    setInterval(refreshStatus, 2000);
  });
})();
