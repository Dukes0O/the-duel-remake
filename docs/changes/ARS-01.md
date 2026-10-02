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
The original 57 native cases and 33 balance accounting cases pass. Source-review
regressions now reach 61 native cases: 57 pass and four new cases fail. Rotated
victims move 6 m/s along the nose instead of sideways; airborne Caltrops damage
a ground car while their native anchor and visible spikes stay about 10 m high.
Existing assertions, fixtures and replay pins are unchanged. Broad gates remain.

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

## Save Guardian follow-up

Tests first at f03c568 reached 40 checks: four controls passed and ten
backup cases failed. Recognizing an already earned future Harpoon or
Caltrops adds level zero without granting ownership.
needsCareerMigration now compares saved levels with the real normalizer.
The existing verified backup keeps every original registry byte before
startup normalization, including formatting, future fields and other careers.
All 14 new cases pass with 88 reached checks; seven historical fixtures,
quota, validation and recovery checks pass unchanged.
The native wave suite passes 57/57; Arsenal save remains 99/100.
Save Guardian approved the front predicate's Crossbow-or-Harpoon correction:
rank-six Easy seed 1989 carries Harpoon, Star, Caltrops and Oil, satisfying
the settled front-damage rule. Automatic approval review rejected that exact
existing-assertion edit twice and requires Kyle's explicit approval.
It remains unchanged. No new storage, unknown-id grant or replay-pin edit.
Independent Save Guardian re-review and fresh broad gates remain required.

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
pin. Replaced the level-blind backup guard with the actual normalizer check.
Diagnostic output stays in the ignored lane QA directory.
