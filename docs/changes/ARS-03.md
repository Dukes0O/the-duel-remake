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

Independent reviewer regressions: original 51 pass, four new cases fail for
Star/Magnet, Tesla slots, recharge angle and Mortar ground targeting. Source
fixes cancel Magnet before Star, use native disabled/recharge rules and sort
Mortar ground distance. CPU leader/range and ordinary rules remain exact.
HUD uses a semantic DOM fixture; combat and driving checks remain native.

Earned-reward red tests: 62/99 pass; 37 fail for Smoke/Rockets/Drone earned
reads, slots, upgrades, repeat offers, native App equipment and Mirage rematch.
Read purity and first-win controls pass. Source derives catalog rewards from
saved defeats; saved-only reads handle normalization, first wins and upgrade
writes. Normalization retains earned slots without adding ownership entries.
Native 99/552 and six save/ownership/backup suites (56 TAP cases) pass;
runtime 209/2,625 and combat replays 12 pass. Earlier build passed before hold.

Whole Voice base `3ee64bc5` and Director metadata `18072d80` transferred intact.
Feature-test conflict: eight entries become nine only by adding wave three
dev; five released on, Voice dev and all other prior states stay exact.
Combined native 99/552, Voice 26/358, audio 31,
flags 39 and Preview 22 pass. No new build/browser/broad run. Earlier browser
evidence stays at `.evidence/2026-10-04/ARS-03-release-base/`; final gates await.

Unimplemented purchase denial replaces only the Mortar input with an unknown
weapon ID; refusal and no-write assertions stay unchanged.
After merging the 4 October release base, the native wave-three gate test
expects `FEATURE_STATES.arsenal` to be `on` instead of `dev`. The same invariant
still protects the existing Arsenal state; the release changed that state.
Catalog: five released features on, both dev flags; isolation checks remain.

Preservation red on `52ca6265`: Core 14 checks / 2 failures, Wave One 36 / 2.
Bank views include nine new cues; catalog views include nine new recipes.
Parsed comparison with whole `18072d80`: all 110 earlier cues, six exports,
49 earlier recipes and metadata exact. Add only nine literal Wave Three IDs
to each bank additions list; all existing assertions and hash pins stay exact.
Bank-only result: Core 13/14 and Wave One 35/36; only catalog failures remain
(407bd2c9 vs 104e9daf; 7ce837a8 vs 48c3d417). Native 99/552, Voice 26/358 and
Wave Three audio 31/31 pass. No source, asset, catalog or replay edit.
Catalog assertions and Beta remain unchanged for the source worker. Beta
red is 7/8: its exact catalog omits only arsenal-wave3 dev.

## Removed

The old Mortar unimplemented-purchase fixture input is replaced; refusal
assertions stay unchanged. Temporary Gunn admission/reward, dev/Preview and
look-only Armory handoffs are excluded. Its separate lane is retained.
The obsolete forward-gap Mortar ordering and Arsenal HUD linear recharge
calculation are replaced; ordinary starter recharge retains its original rule.
Stored-only entitlement reads are replaced by the catalog defeat rule.
