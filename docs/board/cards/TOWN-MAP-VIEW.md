# TOWN-MAP-VIEW

The short board entry controls current state, ownership, dependencies and locks.

The far end of the zoom: labels and markers on places, outposts, real trucks on real roads, reports pinned to the map, and clicking flies there. `src/town/view/town-map-markers.js`.

Design: [docs/WASTELAND_TOWN.md](../../WASTELAND_TOWN.md) and [docs/story/the-long-dry.md](../../story/the-long-dry.md). Read sections 2, 3, 10, 11 and the checks in section 15 first. **This game is for years of play and years of building (Kyle, 5 November): no fixed limits on people, buildings, map size or years; content lives in data under `src/town/content/`; a town saved today must load in every later build.** A pure sim file imports no DOM, no Three.js and nothing from `src/app.js`. Stay inside the files named here. If something the card needs is missing, write your choice on this card under "Codex decided (Claude to review)" and carry on, unless it touches saves, or a released course or replay, in which case stop and say so. Real numbers wherever a real number exists, and note the source of any you add. Every player-facing word is plain, in whole sentences, with no em dashes. Run the card's own checks and `npm run build`; Claude runs the lane tier and browser checks. Write `docs/changes/<card>.md` with a Removed section, and list what Claude should look at. No Chrome under `codex exec`. Memory-only saves. No new dependency, network request or key.

## Claude answers

## Codex decided (Claude to review)

- `town-map-markers.js` exposes an uncapped, read-only marker model and camera-focus helper. It uses only coordinates already present in the Scablands places, town records, road paths, or report facts. A truck or outpost without a saved map position stays unpinned; the view must not guess where it is.
- The card names only the marker module, so this lane does not edit `town-scene.js` or UI input wiring. Claude should check how to connect marker rendering and clicks in the browser review. The named helper supports the camera-focus action.
