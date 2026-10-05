# ARS-03: Arsenal wave three

4 October 2026. Gameplay reviews clear; measurement review and fresh gates pending.

## Decisions Before Code

Use the native weapon trigger, cooldowns, damage, targeting and car effects.
Both arsenal switches and the discovered career gate are entry rules.
Wave three has its own dev switch. Earlier Arsenal weapons stay unchanged.

- Mortar commits its predicted landing point; the 3 m radius red ring lasts
  the full 1.6 s flight. Damage falls linearly from 25 at centre to zero at edge.
  The hop uses existing vertical flight at 3 m/s, scaled by the same falloff.
- Tesla follows its owner's current position during the 0.4 s charge.
  Its 15 m pulse consumes a star shield instead of disabling that car.
  Other hostile cars receive the native disabled effect for 3 s.
- Drone uses the generic active decoy actor and target contract. It follows
  its owner's line, 10 m beside it, for 5 s, with the owner's team. Its first
  hostile hit bursts it; it never fires, scores or pays.
- Nitro uses the native timed effect for 3 s: top speed and acceleration
  times 1.35, crash ram damage times 3. Existing damage ceilings still apply.
  Oil cancels it through the existing counter.

Review fixes: Tesla ends Magnet even when Star prevents disable. HUD uses the
native effect/recharge rule. Player Mortar compares ground distance among
enemies ahead; CPU leader policy and authored tests stay exact.
Claude via Kyle, 4 October: read every catalog warlord weapon as earned when
its saved ownership OR its named warlord defeat exists. Armory, slots and
upgrades use that entitlement. Reads and normalization never save a grant;
first-win settlement still saves the explicit earned reward as before.

## Checks

- Independent source/flight review clears `3309f22f`. Prior unaffected save
  review remains clear: reads preserve saved bytes; normalization never grants.
  Native 99 cases/552 checks, six memory save suites (56 TAP cases), runtime
  209/2,625, combat replay 12 and Voice 26/358 pass. Replay pins stay unchanged.
- All three complete balance rechecks on `3309f22f` pass. Historical: 251.30 s,
  138 distinct main/extra races; Easy/Medium/Hard wins 28/19/6, CPU hits
  2.47/7.53/5.63; first 12 take 17.11 s. Seven rear and three pursuit finish.
  Wave two: 74.74 s, 30 plus one complete, 21 wins; CPU Rockets 32/Magnet 3/Flamer 2.
  Wave three: 105.39 s, 30 plus 12 complete, 12 main wins; actual CPU Mortar 31,
  Tesla 7/Drone 2/Nitro 2. All have zero attribution issues. Historical policies,
  fixtures and targets stay exact; new supplements are separately labelled.
- Current memory-only browser recheck clears High/Performance at 1280x800:
  32 captures; zero errors, warnings or failed requests. Mortar ring 1.591667 s,
  impact 1.6 s, peak 0.270 m, landing after 40 additional 120 Hz steps; menu clears.
  Ordinary Banshee is exactly 2.610052 m/28.9 m. Native Tesla, Drone, old Mirage
  save bytes and Nitro controls pass. Prior matched driving frame review stays;
  active-weapon frame cost remains unmeasured. All owned QA processes are closed.
  All captures nonblank/textured, no new HUD overlap; existing QA overlay unchanged.
- Nine CC0 recipes retain their 27 recordings. Native routing 10/10 and all
  41 audio checks pass, including earlier Crossbow/Harpoon and Voice ownership.
  Prior scenario: 27 decodes, nine cues/loop cleanup, +6.71 to +9.95 dB, peak 0.82069.
  Independent continuous 0.25 s close-pulse windows at 1 m/gain 1/pan 0:
  High +7.479526 dB, Performance +6.804569 dB; delivered -1.77 dBTP in both,
  zero clips/issues. The 6 dB target and headroom limits stay unchanged.
  Human cue recognition remains unmeasured; no human-listening pass claimed.

## Changed Assertions And Preservation

Mortar is implemented: the old purchase-denial input becomes an unknown ID;
all refusal/no-write assertions remain. The released Arsenal expectation is
on instead of dev; its released-state invariant is unchanged. The catalog has
nine entries: five released on, Voice/wave-three dev, other values exact.

Whole Voice and integration bases transfer, ending at `15b9c458`; incoming
README/VERIFICATION remain byte-exact. Earlier simulation freeze is `2f094ee8`;
audio routing is `7ac1f37a`, pulse-only volume 3.5 to 5.5 is `68a08785`.
Independent preservation proves 110 earlier cues, six exports, 49 earlier
recipes and metadata exact. Only nine literal new IDs leave earlier bank and
catalog views; beta adds only arsenal-wave3 dev. Core 14/14, Wave One 36/36,
Beta 8/8 pass. Original catalog pins remain:
Core: `104e9dafe12aa861857d055e73685a315a6fb809ee56db2f25a60990a283f1c5`
Wave One: `48c3d4170b202ed4abf0c2dcaf268d6c1f2b98b162d62301702d94aa3da803d6`

Independent reds precede native, reward, preservation, flag and audio fixes.
Balance forwards only wave-three (34/34 passes); four launch exclusions remove
fallback duplicates. Named cues, Voice paths, assets, recipes and other bank
values stay exact. No gameplay assertion, target or replay pin is weakened.

Failed ramp gate `d34cc540`: 91 pass/one fail/259 not run, 87.10 s; not a pass.
Mortar-only activity fixes idle-zero delegation; apex/landing/lifecycle stay exact.
Reviewed `3309f22f`: ramp 42, native 99/552, ramming 13, replay 162/combat 12 pass;
30/60/144 FPS hop/apex/cleanup probes pass. Generic released RAM stays unchanged.
Failed audio gate `d6971001`: 149 pass/one fail/201 not run, 303.52 s; unavailable LUFS.
Only Wave Three joins existing analysis padding: raw 22/27, padded 27/27; all peaks
match, loudest -2.40 dBTP. Files/hashes, old paths, assertions and limits stay exact.
Combat audio 11/11 passes; independent input review and fresh lane/build pending.

## Removed

Mortar denial uses an unknown ID; assertions stay. Temporary Gunn handoffs excluded.
Forward-gap targeting and linear Arsenal recharge are replaced; starter timing stays.
Stored-only entitlement/catalog views and dropped wave-three requests are replaced.
Generic replay/default launch audio is removed for the four native wave-three cues.
Tesla pulse's 3.5 volume is replaced by 5.5; independent live review is clear.
The broad player ram-flight delegation is replaced by Mortar-only activity.
Raw Wave Three analysis input is replaced; runtime clips remain exact.
