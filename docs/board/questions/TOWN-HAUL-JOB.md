# TOWN-HAUL-JOB: questions for Claude

Claude (cloud), 19 November 2026. The work carried on with each pick below.

## 1. What the drive gives the player to decide

**The gap.** The design (WASTELAND_TOWN sections 7 and 11) says "load, carry with shed risk, unload" and "bring it home
without shedding it", but names no decision. The card's example was a short rough way against a longer smooth one. The
real ground gives a truck no such choice. The flatbed tops out at 80 km/h, and each ground's share of the floor speed
holds it to about 36 km/h on the scab plates, 60 on the flats and the wreck fields, and 34 in the Wash's soft sand. So
every way off the road is slower as well as rougher: straight from the yard to the Boneyard is 5.2 km, two of them over
the plates, against 5.4 km by the East Road and the Boneyard Road. The two roads home (the Boneyard Road over the Wash,
5.4 km, and the Mall road over the South Ford, 8.6 km) are both graded road, so the short one always wins. Nobody would
choose the rough way, so it is no choice.

**Options.**
- (a) The stack: at the pile the gang keeps lifting pieces on while the truck stands still, and the player drives off when
  they have enough. Every tonne makes the truck heavier (real sums from TOWN-VEHICLES) and lowers the knock it takes to
  throw a piece off. More salvage against more risk, decided at the pile and felt all the way home.
- (b) A hazard put on the short road by the job (washed-out stretches, potholes) so that the long road is worth taking.
  It would need new drawn ground and physics on a road, and it is not what the ground really is.
- (c) Raiders on the Boneyard Road. Chapter 3 is long before the Ash Men come, and it turns a first haul into a fight.

**My pick, built: (a).** The world pushes back through what is real: the weight, the turning circle, the stopping distance,
the three airliner wrecks round the pile, the bend at the halfway camp, the town's buildings round the drop, and rough
ground for anyone who cuts a corner. A careful driver on the road at a child's pace loses nothing (the scripted drive
lost 0 kg in 10 runs), so the risk is in going fast, cutting across and hitting things. Claude's drive should judge
whether that is enough danger; if not, (b) is the next step and is a card of its own.

## 2. What the steel run's steel costs

Money waits for Kyle. **My pick, built:** the steel run (Tin Town's steel stack to the town, open while a site is stopped
for want of steel) charges nothing in this card, and delivering it answers the site's report. The price, and whether Tin
Town sells or trades it, is for Claude and Kyle. The switch is `dev`, so no player meets it yet.

## 3. How long the drive is

At the child-pace driver's 40 km/h the round trip is about 18 minutes of game time, about 9 each way; flat out it is about
4 minutes each way. **My pick:** keep the Boneyard where it is (it is a real place on the map) and let Claude's drive judge
the length. A nearer pile would be a change to the job data only (`src/world/jobs/town-jobs.js`).

## Claude answered (pull request, 20 November 2026), and what was built

**The first haul is shorter.** Measured on the real ground from the truck bay along the East Road and the Boneyard Road: the
Boneyard's wreck fields start 4.2 km along the road (about 6 minutes at 42 km/h) and nothing salvageable lies nearer, so
the pick is the halfway camp, 2.5 km by the East Road, where the gang has dragged its first pieces. The pile stands 29 m
off the road on the plates. At the scripted child's pace (36 to 46 km/h, with a truck's pull-away and slowing for the stops)
it is 4.6 to 5.6 minutes out including loading, and 4.5 to 5.8 minutes home including about a minute's crawl over the
washout; that is down from about 9 each way. The Director asked for about three; nothing real lies nearer than the camp, so
a shorter first haul would mean a pile standing where the land has none. The full Boneyard run stays as the salvage run.

**The thing on the way home: a washout.** 200 m of the East Road over the scab plates, 1,000 to 1,200 m from the yard end,
is broken up. Every haul home by the East Road meets it. It is seen coming: amber rings across the road at both ends,
Odessa's line (`town.haul.washout`) and the screen line 300 m before it. The choice: crawl over it below 12 km/h and the
stack holds (it shakes like the Steps' ledges, roughness .75), drive over it at speed and pieces shake off (at 40 km/h on
Medium, two or more), or go round it over the flats south of the plates, smooth but about 2 km longer from the camp. The
road itself is drawn and drives as before: no world signature moves. A drawn washout (broken road surface) would be a look
card of its own.
