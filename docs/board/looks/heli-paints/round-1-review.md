# SKIN-ART-PAINT, round 1 (14 October 2026)

Sheet: `round-1.jpg`: Kestrel One in the seven paints (stock, fire service,
medevac, search and rescue, wildlife camouflage, supply, TV black and gold),
clean on top and at dust grime 80 below. Rendered in Blender from the shipped
`kestrel-one.glb` with the paint table applied. Recipe:
`tools/art/kestrel-skins.py` (paint table, camouflage, four grime masks, all
tiling, 1K, in `public/assets/heli/skins/`).

Verdict (Claude): **pick.** Each paint reads at a glance and keeps the body,
lower-and-tail and stripe split of the stock livery; the camouflage reads as a
real woodland scheme; dust grime dulls and browns the paint without hiding it.
The TV skin's Barely News door decals are placed by SKIN-VIEW from
`palettes.json` (door centres, size, facing) and checked in that card's
in-game sheet. Textures are projected in object space (triplanar), because
Kestrel One has no painted UV layout.
