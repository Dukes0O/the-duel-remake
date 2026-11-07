# Dust tanker ? round 6

This sheet compares the whole side reference with a same-sized render from the
exported GLB, then shows front and rear three-quarter views. The three renders
use an empty imported scene, Standard view transform, and hide every other
prop. The angled cameras are at car height and about 15 m away.

Self-review: the goggles are clear and silly head-on, but are partly lost from
the submitted front three-quarter view. The vehicle reads as one tanker from
both three-quarter angles. Photo edges and seams remain at the cab and tank
ends, and pale background edges show near the tarp. Claude should judge whether
those are visible enough at play scale to require another look card.

The four authored photo copies in the GLB are whole and 1024 px wide. The
source JPEGs were not changed. Readback: 33,340 triangles and 3,003,984 bytes.

Checks: `tools/test-blender-output.mjs` passed (304 checks); `tools/test-repo-hygiene.mjs` passed. No browser check was run here.
