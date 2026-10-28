# MAP-FINISH (go-live, Claude, 27 October 2026, night)

The map build items landed on 26 October (fire-pit flames and smoke, names
spread with measured boxes; look sheet `docs/board/looks/pilot-map/look-1.jpg`).
Claude judged the sheet: names around the home pad no longer overlap, the
Table landing and logbook read clearly, the fire pits burn. The left-over
notes (a partly buried fire ring, a faint night chalk clue, small course
outlines) are polish, not faults a player is stuck on. Rule 18: the map goes
live in the next release.

## Change

`pilot-map` switch from `dev` to `on`.

## Changed assertions (Claude's written review, rule 18)

- `test-feature-flags`: `pilot-map` moves from the dev list to the released
  list; every other switch unchanged.
- `test-map-destinations` and `test-pilot-map`: "the pilot-map switch is a
  dev switch" becomes "the pilot map is released". The go-live is the change;
  nothing else in either suite changed.

## Tests

test-feature-flags 125 checks, test-map-destinations 499, test-pilot-map 300,
test-map-view 529. Lane tier and build below.

## Removed

Nothing; the dev state of the switch.