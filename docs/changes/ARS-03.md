# ARS-03: Arsenal wave three

4 October 2026. Independent reviews clear; final synced lane/build gates pending.

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

- Independent source and Save Guardian reviews clear the native hooks and
  derived reward rule. Reads preserve saved bytes; normalization never grants.
  Native 99 cases/552 checks, six memory save suites (56 TAP cases), runtime
  209/2,625, combat replay 12 and Voice 26/358 pass. Replay pins stay unchanged.
- Three complete balance reports pass: historical 138 races plus seven rear
  defense and three pursuit cases; wave two 30 plus one supplement; wave three
  30 plus 12 supplements. Historical policies, fixtures and targets stay exact;
  new supplements are separately labelled. Main wave-three Hard wins: 12/30.
  Actual CPU uses: Mortar 31, Tesla 7, Drone 2, Nitro 2; no unattributed cues.
- Independent memory-only browser checks pass in High and Performance:
  weapons, counters, disabled HUD recovery and old Mirage reward access.
  Armory preserves save bytes; renderer purity and console checks pass.
  Matched driving frame time is unchanged. Active-weapon cost is unmeasured.
- Nine CC0 recipes retain their 27 recordings. Native routing 10/10 and all
  41 audio checks pass, including earlier Crossbow/Harpoon and Voice ownership.
  Spatial scenario: 27 decodes, nine cues, loop cleanup; pulse +7.48 dB,
  other eight +6.71 to +9.95 dB, simultaneous peak 0.82069, no browser issues.
  Independent continuous 0.25 s close-pulse windows at 1 m/gain 1/pan 0:
  High +7.479526 dB, Performance +6.804569 dB; delivered -1.77 dBTP in both,
  zero clips/issues. The 6 dB target and headroom limits stay unchanged.
  Human cue recognition remains unmeasured; no human-listening pass claimed.

## Changed Assertions And Preservation

Mortar is implemented: the old purchase-denial input becomes an unknown ID;
all refusal/no-write assertions remain. The released Arsenal expectation is
on instead of dev; its released-state invariant is unchanged. The catalog has
nine entries: five released on, Voice/wave-three dev, other values exact.
Flags 39 and earlier Preview 22 pass; no Preview work in this final preparation.

Whole Voice and integration bases transfer, ending at `41bc2499`; incoming
README/VERIFICATION remain byte-exact. Simulation is unchanged since `2f094ee8`;
audio routing is `7ac1f37a`, pulse-only volume 3.5 to 5.5 is `68a08785`.
Independent preservation proves 110 earlier cues, six exports, 49 earlier
recipes and metadata exact. Only nine literal new IDs leave earlier bank and
catalog views; beta adds only arsenal-wave3 dev. Core 14/14, Wave One 36/36,
Beta 8/8 pass. Original catalog pins remain:
Core: `104e9dafe12aa861857d055e73685a315a6fb809ee56db2f25a60990a283f1c5`
Wave One: `48c3d4170b202ed4abf0c2dcaf268d6c1f2b98b162d62301702d94aa3da803d6`

Independent reds precede fixes: native Star/Magnet, HUD, recharge and targeting;
reward 62/99; preservation `87b436f2`; native balance `0cd575fa` at 33/34;
routing `e19beaa9`; spatial pulse `d7852758` at +3.55 dB. Balance forwards only
the requested wave-three flag (34/34 passes); four launch exclusions remove
fallback duplicates. Named cues, Voice paths, assets, recipes and all other
bank values remain exact. No gameplay assertion, target or replay pin weakened.

## Removed

The Mortar denial input is replaced; refusal assertions stay exact. Temporary
Gunn handoffs are excluded; its separate lane is retained.
The obsolete forward-gap Mortar ordering and Arsenal HUD linear recharge
calculation are replaced; ordinary starter recharge retains its original rule.
Stored-only entitlement reads are replaced by the catalog defeat rule.
Old catalog-only views and dropped wave-three simulation requests are replaced.
Generic replay/default launch audio is removed for the four native wave-three cues.
Tesla pulse's 3.5 volume is replaced by 5.5; independent live review is clear.
