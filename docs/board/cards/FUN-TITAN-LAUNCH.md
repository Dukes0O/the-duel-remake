# FUN-TITAN-LAUNCH

The short board entry controls current state, ownership, dependencies and locks.

Claude, 24 October, for Kyle and Gratian. The monster truck (Titan) used to
take huge jumps when it drove over another car. A later fix made it roll over
cars instead, and Gratian misses the jumps. Bring them back on purpose.

**Settled design:**
- First find the change that removed it: search the history of the contact and
  crash code (`git log -S` on the car-over-car contact in `src/`, the CRASH-0x,
  ARENA-RAMP-SIDE and TITAN-HANDLING merges of late September) and describe in
  the change note what the old behaviour was and what replaced it.
- Bring back the launch for the Titan only: when its wheels drive up onto
  another car at speed, the car acts as a ramp. Target at 30 mph: at least
  1.0 s in the air and at least 2.5 m of height; faster gives more. It lands
  on its wheels without a reset when it lands flat, like any other jump.
- Every other car keeps today's contact rules. Race rules stay repeatable
  from the seed; only Titan replays may move, and each moved pin is listed
  with the reason.
- Sound cue: the existing jump/landing sounds; no new recording.
- Test first: a scripted Titan at 30 mph driving over a parked car shows
  today's roll-over (fails), then the launch.

No switch: Kyle asked for it back. Listed under "Keep these" in
`docs/board/decisions.md`.
