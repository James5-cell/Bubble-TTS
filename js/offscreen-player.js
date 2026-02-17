/**
 * Offscreen Player — handles Cloud TTS audio playback.
 * Runs in an offscreen document, immune to page CSP restrictions.
 *
 * Messages:
 *   OFFSCREEN_PLAY_AUDIO  { audioBase64, mime, speed, volume }
 *   OFFSCREEN_STOP_AUDIO  {}
 *
 * Sends back:
 *   OFFSCREEN_AUDIO_ENDED {}
 */
(function () {
    'use strict';

    var audioEl = null;
    var blobUrl = null;

    function cleanup() {
        if (audioEl) {
            audioEl.pause();
            audioEl.onplay = null;
            audioEl.onended = null;
            audioEl.onerror = null;
            try { audioEl.src = ''; } catch (e) { }
            audioEl = null;
        }
        if (blobUrl) {
            URL.revokeObjectURL(blobUrl);
            blobUrl = null;
        }
    }

    chrome.runtime.onMessage.addListener(function (msg, sender, sendResponse) {

        if (msg.type === 'OFFSCREEN_PLAY_AUDIO') {
            cleanup();

            try {
                var raw = atob(msg.audioBase64);
                var arr = new Uint8Array(raw.length);
                for (var i = 0; i < raw.length; i++) {
                    arr[i] = raw.charCodeAt(i);
                }
                var blob = new Blob([arr], { type: msg.mime || 'audio/wav' });
                blobUrl = URL.createObjectURL(blob);

                audioEl = new Audio(blobUrl);
                audioEl.playbackRate = msg.speed || 1.0;
                audioEl.volume = (msg.volume != null) ? msg.volume : 1.0;

                audioEl.onended = function () {
                    cleanup();
                    chrome.runtime.sendMessage({ type: 'OFFSCREEN_AUDIO_ENDED' }).catch(function () { });
                };

                audioEl.onerror = function () {
                    cleanup();
                    chrome.runtime.sendMessage({ type: 'OFFSCREEN_AUDIO_ENDED', error: 'Audio playback error' }).catch(function () { });
                };

                audioEl.play().then(function () {
                    sendResponse({ ok: true });
                }).catch(function (e) {
                    cleanup();
                    sendResponse({ error: 'Play failed: ' + (e.message || e) });
                });
            } catch (err) {
                cleanup();
                sendResponse({ error: 'Offscreen error: ' + err.message });
            }

            return true; // async sendResponse
        }

        if (msg.type === 'OFFSCREEN_STOP_AUDIO') {
            cleanup();
            sendResponse({ ok: true });
            return false;
        }

    });

})();
