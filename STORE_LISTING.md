# Bubble TTS — Chrome Web Store Listing

## Short Description (132 chars max)

Select text, click the bubble, hear it spoken — powered by Local TTS or Cloud (Gemini).

## Detailed Description

Bubble TTS is a lightweight text-to-speech Chrome extension. Select any text on a webpage, click the floating bubble, and hear it read aloud.

**Two playback modes:**
- **Local:** Uses your browser's built-in TTS engine — instant, offline, no data sent anywhere.
- **Cloud (Gemini):** Sends selected text to Google's Gemini API to generate high-quality speech. Requires your own API key.

**Key features:**
- Floating selection bubble — appears when you highlight text
- Right-click context menu support
- Adjustable speed, pitch, and volume
- Auto-detects English and Chinese content
- Primary + fallback voice configuration for Cloud mode
- Works on strict-CSP sites (GitHub, etc.) via offscreen audio playback

**Minimal permissions:**
- `contextMenus` — adds "Read selected text" to right-click menu
- `storage` — saves your preferences and API key locally
- `tts` — uses Chrome's built-in text-to-speech
- `offscreen` — plays Cloud audio in a background document (bypasses page CSP)

**Privacy:**
- Local mode: no data leaves your device.
- Cloud mode: selected text is sent to Google Gemini for speech synthesis.
- Your API key is stored in `chrome.storage.local` and never synced or transmitted to third parties.

## Keywords

text to speech, TTS, read aloud, selection, bubble, Gemini, speech synthesis, accessibility

## Category

Accessibility

## Language

English
