# CLEAN-01 — repository placement and audit

## Changed

- Added a placement check to every lane run. It rejects new raw evidence outside `.evidence/`, source assets under `public/`, and unexpected root files. The existing `course-landmarks.blend` is a temporary, named exception for CLEAN-02.
- Added advisory size targets and a read-only audit. The audit lists possible unused files and exports as candidates because generated paths can hide real uses. It also reports lane merge state and last activity without removing branches.
- Independent fixture tests cover placement, size advice, read-only audit output, and merged versus dirty lane worktrees.

## Checks

- Lane tier: 234 passed, 0 failed, 0 not run, 306.02 seconds.
- Build: passed with 214 modules transformed. Built `dist` is 320,030,739 bytes.
- Replay fingerprints: 162 checks passed unchanged across 18 cases; no replay data or simulation code changed.
- Focused acceptance suite: 86 checks passed. `git diff --check` passed.
- Browser and audio checks: not needed for the read-only tooling change; no game presentation or sound changed.
- Existing assertions changed: none. Review found and resolved raw JPG/WebP and audit lane-state gaps; final independent review was clear.

## Size baseline and audit

- `public/`: 315,969,513 bytes. Wasteland models: 135,847,059 bytes. `docs/board/looks/`: 2,723,829 bytes.
- `wall.glb`: 15,394,464 bytes. The 8 MB file, 60 MB Wasteland and 250 MB build targets are advisory for CLEAN-04.
- Audit found 112 runtime asset, 2 module and 110 export candidates, none approved for deletion by a literal scan alone. `roadside-destruction` is fully on for CLEAN-06. `docs/README.md` is absent for CLEAN-05.

## Removed

- None in this tool card. CLEAN-02 removes the existing Blender source from `public/`. CLEAN-04 handles asset sizes, CLEAN-05 old docs, and CLEAN-06 proven dead paths and the released switch.
