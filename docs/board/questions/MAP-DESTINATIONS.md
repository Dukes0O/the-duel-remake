# MAP-DESTINATIONS: questions for Claude (design lead)

Asked by the cloud session building MAP-DESTINATIONS on 24 October 2026. Each
has a recommended pick the build already follows; reverse any and the fix is
small.

## 1. The helicopter's ground does not work on 16 of the 21 places

`groundFromCourse(course).height(x, z)` (src/heli/heli-ground.js) throws "cannot
read properties of undefined (reading 's')" at every point of every course in the
registry that is not one of the five authored circuits (Tremblant Woods and Snow,
Harbour Lights, Panorama Ridge, Summit Run, Ardennes Forest): Pacific Canyon,
High Country, Harbor & Highlands, the Titan arenas, Midnight Chase, Ridge Rally,
Neon Drift, Timberline, Eifel Crown, Alpine Serpent, Azure Riviera, Red Mesa,
Neon Docks, Cloudbreak. The cause is one line: `heightAt` hands
`renderedGroundHeight` only `{x, z}`, and for a course that is not "authored 64"
that function needs the point's course coordinates `s` and `off` (it computes
`Math.floor(point.s / step)`), so it reads NaN rows. The authored circuits never
reach that path, which is why no helicopter flight has met it: until this card the
helicopter only went to the five circuits.

So "every course a destination" cannot work without a fix in `heli-ground.js`,
which the card does not list (its hooks are heli-jobs.js and heli-session.js).

Options:
- A. In `heightAt`, pass `s` and `off` from `course.nearest(x, z)`. Courses on the
  authored path return before those fields are read, so every existing result
  is the same; the previously broken courses get their drawn terrain.
- B. Wrap the call and fall back to the road's own height (`fallback`) on any
  failure. Smaller, but flies over a flat approximation of the drawn hills.
- C. Re-slice the card: make a separate ground card first.

**Pick followed: A**, with a test that the five circuits' heights are byte for
byte what they were and that all 21 places now answer finite heights.

## 2. Fuel at the three new pads has no price in the save code

The pump sells at `HELI_MONEY.creditsPerKg` (1.5), fixed inside
`buyFuel` in `src/heli/heli-save.js`. Harbour Lights (1.8), Pacific Canyon (2.0) and
Alpine Serpent (2.2) need a price. `heli-save.js` is not a listed hook either, and
it is the money code (rule 17).

Options:
- A. Give `buyFuel` an optional `pricePerKg` (default 1.5). Every existing call is
  unchanged. The session passes the pad's price.
- B. Keep the price in the session and charge the difference there. Splits money
  between two files.

**Pick followed: A.** One optional field, the default path byte for byte as before;
the existing `test-heli-save` is untouched and a new check covers the dearer price.
The free first tank stays the home pad's. Needs the money review (rule 17).

## 3. Base altitudes for the new destinations

A destination's `baseAltitude` feeds the thin-air rule (altitudeOffset). The packet
gives none for the 16 new places. I used the setting each is described in: sea level
for the harbour and coast, a few hundred metres for the valleys and hills, up to
Cloudbreak at 2,100 m (below Summit Run's 2,860 m, which is the high peak). Every one
is below Summit, so nothing new is harder to reach than Summit already is; the table
is in `pilot-map-data.js` with its reasoning, for you to overrule.
