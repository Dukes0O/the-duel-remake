# SUMMIT-FINISH-AREA: round 3

Claude's verdict: pending. Final art round; stop here under SPEC 0.11.

`round-3.jpg`: 419,247 bytes, 1945 by 1550. Same twenty views as round 2.
Rows: car 100 m before the line, car 30 m before, at-line context, actual
summit helipad, wide. Columns: High dusk, Performance dusk, High night,
Performance night. Native renderer, actual High/LOD kits, memory-only saves.
No frame timing. Browser passes on private port 27612, zero errors/warnings.

Captured source: `50900d56`. Recipe:
`node tools/browser-harness.mjs scenario summit-finish-area`.
Pending raw evidence: `.evidence/2026-10-26/SUMMIT-FINISH-AREA/round-3/`.
The JSON there records all camera positions and targets.

## Claude's five fixes

1. At-line context now shows the gantry overhead and parking ahead. Its eye
   is 5 m before the gantry, 1.65 m above the road, with a 105-degree vertical
   field of view. The other four camera poses are unchanged.
2. Twelve reused crowd figures stand nearer the road along the final 200 m;
   some have raised arms. The fence moves with them, outside the road.
3. The park uses the course's snow material, low edge banks, two existing
   parked sedans and a lamp. The central stopping corridor stays clear.
4. SUMMIT type doubles in size, with its banner fitted around it.
5. The existing operational pad keeps its location and rules. Dark H/circle
   paint follows the actual ground, the windsock is grounded, and a short
   marker-post path leads toward it from the hut.

The five changes have a clear independent code review. Camera overrides are
restored after each picture; captures verify unchanged race/profile/storage.
Art acceptance and any baseline update remain Claude's decision.
