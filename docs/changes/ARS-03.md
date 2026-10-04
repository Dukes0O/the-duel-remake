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
Review fixes: Tesla ends Magnet even when Star prevents disable. HUD uses the
native effect/recharge rule. Player Mortar compares ground distance among
enemies ahead; CPU leader policy and authored tests stay exact.
Claude via Kyle, 4 October: read every catalog warlord weapon as earned when
its saved ownership OR its named warlord defeat exists. Armory, slots and
upgrades use that entitlement. Reads and normalization never save a grant;
first-win settlement still saves the explicit earned reward as before.

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
- Pending: final reviews, balance, frames, lane gate and build.

Independent reviewer regressions on `23263d4`: 55 cases/338 checks;
the original 51 pass and four new cases fail: Star retains Magnet, live Tesla
slots remain enabled, upgraded recharge shows 2 degrees instead of 61,
and player Mortar selects the farther ground target. Native Crossbow/boost
denial, recovery, ordinary timing and CPU leader/range checks already pass.
HUD uses an in-file semantic DOM fixture; combat and driving remain native.

Source fixes on test base `24cc7ec2`: Tesla cancels Magnet before consuming
Star; HUD displays DISABLED until the real effect expires and uses native
Arsenal recharge; player Mortar sorts ground distance. CPU leader stays exact.
Focused pass: wave three 55/340, HUD 8, Voice 26/358, audio 31,
Arsenal runtime 209/2,625, combat replays 12, build 568 ms. Assertions exact.
No new browser or broad tier; the two previously unreached checks now run.

Earned-reward red tests after metadata merge `bb713`: native suite has 99
cases/438 executed checks, 62 pass and 37 expected failures; original 55 pass.
For each Smoke/Rockets/Drone reward in structured and supported legacy defeat
shapes, failures report missing rank-one ownership, pure equip refusal, missing
native Armory slot, repeat purchase offer, early upgrade refusal and native
App equip refusal. The real Mirage rematch also lacks derived ownership.
Six independent read-purity cases pass: memory save bytes and App profile
stay exact, zero writes, no normalization grant, named-player isolation and
gate-off equipment. Saved ownership alone and native first-win saved reward
controls pass. App cases also check durable slots and arena launch once fixed.
Existing assertions/replay pins stay exact; no source edits.

Release-base checks (4 October, parents `07d6b45`/`3eb740d`): wave three
51 cases/304 checks; Voice 26/358; audio 31; flags 39; Preview 22; build 535 ms
pass. Private port 23901, memory-only: 16 high/performance captures, zero
issues; `.evidence/2026-10-04/ARS-03-release-base/`. Final gates remain pending.

Unimplemented purchase denial replaces only the Mortar input with an unknown
weapon ID; refusal and no-write assertions stay unchanged.
After merging the 4 October release base, the native wave-three gate test
expects `FEATURE_STATES.arsenal` to be `on` instead of `dev`. The same invariant
still protects the existing Arsenal state; the release changed that state.
Catalog: five released features on, both dev flags; isolation checks remain.

## Removed

The old Mortar unimplemented-purchase fixture input is replaced; refusal
assertions stay unchanged. Temporary Gunn admission/reward, dev/Preview and
look-only Armory handoffs are excluded. Its separate lane is retained.
The obsolete forward-gap Mortar ordering and Arsenal HUD linear recharge
calculation are replaced; ordinary starter recharge retains its original rule.
