# TOWN-ART-MACHINES-2 — round 8: mixer truck

## Result

The family exports at 3,897,688 bytes, below the 8 MB cap. The mixer truck is 12,196 triangles, below 15,000. It now has two box rails, cross members, a lathed fuel tank, separate water tank, six existing photo-measured wheels, the retained drum lathe, a rear service platform, hopper, ladder, fenders and a hinged chute. The cab has its own four generated references and is carved separately from the drum and chassis.

The cab carve is still incomplete: the four photo masks intersect in a shallow shell only about 0.47 m high. A welded cab shell and separate glazing were added to make the truck readable, but the cab remains too boxy and its windows do not follow the reference shape. The hopper and platform are also simple built forms. This round is not claimed as a pass.

## What Claude should judge

- Whether the round 8 sheet proves the drum no longer appears twice and stays clear when it turns.
- Whether the cab's low-resolution carve plus built fittings are acceptable, or need another mask/scale pass.
- Front and overhead symmetry, the chassis track under the body, and whether the six wheels sit correctly.
- The work pose: drum rotates and the chute lowers, but judge whether the chute motion reads clearly.

## Checks

- `node tools/test-blender-output.mjs`: 384 checks passed, 0 failed.
- Blender export completed. The file is 3,897,688 bytes. The recipe caps the mixer truck at 14,500 triangles; the output check confirms the family budget and named joints.
- Rendered side, front, rear, above, and three-quarter rest/work views from the exported GLB and compared them beside the four references on `round-8.jpg`.
- Browser checks: not applicable to this art lane; Claude should perform the look review above.
- No gameplay code changed; no race fingerprints apply.

## Removed

- Removed the unused `mixer-truck-top.jpg` whole-truck reference and its credit entry. The remaining whole-truck side and end images still supply wheel measurements; the drum-only photo still supplies the drum lathe.
- Replaced the round 7 whole-truck carve with a cab-only carve and separate chassis parts. The drum remains one standalone lathe on its supports.
