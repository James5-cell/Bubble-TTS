(function () {
  'use strict';

  var GEMINI_VOICES = [
    'Zephyr', 'Puck', 'Charon', 'Kore', 'Fenrir', 'Leda', 'Orus', 'Aoede',
    'Callirrhoe', 'Autonoe', 'Enceladus', 'Iapetus', 'Umbriel', 'Algieba',
    'Despina', 'Erinome', 'Algenib', 'Rasalgethi', 'Laomedeia', 'Achernar',
    'Alnilam', 'Schedar', 'Gacrux', 'Pulcherrima', 'Achird', 'Zubenelgenubi',
    'Vindemiatrix', 'Sadachbia', 'Sadaltager', 'Sulafat'
  ];

  var DEFAULTS = {
    cloudEnabled: false,
    geminiApiKey: '',
    geminiVoiceZhPrimary: 'Kore',
    geminiVoiceZhSecondary: 'Aoede',
    geminiVoiceEnPrimary: 'Puck',
    geminiVoiceEnSecondary: 'Charon'
  };

  var SETTING_KEYS = Object.keys(DEFAULTS);

  function $(id) { return document.getElementById(id); }


  /* ========== Populate Voice Selects ========== */

  function populateVoiceSelect(selectEl, selectedValue) {
    selectEl.innerHTML = '';
    GEMINI_VOICES.forEach(function (name) {
      var opt = document.createElement('option');
      opt.value = name;
      opt.textContent = name;
      if (name === selectedValue) opt.selected = true;
      selectEl.appendChild(opt);
    });
  }


  /* ========== Load Settings ========== */

  function loadSettings() {
    chrome.storage.local.get(SETTING_KEYS, function (items) {
      var s = {};
      SETTING_KEYS.forEach(function (key) {
        s[key] = (items[key] !== undefined) ? items[key] : DEFAULTS[key];
      });

      $('cloud-enabled').checked = s.cloudEnabled;
      updateCloudUI(s.cloudEnabled);

      if (s.geminiApiKey) {
        $('api-key').value = s.geminiApiKey;
      }

      populateVoiceSelect($('zh-primary'), s.geminiVoiceZhPrimary);
      populateVoiceSelect($('zh-secondary'), s.geminiVoiceZhSecondary);
      populateVoiceSelect($('en-primary'), s.geminiVoiceEnPrimary);
      populateVoiceSelect($('en-secondary'), s.geminiVoiceEnSecondary);
    });
  }


  /* ========== Save Settings ========== */

  function saveSettings() {
    var data = {
      cloudEnabled: $('cloud-enabled').checked,
      geminiApiKey: $('api-key').value.trim(),
      geminiVoiceZhPrimary: $('zh-primary').value,
      geminiVoiceZhSecondary: $('zh-secondary').value,
      geminiVoiceEnPrimary: $('en-primary').value,
      geminiVoiceEnSecondary: $('en-secondary').value
    };

    chrome.storage.local.set(data, function () {
      showToast();
    });
  }


  /* ========== UI Helpers ========== */

  function updateCloudUI(enabled) {
    var section = $('cloud-section');
    if (enabled) {
      section.classList.remove('cloud-disabled');
    } else {
      section.classList.add('cloud-disabled');
    }
  }

  var toastTimer = null;
  function showToast() {
    var toast = $('toast');
    toast.classList.add('show');
    if (toastTimer) clearTimeout(toastTimer);
    toastTimer = setTimeout(function () {
      toast.classList.remove('show');
    }, 1500);
  }


  /* ========== Event Listeners ========== */

  document.addEventListener('DOMContentLoaded', function () {
    loadSettings();

    $('cloud-enabled').addEventListener('change', function () {
      updateCloudUI(this.checked);
      saveSettings();
    });

    $('api-key').addEventListener('change', saveSettings);

    $('clear-key').addEventListener('click', function () {
      $('api-key').value = '';
      chrome.storage.local.remove(['geminiApiKey'], function () {
        showToast();
      });
    });

    $('zh-primary').addEventListener('change', saveSettings);
    $('zh-secondary').addEventListener('change', saveSettings);
    $('en-primary').addEventListener('change', saveSettings);
    $('en-secondary').addEventListener('change', saveSettings);
  });

})();
