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


## Round 2 handoff ? Codex, 26 October

Round 2 sheet: `docs/board/looks/summit/finish-area/round-2.jpg`.
Five poses ? High/Performance ? dusk/night = 20 native pictures.
The camera is 1.65 m above the road at 100 m, 30 m and at the line;
the other two poses are from the actual pad and a wide view.

Built: 14 ? 12 m hut and 14.4 m dome, centres 17 m either side of the
road and 16 m before the line; warm glazing, SUMMIT lettering, three lamps,
twelve crowd figures facing the approach, and a level parking terrace with
its grade blended into continuous terrain. Yeti spots are unchanged.

Pad decision remains open: the operational ski/rescue pad is unchanged,
about 240 m before the line. A packed path connects its yard to the hut.
Kyle was asked whether to move the operational pad and its ski/rescue rules;
no answer yet. The path is the conservative temporary choice, not a claim
that the pad now stands beside the hut. Claude must settle this exception.

No round 3, frame timing or scene-signature update. The Glacier Hairpin
result belongs to QA-SUMMIT-GLACIER-EDGE. Round 2 code review is clear.
Checks and evidence are in `docs/changes/SUMMIT-FINISH-AREA.md`.

Test review still requested: R1's exact kit registry count 39 ? 40 and
appended `summit-finish` ID; original 35 IDs/order unchanged. R2 adds a
focused actual-ground/height-query/landmark check. No existing assertion
was changed for round 2.
