# P4-PIT

## Design before code

A track opts in with `pitLane: {straight, side}` on its switched definition.
The named straight supplies a nine-metre asphalt branch with smooth entry/exit,
a solid separating pit wall, entry/exit markings and a marked player box.
The same course surface and height data drive the visible road and simulation.
The automatic 60 km/h limiter disables boost and emits the existing pit.limiter
cue. Under 5 km/h in the box starts one fixed four-second service; movement
stays held until tyres swap once, boost fills, and the pit.go board/cue appears.
Two existing crew figures wear overalls; their pose reads service state only.
No course that omits the pit definition changes.

Claude approved Hard's remaining-piece tyre/grip/top-speed estimate against
pit transit plus four seconds. Easy pits for a better next stretch; Medium
rolls 75%. Nia keeps summer through snow in 40% of Easy/Medium races; on Hard
she cannot skip when the estimate saves over three seconds. Choices use
the race seed and racer identity and are held for the race.
The Summit Run timing comparison belongs to P4-SUMMIT when that course exists.

## Verification

Initial test fixtures corrected: exact mph limit comparison avoids a decimal
round trip; summer is intentionally absent in existing race state. No game
assertion or tolerance was weakened. Focused acceptance passes 6/6: road and
wall, real 60 km/h driving, no boost spent, exactly four-second service, one
swap/refill/GO, CPU real entry/stop/exit with no reset, seeded Nia choices,
contact hold and read-only crew callback. A demonstrated CPU exit restop was
fixed by retaining serviced state across the road merge.

Native High/Performance passes on private 28875: memory-only saves, eight
readable frames, zero warnings/errors. Complete disposable storage rows stay
exact during service. HUD and physical boards show the fit then GO; two reused
fighters work in overalls. Evidence: .evidence/2026-10-11/P4-PIT/native.
No frame measurement, full tier, release or Summit balance claim.
Lane/build and one independent source review remain before integration.
Sound cues: pit.limiter, pit.wrench, pit.go from the existing approved bank.

## Removed

No old runtime paths removed. The optional pit side replaces only its straight
wall segments; courses without the definition retain their original behavior.
The recipe and tests replace raw QA output after review. No new characters,
runtime dependency, saved field or runtime audio asset was added.
