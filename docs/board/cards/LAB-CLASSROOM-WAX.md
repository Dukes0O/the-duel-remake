# LAB-CLASSROOM-WAX

The short board entry controls current state, ownership, dependencies and locks.

Ski wax as a classroom lesson. Rebuild order 4 of 15 (LAB-CLASSROOM section 6);
audit severity 4 of 5 (5 is as broken as the old pendulum).

**What is wrong today** (audit, 31 October 2026): The wax selector starts on Hard, so pressing it as told by "Pick hard wax" moves it to Medium and the try fails.

**First fix:** Three wax tins to pick from, each labelled, with the picked one shown on the ski.

Rebuild on the classroom pattern of [LAB-CLASSROOM](LAB-CLASSROOM.md) sections 2 and 3, as
the pendulum was: `src/lab/lessons/wax-classroom.js` (steps and model, no DOM),
`wax-board.js` (the 2D board in the steel workshop look), one line in
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

## Claude's script (1 November 2026)

The game challenge: on the ski menu, "Today's snow: Cool snow, -5 °C" (the play day's snow,
`snowOfDay`), pick the wax that suits it and finish the slalom. It passes on the pick: hard wax for
dry powder (-18 to -10 °C), medium for cool snow (-9 to -2 °C), soft for wet snow (-1 to 0 °C).
The colder the snow, the harder the wax. On the slalom the right wax is about half a second faster
than the wrong one (21.6 s against 22.2 s, `waxRunFacts`).

Numbers: the ski rules' own friction (`SKI`: right wax 0.045, no wax 0.05, wrong wax 0.06) on the
bench's 10 degree slope, timed over a 50 m test strip (`glideSeconds`): right wax 8.88 s, no wax
9.05 s, wrong wax 9.43 s. When the right ski finishes, the wrong one is about 6 m behind. Clocks
run at real speed.

**The board.** Snow trays side on in the steel workshop look: a 50 m test strip at 10 degrees, a
thermometer and the snow's name at its top, a stopwatch at its foot. Three wax tins stand on the
bench, each labelled (HARD, MEDIUM, SOFT, with a cold-to-warm colour: blue, violet, red); 1, 2 and 3
(or a click) pick one, and the ski's base shows the picked colour. Space lets the skis go. Your ski
races a plain ski with no wax, so the right wax wins and the wrong one loses. This replaces the old
wax selector, which started on Hard so that "pick hard wax" moved it to Medium.

| Step | Brian says | The player does | Wrong move, and why |
| --- | --- | --- | --- |
| Wonder | Same skis, same slope, same snow: why did one glide past the other? | Watches two skis on -15 °C dry powder (R replays); the hard-waxed one wins by about 6 m. | |
| Wax | A thin coat on the ski's base that helps it slide over snow; hard, medium and soft. | Picks a tin (1, 2 or 3, or a click); the base turns its colour. | |
| Glide | How smoothly a ski slides. The test strip is 50 m; the stopwatch times it. | Space: the ski glides 50 m in 8.9 s, at real speed. | |
| Snow crystals | Tiny bits of ice: sharp and hard when cold, rounded and wet near 0 °C. | → warms the tray from -15 °C to 0 °C and the crystals in the magnifier round off and turn wet. | |
| Watch | Three trays, each with the right wax against the wrong one: hard on -15 °C powder, medium on -5 °C cool snow, soft on 0 °C wet snow. | Watches (Slow motion, Watch again); a table fills in with the times. The colder the snow, the harder the wax. | |
| Try: cool snow | Cool snow, -5 °C. Pick the wax, then Space to race the plain ski. | Picks a tin, Space. Medium wins. | Hard: "hard wax is for snow at -10 °C and colder; at -5 °C it lost to the plain ski, 9.43 s against 9.05 s". Soft: "soft wax is for wet snow, -1 °C or 0 °C". |
| Try: wet snow | Wet snow, 0 °C. | Same. Soft wins. | The same, with the bands. |
| On your own: Brian's job | Three days on the ski menu, in the game's own words: "Today's snow: Dry powder, -13 °C", then "Cool snow, -3 °C", then "Wet snow, -1 °C". | Picks the wax for each (1, 2, 3) and Space; all three right passes. | A wrong pick names the snow's band and the wax that suits it; that day is tried again. |
| Question 1 | -15 °C dry powder: which wax? | Hard, medium or soft. | "Very cold snow has hard, sharp crystals: hard wax." |
| Question 2 | The colder the snow, the ... the wax? | Harder, softer, it does not matter. | "Cold, sharp crystals need a hard wax; wet snow near 0 °C needs a soft one." |
| Question 3 | In the game, how do you know which wax to pick? | Today's snow on the ski menu; the colour of the skis; the shop. | "The ski menu says today's snow and its temperature; pick the wax that suits it." |
| Recap | The colder the snow, the harder the wax; the right wax glides faster, the wrong one slower than none (voice line `lab.brian.wax.explain`). | Three key ideas; Enter starts the game challenge with the key idea card. | |

Help on every step climbs from a nudge, to the plain step, to Brian's pointer on the right tin;
Show me picks it and lets the skis go. The key idea card in the game: "Hard wax for cold, soft wax
for warm. Read today's snow on the ski menu, pick the wax that suits it, and finish the slalom."
The notebook keeps the old words under their ids (`wax-wax`, `wax-glide`, `wax-snow-crystals`).
The intro voice line (`lab.brian.wax.intro`) no longer fits a step and is not played.

**Checks** (before code): `tools/test-lab-classroom-wax.mjs` (a child who follows each prompt
passes; each wrong pick says why with the real times and the snow's band; the bands agree with
`snowOfDay` and the ski menu's rounding; help climbs to Brian's pointer and Show me passes); the
browser scenario `tools/scenarios/lab-classroom-wax.mjs` plays the lesson by keyboard, with one
mouse click on a tin, to the game challenge; every `tools/test-lab-*.mjs`, the Lab scenarios, the
lane tier and the build.
