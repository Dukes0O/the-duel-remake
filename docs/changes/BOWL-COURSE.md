# BOWL-COURSE

## Design

Added a separate, night-time Bowl course definition behind the existing
`titan-bowl` development switch. It uses a deterministic course-frame layout:
three launch ramps and a 15-item crush line that grows from junk cars to larger
shells and a burning heap. Each prop uses the existing arena crush system.
The Titan course definitions and default course order are unchanged.

The authored Bowl definition also exposes three flame-jet locations as course
features. They do not have a scene presentation hook in this lane's allowed
course files. The Round 3 appearance fixes also need the selected Bowl bus and
RV meshes and the game's fire effect on the heap; this change does not render
those yet. This card is not ready for integration until those visuals are
wired and checked by Claude.

## Checks

- `node tools/test-bowl-course.mjs` — passed. Checked ramp launch height,
  crushable prop visibility and deformation, and unchanged existing course
  identities/order.
- `npm.cmd run build` — passed. Vite reported its existing chunk-size and
  dynamic-import warnings.
- Lane tier — Claude runs.
- Browser and look checks — Claude runs. Please inspect the night stadium,
  ramp and crush-line placement, bus/RV outlines and faded colors, and the
  flame jets and heap fire effect.
- Race fingerprints — no existing course geometry or rules were intentionally
  changed. New Bowl geometry is behind `titan-bowl`; signature fixtures were
  not regenerated.
- Changed assertions — none.

## Removed

None.
