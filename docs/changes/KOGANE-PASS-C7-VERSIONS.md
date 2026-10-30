---
task: KOGANE-PASS-C7-VERSIONS
status: built-behind-switches
kind: course
flag: kogane-pass-night, kogane-pass-reverse
player_facing: no (both stay behind their dev switches until Kogane Pass is released)
---

# Kogane Pass Night and Kogane Pass Reverse (29 October 2026)

Two free versions of Kogane Pass, built the way the five released versions were
(docs/changes/VARIANTS-RELEASE.md). Both are `dev`: nobody sees them until
Kogane Pass itself goes live, and the release step is one word per file.

## What was built

- `src/circuits/kogane-pass-night.js`: `lightVariant` with the existing `night`
  look from the start line (the day course runs dusk into night at 2.6 km).
  Road, scenery and kit are exactly the parent's, so the car park lanterns, the
  tea house, the vending row and the lower road lamp row are lit as on the parent.
  The night sound bed follows the light, so it plays from the start. Id
  `kogane-pass-night`, release order 15, price 0, found from the air over
  Kogane Pass. This is the id the story's supply flight writes
  (`STORY_NIGHT` in `src/heli/heli-story.js`) and the id the Night Duel uses
  (docs/story/kogane-invitation.md 8.2 and 8.3), and it opens under the existing
  rule in `src/course-access.js` (parent open, id in the pilot's found list).
- `src/circuits/kogane-pass-reverse.js`: `reverseVariant`, the climb from the
  village at the foot up to the lake. Id `kogane-pass-reverse`, release order 16
  (14 is kept for Eifel Crown Reverse, as the course packet says), price 0,
  found from the air.
- Switches: each manifest is its own switch (`kogane-pass-night`,
  `kogane-pass-reverse`, state `dev`); `src/feature-flags.js` and the Preview
  launcher read the switches from the manifests, so neither file needed an edit.

## The reverse of an open road (the packet's open question 2)

`reverseVariant` was written for loops. For an open road it now: starts the new
road where the old one ended (a station is `length - s`), gives the new road the
old road's finishing height, and turns the world positions it carries (backdrop
hills, lamp light pools) by the difference between the old finishing heading and
the new start heading. Closed courses take the old path unchanged (the five
released reverses are byte-identical: their world signatures and replays did not
move). A new optional `adjust` hook lets one course edit fields only it has.
Also, the waterside block no longer assumes a marina and a lighthouse.

Measured on the real built courses, 200 stations and four offsets: road centre,
height and ground agree with the parent's reversed to under a nanometre, and the
reversed length is the parent's to 1e-12.

Kogane-only fields moved in `kogane-pass-reverse.js`: section names in the new
order, shrine bell position, valley mist, the forest across the lake (now on the
other side, thinning at its far end through a new `fadeIn` on forest ranges in
`src/track-script-course.js`; nothing else uses it), the lamp row and its light
pools, curve mirrors, chevron boards and braking boards (laid again for the
climb, arrow into the turn), walls (kept the same distance from the road edge),
and both gantries. The summit-style arrival terrace (`finishArea`) is turned off
for the climb: it belongs to the old finish, which is now the start.

## Found from the air

- `src/heli/map-secrets.js`: two signs on Kogane Pass. Night: a ring of lantern
  fires on the car park lawn (40, 124). Reverse: a second start grid on the
  village road (947.5, 1666.2). Both spots are the clear spots found with
  `signClear` on the real Kogane road. The signs only exist while their switch is on.
- `src/heli/pilot-map-world.js`: the sign pictures reuse the finished fire-pit
  and start-grid models (no new art).
- `src/heli/pilot-map-data.js`: the Kogane place lists the two versions.

## Fixtures

- `tools/fixtures/world-signatures/kogane-pass-night.json` and
  `kogane-pass-reverse.json` (first captures with `--capture-new`). Night is not
  a lighting-only copy of the day scene, so its hash is its own. Day Kogane Pass
  has no signature yet (it is still behind its own switch); that is the release
  card's job.
- `tools/replays/courses/kogane-pass-night.json` and `kogane-pass-reverse.json`:
  one duel case each at 30, 60 and 144 frames a second, recorded with the two
  courses temporarily on. They load only once the courses are in the list.
  Every existing fingerprint was re-recorded in the same run and did not change.

## Tests

All run from the lane folder, memory-only saves, no frame timing.

- Lane tier (`node tools/run-tests.mjs --tier lane --changed --jobs 2 --keep-going`): 182 of 182 passed on the final commit. No suite failed at its end on the Recycle Bin step.
- `npm run build`: passed.
- By hand: test-circuits, test-world-composition (with `--capture-new` for the two signatures, then the ordinary run), test-ground-rows-exact, test-campaigns, test-opponents, test-circuit-layouts, test-feature-flags, test-preview-launcher, test-circuit-kogane, test-map-secrets, test-map-view, test-course-eligibility, test-course-access, test-reference-laps: all passed.
- Also run once with the two courses temporarily switched on (then put back to dev): test-circuits (31 events), test-circuit-layouts, test-circuit-variants, test-replays, test-feature-flags, test-preview-launcher passed, so the courses work as released courses too.
- New in `tools/test-circuit-variants.mjs`: registration and dev switches, Night dark from the start with the parent's road and kit, Reverse follows the physical mountain (road, height, ground, turns, boards, lake, lamps), kit on real ground, walls beside the road edge, gantries at both ends.

## Changed assertions (reviewed)

None is loosened; each moves because two courses were added.

- `tools/test-circuit-layouts.mjs`: the list of children found from the air
  names the two Kogane versions with their parent (message "five" becomes "seven").
- `tools/test-map-secrets.mjs`: the secret list has seven entries; the Kogane
  two are expected `dev` (every other is expected `on`).
- `tools/test-map-view.mjs`: the count of secret courses following their switches
  is the five released, not the seven.
- `tools/test-map-secrets.mjs`: the course loader falls back to the registry for
  a parent still behind its switch (Kogane Pass).
- `tools/test-reference-laps.mjs`: the check that every found-from-the-air
  version starts through its unlock rule also puts a parent that is still behind
  its switch into the course list for that check (otherwise the Kogane versions
  could not open). The check itself is unchanged.

## Not done here

- No look check in the game (night lighting, climb scenery, the two signs) and no
  frame timing. Both belong to the Kogane Pass release.
- The arrival terrace at the village end is not rebuilt for the climb's start.
- `src/course.js` still maps a donor's far terrain by a half turn; Kogane has no
  far terrain, so nothing is affected, but another open road with far terrain
  would need the same turn used here.
- Ground-row hashes (`tools/fixtures/ground-rows-hashes.json`) are added at switch-on,
  as for the five.

## Removed

Nothing.
