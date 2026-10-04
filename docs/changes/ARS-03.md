# ARS-03: Arsenal wave three

4 October 2026. Source built; final reviews and gates pending.

## Decisions Before Code

Use the native weapon trigger, cooldowns, damage, targeting and car effects.
Both arsenal switches and the discovered career gate are entry rules.
Wave three has its own dev switch. Earlier Arsenal weapons stay unchanged.

- Mortar commits the predicted landing point when fired. Its 3 m radius
  red ring stays visible for the full 1.6 s flight. Damage falls linearly
  from 25 at the centre to zero at the edge. The small hop uses the existing
  vertical flight with a 3 m/s launch, scaled by the same falloff.
- Tesla follows its owner's current position during the 0.4 s charge.
  Its 15 m pulse consumes a star shield instead of disabling that car.
  Other hostile cars receive the native disabled effect for 3 s.
- Drone uses the generic active decoy actor and target contract. It follows
  its owner's line, 10 m beside it, for 5 s, with the owner's team. Its first
  hostile hit bursts it; it never fires, scores or pays.
- Nitro uses the native timed effect for 3 s: top speed and acceleration
  times 1.35, crash ram damage times 3. Existing damage ceilings still apply.
  Oil cancels it through the existing counter.

Transient two-hit history stays outside serialized race and save data.
Wave-three computer decisions use the ranges in docs/ARSENAL.md.
Mirage's existing boss file is reused through its generic decoy contract.

## Checks

- Independent native acceptance: 51 cases, 304 checks pass. Includes real
  Crossbow/RPG flights, reward guards, CPU decisions, both gates and levels.
- Existing Arsenal runtime: 209 cases, 2,625 checks pass.
- Laptop-only browser: 16 captures in high and performance modes pass;
  canvas pixels, renderer purity, native Oil counter, zero console issues.
  Drone's opponent HUD marker is excluded; Mirage's existing labels remain.
- Balance: 30 of 30 main Hard races finish; 12 wins. Naturally seeded CPU
  loadouts use all four weapons. Zero unattributed new weapon cues.
  One new defensive supplement stalled against scenery; legal brake/reverse
  recovery now finishes it in 554.49 s, with a loss. Historical policies
  are unchanged. The complete sample must be rerun on the final gated base.
- Nine sound recipes produce 27 cached CC0 recordings; 31 audio checks pass,
  including native CPU/player Voice ownership for all four new actions.
- Browser audio: 27 decodes; all nine native cues; owned loops end and pause.
  Contrast is 6.56 to 9.95 dB over the engine; overlapping mix peak is 0.8202.
- Pending: source/save/audio reviews, final full balance and frame checks,
  lane gate and build on the final integration base.

Independent reviewer regressions on `23263d4`, before fixes:
`node tools/test-arsenal-wave3.mjs` runs 55 cases and 338 checks. All original
51 cases pass unchanged; four added cases fail for the reported behavior:
- `Star does not protect its Scrap Magnet from Tesla`: the native enemy
  Magnet remains active after its real Star is consumed (1 instead of 0).
- `every live Tesla slot is disabled in the native HUD`: all four slots stay
  enabled at the pulse and just before expiry. Native Crossbow and boost
  denial, their recovery at expiry and visible READY restoration already pass.
- `the native level-three Tesla ring shows two seconds of its actual recharge`:
  the ring shows 2 degrees instead of 61 for the real 18 / 1.15^3 cooldown.
  Ordinary starter recharge and its HUD progress pass unchanged.
- `the actual player Mortar commits the nearest ahead enemy across the ground`:
  it picks the enemy 1 m ahead and 10 m sideways instead of the nearer enemy
  7 m straight ahead. Both are inside the legal 20 m half-width. Existing
  computer leader and range checks remain green.

HUD tests call production createCombatHud with a small in-file semantic DOM
fixture. Only unavailable element/style methods are substituted; effects,
weapon triggers, upgraded cooldowns and driving are native. No dependency or
helper file was added. Tesla's creation step ages its effect by one 120 Hz tick;
the expiry checks include that tick rather than substituting an effect.
No existing assertions, source or replay fingerprints were changed. Focused
laptop headless tests only; no build, browser or broad gate in this follow-up.

Release-base merge checks (4 October, parents `07d6b45` and `3eb740d`):
- Native wave three: 51 cases, 304 checks; Voice: 26 cases, 358 checks;
  wave-three audio/native Voice: 31 checks; flags: 39; Preview: 22. All pass.
- Production build passes in 535 ms (existing large-chunk warning).
- Private port 23901, memory-only desktop scenario: 16 high/performance
  captures, zero warnings or errors. Evidence: `.evidence/2026-10-04/ARS-03-release-base/`.
- Full/lane tiers and final balance remain for the Director's serial gate.
  Tesla HUD disable/recharge display and shield-plus-Magnet review are pending.

The existing unimplemented purchase denial changes only its Mortar input to
an unknown weapon ID. Its refusal and no-write assertions are unchanged.
After merging the 4 October release base, the native wave-three gate test
expects `FEATURE_STATES.arsenal` to be `on` instead of `dev`. The same invariant
still protects the existing Arsenal state; the release changed that state.
The catalog check keeps all five released features on and both new dev flags,
with nine entries. Explicit dev isolation fixtures and gameplay checks remain.

## Removed

The old Mortar unimplemented-purchase fixture input is replaced; refusal
assertions stay unchanged. Temporary Gunn admission/reward, dev/Preview and
look-only Armory handoffs are excluded. Its separate lane is retained.
