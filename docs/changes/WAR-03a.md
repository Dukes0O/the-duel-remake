# WAR-03a: Gearhead Gunn

4 October 2026. Native rules built; waiting on Claude for a finished turret
asset. Not ready to merge. The four move and reward answers are recorded in
SCRAPDOME.md and the board.

## Changed

- Gunn drives the Stuttgart in the Pit. His own module owns the kiter goals,
  cooldowns, tracked tell, committed predictive aim, three/five rockets spaced
  0.25 seconds apart, and the three-second overheat damage window.
- Broken sight cancels shots but still earns the window. Singles use their
  own three-second cadence and range. Native Rocket Pods flight and damage
  numbers stay unchanged. Moving launches compensate inherited car speed.
- First win earns Rocket Pods and turret-look. Its saved defeat lets any
  unlocked car wear the look for free, with no armor, mass or weapon effect.
  Armory labels it as looks only. Settlement uses the existing one-write path.
- Gunn has a dev switch. The registry checks entry. The territory panel also
  checks availability and accepts an explicit flag context.

## Checks

- Independent Gunn tests: 14 cases, 143 checks pass after the author's valid
  Pit-floor correction. The previous 0/55 offsets crossed a real outer wall.
  The author kept move assertions and added a native clear-line witness.
- Focused switch, Preview, Gunn, registry, settlement and metadata run:
  52 cases pass. Earlier armor-kit, Wave 2 rockets and shared warlord-format
  checks pass, including unchanged ordinary replay fingerprints.
- Built-list assertion adds Gunn only. Future-unbuilt settlement fixture now
  uses the Tollkeeper, preserving reward and rematch denial. Independent review
  of these changed assertions is still required.
- Lane tier, build, balance, browser, audio, save review and Claude play review
  remain required after final assets and the current integration base land.

## Remaining

- tools/blender/armor-kits.py lines 475-482 makes only a turret mount ring and
  trusses. src/combat-scene.js lines 248-253 makes Odessa's primitive turret.
  Neither is a finished approved roof turret asset. Do not ship either as
  Gunn's completed look. Bind the approved asset on every car once supplied.
- Add the tracked turret, red aiming line, red overheat glow and rising whine.
  Native Rocket Pods cues exist; boss cues need the audio hook handoff.
- Forward injected flags through yard/router for memory-only UI checks.
- Existing Rocket Pods flight considers cars, not the exited fighter. Direct
  fighter damage and aim need a settled rule before adding that behavior.

## Removed

The unanswered move questions were replaced by four settled answers.
No assets were replaced. No existing Rocket Pods behavior was removed.
