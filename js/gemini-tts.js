/**
 * Gemini Speech Generation API client.
 * Only communicates with generativelanguage.googleapis.com.
 * Docs: https://ai.google.dev/gemini-api/docs/speech-generation
 */

var GEMINI_TTS_MODEL = 'gemini-2.5-flash-preview-tts';
var GEMINI_TTS_BASE = 'https://generativelanguage.googleapis.com/v1beta/models/';
var GEMINI_TTS_TIMEOUT_MS = 30000;
var GEMINI_TTS_MAX_CHARS = 5000;

var GEMINI_VOICES = [
  'Zephyr', 'Puck', 'Charon', 'Kore', 'Fenrir', 'Leda', 'Orus', 'Aoede',
  'Callirrhoe', 'Autonoe', 'Enceladus', 'Iapetus', 'Umbriel', 'Algieba',
  'Despina', 'Erinome', 'Algenib', 'Rasalgethi', 'Laomedeia', 'Achernar',
  'Alnilam', 'Schedar', 'Gacrux', 'Pulcherrima', 'Achird', 'Zubenelgenubi',
  'Vindemiatrix', 'Sadachbia', 'Sadaltager', 'Sulafat'
];

/**
 * Call Gemini Speech Generation API.
 * Strictly follows: https://ai.google.dev/gemini-api/docs/speech-generation
 *
 * @param {string} text - Text to synthesize (will be truncated to GEMINI_TTS_MAX_CHARS)
 * @param {string} voiceName - Gemini voice name (e.g. 'Kore')
 * @param {string} apiKey - Gemini API key
 * @returns {Promise<{audioData: string, mimeType: string}>}
 */
async function geminiSpeechGenerate(text, voiceName, apiKey) {
  if (!apiKey) throw new Error('No API key provided');
  if (!text) throw new Error('No text provided');

  var truncated = text.slice(0, GEMINI_TTS_MAX_CHARS);

  // Build endpoint with key as query parameter (per REST docs)
  var endpoint = GEMINI_TTS_BASE + GEMINI_TTS_MODEL + ':generateContent?key=' + encodeURIComponent(apiKey);

  // Security: verify hostname before fetch
  var parsed = new URL(endpoint);
  if (parsed.hostname !== 'generativelanguage.googleapis.com') {
    throw new Error('Security: invalid Gemini endpoint');
  }

  var controller = new AbortController();
  var timer = setTimeout(function () { controller.abort(); }, GEMINI_TTS_TIMEOUT_MS);

  // Build request body exactly matching the official docs
  var requestBody = {
    contents: [{
      parts: [{ text: truncated }]
    }],
    generationConfig: {
      responseModalities: ['AUDIO'],
      speechConfig: {
        voiceConfig: {
          prebuiltVoiceConfig: {
            voiceName: voiceName
          }
        }
      }
    }
  };

  var response;
  try {
    response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(requestBody),
      signal: controller.signal
    });
  } catch (fetchErr) {
    if (fetchErr.name === 'AbortError') {
      throw new Error('Gemini TTS request timed out (' + (GEMINI_TTS_TIMEOUT_MS / 1000) + 's)');
    }
    throw new Error('Gemini TTS network error: ' + fetchErr.message);
  } finally {
    clearTimeout(timer);
  }

  if (!response.ok) {
    var errBody = '';
    try { errBody = await response.text(); } catch (e) { /* ignore */ }
    // Strip API key from error body for safety
    if (apiKey && errBody) {
      errBody = errBody.split(apiKey).join('[REDACTED]');
    }
    throw new Error('Gemini API ' + response.status + (errBody ? ': ' + errBody.slice(0, 300) : ''));
  }

  var data;
  try {
    data = await response.json();
  } catch (jsonErr) {
    throw new Error('Gemini TTS: invalid JSON response');
  }

  // Navigate response structure per docs:
  // response.candidates[0].content.parts[0].inlineData.data
  if (!data.candidates || !data.candidates[0] || !data.candidates[0].content ||
    !data.candidates[0].content.parts || !data.candidates[0].content.parts[0]) {
    throw new Error('Invalid Gemini TTS response structure');
  }

  var part = data.candidates[0].content.parts[0];
  var inlineData = part.inlineData || part.inline_data;

  if (!inlineData || !inlineData.data) {
    throw new Error('No audio data in Gemini TTS response');
  }

  var rawMime = inlineData.mimeType || inlineData.mime_type || '';
  var b64Data = inlineData.data;

  // Gemini TTS returns raw PCM (s16le, 24000 Hz, mono) — wrap in WAV header for <audio> playback
  if (isPcmMime(rawMime) || !rawMime) {
    b64Data = pcmToWavBase64(b64Data, 24000, 1, 16);
    rawMime = 'audio/wav';
  }

  return {
    audioData: b64Data,
    mimeType: rawMime
  };
}


/**
 * Check if MIME type indicates raw PCM / LINEAR16.
 */
function isPcmMime(mime) {
  if (!mime) return false;
  var lower = mime.toLowerCase();
  return (lower.indexOf('pcm') !== -1 ||
    lower.indexOf('l16') !== -1 ||
    lower.indexOf('linear16') !== -1 ||
    lower === 'audio/raw');
}


/**
 * Wrap base64 PCM data in a WAV container, return base64 WAV string.
 * @param {string} pcmBase64 - Base64-encoded raw PCM (little-endian signed 16-bit)
 * @param {number} sampleRate - e.g. 24000
 * @param {number} numChannels - e.g. 1
 * @param {number} bitsPerSample - e.g. 16
 * @returns {string} Base64-encoded WAV
 */
function pcmToWavBase64(pcmBase64, sampleRate, numChannels, bitsPerSample) {
  var raw = atob(pcmBase64);
  var pcmBytes = new Uint8Array(raw.length);
  for (var i = 0; i < raw.length; i++) {
    pcmBytes[i] = raw.charCodeAt(i);
  }

  var byteRate = sampleRate * numChannels * (bitsPerSample / 8);
  var blockAlign = numChannels * (bitsPerSample / 8);
  var dataSize = pcmBytes.length;
  var headerSize = 44;
  var totalSize = headerSize + dataSize;

  var buffer = new ArrayBuffer(totalSize);
  var view = new DataView(buffer);

  writeString(view, 0, 'RIFF');
  view.setUint32(4, totalSize - 8, true);
  writeString(view, 8, 'WAVE');

  writeString(view, 12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, byteRate, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, bitsPerSample, true);

  writeString(view, 36, 'data');
  view.setUint32(40, dataSize, true);

  var wavBytes = new Uint8Array(buffer);
  wavBytes.set(pcmBytes, headerSize);

  var binary = '';
  for (var j = 0; j < wavBytes.length; j++) {
    binary += String.fromCharCode(wavBytes[j]);
  }
  return btoa(binary);
}


function writeString(view, offset, str) {
  for (var i = 0; i < str.length; i++) {
    view.setUint8(offset + i, str.charCodeAt(i));
  }
}
