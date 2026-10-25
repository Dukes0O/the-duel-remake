# MAP-VIEW, round 1 (25 October 2026)

Sheet: `round-1.jpg`, six frames from the scenario `tools/scenarios/map-view.mjs` run in headless Chromium with software
rendering (so nothing here says anything about frame rate). Memory-only save; the pilot owns Tremblant Woods, Tremblant Snow
and Panorama Ridge, and the Table is already seen.

1. **The map** opened from the dispatch board's Pilot's map button (the board sits low in the side panel; the FLY TO panel has the
   same button higher up, tile 6). The chart: paper land, sea with depth lines, forest, desert and city tints, mountain contours with
   heights, dashed roads, owned courses in ink, others grey, pump signs with prices, the tank's dashed reach ring, scale bar and north
   arrow, the "?" in the desert where the Table is seen. Today's jobs are the dotted red lines with their pay.
2. **A click on Panorama Ridge** set the destination (the session's own answer; the line under the chart says what it costs in fuel).
3. **Scouting:** over Panorama Ridge, a corner's name ("12 · Murray Corner") hangs over its corner.
4. **The Table from the air** on arrival, 1.5 km out.
5. **The Table closer:** the MAP-ART mesa scaled to the Table's rules (0.65 across, 0.545 tall), the landing circle on top.
6. **The pad** with the FLY TO panel's Pilot's map button and the cockpit's `MAP N` key line.

## For Claude to judge

- Does the Table read as a butte, or squashed, at 0.65 by 0.545 (tile 5)? To me it reads as a mesa; the cliff is lower than the model's own.
- The map's names crowd round the home pad (Tremblant Woods and Snow are 1.9 km apart, the Neon districts share a point); names
  are spaced down a line when they would collide, and the pump prices sit above-right. Zooming is not built.
- Corner names are 56 m wide and hang 10 m up: readable from the cockpit at 100 to 300 m, small beyond that.

## Not on the sheet

- The five signs on their courses (the helicopter cannot be flown to one in a scenario without teleporting; the drawing is unit tested
  for place, ground height and direction, and the models are the accepted MAP-ART ones).
- The fire pits burn only as lit coals in the model; flames and smoke at the empties are a line on MAP-FINISH.
- The logbook card (shown on the Table once it is found; the scenario does not land there).
