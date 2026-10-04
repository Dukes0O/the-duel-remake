# WAR-03a: Gearhead Gunn

4 October 2026. Native rules built; Claude's finished turret recipe is now
settled in SCRAPDOME.md. Tests precede the asset and runtime work. The model
and Claude's look approval are still required before merge.

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
- The isolated --gunn-turret recipe prepares one shared model, never the nine
  approved kit exports. Named base, head, panel and four hollow mouths use
  existing kit metal and wear. One JSON input defines mouths and mount tops.
- Native origins and visible yaw/pitch share that numeric layout. Binding
  caches one asset, clones heat materials and hides cosmetic plating. A red
  line follows the tell. The GLB has not yet been generated.

## Checks

- Independent turret tests before source: seven cases, 23 executed checks,
  one pass and six red. All nine approved kit hashes pass unchanged. Five
  cases stop at the missing gunn-turret.glb. A separate native elevated Gunn
  barrage originally launched horizontally instead of toward the lower car.
  Prepared source now passes that focused native case: seven checks include
  real lower-car contact and the unchanged ten-armor Rocket Pods damage.
  JS and Blender recipe syntax pass without running Blender.
- Authored checks use the actual GLB hierarchy and ray-tested hollow mouths,
  the existing 12,000-triangle kit ceiling and local resources. File size is
  reported against the existing soft target, not made a new merge blocker.
- Runtime checks reuse loadKitAsset('gunn-turret') with real parsed geometry:
  mount fit on Stuttgart and Falcone, shared geometry, separate live heat
  materials, cold cosmetic peer, source finish and state purity, and disposal.
  Native launch tests require an actual fitted mouth and a fixed tell-end aim.
  These checks remain unproved while the asset is missing. No placeholder art.
- No Blender, build, browser, audio, balance or broad tier ran for these tests.
  The isolated --gunn-turret recipe build must still be checked after the
  heavy slot is free. The nine old kit pins catch any unwanted regeneration.
- Before the mouth change: 14 cases, 143 independent checks passed after the author's valid
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
- The old parallel-ray assertion is unchanged. Its independent correction to
  convergent mouth trajectories is approved and queued. No full art pass is
  claimed before model generation and the current lane gates.
- Added a separate native five-shot witness: 29 checks pass for real JSON
  mouth origins, one fixed predictive world point after the player turns,
  the full tell, shot count and 0.25-second intervals. Together with the lower
  car flight case, the focused run passes two cases and 36 checks. The old
  phase-two case still fails its parallel-ray assertion on 685877e1: distinct
  mouths converge, so their directions cannot be parallel. Existing assertions
  were not edited. The Director assigns that correction to the source owner.
  Missing-GLB geometry, binding and lifecycle checks remain unproved.

## Remaining

- Generate gunn-turret.glb once the heavy slot is free. Run the independent
  geometry, native mouths, binding, heat and disposal checks. Nine kit hashes
  must remain exact. Review one sheet of side, three-quarter and top views
  on Stuttgart and Falcone; at most three rounds. No finished art is claimed.
- Rising whine needs audio.js and sound-bank.js handoff after Arsenal's fix.
  Native Rocket Pods fire/flight/hit cues already exist.
- Forward injected flags through yard/router for memory-only UI checks.
- Existing Rocket Pods flight considers cars, not the exited fighter. Direct
  fighter damage and aim need a settled rule before adding that behavior.

## Removed

The unanswered move questions were replaced by four settled answers.
No assets were replaced. No existing Rocket Pods behavior was removed.
