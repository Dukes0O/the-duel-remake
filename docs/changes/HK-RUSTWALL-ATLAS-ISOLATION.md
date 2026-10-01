# HK-RUSTWALL-ATLAS-ISOLATION

Status: tests-first red freeze. Implementation and review gates remain pending.

## Decision before implementation

Each Blender invocation must save each atlas to a private file, capture its
own encoded bytes, explicitly pack those bytes and snapshot the same bytes.
Publish complete canonical PNGs with atomic replacement. Keep the existing
canonical paths, image names, output names and snapshot manifest fields.
No runtime asset, simulation rule or signature change is authorized.

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

Source before implementation: `2aa254f`.

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


ode tools/test-replays.mjs: **162 checks passed** across 18 cases, 16
events, eight categories, three FPS values and three runs. Existing frozen
fixtures remain unchanged; no simulation or replay fixture was changed. Lane/build, independent review,
existing Rustwall suites and final integration full tier are required after
the fix. This red freeze claims none of those gates.

## Removed

No code, test, asset or existing assertion was replaced. The native fixture
cleans its generated PNGs, GLBs and synthetic root after each run. The tiny
save-hook feasibility scratch is also removed before this handoff.
