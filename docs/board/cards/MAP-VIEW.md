# MAP-VIEW

The short board entry controls current state, ownership, dependencies and locks.
The design is `docs/PILOT_MAP.md`; this card names the slice, files and acceptance.

Codex (needs the screen). Pilot's map sections 2, 3 and 5. Switches
`helicopter` and `pilot-map`. Needs MAP-DATA, MAP-DESTINATIONS, MAP-SECRETS
and MAP-ART.

- **The map screen:** drawn from `pilot-map-data.js` and the generated
  outlines in the chart look of section 2 (paper, contours, tints, ink
  outlines and names, pump signs with prices, scale bar, north arrow), the
  tank's reach ring, your helicopter, your special cars, today's jobs, burnt
  courses, found secrets and the "?"; the moving map's grid and bearings
  when the Lab upgrade is owned. Click a place to set the destination.
- Opened from the dispatch board's Map button and by a free key in flight
  (listed in the controls help).
- **Scouting:** corner names drawn on the ground of an owned course while
  flying over it.
- **The signs and the Table** drawn in their worlds; the Table's lookout
  with the logbook page as a card.
- Browser scenario (private port, memory-only storage): open the map, set a
  destination, cruise there.

Owns: `src/heli/pilot-map-view.js`, `src/heli/pilot-map.css`, the scenario,
`docs/changes/MAP-VIEW.md`. Hooks: `src/heli/heli-ui.js`, `src/app.js`,
`src/render3d.js`, `src/controls-help.js`. Locks: `busy-game-files`.
Sound: `map.open`, `map.close`, `map.pin` (from recipes, one sound-bank row
each: take `sound-bank` briefly), `heli.found`. Art: MAP-ART.

Acceptance: the scenario; the map never changes helicopter state except by
setting the destination through the session; lane tier, build, one review.
Removed: nothing.
