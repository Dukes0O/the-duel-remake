# The Scablands as a place: round 4, after the seven fixes to the well, the Dead Mall and the Boneyard (12 November 2026)

Sheet: `round-4.jpg`. Facts only; the verdict is Claude's. Taken by a Sonnet helper on this branch after commit 20635d303 (the
seven fixes), in the way round 3 was: High (composite pipeline, 2,048 shadow map), 1536 by 864, daylight, rear mirror and page
furniture hidden, the player's car moved to (0, -400), the Everburn well in job 6, the mall in job 5 and the Boneyard in the gas run.
Columns are the places, rows are the views, as in round 3.

## What is different from round 3

- The camera positions are the same, with two changes forced by the fixes. The wrecks moved, so the Boneyard's views look at the
  middle of the new layout, (418, 285), and its close view stands 12 m from the north wreck at (418, 272); and Big Bess's close view
  looks at her new resting place (464, 262). The Boneyard's own close view looked like its 25 m view in round 3 and the Big Bess
  picture takes its place on the sheet again.
- Extra pictures taken and not kept on the sheet: each place from 320 m, the Boneyard straight down, the well's prop cluster and the
  mall's entrance from 30 m.

## What the sheet shows

1. **The well.** A flame of three tongues burns on the derrick (white-hot at the core, orange at the edge), firelight lies on the
   sand round its foot, and a black column of smoke leans away to the east. From the mall and from the Boneyard (430 m and more) the
   column still reads as a dark thread over the horizon, with a small bright flame at its foot. No ball is left in the sky. North-east of
   the apron stand a red lattice mast, three fire pots, two barricades, a signpost and four rocks (the extra picture; from the 80 m
   road view they read as a low bunch of dark shapes beside the furnace).
2. **The mall.** The words on the signs sit on their boards ("LAST LIGHT" whole, "DRY GOODS" cut only by the picture's edge). The nine
   rocks and the four sand drifts are gone; the 25 m view is a blank pale wall, the close view looks into the shops through the entry
   with nothing beige on the floor.
3. **The Boneyard.** No brown rectangles or slivers from the slab. Three aircraft lie on three different headings with different
   gaps: the north wreck at (418, 272), the south wreck on a wing at (372, 296), the east wreck at (466, 338) beyond the road (seen only
   from the high view). Big Bess stands in the open at (464, 262), clear of every wreck.

## Faults that are fixed (the round 3 list, by item)

Well 1 (spheres), 2 (flame solid), 3 (emptiness), 4 (box stand-in); mall 1 (lettering), 2 (rocks), 4 (254 meshes), 8 (drifts);
Boneyard 1 (slab), 2 (Big Bess inside the north wreck), 3 (collision for one wreck only), 4 (a row of three copies). Correction to
round 3, Boneyard 5: the discs called engine pods that were sunk 2 m were the broken landing gear's tyres (`*_Wreck_landing_gear_*`
with the burnt-rubber surface); the engine pods themselves (`*_Wreck_engines_*`) stand 0.19 m into the ground at most and are now 0.15 m
or less on the two level wrecks. The buried tyres are by design (broken gear).

## What still reads wrong (not in this round)

- Beyond 280 m the mall and the Boneyard are still the 32 by 12 by 24 m box (at 320 m in the extra pictures); only the well's stand-in
  changed.
- The mall from the road is still a blank pale wall at 80 m and 25 m, and its entrance faces away from the road.
- The ground: saw-teeth on every cliff face; the hard edge between road and sand in the 80 m mall picture and the Boneyard's high
  picture; the road ribbon under the drawn ground in places (round 3 numbers: 73, 28 and 50 quads); a ragged brown edge at the left of the
  Boneyard's high picture where the ribbon runs out under the ridge.
- The Boneyard's fuselages are still visibly faceted tubes at 12 m; the rolled wreck, from the road, reads as a cross of wings.
- The well's props are kit pieces at kit scale: the barricade reads as a wheelbarrow with two big wheels, the signpost shows only its
  pole from the road, and the cluster is small beside the 78 m disc. They have no collision (a car drives through them). The cluster
  stands about 25 m from the well, so from the 25 m road view only the lattice mast shows beside the derrick.
- The flame from 12 m is a pale white streak against the bright clouds (additive fire over sky).
- Collision boxes still larger than what is drawn: the well's 18 by 18 m and the mall's 38 by 35 m (not in this round); each
  wreck's box is the box round the turned wreck, 38 by 23, 33 by 30 and 20 by 38 m.
- The four `ash-men-lamp-*` props in the mall model were not seen in any picture.

## Render numbers, before (round 3) and after

`renderer.info.render` after one drawn frame at High with the rear mirror off, as in round 3. "Meshes in view" is meshes whose
bounding sphere meets the view. The Dead Mall's close view and the lamps view have the player's car 830 m away in their line of sight
(about 125,000 triangles of the figure, before and after alike). The Boneyard rows and Big Bess's close row are not like for like:
the views were re-aimed at the moved wrecks and Big Bess stands in a new place.

| Place and view | Calls before | Calls after | Triangles before | Triangles after | Meshes before | Meshes after |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| Everburn, road 80 m | 264 | 294 | 162,751 | 175,663 | 79 | 95 |
| Everburn, road 25 m | 216 | 246 | 160,373 | 173,421 | 54 | 66 |
| Everburn, high | 243 | 274 | 164,931 | 177,923 | 68 | 82 |
| Everburn, close | 176 | 192 | 152,235 | 157,131 | 34 | 37 |
| Everburn, far 320 m | 230 | 244 | 136,627 | 136,131 | 64 | 78 |
| Dead Mall, road 80 m | 746 | 248 | 172,875 | 171,379 | 331 | 89 |
| Dead Mall, road 25 m | 738 | 248 | 172,587 | 171,379 | 327 | 89 |
| Dead Mall, high | 635 | 143 | 147,743 | 146,781 | 272 | 16 |
| Dead Mall, close | 769 | 291 | 299,191 | 298,749 | 339 | 90 |
| Dead Mall, far 320 m | 234 | 230 | 134,939 | 133,795 | 75 | 80 |
| Boneyard, road 80 m | 421 | 389 | 213,489 | 195,975 | 169 | 160 |
| Boneyard, road 25 m | 395 | 417 | 210,167 | 201,591 | 156 | 174 |
| Boneyard, high | 218 | 236 | 177,125 | 177,139 | 64 | 63 |
| Boneyard, close (the north wreck now) | 307 | 379 | 188,129 | 192,153 | 110 | 155 |
| Boneyard, far 320 m | 172 | 177 | 167,607 | 167,003 | 41 | 40 |
| Big Bess, road 25 m | 236 | 232 | 186,151 | 185,593 | 73 | 85 |
| Big Bess, close | 269 | 295 | 174,155 | 192,393 | 89 | 92 |

What the numbers say: the mall's draw calls fall to about a third (254 meshes became 7) and the well's rise by 14 to 30 (the fire and smoke are 21 draw calls, the merged props a handful). The Boneyard moves
with how many wrecks the camera sees. No frame check was run (rule 9).

Verdict (Claude): to be written.
