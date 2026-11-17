# HELI-EDGE

Claude. Kyle, 16 November 2026: "summit run doesn't work. you can not fly
there...it just goes off the map and stops. you should also be able to see the
headings where you are trying to fly to."

## Claude decides (16 November 2026)

Flown by hand from the home pad: with a destination chosen, the helicopter
flew on past the edge of the flying area over an empty, undrawn plain, with
only a small orange bar saying to press ENTER; with none chosen, the edge held
it still. Nothing on screen said which way the place lay. The session itself
reaches Summit Run when the cruise is accepted.

1. **The edge always holds the helicopter in.** Beyond it the world is not
   drawn, so nobody flies off the map.
2. **The cruise starts by itself.** At the edge with a destination chosen,
   "Flying to Summit Run in 3. Press ENTER to go now." After 3 seconds the leg
   starts on its own. Short of fuel, the bar says what the leg needs and what
   is in the tank, and to land and fill up.
3. **Nowhere chosen:** at the edge the bar says to choose where to fly in FLY
   TO or on the pilot's map (N).
4. **HEAD FOR beside HEADING:** the heading to turn to and where it leads,
   "320, Summit Run · 15.6 km"; once there, the landing pad or the ski pad.
   Hidden in the Lab's headings challenge, which is about finding the way
   without it.

Checks: `test-heli-mode` (fly the HEAD FOR heading into the edge, held there,
the cruise by itself, arrival; nowhere chosen held; a refused leg stops the
countdown), `test-heli-view` (the gauge and the bar's words), a hand flight
in the browser.
