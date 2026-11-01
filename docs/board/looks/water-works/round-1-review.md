# WATER-YARD-ART: round 1 of 3

waiting_on: claude (pick for Kyle)

Sheet: `round-1.jpg`, nine panels, 3 by 3, chapters 0 to 8 in order. Every panel uses the same
camera (front right, looking back across the pipe), the same late-afternoon sun and the same dirt
ground, so only the stage changes. Each panel is labelled with the chapter number, a short plain
name and one line saying what is new in that chapter.

Source: `tools/blender/water-works.py`, run with `--render`. The pictures are Blender renders of
the same scene that is exported to
`public/assets/models/wasteland/scrapdome/water-works.glb`; they are not game frames, because
the group is not in the game yet. No retouching. Rebuild the sheet with
`python docs/board/looks/water-works/round-1-sheet.py --captures .qa-dist/water-works --output docs/board/looks/water-works/round-1.jpg`.

## What the panels show

| Panel | Nodes shown on top of the always-on set |
| --- | --- |
| 0 The dry well | `pipe-cut`, `valve-missing`, `boiler-cold`, no truck, tower empty |
| 1 Pipe patched | `pipe-patched` (replaces `pipe-cut`), `tower-water-1` |
| 2 Fuel for the pump | `pump-fuel`, `tower-water-2` |
| 3 The valve is back | `valve` (replaces `valve-missing`), `tower-water-3` |
| 4 Pump house roofed | `pump-house-roof`, `tower-water-4` |
| 5 The boiler is lit | `boiler-lit` (replaces `boiler-cold`), `tower-water-5` |
| 6 The water truck is home | `water-truck`, `tower-water-6` |
| 7 Tower to the top line | `tower-water-7` (water at the painted red line) |
| 8 Water runs | `tower-water-8` (brim full), `well-water`, `tap-running` |

Always on: `well`, `pump`, `pump-house` (walls), `truck-bay`, `tower`, `camp-tap`.

## Node list (the GLB)

Root empty `water-works`; 25 children: `well`, `well-water`, `pump`, `pump-fuel`, `pump-house`,
`pump-house-roof`, `pipe-cut`, `pipe-patched`, `valve-missing`, `valve`, `boiler-cold`,
`boiler-lit`, `truck-bay`, `water-truck`, `tower`, `tower-water-1` to `tower-water-8`,
`camp-tap`, `tap-running`. About 29 m wide, 13 m deep, 11 m tall. Origin on the ground in the
middle of the group, front toward -Z (seen from the gate: well left, tap right).
Suggested yard placement (yard.glb frame): position (-4, 0, 31), no turn.

Size: see the change note; the GLB is under 2 MB with eleven small painted textures, no big
images. Under 23,000 triangles for every node together; about 18,000 at the last chapter.

## What to judge

- Gritty, welded, rusted scrap rather than clean or toy-like.
- Does each chapter show clearly in the yard (cut and patched pipe, roof, lit boiler, truck,
  eight water heights with the red top line at level 7)?
- What to change in rounds 2 and 3.
