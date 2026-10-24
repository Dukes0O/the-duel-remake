---
task: DRIVE-LESSONS-LINES-2
status: done
flag: driving-lessons
player_facing: no
---

# DRIVE-LESSONS-LINES-2: Brian's lines for lessons 2 to 4, the true late-try lines, the shift-light ticks

Claude (Sonnet 5.5 side session), 24 October 2026. Card
`docs/board/cards/DRIVE-LESSONS-LINES-2.md`; design `docs/DRIVING_LESSONS.md`
12.7 and 12.8. Behind `driving-lessons` (dev): nothing changes for players.

## Changed

- Recorded the 32 lines of 12.7 with Brian, one take each, no retakes, through
  `node tools/audio/elevenlabs.mjs say --keep`. Takes in `audio-src/voices/`,
  32 catalogue rows in `tools/audio/catalog.json`, runtime copies in
  `public/assets/audio/voices/` made unchanged by
  `node tools/audio/build-drive-lessons.mjs --voices` (47 driving lines now).
- `src/lessons/drive-radio-lines.js`: the 32 new ids with the design's exact
  words (`drive.radio.line.*`, `gears.*`, `snow.*`, `corner.late.slid`,
  `corner.late.off`); the three shift-light cues (below).
- `src/lessons/drive-lessons.js`: the late try now says `late.early` if it
  braked early, else `late.off` if it ended against a wall or off the road,
  else `late.slid` after at least 0.5 s of screech, else nothing. Before it
  played `coach.screech` after a screech and nothing at a wall.
- `docs/DRIVING_LESSONS.md` section 6: the `late.result` row and the "not
  played" paragraph are replaced by the true late-try rule; the radio count
  reads 15 lines plus the 32 of 12.7.
- `tools/test-drive-lesson-lines.mjs`: the design now lists 47 lines (section
  6 plus 12.7), 51 cues (47 lines, the cone, three shift-light ticks),
  credit and size limits widened to the two cards' use, a check that the old
  line is gone from the table, catalogue and bank, and checks on the ticks.
- `tools/test-drive-lessons.mjs`: see Changed assertions.
- `tools/test-drive-lesson-run.mjs` needed no change: its late-try cases check
  the screech time and the unchanged profile, not the radio line.

## Voice

- Brian (`nPczCjzI2devNBz1zQrb`), `eleven_multilingual_v2`, stability .4,
  similarity .8, style .35, speaker boost: identical to lesson 1 and the
  helicopter lines (the lines test compares the settings).
- Credits: 2426 characters, 2426 credits by the take records (one per
  character, the estimate). The account counter moved 13,016 over the whole
  month so far (other sessions' use included) and read 13,104 of 32,613
  used, **19,509 left** after the run; it lags, so treat both as estimates.
  Rate limits (HTTP 429) stopped the run once; it waited and carried on, and
  no take was lost or paid for twice.
- Total 142 s of speech, 2.30 MB. Runtime folder for all 47
  driving lines: 3.30 MB.

## Loudness (measured from the kept takes, not by ear)

FFmpeg loudnorm analysis (`tools/audio/measurements.mjs`), per take, before
the radio chain. Lengths 2.6 to 9.6 s. Integrated loudness
-25.4 to -22.6 LUFS. True peaks -7.6 to -2.6 dBTP, so
**every take is under the -1 dBTP limit**.

**The card asked for speech about -18 LUFS. These takes are at about -24.**
Lesson 1's and the helicopter's takes are at the same level (-22 to -25), and
all of them play unchanged through the radio chain, whose output gain is 1.3
(about 2.3 dB) on the voice bus. I did not push these louder: the new lines
would then sit above lesson 1's and the helicopter's. They match the
existing voices within about 1.5 LU. If Kyle hears them as too quiet, change
the voice bus or the chain's output gain once for all of them, not take by
take. I cannot hear them; Kyle should listen when the lessons play.

| Id | Text | File | Length (s) | LUFS | True peak (dBTP) |
| --- | --- | --- | --- | --- | --- |
| `drive.radio.line.intro` | Lesson two: the racing line. Through linked corners, the fastest way is not the shortest. | `drive-radio-line-intro.mp3` | 5.4 | -25.0 | -5.4 |
| `drive.radio.line.middle.start` | First, stay in the middle of the road. Follow the markers. | `drive-radio-line-middle-start.mp3` | 3.0 | -24.3 | -4.0 |
| `drive.radio.line.middle.result` | Felt tight, didn't it? The middle of the road makes every bend sharper, so you have to go slower. | `drive-radio-line-middle-result.mp3` | 5.3 | -24.8 | -4.8 |
| `drive.radio.line.right.start` | Now use the whole road. Start wide, touch each inside cone, and let the car run out wide between them. | `drive-radio-line-right-start.mp3` | 6.2 | -23.7 | -6.0 |
| `drive.radio.line.coach.apex` | Closer to the inside cone. Use every bit of road. | `drive-radio-line-coach-apex.mp3` | 3.0 | -23.7 | -3.5 |
| `drive.radio.line.coach.early` | You turned in too early and ran out of road. Wait a moment longer, then turn. | `drive-radio-line-coach-early.mp3` | 4.0 | -22.6 | -5.6 |
| `drive.radio.line.right.pass` | Feel how straight that was? A wider line is a gentler curve, and a gentler curve is a faster one. | `drive-radio-line-right-pass.mp3` | 6.4 | -24.8 | -5.2 |
| `drive.radio.line.challenge.start` | Now beat my time through the esses. Three in a row. | `drive-radio-line-challenge-start.mp3` | 2.7 | -24.1 | -4.1 |
| `drive.radio.line.pass` | Three in a row. Better handling for your car, and the next lesson is open. | `drive-radio-line-pass.mp3` | 4.6 | -24.1 | -4.5 |
| `drive.radio.gears.intro` | Lesson three: the gearbox. Today you change gear yourself. E is up, Q is down. | `drive-radio-gears-intro.mp3` | 5.0 | -24.8 | -5.2 |
| `drive.radio.gears.early.start` | First, change up as soon as the needle passes the green mark. | `drive-radio-gears-early-start.mp3` | 3.1 | -24.4 | -5.5 |
| `drive.radio.gears.early.result` | Sluggish, wasn't it? An engine is weak at low revs. Changing up early drops it below where it pulls. | `drive-radio-gears-early-result.mp3` | 6.1 | -23.8 | -4.5 |
| `drive.radio.gears.right.start` | Now hold each gear until the lights come on, then change up. Change down while you brake, so you leave the corner in my gear. | `drive-radio-gears-right-start.mp3` | 7.0 | -23.4 | -5.5 |
| `drive.radio.gears.coach.limiter` | That was the limiter. Change up when the lights come on, not after. | `drive-radio-gears-coach-limiter.mp3` | 3.8 | -24.4 | -6.2 |
| `drive.radio.gears.coach.down` | Too high a gear coming out. Change down while you brake. | `drive-radio-gears-coach-down.mp3` | 3.1 | -24.3 | -4.8 |
| `drive.radio.gears.right.pass` | Hear it pull out of the corner? That's the right gear. | `drive-radio-gears-right-pass.mp3` | 2.8 | -23.5 | -6.4 |
| `drive.radio.gears.challenge.start` | Now beat my time, changing gear yourself. Three in a row. | `drive-radio-gears-challenge-start.mp3` | 2.9 | -24.3 | -4.8 |
| `drive.radio.gears.pass` | Three in a row. More power for your car, and the next lesson is open. | `drive-radio-gears-pass.mp3` | 4.2 | -24.7 | -7.2 |
| `drive.radio.snow.intro` | Lesson four: snow. On summer tyres you have about half the grip you have on a dry road. | `drive-radio-snow-intro.mp3` | 4.9 | -25.2 | -5.5 |
| `drive.radio.snow.late.start` | First, brake where you would on a dry road. The red board shows it. | `drive-radio-snow-late-start.mp3` | 3.9 | -24.9 | -3.4 |
| `drive.radio.snow.late.result` | Half the grip means about twice the road to stop. That's why you ran out of corner. | `drive-radio-snow-late-result.mp3` | 4.3 | -25.3 | -7.4 |
| `drive.radio.snow.right.start` | Now brake at the snow cone, gently. Do your braking before the ice, never on it. Then turn in smooth. | `drive-radio-snow-right-start.mp3` | 6.4 | -24.0 | -5.9 |
| `drive.radio.snow.coach.brake` | Earlier. On snow, start braking at the cone. | `drive-radio-snow-coach-brake.mp3` | 2.6 | -24.3 | -6.9 |
| `drive.radio.snow.coach.ice` | You braked on the ice. Brake before it, roll across it, then turn. | `drive-radio-snow-coach-ice.mp3` | 3.9 | -24.1 | -7.3 |
| `drive.radio.snow.coach.turn` | Turn in more gently. Sudden steering on snow slides the front. | `drive-radio-snow-coach-turn.mp3` | 3.6 | -24.7 | -2.7 |
| `drive.radio.snow.right.pass` | Smooth and early. That's how you drive on snow. | `drive-radio-snow-right-pass.mp3` | 2.7 | -23.3 | -7.6 |
| `drive.radio.snow.challenge.start` | Now beat my time, three in a row, on summer tyres. | `drive-radio-snow-challenge-start.mp3` | 2.9 | -24.7 | -4.8 |
| `drive.radio.snow.winter.start` | Same corner, now on winter tyres. Feel the difference. | `drive-radio-snow-winter-start.mp3` | 2.9 | -24.4 | -5.2 |
| `drive.radio.snow.winter.result` | Winter tyres use softer rubber that stays grippy in the cold, and deep cuts that bite into the snow. | `drive-radio-snow-winter-result.mp3` | 5.8 | -25.4 | -6.0 |
| `drive.radio.snow.pass` | That's every driving lesson I have for now. Better tyres for your car. Well driven. | `drive-radio-snow-pass.mp3` | 5.2 | -24.5 | -2.6 |
| `drive.radio.corner.late.slid` | Hear that screech? Your tyres slid past their best grip, so the car could not steer or stop as well. You got away with it here. On snow you won't. | `drive-radio-corner-late-slid.mp3` | 9.6 | -24.2 | -5.0 |
| `drive.radio.corner.late.off` | That's where a slide takes you. Brake at the first cone, and keep it clean. | `drive-radio-corner-late-off.mp3` | 4.5 | -24.0 | -3.8 |

## The shift-light cue

`lesson.shift-light`, `lesson.shift-light.2`, `lesson.shift-light.3`: three
rows, not one. The engine has no pitch change per play (`_playCue` takes none),
so the three rising pitches are three recipes: a 0.06 s soft triangle tick at
880, 1,109 and 1,319 Hz (an A, a C sharp and an E) with a quiet octave
overtone, volume .05 (overtone .015), interface bus, behind the switch. The
sum of the layers never exceeds .065 of full scale (about -24 dBFS), well
under the -1 dBTP limit. The view card picks the tick for each light by id.
This is a small change from the design's single row `lesson.shift-light`;
it keeps that id for the first tick.

## Changed assertions (reviewed)

- `tools/test-drive-lessons.mjs`, late-try radio test: the screech case
  expected `drive.radio.corner.coach.screech`; it now expects
  `drive.radio.corner.late.slid`. New cases: a try that ends at a wall
  expects `late.off` (with or without screech), and an early brake still wins
  over a wall (`late.early`). The 0.49 s case still expects nothing.
- `tools/test-drive-lessons.mjs`, the lesson-1 run test: the late try's radio
  was `coach.screech`; it is now `late.slid` or `late.off`. Same coverage; the
  old line was untrue (the card's written review).
- `tools/test-drive-lesson-lines.mjs`: counts 16 to 47 lines and 17 to 51
  cues; credit limit 1,500 to 6,000 and size limit 1.5 MB to 4 MB.

## Removed

- `drive.radio.corner.late.result`: the line, its take
  (`audio-src/voices/` and `public/assets/audio/voices/`), its catalogue row,
  its table row and the paragraph that explained it in section 6. Nothing
  else used it (the snow lesson has its own `snow.late.result`).

## Not done

- `drive.radio.line.coach.exit`, the racing-line exit line DRIVE-LESSON-2
  asked for, is not in 12.7 and was not recorded. It needs a design line and
  a card; lesson 2 keeps reusing `drive.radio.corner.coach.exit`.
- No audio was listened to; every check is a measurement or a test.

## Tests

(Filled in at the end of the card: card checks, lane tier, build.)
