# DRIVE-LESSON-LATE-LINE

The short board entry controls current state, ownership, dependencies and locks.
The design is `docs/DRIVING_LESSONS.md` section 12.7.

## Claude's design (24 October 2026)

The old late-try line, `drive.radio.corner.late.result` ("sliding is slow.
Look at the time you lost"), is untrue: on these tyres braking late costs
screech, not time. Its replacement, in two lines picked by how the try ends:

| Id | When | Line |
| --- | --- | --- |
| `drive.radio.corner.late.slid` | The late try finishes after at least 0.5 s of screech | Hear that screech? Your tyres slid past their best grip, so the car could not steer or stop as well. You got away with it here. On snow you won't. |
| `drive.radio.corner.late.off` | The late try ends against a wall or off the road | That's where a slide takes you. Brake at the first cone, and keep it clean. |

`late.early` stays for a try that braked before the board. `late.result` is
removed from the catalogue and the voices folder in the same change.

Both lines are recorded in DRIVE-LESSONS-LINES-2, with lessons 2 to 4's lines
in one session. That card takes this one over; drop this card's board entry
when DRIVE-LESSONS-LINES-2 starts.
