# LAB-CLASSROOM-LAUNCH

The short board entry controls current state, ownership, dependencies and locks.

Launch angles as a classroom lesson. Rebuild order 11 of 15 (LAB-CLASSROOM section 6);
audit severity 3 of 5 (5 is as broken as the old pendulum).

**What is wrong today** (audit, 31 October 2026): The landing distance is hidden before the run, the "Past the flag" picture shows the guided answer (40.8 m), and the speed button only goes up while the challenge needs a lower speed.

**First fix:** Two-way angle and speed controls with numbers shown, and result pictures that do not print the answer.

Rebuild on the classroom pattern of [LAB-CLASSROOM](LAB-CLASSROOM.md) sections 2 and 3, as
the pendulum was: `src/lab/lessons/launch-classroom.js` (steps and model, no DOM),
`launch-board.js` (the 2D board in the steel workshop look), one line in
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

The challenge stays the bench's own goal (`launchBench`): one launch that lands within 2 m of the
30 m mark. It passes on the lesson's own launches, fed to the bench through `onChallenge` as
Downforce's fan runs were; the pass gives the free Aerials reward, so the Aerials run opens on the
mountain. The recap's button says "Finish the lesson".

Numbers: every distance is `launchBench.run` (`rangeOf` in `benches/launch.js`) with the skier's own
air on and a level landing, except question 2's lower landing. The ramp tilts 5 degrees a press,
15 to 75 (the bench's own 1-degree grid). The speed dial moves 1 m/s a press, 13 to 24 m/s, shown
in mph (29 to 54). At 45 mph: 15° 19.0 m, 30° 31.6 m, 45° 35.6 m, 60° 30.5 m, 75° 17.7 m. At 45
degrees: 40 mph 29.5 m, 45 mph 35.6 m, 49 mph 42.0 m. At 49 mph: 20° 28.7 m, 70° 26.8 m. With the
landing 10 m lower, at 45 mph: 40° 43.6 m, 45° 42.7 m, 55° 38.4 m. The Aerials kicker throws the
skier at about 50 degrees (`summit-zones.js`); tucking on the inrun (Shift) is the speed a player
controls there.

**The board.** Brian's launcher in the steel workshop look, side on: a ramp on a stand at the left
whose arm tilts, a skier figure on it, a tape along the floor marked every 5 m to 50 m, and a flag
on the tape when there is a mark to reach. A launch flies the skier along its arc and leaves a
trail; the tape reads where it landed. Right: the ramp panel (↑ steeper, ↓ flatter, or a click)
and the speed dial (→ faster, ← slower, or a click), each showing its value and "set by Brian"
when locked. Bottom: the launches table (angle, speed, distance) or, in Brian's job, the mark card.
Space launches. This replaces the old 3D launcher whose speed button only went up while the
challenge needed less speed, whose landing distance was hidden before the run, and whose "Past the
flag" picture printed the guided answer.

| Step | Brian says | The player does | Wrong move, and why |
| --- | --- | --- | --- |
| Wonder | My launcher throws a skier at 45 mph. First the ramp at 60 degrees: high and slow, 30.5 m. Then 30 degrees: low and fast, 31.6 m. Two very different jumps, nearly the same spot. Is there an angle that goes further than both? | Watches (R replays). | |
| Launch angle | Launch angle is how far the ramp points up from level ground. It is at 60 degrees: tilt it to 45. | ↓ three times. "45 degrees: halfway between level and straight up." | |
| Speed | Speed is how fast the skier leaves the ramp. The dial reads 40 mph: turn it to 45. | → twice. | |
| Distance | Distance is how far it lands along the ground, read on the tape. Launch. | Space: 35.6 m, further than both first jumps. | |
| Watch | (voice `lab.brian.launch.intro`) | Five launches at 45 mph: 15, 30, 45, 60 and 75 degrees land 19.0, 31.6, 35.6, 30.5 and 17.7 m. About 45 goes furthest; steeper climbs and lands short, flatter hits the ground soon; each pair either side of 45 lands close together. Watch again. | |
| Try: past the flag | A flag at 30 m. At 45 degrees and 45 mph the skier lands 35.6 m, past it. The speed stays at 45 mph: which way do you tilt the ramp? | Guess (Steeper, Flatter, Either way), then tilt and launch until it lands within 2 m of the flag. | Steeper or Flatter picked: "Either way works: 60 degrees lands 30.5 m and 30 degrees 31.6 m. 45 is the top of the hill; both sides come down." A miss: "It landed X m, Y m past (short of) the flag: tilt further from (back toward) 45." |
| Try: a little slower | The ramp at 45 degrees. At 45 mph it landed 35.6 m. Turn the dial to 40 mph: guess where it lands. | ← twice, Space, a guess (about 34, 30 or 20 m); the tape reads 29.5 m. | 34: "Speed counts for more than that: 29.5 m. A slower skier goes forward slower and comes down sooner, so both cut the jump." 20: "Not that much: 29.5 m. 5 mph less cost 6 m." Space at another speed: "This try is at 40 mph: press ← until the dial reads 40." |
| On your own: Brian's job | Three marks. 1: a flag at 42 m with the ramp fixed at 45 degrees: set the speed. 2: a flag at 27 m with the speed fixed at 49 mph: set the angle. 3: my 30 m mark, everything yours, starting from 75 degrees and 36 mph. | 49 mph; 20 or 70 degrees; any launch within 2 m of 30 m. | Short or past: "It landed X m, Y m short of (past) the flag." with the one thing to change ("More speed: press →", "Flatter or steeper: 45 goes furthest", and on mark 2 at 15 degrees: "15 is as flat as the ramp goes: try the steep side"). |
| Question 1 | At 45 mph the 50 degree ramp lands 34.9 m. Which other ramp lands close to it? | 40, 55 or 70 degrees. | 55: "33.2 m, 1.7 m shorter. 40 is as far below 45 as 50 is above: 35.2 m." 70: "Far too steep: 22.7 m." |
| Question 2 | The landing is 10 m lower, like the Aerials hill below its kicker. At 45 mph, which ramp goes furthest? | 40, 45 or 55 degrees (pictures of the drop). | 45: "42.7 m; 40 degrees goes 43.6 m. The skier has longer to fall, so a flatter ramp that sends more speed forward wins." 55: "38.4 m: steeper loses more." |
| Question 3 | On the Aerials run the kicker always throws you at about 50 degrees. To fly higher and further, what do you do? | Tuck on the inrun (hold Shift) to come off faster; lean back to make the kicker steeper; ski slower so it throws you higher. | Lean back: "The kicker is snow: its angle is fixed. Your speed is yours: tuck on the inrun." Slower: "Slower lands shorter: at 50 degrees, 40 mph lands 28.9 m and 49 mph 41.1 m." |
| Recap | About 45 goes furthest, more speed goes further, a lower landing wants a flatter ramp (voice `lab.brian.launch.explain`). | Three key ideas; Enter finishes the lesson and opens the Aerials run. | |

Help on every step climbs from a nudge, to the plain step, to Brian's pointer on the ramp panel, the
dial or the launcher; Show me tilts, turns and launches for the player. The notebook keeps the old
words under their ids (`launch-launch-angle`, `launch-speed`, `launch-distance`).

**Checks** (before code): `tools/test-lab-classroom-launch.mjs` (every distance is `launchBench.run`'s;
a child who follows each prompt passes; each wrong guess and miss says why with the real numbers;
help climbs to Show me; the lesson's launches pass the bench's goal and fail it without a 30 m
landing); the browser scenario `tools/scenarios/lab-classroom-launch.mjs` plays the lesson by
keyboard, with one click on the ramp panel, to the pass and the Aerials reward. Lane tier, build,
every `tools/test-lab-*.mjs` and the Lab scenarios. The old Launch lesson, its 3D drawing and the
Launch parts of the snow suite and scenario go in this card.
