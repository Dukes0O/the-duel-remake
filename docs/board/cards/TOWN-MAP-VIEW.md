# TOWN-MAP-VIEW

The short board entry controls current state, ownership, dependencies and locks.

The far end of the zoom: labels and markers on places, outposts, real trucks on real roads, reports pinned to the map, and clicking flies there. `src/town/view/town-map-markers.js`.

Design: [docs/WASTELAND_TOWN.md](../../WASTELAND_TOWN.md) and [docs/story/the-long-dry.md](../../story/the-long-dry.md). Read sections 2, 3, 4, 10, 11 and the checks in section 15 first. The camera rules are in section 12. **This game is for years of play and years of building (Kyle, 5 November): no fixed limits on people, buildings, map size or years; content lives in data under `src/town/content/`; a town saved today must load in every later build.** A pure sim file imports no DOM, no Three.js and nothing from `src/app.js`. Stay inside the files named here plus the scene and UI wiring named for this follow-up. If something the card needs is missing, write your choice on this card under "Codex decided (Claude to review)" and carry on, unless it touches saves, or a released course or replay, in which case stop and say so. Real numbers wherever a real number exists, and note the source of any you add. Every player-facing word is plain, in whole sentences, with no em dashes. Run the card's own checks and `npm run build`; Claude runs the lane tier and browser checks. Write `docs/changes/<card>.md` with a Removed section, and list what Claude should look at. No Chrome under `codex exec`. Memory-only saves. No new dependency, network request or key.

## Claude answers

## Codex decided (Claude to review)

- The marker model is a read-only view. Places use `SCABLANDS_PLACES`; outposts use their saved position or place id, with old records reading the content place id as a default; reports need a known location; trucks need an explicit origin, destination, route and duration. The current trade-trip record has only a distance, so it stays unpinned until it has a real route. No route or location is inferred.
- New outpost records store a place id only when town content gives an exact Scablands place id. Old records read that id from content without being rewritten. Tam's Ridge location is explicit; unknown outpost locations stay unpinned.
- The scene projects an uncapped marker list into reusable HTML buttons. It recalculates only when the camera or town tick changes, fades labels in toward Scablands zoom, and hides lower-priority overlaps. Pins take clicks only. Plan placement disables pin hit testing so the ground keeps the drag.
- A marker click starts a one-second camera flight and keeps the heading. Mouse or arrow input cancels the flight. Report pins also select and scroll the matching Reports panel item. Visits open reports read-only and expose no answer controls.
