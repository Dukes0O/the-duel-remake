# TOWN-ART-TRUCKS-1

The four-truck recipe now builds without missing external image files. It uses
the shared deterministic town wear atlas. Each truck has a named `:lamp` group
with two headlamp children and a nonzero emissive material. The readback check
builds a uniquely named private candidate every run, validates it, and removes
that temporary export without touching any existing candidate.

**Visual review:** the round 3 review still scores the earlier
photo-textured render; it is not a verdict on the reproducible atlas output.
No fourth look sheet was submitted. The rebuilt candidate is not a visual
pass, and Claude's look verdict remains pending.

**Code review:** an independent review confirmed that the recipe inputs are
reproducible, exported lamp parts emit light, and readback always uses a fresh
candidate. It found no remaining faults in those paths.

**Checks:** `node tools/test-blender-output.mjs` passed (239 checks, including
a fresh unique-path Blender export and GLB readback). `node
tools/test-repo-hygiene.mjs` and `node tools/test-board.mjs` passed.
`npm.cmd run build` passed; Vite reported its existing chunk-size and
dynamic-import warnings. The lane tier ran with `--jobs 4`: the latest run had
13 suites pass, `tools/test-full-check.mjs` fail, and 12 suites not run after
fail-fast. Its temporary-Git-copy test reported `spawnSync pwsh EACCES`; the
isolated rerun on the same commit failed the same way. An earlier run also
failed `tools/test-review-evidence.mjs` on `spawnSync ffmpeg EPERM`; its
isolated rerun repeated that error. Neither failure touches truck code, and no
assertions were weakened.

**Changed assertions:** the truck readback rebuilds with Blender in export-only
mode to a unique path on every run, then checks four truck roots, named movable
parts, four lamp groups and their children, positive emission, one embedded
atlas, steering-parent placement, file size and each truck's triangle limit.
The temporary export is removed after readback; an existing candidate is never
used or deleted. The existing global art-candidate budget and runtime path
protection remain in place.

**Race fingerprints:** unchanged; no simulation files or world signatures
changed.

**Removed:** the recipe's three unresolved external image arguments were
removed. A candidate built only for readback is deleted after the check. The
export-only path does not create review renders or a `.blend` file. No runtime
model was installed or replaced.
