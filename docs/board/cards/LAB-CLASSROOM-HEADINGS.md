# LAB-CLASSROOM-HEADINGS

The short board entry controls current state, ownership, dependencies and locks.

Headings and maps as a classroom lesson. Rebuild order 3 of 15 (LAB-CLASSROOM section 6);
audit severity 5 of 5 (5 is as broken as the old pendulum).

**What is wrong today** (audit, 31 October 2026): The compass button stops at 359 degrees with no wrap, so it can never reach the guided 15 degrees, and the ruler needs about 179 presses to get from 4,000 m to 2,000 m. The numbers are hidden.

**First fix:** Turn the compass needle by dragging or with the arrow keys (both ways, with the number shown), and lay the ruler by dragging its end.

Rebuild on the classroom pattern of [LAB-CLASSROOM](LAB-CLASSROOM.md) sections 2 and 3, as
the pendulum was: `src/lab/lessons/headings-classroom.js` (steps and model, no DOM),
`headings-board.js` (the 2D board in the steel workshop look), one line in
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

The game challenge: from the Woods pad, "Fly heading 070 for 550 m to the smoke. No arrow, no
autopilot", passed by hovering under 20 m within 30 m of the smoke. Its number is the one on the
helicopter's HEADING gauge: D turns her right and the number goes up, A turns her left and it goes
down, at 60 degrees a second; 000 is north, 090 east, 180 south, 270 west, and past 359 it comes
round to 000. Writing this script found that the smoke had been placed by the mirror reading (on
the gauge it was at 290); HELI-COMPASS puts it at the gauge's 070, before this lesson goes live.

**The board.** A map seen from above in the steel workshop look: squares of 100 m, north at the
top, the Woods pad, the lake and the trees. Kestrel One is drawn from above on the pad with a
compass ring round her (000, 090, 180, 270 and a tick every 30) and her nose line; the HEADING
gauge beside the map reads her heading in three figures, as in the helicopter. A and D turn her 5
degrees a press (held, they keep turning); the ruler stretches with ← and → in 50 m steps; Space
flies or stops. Flying, she cruises at 50 m/s with "flown" counting the metres, and leaves her
track on the map. Every number is the gauge's own (`compassBearing`, `compassDirection`).
This replaces the old map table, whose compass stopped at 359 and whose ruler needed 179 presses.

| Step | Brian says | The player does | Wrong move, and why |
| --- | --- | --- | --- |
| Wonder | The radio says: smoke at heading 070, 550 m from the pad. She flew north and missed it. Which way is 070? | Watches (R replays): she flies 550 m north, the smoke rises off to her right. | |
| Heading | The way her nose points, in degrees round from north. D turns her right and the number goes up. | D, until she has turned 30 degrees right since A was last pressed. | A first: "the number went down: A turns her left. Now try D." |
| North, east, south, west | North is 000, east 090, south 180, west 270; a whole turn is 360, back to 000. | Turns her to 090, then Space. | Not on 090: "she reads 120: 30 too far right; A turns her back, the number goes down." |
| Scale | A map's scale says how far one square is on the ground: here 100 m. | Stretches the ruler to the hut (3 squares: 300 m), then Space. | "That is 450 m: four and a half squares. The hut is 3 squares away: 300 m." |
| Watch | Brian flies a job: the hut at 120, 400 m. | Watches: the gauge climbs from 000 to 120 as she turns, then flown counts to 400 and she is over the hut. Slow motion and Watch again. | |
| Try: the smoke's heading | Turn her to 070, the smoke's heading; Space flies her 550 m. | A and D, then Space. Within 5 degrees she passes over the smoke. | "You flew 100: 30 too far right, and passed 290 m from the smoke. A turns her back: the number goes down." |
| Try: the short way round | Smoke at 340. She faces 020. Which way is shorter? | Turns to 340 and Space. A is 40 degrees; D is 320. | Wrong heading: the number and the way to turn. The long way round (D): "that worked, but A was the short way: 40 degrees instead of 320." |
| On your own: Brian's job | The real one: smoke at 070, 550 m. Turn her, fly with Space and stop over the smoke with Space. | Passes when she stops within 30 m of the smoke. | Off heading: the gauge number, how far right or left, and the miss in metres. Stopped short or past: "you stopped after 450 m, 100 m short: watch flown, stop at 550". Flew off the map: she comes back to the pad for another go. |
| Question 1 | Which heading is west? | 090, 180 or 270. | "West is 270: three quarters of the way round from north." |
| Question 2 | She reads 350 and the smoke is at 010. Which way is shorter? | D (right, 20 degrees), A (left, 340), either. | "Past 359 the number comes round to 000: D turns her 20 degrees to 010. A is the long way, 340 degrees." |
| Question 3 | One square is 100 m. The smoke is five and a half squares away. How far is it? | 55 m, 550 m or 5,500 m. | "Each square is 100 m: five and a half squares is 550 m." |
| Recap | A heading is the compass number her nose points at; D counts up, A counts down; the scale turns squares into metres (voice line `lab.brian.headings.explain`). | Three key ideas; Enter starts the game challenge with the key idea card. | |

Help on every step climbs from a nudge, to the plain step, to Brian's pointer on the control; Show
me turns her to the heading (or lays the ruler) and flies it. The key idea card in the game:
"Turn until the gauge reads 070. D turns right and counts up, A turns left and counts down; then
fly on to the smoke, 550 m." The notebook keeps the old words under their ids (`headings-heading`,
`headings-north`, `headings-east`, `headings-south`, `headings-west`, `headings-scale`); the four
compass words are learnt together on their step. The intro voice line (`lab.brian.headings.intro`,
about the map table) no longer fits a step and is not played.

**Checks** (before code): `tools/test-lab-classroom-headings.mjs` (a child who follows each prompt
passes; each wrong turn, ruler and miss says why with the real numbers; past 359 comes round to
000; help climbs to Brian's pointer and Show me passes the job; the board's smoke is where the
challenge puts it); the browser scenario `tools/scenarios/lab-classroom-headings.mjs` plays the
lesson by keyboard, with one mouse drag of the ruler, to the helicopter challenge; every
`tools/test-lab-*.mjs`, the Lab scenarios, the lane tier and the build.
