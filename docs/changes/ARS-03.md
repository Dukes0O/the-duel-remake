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
  Earlier direct-cue contrast bypassed the Tesla pulse's real stereo panner.
  Tests-only spatial correction on 7ac1f37a: actual 1 m, centre pan, weapons
  bus. Pulse is +3.55 dB, red at the unchanged 6 dB threshold; the other eight
  remain +6.71 to +9.95 dB. All nine peaks stay below 1. No browser issues.
- Pending: final reviews, balance, frames, lane gate and build.

Four native regressions fixed: Star/Magnet, disabled slots, recharge angle and
Mortar ground targeting. CPU leader/range and ordinary rules stay exact.

Earned-reward red is 62/99: reads, slots, upgrades, offers, App and Mirage fail.
Source derives saved defeat rewards. First wins/upgrades use saved-only reads;
normalization retains earned slots without adding ownership. Native 99/552 and
six memory save/ownership/backup suites (56 TAP cases), runtime 209/2,625 and
combat replay 12 pass. Earlier build passed before hold.

Whole `3ee64bc5`/`18072d80` transferred. Catalog conflict adds only wave-three
dev: nine entries, five on, Voice dev, other values exact; flags 39/Preview 22 pass.
Earlier browser evidence: `.evidence/2026-10-04/ARS-03-release-base/`; gates await.

Unimplemented purchase denial replaces only the Mortar input with an unknown
weapon ID; refusal and no-write assertions stay unchanged.
After merging the 4 October release base, the native wave-three gate test
expects `FEATURE_STATES.arsenal` to be `on` instead of `dev`. The same invariant
still protects the existing Arsenal state; the release changed that state.
Catalog: five released features on, both dev flags; isolation checks remain.

Independent preservation against whole `18072d80`: all 110 earlier cues,
six exports, 49 earlier recipes and metadata exact; only nine Wave Three cues
and recipes are added. After bank whitelists, red `87b436f2` is Core 13/14,
Wave One 35/36 and Beta 7/8. Whole grant `6b09fc55` permits only the author's
nine literal IDs in catalog filters; original pins/other assertions stay exact.
Beta adds only arsenal-wave3 dev. Core 14/14, Wave One 36/36, Beta 8/8 pass.

Balance red `0cd575fa`: 33/34, real Mortar purchase refused because wave three
is off. Source forwards that requested boolean beside Arsenal; policies,
targets and fixtures stay exact. Unchanged balance 34/34 and native 99/552 pass.
Its one-frame native probe proves purchase/equipment/CPU slots, not full balance.

Audio routing red `e19beaa9`: duplicate Mortar/default launches fixed by four
generic exclusions. Native routing 10/10 and full audio 41/41 pass, including
Crossbow/Harpoon, ownership and purity. Original assertions remain exact.

## Removed

The Mortar denial input is replaced; refusal assertions stay exact. Temporary
Gunn handoffs are excluded; its separate lane is retained.
The obsolete forward-gap Mortar ordering and Arsenal HUD linear recharge
calculation are replaced; ordinary starter recharge retains its original rule.
Stored-only entitlement reads are replaced by the catalog defeat rule.
Old catalog-only views and dropped wave-three simulation requests are replaced.
Generic replay/default launch audio is removed for the four native wave-three cues.
