# LAB-LIFT-2

Switch: `lab-2`, dev. Branch: `codex/lab-lift-2`.

## Design settled before code

The lesson packet owns its words, pad loads, prediction pictures and model
animations. The existing frame owns teaching state and the existing flight
challenge keeps its rewards. The model uses the real Kestrel and Dusthawk.
The left-hand lever accepts dragging and held Up/Down; load objects are
clickable, with named buttons for keyboard access. No slider is used.

Flight numbers come from `heli-flight.js`; car and crate masses come from
`heli-cable.js`. Fuel cans transfer a quarter-tank each. The pad offers zero
to four crates, the Dusthawk, and zero to a full tank. A supported hover
matches forces at a small height above the pad; ground lift and hover lift
use their respective ground-effect factors.

Design conflict found: a full-tank Kestrel can lift the Dusthawk alone.
Requested Kyle's decision on using the Dusthawk plus visible crates for the
failed-lift example; no flight number will be changed to manufacture failure.

## Checks planned

- Pure test: every offered pad load against flight-rule thrust and one real
  flight step; vocabulary order, force comparison and end-to-end teaching.
- Memory-only browser scenario: every step, drag and held-key lever, load
  objects, predictions, help and unchanged challenge, with step captures.
- Lane tier, jobs 4; build; independent code review; one art round and sheet.

## Changed assertions

No existing assertion changed.

## Removed

Brian's reused Rook reference is replaced by his own model. The old bench
remains available with Lab 2 off until LAB-LESSONS-2 replaces it at go-live.
