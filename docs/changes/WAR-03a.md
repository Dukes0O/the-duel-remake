# WAR-03a: Gearhead Gunn

4 October 2026. Native rules built; Claude's finished turret recipe is now
settled in SCRAPDOME.md. Tests preceded the asset and runtime work. The model
is generated; Claude's look approval is still required before merge.

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
  line follows the tell. The isolated recipe now exports gunn-turret.glb.

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
  All these checks now pass with the generated asset. No placeholder art.
- Isolated Blender 4.5.13 export used --gunn-turret only. All nine old kit
  hashes remain exact. The new GLB is 179,004 bytes and 740 triangles, inside
  the combined 12,000-triangle kit ceiling. Local resources, named hierarchy,
  mouth ray tests, mount fit, material isolation and double disposal pass.
  No build, browser, audio, balance or broad tier ran this export checkpoint.
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
- Director grant f5a25c7a/7584ba44 replaces only the obsolete parallel-ray
  assertion. Five distinct-mouth trajectories must reach the captured
  tell-end world point in 3D after the player turns. Other move checks stay
  exact. The focused Gunn suite passes 14 cases and 144 checks (one more
  check because the first trajectory is now checked too). Independent review
  cleared this correction before export.
- Added a separate native five-shot witness: 29 checks pass for real JSON
  mouth origins, one fixed predictive world point after the player turns,
  the full tell, shot count and 0.25-second intervals. Together with the lower
  car flight case, the focused run passes two cases and 36 checks. The author
  kept every art-suite assertion exact. After export the full native art/fight
  run passes 22 cases and 393 checks (art 249, fight 144). Source and asset
  review found the intended isolated output and approved material settings.
  Whole integration metadata through 272823a7 is merged, not peer source.

## Remaining

- Review one sheet of side, three-quarter and top views
  on Stuttgart and Falcone; at most three rounds. No finished art is claimed.
- Rising whine needs audio.js and sound-bank.js handoff after Arsenal's fix.
  Native Rocket Pods fire/flight/hit cues already exist.
- Forward injected flags through yard/router for memory-only UI checks.
- Rocket Pods sweep and blast only cars. Their early dispatch bypasses the
  fighter contact path. CREW.md already settles splash at up to 60 health
  with car falloff and knockdown inside half radius. A reviewed shared hook
  is needed; Gunn's existing car target policy remains unchanged.

## Removed

The unanswered move questions were replaced by four settled answers.
The obsolete one-muzzle parallel-ray assertion is replaced, not retained.
No assets were replaced. No existing Rocket Pods behavior was removed.
