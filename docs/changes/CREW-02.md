# CREW-02: signature gear

Status: merged. All eight settled gear items now run through the real
Wasteland race, combat, Armory, HUD, renderer and audio paths. The `crew-gear`
switch is dev-only and starts off. Gear refills on car re-entry. Jax, Cinder
and Tusk are active. No race fingerprint or save format changed.

The simulation keeps the settled values in `docs/CREW.md`. It reuses native
smoke, armor, scoring, fighter damage and crash motion. Jax's active grapple
keeps the fighter on the roof for CREW-03 to add shake-off rules. Crew Gear
sound recipes are procedural; no external assets or network access were added.

## Checks

- Native acceptance: 33/33 checks pass; bounded module regressions: 16/16.
- Feature switch and release catalog: 32 checks and 11 browser-flag tests pass.
- Arsenal audio baselines: core 14/14 and wave-one 37/37 checks pass.
- Private browser scenario: eight separate crew captures, gear selected for
  each crew, real projectiles for Nell/Dune/Wren/Tusk, Odessa turret deployed,
  Cinder flame active; zero warnings or console errors.
- The smoke test now places both cars around the real cloud on the same course
  segment. It keeps the 5 m cloud and original targeting assertion intact.
- Switch catalog tests now include the new dev flag. Audio baseline tests
  exclude only the 12 new Crew recipes. These assertion updates pin the added
  feature and preserve all earlier switch and audio entries.
- Marksman bolts now use the arrow model without also showing the generic
  bomb model.
- `git diff --check` passes. No race or world signatures were regenerated.
- Lane gate passed 342/342; build passed. The private scenario passed eight
  captures with no warnings or errors. Vite reported the existing large-chunk
  advisory.

## Removed

Removed the unfinished switch gap, disconnected deployable/projectile hooks,
generic unmapped fire cue, and the old smoke test's off-line car placement.
Existing gear, sounds, saves and player data remain in place.
