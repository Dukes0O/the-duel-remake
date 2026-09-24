# GFX-02 round 2: Blender evidence

Round 1 is unchanged. This round addresses its five visual priorities without
claiming an independent resemblance score or beta approval.

## Changes from round 1

1. Forearms now have a fuller muscle/sleeve profile, tapered wrists, additional
   fold rings, thick rolled cuffs and fitted crew wraps. Cuff and wrap weights
   match the underlying arm so the parts follow the same deformation.
2. Palms and fingers are fuller. Fingers have more cross-section detail,
   rounded knuckle pads and leather seams. Glove coverage extends to the wrist;
   the fingerless tips retain each crew member's skin color.
3. The wrench has softer forged edges, a less pointed adjustable jaw, a visible
   rack and a recessed worm-wheel backing. The RPG has a smaller rear collar,
   actual dark recessed bore geometry and softened metal edges. Its centered
   aim sightline is retained.
4. Tool steel is charcoal/grey, with distinct teal or ochre paint and localized
   chips. Broad directional grain was removed, cloth noise reduced, and metal,
   leather and cloth retain different roughness. Each asset still uses one
   1024-square color/surface set.
5. Reload rotates the support hand around the actual grasp point to hold the
   horizontal rocket. Repair rotates wrist and tool around the same handle
   point. Both actions retain the existing normalized simulation timing.

## Rebuild and measured budget

```powershell
blender -b --python-exit-code 1 --python tools/blender/first-person-gear.py -- --root REPO --round 2
```

The final complete headless build took **80.11 seconds**. Eight hand GLBs and
Blender sources, both tools, textures and **23 matched Blender views** were
retained. The manifest records exact source/asset/image hashes, timing and
camera settings. This remains the same 1280 by 720 camera, FOV 72 degrees,
near plane 0.15 m and identity camera attachment.

Hands use **3,320 triangles** each except Tusk at **3,200**. The RPG uses
**4,020 triangles/two draws**; the wrench uses **2,792/one draw**. The maximum
visible combination is **7,340 triangles and three draws**.

The two additional bounded samples are Rook reload at 1.65 s and Odessa repair
at 2.8 s. They supplement the earlier 1.1 s reload and 1.12 s repair samples.
Filenames now include time, preventing two samples of a clip from overwriting
one another. Round-one evidence has not been renamed or regenerated.

## Inspection

The builder inspected Rook idle, wrench idle and both reload phases, Odessa's
later repair phase, and Nell's wrapped forearms. The new volume, grip turns,
tool edges and quieter material grain are visible in those samples. Remaining
differences include simple cloth folds, limited glove surface detail, repeated
chip patterns and the depth/readability of smaller tool fittings. Actual
High/Performance captures and independent critique decide the next priorities.

No browser or frame-cost run was performed by the asset builder. No live port,
save, runtime source or test assertion was changed. The first focused-check
attempt could not import Three.js because the shared dependency target was
temporarily empty after lane cleanup; the Director restored the locked
dependencies before the focused check was resumed.

After restoration, `node tools/test-first-person-gear.mjs` passed **26/26**.
`git diff --check` also passed. These validate the retained geometry, bindings,
clips, structural budget and runtime controls; they do not assign art scores.
