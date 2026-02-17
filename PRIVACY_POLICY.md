# Bubble TTS — Privacy Policy

**Last updated:** February 2025

Bubble TTS ("the extension") is a Chrome extension that reads selected webpage text aloud using your browser's built-in speech (Local mode) or Google's Gemini API (Cloud mode). This policy describes what data the extension uses and where it goes.

---

## What data does Bubble TTS use?

- **Text you select on a page** — When you click the bubble or use "Play Selection," the extension uses only the text you have selected. It is used solely to generate speech (locally in your browser or via the Gemini API in Cloud mode).
- **Your settings** — Mode (Auto / Local / Cloud), default language, speed, pitch, volume, Cloud on/off, and voice choices are stored **only on your device** in Chrome's local storage (`chrome.storage.local`). They are not sent to any server except as described below for Cloud mode.
- **Gemini API key (optional)** — If you enable Cloud TTS, you provide an API key. It is stored **only on your device** in `chrome.storage.local`. The extension does not sync it, log it, or send it anywhere except to Google's Gemini API when you use Cloud playback.

---

## When does data leave my device?

- **Local mode** — No data is sent off your device. Speech is generated entirely by your browser's built-in text-to-speech.
- **Cloud mode** — Only when you have Cloud TTS enabled and use it, the **selected text** is sent to **Google's Gemini Speech Generation API** (`generativelanguage.googleapis.com`) to produce audio. Your API key is sent with these requests so Google can bill your account; the extension does not send your key to any other service.

The extension does **not** send data to any other servers, and it does not collect your identity, browsing history, or usage analytics.

---

## Do you sell or share my data?

No. We do not sell, rent, or share your data with third parties. The only "sharing" is the technical sending of the text you selected (and your API key) to Google's Gemini API when you choose Cloud mode, for the sole purpose of generating speech. That is governed by [Google's privacy policy](https://policies.google.com/privacy) and your agreement with Google for the Gemini API.

---

## Where is my data stored?

All settings and your API key are stored **locally** in your browser via Chrome's `storage.local` API. They are not synced to the cloud by the extension. Uninstalling the extension removes this local data.

---

## Permissions

The extension requests only the permissions needed to work:

- **contextMenus** — To show "Read selected text" in the right-click menu.
- **storage** — To save your settings and API key locally.
- **tts** — To use Chrome's built-in text-to-speech in Local mode.
- **offscreen** — To play Cloud audio on strict-CSP sites (e.g. GitHub) without running in the page.
- **Host access to `generativelanguage.googleapis.com`** — Only for Cloud mode, to call the Gemini Speech Generation API.

---

## Changes to this policy

We may update this policy from time to time. The "Last updated" date at the top will be revised, and for the Chrome Web Store we will use the version that is current when you install or update the extension.

---

## Contact

For questions about this privacy policy or the extension, open an issue or see the project repository:  
**https://github.com/James5-cell/Bubble-TTS**
