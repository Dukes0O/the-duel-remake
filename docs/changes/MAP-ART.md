# MAP-ART: the pilot's map art

Card: MAP-ART (Claude, ART lane; built by a helper). Design: `docs/PILOT_MAP.md` sections 5 and 6.
Switch `pilot-map` (dev); nothing loads these models yet (MAP-VIEW does).

## What changed

- New recipe `tools/blender/pilot-map-props.py` (Blender, original geometry, flat colours; no
  third-party model, texture or photograph) and the ten GLBs it writes to
  `public/assets/models/pilot-map/` (2.5 MB): the five secret-course signs (logging-track
  arrows, start grid, camp-fire pits, chalk start line, lit lighthouse window) as paint, chalk
  and embers only, and The Table (mesa with a 110 m cliff and flat top about 400 m across,
  steel fire lookout, 1950s bush plane wreck with tail number N4471K, dirt strip with cairns
  and windsock, logbook). Origins and anchor empties are named in the recipe's header.
- `tools/art/pilot-map-sheet.py` makes the review sheet; three rounds are in
  `docs/board/looks/pilot-map/` with `round-3-review.md`.
- `tools/test-blender-output.mjs` lists the recipe; `public/assets/models/CREDITS.md` has its row.
  (`tools/art/catalog.json` is for downloaded sources; there are none here.)

## Open for Claude

- The mesa and the plane wreck are not a pick (see the review): they need a texture and a baked
  wear map, a follow-up card; the rest is a pick.
- Reuse: the signs carry empties for the game's existing fire and smoke sprites
  (`public/assets/heli/fire-fx.*`); the mesa's colours follow the game's desert sandstone. No
  existing desert-rock or weathered-metal mesh could be imported unchanged (they are built in
  code from textures, not GLBs).

## Changed assertions

None.

## Removed

Nothing replaced.

## Gates

24 October 2026, once, on the final commit (integration already merged): `node tools/test-blender-output.mjs`
(77 checks, includes the new recipe's path plan), `node tools/test-repo-hygiene.mjs` passed, `node
tools/run-tests.mjs --tier lane --changed --jobs 4`: 34 passed, 0 failed (344 s; a first run stopped
on `test-review-evidence` because each look sheet needs its own review note, which was added),
`npm run build`: pass. No browser or frame check: nothing loads these models yet (rule 9).
