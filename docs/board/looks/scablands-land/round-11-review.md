# Scablands land, round 11: hill country (slice 2c)

Sheet: `round-11.jpg` (top row: the Breaks from the Burn Road, a valley of the Breaks, a mesa from
the plates' way; bottom row: at a mesa's foot, a scarp's face, the river bank from the bed).
Pictures from the real game in a visible browser window on the QA page with memory-only saves,
Performance, taken 15 November 2026 with scenario `tools/scenarios/scablands-hills.mjs`, with
`scablands-realism` on. Codex built the hills, the sight rules and the picture check over some
ninety short runs; Claude set the numbers, drew the hills' surface and judged these pictures.

## Verdict (Claude): passes, merged, switches off

The land has shape. From the Burn Road the Breaks are a range of hills with valleys between; a
mesa is a dark table mountain from two kilometres and a wall of fractured rock from its foot; the
river's bank is layered rock; nothing floats and the camera stays above the ground.

## What changed between the first build and this one

- The first table was thirteen smooth domes. It is now 22 hills in the Breaks (40 to 72 m), six mesas (31 to
  35 m), six foothills (18 to 26 m), a dune field of 14 (8 to 9 m), the Lookout (60 m) and the
  Ridge's top (45 m): fifty in all, placed from the land's seed, each with spurs.
- Mesas at 15 to 25 m read as a sliver on the horizon. They are 31 to 35 m, the most a 220 m ramp allows at a slope a car climbs.
- Stones and bushes hung in the sky wherever the near ground had changed. Cured.
- The camera sat inside the hillside on a slope. It now keeps 1.2 m above the drawn ground.
- A scarp's face drew solid black (its normals were not rebuilt with its corners). Cured.
- The picture check could not fail. It now fails when the car is off screen, a thing stands off
  the ground, the camera is under the ground, or the hill a view is named for is out of view.

## Drawn by Claude

A hill is worn rock: level beds of buff, red, grey and pale stone show as bands round its sides,
and rills run down every slope (`createHillField` and the hill block in
`src/world/scablands-ground-look.js`). Dunes stay sand. A hill in the salt pan shows rock on its
slopes. A bush's picture is kept inside a rounded outline, so a far bush is a tuft, not a square.

## Short of right, kept for a later round

- From its top the Lookout still reads as level salt; the flats below show only as a thin band.
- The dunes are low ridges on the horizon; a crest does not yet look like something to hide behind.
- The Ridge shows no rise from its road. It is a named place and stays level.
- Hills are still smooth at a distance: the bands are faint and the spurs do not show as gullies.
- A scarp's face is rock now, but its buttresses repeat at an even spacing and read as built.
- A hill of the Breaks seen from a crest shows a smooth grey band where it should show broken rock.
- Cover from the furnace on the plates' way is not built here; it goes with EVERBURN-REMAKE job 1.
- Judged in still pictures. A drive in real time over the hills, and the frame check, are owed
  before any switch is turned on. The camera change is in `src/render3d.js`, so a release needs a
  frame check.
