# Bubble TTS — Smoke Test Checklist

Use this checklist to verify behavior after any change. **Do not regress.**

---

## Prerequisites

- Extension loaded as unpacked at `chrome://extensions` (Developer mode ON).
- For **Cloud** tests: Options → Enable Cloud TTS, set a valid Gemini API Key, save.

---

## 1. Normal website (e.g. example.com or any blog)

| Step | Action | Expected | Pass / Fail |
|------|--------|----------|------------|
| 1.1 | Open `https://example.com` (or any non‑CSP‑strict page). | Page loads. | ☐ |
| 1.2 | Select at least 3 characters of text. | Purple bubble appears near selection. | ☐ |
| 1.3 | Select fewer than 3 characters (or clear selection). | Bubble disappears. | ☐ |
| 1.4 | Select 3+ characters again. Click bubble once. | Bubble shows loading → playing; audio plays (Local). | ☐ |
| 1.5 | Click bubble again while playing. | Playback stops; bubble returns to play icon. | ☐ |
| 1.6 | Click toolbar icon. | Popup opens (no auto‑play, no redirect to options). | ☐ |
| 1.7 | In popup: change Mode to **Local**, adjust Speed/Pitch/Volume, click **Stop** if playing. | Settings apply; Stop stops playback. | ☐ |
| 1.8 | In popup: click **Play Selection** with text selected on page. | Selection is read aloud. | ☐ |
| 1.9 | Open Options (link in popup or right‑click icon → Options). | Options page shows "Bubble TTS", Cloud (Gemini) key/voices and privacy notice only. | ☐ |

**Local mode pass criteria:** Selection bubble appears (≥3 chars), click toggles play/stop; popup opens on icon click; Local playback works; Options shows only Cloud config.

---

## 2. GitHub (strict CSP)

| Step | Action | Expected | Pass / Fail |
|------|--------|----------|------------|
| 2.1 | Open `https://github.com` (or any repo README). | Page loads. | ☐ |
| 2.2 | Select 3+ characters (e.g. in README). | Bubble appears. | ☐ |
| 2.3 | Click bubble with Mode = **Local**. | Audio plays (browser TTS). | ☐ |
| 2.4 | Set Mode = **Cloud** (popup), ensure API key is set. Select text, click bubble. | Cloud audio plays (via offscreen document; no CSP blob errors). | ☐ |
| 2.5 | Check console (F12) on the GitHub tab. | No "Refused to load blob" or CSP errors from extension. | ☐ |

**Strict CSP pass criteria:** Both Local and Cloud playback work on GitHub; no CSP violations in console.

---

## 3. Chinese content page

| Step | Action | Expected | Pass / Fail |
|------|--------|----------|------------|
| 3.1 | Open a page with mainly Chinese text (e.g. a Chinese news or wiki page). | Page loads. | ☐ |
| 3.2 | Select 3+ Chinese characters. | Bubble appears. | ☐ |
| 3.3 | Click bubble (Local or Auto). | Chinese is spoken (zh‑CN or appropriate voice). | ☐ |
| 3.4 | Switch to Cloud mode; select same Chinese text, click bubble. | Cloud TTS speaks Chinese (Gemini zh voice). | ☐ |

**Chinese pass criteria:** Bubble appears; Local and (if configured) Cloud both speak Chinese correctly.

---

## 4. Local mode — summary

- Bubble only when selection length ≥ 3; click = play/stop.
- Toolbar icon opens popup (Mode, Speed, Pitch, Volume, Stop, Play Selection).
- Options: Cloud key + voice fallbacks + privacy notice only.
- No automatic playback on icon click.

---

## 5. Cloud mode — summary

- Cloud playback works on normal and strict‑CSP pages (e.g. GitHub) via offscreen playback.
- Primary voice failure falls back to secondary once.
- No API key in console or logs; key stored in `chrome.storage.local` only.

---

## 6. Quick regression run (minimum)

1. Normal site: select text → bubble → click play → click stop.  
2. Toolbar: click icon → popup opens.  
3. Options: open → only Bubble TTS + Cloud settings.  
4. GitHub: select text → play (Local then Cloud if configured) → no CSP errors.

**If any step fails, do not ship.**
