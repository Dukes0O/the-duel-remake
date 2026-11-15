# Scablands land, round 9: the realism trial, step 2 (photographed surfaces)

Sheet: `round-9.jpg` (four places, before above and after below; pictures from the real game in a
visible browser window on the QA page with memory-only saves, Performance). Taken 14 November
2026 with scenario `tools/scenarios/scablands-realism.mjs` (run with `SCABLANDS_SHEET=1
SCABLANDS_ROUND=9`). "Before" is the game as players have it; "after" has the switch
`scablands-realism` on, which is step 1's light and air with step 2's ground. Built and reviewed
by Claude. Kyle agreed to the download of the photographs the same day.

## What changed, behind the switch `scablands-realism` (off)

Six photographed surfaces from Poly Haven (free for any use), each a colour picture and a relief
picture: stony hardpan for the flats, the wreck fields and the burn; dark rock for the scab
plates, the river's banks and steep rock; cracked crust for the salt pan; rippled sand; river
pebbles for the dry bed; gravel for the roads. The code still decides which ground lies where
and its broad colour. A photograph gives its ground the grain and the relief, laid at its true
size near the car and four times that further off, turned, so that its repeat does not show.

## Verdict (Claude): a clear gain; kept, switch off until step 3 and Kyle's word

Better:

- **The ground is no longer a flat sheet.** The low sun of step 1 catches the relief: gravel on
  the road, a cracked crust on the salt pan, broken rock on the scab plates.
- **The salt pan reads as a salt flat** and is the best of the six.
- **The scab plates are no longer black in any light.** Their cracks and slabs show.
- **The road reads as graded gravel** with its ruts.

Not right yet:

- **Nothing stands on the land.** Every picture is still an empty plain to the horizon. This is
  step 3 (stones, scrub, tracks, posts and wire; the bridge and the roadside at true size) and
  the hill country of slice 2c.
- **The scab plates read as cracked dry mud more than as lava rock**, because the code's own
  slabs and cracks lie over a rock that is finer than they are. Their slabs are redrawn with
  the mesas in slice 2c.
- **The road's gravel is very even** and a little like sand at speed.
- **Where the road meets the plates the edge is a straight dark line.**
- **Far ground still meets the sky in a dark line** across the plates.
- **The sand, the river bed, the wreck fields and the burn are not on this sheet.** The sand
  and the bed have their photographs; the burn and the wreck fields share the hardpan's and
  get their own with their jobs.
- **Not judged in motion.** Whether the grain shimmers at speed is seen only in a real drive,
  which Claude still owes.

Cost, roughly: 4.9 MB of pictures in the game and about 67 MB of graphics memory while the
Scablands is loaded. The game held 60 pictures a second before and after in a visible window
(the screen's limit, so a cost under it is not seen). A guide, not a frame check; the frame
check under rule 8 comes before the switch goes on.
