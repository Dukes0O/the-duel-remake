# CREW-02 independent tests first

Source has not started. This slice owns only test-crew-gear.mjs and this note.
The suite uses existing Duel, App, profile, fighter, targeting, smoke, camera
and crash-solver entrypoints. No future gear module or export is imported.

## Coverage

- Real dev switch, discovery admission, slot 3 keyboard and D-pad dispatch.
- Native admission for all eight crew and activation of Jax, Cinder and Tusk.
- Rook's actual 0.6 s lock and 1.8 s reload, with flag-off timing controls.
- Nell's stock, arc, reach, contact fuse, car damage, perk radius and raider hit.
- Jax's line, car speed limits, roof result, recharge and actual salvage ledge.
- Odessa's native nearest-car fire, hit amount, reach, cadence and lifetime.
- Cinder's native cone, car/raider damage, self contact, fuel and refill.
- Dune's stock, native bolt, damage, reach, reload, knockdown and camera zoom.
- Wren's stock, throw and shared smoke dimensions, lifetime and sight block.
- Tusk's native stock, reload, damage, equivalent released solver response,
  parked-car passive and actual raider knockdown.
- Actual car re-entry refill, named-player memory-only admission and current
  movement judged through the production first-person camera.

## Hooks and incomplete checks

Dune zoom requires src/onfoot-camera.js and the narrow foot-camera branch in
src/render3d.js (currently reads pose.fov). Neither is granted by the card;
Salt owns render3d.js. Wait for that lane to merge before any renderer edit.
The zoom test uses the existing production camera path, not a second camera.

Turret 60 health, destruction and 10 fighter damage remain unproved: no native
deployable/contact record exists before Source. Add independent real contact
checks after the builder exposes its actual simulation product. No invented
health API or arbitrary projectile damage against a turret is assumed.
Cinder's later car-Flamethrower immunity is a deferred reuse contract. Native
Hand Flamer self contact is covered; allied crew fighters belong to CREW-04.

Grapple tests cover the settled roof and ledge results only. CREW-03 charges,
shake-off and CREW-04 computer crews are outside this slice. Private browser
checks per item, overhead controls, visual gear and audio listening remain
builder/reviewer work. The sound bank and catalog are with a separate owner;
this slice does not inspect their protected branch.

## Validation

node --check and git diff --check pass.
The authorized native --admission-only run took 0.83 s on unchanged Source:
6 checks, 2 passed, 4 genuine RED. Passing controls: flag-off RPG/wrench
behavior and undiscovered memory-only crew-shop refusal with no saved change.
Exact failures:
- Production switch catalog: undefined !== dev.
- Actual App slot dispatch: signature silently stays on RPG.
- Native Nell selectFootGear(3): false !== true.
- Rook actual rocket at 0.6 s: lock target null !== 0.

The full suite has not run while Junk gates own the heavy slot. The authored
downstream mechanics and Rook reload remain unproved at their native admission
or lock precondition. No missing module/import/export failure occurred.
All existing assertions and replay pins remain frozen. The established replay
and camera suites remain builder gates; no fingerprint is regenerated.

## Removed

None. No runtime behavior or existing test is replaced in this slice.
