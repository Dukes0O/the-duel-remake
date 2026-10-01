# ARENA-SHOVE

Status: ready-to-merge; Claude approved. Kyle checks the feel in the Preview.

## Changed

Arena contacts now shove idle, protected and wrecked cars through the crash
solver. Waiting wrecks slide while their recovery timer continues. The
20 mph and 40 mph open-floor minimums are 1.5 m and 4 m. Protection still
blocks damage; Titan crush and the road solver stay unchanged.

A straight outward ram against the wall keeps the target inside, applies
ram damage and rebounds the attacker. Tangential pushes slide along the
wall. No teleport or escape direction was added.

## Tests and review

Tests preceded implementation. All 131 native tests pass, including 6,542
checks across car masses, roles, wrecks, protection, wall rams and timers.
The existing 162 road replay checks pass with their original fingerprints.
No replay fingerprint was regenerated. Arena movement changes are the
intended shove; road behavior stays the same.

Independent Source review and private memory-only browser review pass.
The browser covered both quality modes, open-floor states, straight and
oblique wall hits, and released public controls. All eight public input,
spawn, trace and runtime-asset comparisons match the pre-card baseline.

The browser fixture was corrected to start with a fresh grounded pose,
separate a previous wreck incident and use an actually pinned single ram.
Native controls preceded each correction. No production guard, minimum,
containment assertion or earlier test was weakened.

Both quality modes measured a 16.8 ms frame-time 95th percentile in this
smoke check. There is no matched pre-card timing baseline, so this is not
a claim of a relative performance gain.

Claude approved the inherited body and rail crossings as outside this card.
They are unchanged and do not hold the merge.

The previous lane tier and build passed. Fresh required lane and build
gates follow this trimmed note and integration sync before merge.

## Removed

Removed the arena-only contact exclusions that prevented these shoves.
Replaced the long chronological note with the current behavior and review
verdict. Removed no road behavior, replay pins, timers, saves or runtime assets.
