# Simple Pitch/Speed Changer

![Simple Pitch/Speed Changer icon](/public/icon128.png)

Simple Pitch/Speed Changer is a Manifest V3 browser extension that shifts media pitch by semitones. The popup stores a per-tab semitone value, the background worker relays updates, and the injected page script applies the matching playback-rate multiplier to `audio` and `video` elements.

## Development

Install dependencies with:

```bash
pnpm install
```

Start the extension build in watch mode with:

```bash
pnpm dev
```

Create a production build with:

```bash
pnpm build
```

Lint the project with:

```bash
pnpm lint
```

To load the extension, open `chrome://extensions/`, enable developer mode, and load the unpacked `dist/` directory.

## Project Structure

- `src/popup/` contains the Svelte popup UI used to adjust the semitone shift for the active tab.
- `src/background/main.ts` listens for tab-scoped storage changes and forwards updates to the content bridge.
- `src/content/bridge.ts` runs in the extension world, injects the page script, and bridges runtime messages into page events.
- `src/content/main.ts` runs in the page context and patches media elements so pitch shifting applies to current and future playback.
- `src/shared/` contains small helpers shared across runtimes.
- `manifest.config.ts` defines the extension manifest for CRXJS/Vite.

## Notes

- Semitone values are stored in `chrome.storage.session` under a per-tab key.
- The popup only writes state; the background worker owns relaying updates into the page.
- The page script keeps each media element's original playback rate and multiplies it by `2 ** (semitones / 12)`.
