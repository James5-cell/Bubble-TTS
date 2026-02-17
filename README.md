# Bubble TTS

A minimal Chrome extension for text-to-speech: select text on any page, click the floating bubble, and hear it spoken. Uses your browser’s built-in TTS (Local) or Google’s Gemini API (Cloud).

## Features

- **Selection bubble** — Appears when you highlight 3+ characters. Click to play or stop.
- **Two modes** — **Local** (browser TTS, offline) or **Cloud** (Gemini Speech Generation; requires your own API key).
- **Auto mode** — Prefers Local; falls back to Cloud when no suitable local voice is available.
- **Language** — Auto-detects Chinese vs English; configurable default for unknown text.
- **Popup** — Toolbar icon opens a small panel: Mode, Speed, Pitch, Volume, Stop, and “Play Selection.”
- **Strict-CSP friendly** — Cloud audio plays in an offscreen document so it works on sites like GitHub.

## Requirements

- Chrome 109 or newer (Manifest V3).
- For Cloud: a [Gemini API key](https://ai.google.dev/gemini-api/docs) (stored locally only).

## Install (unpacked)

1. Clone or download this repo.
2. Open `chrome://extensions`, turn on **Developer mode**.
3. Click **Load unpacked** and select the project folder.
4. Pin the extension if you like; use the toolbar icon to open the popup or adjust settings.

## Usage

1. On any webpage, select at least 3 characters of text.
2. A purple bubble appears near the selection. Click it to start reading.
3. Click again to stop. Clear the selection to hide the bubble.
4. Use the toolbar popup to switch Mode (Auto / Local / Cloud), change Speed/Pitch/Volume, or click **Play Selection** to read the current selection without the bubble.
5. **Options** (right-click icon → Options, or link in popup): enable Cloud TTS, add your Gemini API key, and set primary/fallback voices for Chinese and English.

## Options

- **Mode** — Auto, Local, or Cloud.
- **Default language** — Used when text language is unknown (e.g. Chinese or English).
- **Cloud** — Enable Cloud TTS, Gemini API key, and primary/fallback voices for zh and en. Your key is stored in `chrome.storage.local` and is never synced or logged.

## Permissions

- **contextMenus** — “Read selected text” in the right-click menu.
- **storage** — Save settings and API key locally.
- **tts** — Chrome’s built-in text-to-speech.
- **offscreen** — Play Cloud audio in a background document (avoids page CSP issues).
- **host_permissions** — Only `https://generativelanguage.googleapis.com/*` for the Gemini API.

## Project layout

- `manifest.json` — Extension manifest (MV3).
- `background.js` — Service worker; loads scripts and handles messages.
- `popup-mini.html` / `js/popup-mini.js` / `css/popup-mini.css` — Toolbar popup.
- `options-simple.html` / `js/options-simple.js` / `css/options-simple.css` — Options page.
- `offscreen.html` / `js/offscreen-player.js` — Offscreen document for Cloud audio playback.
- `js/bubble-content.js` — Content script: selection bubble and playback trigger.
- `js/events.js` — Background logic: play/stop, Local vs Cloud, offscreen.
- `js/gemini-tts.js` — Gemini Speech Generation API client.
- `js/lang-detect.js` — Simple zh/en detection.
- `js/defaults.js` — Shared helpers and `brapi` (Chrome API wrapper).
- `js/rxjs.umd.min.js` — RxJS (used by `defaults.js`).

## Release

See [RELEASE.md](RELEASE.md) for versioning, building the ZIP, and uploading to the Chrome Web Store. Run the steps in [SMOKE_TEST.md](SMOKE_TEST.md) before releasing.

## License

MIT. See [LICENSE](LICENSE). This project derives from [ken107/read-aloud](https://github.com/ken107/read-aloud); the Bubble TTS fork is rebranded and simplified for selection-bubble TTS with Local and Gemini Cloud only.
