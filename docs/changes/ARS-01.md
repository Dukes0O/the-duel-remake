# ARS-01: Harpoon, Caltrops and wave-one computer use

Native Source and the private production browser recipe are implemented.
The card is not ready to merge. Balance,
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
Current bounded acceptance passes all 57 native weapon checks and all 33
combat-balance schema/native accounting checks. These include all six literal
boundaries, 30/60/144 App cadences, real transactions, cleanup and draw purity.
No thirty-race report, broad tier, build or browser capture has run yet.

The independent reviewer approved four narrow fixture corrections and
reproduced their native witnesses before those edits:
- Sample the exact 6 m/s yank at the actual hit event, then separately retain
  the exact ordinary road damping of 6 times exp(-1.5/120).
- Start only road CPU ceiling comparisons 5 mph above the ceiling. The prior
  0.05 mph fixture let both native controls brake below the ceiling in one
  step. Literal ceilings of 160.8 and 180.9 now compare with actual controls
  at 164.2167 and 184.3167; original player and arena assertions stay intact.
- Add separate genuinely measured Harpoon/Caltrops rows to the four-use
  positive validator while preserving the original three-row assertions and
  zero-use Oil/Smoke controls. Bounded rows are never marked complete.
- Append each genuine use row to the full report fixture rather than remove
  required policy/difficulty samples. Native and aggregate counts stay exact.
No settled rule, balance target, old native use assertion or replay pin changed.
The Source count observes Harpoon's native fire cue once, so its flight cue
cannot consume the projectile identity before use attribution.
Restored two range-message characters and one unchanged comment after an
encoding error; all source writes now name UTF-8 explicitly.

## Save Guardian follow-up: tests first

A canonical version-two registry can already own Harpoon or Caltrops as an
old future id without a level. Actual load and direct raw save add level zero,
but startup currently skips its verified backup. Memory-only regressions reach
40 checks: four preservation controls pass and ten backup checks fail. They
cover detection, exact pre-migration bytes, both normalization paths, failed
and unverified recovery, other named careers, valid levels and future fields.
All existing career-backup assertions pass unchanged; no replay pin changed.
Source must recognize this shape change before startup can normalize it.
The unchanged Arsenal save suite passes 99 of 100 cases. Save Guardian
approved replacing its Crossbow-only front-attack predicate with Crossbow or
Harpoon; seed 1989, rank-six Easy carries Harpoon, Star, Caltrops and Oil.
The test-author role forbids editing existing assertions, so that narrow
reviewed correction is handed to the builder; all 180 policy inputs remain.

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
