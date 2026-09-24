# FOOT-04: on-foot fighter figures

status: integrated

## Change

- Added a code-built, low-poly Wasteland fighter with a helmet, vest, pack, boots, gloves and visor. Four shared instanced meshes hold all parts for up to twelve figures. Pose matrices change in place; no hit or movement creates geometry or materials.
- The figure follows the fixed-step fighter's world position, yaw, walking stride, jump and knockdown state. The combat scene shows the local fighter only during flagged Wasteland play. Ordinary and flag-off races draw none.
- The local fighter occupies the last instance slot. A camera at its first-person eye omits that slot while a distant mirror or inspection camera can still draw it. This avoids viewing the inside of the helmet without changing FOOT-03's camera or the race simulation.

## Checks

- `node tools/test-onfoot-figures.mjs`: pass. Twelve figures use four instanced meshes, below the sixteen-draw-call budget for a scene pass. The check covers standing world position, yaw, jump, knockdown, first-person hiding, distant camera visibility, and flag-off/ordinary scene hooks.
- `npm run build`: pass on the rebased branch (base `8d5eb3b`, with FOOT-03 camera and PRG-04 armor kits).
- `node tools/browser-harness.mjs scenario onfoot-figures`: private memory-only browser pass, two standing/knockdown screenshots, zero warnings and zero errors. It confirmed the first-person view omits the local model and an outside inspection view draws it. Report: `.qa-dist/browser-output/onfoot-figures-2026-09-24T01-43-11-305Z/` in the FOOT-04 worktree.

No existing assertions changed. No race state, save data, replay fingerprints, live folder or live browser port changed. Future CPU fighters can enter the same twelve-slot pool when their simulation actors exist; the combat scene currently supplies the player only. The eye-distance hide rule may need a camera tag if a future close-up photo mode should show the local fighter from inside the helmet.
