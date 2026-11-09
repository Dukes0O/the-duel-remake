# TOWN-ART-SERVICES — paint shop round 9

## Builder review

| Measure | Score (1–5) | Note |
| --- | ---: | --- |
| Reference resemblance | 3 | The patched tin and multicolor drips match the photos. The front photo shows the shutter closed; this model deliberately has the requested keep-cut opening and dark interior. |
| Proportions | 4 | The body is 14.8 m long, 12.1 m wide and 10.8 m high, inside the 2×2 plot with clearance. |
| Materials | 4 | Photo-carved rusted corrugated tin remains distinct from the dark steel booth and colored drum enamel. |
| Color | 4 | Red, yellow, blue and green paint streaks show across the walls; the four drums use separate worn colors. |
| Detail | 4 | The booth cut, guides, roller and raised slats read as a spray-booth door. The drums are separate meshes. |
| Wear | 4 | The generated photos show uneven rust, patch plates, faded paint and long drips. |
| Readability at town zoom | 3 | The large booth opening and colored roof patches remain visible in the mayor view; Claude should confirm their balance at game distance. |
| Grounding | 5 | Every paint-shop mesh fits inside the 2×2 plot margin and touches ground or another piece. |
| Scene consistency | 4 | Weathered steel and salvage repairs fit the town service buildings. |
| Frame cost | Not measured | This is an art-only family asset, not wired into the game here. |

## Evidence and source

`round-9.jpg` compares each full-size 1024 px orthographic reference with a render of the exported GLB from the matching camera. It also shows left and right three-quarter views and the mayor view under even light on grey ground. Blender 4.5.13 rendered the imported family GLB. The sheet is 289,495 bytes.

The photo sources are four separate OpenAI ImageGen generations made on 7 November 2026. Their JPGs and credit are in `public/assets/models/wasteland/town/textures/`. The GLB is 7,728,892 bytes. Paint shop uses 4,786 triangles of the 5,000 limit. The shop body bounds are approximately X −6.11..6.03 m, Y 0.07..10.83 m and Z −7.20..7.23 m. All separate parts passed the plot and contact audit.

## Changes since the earlier service-building rounds

- Added only the paint shop. The accepted Town Hall, Forge, Workshop, scrapyard, motor pool and trading post recipes and models remain unchanged.
- The booth opening is an explicit `keep` carve with a dark inner wall. The photos show a closed segmented door, while the model shows it raised over the dark opening as requested.
- The roof plan has a small dark and colored patch on its left side that does not clearly match the source photo. This is left for Claude to judge rather than hidden in the sheet.

## Claude review request

Please compare the four photo/model pairs at the same cameras, especially the open booth versus the closed-door source and the small roof-plan patch. Check both three-quarter views and the mayor view for the paint marks, roof silhouette and four drums. Confirm the opening reads as a spray booth and remains legible at town zoom.

## Checks

- `node tools/test-blender-output.mjs`: 377 checks passed, 0 failed, on the final recipe.
- Browser and in-game checks were not run in this art lane; Claude handles those checks.
- Changed assertions: none. Race fingerprints: not applicable; race code is unchanged.

## Removed

- Removed the old procedural paint-shop wall drips, solid booth-interior block and extraction ducts; the carved body and its separate booth/drum pieces replace that path.
- Kept the card’s earlier review sheets, including the accepted root `round-9.jpg` for the trading post. This paint-shop sheet is in the `paint-shop/` subfolder to avoid overwriting it.
