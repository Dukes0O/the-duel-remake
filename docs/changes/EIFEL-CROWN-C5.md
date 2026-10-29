# EIFEL-CROWN-C5: landmarks, water and sound

Status: round 2 sheet ready for Claude's verdict; not merged. Kind: landmarks, water and sound.
Switch: `eifel-crown` (dev). With it off, the released Eifel is exactly as it was.
Round 2 sheet: `docs/board/looks/eifel-crown/c5-round-2.jpg` (the round 1 sheet is deleted).

## Round 1 verdict (Claude, 29 October 2026): NOT YET

Lodge: pass. Sound: pass. Castle: a speck from the ridge on a smooth dome. Village: one straight row like a fence,
brown roofs, church spire too low. Reservoir: a small striped puddle on a lawn. Round 2 below answers each point.
The night-fixes lane is merged first (Eifel's 30 m inside-corner rule restored, `insideOpen` option gone).

## Round 2 changes

- **Merged** `integration/wasteland`; conflicts were only kit lists and the sheet-name allowance (both kept).
- **Castle**: the kit is rebuilt and drawn twice as large (was 1.6). The crag now has sheer cliff faces on three
  sides, ledges, 30 broken outcrop blocks and boulders at the foot, and a ruined curtain wall stepping down the rock
  face. The foothill under it is 26 m (was 32) with a level top 52 m across. A collar of dark spruce (64 trees, part
  of the kit) stands round the foot of the crag and a few on its ledges. The row is `hill: 0` with a `sink`, so the game
  lifts it onto the hill as it does Tremblant's lodge. The keep now stands above the hedge line from the ridge.
  Castle recipe: 3,476 / 1,012 triangles. Trees on the foothill's own slopes as separate kit pieces were tried and
  dropped: the natural hillside behind the foothill rises into it, and the ground check (floating or sunken pieces)
  fails on a slope that steep.
- **Village**: a new layout of 17 houses at setbacks from 23 to 73 m, turned every which way (some gable-end to the road,
  some side-on), on a curving main street and a lane that climbs the slope. Garden walls and hedges are set round
  the houses and green-leaved trees stand between them. The room cleared for it is now 92 m deep (was 64). Roofs
  are slate grey (cooler colours; the strong warm sun still warms them a little). The church is 36 m tall
  (was 22), so the spire stands clear above the roofs.
- **Reservoir**: 150 m long and 54 m each way (was 115 by 30), filling the valley floor, with a steeper bank
  (`bank` .2) and rocky banks: a new kit `shore-rock` (angular grey slabs, 110 / 40 triangles, 64 placed round
  the waterline) and green-leaved trees on the far and end banks, none on the road side. The forest room is cut to the
  water itself, so the slopes beyond are wooded again. The dam module is taller (12 m crest, was 9) with three
  dark arches, three gate piers and a gate bridge above the crest, four modules end to end.
- **Water stripes**: the bands were the swell of the existing water look seen at a low angle. `src/circuit-water.js`
  has one new option, `water.ripple` (default 1, so every other course is unchanged); Eifel sets .2.
  The stripes are mostly gone; a faint swell remains.
- **Round 2 checks** (jobs 2, one browser run at a time, no frame timing; the lane tier once at the end, on the
  final files): lane tier `--changed` 135 of 135; `npm run build` built; `tools/test-circuit-layouts.mjs` 18 of 18
  (fully green after the night-fixes merge); `tools/test-circuit-eifel.mjs` 18 of 18; `tools/test-circuits.mjs`
  (216,698 checks), `tools/test-drive-through.mjs` (7 of 7), `drive-through.mjs --course eifel-crown` (pass, 0 issues),
  `tools/test-world-composition.mjs`, `tools/test-ground-rows-exact.mjs`, `tools/test-audio.mjs` (601) and
  `tools/test-repo-hygiene.mjs` pass. Other courses' world signatures and replay fingerprints unchanged.
- **Not measured**: frame time (art round). The reservoir banks and village add about 100 `autumn-tree`
  pieces (3,800 triangles each at long range) and the castle collar adds 64 cones; the full check's frame step decides.


## What was built (all inside the rooms C4 kept open)

1. **Ruined castle on a crag** outside Wall Left, 110 m out on the right (s 3050), in view from the
   descent off the ridge. A `hills` crag under it (32 m, level top, a pad) and the new kit `eifel-castle`
   standing on it at 1.6 times its size: a broken square keep, a round corner tower, curtain wall stubs, a gate
   with one pier, fallen stone and spruce on the ledges, on a stepped dark rock crag. The rock foot is bedded
   2.4 m into the level hill top. Blender recipe `tools/blender/eifel/landmarks.py` (2,102 / 760 triangles, caps
   7,000 / 2,000).
2. **Half-timbered village** right of Village Street and the end of Wall Left (12 to 64 m out): 26 houses in two
   rows on a main street plus a short lane, two street ribbons, a stone church with a spire at the street's end
   and drystone garden walls along both frontages. The houses use the existing code-built town in
   `src/circuit-landmarks.js` with a new house style `half-timber` (white plaster, dark oak frame, braces,
   steep slate roof, gable beams, stone chimney); the oak frame is drawn in the wall's own metres by a small
   shader, so no new house model was needed. The church is the existing stone church.
3. **Reservoir with a concrete dam** inside Reservoir Right (about 80 to 140 m out): a basin of the existing
   reflective circuit water (`water: {glitter: false}`, as Ardennes and Kogane). It is a real water body for the
   helicopter's fire bucket (`groundFromCourse(...).water`). The new kit `dam-wall` (a 14 m module of concrete
   gravity dam with parapet, rail, pilasters, damp streaks and algae at the water line; 268 / 66 triangles) is
   placed four times end to end across the far shore, facing the water. The forest has a window through it
   so the water shows from the road.
4. **Timber lodge at the start**: a new kit `eifel-lodge` (a log lodge on a stone plinth under a dark shingle
   roof, a veranda and a stone chimney; the existing `ski-lodge` has a white snow roof, which looked wrong
   in the Eifel). Left of the start straight, beyond the stands, facing the road, clear of the helicopter's
   landing circle.
5. **Burnable forest**: Eifel Crown joins `BURNT_LOOKS` and points its burnt look at the existing
   `public/assets/burnt/tremblant-woods/burnt-props.glb` (one line in `src/burnt-look.js`, as Kogane does). The
   course meets all four fire rules with the switch on: 1,407 forest cells, a pilot-map place, the reservoir
   water and a burnt look; 30 fire start cells; a dry, level 12 m landing circle (s 40, 30 m left).
   The released road has no reservoir, so it can never burn.
6. **Sound**: a new bed `ambience.eifel` (damp forest from the existing forest source, mixed with a verified CC0
   European birdsong recording, Freesound 853112) at the forest bed's own gain .15 and level, and one church
   bell `landmark.village-bell` (verified CC0 recording of a church bell heard 300 m off, Freesound 846302,
   the strikes and the damp air around them). The bell plays once per race when the car is within 150 m of the village.
   Recipe `tools/audio/build-eifel.mjs` (sources are re-fetchable with `tools/audio/freesound.mjs`); the
   sound bank and catalog rows are new, every earlier row is unchanged. Holds the sound-bank lock.

## Round 1 text (kept for the facts it records)

## Shared code touched (one small change each)

- `src/track-kits.js`: three ids appended (`eifel-castle`, `dam-wall`, `eifel-lodge`).
- `src/circuit-landmarks.js`: house style `half-timber`; every other style is unchanged.
- `src/heli/heli-fire.js`: `eifel-crown` appended to `BURNT_LOOKS`. `src/burnt-look.js`: Eifel uses
  Tremblant's burnt set. A player who owns the released Eifel and has fire on now also loads that course once
  to check it; it has no reservoir, so it is never picked.
- `src/sound-bank.js`, `src/audio.js`: the two new cues behind the `eifel-crown` switch (as for Kogane).
- Round 2: `src/track-kits.js` appends `shore-rock`; `src/circuit-water.js` gains the optional `ripple` (default unchanged).

## Checks

Round 1 checks (superseded by Round 2 checks above). Jobs 2, one browser run at a time, no frame timing, memory-only saves.

- Lane tier `--changed --jobs 2 --keep-going`: 135 of 135 passed (also 134 of 134 before the last colour
  changes); `npm run build`: built.
- `tools/test-circuit-eifel.mjs`: 18 pass (7 new tests: kit budgets, castle on its level hill, reservoir and
  dam, village, lodge, burnable forest with landing circle and start cells, sound bed and bell level).
- `tools/test-circuits.mjs` (dev circuits on too): 216,698 checks passed. `tools/test-drive-through.mjs`: 7 of 7;
  `node tools/drive-through.mjs --course eifel-crown`: pass, zero issues, 16 barrier probes pass.
  `tools/test-world-composition.mjs` (57), `tools/test-ground-rows-exact.mjs` and `tools/test-audio.mjs`
  (601 checks): passed. Other courses' world signatures and replay fingerprints are unchanged.
- Browser: `eifel-c5-views` scenario, four views plus two extra castle views, no warnings.
- `tools/test-circuit-layouts.mjs`: 16 pass, 2 fail, both already failing without any C5 work: the inside-corner
  scenery rule (known, being fixed on `claude/night-fixes`) and the Medium test-driver lap on the new Eifel road
  (the same 5 crashes with every C5 feature switched off).

## Changed assertions (Claude to review)

- `tools/test-circuit-eifel.mjs`: the allowed kit list adds the three C5 kits; the "kept open rooms" check now
  lists the narrowed castle room (to 235 m out, was 260), the narrowed reservoir room (to 150 m out, was 260,
  and the lake only needs the shore) and the new forest window beside the road. The same rule is tested with
  the new rectangles; nothing else loosened.
- `tools/test-track-kits.mjs`: kit count 52 to 55, the three ids appended; the first 52 and their order stay pinned.
- `tools/test-heli-fire.mjs`: the burnt-look list gains `eifel-crown` at the end.
- `tools/test-p4-audio.mjs`, `tools/test-arsenal-wave1-audio.mjs`: the pinned bank, catalog and ambience hashes leave
  out only the two new cues and the new `eifel` bed, as they already do for Kogane. Every earlier row stays pinned.
- `tools/test-repo-hygiene.mjs`: the sheet name `c5-round-2.jpg` is allowed (round 1's name is gone).
- Round 2: `tools/test-track-kits.mjs` is now 58 kits with `shore-rock` appended after the three C5 ids and integration's two retaining-wall ids; `tools/test-circuit-eifel.mjs` allows `shore-rock` and `autumn-tree`, widens the village strip to 90 m, narrows the reservoir room to the water, and adds checks for varied house setbacks and turns, gardens, a tall church, a long calm reservoir and trees on the castle slopes.

## Left open

- The stream under Forest Dip (in the packet's C5 text, not in this brief) is not built.
- The helicopter's ground sampler reads the drawn road ground, not the crag hill, so a helicopter flying
  low over the castle hill would clip it (as it does over Tremblant's ski hill).
- The dam is one module repeated four times, not a spillway with arches like the reference picture.
- The castle is seen through the roadside hedges and trees only as a keep above them from the ridge;
  the crag shows from the road below Wall Left.
- No credit line was added for the two new Freesound sources (CC0, like the Kogane ones).

## Removed

Nothing replaced yet: the old Eifel scenery stays with the released entry until C7. Scratch captures, test
copies, `.qa-dist`, `dist` and `.evidence` made here are deleted at the end. No blend files, no backup copies.

## Claude's review (28 October 2026, night)

Accepted on round 2 pictures (Claude, look judge): castle keep and cliffs above the treeline from the ridge; clustered village with gardens and spire; lodge. Polish for C6: reservoir reads small, roofs lean blue, foothill dome. Code (independent review): new kits castle, lodge, dam, shore-rock; half-timber house style; optional water.ripple with default 1 so other courses are unchanged; fire-ready with the reservoir. Changed assertions (rule 18): kit ids to 58 for new kits; Eifel test rooms follow the new landmarks with added checks; audio pins leave out only the new Eifel bed and bell; burnt-look list adds eifel-crown; hygiene sheet name. Nothing loosened; other courses' signatures exact.
