# R34 shape: round 2 self-review

Claude's round 1 verdict: **FAIL**, it reads as a generic old saloon, not an R34.
The cabin was a tall box too far back, the bonnet sloped down, and the wheels
and arches lacked the R34's broad coupe stance.

Round 2 is complete for Claude's art verdict. Stop after this round.
The paired front, rear, side and three-quarter views show the actual builder
export rendered in Blender beside the supplied synthetic reference pictures.
They are not in-game captures or proof of driving readability. No logos,
reference textures or maker models are used by the game.

## Changes against the reference

The roof is about 10 percent lower. The A-pillar base moves forward to just
behind the front axle, with a long rear screen into the short deck. The bonnet
is level with a slight centre crown and a higher square front. Raised slim
headlights wrap at the corners, mesh fills both intakes, round fog lamps sit
low, and the lip remains separate. Pronounced arch lips, wider tyres, larger
six-spoke silver alloys, side skirts and a door crease give a broader stance.
Black seals are exposed inside the painted window pillars; glass is darker.

The rear keeps four round lamps in the blue panel, with larger outer lamps.
The wing has two uprights and spans nearly the body width. Its height was
reduced after inspecting this round so it sits below the roof. One large
right-side exhaust outlet clears the black diffuser. It replaces the packet's
twin tips because Claude's latest brief explicitly requests one. The blue
paint has a softer metallic and clearcoat response. The left-seat driver and
red calipers stay. Driver size and seat height follow the lower cabin, with
the existing helmet-clearance assertion still passing.

## Self-scores (1 to 5)

- Resemblance: 4 for this shape stage. The lower forward coupe cabin, level
  high nose, flares, larger alloys and four-lamp rear read as the requested
  R34 study. It remains a simplified model, subject to Claude's verdict.
- Readability: 4 in the four static views. Driving readability is unmeasured.
- Grounding: 4. All four actual tyres contact local zero in the contract test.
- Consistency: 4 for the blue road-car shape and silver/black trim in this
  neutral studio. No claim about lighting on a course.
- Geometry cost: 4. 54,198 visible triangles and 48 draws, below 60,000/56.
  No frame measurement was run or claimed.

## Five largest remaining differences

1. The bonnet, bumper corners and rear quarters need smoother compound
   stamped-metal curves; their reflections are still too planar.
2. Headlight housings need a more detailed angular lens shape and internal
   reflectors. The current projectors and corner wraps are simplified.
3. The round rear lenses need layered reflectors and varied lens colour.
4. The roof needs a subtle bow and rounded windscreen corners, rather than
   the current mostly flat panel and straight pillars.
5. The cabin, wheel barrels and tyre shoulders need finer material detail.

These are detail-stage limits, not a claim of release readiness. V3 owns
further detail work. No round 3 was started. Within round 2, inspection softened
paint glare and lowered the wing; code review exposed and corrected a partly
hidden exhaust rim and window seals buried inside painted pillar tubes.

Final sheet: 255,806 bytes, under 500 KB. The requested scratchpad copy has
the same SHA-256: 87097c2df1960b3dc9a07516457b9ae986673c026bd06ffa40ffe85a338fea54.
The superseded round-1.jpg was sent to the Recycle Bin and removed from Git.

## Rebuild the sheet

1. Export with `node tools/art/car-review-export.mjs skyline-vehicle.js createSkylineVehicle .evidence/2026-10-28/NISSAN-SKYLINE-GTR-R34-V2-round2/skyline.glb`.
2. Run Blender with `-b --factory-startup -t 2 --python tools/art/skyline-review.py -- --root . --glb .evidence/2026-10-28/NISSAN-SKYLINE-GTR-R34-V2-round2/skyline.glb --out .evidence/2026-10-28/NISSAN-SKYLINE-GTR-R34-V2-round2`.
3. Compose with `python tools/art/skyline-sheet.py .evidence/2026-10-28/NISSAN-SKYLINE-GTR-R34-V2-round2`.

Front, rear and side use orthographic cameras; three-quarter uses perspective.
The model remains behind nissan-skyline in dev, without a shop entry.
Claude's art judgment and written assertion review remain pending.
