---
task: VARIANTS-RELEASE
status: ready-for-release-review
kind: release
flag: panorama-ridge-night, harbour-lights-dusk, panorama-ridge-reverse, harbour-lights-reverse, tremblant-woods-reverse
player_facing: yes
---

# The five secret courses, ready to go live (28 October 2026)

Panorama Ridge Night, Harbour Lights Dusk, Panorama Ridge Reverse, Harbour
Lights Reverse and Tremblant Woods Reverse were built on 15 October and have
sat behind their own switches since. This card checks them again, fixes what
was wrong, and prepares the switch-on as a separate commit. Nothing is merged,
released or timed here. Frame checks are left for Claude on a quiet laptop.

## What the five courses are in the game

Each is a free course that opens when the player finds its sign from the
helicopter over its parent course (docs/PILOT_MAP.md section 5). The sign only
exists while the course's own switch is on, which is why Kyle never met them.
Once on, each shows in the course list as LOCKED with the line "Found from the
air: look for its sign from the helicopter over <parent>", then opens when the
sign is spotted. The Night Cup (Harbour Lights, Panorama Ridge Night, Neon
Docks) can only start after Panorama Ridge Night is found, because a cup needs
every course owned.

## Prices and why

All five are priced 0 and release orders stay 7 to 11 (after Attack at 6).
Reasons: the course list code refuses a price on a course that has an unlock
rule (`registerCircuits`: "A circuit unlock requires zero price"), and the
"owned-course" rule is limited to the Summit solo child by the same code. The
parents cost 1,600 (Panorama Ridge, Tremblant Woods) and 1,800 (Harbour
Lights). Pricing the variants "half of the parent" would mean dropping the
helicopter secret and rewriting the unlock rule, which is a design decision for
Claude and Kyle, not for this card. The switch-on is one parameter per course
(`state`, default `'dev'`) in `src/circuit-variants.js`, so either choice stays
small.

## Per course: what was checked and fixed

Checked for each: its own suite (`tools/test-circuit-variants.mjs`), the
native drive-through (`node tools/drive-through.mjs --course <id>`, which
drives three laps with the racing line and probes the walls), the track review
(map, speed trace, 16 chase-camera frames, the field at the first corner) in
the private browser, the reference-lap and replay fixtures, and pictures at
1280 x 720 for Claude's look check.

Faults found and fixed (all in tools, none in a course):

1. **The browser track review could not start a secret course.** Its disposable
   profile still used the old "finish top three" rule, so the browser said the
   course would not start. It now also gives the profile the pilot's map record,
   as the headless lap already did (`tools/scenarios/track-review.mjs`,
   `tools/track-review.mjs`, test in `tools/test-track-review.mjs`).
2. **Five world signatures were stale.** The 24 October grass change
   (FIX-GRASS-GROUND) updated the 23 enabled courses, but the five switched-off
   scenes were never compared, so their saved signatures were from before it.
   Proved by building them with the switches still off (identical new values)
   and by bisecting to the grass merge. See "Changed signatures".

No fault was found in any road, scenery, start line, pit side or kit. Notes per
course:

- **Panorama Ridge Night.** The road, scenery and kit are exactly the parent
  (tested), only the sky differs (moon, stars). Drive-through: the same 357
  issues as the released parent (342 catch-fence panels measured more than 0.45 m
  above ground on the cut slopes, 12 fence probe misses, two paddock props about
  1 cm over the 0.3 m limit). Nothing new, nothing worsened. Left alone because
  the parent is released and the issue is in its shared kit.
- **Panorama Ridge Reverse.** Same fence findings as the parent (357), plus
  one grandstand 1.9 cm over the limit. The probe that failed on a concrete wall
  sits on the very last wall panel before the pit opening; neighbouring probes at
  4,750 m and 4,740 m pass at 70 and 110 mph. The pit lane is on the left, the
  full bay fits with no wrap, the start grid and gantry face the right way
  (pictures). The scripted test driver (not the racing line) crashes at Forrest
  Elbow and Hell Gate: each is a 22 to 30 m hairpin at the end of a 900 to
  1,100 m straight where the test driver only looks 220 m ahead. The racing line
  and the computer drivers lap it cleanly (about 1:33 reference, 100 s in the
  drive-through). A person has braking boards and a long run-in.
- **Harbour Lights Dusk.** Drive-through passes with 0 issues. Pictures show the
  lit waterfront under a dusk sky.
- **Harbour Lights Reverse.** Drive-through reports 2 wall probes at Casino
  Corner. The same probe applied to the released parent in the same corner fails
  the same way (it picks the nearest drawn wall on a side street opening); the
  native wall and the drawn wall agree at 8.0 m from the road centre. Left alone.
  Paddock stands are mirrored to the left (picture).
- **Tremblant Woods Reverse.** Drive-through reports 2 probe misses on a pit
  wall panel at the lap line (the car crosses the line during the test and the
  test stops). The probe at 4,380 m passes at 70 and 110 mph. No native pit
  bay is invented, as agreed on 14 October.

If Claude wants those probe artefacts silenced, the fix is a picked list of wall
cases for the reverses, like the one the released Woods already has in
`tools/course-ground-checks.mjs`. It is not done here because it would only
hide a measurement, not fix a course.

## Switch-on

- `src/circuit-variants.js`: `lightVariant` and `reverseVariant` take
  `state` (default `'dev'`); the five course files pass `state: 'on'`.
- `src/heli/pilot-map-data.js`: each variant is listed under its parent's place
  (like Summit Time Attack under Summit Run). The map outlines are traced from
  the first course of a place, so the generated outline file is unchanged.
- `tools/replays/courses/<id>.json`: one duel replay case each, with
  fingerprints at 30, 60 and 144 frames a second. Existing fingerprints were
  re-recorded in the same run and did not change.
- `docs/CIRCUITS.md` section 6: now says the variants are found from the air.

Checked and needing no change: the menu (a locked secret shows its hint and no
buy button, courses list and Grand Prix grouping), the shop (price 0, no
purchase possible), Grand Prix (all five are `grandPrix: true`), the Night Cup,
the course list order (appended after Attack), the helicopter pads and
destinations (variants share their parent's place and pad), the pilot's map
signs (all five signs are clear of the road, water and scenery).

## Changed signatures and counts, and what caused them

Caused by the five courses being on:

- The course list grows from 23 to 28 entries; the replay catalogue from 25 to
  30 cases; the pilot map's multi-course places from two to five.

Not caused by being on (found because the five scenes are now compared):

- The five world signatures in `tools/fixtures/world-signatures/`. They changed
  only by the FIX-GRASS-GROUND merge of 24 October (1508d596). The same merge moved
  the parents' signatures; Harbour Lights went from 223,085 to 223,081 instances
  and its dusk and reverse variants moved by the same 4 and 3. Hash and counts
  with the switches off equal the values with them on. The 23 existing signatures
  were not touched.

## Changed assertions (reviewed)

Each changed because the five courses are now released. None is loosened.

- `tools/test-circuit-variants.mjs`: state is `on`; the ordinary game now has
  the lighting variants and a switch override still hides them.
- `tools/test-map-secrets.mjs`: "free and still a dev course" becomes "free and
  released".
- `tools/test-map-view.mjs`: the secret list is all five, not none.
- `tools/test-pilot-map.mjs`: the multi-course places include the three with
  secret variants.
- `tools/test-course-access.mjs`: the zero-price list also names the five.
- `tools/test-course-eligibility.mjs`: the profile that owns every course also
  has found the five (they cannot be owned any other way); the Jesko transport
  profile keeps that record.
- `tools/test-grand-prix-career-menu.mjs`: the old-markup copy renders any
  course with an unlock rule as locked with its condition (it only knew the
  solo challenge). Locked secret cards are found by name; they carry their
  condition and no buy button.
- `tools/test-career-rebuild.mjs`: the restored careers own every released
  bought course; the five secrets are expected locked until found.
- `tools/test-summit-attack.mjs`: Attack is no longer the last entry; the check
  now requires every later entry to have a later release order, then trims the
  test catalogue to end at Attack as the clamp case needs.
- `tools/test-replays.mjs` and `tools/test-world-composition.mjs`: no change to
  the files; their data grew.

## Tests

See the run log line for this card. Lane tier, by-hand circuits and course
suites, build and browser scenarios are listed in the hand-off report.

## Removed

Nothing. The temporary picture scenario used for the look sheet
(`tools/scenarios/variants-pictures.mjs`) was deleted again after use.

## Claude's review (28 October 2026, night)

Approved (independent review and rule 18 written review). Five versions on, free and found from the air as designed 15 October (the registry forbids a price on an unlock-rule course); they show as LOCKED with the hint until found. Five world signatures refreshed only because the 24 October grass change never reached these off courses: proved by building with switches off (identical new values) and bisect to 1508d596; pictures checked. Changed assertions follow the five being on (counts 23 to 28, replay cases 25 to 30) and are reasoned in the note; none loosened. Drive-through findings match the released parents (shared Panorama fence kit). map-finish fails identically on the base commit (card QA-MAP-FINISH-TABLE). Frame checks run tonight before release.
