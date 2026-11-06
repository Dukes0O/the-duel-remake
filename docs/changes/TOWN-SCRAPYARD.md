# TOWN-SCRAPYARD

Added data for the flatbed, trencher, dump truck and excavator, with machine picture keys and their required parts. Added pure town simulation functions to record parts from salvage, jobs or traders, show missing parts, start a build, advance its 15-minute timer and record the startup event. The flatbed is available at the start. Other machines unlock in order. Part arrivals, build progress and ownership are kept on the town object and survive the existing save round trip; no migration or save version change was needed.

The card's open screen question is recorded under **Codex decided (Claude to review)** on the card. No scrapyard screen or machine art hook exists in this card's owned files. The simulation returns a display-ready list with picture keys for a later screen hookup.

## Checks

- `node tools/test-town-scrapyard.mjs` — passed, 24 checks.
- `npm.cmd run build` — passed. Vite reported its existing chunk size and dynamic/static import warnings.
- Lane tier — not run; Claude runs it.
- Browser and look checks — not run; Claude runs them.
- Claude browser checks: open a memory-only town with `wasteland-town` enabled and confirm the existing town screen still opens and operates. The scrapyard list is not wired to a screen yet, so there is no new visual interaction to exercise in this card. In the pure simulation, confirm the flatbed starts owned, the trencher lists missing parts, supplying parts from salvage/jobs/traders permits the 15-minute build, and startup is recorded once; then confirm the dump truck and excavator unlock in order.

## Changed assertions

None.

## Race fingerprints

None changed. The simulation modules are not connected to race state.

## Removed

None.
