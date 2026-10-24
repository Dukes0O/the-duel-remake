# SKI-RUNS: questions for Claude (design lead)

Asked by the cloud session building SKI-RUNS on 24 October 2026. Both have a
recommended pick that the build already follows; reverse it and the fix is one
number each.

## 1. The aerials landing cannot be safe under the 20 degree rule

The packet (HELI_SKIING 5) has an aerials kicker "launching at about 65
degrees onto a 37-degree landing hill", and the landing rule (section 4, now in
SKI-RULES) is "safe when the slope is within 20 degrees of the path". They
cannot both hold. Launching at angle a from the lip and landing on a hill that
falls at angle b from that lip, the path meets the snow descending at an angle
whose tangent is tan(a) + 2 tan(b) (the flight is symmetric about the lip's
height, then falls the extra the hill drops). For b = 37 that is at least 56.4
degrees even for a = 0, which is 19.4 degrees off the hill: the largest safe
launch is about 2 degrees. For a = 65 the landing is 38 degrees off. I
measured it with the real physics: kickers from 40 to 65 degrees on a 37 degree
hill land 31 to 36 degrees off the snow, so the guide's jump always tumbles.
Any real aerials jump is out of the rule.

Options:
- A. A landing hill with a wider window of its own: the zone may state the
  window (the ski rules keep 20 degrees everywhere else, so mogul hops and
  drops onto the flat are judged as before). Aerials gets 40 degrees, which a
  kicker taking off at about 50 degrees on the 37 degree hill meets (about 33
  off) while a 6 m drop onto the flat (more than 55 degrees off) still tumbles.
- B. Change the packet: a 55+ degree hill (not a hill), or a kicker under 2
  degrees (not a kicker).
- C. Change the rule for everyone: judge a landing by the speed into the
  snow (the push into the slope, in m/s) instead of an angle.

**Pick followed: A.** `world.safePathAngle` (a number, degrees) is optional;
absent it is 20, so nothing in SKI-RULES moves. The aerials zone sets 40. The
kicker's face climbs to 65 degrees; the lip eases so the takeoff is about 50.
If you choose B or C the aerials zone and one line in `ski-physics.js` change.

## 2. No pad in the Summit Run world is as high as the packet says

The packet puts the drop pads at about 3,960 m (Devils Playground) and 4,302 m
(the summit) and a thin-air table built on them. In the game the Summit Run
course runs from 14 to 740 m above its start; the helicopter's altitude is the
2,860 m base plus the height above the start (`altitudeOffset`), so the highest
clear 12 m circle, near the hut, is at 3,586 m and nothing in the world is at
3,960 or 4,302 m. "Each drop pad matches a landing zone in the Summit Run
world" and "the pad heights match the Summit world within 1.5 m" can only hold
for what the world has.

Options:
- A. Keep the two worlds apart: each zone's snow is at the packet's altitudes
  (so the ski physics' thin air and speeds are as designed), and the three
  landing circles are the highest clear level circles the Summit world has,
  with the same gaps (342 m between the pads, 351 m down to the pickup). SKI-HELI
  then has to give flights to these pads the packet's altitude (an offset on the
  thrust rule), or the thin-air table is re-derived.
- B. Lower the zones to the world's altitudes (summit pad 3,586 m): the full
  group then hovers at the summit pad (thrust 2,218 kg against 2,105 kg) and the
  packet's thin-air lesson ("take half a tank") disappears.
- C. Raise the Summit course. A released world: not for this card.

**Pick followed: A.** Each zone has `drop.y` (the altitude, packet numbers) and
`world` (the Summit landing circle: `x`, `z` and `y`, its ground height there).
SKI-HELI settles how a flight to the pad reads its altitude; I will raise it
again on that card.
