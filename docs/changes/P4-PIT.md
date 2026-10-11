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

Native QA adds actual eight-car field identities and the production pitBox
helper to verify seven distinct CPU boxes leave the player box free. Compare
the whole active race before/after service rendering to prove crew is read-only.
Keep current service thresholds and deliberate authored fixture; no fake finish.

## Verification

Initial test fixtures corrected: exact mph limit comparison avoids a decimal
round trip; summer is intentionally absent in existing race state. No game
assertion or tolerance was weakened. Focused acceptance passes 6/6: road and
wall, real 60 km/h driving, no boost spent, exactly four-second service, one
swap/refill/GO, CPU real entry/stop/exit with no reset, seeded Nia choices,
contact hold and read-only crew callback. Source review then removed a CPU
box overlap with the player: seven distinct CPU boxes leave the player box
free. The added unique-box assertion awaits the scheduled lane check. A demonstrated CPU exit restop was
fixed by retaining serviced state across the road merge.

Native High/Performance passes on private 28875: memory-only saves, eight
readable frames, zero warnings/errors. Complete disposable storage rows stay
exact during service. HUD and physical boards show the fit then GO; two reused
fighters work in overalls. Evidence: .evidence/2026-10-11/P4-PIT/native.
No frame measurement, full tier, release or Summit balance claim.
Director source review of c1898d47 is clear, conditional on queued gates.
Synced reviewed lighting/capture source a89e562c before those gates.
No owned conflict; the read-only pit callback survives the renderer merge.
The native packet predates this sync. Unique CPU-box coverage and the actual
pit/qualifying seam remain queued; no current gate pass is claimed.
Sound cues: pit.limiter, pit.wrench, pit.go from the existing approved bank.

Actual Grand Prix player regression: its race-wide field has no CPU index,
so pitBox returned NaN and prevented service. Director grants the narrow fix:
only actual integer CPU indices use assigned boxes; the player uses centre.
Keep all seven distinct CPU boxes and existing four-second/limiter assertions.

Regression first fails NaN vs centre250 with all seven old tests green; narrow
index classification fixes it and all8 tests pass. Current native High/Perf
passes on private26729: actual active8-car box allocation, four-second TYRES
to GO, winter/refill/limiter, read-only crew and exact storage all pass. Eight
screenshots inspected, zero warnings/errors. Removed the inherited fixture
rival=null setter that silently cleared the seven opponents. No fake finish
or frame measurement. Independent source review clear; final5eb lane384/384 in648.47s/build496ms.

## Current integration sync

Genuinely merged dcdab76a (approved kits, Dossier, Telemetry and consumed-art
cleanup) before the queued gate. No conflict resolution or race edit. Pit
runtime, focused8-test regression and actual High/Performance scenario stay
byte-identical to dfddbf09; the existing renderer pit callback survives its
automatic additive Team Room merge. Keep the actual8-box/four-second native
verdict above; final gate passes and actual integration union is unchanged.

## Removed

No old runtime paths removed. The optional pit side replaces only its straight
wall segments; courses without the definition retain their original behavior.
The recipe and tests replace raw QA output after review. No new characters,
runtime dependency, saved field or runtime audio asset was added.
