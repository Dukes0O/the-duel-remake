# SUMMIT-FINISH-AREA

The short board entry controls current state, ownership, dependencies and locks.

Kyle, 26 October 2026: "Seems like we should have a better finishing area
for the summit." CIRCUITS.md section G promised a finish straight to the
summit hut and observatory with lit windows.

## Claude's design

The top of a 13.6 km climb should feel like arriving somewhere.

- **The finish straight** ends at a stone-and-timber **summit hut** on the
  left and a small domed **observatory** on the right, windows lit at dusk
  and night. A timber finish gantry with the chequered banner spans the road
  between them.
- **People:** a handful of spectators along a snow fence on the last 200 m,
  bundled up, waving (reuse the existing crowd figures).
- **A helipad** beside the hut with an H and a windsock. This is the Summit
  Run pad the helicopter already lands at (rescues and return loads,
  HELICOPTER.md 13), so the finish and the flying world meet in one place.
- **Run-off:** a wide, flat car park past the gantry so a car at full speed
  can stop without hitting anything.
- **Yeti:** keep its spots; one set of big footprints in the snow behind the
  observatory (a nod to Gus's logbook 3).

Art: Blender recipes in `tools/blender/`, original, gritty, not toy-like; at
most three look rounds (SPEC 0.11), one comparison sheet per round under
`docs/board/looks/summit/`. Claude judges each round and sends Kyle the pick.
Acceptance: the look accepted, drive-through check, lane tier and build;
Claude runs the Summit frame check (finish view, eight cars) before release.

## Claude's verdict, round 1 (26 October 2026)

Not accepted. At night and from far off, the hut and observatory read as two
small dark lumps beside the road, the gantry is a thin bar, and the crowd,
helipad, lit windows and run-off are not visible. Round 2:
- **Scale and place:** hut and observatory each at least 12 m across, within
  20 m of the road, either side of the line, so they frame the finish.
- **Light:** warm lit windows in both, a lamp on the gantry and two on the
  fence; judge at dusk and at night.
- **Gantry:** about 7 m high, two timber posts, a chequered banner and
  "SUMMIT" lettering, wide enough for the whole road.
- **Crowd:** a dozen figures along the last 200 m of fence, visible from the
  car.
- **Helipad:** beside the hut with an H circle and a windsock.
- **Run-off:** the flat car park past the line, joined to the terrain.
- **Pictures:** from the car 100 m and 30 m before the line, at the line,
  from the helipad, and one wide shot; High and Performance; dusk and night.
The Glacier Hairpin drive result is the known QA-SUMMIT-GLACIER-EDGE, not this
lane's. The scene signature changes only after the look is accepted.

## Claude's verdict, round 2 (26 October 2026)

Much better and close: the red timber hut and the domed observatory with warm
windows frame a timber "SUMMIT" gantry, and the fenced run-in reads well at
dusk and night. Round 3 (the last, SPEC 0.11) fixes only these:
1. **At-line views are blank** (the camera sits inside or under something).
   Fix the capture so the line shot shows the gantry overhead and the car
   park ahead.
2. **Crowd:** a dozen bundled-up figures along the last 200 m of fence,
   standing close enough to the road to read from the car at 100 m and 30 m;
   a few with raised arms. Reuse the existing crowd figures.
3. **Car park:** the run-off is a flat grey slab. Give it packed-snow ground
   matching the terrain, low snow banks along its edges, two parked cars and
   a lamp post, so a car at speed can stop and it looks like a place.
4. **"SUMMIT" lettering** on the gantry about twice as large.
5. **Helipad:** keep the working pad where it is (moving it would change the
   helicopter's landing rules). Draw a clear H circle and a windsock on it,
   and a short marker-post path from the hut toward it.
Then the round-3 sheet (same views) and stop. Claude picks and sends Kyle the
result.

## Claude's verdict, round 3 (26 October 2026): accepted

Round 3 is the pick (the cap): big SUMMIT lettering, gantry lamp, lit hut and
observatory, a car park with cars and a lamp past the line, the helipad with
its H and windsock. The crowd is thinner than asked; accepted. Signature
review: update exactly two expectations to the measured values, nothing
else: Summit's scene signature in `tools/fixtures/world-signatures/` (from
fa6b9ba2... to b9d81ca4..., geometries 112 to 192) and Summit's far-ground
hash in `tools/fixtures/ground-rows-hashes.json` (69a91699... to
3f03c09d...), both the reviewed finish area and car-park ground. The jump to
192 geometries is checked in Claude's Summit frame check before release.
