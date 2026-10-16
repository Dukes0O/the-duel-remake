# RESCUE-FINISH

Claude flies each rescue, fixes what feels wrong, sends Kyle pictures, prepares the release.

Owner: Claude. Design: `docs/HELI_RESCUE.md` (the H4 Rescue packet). The board entry holds
state, needs and locks.

Packet section 12. The release comes after H2's, waits for Kyle's word and
holds `release` only then.


## Notes from RESCUE-VIEW (Claude, 16 October)

- `public/assets/heli/rescue/debris.glb` is no longer drawn (RESCUE-VIEW builds packed-snow chunks in code). Remove it from `tools/blender/rescue-props.py` and `tools/test-blender-output.mjs` and delete the file.
- The rescuer pose: arms out to the casualty and the hook at the chest need `tools/blender/rescue-people.py`.
- Frame check (rule 8) hovering over the avalanche, both qualities, before the `rescue` switch goes on (rule 9: not while players cannot reach it).
- Still to draw: the driver car at the hoist site, a crate set down in the yard.
