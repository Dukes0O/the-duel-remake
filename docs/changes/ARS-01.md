# ARS-01: Harpoon, Caltrops and wave-one computer use

Native Source and the private production browser recipe are implemented.
The card is not ready to merge. Independent test fixture review, balance,
browser, save review, sounds and lane/build gates remain.

## What changed

- Harpoon launches a native leading 70 m/s projectile with full carrier
  velocity, a 4 degree launch cone and a literal 50 m travelled range.
- A native hit deals 6 armor per the existing 15 percent damage levels,
  adds exactly 6 m/s sideways toward the shooter, and tethers for 3 s.
  Ordinary driving still damps that physical impulse afterward.
- The tether reads actual player input or native CPU steering requests.
  Inclusive 0.6 steering away accumulates 0.5 s across neutral intervals.
  Shield, either wreck, separation over 60 m and expiry break the line.
- Caltrops creates a native 8 by 5 m oriented strip, 3 m behind the car.
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
  Geometries and materials are disposed; painting cannot change physics.
- The report counts native deployment products and all four CPU uses.
  Harpoon fire and travelling-flight cues are distinct from use accounting.

## Tests first and current evidence

Independent tests preceded Source at 37924a1. The settled owner grace is
1 s; hard-away input is at least 0.6 and need not remain continuous.
The first native Source runs pass 53 of 57 checks, including all six new
literal boundaries, 30/60/144 App cadences, transactions, cleanup and draw
purity. Four tests expose fixture sampling issues now under independent
review; their existing assertions have not been changed.

The two yank checks sample after native road damping rather than at the
hit. The road CPU comparisons start only 0.05 mph above the effect cap;
both controls can brake below that cap in the same step. The implementation
keeps the exact hit impulse and actual speed ceilings instead of changing
physics to satisfy saturated comparisons.

Bounded combat-balance acceptance passes 30 of 33. Source fixes the real
Harpoon count by observing its native fire cue once. Review also covers the
old two-weapon positive fixture and a new one-row aggregate that removes
required policy/difficulty samples. No assertion or target band was changed.
These results preceded the final accounting and scheduling fixes; reruns
are required. There has been no thirty-race report, broad tier, build or
browser capture in this Source slice. No replay pin has been regenerated.

## Remaining acceptance

The browser recipe runs the original genuine Oil/Smoke counters, then actual
Harpoon hit, accumulated steering and shield counters and Caltrops contact
and steering around, in High and Performance with tab-local memory saves.
It has syntax validation only and still needs the independent browser run.

Audio belongs to its separate owner. Source emits weapon.harpoon.fire,
.flight, .hit and .break and weapon.caltrops.deploy and .hit with actual
positions and actors. The fire/flight events include their native projectile.
No bank, catalog, audio, Game, arena-event, Salt or protected lane file changed.
Save Guardian, thirty-race balance, independent Source review and current
lane/build gates remain mandatory before handoff for merge.

## Removed

Replaced the two-user rear deployment branch with genuine four-user wave-one
scheduling and extended real projectile accounting. Unpacked the rewritten
combat presentation file. Removed no asset, starter id, target band or replay
pin. Diagnostic output stays in the ignored lane QA directory.
