# HOME-GROUND-3-DRIVE
1. Flatbed loads transfer on F release below 0.4 s; a real exit hold leaves delivered tin untouched.
2. Builders use the gate lane and open its leaves. Cause: the reported 48 m position is still on the slow 1.25 m/s approach, not a reproduced rule freeze; the sample took about 65 s and gate proximity watched only the player. They now reach the site within 60 s.
3. Wren teaches beside the player after the first hand-built coop or shed, within talk range and facing him.
4. Facing any point along an unfinished footprint within reach offers its next stage, independent of the player's cell.
5. A new building's near edge starts about 2 m ahead, allowing for the 2 m grid.
6. Outlines use a ground rectangle, four short posts and a faint low first stage; refusals retain red and their reason.
7. One remaining crate, panel or stored egg uses its singular noun; gathering one coop egg does too.
8. Coop and shed sheets have separate rusty seams, dents, bent corners and dark weathered feet.
Checks: e6a8de5d6 plus this commit's game/test changes; core 804, backup, town vehicles, hens, hens look, board and hygiene passed. Final home 380, hens 1256, hens look, three guards and npm run build passed.
Fingerprints: replay 306, combat replay 12 and world composition 65 checks passed unchanged. No pins regenerated.
Assertions: none loosened or removed; delivery inputs now include release, the hand-build test moves 0.2 m, and the crew fixture is fully fenced.
Scope: test-open-roam-start fails at line 163 because its old input never releases F before expecting a load. Question committed in e6a8de5d6; Claude must extend test scope. No browser or frame check requested.
Cues: existing home.load.on/off, home.crew.arrive, home.crew.hammer, home.crew.done and stage/hammer cues retained; teaching uses the existing talk hail.
**Removed:** load-on-press, cell-dependent building selection and tall pale preview volumes; no save fields or released behaviour changed.
