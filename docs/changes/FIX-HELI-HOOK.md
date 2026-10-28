---
task: FIX-HELI-HOOK
status: review
kind: fix
flag: none
player_facing: yes
---

# Helicopter hook: wider window and pilot hints (24 October 2026)

Kyle could not hook cargo. Claude traced it (card `docs/board/cards/FIX-HELI-HOOK.md`):
the hook hangs 15 m below the helicopter and had to be within 3 m sideways,
2 m of the load's height and 1.5 m/s of its speed, and a failed H press did
nothing and said nothing. Built on `cloud/fix-heli-hook` from
`integration/wasteland`. No new switch: this fixes the released helicopter.

## What changed

- `src/heli/heli-cable.js`: reach 4 m, height slack 3.5 m, relative speed
  2.5 m/s. New `hookRefusal()` gives the reason a load is not hookable (a
  rules value: `slowDown`, `lower` or `higher` with whole metres, `closer`);
  `canHook()` is now "no refusal". Order: speed, then height, then reach.
  New `CABLE.guideReach` (10 m) for the ring and for when a hint is given.
- `src/heli/heli-skins.js`: gear that changes reach keeps its relative
  difference: the base kit's `hookReach` 3 to 4, and the strong hook 5 to 6.7
  (4 x 5/3, to a tenth). The cargo net's 10 m is unchanged.
- `src/heli/heli-session.js`: a failed H press returns and emits a
  `hookRefused` event `{reason, id, metres?}`. The bucket and the rescue line
  give `bucket` and `rescueLine` (both used to be silent). H stays quiet when
  no load is within 10 m sideways, so a pilot with the bucket fitted who
  presses H to pour at the lake is not nagged. New `session.hookGuide()`
  (the load nearest the hook within 10 m, with `ready` true when H would
  hook it now, counting the lesson-4 rule, the Lab's lift limit, the bucket
  and the rescue line). It is a method, not a field of `view()`, so the
  view's shape and the fingerprints made from it do not change.
- `src/app.js` (`heliView()`, 3 lines): adds `hookGuide` to the view the
  scene is given. Drawing only.
- `src/heli/heli-ui.js`: `hookHintText()` words the reasons and the panel
  shows one line for 2 seconds (`HOOK_HINT_SECONDS`), a newer hint replacing
  the old one: "Take the bucket off at the pad", "Take the rescue line off at
  the pad", "Slow down", "Lower N m", "Higher N m", "Closer".
- `src/heli/heli-scene.js`: a ground ring (2.2 m radius, white, green when H
  would hook) under the load within 10 m, and the drawn hook is now 0.5 m
  across, orange (it was a 0.18 m brown ball). Cars, lesson crates and
  rescue crates alike. Judged by eye on the laptop before merge: **not
  checked here** (needs a real browser and graphics).
- `docs/HELICOPTER.md` section 5: the new window and the hints.

## Sound cue

Event `hookRefused` plays the existing `heli.hook.release` cue (the hook's own
click, `public/assets/audio/heli/hook-release.ogg`, catalog row
`heli.hook.release`) at 0.4 volume and 0.55 rate: a dull "not yet". The
catalog has no refusal or UI-error sound (its only interface sounds are
tones the helicopter makes itself), so the closest short, existing sound is
reused and no recording or catalog row was added. Mapped in
`HELI_EVENT_CUES` in `src/heli/heli-audio.js`. Claude to confirm by ear.

## Tests

New `tools/test-heli-hook-window.mjs` (38 checks), written first. Held at
18.5 m over the lesson crate, and crossing it at 2 m/s, `pressHook()` returned
`null` and sent no event on the old code; on the new code both hook. It also
covers: 23 m up gives "Lower 7 m" and a white ring, 11 m up "Higher 5 m",
6 m to the side "Closer", too fast "Slow down" first, 14 m to the side no ring
and no message, and the green ring at 18.5 m.

Lesson 4 (`test-heli-lessons.mjs`) passes unchanged.

## Changed assertions (old to new)

None is loosened; each moves with the window. Every one needs Claude's review
(AGENTS rule 18). The first two are the cable and lesson numbers the card
named; the rest are in other suites the same numbers reach, listed so the
review is complete.

- `tools/test-heli-cable.mjs`, "not from 4 m to the side" (4 m, old reach 3):
  now "4 m to the side is within the hook's reach" (true), plus "not from
  4.5 m" (false). The 3 m/s and 4 m-above checks still fail the hook as before.
- `tools/test-heli-skins.mjs`: `BASE_GEAR.hookReach` 3 to 4; supply gear
  `hookReach` 5 to 6.7 (two places).
- `tools/test-heli-skin-gear.mjs`: cable scenario probe at 4.9 m from the
  hook changed to 5.4 m (the same 1.4 m beyond the plain hook, so the old
  recorded fingerprint `cable: 1196926726` still holds unchanged, and so do
  the other five); label "hook reach 3 m" to "4 m"; the strong-hook checks
  car at 4 m to 5.5 m, "5.1 m too far" / "5 m within" to "6.8 m too far" /
  "6.5 m within"; "no net: 4 m is out of reach" to 4.5 m.
- `tools/test-heli-skin-session.mjs`: the car 4 m to the side to 5.5 m (stock
  `null` to `hookRefused`, supply still `hooked`); the stock-paint crate
  check `null` to `hookRefused` with reason `closer` (H now answers with a
  hint instead of nothing, which is the change asked for).

## Checks

Run in the cloud container (Linux, no browser window or graphics):

- All 24 `tools/test-heli-*.mjs` suites pass, including lesson 4
  (`test-heli-lessons.mjs`, unchanged) and the new `test-heli-hook-window.mjs`.
- `node tools/run-tests.mjs --tier lane --changed --jobs 8 --keep-going`, on
  the branch merged with the latest `integration/wasteland` (one conflict in
  the import lines of `heli-session.js`, kept both): 398 passed, 8 failed.
  All eight need the laptop and none touches the helicopter:
  `test-course-kit`, `test-earned-cars-ui`, `test-full-check`,
  `test-drive-through`, `test-medals` (each asserts `win32` or runs `pwsh`),
  `test-salt-flats` and `test-salt-flats-art` (read
  `C:\Users\kyleb\dev\art-library`) and `test-vesper-art` (needs a real
  local Blender). Two history-reading suites (`test-arsenal-runtime`,
  `test-deep-save`) first failed only because the cloud clone was shallow;
  they pass once the history is fetched.
- `npm run build`: passes.
- Not run here: browser scenarios and any frame check (no browser or
  graphics). The ring and the hook size are judged by eye on the laptop
  (one picture pair); the new refusal sound needs a listen.

## Removed

Nothing. The old 3 m, 2 m and 1.5 m/s numbers are replaced in place.
