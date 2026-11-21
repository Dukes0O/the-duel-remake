# BOWL-MISSILE

The short board entry controls current state, ownership, dependencies and locks.

**Codex model: Astra** (a flying weapon that steers, a sight on the mouse, a weapon camera). Kyle, 20 November 2026:
graphics and physics go to Astra, the rest to Sol.

A missile aimed through a sight with the mouse. Design: [BOWL-SHOW-3](BOWL-SHOW-3.md), section 5, with Kyle's words. After
the first release (needs BOWL-FINISH). The replay of a hit is BOWL-REPLAY's; this card sends the events it needs.

## What to build

1. **The weapon** `missile` in `src/bowl/bowl-weapons.js`, open in Last Truck Rolling on Night 5 (with the launcher) and
   on the tour nights, chosen on the weapon card. Its line: "Look through the sight with the mouse, put a truck in the
   cross hairs and fire." Rivals do not carry it.
2. **The sight.** A right click raises it and a second right click lowers it; Q does the same if no Bowl key uses Q
   (check `src/input-contexts.js`; otherwise the click alone). Reuse the on-foot mouse capture in `src/app.js` (pointer
   lock on the canvas, `movementX` and `movementY`, a refused lock still usable), extended to the Bowl while the sight is
   up. The mouse turns the sight up to 70 degrees either side of the nose, from 5 down to 30 up. The keys still drive;
   top speed is half while the sight is up. Esc lowers the sight and frees the mouse.
3. **The sight's camera** (`src/bowl/bowl-camera.js`): on the truck's roof, looking along the sight, eased in and out over
   0.4 seconds (the show camera never cuts). The view draws cross hairs, a ring of 4 degrees, the range in metres to what
   is under the cross hairs, and the load gauge.
4. **The lock:** a rival inside the ring within 90 m starts it; the lock ring closes in 0.5 s on Easy, 0.8 on Medium, 1.1
   on Hard, and holds while the rival stays within 8 degrees.
5. **Fire** with a left click; one missile in the tube, 6 seconds to load the next.
6. **Flight:** from the roof tube, climbing 3 m, at 40 m a second. Locked, it turns towards the rival at up to 120 degrees
   a second; unlocked, it flies straight along the sight. It bursts on the first solid or ground it meets. Rivals dodge a
   locked missile within 20 m on no shot on Easy, one in four on Medium, one in two on Hard, by `src/rng.js`.
7. **A hit:** a quarter of full health, the truck thrown up 2 m and turned a quarter, smoking for 2 seconds. A miss: a 3 m
   blast that pushes trucks and damages none, the driver's own included.
8. **Repeatable:** the sight's two angles are inputs, read at the fixed step and recorded as keys are; a race with
   missiles replays from seed and inputs.
9. **Events:** `bowlMissile {phase: 'sight' | 'seek' | 'lock' | 'fire' | 'hit' | 'miss' | 'loaded', from, to, at}`,
   with `fire` carrying the launch point and time and `hit` the target, its knock-out and the flight's distance, which
   is what BOWL-REPLAY reads.
10. **Drawing here:** plain shapes only (a tube on the roof, a grey missile, a line of grey puffs, an orange ball for the
    burst); BOWL-SHOW-3-LOOK draws them properly.

## Files and locks

`src/bowl/bowl-weapons.js`, `src/bowl/bowl-missile.js` (new), `src/bowl/bowl-camera.js`, `src/bowl/bowl-weapons-view.js`,
`src/bowl/bowl-hud.js` (cross hairs, ring, range, gauge), `src/bowl/bowl-lines.js`, `src/app.js` (the mouse, one block
beside the on-foot capture), `src/input-contexts.js` only if Q is free, `tools/test-bowl-missile.mjs` (new),
`tools/test-bowl-weapons.mjs`, `tools/test-bowl-camera.mjs`. Locks: `bowl-night`, `bowl-rivals`.

## Checks

1. `tools/test-bowl-missile.mjs`: a locked missile fired across the floor hits a rival that does not dodge, on every seed;
   an unlocked one flies straight; one stops at the Spine; lock times by level; dodges by level over 40 shots; the load
   time; a miss damages nobody; two runs of the same seed and inputs, sight angles included, end the same.
2. `tools/test-bowl-weapons.mjs`: the weapon card lists the missile on Night 5 only of nights 1 to 5; `test-bowl-camera`:
   the sight's camera eases in and out and never cuts.
3. Laptop only, Claude runs: Last Truck Rolling on Night 5 by hand with a mouse and with the touchpad.

Before CARD DONE, search `tools/` for the weapon list and `_footPointer` and bring each older suite that names them up to
date. `src/app.js` is a shared file, so the night after the merge is a full one (rule 13).

## Sound cues

`bowl.missile.sight` (the sight comes up; stand-in `interface.radar`), `bowl.missile.seek` (the lock beeps, quicker as it
closes; stand-in `interface.countdown`), `bowl.missile.lock` (the steady tone; stand-in `interface.near-miss`),
`bowl.missile.fire` (stand-in `weapon.rocket.fire` if it is in the bank, else `combat.explosion` at low volume),
`bowl.missile.fly` (a loop that follows the missile; stand-in `vehicle.boost`), `bowl.missile.hit` (stand-in
`combat.explosion`), `bowl.missile.miss` (stand-in `vehicle.crash`), `bowl.missile.loaded` (stand-in `interface.bonus`).
Check each stand-in exists in `src/sound-bank.js` and pick the nearest that does.

## How it merges

Behind `titan-bowl`, but it changes `src/app.js`, a shared file, so the lane tier before the merge:
`node tools/run-tests.mjs --tier lane --changed --jobs 4` and `npm run build`, recorded in `docs/changes/BOWL-MISSILE.md`
with a Removed line. One independent review (rule 17, code). No Chrome under `codex exec`: check 3 is "Claude runs".
Memory-only saves. No new dependency, network request or key. Clean up nothing outside this lane.
