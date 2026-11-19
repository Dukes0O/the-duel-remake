# MACHINE-DRILL: the rig, the cuttings, the water and the wellhead, drawn (Claude, 19 November 2026)

View work only. No rule in `src/machines/drill.js` changed and no fingerprint was re-recorded.

- **Rig.** The yard uses the photo-built drill truck from `machines-2.glb` in place of the trencher's tractor with a ladder. Tab stands its lattice mast up over the hole and lays it down; the string feeds down in strokes with an auger turning at its foot; a jammed string shudders. The chase view stands to one side while the mast is up, and the driller's view stands behind the rig.
- **Cuttings.** A heap by the hole in the layer's colour, and a row of sample piles behind the rig, one for each metre drilled: red clay, brown gravel, pale rock, dark wet ground last.
- **Water.** A brown jet up the hole that clears and sinks back, and wet ground with open water spreading round the hole.
- **Wellhead.** Casing only while the rig stands on the hole; then a pad, a painted casing, a red valve and hand wheel, and a standpipe running water.
- **Words.** The caption is a whole sentence ("The bit is 8.7 m down, in rock."; "Water at 13.2 m. The bit is in wet ground."). "Lower the mast" became "stand the mast up" and "lay the mast down", because that is what this rig does; the choice is on the card for the Director.
- **Changed assertions:** none in `tools/test-machine-drill.mjs`. `tools/test-machine-view.mjs` takes the drill from `machines-2.glb`; its claims are unchanged.
- **Sound cues:** no new game event. The eight `drill-*` cues are unchanged.
- **Checks:** CHECKS-PLACEHOLDER
- **Hand play and look:** one well drilled to water with real keys in a visible window (clay, gravel, rock, one jam backed out, water at 13.2 m); sheets `docs/board/looks/machine-drill/round-1.jpg` to `round-3.jpg`, each with its review note; round 3 is the one to send.
- **Not done:** the truck's deck is blurred where its photos meet and its outriggers are plain bars (faults in the model; no Blender round was started). `tools/scenarios/machine-drill.mjs` was not changed.

**Removed:** the ladder of boxes and the drill bit of one cylinder on the trencher's tractor; the single ball that stood for the cuttings; the three plain cylinders that stood for the wellhead; the caption "in wet."
