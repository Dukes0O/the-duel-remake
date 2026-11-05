# QA-BUNDLE-NO-COPY

## Change

QA builds now set `build.copyPublicDir: false` and `publicDir: false`. The QA
preview serves missing files from the project `public/` directory after Vite
checks the bundle, so bundle files keep precedence. The fallback checks the
resolved path stays inside `public/`, returns mapped content types, handles
single byte ranges and HEAD requests, and returns 416 for invalid ranges. QA
preview uses MPA mode so a missing asset is not rewritten to `index.html`.

`test-audio-crash-peak.mjs` has its own temporary Vite config; it now uses the
same no-copy settings and public fallback. `browser-harness.mjs` reports bundle
size and elapsed build time.

## Measurements

| | Before | After |
|---|---:|---:|
| QA bundle size | 373 MB copied from `public/` | 7.15 MiB (72 files) |
| QA build time | Not recorded | 2.1 s wall time; Vite reported 1.34 s |

The measured QA build used `.qa-dist/browser-suite-measured-final`. The prior
size is the known copied asset tree size; no old build-time measurement was
available. Production `npm run build` completed in 3.8 s wall time (Vite
reported 2.37 s). `vite.config.js` and production build behavior were not
changed.

## Checks

- `node tools/test-browser-harness.mjs`: passed, 18 tests. The added preview
  test checks no-copy config, fallback assets, bundle precedence, WAV content
  type, Range, HEAD and traversal refusal.
- `node tools/test-preview-launcher.mjs`: passed, 23 acceptance checks.
- `node tools/test-build-update.mjs`: passed, 190 checks.
- `npm run build`: passed. Vite reported its existing large-chunk warning.
- Plain QA build: passed; 7.15 MiB, 72 files, no `public/` copy.
- Chrome browser scenarios: not run here; Claude will run the browser check.
- Lane tier: not run here; Claude will run it.
- Race fingerprints: unchanged; this change affects QA build and preview tools
  only. No simulation code or replay assertions changed.

## Changed assertions

No existing assertion changed meaning. New checks assert the intended QA
configuration and fallback behavior.

## Removed

- Removed Vite's `public/` copy and implicit public serving from QA bundles;
  the checked fallback now serves those URLs from the project asset tree.
- Removed the duplicate `public/` copy from the audio crash peak suite's
  temporary build recipe.
- Removed scratch test bundles and logs created for this lane after measuring
  and recording the results.
