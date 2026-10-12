# FAC-08: native course drive-through

Status: building. Own drive-through.mjs, test-drive-through.mjs, this note and the granted pure course-ground-checks.mjs. No runtime, existing test, course, asset, save, reference, replay or world-signature changes.

## Design before tests or code

The historical witness is actual commit 5092a01865887432ce609be0eed942f60605a2ba. Git proves it is the first parent of the full Tremblant fix 977efad9fc720329243b40c1557859b5b433eea3. The fixed acceptance source is the current isolated lane at be776e50. Tests archive historical src/package plus named driver and JSON dependencies into a uniquely owned .qa-dist fixture. Its dependency junction points only to integration. No runtime file is overlaid with a fix. Each archived source and the driver hash are reported; the owned fixture is recycled after its junction is unlinked.

The lap recipe follows existing driveCircuit: Falcone F42, club driver, casual transmission rules, easy/medium/hard CPU, seed 1989, one native rival, no upgrades, 60 Hz App.advance. Authored roads use the existing useRacingLine at .95; legacy roads keep the stock App autopilot. Memory-only storage and QA globals are installed before dynamic game imports. Native configured race length remains unchanged. Observe until the first actual completed lap (or native endpoint for an open road), without shortening lapsTotal, forcing a result or paying a completion. Non-finish at the existing 1200-second driveCircuit cap is a failure. No slowed driver, driver retune or hidden recovery is allowed.

At each native physics step, record a grounded car centre leaving the actual drawn road/shoulder triangle coverage. Keep a swept centre-segment check against actual solid obstacle boxes; report complete through-passage rather than a legal contact stopped at the face. Read actual geometry from the selected source, never analytic-only terrain. Ground cover scans the complete lap every 2 m at nine road offsets and six shoulder offsets, exactly as test-circuit-ground: road lift .035 m, shoulder lift .018 m, cover threshold surface minus .001 m. Near/far ground, authored hills, backdrop hills and lake triangles are all included.

Object grounding reuses the same real visible-ground triangles and nine rotated footprint points. Use the source's KIT_FOOTPRINTS; the historical source predates that file, so its actual kit manifest supplies only the same measured solid-piece sizes, without adding collision. The existing special footprints remain exact. Float limits stay .3 m (.45 m for long thin pieces or lift towers), sink limit 1.5 m, dock-water distance .4 m. Read the source's renderedGroundHeight and actual hill lift/sink placement. This catches the original ski lodge/barn without installing the fix.

Normal centre-line driving may never reach a broken barrier. Separate bounded native contact probes reproduce the existing eight Tremblant sites at both 70 and 110 mph. Each starts a fresh native race, positions the car three metres inside that road edge, heading error side x .3, full throttle, and advances at most four seconds or the first native impact. The car must reach the edge and remain at most gap minus .5 m past it. The same contact recipe can sample authored drawn barrier placements on other named courses; no visual piece is declared solid by the checker. Ordinary lap faults and these intentional probe excursions are reported separately.

The CLI accepts a named course, seed, time cap and JSON output. Source-root selection is restricted to this checkout or its own .qa-dist historical fixtures. Exit 0 means all three native lap observations and all real ground/barrier checks pass; exit 1 retains actual acceptance failures; exit 2 reports invalid input or tool errors. No browser, frame or balance command is added.

## Checks

Tests first. Require real fixed-source ground and barrier pass, one observed native lap per difficulty with the native multi-lap target intact, all three original faults on the actual historical source, and invalid/unfinished results that cannot report green. Existing assertions and all fixture values stay unchanged. Canonical nearby lane, build and one review follow the frozen implementation.

## Removed

No existing checker or runtime path is replaced. Temporary historical source and generated test outputs created by this card are recycled after their verdict is recorded. Existing measured ground/barrier suites remain unchanged.
