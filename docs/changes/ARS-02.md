# ARS-02: Arsenal wave 2

Status: review in the ARS-02 lane. Shared combat, save, renderer, audio-routing
and balance hooks were granted after Balance and CREW merged. Kyle directed
completion of the seven sounds on 3 October, and the Board granted only their
new entries and source recipes in the reserved sound files. The final lane
gate and build remain before the integration merge.

## Decision before code

The settled behavior is docs/ARSENAL.md sections 3 and 4. These choices fix
the implementation details left open by the short weapon descriptions:

- Rocket Pods use a three-degree total fan, centred on the aim line. Four
  rockets take bearings -1.5, -0.5, +0.5 and +1.5 degrees. They launch in that
  order, 0.12 seconds apart, without random spread or homing. Each travels
  80 m/s up to 120 m and gives 10 armor damage within a 2 m blast. A shield
  blocks the hit. CPU firing still needs a target 20-100 m ahead within three
  degrees. One accepted trigger starts one four-shot volley and one 8 s
  recharge; a rejected trigger spends nothing.
- A continuous flame burst counts as one style hit per target, while its full armor loss still contributes to damage dealt. Leaving and re-entering refreshes burn without granting another style hit.
- Save IDs are `rockets`, `flamethrower` and `magnet`. Gunn's early reward grants `rockets` after his recorded defeat.
- Flamethrower uses a 30-degree full cone, 15 degrees either side of the car,
  for three seconds and nine metres. A car inside takes 8 armor per second.
  Leaving it starts a 1.5 s burn at 4 armor per second. Re-entry refreshes
  that burn; burns do not stack. A star shield blocks cone and burn damage.
  All amounts integrate over fixed simulation time, not graphics frames.
- Scrap Magnet runs for six seconds. Each fixed step moves eligible pickup
  crates and arena salvage up to 12 m/s toward the car while within 40 m.
  Collection uses the existing pickup/settlement path when the item reaches
  the car; the magnet never grants a reward directly. A future Tesla Coil
  calls an explicit end function. CPU use needs two eligible crates within
  40 m. Its 15 s recharge begins on activation.
- Presentation uses bounded, pooled code geometry: the existing rocket mesh scaled for pod shots, an orange nine-metre forward cone while flame is active, and a cyan ring around an active magnet. The visuals follow combat state and stage time and never advance damage, pickups or cooldowns. No new binary art is needed.
- Each accepted action emits the sound event named in the design:
  weapon.rockets.fire/flight/hit, weapon.flame.start/loop/end and
  weapon.magnet.hum. The granted audio router plays one-shots, maps pod shots
  to the moving Rocket flight voice, and stops active flame/magnet field samples
  on effect end, pause, mute, stage change or switch-off. The seven recorded
  cues now have three fixed variants each from pinned CC0 source cuts.
- The balance report adds a separate thirty-race Medium wave-two policy at
  earned rank 13. It buys and equips all three weapons through the memory-only
  Armory and uses legal trigger inputs and the standard scripted driving line.
  One separately labelled complete race uses legal throttle, brake and steering
  to follow a naturally equipped CPU Flamethrower at about seven metres. The
  computer keeps its native seeded loadouts and decisions in both cases. The
  report records wins, completion, shots and actor-attributed uses; its win
  rate is descriptive, not a replacement target. Historical policies,
  baselines, samples and targets keep their exact definitions.
- The existing full balance check still requires observed CPU Smoke use,
  although the Board records that rare Smoke use is informational. Keep its
  validator and every test assertion intact. Add one separately labelled
  complete, natural-loadout rear-defense race at Medium seed 1997, where
  the native reactive Smoke action is measured. Preserve all six existing
  supplemental races and every historical sample.
- The ARS-CORE native implementation-denial input names Rocket Pods at rank
  seven, which this card now implements. Director grant 499551b permits only
  migrating that future input to unimplemented Mortar at its eligible rank
  fourteen. Every refusal, profile, registry, no-write and other assertion
  stays byte-for-byte the same.

The simulation uses the seeded generator if randomness is later needed.
The modules must not read renderer state or player storage.

## Checks

- Native tests were red before shared wiring: 25/30 passed. The missing catalog
  blocked real purchases and Gunn's reward; continuous flame gave 360 style
  hits for 24 armor. Those checks now pass with one style hit and all 24
  damage. Native trigger, CPU, visual and balance-tool checks followed red
  before their implementation. The focused suite now passes 39/39.
- The suite covers four fixed-spaced rockets, cap/range/blast/shield and moving
  targets; cone, burn, shield and cue timing; magnet pull, native pickup and
  future Tesla stop; Medium CPU use of each; per-player memory-only purchases,
  upgrades, four slots, reward, rank and gate; replay at 30/60/144 FPS;
  renderer read-only state and pooled show/hide. No released assertion changed.
- The first lane tier failed only two ARS-CORE implementation-denial controls:
  they expected Rocket Pods to remain unimplemented. With the narrow Board
  grant, the same controls now ask for eligible but unimplemented Mortar; all
  refusal, player-isolation and no-write assertions remain. No expected result
  or numeric tolerance was changed. The fixture's purpose is still enforced.
- Native regressions before audio routing: core 72, wave one 77, combat 66,
  projectiles 35, scoring 15, armor 18, car loadout 3, Warlord pay 25 and
  replay 162 all passed. After routing, wave-one audio 36/36 and combat audio
  11/11 passed with ffmpeg access. A first sandbox run could not spawn ffmpeg;
  the identical commands passed when run with codec access.
- The private memory-only browser scenario purchased and equipped the three
  weapons in the real Armory. High and Performance each showed an in-flight
  Rocket, shielded blast, translucent Flame, shielded Flame, active Magnet and
  expired Magnet. Twelve fresh screenshots, zero console warnings/errors.
  The first Rocket capture showed the course loading despite a visible scene
  mesh. The scenario now waits for a presented world frame after each start;
  the rerun showed the road, cars and rockets in flight in both qualities.
  A visual review changed Flame opacity from .85 to .38 so both cars remain
  readable. Rocket pods use the pooled RPG body at .65 scale; Magnet uses
  the bounded cyan ring. No world signatures changed.
- Separate wave-two balance check passed: 30/30 ordinary Medium races
  completed, 21 wins (descriptive), 415 player Rocket volleys, 305 Flame
  bursts, 222 Magnet activations. Native CPU use in those races: Rocket 32,
  Magnet 3; 16 computer loadouts carried Flame but ordinary race spacing did
  not trigger it. One separately labelled complete close-range race at seed
  1989 recorded two CPU Flame activations from its natural loadout. No use
  lacked actor attribution. Historical balance samples and targets were not
  changed.
- The existing full combat balance check completed its 90 baseline races and
  historical policy samples with the expected 28/30 Easy, 19/30 Medium and
  6/30 Hard wins, but failed only because none of its original six
  supplemental races happened to trigger reactive CPU Smoke. An independent
  complete native rear-defense race at Medium seed 1997 emitted one Smoke
  deployment and finished in 144.74 s. The added labelled case keeps the
  current zero-use validator and all assertions unchanged. The full balance
  rerun passed in 248.76 s, retaining the historical 28/30 Easy, 19/30
  Medium and 6/30 Hard wins. Seven complete supplemental races measured CPU
  Oil 4, Smoke 1, Harpoon 4 and Caltrops 1.
- The second lane-tier run stopped at 179 passed, 1 failed and 166 not run.
  While it was running, I changed the owned wave-two browser scenario to wait
  for a presented frame. The convoy tanker integrity test deliberately hashes
  every tracked file before and after its native check and caught this exact
  concurrent file edit. Its changed hash maps to
  `tools/scenarios/arsenal-wave2.mjs`; no tanker source or assertion changed.
  The unchanged tanker suite then passed alone: 42/42 art, 12/12 valve,
  2/2 scale and 5/5 final round. Rerun the lane gate on a fixed commit after
  the remaining audio work.
- The corrected private browser rerun passed High and Performance on port
  29427: 12 fresh captures, zero console warnings or errors. The current
  source build passed in 434 ms; Vite reported only its existing chunk-size
  advisory.
- On committed source `cc94c56`, the exact changed lane tier passed 346/346
  suites in 558.32 s, including the tanker integrity suite. The build on
  that same commit passed in 449 ms. General replay fingerprints passed
  162/162 with their released pins and assertions unchanged; the new Rocket
  and Flame fixed-step outcomes matched at 30, 60 and 144 FPS.
- After the seven recorded cues are added, rerun the exact lane tier and
  build on the final commit before handoff. The current pass is a checkpoint,
  not a merge gate for future audio changes.
- The seven approved catalog entries use five pinned CC0 Freesound sources:
  854473, 855733, 397691, 395039 and 641335. Source 395039 is the 28.28 s
  flamethrower recording (SHA-256 `49250fbce8d355e94eae9429037644840487068b10073f2b2adbea34e45e9fa6`);
  source 641335 is the 7.99 s electric hum (SHA-256
  `17fadacde8ea5041adb317c7ec9f7c814c8aa8da0d85b84c5246eebd3ab48159`).
  The other three sources were already cached and cataloged. The builder
  generated 21 mono 48 kHz OGG files totalling 230,454 bytes. Decoded
  loudness spans -19.82 to -15.95 LUFS, true peak -8.58 to -2.40 dBTP,
  and duration 0.412 to 1.245 s. The new audio test passes 21/21 checks,
  including audible PCM, all three variants, loop seams, source recipes and
  decoded headroom. Rebuilding into ignored scratch reproduced all 21 runtime
  SHA-256 hashes exactly.
- The two older audio checks still pin every released sound-bank record and
  catalog row to their original hashes. Their filters now exclude exactly the
  seven new ARS-02 cues, and the wave-one future-silent control still checks
  Mortar, Tesla and Decoy. No released cue, voice take or assertion tolerance
  changed. Arsenal Core audio passes 14/14, wave-one audio 36/36, sound-bank
  acceptance passes and the new wave-two audio test passes 21/21.
- A private memory-only browser decoded and played all 21 OGGs with zero
  console errors or warnings. Real Rocket, Flame and Magnet actions started
  their named voices; Rocket flight followed a live projectile, Flame and
  Magnet loops stopped on effect end, and pause left zero voices. With the
  recorded engine at full throttle, each new cue measured 7.06 to 7.74 dB
  above the engine over its first quarter second; the combined mix peak stayed
  below 0.80. An overlapping four-rocket, Flame and Magnet mix peaked at 0.801
  with no clipping. The initial check found Flame start at only 0.28 dB over
  the engine; tuning changed only the seven new bank levels, then the same
  check passed. The unchanged legacy combat-audio test initially could not
  measure the Rocket fire and flight clips because they were under its
  400 ms EBU window. Automatic approval review rejected a Board change to
  edit that test's path. The source cuts were extended within the real CC0
  recordings to 0.412-0.417 s, preserving their quick action and loop seam;
  the original headroom assertion now passes 11/11 with no test edit. The
  High and Performance private gameplay review also passes: 12 captures,
  zero console issues and the same native weapon outcomes. Human listening
  remains a later release feel review under
  SPEC 0.9; no listening verdict is invented here.
- Pending: final exact lane tier and build on committed audio source, then
  integration merge, janitor, status and full tier. No full integration gate
  applies to this lane commit yet.

## Audio source decision and retained records

Kyle directed completion on 3 October; the Board now grants this card only
the seven cue entries, two new verified CC0 source records, the audio recipe,
tests and runtime files. Keep every existing catalog row, sound-bank entry,
voice take and AUD-17 record exact. Use three distinct rocket recordings and
three cuts of the flamethrower recording for start, seamless loop and end;
use the electric hum as the Magnet loop. Build three fixed variants per cue,
measure decoded loudness, true peak, duration and loop seams, then check real
  event routing and playback in a private browser. Older exact audio pins may
exclude only these seven new bank entries and seven new cue catalog rows; future
weapon silence still applies to wave three.

The seven settled cues use five CC0 sources without accounts, paid credits
or changes to existing recordings. The first three are already pinned in the
audio catalog: Freesound 854473 (Rocket Pods fire), 855733 (flight) and 397691
(impact). For Flame start/loop/end, Freesound 395039 is a 28 s CC0
recording of real flamethrower bursts:
https://freesound.org/people/AslakHostaker/sounds/395039/ . For Magnet hum,
Freesound 641335 is a 7.99 s CC0 electric hum:
https://freesound.org/people/soundofsong/sounds/641335/ . The catalog holds
both source hashes, pages and cuts. The committed builder rebuilds one current
compressed runtime version under `public/assets/audio/arsenal-wave2/`. The
Director granted the narrow sound-bank and catalog additions while preserving
the AUD-17 records.

## Removed

The generic weapon-fire audio fallback no longer handles the three new
weapons. No released asset or behavior was removed.
