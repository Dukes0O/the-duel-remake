# TOWN-FIRE-JOB: questions for Claude

Claude (cloud), 20 November 2026. The work carried on with each pick below.

## 1. Where the truck fills up, and how fast

**The gap.** The card says "refill at any tap or hydrant at the real flow the town's pipes give", but Chapter 7 comes before
Chapter 9's pipes, and the town has no hydrant building. A standpipe on no pipes gives a person 7.5 L a minute, which would
take the truck 400 minutes to fill.

**My pick, built.** Three kinds of water point, each with a blue ring beside it, each at a flow with a source in the code
(`src/world/jobs/steps/douse.js`):
- every finished hand well: the truck's pump draws it at 1,000 L a minute, and it holds about 2,200 L (a lined well 1.2 m
  across with 2 m of standing water), then it is dry for the rest of the call;
- every finished standpipe on the town's pipes, at what its pressure pushes through a 50 mm pipe (none without pressure, so
  no ring), and a water tower at its 12 m of head through a 100 mm outlet, holding 20,000 L;
- the Water Road's tap at the gate (38, -80), east of the Scrapdome's gate: the end of a 100 mm main at about 1.3 m a second,
  so 600 L a minute, for as long as today's Water Road water lasts.

So the choice is the well near the fire, fast but only 2,200 L, against the gate's tap, slower and further but never dry. The
gate's tap is placed by me; if the Water Road should enter the town somewhere else, it is one constant (`TOWN_FIRE_GATE_TAP`).

## 2. How much water a fire needs

The NFA fire flow formula (13.6 L a minute a square metre of floor, fully alight) and the Iowa rule (knocked down in about 30
seconds at that flow), with about a third of a deck gun's water landing on what is burning. The soup kitchen, a minute after it
caught, takes about 2,000 L on Easy and most of a tank on Medium; a 3 by 3 building fully alight is more than one truck can stop.
The call comes a minute after the fire started (`headStartSeconds`), so it has grown and warmed its neighbours.

## 3. The ash line's first version, and the Everburn

"Only the first opens the Everburn from the ash." **My pick, built:** the town keeps `story.facts.ashFound` after Chapter 7 and
`story.facts.everburnFromAsh` only after the first version. Nothing is written to the profile: the Everburn's entry in the yard
is already open whenever its switch is on. A later card can show the ash on that entry. Saves wait for Kyle, so I stopped there.

## 4. Lines made whole

`town.7.fire` ("FIRE! The soup kitchen! ... GO!"), `town.7.won` ("Still standing. ...") and `town.7.ash.done` ("Leftovers,
with no boss.") had fragments. They say the same in whole sentences now, in `src/town/content/lines.js` and in
`docs/story/the-long-dry.md`. Reverse any you would rather keep.

## 5. Smaller picks

- What counts as a win for the test driver: the soup kitchen saved. Chapter 7 ends when every fire is out, whatever was lost,
  since nothing in the town is ever a game over; a lost kitchen is a black frame to build again (`burnt-1`, as the town's own
  fire leaves one) and Odessa says so (`town.7.burnt`).
- Only buildings burn. Painted home ground (tents and shacks) is not drawn in the drive, so the fire does not reach it.
- A building that burns down stops burning and smokes, but is still drawn whole in the drive: the drive's town is built once.
  A burnt look is a look card.
- H sprays only while flames are in front of the truck, so a child holding H while driving wastes no water.
- No gamepad button sprays yet; the gamepad's Back still shows help.
