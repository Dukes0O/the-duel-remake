# FIX-LIVE-EDGES

## Settled scope before code

Claude's 13 October 08:40 answer splits renderer wiring into FIX-HAIRPIN-CAMERA. This card owns shared road-strip drawing, kit footprint seating, lining/layout and named wall regions, body-to-visible-face reporting and a pure target-aware camera position function. The camera function receives the actual car target, returns a new position and does not change course/race/camera inputs. The existing tunnel clamp remains byte-exact; the later card owns the one renderer call after damping.

Tests come first in the existing circuit-ground, kit, track-script, camera-clearance, physics-expansion and drive-through acceptance. Use real Harbour/Tremblant geometry and original rotated F42 body support. Keep all existing tests and bounds, including .45/.30 m grounding, 1.5 m sinking, .15 m body shortfall/.30 m penetration, 35-degree glancing contact, native source provenance, driver and seeds. Reporting compares the body with the actual rotated visible face, not its centre. Thin kit linings already carry barrier:true; prove actual contact before changing classification. No collision/terrain/surface/driver/authored metadata or fingerprint edit is authorized.

First reproduce drawn-road coverage and actual footprint floats. A shared pure seating calculation should serve both actual kit matrices and measured ground diagnostics; its reporting binding is granted by Director 4ea39dc0. Any remaining long-lining or collider change must show its affected rows/fingerprints before code. Do not infer plough-bank collisions: preserve the distinct winter stock-autopilot and .95 drive-through witnesses, and report the actual first contact if heavy route checks are later authorized.

No browser, frame, balance or full check runs here without Root's grant. Final source gets one original unfiltered lane --changed --jobs 4 --json --keep-going, a build and Root's independent review. Thirty minutes at most on a single problem. Root owns shared metadata, integration and this new lane cleanup.

## Checks

Original road/ground acceptance was genuinely RED: both observed native road points lacked drawn triangles and Harbour had 63 wall/fence floats above the unchanged .45 m limit. Authored road strips now use 2 m rows with a rotating-edge and Float32 rounding allowance; original native widths remain exact. The strengthened actual edges at quarter/mid/three-quarter mesh phases and the original observed points pass (2/2, 621.5656 ms). Course.at linearly interpolates native X/Z, so these actual checks need no hypothetical unsampled arc-radius term.

The shared footprint seating clears the Harbour floats, while Woods and Snow retain the original nine-sample ground checks (3/3, 2687.4158 ms). The original track-kit suite passes actual High/LOD validation of 371 Woods, 459 Snow, 1925 Harbour, 503 Panorama and 39 Summit placements. Added actual High GLB matrix checks at the three Harbour defect spans pass the original .45/1.5 m limits without changing physical features. No lining segmentation, named-wall, collider or authored-value change is needed.

The pure target-aware camera helper was genuinely RED because the export was absent. It now passes 1395 actual/contract checks; the original 364 tunnel ceiling checks remain unchanged. Renderer wiring and an actual visible Lantern apex belong to FIX-HAIRPIN-CAMERA.

Body reporting was genuinely RED for an absent finite body gap, then passed at six real F42 approach angles. It reports the signed nearest rotated body-corner support against the actual drawn lining face. The native probe now observes the first original swept contact, retains the old centre/limit diagnostics and .3-radian inputs, always calls the original solver and restores/disposes afterward. Claude's .15 m short/.30 m penetration criterion replaces only the superseded centre-based verdict. Historical failure and every old assertion remain intact. Native route/probe acceptance has not been executed yet.

The original pure physics suite passes 12371 checks plus actual Harbour 10-degree/100 mph scrape and 45-degree crash. Harbour has zero solid kit rows; its drawn kit lining pairs with named script barrier colliders. Existing barrier classification already implements the settled scrape rule, so no solver/classification change is made.

The granted existing High photo recipe succeeds on integration and candidate Harbour: 16 original frames and four outputs each, private ports 58367/42487, zero warnings/errors. Both stock witnesses honestly end in gameover. Their complete lap-trace.json bytes have the same SHA256 03fe1c98cac48b54df5bce6d1bf9d19dc8588f331d5149eaaf946309eabc6bfe. This proves unchanged observed race behavior; it is not pace/finish acceptance. Snow baseline also succeeds with original winter tyres and stock autopilot, private port 62934; candidate succeeds on private port 36745. Both complete native trace bytes are identical (SHA256 053f3d12e3896d90bcd3e09370378438b6649df7911ca695412423cbf2e9616b); flying lap 113.067 s, Ridge 9 mph, Beaver Hairpin 0 and Final Turn 17 remain below the unchanged 20 mph/no-stop acceptance. No photo retake, frame check, full run or final lane/build pass is claimed. Evidence is in integration .evidence/2026-10-13/FIX-LIVE-EDGES.

## Reviewed signature changes before code

Director e42fce5a grants only these five complete scene rows from the existing read-only capture on final union f42f8a11, after reviewing the actual High photo differences. Sixteen unaffected full rows are byte-exact. Drawing density/edge coverage changes these hashes; native Harbour/Snow traces and all physical-feature snapshots remain exact. All resource counts stay exact for four rows. Summit's 666 nodes/21123 instances preserves the separately merged Gallery 10800 change; all other Summit counts remain exact. Its unmerged final-art source needs a separate later union review. No capture/assertion/replay change is made.

| Course | Old hash | New hash |
| --- | --- | --- |
| harbour-lights | 77ee8cd229d6253bf86ad7d94c3f4b01b9ee24cee5ce070cf06309387de27dfb | 5e76606597472517c74e4dcd1d33f162de86cab9c066f01b306e73a722107dbe |
| panorama-ridge | 16c20d35f5ea41b662754b1887cb26a0b7a4d6bc07f3e07a7a8275d66cd1a44b | 4f74a85a4d27fa396d209da04e69bbf8a12eef97657811558a8c1141760cb964 |
| summit-run | 8d22229769719d5f73c1c7219767438619464520c434222ae350d82786b0d01e | b36430dc3c3119840076fa2c3b7f0f1b74284e32daf8093fa346354202bda78a |
| tremblant-snow | 1c86d730fd4d7a9d284996a9c71fb2569e57f9e9c551fc515c6f10f36da8c58c | dc6a0b0d29ddc5b297b1fd104eb17a06f396bd055b51ee1b6e9538e85a27469d |
| tremblant-woods | 52d26d6708b17d071a02e1d8774255c445c83ae805c4a74418bd013514879557 | 6a3403c78bf311f8494829b665bb47dcaeebca672c45e5598354098a126acfa9 |

## Removed

No runtime asset removed. Superseded centre-only body reporting and any replaced drawing/seating path will be removed in the same change. The old tunnel clamp remains for FIX-HAIRPIN-CAMERA's later wiring; no duplicate renderer path is introduced.

The first new body fixture incorrectly requested a Harbour kit-solid even though this authored course has no solid kit rows. Its actual contacts are named script linings; the fixture now uses those real barrier colliders and the unchanged drawn kit face. No production classification changes follow from that fixture failure. Added exact quarter/mid strip-row road-edge observations to check the drawing allowance, including native centreline interpolation.

## Final integrated source verdict

Final cdf55a11 source passed original nearby94/94, failures empty/notRun0/jobs4,652101.8272ms; build576ms/wall1115.8817ms, independent review CLEAR. Conflict-free integration118501b1 needs no repeat. Native Harbour/Snow pace and actual camera wiring remain open; parent is not complete. Own clean new lane recycled after verified dependency unlink and normal unregister; all actual pending failed-native evidence remains.
