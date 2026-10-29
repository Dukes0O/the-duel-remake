# KOGANE-PASS-C5

Status: round 1 sheet ready for Claude's verdict; not merged. Kind: landmark, water and sound.
Flag: kogane-pass (dev). Round 1 sheet: docs/board/looks/kogane-pass/c5-round-1.jpg.

## Round 2 (Claude, 28 October 2026)

Status: round 2 sheet ready for Claude's verdict; not merged. Sheet:
`docs/board/looks/kogane-pass/c5-round-2.jpg` (the round 1 sheet is deleted).
Round 1 verdict and these changes are in `docs/board/looks/kogane-pass/c5-review.md`.

- Lake: now drawn by the existing reflective circuit water (`water: {glitter: false}`
  on the course, the same system Harbour Lights and Ardennes use), so it ripples and
  mirrors the dusk sky. The old flat lake sheet (`effects.lake`) is removed (replace
  means remove). Paler shallows colour. The torii has no true mirror image: the
  existing water reflects only the sky picture.
- Far shore: `scenery.shoreForest` is a new optional third tree band in
  `src/track-script-course.js` (own random stream, names `shore-forest-N`, `sides`
  option on the band; no other course sets it, so other courses are unchanged). It
  plants cedar on the slope across the lake, kept out of the water by authored
  stretches. About 830 cedar, 90 autumn maples (the C4 maple kit) in groves, and five
  existing wooded backdrop hills (`effects.backdrop`). Backdrop hills gain an optional
  `drawn: true` (stand on the ground as drawn); default unchanged.
- Guard: `tools/test-heli-mode.mjs` is back exactly as it was. The pilot map no
  longer reads the feature switch. `KOGANE_PLACE` is in a new `DEV_PLACES` list, outside
  `PLACES`; it joins destinations only through a new `koganePass` option beside
  `summitRun` (`destinationsFor`, `legFuelKg`, `courseSite`, the session's `koganePassEnabled`
  from the `kogane-pass` switch, `courseBurnCheck`) and is drawn on the chart only
  while it is a destination. The released place table, logbook places and every
  existing table, leg and answer are untouched.
- The Kogane course test now runs the helicopter checks in the main process with the
  option, instead of a switch-on child process, and adds far shore checks.

## Resumed run (round 1, Claude, 28 October 2026)

Kept from Codex's blocked work: all of the sections below (lake basin, hill
pads, torii and lantern recipes, fire hooks, pilot place, sound recipe,
selector and bell logic, tests). Changed on resume:

- Merged integration/wasteland (C3 and other work); one board conflict fixed.
- Built the four kits with Blender, re-fetched the three Freesound sources
  (same hashes as catalogued) and rendered the three sound files.
- The lake torii is drawn 1.45 times the base size (about 16 m wide, 11 m tall)
  and stands at lateral -40 (was -43), so it reads from the start straight.
- The bell source was far too quiet (peak -30 dB, so inaudible at cue volume
  .16). The recipe now brings its peak to .7 first; the cue volume is unchanged.
- 	ools/test-circuit-kogane.mjs: the helicopter site, landing circle, lake
  inside the flying area and fire checks need the dev switch on, so they moved
  into the existing switch-on child process. The switch-off facts (hidden map
  place, hidden fire destination, never loading an unowned course) stay in the
  main process. Nothing was loosened; the same assertions all still run.
- Views scenario: the overhead is higher and wider and has an exposure-only
  companion (same as the C4 views) so the lake reads on the sheet.
- Comparison sheet made, 358 KB.

## Changes

The crater lake uses the existing basin system for its shore, visible water and
helicopter scoop surface. Its torii stands on the shallow near bank to the right
of Lakeside Start. Original Blender recipes build the large torii, small shrine
gate, stone lanterns and parking apron, each with a LOD partner. The summit uses
C4's tea house, vending row and lantern string. The parking terrace and dry
helicopter clearing use existing hill pads. Collision walls and the road are
unchanged.

Kogane references Tremblant's existing burnt assets in burnt-look.js. Its forest
joins the existing fire eligibility list. The fire destination check uses the
pilot map, and heli-session.js checks the actual destination options before
loading an owned course for fire calls. That one-line session hook is needed
to keep Kogane out when the pilot map is off. Fire messages use the pilot place
name. No save field or pay number changes.

The pilot place is at (22, 2), east of the harbour, altitude 1,300 m. Its
forest, volcano and lake regions follow its dev switch. Only the parent course
is listed now. C7 adds the variants when their files exist. The pilot outline
builder retains a hidden Kogane outline for preview; existing outlines stay
exact. The map position is a C5 implementation choice for Claude to review.

The sound source recipe mixes verified CC0 Japanese park cicadas, brook and
forest into an evening loop, then night crickets, brook and forest into a
night loop. Static gain matches the forest reference at authored gain .14.
A one-second circular overlap joins each loop. The existing CC0 bell is
slowed and filtered for the shrine strike. The recipes have now run.
The course selects its bed through its existing audio environment. The light
path fades cicadas into night crickets from dusk to night. Bell identity uses
the course instance, since the game reuses its race-state object between races.

## Checks and review

Early geometry probe (Codex): dry 12 m landing circle at s 0, lateral 30;
1,085 forest cells; 210 eligible fire starts; lake inside the flying area;
torii feet about 0.55 m under water. The Kogane course test now confirms the
same facts.

Codex's independent review found two faults (kit tail ids, apron over its
terrace), both fixed and confirmed; it also confirmed map switch isolation,
the actual-destination filter, the bell reused-state fix and the circular seam
math. All 20 prior pilot outlines and file metadata match HEAD exactly.

Run on resume (jobs 2 for tests, 1 for the browser, no frame timing):
- `node tools/test-circuit-kogane.mjs`: passed (both handling modes finish, no
  crashes or resets).
- `node tools/test-circuits.mjs`: passed. `node tools/test-drive-through.mjs`:
  7 of 7 passed. `node tools/test-audio.mjs`: 601 checks passed.
- Browser scenario `kogane-c5-views`: passed, four native High views and the
  overhead exposure companion, memory-only.
- Lane tier (`--changed --jobs 2 --keep-going`, 148 suites): 145 passed, 3 failed
  on the first full run for the reasons under Changed assertions; one more
  failure (the fire-view mock) was fixed before it. All four suites pass on
  the final files (run singly). `npm run build`: built. Browser scenario
  `kogane-views` (C4 round 2): passed, 8 screenshots, no warnings.
- Sound loudness: evening and night beds both measure -27.0 LUFS integrated
  (the forest reference level at gain .14); bell peak -3.1 dBTP at source.
  Listening verdict (cicada species, the packet's faint frog layer) still needs
  Claude; no frog recording was sourced.
## Audio sourcing

The existing local library has the forest reference and a single CC0 bell,
but lacks the needed cicada and night-cricket recordings. The source candidates
are CC0 Freesound recordings 670520 (Japanese park cicadas), 734642 (mountain
night crickets with river) and 584269 (small brook). All three downloaded and
their source hashes and licence metadata are in the catalog. The cicada source does not prove
the exact higurashi species, so Claude's sound judgement is still needed.

Automatic approval review rejected the source download on 28 October because
it interpreted the project's network and API-key rule as covering asset
preparation. The requested command uses the existing Freesound tool and
configured key, downloads only into this lane's scratch folder, and adds no
runtime requests, account or key. Approval was requested in chat. Further
inspection found SPEC 0.9 explicitly authorizes Freesound API source downloads,
one at a time with the existing environment key. Automatic review allowed
the same command on reconsideration with that evidence, and all three sources
downloaded. No alternate route was used. No approval remains needed for this
download. Keys were never printed or written.

## Changed assertions

The track-kit count grows from 46 to 50 by appending torii, torii-small,
stone-lantern and kogane-car-park. Its exact tail check adds the same four ids;
all previous ids and order stay pinned. The course placement whitelist adds
only these ids. The measured-model check adds their triangle and byte caps.
The fire-art list adds Kogane while retaining Tremblant. The pilot outline
check adds only the hidden Kogane preview outline. No tolerance changes.
The placement check allows the exact C5 sheet filename requested in the brief;
the existing 500 KB sheet limit remains unchanged.

New checks cover water outside the road, shallow grounded torii, a dry level
landing circle, lake inside the flying area, connected fire starts, hidden
map/fire state with the switch off, and actual fire eligibility with it on.
Claude's written assertion review is pending.
The fire-view suite adds actual shared-asset loading and crown restoration.
The audio suite adds evening/night selection, a constant gain blend, paused
silence, a single bell across revisits, a new race using the same state,
and delivered loudness within 1 dB of the forest reference. No previous audio
assertion changes.

## Changed assertions found by the lane tier (resume run)

- `tools/test-arsenal-wave1-audio.mjs`: the pinned hash of the non-bank sound
  exports now leaves out the two new Kogane beds in `AMBIENCE` (derived from
  the bank), the same way it already leaves out newer car voices. Every
  earlier bed is still pinned. Nothing loosened.
- `tools/test-p4-audio.mjs`: the pre-P4 bank hash and the pre-P4 catalog hash
  leave out the three new cue ids (`ambience.kogane`,
  `ambience.kogane-night`, `landmark.shrine-bell`) and their catalog rows,
  as for the Skyline cues. Every earlier row is still pinned.
- `tools/test-heli-mode.mjs`: not changed (round 1 loosened its import guard; round 2 reverted that).
- `tools/test-fire-view.mjs`: the new Kogane mock took the texture loader's
  arguments in the wrong order; fixed (the new test, not an old assertion).

## Removed

No original or superseded runtime asset was removed. New models reuse C4's
existing recipe helpers by approach, without replacing its models. No blend
file, duplicate burnt set or backup asset is retained. Freesound sources stay
in the outside sound library (re-fetchable), not the repository. The review
evidence (`.evidence/2026-10-28/kogane-c5*`) is deleted once Claude's verdict
is in.