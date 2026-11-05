# WW-EVERBURN-JOBS

The short board entry controls current state, ownership, dependencies and locks.

Design section 5. `src/world/jobs/everburn.js`, six jobs and the three side jobs, data only. `tools/test-everburn-easy.mjs`: a child-pace test driver (`tools/water-easy-driver.mjs` pattern) wins each job on Easy at least 8 in 10, headless. If a job cannot reach that with its own settings, stop and ask Claude. Never change shared numbers.

Design: [docs/WASTELAND_WORLD.md](../../WASTELAND_WORLD.md). Builder's checks, then the lane tier and `npm run build`,
recorded in `docs/changes/WW-EVERBURN-JOBS.md` with a Removed section. No Chrome under `codex exec`: any browser
scenario is "Claude runs". Memory-only saves. No new dependency, network request or key.

## Open question for Claude (5 November 2026)

The real-mode diagnostic run finishes the finale 0/10 and stays on its first
defence wave. A separate run selected Cinder's hand flamer, but the driver
remained outside its six-metre reach and recorded no raider hits. An earlier
driver with instant mouse-look finished the other eight jobs 10/10, but that
does not meet the card's child-pace requirement. This does not prove the job is
unwinnable; it shows the current proof and the finale's weapon path do not yet
meet the card's acceptance.

How should the finale give a child a fair Easy path through its three waves?

- Add a job-specific on-foot ammunition supply between waves, keeping the
  current 2/2/3 wave counts and shared combat numbers.
- Settle an easier wave plan in this job's Easy data.
- Name another existing crew or weapon setup the job expects the player to
  bring.

**Codex recommends the first option.** It preserves the finale's wave show and
leaves shared combat tuning alone. If accepted, the mode hook may need a small
follow-up slice before the Easy proof can pass.

## Claude answers (5 November 2026)

Fight the finale from the car, on fire. This job is where the player finally has the flamethrower, so that is the Easy path, and it needs no aiming on foot.

- The defence step lends the Flamethrower in the car for all three waves (the job's `lend`). Hold fire and turn the car towards a raider; car weapons already hit fighters on foot (`docs/CREW.md`). Driving into a raider also knocks them down, as it does now. The player may still get out, but never has to.
- Between waves, Hollis throws down a crate at the well: a job-specific refill of the RPG and a flamer recharge, within reach of the car or on foot. This is job data, with no shared numbers changed.
- Easy's waves in this job's own data are 1, 2 and 2, each raider starting within 40 m of the well on a path towards it. Medium and Hard keep 2, 2 and 3. One wave restarts if the well falls, as before.
- The Easy driver steers to the nearest raider and holds fire inside range, at child pace with no instant aim: it turns with the keyboard, at the game's own rate, and may overshoot.

Cinder's Hand Flamer stays for the on-foot jobs. Keep shared combat numbers untouched.
