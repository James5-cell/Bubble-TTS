# Bubble TTS — Chrome Web Store Release

## Shell release (English-only)

- **Branding:** All user-facing strings use "Bubble TTS". No "Read Aloud" or ken107 references in the packaged extension.
- **Icons:** Required sizes present: `img/icon-16.png`, `img/icon-32.png`, `img/icon-48.png`, `img/icon-128.png` (manifest points to these).
- **Permissions:** Minimal: `contextMenus`, `offscreen`, `storage`, `tts`; host only `https://generativelanguage.googleapis.com/*`.

## Version bump

1. In `manifest.json`, update `"version"` (e.g. `1.0.0` → `1.0.1`).
2. Use [semver](https://semver.org/): patch for fixes, minor for features, major for breaking changes.

## Build & package

No build step. Extension runs from source.

### Create ZIP for Chrome Web Store

From the project root:

```bash
zip -r bubble-tts-v1.0.0.zip . \
  -x ".git/*" \
  -x ".gitignore" \
  -x "node_modules/*" \
  -x "tools/*" \
  -x "*.md" \
  -x ".DS_Store"
```

To exclude docs and dev-only files (recommended for store):

```bash
zip -r bubble-tts-v1.0.0.zip . \
  -x ".git/*" \
  -x ".gitignore" \
  -x "node_modules/*" \
  -x "tools/*" \
  -x "*.md" \
  -x "CLEANUP_REPORT.md" \
  -x "SMOKE_TEST.md" \
  -x "STORE_LISTING.md" \
  -x "RELEASE.md" \
  -x ".DS_Store"
```

### Verify ZIP contents

```bash
unzip -l bubble-tts-v1.0.0.zip | head -60
```

Must include:

- `manifest.json`
- `background.js`
- `popup-mini.html`, `options-simple.html`, `offscreen.html`
- `js/`: `bubble-content.js`, `defaults.js`, `events.js`, `gemini-tts.js`, `lang-detect.js`, `offscreen-player.js`, `options-simple.js`, `popup-mini.js`, `rxjs.umd.min.js`
- `css/`: `options-simple.css`, `popup-mini.css`
- `img/`: `icon-16.png`, `icon-32.png`, `icon-48.png`, `icon-128.png`
- `_locales/en/messages.json`

## Pre-upload checklist

1. Load unpacked at `chrome://extensions` (Developer mode ON).
2. Name shows **"Bubble TTS"** in the list.
3. Click toolbar icon → popup with Mode, Speed, Pitch, Volume, Stop, Play Selection.
4. On a normal page: select 3+ characters → bubble appears → click → audio plays (Local).
5. On GitHub (strict CSP): select text → click bubble in Cloud mode → cloud audio plays (no CSP errors).
6. Right-click selected text → "Bubble TTS: Read selected text" in context menu.
7. Options → title "Bubble TTS", Cloud (Gemini) key and voice settings only; privacy notice visible.
8. No console errors in service worker or popup.
9. Run full steps in `SMOKE_TEST.md` and confirm pass.

## Chrome Web Store upload

1. Open [Chrome Web Store Developer Dashboard](https://chrome.google.com/webstore/devconsole).
2. **New Item** → upload the ZIP.
3. Use listing copy from `STORE_LISTING.md` (short description, long description, category **Accessibility**).
4. Add screenshots (e.g. 1280×800 or 640×400).
5. Submit for review.
