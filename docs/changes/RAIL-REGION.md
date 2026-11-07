# RAIL-REGION

## What changed

- Set the Whites base to the Scablands floor at `rail-east-run` (560, -120). The bank foot is about 1 m and the top is about 18 m, a 17 m rise. The first 65 m stay level through the cutting shoulder; the rest climbs within the 1-in-25 limit. The existing edge blends keep the surrounding wall and cliffs.
- Added the `branch-cut` (`branch-points`) and `whites-cut` (`branch-open`) polylines. Both use a 12 m floor half-width and 45 m shoulder. Their height blend runs after the region shape, so physics and the road/rail join share the cut. The named join now says that it opens through `whites-cut` alongside the rail.
- Added shared Scablands height functions in `src/world/scablands-height.js`; the region and ground code no longer carry separate copies.
- Added current open-mark accessors. Mark changes rebuild the ground edit layer while retaining its saved edits. The scene uses those marks by default and refreshes its ground, road and Whites view when they change. A reset or race start clears the marks.
- The Whites and `whites-cut` use the salt surface. Removed the course definition's mark lookup; course height reads the shared current ground state.

## Place ground heights

The table records world ground heights for RAIL-JOBS-1 and RAIL-JOBS-2's branch places. Values are metres.

| Place | No marks | `branch-points` | Both marks |
| --- | ---: | ---: | ---: |
| `rail-east-run` | 1.00 | 1.00 | 1.00 |
| `branch-post-1` | 4.75 | 1.00 | 1.00 |
| `branch-post-2` | 107.13 | 1.00 | 1.00 |
| `drift-foot` | 101.51 | 1.00 | 1.00 |
| `bank-foot` | 173.42 | 173.42 | 1.00 |
| `bank-top` | 175.30 | 175.30 | 18.00 |

With both marks, `bank-foot` is 1.00 m, `bank-top` is 18.00 m and `drift-foot` is 1.00 m. The wall stays at its natural height at `bank-foot` until `branch-open`.

## Checks

- `node tools/test-rail-region.mjs`: passed. Checks 3,500 exact closed-world samples, both mark states, place heights, cut/bank/plateau slopes, ground edit preservation, race reset, surface type, scene loading and storm isolation. The initial red run confirmed the former bank foot was 173.42 m; the corrected run passes.
- `node tools/test-repo-hygiene.mjs`: passed; placement is clean. Size targets remain advisory.
- `node tools/test-replays.mjs`: passed; 297 fingerprint checks across 33 cases, 31 events, 9 categories, three FPS values and three runs. Fingerprints are unchanged.
- `node tools/test-world-composition.mjs`: passed; 63 immutable-feature and exact scene checks across twenty events. Closed-world composition and signatures are unchanged.
- `npm run build`: passed. Vite reported the existing large-chunk and ineffective dynamic-import warnings.
- Browser and look checks were not run in this lane. Claude should inspect the bank foot and top, the Whites edge cliffs, the rail and road cutting, and the salt ground in the opened scene. No frame check was run.
- Changed assertion: replaced the old standalone 1-in-30 bank-grade assertion with checks for the specified 1 m foot, the 17 m rise within 2%, and 1-in-25 maximum slopes along the bank and plateau. The old grade did not account for the required cut shoulder at the bank foot. Closed-world exact-height assertions and replay/signature checks remain unchanged.
- Race fingerprints: unchanged.

## Removed

- Removed the duplicate Scablands height formula from `regions.js` and replaced it with shared functions.
- Removed `def.openMarks` from the Scablands course relief lookup. Open marks now come from the ground state.
- Removed the obsolete "named join only" road status.

## Merge note

Lane tier and `npm run build`: passed on d41607c4. Claude's review: the bank's first 65 m are level, so its climb on the ground is 1 in 25.6; the job's braking uses the story's 1 in 30 from its data, so the figures stand.
