# WW-GROUND

Status: implementation committed; required checks are waiting on the open
FULL TIER FOR RELEASE hold in `docs/playtest-inbox.md`.

## Changed

- Added the Scablands venue and eight named place anchors. It is registered as
  an arena venue and stays out of `COURSE`.
- Added one world-space height query for place flats, the outer ridge and the
  far wall, plus one surface query for the dirt road.
- Connected `Course` ground and surface reads to those shared queries. The
  oval frame stays separate from the winding map road.
- Added a headless test for venue routing, place-to-place driving, Tin Town
  walking, Titan ridge climbing and height continuity at 128 m chunk edges.

Design choice: the venue uses the stable oval frame, with the dirt road held in
world-space ground data. See the decision on the card.

## Checks

- `git diff --check`: passed.
- `node tools/test-scablands-ground.mjs`: not run; the inbox still has an open
  FULL TIER FOR RELEASE hold. Recheck the inbox before starting it.
- `node tools/test-world-composition.mjs`: not run for the same hold.
- Replay guards: not run for the same hold. Expected fingerprints were not
  changed.
- `npm run build`: not run for the same hold.
- Browser and look checks: Claude runs them. Please check that the road reads
  as a continuous route through all eight places, Tin Town stays flat across a
  ground chunk edge, the outer ridge rises before the far wall, and the Scablands
  remains absent from the main circuit picker.

Changed assertions: none. Race fingerprints: unchanged and not re-recorded.

## Removed

No prior path or asset was replaced.
