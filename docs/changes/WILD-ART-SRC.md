# WILD-ART-SRC

## 3 November 2026: round 3 (final), and every passed animal in the game

Claude's round 2 verdict is at the top of the round 2 note. Round 3 changed
only the kangaroo and the kookaburra; see
[the round 3 note](../board/looks/wildlife/west-australia-round-3.md) and
`west-australia-round-3.jpg`. The round 2 sheet is recycled. `bird.py` gains
a `merged` head (head, nape and face balls instead of a bent loft) used by
the kookaburra only; the passed raven and cockatoo files are byte exact.

**Panorama Ridge and Summit Run now join the count.** `src/wildlife-models.js`
has rows for mule deer, elk, bighorn sheep, cougar, coyote, yellow-bellied
marmot, eastern grey kangaroo, echidna, raven, sulphur-crested cockatoo and
kookaburra (I judged the round 3 kookaburra's cap head fixed; Claude makes
the final call). Birds move and fly in their `Fly` clip. Run speeds and clip
rates follow each Walk clip's stride at its size; the marmot and echidna
slide a little when running, as the beaver does. Wolf tracks stay out of the
table (no decal drawing yet). With every count target approved, the count
is exactly the job with no list: Panorama Ridge (kangaroos) always, Summit
Run (bighorn sheep, cougar) once it is open. Every course of the Western
mountains and Australia lists now draws its animals.

### Checks

From PowerShell, on the lane with current `integration/wasteland` merged in
(WILD-VIEW included), heavy jobs started on a free turn:

- `node tools/test-wildlife-view.mjs`: 3,747 checks passed.
- `node tools/test-wildlife.mjs`: 33,644 checks, 2,352 animals on 12
  courses, 31 species seen.
- `node tools/test-heli-survey.mjs`: 9,990 checks passed.
- `node tools/test-blender-output.mjs`: 167 checks, 0 failed.
- Lane tier, `--changed --jobs 4 --keep-going`: 57 passed, 0 failed, 0 not
  run (762 s). The round 2 `test-board` failure is gone with integration's
  board fix.
- `npm run build`: built in 1.38 s, existing large-chunk warning only;
  output deleted.
- Kangaroo and kookaburra rebuilt and reviewed from their recipes in
  Blender 4.5.13, reviews at `--round 3`. No browser or frame check: the
  view already draws the North woods animals the same way (WILD-VIEW).

### Changed assertions (for Claude's review, rule 18)

`tools/test-wildlife-view.mjs`, only where it pinned the table:

- "Panorama Ridge has no approved species" and "Summit Run has none either"
  now use a fixed North woods list (the five that were the table), so they
  still prove a course without models has no animals. New exact checks pin
  today's table: Panorama Ridge's three species and echidna rare, Summit
  Run's four species and cougar rare, the three birds flying in `Fly`.
- The count block's "today: Tremblant Woods and Tremblant Snow" and the
  joining checks that followed now run on the same fixed North woods list,
  unchanged in meaning. New exact checks: today's course lists (three, four
  with Summit Run) and, over 300 days, today's table gives exactly the job
  with no list. Nothing is loosened; every old expectation is still asserted.

### Removed

The round 2 sheet. The kookaburra's bent head-and-neck loft (replaced by the
merged head in the same recipe).

## 3 November 2026: Western mountains and Australia, round 2

Claude's round 1 verdict is in the round 1 note; the changes and numbers in
[the round 2 note](../board/looks/wildlife/west-australia-round-2.md), sheet
`west-australia-round-2.jpg`. Changed: bighorn legs, kangaroo, cougar, elk,
marmot (rebuilt), kookaburra, raven and cockatoo Fly wings. Echidna, wolf
tracks, coyote and mule deer passed and are byte exact.

- `bird.py`: new spread wing (curved leading edge, thick wrist, scalloped
  secondaries) plus separate fanned primaries from `P['primaries']`; the hand
  bends through the downstroke. `'fingers'` is gone. Head taper rounder;
  optional `neck_r`.
- `original.py`: `mottle()` for soft coat variation.
- `common.finish_coat` takes a map size (default 1024, so older recipes are
  unchanged); `adapt.SMALL_MAP` gives the marmot and the three birds 512 maps.
- The kangaroo joins `adapt.ROUGH_FUR`.

### Checks

From PowerShell, on the lane with `integration/wasteland` (4d3f657b) merged
in, started on a free heavy-job turn.

- `node tools/test-blender-output.mjs`: 167 checks, 0 failed.
- Lane tier, `--changed --jobs 4 --keep-going`: 50 passed, 1 failed, 0 not
  run (525 s). The failure is `tools/test-board.mjs`, "finished cards leave
  the open board": `docs/board/board.yaml` from integration keeps a finished
  card in the open list. It fails the same way on the integration folder's
  own head (f0f2bb30); this lane changes no board file. Left for the board
  owner; not a wildlife fault.
- `npm run build -- --outDir .qa-dist/wildlife-build`: built in 1.25 s,
  existing large-chunk warning only; output deleted.
- Every changed animal rebuilt and reviewed from its recipe in Blender
  4.5.13 (`-b --factory-startup -t 4`), reviews at `--round 2`.

### Changed assertions

None. The hygiene pattern added in round 1 already covers the round 2 sheet.

### Removed

The round 1 sheets `west-australia-round-1a.jpg` and `-1b.jpg` (verdict
given; their note keeps the verdict). The raven's old notched single-blade
wing and its `fingers` parameter. The marmot's first build (its body,
paddle tail and head) is replaced in the same recipe file.

## 3 November 2026: Western mountains and Australia, round 1

Claude took over the card. Lane `claude/wild-art-west`, from
`integration/wasteland`. Eleven animals and the wolf tracks, each built by
its own recipe. Design, numbers and doubts are in
[the round 1 note](../board/looks/wildlife/west-australia-round-1.md); sheets
`west-australia-round-1a.jpg` and `-1b.jpg` in the same folder.

- Donor species (`donor_shape.py`, the moose method generalised): mule deer,
  elk and bighorn sheep from the CC0 Quaternius deer; cougar and coyote from
  the CC0 Quaternius wolf. Donor bones, inverse binds and every clip kept.
- Original recipes (`original.py`, `bird.py`): kangaroo with its own rig and
  an in-place bounding Walk; marmot and echidna on the shared quadruped rig
  and gait; raven, cockatoo and kookaburra with a bird rig, a perched Idle
  and a looping Fly.
- `tools/art/wolf-tracks.py`: seeded 512 x 512 RGBA tiling decal.
- Shared code: `common.cli` takes a recipe function and a motion clip name;
  `common.animate` takes an optional stride and lift; review renders new
  species in their Idle pose and adds close Idle and motion frames;
  `adapt.export` reads its coarse-fur list from `ROUGH_FUR`. The North woods
  five take exactly their old paths, and their GLBs are byte exact.
- Sources: `sources.json` rows for all twelve; the catalog's deer and wolf
  credit rows name their new adaptations. Originals need no third-party credit.

### Checks

All from PowerShell, on the lane with current `integration/wasteland`
(8d356ab0) merged in, each started on a free heavy-job turn (FACTORY 8).

- `node tools/test-blender-output.mjs`: 167 checks, 0 failed.
- `node tools/run-tests.mjs --tier lane --changed --jobs 4 --keep-going`:
  51 passed, 0 failed, 0 not run, 515 s (includes repo hygiene, world
  composition, track kits and the replay guards).
- `npm run build -- --outDir .qa-dist/wildlife-build`: built in 1.15 s;
  only the existing large-chunk warning. Output deleted afterwards.
- Blender 4.5.13, `-b --factory-startup -t 4`, CPU: every species built and
  reviewed from its recipe in one batch; the elk and kangaroo rebuilt once
  more after their last fix. No browser, frame or save check: nothing is
  placed in the game yet (WILD-VIEW).

### Changed assertions

- Blender-output: new cases only, for the eleven animals (paths, review
  views, budget 5,000 or 2,000 for birds, 1K map, skin, Idle and Walk or Fly
  on skin joints, donor clips kept) and the wolf-tracks plan and PNG. No old
  assertion changed.
- Hygiene: allow `docs/board/looks/wildlife/west-australia-round-[1-3][ab]?.jpg`
  next to the existing North woods sheet names. Needs Claude's review under
  rule 18; nothing else is loosened.

### Removed

Nothing replaced: all twelve are new. Scratch renders stay in the ignored
`.qa-dist/wildlife-round-1/` and go after Claude's verdict.

# WILD-ART-SRC: North woods round 3 of 3

28 October 2026. Final North woods round. Work stays in this lane. No merge,
push, course placement or live installation.

## Design and changes

Claude's round 2 verdict and the design written before code are in
[the round 3 note](../board/looks/wildlife/north-woods-round-3.md).
The deer, bear, beaver and wolf passed and their GLBs remain byte exact.
The failed original moose is replaced by a larger adaptation of the licensed
Quaternius deer mesh and rig. Its parent frame supplies metric fit and forward
orientation. The donor body is deepened and lengthened, with a rounded
shoulder hump, thicker upper legs, pale lower legs, drooping heavy muzzle,
throat bell and two skull-rooted palmate antlers. Donor bones and authored
animation curves stay intact. Source hashes and provenance remain recorded;
the deer provenance and credits disclose its additional use for the moose.

Claude's rule 18 written review in the brief approves excluding the four
WILD-ART-SRC provenance rows from the old P4 kits and tanker catalog pins.
Both original expected hash values stay exactly unchanged. No old catalog
row is excluded by the new filter.

## Validation

Final export and imported-GLB inspection passed. Moose is 3,939 triangles,
1,662,384 bytes, with one embedded 1024 x 1024 coat map and one skin. All
26 exported animation clips match the accepted deer export's channel names,
paths, interpolation, input times and sampled output bytes exactly. Each
animal's Idle and Walk was sampled at six phases. All bounds were finite;
reviewed motion views showed no detached parts or exploded limbs. The round
note records each animal's counts and lowest sampled positions. The four
passed GLBs remain byte exact against this round's starting HEAD.

Independent final technical review: CLEAR, no actionable defect. The reviewer
checked source, final GLB structure and clips, unchanged animal bytes, final
views, sheet contents and round 2 sheet removal. Claude's art judgment is
pending. No fourth round will start.

The sheet is 337,145 bytes and was visually checked. Its exact requested
scratchpad copy matches SHA256
a47627a005ee88c7080a773aa15cbccaa7e603e606213bd98e6e9ec5d7d983fb.

First selected lane run:
node tools/run-tests.mjs --tier lane --changed --jobs 2 --keep-going --json.
69 of 86 suites passed, 17 failed, zero not run, 1052.19 s. Sixteen failures
in audio-related suites came from FFmpeg being inaccessible to the sandbox;
test-full-check failed because its temporary-copy test could not launch
PowerShell (EACCES). The installed FFmpeg and PowerShell both run with approved
tool access. No test source or assertion was changed to resolve this.
Reran only the 17 failed suites, selected by their exact paths with --filter,
with approved access to the existing tools, --tier lane --changed --jobs 2
--keep-going --json. All 17 passed, zero failures, zero not run, 71.97 s.
The 69 passing suites were not repeated. Their union covers all 86 originally
selected suites, all green. No test was skipped or weakened.

Production build: PASS, 599 modules, 1.03 s. Ran npm.cmd run build --
--configLoader runner --outDir .qa-dist/wildlife-build with a temporary
lane-local Vite launcher because linked dependencies have no .bin/vite.cmd.
It invokes the existing Vite package; no dependency or shared file changed.
Existing mixed-import and large-chunk warnings remain. The runner config
loader avoids writes through linked node_modules. The launcher and build
output were recycled after the results were recorded.

git diff --check: PASS. STATUS refreshed only in this lane, with other lane
working-file inspections skipped and no live root supplied.

Blender-output: 141 checks, zero failed. P4 kits: all 35 actual high/low props
and provenance checks passed. Tanker source: 30 checks, zero failed. Replay
guard: 225 checks passed across 25 cases and three FPS values. World
composition: 47 exact complete-scene checks passed across twenty events.
No replay fixture or world signature was changed or regenerated.
No save access, new dependency, browser scenario or frame measurement.

## Changed assertions

- P4 kits and tanker source: filter WILD-ART-SRC provenance rows before hashing
  the protected old rows, as Claude explicitly approved. Keep expected hashes
  c75abff9d24ae7becbf8411c0222ff9b1a6aa30b003ec951672e56a63af05808 and
  6df6a61ed4f40b06c9dd7f4d4dd0e4e0286625af03d35ca5eebdb0e5574f8bea.
- Blender-output: extend existing donor-clip preservation assertions to moose,
  which now uses the deer donor. No assertion or tolerance is weakened.
- Hygiene: replace the exact allowed round 2 JPG path with the requested round
  3 JPG path. Other raw evidence paths still fail placement checks.
No replay fixture or world signature changes.

## Removed

Removed the failed original moose construction and its unused build path.
Replaced its runtime GLB in place. Recycled the superseded round 2 JPG in this
change. Recycled this run's lane-local renders, montages, logs, temporary launcher,
production build and salt-flats-tests-tcwkAH fixture directory. No .evidence
folder was created. No existing source cache, evidence or scratchpad file was
removed. The exact requested scratchpad sheet copy remains in place.
Cockpit sync stays with the Director under the lane-only boundary.

## Claude's review (28 October 2026, night)

Accepted on pictures over three rounds (Claude, look judge): deer, bear, beaver and wolf passed in round 2, the moose in round 3 (hump, dewlap, palmate antlers from the skull, long muzzle). CC0 Quaternius deer, moose donor and wolf; CC-BY 3.0 Poly by Google bear and beaver, credited. All under 5,000 triangles, 1K coats. Not placed in races yet (WILD-VIEW). Changed pins (rule 18): the P4 kits and tanker source checks leave out only the four new wildlife provenance rows and keep their old hash values exactly.


## Claude's review under rule 18 (3 November)

The changed checks in tools/test-wildlife-view.mjs keep testing that a course and the count join only when their species have models, now on a fixed North woods list, and add exact checks of today's table (each course's species, the birds' Fly loop, the count's course lists, 300 days identical to the job with no list). Nothing is loosened. Round 3 verdict: kangaroo and kookaburra PASS; all eleven new species and the wolf tracks are accepted.
