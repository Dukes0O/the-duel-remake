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
  Active knock receives the yank directly, with no deferred road-field duplicate.
- The tether reads actual player input or native CPU steering requests.
  Inclusive 0.6 steering away accumulates 0.5 s across neutral intervals.
  Shield, either wreck, separation over 60 m and expiry break the line.
- Caltrops creates a native 8 by 5 m strip on terrain 3 m behind the car.
  It lasts 8 s, ignores its owner for the first second and touches each
  body once. It deals 4 armor and refreshes 4 s of grip and speed limits.
- Player, road CPU and arena CPU share speed caps: Tether 0.8; Caltrops 0.9 with grip 0.75.
- Real rank-three/five purchases and levels extend saves; normalization grants no ownership.
- CPU checks four positional conditions; a cooling weapon cannot hide another ready one.
- Presentation reuses bounded pools: forty visible spike instances per
  strip, at most twenty-four strips and four actual per-car tether lines.
  Tethers read four slots and reuse scratch; resources are disposed; drawing is read-only.
- The report counts all four native CPU uses; Harpoon fire counts once, separate from flight.

## Tests first and current evidence

Independent tests preceded Source at 37924a1. The settled owner grace is
1 s; hard-away input is at least 0.6 and need not remain continuous.
Independent motion and contact regressions failed before Source; all 65
native cases pass, including exact yank, active knock, ground/spikes, full
participant closing speed, wall damping and the opposing-yank counter.
Current 35 projectile, 13 ram, 7 solid-contact and knock integration cases
pass with old replay pins exact; prior bounded accounting passed 33 cases.
Relocation, wreck, knock, safe reset and lifecycle clear the private impulse.

The independent reviewer approved five narrow fixture corrections and
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
- The new 60-degree/196-mph barrier was glancing: incidence 0.557927 is
  below unchanged sin(35 degrees). Reviewed 55 degrees/170 mph gives
  108.502 mph above 100.5, incidence 0.636269 above that glancing bar.
  Damage, threshold and quarter-damping assertions remain exact.
The opposing control's actual normal is 97.212 mph below 100.5; its signed
forward term reduces the legacy subtotal before clamping the total at zero.
No settled rule, balance target, old native use assertion or replay pin changed.

## Save Guardian follow-up

Tests first at f03c568 reached 40 checks: four controls passed and ten
backup cases failed. Earned future Harpoon/Caltrops gain level zero only.
The real normalizer drives migration; verified backup retains original
formatting, future fields and every career before normalization.
All 14 new cases pass with 88 reached checks; seven historical fixtures,
quota, validation and recovery checks pass unchanged. Arsenal save is 99/100.
Save Guardian approved the front predicate's Crossbow-or-Harpoon correction:
rank-six Easy seed 1989 carries Harpoon, Star, Caltrops and Oil, satisfying
the settled front-damage rule. Automatic approval review rejected that exact
existing-assertion edit twice and requires Kyle's explicit approval.
It remains unchanged. No new storage, unknown-id grant or replay-pin edit.
Independent Save Guardian approved byte preservation; fresh broad gates remain.

## Remaining acceptance

The bundled browser recipe keeps original Oil/Smoke controls and uses real
hits/breaks, CPU Harpoon/Star decisions, strip events and native grip/speed
controls. High/Performance and phone HUD use tab-local memory saves.
Syntax and 70 embedded expressions pass; independent browser run remains.
Bounded native witnesses: CPU fire/hit once, shield contact at 28.583 m with
zero armor loss, Caltrops grip 0.75 and ceiling 180.9 mph.
Prior thirty-race Medium wins were 70 percent with zero CPU Oil/Smoke uses;
a current passing report remains, preserving all historical targets.
Claude approved the six native Harpoon/Caltrops sound hooks and labelled rear-defense races.
All six cues carry actual actors, positions and products; audio stays with its owner.
Independent Source review is clear; current balance and lane/build gates remain.

## Removed

Replaced the two-user rear deployment branch with genuine four-user wave-one
scheduling and extended native accounting. Unpacked combat presentation. Replaced
level-blind backup, wrong-axis yank, airborne strip height, per-frame tether array
clipped forward wall contribution and browser raw-Source imports. No asset or pin
removed. Diagnostic output stays in ignored QA.
