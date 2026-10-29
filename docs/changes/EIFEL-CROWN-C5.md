# EIFEL-CROWN-C5: landmarks, water and sound

Status: round 1 sheet ready for Claude's verdict; not merged. Kind: landmarks, water and sound.
Switch: `eifel-crown` (dev). With it off, the released Eifel is exactly as it was.
Round 1 sheet: `docs/board/looks/eifel-crown/c5-round-1.jpg`.

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

## Shared code touched (one small change each)

- `src/track-kits.js`: three ids appended (`eifel-castle`, `dam-wall`, `eifel-lodge`).
- `src/circuit-landmarks.js`: house style `half-timber`; every other style is unchanged.
- `src/heli/heli-fire.js`: `eifel-crown` appended to `BURNT_LOOKS`. `src/burnt-look.js`: Eifel uses
  Tremblant's burnt set. A player who owns the released Eifel and has fire on now also loads that course once
  to check it; it has no reservoir, so it is never picked.
- `src/sound-bank.js`, `src/audio.js`: the two new cues behind the `eifel-crown` switch (as for Kogane).

## Checks

Jobs 2, one browser run at a time, no frame timing, memory-only saves.

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
- `tools/test-repo-hygiene.mjs`: the sheet name `c5-round-1.jpg` is allowed.

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
