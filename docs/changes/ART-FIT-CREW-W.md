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
