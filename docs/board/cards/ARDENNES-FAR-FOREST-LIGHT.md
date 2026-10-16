# ARDENNES-FAR-FOREST-LIGHT

The Ardennes far forest (ARDENNES-FAR-FOREST) made the bald hills wooded but
cost too much: High p95 33.3 ms at Pit Straight against the 18.5 ms limit,
so it was taken out on 16 October before the Summit release. The band code
stays (`scenery.farForest`), tested in `tools/test-circuit-ardennes.mjs`.

Bring the far forest back at a cost the frame check accepts. Find first why
2,182 extra trees double High frame time while Performance is unaffected
(shadow casting, draw calls, the High tree material or level of detail), within
rule 4's 30 minutes, then pick the cheapest fix that keeps the hills wooded from
the road, for example far trees that cast no shadow, simpler far tree models,
or fewer, larger groves.

Acceptance: native views at La Fontaine, Les Combes and Stavelot judged by
Claude; a simple frame check at Ardennes Pit Straight passing both qualities;
first band and beeches unchanged; world signature recaptured from a reviewed
picture.
