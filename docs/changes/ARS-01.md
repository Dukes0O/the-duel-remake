# ARS-01: Harpoon, Caltrops and wave-one computer use

Native Source and the private production browser recipe are implemented.
The card is not ready to merge. Current balance, browser, sounds and
lane/build gates remain; the save assertion still awaits Kyle's approval.

## What changed

- Harpoon launches a native leading 70 m/s projectile with full carrier
  velocity, a 4 degree launch cone and a literal 50 m travelled range.
- A native hit deals 6 armor per the existing 15 percent damage levels,
  adds exactly 6 m/s sideways in the victim's actual heading toward the
  shooter, and tethers for 3 s. Native movement, aiming and crash handoff
  read its road-lateral and private forward components with ordinary damping.
- The tether reads actual player input or native CPU steering requests.
  Inclusive 0.6 steering away accumulates 0.5 s across neutral intervals.
  Shield, either wreck, separation over 60 m and expiry break the line.
- Caltrops creates a native 8 by 5 m strip on terrain 3 m behind the car.
  It lasts 8 s, ignores its owner for the first second and touches each
  body once. It deals 4 armor and refreshes 4 s of grip and speed limits.
- Player, road CPU and arena CPU read the shared speed ceiling. Tether
  caps top speed at 0.8; Caltrops caps it at 0.9 and grip at 0.75.
- Real rank-three and rank-five Armory purchases and levels extend the
  existing save catalog. Normalization never grants earned ownership.
- CPU scheduling checks all four wave-one positional conditions and
  cannot let a cooling eligible weapon hide another ready equipped one.
- Presentation reuses bounded pools: forty visible spike instances per
  strip, at most twenty-four strips and four actual per-car tether lines.
  Tethers read four slots and reuse scratch; resources are disposed; drawing is read-only.
- The report counts native deployment products and all four CPU uses.
  Use accounting counts Harpoon fire once; flight cannot consume its identity.

## Tests first and current evidence

Independent tests preceded Source at 37924a1. The settled owner grace is
1 s; hard-away input is at least 0.6 and need not remain continuous.
Independent motion and grounding regressions failed before Source; all 61
native cases now pass, including exact real-hit world magnitude/direction,
rotated world displacement and airborne Caltrops ground/spikes. Native knock
integration, 35 projectile cases and 33 bounded accounting cases pass; old
projectile replay pins stay exact. Relocation, wreck, knock, safe reset and
lifecycle clear the private forward impulse. Browser, lane and build remain.

The independent reviewer approved four narrow fixture corrections and
reproduced their native witnesses before those edits:
- The hit fixture is rotated about nineteen degrees, so its old six-unit road
  scalar measured the wrong axis and shooter side. Independent review approves
  exact world magnitude six, body-sideways six toward the shooter, body-forward
  zero and the exact road projection; ordinary exp(-1.5/120) damping stays exact.
- Start only road CPU ceiling comparisons 5 mph above the ceiling. The prior
  0.05 mph fixture let both native controls brake below the ceiling in one
  step. Literal ceilings of 160.8 and 180.9 compare with actual controls
  at 164.2167 and 184.3167; original player and arena assertions stay intact.
- Add genuine Harpoon/Caltrops rows to the four-use positive validator while
  preserving original three-row assertions and zero-use Oil/Smoke controls.
  Bounded rows are never marked complete.
- Append each genuine use row to the full report fixture rather than remove
  required policy/difficulty samples. Native and aggregate counts stay exact.
No settled rule, balance target, old native use assertion or replay pin changed.

## Save Guardian follow-up

Tests first at f03c568 reached 40 checks: four controls passed and ten
backup cases failed. Recognizing already earned future Harpoon/Caltrops
adds level zero without granting ownership. needsCareerMigration compares
saved levels with the real normalizer. Verified backup keeps original
formatting, future fields and all careers before normalization.
All 14 new cases pass with 88 reached checks; seven historical fixtures,
quota, validation and recovery checks pass unchanged. Arsenal save is 99/100.
Save Guardian approved the front predicate's Crossbow-or-Harpoon correction:
rank-six Easy seed 1989 carries Harpoon, Star, Caltrops and Oil, satisfying
the settled front-damage rule. Automatic approval review rejected that exact
existing-assertion edit twice and requires Kyle's explicit approval.
It remains unchanged. No new storage, unknown-id grant or replay-pin edit.
Independent Save Guardian approved byte preservation; fresh broad gates remain.

## Remaining acceptance

The browser recipe runs original genuine Oil/Smoke counters, then actual
Harpoon hit, accumulated steering and shield counters and Caltrops contact
and steering around, in High and Performance with tab-local memory saves.
It has syntax validation only and still needs the independent browser run.
The prior thirty-race run had Medium 70 percent wins and zero CPU Oil/Smoke
uses; diagnosis and a current passing report remain, without target changes.
Audio belongs to its separate owner. Source emits weapon.harpoon.fire,
.flight, .hit and .break and weapon.caltrops.deploy and .hit with actual
positions and actors; fire/flight include their native projectile. No bank,
catalog, audio, Game, arena-event, Salt or protected lane file changed.
Thirty-race balance, independent Source review and current lane/build gates
remain mandatory before handoff for merge.

## Removed

Replaced the two-user rear deployment branch with genuine four-user wave-one
scheduling and extended real projectile accounting. Unpacked combat presentation.
Removed no asset, starter id, target band or replay pin. Replaced the level-blind
backup guard, wrong-axis Harpoon scalar-only motion, airborne strip height and
per-frame tether actor-array allocation. Diagnostic output stays in ignored QA.
