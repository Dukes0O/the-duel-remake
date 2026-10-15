# GP-RACECRAFT

The short board entry controls current state, ownership, dependencies and locks.
These are the card's detailed design, acceptance and recorded decisions.

## Kyle's report (15 October 2026)

"Right off the bat, the cars all try and get into a single file line. That's
not really reflective of real Grand Prix racing. You just start and wait for
them to get in a line, and then you can nitro your way all the way into first
place. The cars also won't necessarily pass you unless you're out of their
lane." He wants it fixed **behind a switch and previewed first**, not live.

## Why it happens today (read on integration, 15 October)

- Every CPU car steers to one shared racing line. At the start each car's
  `bias` is 0 (`src/race-field.js` about 238), so it heads for the line at
  once from its grid slot (`src/race-field-driver.js` about 240 and 400 to 403).
  Only the side-by-side clamp keeps them apart, so the field files up.
- A CPU only starts a pass on a straight, after 10 s, within about 1.2 s of
  the car ahead, when its pace beats that car's. For the player, "pace" is the
  player's speed at that instant (about 327), so a player braking or at top
  speed never looks slower. The pass lane must also clear the racing line and
  any car (`passLane`, `crowded`, about 300 to 351). A player on the line is
  simply followed at a stopping-distance cap (about 84 to 91, 374 to 376).
- CPU cars never use nitro; the player's tank refills in about 36 s
  (`src/config.js` BOOST about 227 to 234). Nitro alone wins races.

## Design (switch `cpu-racecraft`, dev; everything below only when it is on)

1. **Starts stay wide.** Each car starts with its bias at its grid slot
   (`gridLateral` minus the line offset) and lets it relax to the racing line
   over the first 500 m or until the first braking zone, whichever is later,
   only while the road ahead in its lane is clear. Into the first corner the
   field arrives two and three wide; the inside car takes the corner, the
   outside car either holds it side by side or tucks in behind on the exit.
2. **The player is judged by real pace.** For pass decisions the player's
   pace is their best recent sector pace (rolling over the last 10 s of
   comparable road, or their lap pace once they have one), not their speed
   that instant. A faster CPU car behind a slower player will try to pass.
3. **More ways to pass.**
   - Pull alongside on a straight even when the player is on the racing line
     (the CPU takes the other side; "crowded" counts only cars actually
     alongside or within 1 s ahead in that lane).
   - Outbraking: a car alongside on the inside at the braking zone brakes
     later and claims the corner (today's dive, made possible against the
     player too).
   - Exit passes: a car with a better exit uses the tow and goes past on the
     next straight.
   - Gap window up to 1.5 s for aggressive drivers.
4. **CPU nitro.** Each CPU car gets the same nitro tank, strength and refill
   as its car and upgrades would give the player, used only on straights, to
   attack (passing or closing a gap under 1 s) or to defend (a car alongside
   or within 0.5 s behind), more often for aggressive drivers, never in the
   pit lane. Nitro stops being an automatic win; it becomes a duel.
5. **Fair and safe.** No catch-up or rubber-banding: CPU pace profiles are
   unchanged. Contact rules unchanged. The race stays repeatable from the seed
   and inputs.

## Acceptance

- Switch off: every existing race-field, reference-lap, podium, integrity
  and replay result byte-identical (the new code draws no random numbers
  unless the switch is on).
- Switch on, measured over 20 seeded Grand Prix races on three circuits
  (Panorama, Tremblant Woods, one original GP circuit), stock player
  autopilot as today's balance tools use:
  - at the first braking zone, in at least 15 of 20 races three or more cars
    are within half a car's width of side by side somewhere in the field;
  - CPU-on-CPU passes per race at least double today's, with the crash count
    within today's bound in `test-race-field.mjs`;
  - with the player autopilot set 3% slower than the field, CPU cars pass the
    player in every race;
  - a player who nitros off the line from last does not reach first place by
    the end of lap 1 in more than 5 of 20 races (today: report the number);
  - race times within 2% of today's.
- One independent review of the code and numbers. Lane tier, build.
- **Preview for Kyle:** add `cpu-racecraft` to `tools/preview-flags.mjs` so the
  existing desktop preview (start-preview, port 5195) runs with it on. Kyle
  drives it and decides; it does not go live without his go.

## Owned files (ask to re-slice before touching others)

`src/race-field-driver.js`, `src/race-field.js` (grid bias and nitro state
only), `src/feature-flags.js` (the switch), `tools/preview-flags.mjs`,
`tools/test-race-field.mjs` (new cases only), a new measuring tool
`tools/racecraft-rate.mjs`, and `docs/changes/GP-RACECRAFT.md`. Locks:
`busy-game-files`.
