# ART-FIT-CREW-W: Vesper private tests first

status: tests-frozen-red
waiting_on: Source builder
source_commit: 20999f952259b21301d4a8de661b25f4c8da548d
scope: private fitting leaf only; no installation or reveal

Vesper uses the approved current Odessa GLB as her donor. Nell, Odessa and
Wren stay intact. The card settles a new costume in the Baron's blackened
steel with a dark red accent. It does not authorize a new body, replacement
women, new donor search or public Vesper figure. WAR-04 owns her later reveal
and installation. Tests cannot award a visual score or Kyle's last look.

## Source and rights

The actual donor is `public/assets/models/wasteland/crew/odessa.glb`, SHA-256
`364de3fd43de474eb4ef0fd12b859940f067549b02f2922b432d3a0c422170ca`.
Its committed original regeneration recipe is `tools/blender/crew-fighters.py`,
SHA-256 `661eb808f94c338ba913b0fc8efdb9118d12984d0ba0669bc2e1de932d391857`.
The existing original reference is `public/assets/reference/wasteland-crew-1.png`,
SHA-256 `af27e7925f95972c5ec842f5573640f2b8d36aece5429c0357325f7c28078058`.
The existing rights/intake record is `public/assets/reference/CREDITS.md`,
SHA-256 `1062f54070340b87c10ec40b1d528f17845d723ac313b446b9bd4d2ecae863ad`,
which credits the original Codex-generated reference and links the full intake
prompt. This is the game's existing original source; no downloaded CC0 model
or new licence claim is substituted. All four records remain byte exact.

The approved-source metadata describes seventeen joints, twelve actions and
6,756 triangles across BOTH detail levels, two draws combined. Existing native
crew acceptance and the women source review report 4,876 near triangles, one
visible skinned draw. The new suite measures near and far separately rather
than treating combined metadata as visible cost. The settled fitting budget
is near 6,500 / far 2,000 and one skinned draw per visible figure; SPEC 0.3
also caps twelve figures at twenty-four draws and one 1024 texture set per
material role. The native measured baseline will be recorded below after the
quiet timing window ends.

## Private interface for the Source builder

This is a routine leaf CLI/config contract, not a runtime API or new design.
The recipe is `tools/blender/vesper-blackiron.py`, with:

- `--root <lane> --fit-config tools/art/vesper-fit.json --output-dir <private>`.
- Python-standard-library `--paths-only` emits one JSON object with absolute
  `model` and `manifest` paths, without creating the output directory.
- Python-standard-library `--validate-sources` verifies source binding and
  rejects stale hashes before creating output. These two modes run before
  importing Blender-only modules. They do not need the shared output hook.
- Actual export uses Blender `-b --python-exit-code 1 --python <recipe> --`
  and those same root/config/output arguments. No stub exporter is accepted.
- Output is `vesper.glb` and `manifest.json` under a named child of the same
  lane's ignored `.qa-dist/` or `.evidence/`. No public/root/other-lane output
  is accepted. The suite defaults to `.qa-dist/vesper-art`; `--output-dir`
  allows another private candidate directory. `BLENDER_BIN` selects the
  real local executable when the installed LOCALAPPDATA/Programs/Blender/current path differs.

The small fit JSON contains `id: vesper`, `source: {path, sha256}` for the
exact donor above, and `provenance: [{path, sha256}, ...]` for the four source
records in the order printed above. Costume settings can follow those
bindings without inventing an unlock or rig API. The manifest repeats `id`
and `source`, gives `modelSha256`, and has
`costume.blackenedSteel.materialIndices` and
`costume.darkRed.materialIndices`. Those indices must reference actually
used exported materials, and the real embedded color atlas must differ from
Odessa. This records material evidence; labels and a changed atlas do not
prove a gritty costume or visual recognizability.

The donor's bound geometry, topology, normals, UV layout, joint indices,
weights, seventeen-joint naming/parenting/bind pose and original action
tracks remain. The native test allows 0.000001 component tolerance for
ordinary export precision in geometry/bind data; topology indices and
animation track names/times/values are retained exactly. No donor anatomy
or missing action is hidden behind that tolerance. Costume material/atlas
changes are permitted. If a coherent native exporter needs a harmless
vertex reordering or animation naming migration, report it for independent
review before changing this frozen assertion; do not refit the donor or
relax it silently.

## Tests and honest limits

`tools/test-vesper-art.mjs` first checks actual donor bytes, rigged GLB,
geometry/atlas/weights and all twelve visibly deforming native animations.
It also sends the real donor through the unmodified
`createRiggedFighterFigures` loader seam: twelve cloned real skeletons,
one visible LOD per figure, mesh/material reuse across detail changes,
request deduplication and actual resource disposal. The private candidate
later runs the same checks. The seam uses the existing recognized Odessa
identity only for private loading; it changes no public crew ID or roster.
The only Node texture seam substitutes unavailable image decoding with
`THREE.Texture`; original embedded PNG dimensions and bytes are inspected
separately. Meshes, skeletons, GLTFLoader, clips, AnimationMixer and native
view all remain genuine. Native texture decoding cannot prove browser
material appearance. Skeleton disposal is observed by delegating the real
dispose method exactly once, without changing its behavior.

Preservation checks compare every existing `src/`, `public/` and
`tools/replays/` Git blob against the exact frozen source commit. This includes
all women, other crew assets, roster, save code and replay fixtures. Original
recipe/reference/rights hashes are checked before and after leaf commands.
No real player profile is read. Invalid-source fixtures and repeated export
outputs are generated only under the task's ignored private folders, after
the recipe/config exist. Existing road/game replay signatures are retained;
there is no simulation change that calls for a new replay pin.

The initial suite must independently fail for the absent private recipe,
configuration and candidate, after genuine source controls pass. It does
not skip missing fit acceptance or substitute Odessa as the finished model.
After a Source fit exists, the default suite first genuinely rebuilds its private candidate from the committed recipe, so integration tests never depend on a leftover lane artifact. Two separate actual Blender exports must be byte
repeatable. Guard checks must reject stale source hashes and non-private
output plans before writing. Native green still leaves the actual matched
High/Performance, near/distant, beside-Nell/Odessa/Wren game comparison,
recognizability, gritty tone, frame cost, Claude sheet review and Kyle's
Preview last look pending. SPEC 0.11's three-round cap and two rounds without
a gain stop rule remain; no native test manufactures those scores. The
private recipe/model cannot install or reveal Vesper. Source/public hooks,
shared output-hook edits, gameplay/unlock/save integration remain ungranted.

## Removed

Nothing is removed in this tests-first leaf. No existing assertion, crew
model, donor recipe, licence/intake record, roster, Source, save code or replay
pin is replaced. The new test rejects unchanged Odessa standing in for a
completed Vesper costume; it does not remove her existing runtime model.
WAR-04 owns eventual reveal/install integration. Evidence is ignored and
retained until the independent verdict is committed, then the Director's
janitor removes it.

## First native RED on the unchanged Source

The Director released the Shove timing hold before execution. The first and
only suite run was on unchanged Source
`20999f952259b21301d4a8de661b25f4c8da548d`, before any Vesper recipe,
configuration, model or Source work. Commands in this private lane:

- `node --check tools/test-vesper-art.mjs` — exit 0.
- `node tools/test-vesper-art.mjs` — exit 1, expected RED.

Complete stdout/stderr is retained in integration's ignored
`.evidence/2026-10-01/ART-FIT-CREW-W/tests-first/initial-red.log` and
`syntax.log`; exact protected SHA-256 records are in
`protected-source-receipt.json` alongside those logs. No Blender, browser,
frame, build, full or lane gate was run by this test author.

The suite executed 18 cases / 27,017 acceptance checks: **6 passed, 12 RED**.
All four genuine donor controls passed before the independent leaf REDs:
source/rights binding; real GLB budgets, UVs and skinning; twelve real
AnimationMixer actions deforming actual bound vertices; and the unmodified
native view's twelve-figure load/LOD/skeleton/reuse/disposal lifecycle. Both
complete source/public/replay preservation passes also passed. Native
Odessa measured **4,876 near / 1,880 far triangles, one skinned draw per
visible LOD, seventeen joints and twelve actions**. There was no missing
library, fake-geometry pass, source-control failure or early abort.

Every failing case and its actual message:

1. Separate costume-fitting recipe: `Vesper costume-fitting recipe: missing tools/blender/vesper-blackiron.py`.
2. Exact fit source/rights binding: `Vesper source-bound fit configuration: missing tools/art/vesper-fit.json`.
3. Private paths-only output plan: the same missing fit configuration message.
4. Stale-source rejection: the same missing fit configuration message.
5. Public/root/other-lane output guard: the same missing fit configuration message.
6. Genuine default private export: the same missing costume-fitting recipe message.
7. Distinct candidate/LOD/atlas: `Vesper costume candidate is missing from private output; unchanged Odessa is not a completed fit`.
8. Candidate retained rig/topology/UV/weights: the same missing private candidate message.
9. Candidate retained twelve action tracks/deformation: the same missing private candidate message.
10. Actual costume material/color evidence: the same missing private candidate message.
11. Candidate native loader/LOD/disposal: the same missing private candidate message.
12. Two actual repeat exports: the same missing fit configuration message.

These are three separate unfinished leaf contracts: **recipe**, **source-bound
fit configuration**, and **actual private costume candidate**. Tests do not
claim guard, repeatability, material or candidate compatibility acceptance
has passed while those prerequisites are absent. Guard negatives and repeat
exports are deliberately not exercised by a source stub. The default will
perform the genuine export when the actual recipe/config exist. Baseline
compatibility does not prove the future costume's game appearance.

Both protected-tree checks passed against the exact frozen Git blobs and
confirmed no added Source/runtime/replay file. All current women and other
crew, source, original recipe, public references/rights, roster/save code and
replays remain untouched; exact scope counts and SHA-256 witnesses are in
the ignored receipt. Only the new test and this new note are tracked changes.
No existing assertion is changed. There is no prior test/note prefix to
reconstruct because both assigned files are new. The leaf remains tests-first
RED for the proper Source builder, not ready to merge. The earlier Removed
section and all stated art/Claude/Kyle/installation limits still apply.


## Private Vesper Source freeze, 1 October 2026

Status: private native fit ready for independent Source and visual review.
Waiting on: independent recipe/material review, matched game comparison and
Claude; no installation or WAR-04 reveal approval is implied.

The Source leaf changed only new tools/blender/vesper-blackiron.py, new
tools/art/vesper-fit.json and this appended note. All 1180
previously tracked files outside this note are byte exact, including the
frozen test/scenario, every runtime Source/public/crew/roster/save/flag/replay
file, original donor recipe, reference and rights. The original 11497
note bytes remain exact, SHA-256 c748896411d9e3da79a93f22fb090fefe6db08eaeb9e4711655809ba5604d044.

### Native fitting and output

The genuine current Odessa donor remains 1,920,000 bytes and retains the four
source/rights hashes above. Blender 4.5.13 LTS imports the actual seventeen-
joint figure, two armature-bound LODs and all twelve named actions. The
private costume retains the existing body; no existing woman is refitted.

The new atlas follows the native projected UV islands: blackened steel on
the mechanic bib, shoulders and existing knee shapes; charcoal fabric and
leather; a worn dark red diagonal harness and left sleeve accent. The face
region remains from the approved source. Color shade uses original garment
detail, deterministic dust and rubbed wear; physical roughness/metallic
channels produce the steel response. This is a private costume candidate,
not a visual-recognizability or gritty-tone verdict. The actual atlas was
inspected; no game comparison or art score was taken.

Blender genuinely creates two 1024 PNG atlases and assigns the fitted
material to both imported bound LODs. Per Director approval, lossless
material/image rebinding then replaces only the donor's embedded atlas
views and material/image names. Every other buffer view is copied exactly;
all 383 native geometry, UV, joint,
weight, bind and action accessor-view hashes match. Buffer offsets are
repacked; vertex/topology/animation contents are not resampled. This avoids
ordinary importer/exporter vertex ordering or animation sampling changes.
No Blender bone-display helper enters the candidate.

Both costume roles genuinely use exported material 0, through different
regions of its single shared color/surface texture set. This preserves one
skinned draw per visible LOD. Actual unchanged measurements are 4,876 near
and 1,880 far triangles, seventeen joints and twelve actions.

Private output is vesper.glb plus manifest.json; Blender-produced PNGs stay
alongside them under ignored .qa-dist/vesper-art. Candidate: 2163704
bytes, SHA-256 47f76f334ee1025b8ad0cdef5539dd85e86f899f1b67b4022f35263d7d73ef35. Its size grows by
243704 bytes from the donor because the
new atlases contain different deterministic detail. Old atlas payloads are
replaced in the candidate, not duplicated or retained as another version.
No generated binary or Blender file is committed.

Original embedded image SHA-256 values:

- Color: 1b89921aad0cebd13d38ea63b732d21a2d3b3aa2f75fce40c513c16302d9c9b4.
- Surface: 9e3ea83c17608325976c74d9db5a5869dad9dfae21d41dc589e8df5588fad854.

Candidate embedded image SHA-256 values:

- Color: cb44e2c95073eed776426b6e61e83155f8617698e3fa10ca086e7f624354ba3e.
- Surface: e0bd8aa77c3005d2abafd9f8d006fc6b76e3f76cd23f1b889162eba3868944ab.

The standard-library CLI validates the exact donor/provenance checksums
and resolved private output path before bpy import or output creation.
Paths-only and source-validation modes run in ordinary Python and create
no output directory. Public, root and other-lane destinations are refused;
stale-source fixtures are rejected without creating output.

### Tests, failures and limits

On clean tests-first e5811d8e0927bb6542d508968b9aac76068fd979,
the unchanged native suite reproduced 18 cases: six pass, twelve missing
recipe/config/candidate RED; 27,017 acceptance checks. First real fit attempt
gave eleven pass/seven RED because the recipe counted Blender's unskinned
Icosphere bone-display object as donor geometry. Read-only native inspection
proved two actual bound LODs, one seventeen-joint rig and that display
helper. The recipe now counts armature-bound meshes. No test changed and
the helper never enters the lossless export.

Final unchanged suite: **18/18, 105,015 acceptance checks**. It rebuilds the
default candidate from the recipe, then makes two actual exports to fresh
private directories. Both repeat GLB hashes equal the default hash above.
The real GLTFLoader/AnimationMixer tests prove retained native topology,
UVs/weights/bind data and exact original action tracks/times/values, with
all twelve actions deforming bound vertices. The actual unmodified native
view accepts the candidate using its private recognized Odessa seam,
clones twelve real skeletons, switches one visible LOD, reuses mesh/material
objects, deduplicates requests and disposes real resources exactly once.
Only unavailable Node image decoding uses the declared Three.Texture seam;
actual embedded PNG dimensions/bytes are inspected separately.

Complete RED/first-fit/GREEN logs, manifest/accessor/image hashes, independent
repeat witnesses and protected receipts are retained in integration
.evidence/2026-10-01/ART-FIT-CREW-W/source/. Existing native crew/rigged view,
crew-rule and replay checks and build results are recorded there. The
Source-only leaf does not claim lane/full or integration merge clearance.

Actual matched near/distant High/Performance game comparison beside Nell,
Odessa and Wren, recognizability/gritty consistency, frame cost, Claude
sheet review and Kyle's Preview last look remain pending. At most three
fitting rounds and two rounds without gain still apply; no comparison round
has been spent by this native-only slice. WAR-04 owns later reveal/install
and its roster/gameplay/save hooks. No shared output-hook, Source, public
asset, reveal or credits record was edited. Live, Preview, .preview-dist,
port 5174, real saves, external audio, dependencies and history were untouched.

### Removed

The candidate replaces the original embedded costume atlas payloads in its
own private output. It does not replace or remove current Odessa/Nell/Wren
runtime models, the original recipe/reference/rights, existing tests or
replay pins. The temporary source-color extraction is deleted after native
image loading; Blender's unskinned display helper is not exported. Eventual
runtime install/removal belongs to WAR-04 after visual approval.

Final recipe/config Source hashes:

- tools/blender/vesper-blackiron.py: 17104 bytes; SHA-256 8b79d19c0204b6b441e7a6f8e8820b877d8e6ab5f6aa900ab52d8d5436560b5c.
- tools/art/vesper-fit.json: 1994 bytes; SHA-256 5bf4167962b90d6d70f0d74c123e0b1564ec9735bce70a361d92850366dce0e1.

Final preservation controls: crew fighters 26/26, native rigged fighter
14/14, crew-rule tests 4/4, unchanged road fingerprints 162/162 and
npm run build pass. Build retains its existing advisory chunk-size warning.

## P2 destination-alias guard: independent tests first

status: destination-guard-red
source_commit: 15a11c5082e48c4d8cb775458b64c27614bf03e2
waiting_on: Source guard fix and Director review of native file-symlink limitation

The actual recipe validates only the resolved output DIRECTORY. Its later
writes use five fixed child paths: `bound-donor-color.png`,
`vesper-color.png`, `vesper-surface.png`, `vesper.glb` and `manifest.json`.
Pre-existing file aliases can redirect those writes to protected bytes even
when the directory is private. This tests-first slice appends fourteen
native destination controls. The original eighteen cases, their runner and
all assertions remain byte exact. No Source, config, scenario, public asset,
material setting, topology or earlier note text changes.

The added checks run the unchanged actual plain-Python recipe with a
synthetic repository containing genuine COPIES of all four approved,
hash-pinned source files and the unchanged fit config. This is not a source
module overlay or mock guard. Every bad planned path is a real OS hardlink
or, when available, file symlink to the COPIED protected Odessa donor. Both
`--validate-sources` and `--paths-only` are invoked with the original recipe
and real arguments. No export or `bpy` import is attempted. Alias/source
bytes, source link count and output file list are checked before the
expected rejection assertion. Exact aliases are unlinked in `finally`;
there is no recursive deletion or following an alias during cleanup.
The actual game donor and all original source/rights remain untouched.

### Actual RED and tool limitation

During the Director's audio timing hold, only the appended small
standard-library block was run. It was copied VERBATIM from the appended
test bytes into ignored scratch and supplied the real lane root via
`VESPER_GUARD_ROOT`; the original Blender-heavy eighteen-case runner was
not run during the hold. Default execution still runs the entire original
suite followed by these additions. This diagnostic does not skip or claim
acceptance for any old case. Source ownership stays with the builder.

Commands:

- `node --check tools/test-vesper-art.mjs` — exit 0.
- Set `VESPER_GUARD_ROOT` to this private lane, then
  `node .qa-dist/vesper-native-destination-guards/guard-only.mjs` — exit 1.
- Small native byte/protected-tree audit against Source `15a11c5` — pass.

Actual added-block result: **14 cases, 3 PASS, 5 genuine guard RED,
6 UNAVAILABLE, 133 assertions**. The successful controls prove normal
absent output validates/plans without directory creation, pre-existing
regular rerun files validate without byte changes, and native hardlinks
really redirect writes to isolated SCRATCH bytes. The hardlink mechanism
control observes the actual same inode/multiple link count and safely
writes a scratch-only alias; it never writes through an alias to a donor.

Each of these five genuine REDs reports:
`<filename>: actual hardlink destination must be rejected by --validate-sources BEFORE Blender import or any output write; current status 0`:

- `bound-donor-color.png`
- `vesper-color.png`
- `vesper-surface.png`
- `vesper.glb`
- `manifest.json`

For EVERY one of those cases, the retained native receipt ALSO proves
`--paths-only` returns status 0 with the aliased planned path. Both modes
were executed before the rejection assertion. The first failed assertion
names validation; a future fix must pass both mode checks. The copied
source/alias SHA-256 stayed equal to the original approved donor hash in
all ten calls. Validation created no other files and no Blender-dependent
failure disguised a rejection. The fixture proves unsafe acceptance before
export without damaging any genuine or copied source bytes.

Actual native `fs.symlinkSync(target, alias, 'file')` returned **EPERM** under
this normal token. No admin mode, privilege escalation, policy change or
Kyle request was attempted. One capability check and all five file-symlink
guard cases report **UNAVAILABLE native file symlink ... EPERM**, with
`no guard acceptance claimed` for the filename cases. These six failures
are a tool limitation, distinct from the five proved hardlink Source
failures. They are not skips, fake passes or five observed symlink guard
reproductions. The Director must review a native alternative or approved
handling of this limitation before a complete guard acceptance claim.
The available hardlink mechanism already proves this P2 defect requires a
Source fix. No final visual, frame, browser or merge verdict follows.

Full raw stdout/stderr, standalone exact block, source/alias/CLI receipts and
protected-prefix witness are in integration's ignored
`.evidence/2026-10-01/ART-FIT-CREW-W/destination-guard-red/`:
`guard-only-red.log`, `syntax.log`, `guard-only.mjs`,
`native-destination-receipts.json`, `protected-prefix-receipt.json`.
The original isolated fixture is this lane's ignored
`.qa-dist/vesper-native-destination-guards/run-lpFdNw/`; all copied donors
remain intact, and only the precisely created alias entries were unlinked.

### Exact preservation and Removed

Original test prefix: 24,520 bytes, SHA-256
`20ddbda5bfdd44a3f33b4ce5242cf82127d0dee693fd8561680ae352bc0c966f`.
Original entire note prefix: 18,532 bytes, SHA-256
`92f4a909cbd5e930a19580d1f2f7b496dbfba2107ea28023f95ee5339317ce9d`.
The executable diagnostic is byte identical to the appended guard block,
SHA-256 `2c8c6404f76de27de4119c3f3718573b1c88c9ee7088932d4ac20bafc5b1a4b7`.
All 373 protected tracked files (existing Source/public/replays plus the
frozen Vesper recipe/config) match the exact `15a11c5` Git blobs; their
SHA-256 inventory is retained with the receipt. No default eighteen-case
rerun, Blender export, browser, build, frame test or full gate is claimed
by this short test-author slice.

Removed: no existing assertion, Source path, setting, material, topology,
model, licence/credit, roster, save code or replay is removed or replaced.
Only exact safe private alias entries are unlinked after each test; source
link counts and bytes are restored/verified. Raw evidence remains ignored
for independent review and the later janitor. The unsafe planned-child
acceptance remains real RED for the proper Source worker to fix forward.
