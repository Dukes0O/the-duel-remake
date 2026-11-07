# TOWN-ART-TRUCKS-1, round 13: final tidy

## Changes

- Removed both black tanker walkway bars. They stood above the curved drum, ran too far, and had no matching photographed deck. The inspection hatch remains attached to the tanker.
- Corrected the supply cargo overhead mask to the cargo's actual photo bounds and trimmed the neighboring vehicle fragment from the supply side photo.
- Kept each truck's world-positioned fittings under its own vehicle root. Before this, tanker fittings and walkway bars remained visible when another truck was isolated for review.
- Removed the photographed hook block and hoist pixels from the tow boom mask because the named hook and cable are built separately. Raised the trace's minimum area to drop isolated photo-mask flecks.
- Set the review world and ground to plain grey and built the round-13 sheet in the round-12 layout.

## Tow-rig floaters removed

1. The two black bars over the boom and load were the tanker walkway strips leaking into the tow render from outside their truck root. Both strips are removed.
2. The short sticks beside the tail were the tanker drain and drip pipes. They were unparented, so they showed up on the tow; they now sit under the tanker root.
3. The dark round piece over the boom was the tanker hatch and lid. They now sit under the tanker root, so the tow does not show them.
4. The short dark piece by the hook was the photographed hoist block and line duplicated by the crane mask. Those photo pixels are cut out; the real `tow-rig:hook` and its cable remain.
5. Small detached marks in the crane trace were mask flecks, not rig parts. The trace ignores isolated regions under 35 pixels.

## Render review

Rendered from the exported GLB in an empty Blender scene. Checked the supply truck and tow rig from the side, three-quarter, and mayor-height views, and checked the tanker crown from above. The floaters are gone; the tank hatch remains. Round 13 is 221,936 bytes.

Claude should review [round-13.jpg](../board/looks/town-art-trucks-1/round-13.jpg), focusing on the supply bed and cargo from side and above, the tanker hatch and bare crown, and the tow hook, tail, and boom openings. No in-game browser check was run in this art lane.

## Checks

- Blender recipe/render: passed; imported GLB rendered, 40,882 total triangles. Fire 10,564; tanker 9,880; supply 10,822; tow 9,616. GLB 3,289,624 bytes.
- `tools/test-blender-output.mjs`: passed, 312 checks; includes truck GLB readback and per-truck budgets.
- `tools/test-repo-hygiene.mjs`: passed.
- `tools/test-review-evidence.mjs`: 7 of 9 subtests passed. The other two found a missing note for the older `town-art-power/round-4.jpg` and `spawnSync ffmpeg EPERM`; both failures repeated on the one allowed rerun. The round JPG publication check passed.
- Changed assertions: none.
- Race fingerprints: not applicable; static art only.

## Removed

- Deleted `round-12.jpg` and `round-12-review.md`; retained round 9.
- Removed the twin tanker walkway boxes and the duplicated hoist pixels from the tow photo mask.
- Temporary captures, bounds dump, sheet script and Blender logs will be removed before commit.


