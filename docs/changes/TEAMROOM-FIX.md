# TEAMROOM-FIX: map markers answer to the mouse, and the pictures look down from above

Claude (Opus agent), 11 October 2026. Kyle found two things in the live Team Room: the flags and
numbered corners on the map "can be clicked but don't action anything", and the pictures should look down
from overhead like the race view, not from the driver's seat. Design: `docs/CIRCUITS.md` section 7b.
The Team Room still changes no race state, profile or setting.

## 1. Why the map markers did nothing

The game has one global rule, `button:active{transform:translateY(1px)}`. Each map pin was placed with
its own `transform:translate(-50%,-135%)`. While the mouse button was held down the global rule replaced
that transform, so the pin jumped out from under the pointer, the button was released over a different
element, and the browser dropped the click. A log of the real events showed it: `pointerdown` on one
pin, `pointerup` on the map behind it, `click` on the map. A script that calls `.click()` never
sees this, which is why it looked fine in a quick check. The numbered corners (drawn in the map picture)
had no click at all. On top of that, pins that share a spot on the map (a crest on a corner's exit, the
signature view on a crest) covered each other, and the hover rule raised a pin, which reshuffled the
stack under a held mouse.

What changed (`src/screen-team-room.js`, `src/screen-team-room.css`):

- Pins are placed with margins, not a transform, so the global press rule cannot move them.
- Pins that crowd each other are pushed apart until each has its own spot (`spreadMarkers`, 46 map units),
  with a thin line back to the true position on the road. No hover raise.
- Numbered corners that have a flag are buttons (`role=button`, tab stop, Enter and Space) and choose that
  flag. Corners without a flag stay plain.
- Choosing from the map runs the same `select` as the list: marker, list item and corner all show chosen,
  the list scrolls to the flag, the picture and the engineer's note appear.
- A name label shows on hover and on keyboard focus (one shared label, kept inside the map).

## 2. The new picture

An elevated chase view, like the race camera pulled up and back (`trackSnapshotPose`, `src/track-analysis.js`):
the eye is 9 m above the road and 18 m behind the viewing point on the centre line, field of view 58
degrees, no HUD (the picture is copied straight from the renderer). The player's own car is parked at the
viewing point so the frame reads like the race view (`drawTrackSnapshot`, `src/render3d.js`).

- **Corner flag:** viewed from the braking point, but never from further than 60 m before the apex (a
  corner braked for from 300 m away would be a speck), and aimed at the real apex. An authored corner flag
  that stands earlier on the road than the apex (Pine Drop, Beaver Hairpin, Hell Gate, The Cutting,
  Forrest Elbow) is still aimed at the matching corner's apex; one with no matching corner, or with a
  written `camera`, keeps its written view.
- **Crest, passing zone and signature flag:** viewed 30 m before the feature (the author's `back`), aimed
  `ahead` metres past that point, looking down the road over the feature.
- Inside a tunnel the eye stays under the roof (7 m). Where another stretch of the lap passes close beside on
  higher ground (Harbour Lights: the road below the Lantern Hairpin runs beside its approach), the eye rises
  to 9 m above that road, so the camera never skims a deck. Only Fishmarket Bend on Harbour Lights needs it
  (17 m up); that corner is dark and the road wide at night, so it reads faintly (the player's car is below
  the frame there). Harbour Lights is still dev-only.
- A flag that stands for an analysed corner is aimed at that corner's apex whatever its kind (Lantern Hairpin
  is a signature flag on a corner); the `camera` written for it in `harbour-lights.js` was removed for that.
- Caption: "Live track view · from above the braking point" (corners) or "· from above the approach" (others).
  The study text and the engineer's footnote say the same.
- Authored `up: 1.2` was removed from the three circuit files; an authored `up` still wins. Pictures are
  rendered live and never stored, so there are no files or cached data to regenerate.

## Checks

- `tools/test-team-room-views.mjs` (new, lane tier through its imports): for every closed event and route
  (27), every flag (291, 59 of them corners) the camera is 8 to 10 m up and 18 m behind, the feature is in
  frame and not hidden by the road, a corner's exit is in frame, no eye inside a tunnel roof.
- `tools/test-track-analysis.mjs`: changed assertions, explained below.
- `tools/scenarios/team-room.mjs`: on Tremblant Woods, real mouse presses and real Enter on map pins and
  numbered corners (list scrolled, picture, note, caption, no state change); camera position and aim on every
  route; both graphics presets.
- `tools/scenarios/team-room-photos.mjs` (new): every flag's picture on Pacific Canyon (3 routes), Tremblant
  Woods, Harbour Lights and Panorama Ridge, saved as contact sheets (JPG under 500 KB) in the evidence
  folder; `DUEL_TEAMROOM_SHEET` copies the first sheet, `DUEL_TEAMROOM_FULL` keeps chosen pictures full size.

## Changed assertions (reviewed)

- `test-track-analysis.mjs`: "Driver-seat snapshot rests 1.2 m above the native ground" is replaced by checks
  that the eye stands `SNAPSHOT_UP` above the ground `SNAPSHOT_CHASE` behind the viewing point, the aim is the
  road surface, and the camera looks down. This is the new requirement, not a loosened one.
- `test-track-analysis.mjs`: "Corner snapshot uses its actual reference braking point" now says the same
  when the braking point is within 60 m of the apex and expects the 60 m limit otherwise (both cases checked),
  and adds that a corner view is aimed at its apex.
- `scenarios/team-room.mjs`: the camera check expects the eye 18 m behind the viewing point and 8 to 10 m up.

## Removed

- The driver's-seat camera (1.2 m high) and its wording ("driver's seat") in code, caption, study text and
  `docs/CIRCUITS.md`; the hover raise on map pins; the `up: 1.2` entries in the three circuit files.

## Left open

- Pictures are taken with the player's currently selected car and paint.

## Release review (Claude, 12 October 2026)

The staged production build threw "Cannot read properties of undefined (reading 's')" from the
menu camera after a Team Room picture rendered with the player's car parked in frame (not seen in
the dev server; the live build before this change was clean). The parked car is removed; the
picture shows the road only. Verified on a private production build: map flags select, pictures
render, no browser errors.
