# QA-ARENA-STEERING-AIR-ONLY

## Decision before code

Claude approved the fixture repair on 15 October at 05:20. Keep the production Jesko refusal while helicopter is on, and use the existing road-legal Viper prototype beside Falcone and Titan for positive steering coverage. Jesko remains unlocked in the disposable profile; no transported location is forged. App admission still refreshes its owner from the memory-only saved fixture.

## Change and assertion review

The scenario now calls the real App arena entry with Jesko once per quality before any positive arena entry. It requires refusal with the production air-only message, helicopter enabled, the refreshed owner retaining the Jesko unlock, and unchanged owner, yard, Duel state/course, run ID, arena serial and helicopter profile. These additions distinguish the intended refusal from a missing unlock or an unrelated admission failure. They do not bypass admission or replace an App method.

The third positive car changes from Jesko to viper_proto, which is explicitly unlocked and saved with the existing disposable discovery fixture. Both High and Performance still run three full-lock arcs, three releases and the natural Sal half-yaw window: the same fourteen pictures. Every pre-existing numeric threshold, physics assertion and pose remains unchanged, as do replay fixtures and fingerprints. No game, vehicle, save or harness file changes.

## Validation

Exact frozen 5c47121b06ce5f935dfa0895be0bd60faf7d6697 passed its original private memory-only native scenario at42800: both qualities, fourteen pictures, zero issues/warnings, explicit Jesko refusal plus Falcone/Titan/Viper steering and natural Sal window. Canonical lane/jobs4/changed/keep-going passed20/20, zero failures/unrun, in537207.8662ms. One Root independent source review is CLEAR. Root final production build passed in4297.1685ms with source/post SHA exact and clean. Existing code, physics assertions and numerical thresholds are unchanged beyond the explained fixture correction. Results are folded into this real integration merge; no repeated gate or native run after a clean merge.

The original failed night packet remains at .evidence/2026-10-15/FAC-03/night-QwGun4/browser/arena-steering/. This repair grants no historical full-batch or release pass. The owning card-answer chat retains its new lane and creation receipt for its own verified cleanup after this merge.

## Removed

Replaced the invalid positive Jesko entry assumption with explicit Jesko policy coverage and Viper steering coverage. No runtime assets, source paths or numerical assertions removed.
