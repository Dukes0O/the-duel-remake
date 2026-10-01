# HK-RUSTWALL-ATLAS-ISOLATION

Status: implementation and focused checks complete. Independent review and lane/build gates remain pending.

## Decision before implementation

Each Blender invocation must save each atlas to a private file, capture its
own encoded bytes, explicitly pack those bytes and snapshot the same bytes.
Publish complete canonical PNGs with atomic replacement. Keep the existing
canonical paths, image names, output names and snapshot manifest fields.
No runtime asset, simulation rule or signature change is authorized.

## Failure and fix

The final full tier at `2d1216f` passed 306/307 and stopped with one failure.
The default wheel and relief
probes ran together and wrote the same `art-build/rustwall/hulks-*.png` files.
The relief snapshot and GLB contained identical corrupt embedded PNG bytes;
the runtime wall images remained valid. A partially replaced PNG had a new
prefix and stale trailing bytes. Even a complete competing PNG could be
valid while belonging to the wrong invocation.

`rustwall.py` now creates one unique `.atlas-*` directory per real invocation
under its ignored Blender output folder. Every initial atlas, including
emissive, and every relief update saves privately, reads its own bytes and
packs those bytes explicitly. A separate private publication file is renamed
onto the canonical PNG with `os.replace`. Relief snapshots and their hashes
use the same captured bytes. Canonical paths are restored after packing for
saved Blender file compatibility. Relief unpacking points at its own initial
private PNG.

Cleanup runs at process exit, after exports and Blender file saves. It checks
the private directory's exact parent and resolved path, rejects links,
Windows reparse points and nested files, then removes only direct regular
files and that directory. Dry path plans return before creating the private
directory. Output paths, image/material names, manifest fields, atlas math,
geometry, shader settings and runtime files stay unchanged.

## Tests-first acceptance

`tools/test-rustwall-atlas-isolation.mjs` runs Blender 4.5.13 against the actual
recipe definitions. AST filtering disables only top-level full/probe build
dispatch; it does not rewrite any function. The fixture overrides native
Image attribute lookup only to intercept `save`, calls the real save first,
records its own PNG bytes, then publishes a competing PNG at the canonical
path before the recipe can read or pack it. The two competing payloads are a
valid native Blender PNG with distinct pixels and an interrupted PNG write.

Native material generation covers initial hulks color/surface/normal and
all details atlases including emissive. The real relief builder stamps a
small triangle template 120 times, renders it in EEVEE, updates its reserved
atlas pixels, saves, snapshots and packs. The real Blender glTF exporter
exports both initial and relief meshes. The bounded fixture needs about five
seconds, without importing the heavyweight car assets or full wall.

The 95 checks cover save isolation and observed atomic replacement, exact
native-save SHA ownership, packed/embedded/snapshot PNG chunk CRC and full
row decoding, exported pixel ownership, snapshot path/hash fields, preserved
original pixels outside the relief region, default wheel/relief path plans,
and unchanged source/runtime/source-car hashes. Fixture outputs stay under a
unique lane `.qa-dist` directory with a private synthetic root. The test
removes that directory even on assertion failure. It touches no saves,
ports, Preview build, integration scratch or licensed originals.

## Red evidence

Source before implementation: `2aa254f`. Independent red-test freeze:
`0b172023145f8292326654f554a2b7b2994ca35b`.

`node tools/test-rustwall-atlas-isolation.mjs`:
**95 checks: 19 passed, 76 failed.** The native fixture completed successfully;
failures are source behavior, not Blender setup or monkeypatch errors.

Every failing message is reported by the suite. Its complete failure mapping:

| Context | Checks and exact failure message |
| --- | --- |
| Complete competing PNG, initial hulks color/surface/normal and details color/surface/normal/emissive (7 atlases) | Private save: `native image save must use a private path`; own pack: `packed bytes must belong to this save`; own export: `GLB pixels must match own atlas despite competing publication` (21 failures). |
| Complete competing PNG, relief hulks color/surface/normal (3 atlases) | The same three failures plus snapshot: `snapshot must belong to this save` (12 failures). |
| Interrupted competing PNG, the same 7 initial atlases | Private save and own pack messages above; packed PNG and GLB decoding each fail: `complete PNG chunk payload` (28 failures). |
| Interrupted competing PNG, the same 3 relief atlases | The same four failures plus snapshot decoding: `complete PNG chunk payload` (15 failures). |

Both modes execute all ten saves. All six initial-to-relief protected-pixel
controls pass, showing that the current native `unpack(REMOVE)` does not
reload competing canonical pixels in this fixture. All default path and
protected-file SHA controls pass. No existing assertion was edited.

Protected SHA-256 values before and after native acceptance:

| File | SHA-256 |
| --- | --- |
| `tools/blender/rustwall.py` | `6a9398b3498ef2f1c2adc13f77a25c8ff10b7505215d5b6e7de7dacbfe1aed92` |
| Runtime `wall.glb` | `f834469c33e2d6798f9c3a4393f535abb0ac0b488e72b265adfd87bc07bb7c58` |
| Runtime `wash.glb` | `09e75a486978129950d58ebecb9ff0e580ff3c1d7767bbef4cc767923fafd8b4` |
| Source `falcone_f42.glb` | `1914ddaf130c19d48b1044500d080424623fbd6a3200be96c7f7b6332ddd8c4c` |
| Source `banshee_muscle.glb` | `48d73686e101486514a4b4283d628d9a566a1df4afd04e12c1c356e1acff6f07` |


node tools/test-replays.mjs: **162 checks passed** across 18 cases, 16
events, eight categories, three FPS values and three runs. Existing frozen
fixtures remain unchanged; no simulation or replay fixture was changed. Lane/build, independent review,
existing Rustwall suites and final integration full tier are required after
the fix. This red freeze claims none of those gates.

## Green evidence

`node tools/test-rustwall-atlas-isolation.mjs`: **95 checks passed, 0 failed**.
The unchanged frozen native suite verifies complete and interrupted competing
publication, initial/emissive/relief save isolation, observed atomic
replacement, own packed bytes, embedded GLB pixel ownership, relief
snapshots, protected outside-relief pixels and canonical dry path plans.
Its private synthetic root is removed after the run.

Implementation SHA-256 for `tools/blender/rustwall.py`:
`9be8b960e5e1a4d5b7fd43b8468227881cee7fb358b9f5da4980709fcedf19f6`.
Both owned text files use LF. The new frozen test and every existing test,
assertion and replay fixture remain untouched by the builder.

The tracked runtime inventory before focused checks is 143 files,
236,249,990 bytes, with name-and-content SHA-256
`b2535c1d67b6b4c8c5dccccee10400dace44cea274dbb77e169637a720836db8`.
Individual runtime and source-car hashes still match the table above.
After all focused checks, the inventory hash, file count and bytes remain
identical. Both runtime GLBs and both source-car GLBs retain the exact
SHA-256 values above. No `.atlas-*` folder remains under either Rustwall
art-build output tree. `git diff --check` passes.

The unchanged seven Rustwall suites ran together:

`node --test tools/test-rustwall-assets.mjs tools/test-rustwall-baseline.mjs tools/test-rustwall-frame.mjs tools/test-rustwall-p2.mjs tools/test-rustwall-p2-relief.mjs tools/test-rustwall-p2-sheet.mjs tools/test-rustwall-scene.mjs`

**29 Node subtests passed, 0 failed**, including the default wheel and relief
probes running together, isolated actual exports and existing frame evidence
validators. The asset and scene suites report **9/9** and **23/23** internal
checks respectively. These frame tests validate synthetic fixture handling;
this task does not claim new browser frame measurements or an art verdict.

`node tools/test-replays.mjs`: **162 checks passed** across 18 cases, 16
events, eight categories, three FPS values and three runs. Every frozen
fingerprint remains unchanged.

No runtime rendering, art, gameplay, save or input change needs browser,
visual, audio or save review for this recipe-only fix. No Preview or live
build, port or player save was opened. The root will arrange independent
review and the exact lane/build gate; final integration full-tier evidence
remains required. This source handoff claims none of those pending gates.

## Independent review and integration gate

Independent review clears exact clean source commit
`df3706c129b7f2c8e41fa6f75814192a52d83c49`. The reviewer reran the
frozen native suite: **95/95 passed**. Independent real Blender probes
leave zero private atlas directories on normal exit and on an injected
pack failure immediately after a native save. Old assertions, replay
fixtures and all runtime assets remain unchanged.

The exact lane commit stayed clean before and after both required gates:
`node tools/run-tests.mjs --tier lane --changed --jobs 8` passed
**308/308, zero failures and zero not run, in 440.99 seconds**.
`npm run build` passed in **0.977 seconds**. Campaign shards ran;
only the existing forced demo shoulder excursion is explicitly skipped.

Merged as `cc6a7f93861b36d7611988795cbd1da2e701840e`. The dependency
junction was verified and unlinked, followed by plain `git worktree remove`
and merged branch deletion. The final integration full/build must run on
the clean commit after this handoff. Its exact verdict belongs in
`docs/board/checks/full-tier.json`; this note does not grant another
commit the lane result.

## Removed

Removed the shared direct atlas save/read path, implicit initial image pack
and second relief disk read. The single save helper replaces those paths in
the same change. It removes its invocation's private PNGs at normal process
exit. No old test or runtime asset was replaced. The native fixture cleans
its generated PNGs, GLBs and synthetic root after each run. The tiny
save-hook feasibility scratch was removed before the tests-first handoff.
