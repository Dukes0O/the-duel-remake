# TOWN-ART-TRUCKS-1 | Round 5

5 November 2026. Candidate art for Claude's look review; no game loader or
selection logic changed. The round 5 sheet is in
`docs/board/looks/town-art-trucks-1/round-5.jpg`.

## What changed

- Rebuilt the four 1950s work trucks in `tools/blender/town-trucks-1.py` with
  smooth lofted pressed-steel cab and bonnet sections, thicker folded arches,
  single-bar bumpers, headlights, side steps and darker road tyres. The fire
  truck now has nested hose coils and a single rear axle. Tanker, supply and
  tow rigs use dual rear wheels. Their tank, slatted cargo bed, sacks and tow
  lattice gained photo-specific equipment details.
- Darkened and color-balanced the four existing 512 by 512 paint photographs.
  The tanker cab is blue-grey, supply body olive and tow body ochre. The recipe
  uses direct image-to-color links and `town_base.make_materials` plus
  `town_base.export_glb`; no atlas is embedded.
- Kept the model at the card's public path. In
  `tools/test-blender-output.mjs`, changed the truck's candidate guard from an
  absence check to the existing GLB triangle and byte budget check. This is
  the card-directed guard change for Claude to review; no budget was loosened.

The exported GLB is 2,779,784 bytes. Triangles: fire 8,699; tanker 11,853;
supply 9,797; tow 9,651. The recipe rendered all four images after reimporting
the exported GLB into an empty scene. Means from one painted photo panel and
the matching rendered panel are fire (127, 71, 70) / (133, 75, 72), tanker
(107, 86, 72) / (104, 85, 73), supply (139, 124, 108) / (138, 130, 111), and
tow (162, 147, 137) / (141, 129, 118). Every channel is within 15%.

## Review and checks

- Visual review: round 5 remains a candidate, not a visual pass. The sheet
  shows smoother bodies and more distinct jobs, but cab proportions, the fire
  reel, tanker wear and boom detail still need Claude's look review.
- Blender render: passed; four exported-GLB renders produced.
- `node tools/test-blender-output.mjs`: passed, 239 checks and 0 failures.
- `node tools/test-repo-hygiene.mjs`: passed; size targets are advisory.
- Browser and game checks: not run; the trucks are not wired into the game.
  Claude should review the cab/bonnet silhouettes, hose loops, tanker wear,
  sacks and tow boom on the round 5 sheet.
- Lane tier and build: not run, as directed for this art task.
- Changed assertions: none. The truck's guard now reads the public GLB and
  applies the existing byte and triangle limits. No race fingerprints changed.

## Removed

- Deleted the round 3 sheet and review note; round 5 replaces that evidence.
- Removed generated intermediate renders, the editable Blender scene, and
  scratch output after the final sheet was made.
