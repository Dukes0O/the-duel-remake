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
