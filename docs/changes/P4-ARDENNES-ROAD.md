# P4-ARDENNES-ROAD

Road layout of Ardennes Forest (docs/CIRCUITS.md section 5.5), built from
Claude's design that Kyle approved on 13 October 2026. Dev only, behind the
`ardennes-forest` switch. Art, light, landmarks, the safety kit, the Team Room
notes and the full field are later cards.

## What was built

- `src/circuits/ardennes-forest.js`: the 35-piece script copied exactly from
  the section 5.5 table (it closes with a 0.7 m gap, 6.68 km, steepest grade
  23.2% on The Wall, tightest radius 16 m at La Fontaine, closest separate
  stretches 103 m apart). Id, flag and name `ardennes-forest` / `Ardennes
  Forest`, closed, 2 laps, layout version 1, no traffic, no combat, rival yes,
  no radar, circuit markings, script start 60 m, generation stage 21 (the next
  free one after Summit Run's 20).
- Four sections with these shares (taken from where the pieces fall): Pit and
  Plunge .154, Kestrel and Combes .18, Forest Descent .37, Forest Run .296.
  Theme is `alpine`, the one Tremblant Woods uses.
- Widths: 15 m default (Pit Straight), 16 m on Kestrel Straight, 13 m through
  the Bus Stop pieces. A width stays in force until a piece sets another, so
  the copied script on its own would leave every piece after Kestrel Straight
  at 16 m. Three width options were added to the copied script to match the
  section 5.5 text: Les Combes `width: 15`, Bus Stop `width: 13` (it carries
  through Bus Stop 2, the 40 m straight and Bus Stop Exit) and the last
  straight `width: 15`. They move nothing: the centreline, heights and length
  are identical, sample for sample, to Claude's runnable script. No wall
  spans: the road keeps the default 12 m of open run-off each side, as Tremblant
  Woods does. The armco and catch-fence kit is left to the scenery card, as
  Panorama's first road did.
- Pit lane on the right of Pit Straight (`pitLane: {straight: 'Pit Straight', side: 'right'}`).
- Manifest in the same file: `ardennes-forest`, state `dev`, price 2,000,
  Grand Prix yes, release order 5 (after Summit Run's 4), driver Stuttgart 959S
  / Club / racing line .95 (the Panorama and Tremblant rival).
- `tools/test-circuit-ardennes.mjs`: the road closes; length 6.6 to 6.8 km;
  steepest grade at most 25% and on The Wall; the 23 named pieces are present
  in lap order; widths and no walls; separate stretches of road at least 90 m
  apart centre to centre (stretches more than 400 m apart along the road); the
  pit lane; the switch is dev, the manifest, the price, the end-of-list place,
  and COURSE is unchanged with the switch off.

## How it is registered

The newest circuits register themselves from their own file: the manifest in
the course file is the only place the switch, the price, the release order and
the Preview flag come from (`src/circuit-manifests.js` finds every file in
`src/circuits/`). `FEATURE_STATES`, `COURSE_PRICES` and `start-preview.bat` all
read the manifests, so no line was added to `src/feature-flags.js`,
`src/course-access.js`, `start-preview.bat` or `src/circuits/index.js`. This
differs from the first Summit Run commit, which edited those by hand before the
manifests existed.

- `src/generated/reference-laps/ardennes-forest.json`: the reference lap
  `test-reference-laps.mjs` requires for every closed circuit (139.3 s for the Stuttgart
  959S on Medium, 335 samples). Built with `buildReferenceSet` for this event only,
  published with `publishReferenceSet`; no other reference file changed.

## Changed assertions

None. No existing test was edited. The tests that count circuits, switches and
manifests (`test-circuit-layouts`, `test-feature-flags`, `test-preview-launcher`,
`test-release-tremblant`, `test-course-kit`, `test-circuit-panorama-registry`)
already work from the manifests and the released list, so a dev circuit passes
them unchanged. `test-circuit-layouts` now also drives Ardennes Forest like every
closed circuit: the Medium test driver's flying lap is 2:29.2 forwards and
2:29.2 reversed, 0.8 s under that test's 150 s cap. If the road changes
slightly, that cap is the first thing to move.

## Removed

Nothing. No older code, test or file is replaced.

## Gates

- Lane tier (`node tools/run-tests.mjs --tier lane --changed --jobs 4
  --keep-going`, PowerShell): 33 suites, 32 pass, 1 fail. The one failure,
  `test-repo-hygiene`, is not caused by this circuit: it rejects
  `docs/board/looks/ardennes/layout.jpg` (committed on integration in e3c5264b)
  because a look sheet must be named `round-N.jpg`. Left for Claude to rename or
  allow. The first lane run also failed `test-reference-laps` until the Ardennes
  reference lap above was added.
- `npm run build`: passes.
- Map: `node tools/track-script.mjs src/circuits/ardennes-forest.js --out
  .qa-dist/ardennes.png` (6.68 km, loop gap 0.7 m, steepest 23.2% at 922 m).
