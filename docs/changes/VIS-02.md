# VIS-02 — Armor kits and wreck visuals

## Changed

- Added socket-mounted Scrapper plates, bull bar and exhaust stacks for the player and up to three CPU cars in flagged Wasteland combat. Raider adds a roof cage and saw housings; Warlord adds a crown. The default display tier is Scrapper until garage kit selection is wired in PRG-04.
- Reused the accepted scrap-plating texture on the plates. It loads once, only for flagged combat. The metal colors remain usable if the file is missing.
- Plate sections dent and disappear as armor falls. Four fixed, reusable plate meshes briefly tumble away at the crossed armor thresholds. No simulation value or collision changes come from the visuals.
- Extended VIS-01's fixed four-car effect pool with continuous smoke below 30% armor and fire below 10%. Wrecks use the existing explosion/fire pool, so low-armor flames stop when a car wrecks and recovery clears them. Procedural smoke/fire remains available if atlas art fails.
- Small armor pieces do not cast a second shadow. Geometry, materials and effect planes are created once and disposed with the renderer.
- Added a read-only `projectOpponents()` renderer hook for UI-01. It returns ordered `{index, x, y, visible}` markers in normalized main-view coordinates, 2 m above each rendered opponent. Missing, hidden, behind-camera and off-screen cars report `visible: false`.

## Evidence

- `node tools/test-armor-kit-visuals.mjs`: 3/3 focused checks, including all four mounts, tier pieces, threshold plate loss, flag-off isolation, pooled critical smoke/fire and wreck handoff.
- `node tools/test-vehicle-sockets.mjs`: 845 checks passed for nine car socket layouts, replacement and retirement.
- `node tools/test-combat-effects.mjs`: 12/12 existing effect checks passed.
- `node tools/test-vehicle-projection.mjs`: visible, behind-camera, off-screen and hidden projections passed.
- `npm run build`: passed.
- `node tools/browser-harness.mjs scenario armor-kit-visuals`: final private QA port 56655, memory-only saves, High and Performance, six screenshots, zero warnings or errors. Reviewed intact, critical and wreck images. The first run's screenshots were obscured by the pause overlay; the scenario was corrected before final review.
- The change does not touch simulation state or race fingerprints. No replay signatures were regenerated.

## Assertions and limits

- No existing assertion was changed. The new test observes the renderer without changing armor.
- Garage ownership, equipping and +10/+20/+30 kit armor bonuses belong to PRG-04 and its simulation hook. VIS-02 reads `combatArmorKit` or `armorKit` when those values become available.
- Full frame-budget comparison is left to the integration release gate. The private scenario records draw calls, but draw calls alone do not establish frame cost.
