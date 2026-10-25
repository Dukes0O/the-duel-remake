# Ardennes: round 4 (Claude's new art plan, 15 October 2026)

Facts only; Claude writes the verdict. Sheet: `round-4.jpg` (316,397 bytes), four full 1280 x 720 native pictures resized to 720 x 405, no crop or retouch. High quality only, real stock Stuttgart 959S, seed 1989, field 1000, eight-car two-lap race, private port, memory-only saves, clear light on the second lap. No frame timing.

## What the four pictures show

- **Beech Grove**: a beech seen through a gap in the firs from beside the road, inside the catch fence. Chosen by the tool as the thickest group on Kestrel Straight (15 beeches within 22 m of each other); the tree the view is bound to stands 41.9 m behind the catch fence. The camera stands where the fewest firs are between it and the group.
- **Stone Bridge Stream**: the stone arch seen from the bank beside the water (eye 2.1 m above ground, 6.5 m along the stream line from the arch, 12 m toward the road), arch and water both in frame.
- **Stream From Car**: the actual player car at the Red Water crossing; the eye keeps the car's place on the road, moved 6 m to the road edge and raised to 3.4 m, looking up the channel toward the arch. The channel is small in this picture: the water starts about 24 m from the road centre and the catch fence stands in front of it.
- **Kestrel Wide**: eye 55 m back along Kestrel Straight, 7 m up, looking at the same group; firs in front, beeches behind.

## Leaves

- Each beech crown is 70 crossed pairs (140 cut-out cards) at High and 42 pairs (84 cards) at LOD, in seven clusters on the limb ends. No solid lobe mesh remains. Alpha test at 0.5, no blending, both sides drawn.
- Texture: ambientCG Leaf Set 024 (real beech leaves), CC0. The nine leaves are cut from the set's colour and opacity maps and scattered into one 256 px tile (128 px for LOD) by `tools/art/ardennes-leaf-sprite.py`.
- Budget per tree: High 436 triangles (limit 684), LOD 224 (limit 240). The two GLBs total 101,048 bytes (limit 250,000).
- Beech count on the course: 191 (round 3 had 382). Every beech stands at least 40 m beyond the road edge: 25.9 m behind the catch fence at the nearest, 36 m at the median, 55 m at the furthest. Nearer trees are all the accepted firs.

## Stream

- Water: the circuit's existing water surface (the one Harbour uses), in two narrow dug basins across the road line, one each side. The channel is 0.6 to 1 m below the natural ground at the stream line and tapers toward its ends; the ground within 6 m of the road edge is untouched.
- Tint: deep red-brown, darker toward the edges; this uses a two-line colour option added to the shared water code (own commit `fe4e415c`, easy to revert).
- Wet banks: a 1 m darker, glossier strip along each shore where the water meets the bank; 10 rocks and 34 reed clumps at the waterline (same boulder and granite picture the course uses, same blades as the meadow tufts).
- The old flat red-brown path is gone.

## Facts that matter for the verdict

- The two-lap native race is bit-identical to round 3 (finish time 290.6167 s, distance 13368.8749 m, lap times 151.295 s and 139.306 s, the same one known Long Left armco player crash, zero resets). The dug ground and new trees changed nothing a car touches.
- The water colour reads dark maroon close up and pale grey-blue at a distance (it mirrors the sky at a low angle, as water does).
- Terrain is drawn in 4 m rows, so the channel edge is coarse; the wet bank strip hides some of that.
- Not done in this round: Performance quality pictures (the plan lists them; the brief asked for High only), frame cost, world-signature fixture changes (Ardennes has no fixture row; the 20 enabled events are unchanged).

## Claude verdict, 15 October 2026: accepted

The new method works. The beeches read as real broadleaf trees: ragged
leafy crowns with sky through them, bright green against the dark firs, set
back behind the fir rows (Beech Grove, Kestrel Wide). The stream now reads as
water: a dark red-brown channel with reflections running under the arch, wet
banks, rocks and reeds (Stone Bridge Stream). The view from the car is the
weakest, the fence and the small channel hide most of it, which is fine at
racing speed. The grey bridge is still blocky but was accepted at round 3.
Round 3's sheet is removed with this verdict (its note stays). Ardennes stays
dev; next are the Long Left player exception, the frame check at the busiest
view and Claude's finishing pass.

## Earlier rounds, folded in (P4-FINISH-ARDENNES, 15 October 2026)

- Round 1 (14 October): changes required. Village a scatter of box houses on a bare slope with a floating spire; open meadows instead of forest; round lollipop beeches; blue, glassy damp road; white monument-like bridge; no footbridge view from the car.
- Round 2: changes required. Village/church 3, forest 3, road 4, bridges 3, overall 3. Accepted the neutral damp road, dense firs and the footbridge from the car; asked for the bridge over visible water, a distinct broadleaf beech grove and readable village streets.
- Round 3: changes required (third of the original three). Village/church 4, forest 2, road 4, bridges 3, cohesion 3. Streets, roofs and church passed; beech crowns read as faceted plastic and the stream as a matte path. Kyle held the course for a new art plan, which round 4 delivered.

The round 1 to 3 notes and this round's sheet (`round-4.jpg`, 316,397 bytes) were removed as consumed evidence; the verdicts above and the accepted round 4 verdict are what remains.
