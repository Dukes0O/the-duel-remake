---
task: QA-HELIPAD-MAP-CANVAS
status: ready-for-review
player_facing: no
---

# QA-HELIPAD-MAP-CANVAS: the helipad lesson test and the pilot's map

## What failed

`tools/test-drive-lesson-helipad.mjs` stopped passing on integration (57a8ac6f) with
`Cannot read properties of null (reading 'getContext')` at `src/heli/pilot-map-view.js`
line 308. It passed earlier on 27 October, before the pilot's map switch went on.

## Why

- The test builds a small stand-in for the helicopter panel and its page. With the
  pilot's map off the panel never made the map. With it on, the panel makes the map
  the first time its view carries the pilot's secrets, and the map looks for a
  `canvas` inside its own section. The stand-in has none, so the lookup gave null
  and the map called `getContext` on it.
- Hiding that one error showed a second fault in the stand-in: its `createElement`
  handed back the same single element for every request. The map's own section
  therefore became the helicopter panel's element, and the map's click listener
  replaced the panel's, so "Lesson here" clicks never reached the panel
  ("the helicopter visit has ended" failed).

## Fix (no assertion changed)

- `src/heli/pilot-map-view.js`: the map no longer needs a canvas to exist. Without
  one it makes no drawing context, adds and removes no pointer listener, and keeps a
  plain text line in place of its info line. With a canvas the map behaves exactly
  as before (same drawing, same listeners).
- `tools/test-drive-lesson-helipad.mjs`: the stand-in page now returns a new element
  for each `createElement` call (the first is the helicopter panel, as before), the
  way a real page does. Every check is unchanged, 102 pass.

## Checks

- `test-drive-lesson-helipad.mjs` 102 checks pass. All 31 `test-heli-*.mjs`,
  `test-map-destinations.mjs`, `test-map-secrets.mjs`, `test-map-view.mjs` and
  `test-pilot-map.mjs` pass.

## Removed

Nothing.