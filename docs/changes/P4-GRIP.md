# P4-GRIP: surfaces and tyres

Claude built this card (Sonnet agent, 10 October 2026) to docs/CIRCUITS.md
section 3.4. No existing course changes: asphalt on summer tyres is exactly 1,
every ordinary course reports no grip fields at all, and replay fingerprints are
unchanged.

## What it does

- **Surfaces and tyres** (`src/race-surfaces.js`, plain data and small functions).
  Surface grip: asphalt 1.00, graded gravel 0.85 (rally car and Titan 1.00),
  packed snow 0.70, ice 0.50, deep snow 0.55 with a 45 mph limit. Tyres:
  summer asphalt 1.00, snow 0.75, ice 0.55; winter asphalt 0.94, snow 1.00,
  ice 0.85, with winter giving 3% of top speed away on asphalt. Effective grip is
  surface times tyre and is never under 0.40.
- **Where a tyre column comes from.** The table has three columns, so gravel uses
  the asphalt column (hard ground) and deep snow uses the packed snow column. The
  tyre's 97% top speed applies on asphalt and gravel only.
- **Driving** (`src/sim-driving.js`). Steering authority scales with effective grip
  through traction, braking (forward and reverse) scales with it, and deep snow
  stops throttle above 45 mph and eases a faster car down. A new `_roadGrip` reads
  the course and the tyre. Computer racers feel the surface through the same
  traction (they run on summer tyres until P4-FIELD gives them their own).
- **Where surfaces are.** `Course.gripKindAt(s, lateral)` answers from the script's
  `surface` option (a stretch) and from `surfacePatches` on the definition
  (`{id, kind, s0, s1, from, to, shaded}`, a patch lying over the stretches, with
  an optional sideways band). The verge is asphalt-kind: the old off-road rules
  govern it. Scripts now refuse an unknown surface name.
- **Ice is always fair** (checked when the course is built): at most 60 m long,
  never on the apex of a corner tighter than 25 m radius, marked `shaded: true`
  by its author (forest or under a ridge), and an ICE board is placed 100 m before
  it automatically (`features.boards`, kind `ice`).
- **Tyre choice.** `Duel.startCampaign({tyre})` (summer unless winter is asked),
  `state.tyre` exists only for winter. The race setup shows SUMMER / WINTER only
  for a course with snow or ice; the choice is kept in the saved race settings
  only when winter (old saves keep their shape). `App.startCampaign` drops a
  winter request on a course that has no snow or ice.
- **HUD.** A small tyre badge (sun or snowflake with the tyre name) on a snow or
  ice circuit, and the surface name (SNOW, ICE, GRAVEL, DEEP SNOW) whenever
  effective grip is under 0.8. It reads state and never changes it.
- **Drawing.** `src/track-script-scene.js`, called from `world.js` for scripted
  courses: gravel, packed snow (with wheel tracks), ice (glossy), and deep snow
  (heaped) as overlays on the road, plus the braking boards and ICE boards as small
  signs. Textures are flat colours; the finished snow look belongs to P4-SNOW.
- **Sound cues named** (audio is P4-AUDIO): a `surfaceChanged` event carries
  `surface.gravel`, `surface.snow` or `surface.ice` (deep snow uses `surface.snow`),
  and `null` back on asphalt.

## Not done here

- Pit stop tyre changes (P4-PIT) and per-racer tyres for computer cars (P4-FIELD).
- Computer racers' own braking does not scale with grip yet; they slow through the
  traction their steering already feels.
- Snow banks along the verge as a driving surface (P4-SNOW draws them).

## Checks

- `tools/test-race-surfaces.mjs` (11 checks): every surface and tyre pairing and
  the 40% floor; the gravel exception; neutral answer for asphalt on summer
  tyres; surface by stretch, patch, band and lap wrap; the ice rules; steering and
  braking scaled by grip on gravel, snow, deep snow, ice and winter on asphalt
  (within 3 to 8 percent of the table); deep snow's 45 mph and winter's 97% top
  speed; surface events with their cue; ordinary courses and the saved settings
  unchanged; the HUD readout; the overlays and boards.
- Existing courses: the lane tier (replay fingerprints, course samples,
  shortcut presets) passes unchanged.

## Tests updated (not weakened)

The tests that pin exact lists now list the new items: `tools/test-feature-flags.mjs`
and `tools/test-wasteland-beta.mjs` (the switch catalog gains the three dev circuit
switches; count 17 to 20), `tools/test-course-eligibility.mjs` (its stand-in menu
needs the new `tyre-choice` element). The shortcut preset file is regenerated: only
its source fingerprint line changes (the circuit and speed profile code sits in the
fingerprinted part of `course.js`); every saved shortcut path is identical.

## Removed

Nothing replaced.
