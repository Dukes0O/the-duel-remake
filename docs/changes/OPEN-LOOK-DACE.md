# OPEN-LOOK-DACE, round 1

A local Claude Opus session, 26 November 2026. Behind `story-choices`. Waiting on Claude's verdict; round note and sheet in
`docs/board/looks/open-dace/`.

- **Changed:** Dace Goes Looking draws real things in code. Moss's pickup is a truck of its own (`dace-pickup-look.js`): worn
  paint, rust at the arches, a bonnet that opens, a tyre that goes flat, the cover on and dropped, Rell's blanket, lamps and
  their light on the road, the key on the shed wall. The Walker stones, his tracks, the Deep Sign, the Hangar and the Crow's
  Step are in `dace-sites-look.js`; the shared kit is `dace-look-kit.js`. The pickup stands 0.55 m forward of its spot to
  clear the forge shed, and keeps to the ground as it drives off. Names, spots and the show-and-hide rules are unchanged.
- **Checks, on `8da3c0ff5`** (current integration merged in): rule 23 set with `test-open-dace-goes-looking` and the new
  `test-dace-look`, 6 suites passed; `npm run build` passed; browser scenario `look-dace` (14 pictures, each within its
  budget) passed on the laptop. No frame check (rule 9). No assertion of an older suite changed.
- **Also touched:** `tools/open-look-stand.js` (eight rows, and a row may ask to stand on the drawn ground),
  `tools/run-browser-scenarios.mjs` (the new files in two scenario areas), `docs/ART_LINE.md` (six lessons).
- **Sound:** no new game event.
- **Removed:** the race car body and the boxes that stood in for the pickup, the stones, the tracks and the three places.
