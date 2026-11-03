# LAB-CLASSROOM-FIRE

The short board entry controls current state, ownership, dependencies and locks.

Fire triangle as a classroom lesson. Rebuild order 9 of 15 (LAB-CLASSROOM section 6);
audit severity 3 of 5 (5 is as broken as the old pendulum).

**What is wrong today** (audit, 31 October 2026): Pressing the coat button twice turns it off but the tick stays; once coated, the raked strip disappears from the picture; the text names Brian while he is hidden.

**First fix:** One button per side of the triangle that shows its state, and every action kept in the picture.

Rebuild on the classroom pattern of [LAB-CLASSROOM](LAB-CLASSROOM.md) sections 2 and 3, as
the pendulum was: `src/lab/lessons/fire-classroom.js` (steps and model, no DOM),
`fire-board.js` (the 2D board in the steel workshop look), one line in
`src/lab/classroom/classroom-lessons.js`, behind `lab-classroom`. Every number from the
function the lesson's challenge uses. The challenge, its reward and the save are unchanged.
Claude writes the step script (what Brian says, the set-up, the guesses and the reasons
for each wrong answer) under "Claude's script" here before code.

Checks: in `tools/test-lab-classroom.mjs`, a child who does exactly what each prompt says
passes with one press; each wrong guess says why with the real numbers; help climbs to
Brian's pointer. The `lab-classroom` browser scenario plays this lesson by keyboard alone.
Lane tier and build. The old lesson files go in LAB-CLASSROOM-LIVE.
If the challenge is a bench run ('inline' from `onChallenge` in `lab-view.js`), feed the
classroom's machine runs to it: the pendulum only needed the flying path, and `lesson-ui.js`
refuses 'inline' with a message until a lesson wires it.

## Claude's script (3 November 2026)

The challenge stays the flying one (`lab-challenges.js`): a practice fire of 6 by 3 cells of forest
on the home lake's shore, lit at its near end; it spreads every 70 s, and the pilot keeps it off
the road (the far column) for 7 minutes or puts it out. Its reward (the Retardant tank in the Lab
shop) and the save are unchanged. The recap says "Try it for real in the helicopter", as Lift's does.

Numbers: the fire pit is `fireBench.run` (the switches and what each tool takes away,
`TAKES_AWAY`). The forest is the challenge's own: its 6 by 3 cells, its seed, its start cell at
75%, the game's `spreadStep` (no wind), `applyWater` and `applyRetardant`. A cell burning flat out
takes 180 litres to put out (`FIRE.litresPerPoint`); the water bucket holds 600 litres
(`BUCKET.litres`), so one full load puts out three such cells with 60 litres over; the Retardant
tank's 600 litres treat four cells at 150 litres each (`RETARDANT.litresPerCell`). Water on trees
that are not burning makes them damp: for two spreads they catch a fifth as often (`FIRE.damp`).

**The board.** The steel workshop. The pit scenes: Brian's steel fire pit in the middle with its
gas burner, its logs and its hinged lid; under it three switch plates, one per side of the
triangle, each saying its state in words (Wood: fuel, IN or OUT, key 1; Gas: heat, ON or OFF, key 2;
Lid: air, OPEN or SHUT, key 3); on the right the fire triangle, each side lit in its colour while
that thing is there and dark with a cross when it is gone, and a flame or OUT in the middle; on the
left the water and sand buckets. The forest scenes: the practice fire seen from above, the lake on
the left, 6 by 3 cells of trees, the road on the right; a cell shows green trees, flames (taller as
it burns hotter), black when burnt, blue when damp, bare raked soil, or pink retardant. Every action
stays in the picture (the audit's first fix): a raked strip stays raked, a coat stays pink, a drop
leaves its splash, and every switch says what it is set to.

| Step | Brian says | The player does | Wrong move, and why |
| --- | --- | --- | --- |
| Wonder | My pit is roaring. I shut the lid, no water at all, and the flames die. Why did that work? | Watches (R replays). | |
| Fuel | Fuel is anything that can burn: wood, dry grass, whole trees. Put the wood in. | 1 (or the Wood plate): the logs go in; nothing burns yet. "Wood alone does not burn: it needs heat." | |
| Heat | Heat is what makes things hot enough to burn. Light the gas under the wood. | 2: the gas lights, the wood catches. | |
| Oxygen | Oxygen is the part of air a fire needs; the open lid lets air in. Shut the lid. | 3: the flames die in two seconds though the gas is on and the wood is there: the wonder's answer. | |
| Fire triangle | A fire needs heat, fuel and oxygen together: three sides of a triangle. Open the lid again. | 3: all three sides lit, and it burns. | |
| Watch | (voice `lab.brian.fire.intro`) | Brian takes away one side at a time, gas off, wood out, lid shut, relighting between; a table fills in each way and the side it took. Slow motion, Watch again. | |
| Try: water | Here is the water bucket. Which side will it take away? | A guess (heat, fuel, oxygen), then Space tips it: steam, out; the heat side goes dark. | "Fuel": the wood is still there, wet and black. "Oxygen": the lid is open and air all round. Water soaks up the heat as it turns to steam, and the wood is too cool to burn. |
| Try: sand | Now the sand bucket. Which side will sand take away? | A guess, then Space: the sand covers the wood, out; the oxygen side goes dark. | "Heat": the gas is still on under the sand. "Fuel": the wood is still there under it. Sand keeps the air off the wood, as the lid did. |
| Try: the cleared strip | A forest fire is too big for a lid. Rake a strip of bare ground across the forest in front of it. | Space rakes the strip; a guess (which side does a bare strip take away?); Space lets the fire burn: it stops at the strip. | "Heat": the flames were just as hot at the strip. "Oxygen": air blows across the strip all the time. There was nothing in the strip to burn. |
| Retardant | Retardant is a coat sprayed on plants so they char instead of burning. Coat the trees in front of the flames. | Space coats the column in front (pink); the fire burns up to it and stops. | |
| On your own: Brian's job | The practice fire is coming for the road. Each trip you drop one 600-litre bucket, and the fire spreads once while you fly back for more. Put it out before it reaches the road. | Arrow keys aim and Space drops, or click a cell. Following the pointer (the flames nearest the road, hottest first) puts it out in three loads. | Water on the back flames first: the front reaches the road in two trips ("The fire reached the road: the flames at the front kept spreading while the water fell behind them. Drop on the flames nearest the road first."), and the job starts again. A drop on burnt ground: "That cell has burnt out: no heat left to take, so the water did nothing." On green trees: "Those trees are damp now and slower to catch for two spreads, but the flames are still burning." |
| Question 1 | A pan of oil catches fire on a stove. A lid slid over the pan puts it out. Which side did the lid take away? | Heat; fuel; oxygen (triangle pictures). | "Heat": the stove is still hot under the pan. "Fuel": the oil is still in the pan. The lid shuts out the air. |
| Question 2 | You have the Retardant tank and the fire is creeping toward the road. Where does it go? | On the trees in front of the flames; on the flames; on the burnt ground behind. | "On the flames": retardant never puts out flames already burning (the game never lowers a burning cell). "Behind": that ground has burnt; nothing is left there to catch. Right: 600 litres coat four cells, 150 each. |
| Question 3 | In the game you fly the 600-litre water bucket to the practice fire. Where does the first load go? | On the flames nearest the road; on the green trees ahead; on the flames at the back, where it started. | "Trees ahead": they only turn damp for a while; the flames keep coming. "At the back": the front reaches the road meanwhile, as in Brian's job. Right: a cell burning at full strength takes 180 litres, so a full bucket puts out three of those, and more smaller ones. |
| Recap | Fire needs heat, fuel and air; take away any one and it dies; fight a forest fire at its front (voice `lab.brian.fire.explain`). | Three key ideas; try it for real in the helicopter. | |

Help on every step climbs from a nudge, to the plain step, to Brian's pointer on the switch, the
bucket, the rake, the spray or the cell to drop on; Show me does it for the player. The notebook keeps
the old words under their ids (`fire-fuel`, `fire-heat`, `fire-oxygen`, `fire-fire-triangle`,
`fire-retardant`). Checks: a new `tools/test-lab-classroom-fire.mjs` (every number from the game's
fire rules, a child following each prompt passes, each wrong move says why, help climbs to the
pointer, a click where the pointer is does what it shows) and a `tools/scenarios/lab-classroom-fire.mjs`
keyboard play-through; every `test-lab-*` suite, all Lab scenarios, lane tier and build. The old
`fire-lesson.js` and `fire-animation.js` go, and with them the last users of the old flying lesson
frame's display (`flying-display.js`), which goes too if nothing else imports it.
