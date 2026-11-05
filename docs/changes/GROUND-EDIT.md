# GROUND-EDIT

Status: implemented in `codex/ground-edit`. Feature switch remains `wasteland-town`.

Added a pure sparse ground edit layer with deterministic depth-based topsoil, clay, gravel and rock; circular cuts to a target elevation; fills measured in loose cubic metres; 25% bulking; reserved shapes with refusal sentences; and typed-array chunk save/load. Each touched 32 m chunk stores 1 m sample deltas and material IDs. The Scablands physics and scenery height hook now reads one shared editable layer. It allocates no chunks until an edit runs, so the natural ground path stays unchanged.

Settled the card's open shape choice as circles (`{x, z, radius}`). No other design decision was needed.

## Checks

- `node tools/test-ground-edit.mjs` — passed. A 200-chunk quarry uses 1,117,920 bytes; 10,000 small cuts took 56.2 ms.
- `node tools/test-scablands-ground.mjs` — passed, 5/5. Road driving, Tin Town walking, Ridge climbing and chunk-edge continuity remain intact.
- `npm.cmd run build` — passed. Existing Vite warnings remain for a mixed dynamic/static import of `src/game.js` and large output chunks.
- Lane tier, browser checks and look checks were not run; Claude owns those checks under this card.
- No existing assertions were changed. The new test covers material determinism, cut and fill volumes, bulking, protected and reserved regions, the untouched Scablands path, optional edited heights, typed-array round-trip and quarry size/performance.
- No race fingerprints were regenerated or changed. The hook shares the existing Scablands natural-height function when its edit layer has no chunks. Claude should confirm the Everburn Easy proof and recorded race fingerprints during the lane tier.

## Claude browser check

Open the Scablands and check that the road, Tin Town walk and Ridge driving still meet the natural ground. This card adds no player-facing dig controls, so the browser cannot exercise a cut or fill; verify edited rendering and vehicle/fighter grounding when the editor controls arrive.

## Removed

- Replaced the Scablands height function's standalone natural-height return with the shared ground-edit height hook. The natural-height calculation remains as the source for that layer.
