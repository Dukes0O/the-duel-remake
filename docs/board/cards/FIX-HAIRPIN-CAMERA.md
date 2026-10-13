# FIX-HAIRPIN-CAMERA

The short board entry controls current state, ownership, dependencies and locks.
These are the card's detailed design, acceptance and recorded decisions.

Split from FIX-LIVE-EDGES finding 6 (Claude, 13 October 2026). Kyle, playing
Harbour Lights: at Lantern Hairpin the chase camera ends up behind the wall
between approach and exit and hides the car.

## Settled

FIX-LIVE-EDGES adds the pure line-of-sight function in
`src/camera-clearance.js`. This card adds only its single call in
`src/render3d.js` after camera damping, on every course: when a wall or solid
kit piece lies between camera and car, the camera pulls in and rises until
the view is clear. Tunnel ceiling behaviour stays exact. No mutable global
camera state, no guessed centreline target.

## Acceptance

The review frame at Lantern Hairpin's apex shows the car; a sweep of the
camera round the Harbour lap finds no wall between camera and car. Lane tier,
build, one review. Live only at a release on Kyle's "go live".
