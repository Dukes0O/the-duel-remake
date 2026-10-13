# P4-SUMMIT

Dev source candidate; gameplay and art acceptance remain open. No release.
The immutable course manifest is summit-run/dev, 2,600 CR, Grand Prix,
release order 4, generation stage 20 and Falcone F42/Club/racing-line .95.
It appends after the accepted courses and allows all cars, six racers,
one point-to-point run and no combat. Saves, pay, records and ghosts are unchanged.

## Behavior and design before code

Keep Claude's 52-piece, 14,219.9546 m road, 720 m climb, six hairpins
(16/16/18/16/15/15 m) and three crests (2.5/2.5/1.5 m).
Avalanche markers stay 10000/10100/10420-10580/10900 m.
Negative lateral is driver-right, confirmed by native steering and asset axes.
Gallery uses the approved actual GLB, exact roof/post transforms and a
5.0561127 m underside with the original minimum 4.5 m road headroom.
Only authored Gallery roofs opt into vertical collision clearance;
grounded passage, airborne roof contact, solid posts and legacy contacts remain.

Claude's revised F42 Medium target is 270-330 s. Summit alone starts with
a 180 m, 80 km/h bay centred on the real pit box and four-second service.
Outside the bay, demo/native/CPU controllers use normal driving targets.
Absent bay fields retain the legacy full-lane 60 km/h limiter and arithmetic.
Warm tarmac replaces only asphalt pieces in A/B: summer grip 1.0,
winter .82 and warm winter top-speed share .97; gravel and the pit stay exact.
Legacy tyres/surfaces and Deep sea-floor stay exact. Warm draws as asphalt;
its WARM TARMAC hint applies below .80 grip, with no new cue.

Reuse dense B pine/birch groves, soft snow heaps, existing rock meshes with
smooth cloned normals and actual Harbour night exposure 1.02.
Light only real hut windows and observatory aperture-side material faces.
Mixed winter affects only authored ranges; legacy full-winter paths stay exact.
Keep Gallery geometry/colliders. Round two retains the original 16 views
and adds the genuine fork approach in both qualities; no frame timing.

## Changed assertions and source union

The release test formerly required the complete registry to contain exactly four
released circuits. Summit adds a fifth dev entry. The approved correction checks
only state-on manifests against those same four IDs in the same order. Generic
registry coverage and explicit dev selection assertions remain unchanged.
The Deep surface test also pinned the former complete five-kind catalogue and
its five summer grips. The approved fixture correction appends warm-tarmac
and grip 1 while retaining the original names, order and values. Sea-floor,
asphalt, tyre, driving, gravity, landing and switch controls remain unchanged.

The clean release/Tollkeeper sync retains both shared Game changes and Claude's
approved Panorama fixture updates; no fixture or signature is regenerated.

Keep FAC-04 registration and FAC-05 fixtures, Pay/Qualifying/Panorama/Deep,
GP nine-base admission, Azure -400 and Panorama -43 staging. Drop obsolete
central Summit registry/flags/prices/Preview/count edits; use its own manifest.
Additive day tests pin its manifest, native appended identity and empty storage.
Cyclic closure/reverse-drive/reference assertions apply to closed courses only;
native catalogue coverage still includes every course. Old targets/tolerances stay.
SURFACE_KINDS adds warm-tarmac; every prior value stays exact.
Claude corrected only the race-time target; strategy gaps remain 4-8 and 2-5 s.
Replace the unrun 6 m roof assumption with actual GLB agreement and >=4.5 m.
The bounded fit stays within Claude's 10% allowance; changed draft pieces:

| Piece | Before | After |
| --- | --- | --- |
| 1 | 470 m | 460.3634 m |
| 3 | 380 m | 372.2087 m |
| 5 | 370 m | 362.4137 m |
| 7 | 340 m | 333.0288 m |
| 9 | 630 m | 617.0828 m |
| 11 | 390 m | 382.0037 m |
| 13 | 310 m | 303.6439 m |
| 14 | 420 m | 411.3886 m |
| 16 | 190 m | 171 m |
| 18 | 560 m | 548.5181 m |
| 20 | 210 m | 189 m |
| 22 | 570 m | 558.3130 m |
| 24 | 170 m | 153 m |
| 26 | 370 m | 362.4137 m |
| 27 | 560 m | 548.5181 m |
| 29 | 610 m | 597.4929 m |
| 31 | 390 m | 382.0037 m |
| 33 | 170 m | 153 m |
| 35 | 590 m | 577.9030 m |
| 37 | 520 m | 509.3382 m |
| 45 | 140 m | 126 m |
| 49 | 160 m | 144 m |
| 17 | 54 degrees | 59.4 degrees |
| 19 | 172 degrees | 170 degrees |
| 21 | 47 degrees | 51.7 degrees |
| 25 | 50 degrees | 55 degrees |
| 34 | 53 degrees | 58.3 degrees |
| 46 | 38 degrees | 41.8 degrees |
| 50 | 52 degrees | 57.2 degrees |

## Actual checks and remaining work

Original separation failed at 148.7805 m; static 167.6946 m was not acceptance.
The unchanged >=165 m check now passes every native 2 m sample for pairs
>750 m apart. All 37 ground anchors agree (maximum difference 0.0000164 m).
Earlier actual High/LOD validation passed all 39 placements on 8367733b.
The first native run stopped at 10164.3991 m after 894.5583 s; its first roof
crash at 184.367 s led to the reviewed b7dd65eb height-aware contact fix.

Original b7 native runs finish with zero crashes: summer 276.7833 s,
pit 290.2583 s and winter 262.9417 s; real service lasts 4.000 s.
The original 360-480 s target failed; strategy gaps -13.4750/-27.3167 s
still fail the required 4-8/2-5 s. Retain the original evidence.
New measured sets wait for night: maximum six, original F42/.95/Medium/
1989/4242, in Claude's 80 -> 90 -> snow-start -> warm-grip/top-share order.

Six controlled bay/warm tests pass, including both player controllers and CPU.
Owned source checks pass manifest/catalogue, actual High/LOD aperture masks,
geometry/separation, roof contacts, winter controls and anchors.
The source check caught exposure 1.12 versus actual Harbour 1.02;
source corrected, original assertion retained. No native strategy or art pass.

Existing replay --record passed in 60.280 s and world --capture in 50.855 s.
Append only the real Summit replay/world leaves. All 24 old fixture files and
19 old scene rows remain exact; restore the temporary capture guard byte-exact.
Replay 29eb3db7...b9190 matches at 30/60/144 FPS; world 8d222297...d01e is
the new authored-course baseline, distinct from art acceptance.
The conditional shortcut generator and separate --verify-solvers pass:
250 checks, 18 selectable layouts, 15 comparisons. Only source fingerprint
72be2323 -> da246bb1 changes; all other generated bytes and version 2 stay exact.
Raw logs and byte proofs: integration .evidence/2026-10-12/P4-SUMMIT/
factory-source-881700c8. Fresh save review on 65224d3 passed nine fixtures and
286 assertions. The first 319-suite gate was canceled before a newly identified
night-only Blender invocation; exit -1, no final counts and no build. The accepted
classifier repair is adopted. The corrected gate on 32cdadc2 completed in
2170.3812 s: 318 passed, one failed, zero unrun. Only the stale Deep catalogue
assertion failed; its three other tests passed. No build ran on that failure.
The approved two-array correction on bab5ca92987369051596b7b1ff0b13dd80447406 passes the original nearby lane: 319/319, zero failures or unrun, jobs4, 1568.5126 s. Production build passes (1479.6255 ms wall; Vite766ms). Independent correction review is clear; the unchanged runtime retains its nine-fixture/286-assertion save review.

Scheduling mistake: a combined CIM/launch call ran one 2.5 s focused check
briefly as a third job after another parent appeared; it drained. Future launches
use a separate fresh CIM read. No passing check is repeated for this mistake.

Round one has 16 real views, 309,720 B, memory-only, zero warnings/errors.
Claude holds it for grove/snow/night/window/fork fixes; route readability remains
weak, with no fork acceptance. The consumed round-one verdict is folded into round-2-review.md before its old sheet is removed.
Round-two native photographs are complete; formal art/fork acceptance and new strategies remain pending.
No hidden-course frame timing; eventual reachable-course timing is deferred.

## Removed

Obsolete central registration/count edits, duplicated cyclic assertions and
incorrect nominal collider assumptions are removed. Repeated note history is
folded here. Two own unpublished sheet drafts went to Recycle Bin.
Keep current assets, original thresholds, round-one hold and needed evidence.

## Integration source handoff, 12 October evening

Merged after FIX-FOOT-MOUSE without conflicts; no repeated gate. P4-SUMMIT-RUNTIME records only this completed development source milestone. The parent card stays open for the six-set native strategy cap and round-two art, with the original failed timing and round-one hold retained. Runtime locks are released; any later code correction must reacquire its affected locks. No release or push. The older retained Summit lane is not a folder created in this run and is preserved.

## Round-two art design before capture

Art-only resumption from accepted integration da75bdc16015e9f59dcb24d55ea3e797128de53d. Keep the original 16 native grid/location photos and their camera parameters. The already authored High fork approach (actual branch start +15 m, camera up40/ahead220) joins the common view list so Performance captures that same real fork too: 18 photos, one formal round-two sheet, maximum500KB. Use the existing memory-only native photo harness and read-only snapshot guard; no frame timing, drive measurements, runtime, model, fixture or simulation changes. Claude's round-one grove/snow/night/window/fork hold and original failed strategy gaps remain facts, not acceptance. Their verdict folds into the round-two review before removing the consumed round-one sheet; preserve this older lane.

The first actual round-two draft on 8c1f7daf passed the native photo guards: 18 photos,365535B,private port21111,zero warnings/errors,memory-only,no frames. Visual inspection showed the added fork photos mostly framed the Gallery roof; this is not a clear fork verdict. Before one bounded recipe correction, keep all original16 exact and move only the added fork snapshots to branch start+40 m,up90,ahead150. Existing snapshot semantics place the eye18m behind that position,still before the real roof, and aim150m ahead at the separated routes. Retry the same formal round two in a fresh owned evidence leaf; no gameplay/runtime change or extra art round.

The aa8203c2 retry also passed photo guards (18 views,364473B,port32392,zero warnings/errors) but its fork rows still read as roof. Existing pure pose APIs on the actual fixed-route1989 Course show eyeS10097/up40 and eyeS10122/up90 both have tunnelAt null; the suspected tunnel clamp is ruled out. Existing fork signs are at10055,behind both eyes. Director approved one final bounded camera correction before code: branch start-80=10020,up18,ahead240,eye10002 before the signs/split,aim10260. Record the actual native eye position/nearest s/ground clearance/tunnel in the existing packet for only these added photographs. Preserve all original16 and runtime. If route clarity remains weak, report it and stop this camera problem; no further iteration or presentation edit.

## Actual round-two art packet

Final recipe 62442820 passes the existing native photo harness on private port 24735: 18 real views, 365,471 bytes, 1945 by 1540 pixels, quality .85, memory-only, zero issues/warnings/errors, no frames or --drive. All 16 original views/cameras remain; the two added real approach views include both GALLERY/OPEN ROAD signs. Native camera evidence in both qualities is eyeS 10002/lateral 0, 18 m above actual ground, tunnelAt null. Open Road contrast remains weak at sheet scale; no formal art/fork pass is claimed. Round-two sheet/review are docs/board/looks/p4-summit/round-2.jpg and round-2-review.md. Consumed round-one hold and packet facts are folded into that review before its old sheet was removed. Original failed strategy gaps remain exact; new six-set measurements wait for full check. Existing photo capture and all owned processes drained. Nearby lane/build and independent code review pending; Claude formal judgment pending.


## Final round-three visual pass

Claude's 13 October 08:40 answer accepts the desert, pines and tree line unchanged. The final pass changes only authored visual controls: brighter pale concrete Gallery wash and warm inside lamps, stronger existing hut/windows and real observatory aperture mask, lower separated heaps, fifty-metre grounded orange-tip snow poles, stronger existing wind-blown terrain variation, dark snow-rock stone and darker packed Open Road. Main-road overlays, existing packed wheel tracks, accepted model bytes, road/layout, all surfaces/physics/controllers and simulation seeds stay exact.

The existing night-glow owner accepts forty-eight authored ground rows for the distant valley town, all placed from actual course points and renderedGroundHeight(requireSurface:true), no guessed-height fallback or extra light owner. The existing snapshot recipe retains every original eighteen view/camera and adds one actual High night-Ledge view aimed toward the lower valley. It records actual town ground points/elevations and preserves race/profile/memory storage guards. New existing Summit assertions exercise real pole construction/both-edge spacing/grounding, no feature/RNG mutation, branch clone/default-material preservation and actual grounded lower-town lights. Terrain variation is a purely optional authored shader path; other courses and absent-option cache keys retain exact behavior.

No actual capture, original nearby/build or final art acceptance is claimed yet. Final round3 of3 remains for Claude. Preserve the independent Avalanche Gallery end/last-two-tiles correction when it lands; source layout is not retuned for art or route timing. Existing town-light view limitations are recorded honestly if real terrain occludes them. No frame checks, new asset/framework or fourth art round.

Removed: Summit's continuous raised gutter presentation becomes lower heaps with gaps; the rejected black shed wash and weak window intensities are replaced only in Summit's authored values. Old sheets/evidence belong to earlier owners and remain for Root's authorized cleanup. Runtime/dev and strategy acceptance remain separate.


Actual final nineteen-view photography completed on union9dfca23a: private34439, memory-only/read-only guards passed, zero warnings/errors/issues;382212B/1945x1540/.85 sheet SHA2568e01fb79985724e204533254d5dff66c9ec3ea1f74a51af02d65b52303bba806. Original eighteen views remain; one High Ledge view is added. Gallery rejoin10800/35tiles is preserved from36287609. Terrain variation/poles/lower heaps/pale shed entrance are pictured; long shed roof and small observatory slit remain difficult to read. Town points are grounded at151.461108–183.244543m below the601.94m eye, but real terrain occludes them in this view. Record that failure honestly rather than move lights into the sky or compose a fake town. Final Claude art acceptance remains pending, and no fourth round or frame check is proposed. Original nearby/build and ordinary source review remain pending on final freeze; world signatures are not regenerated without reviewed visual difference.


Root reviewed the actual nineteen-view visual difference and the bounded source controls; no source fault found, no art acceptance. It granted one final correction only to the new night-Ledge camera: up18 to90m, preserving all original eighteen views, every town row, terrain, lighting and model. The existing recipe retains only the composite, so one bounded nineteen-view recapture was permitted before the formal final request. If real terrain still occludes the town, retain that failure and stop; no more art fitting or fourth round.

Final bounded camera result: actual private53878/nineteen views,383190B/1945x1540/.85 SHA2562b849bae85b072e1da769760a3fd9379f810ca56874e23646ef6d1c063c43b06; zero warnings/errors/issues, read-only memory guards/no frames. Only the added Ledge up changed18 to90; final eye[2917.5009784204753, 673.94, 5774.531419448733]. Real town ground151.461108 to183.244543m remains occluded; stop fitting/capture with that honest failure. The long shed/slit limitations remain. No formal art acceptance, fake sky/height, extra fitting or fourth round.

A local note write rejected a Unicode arrow in the default Windows encoding. Restore this owned note's exact committed bytes and append the actual final facts in explicit UTF-8; no source/test/artifact change or prior note loss.


Root reviewed the actual visible difference before the exact existing capture. Unchanged test-world-composition --capture, with existing QA circuit flags, completed22 coverage/immutable-feature checks across21 scenes. All20 other scene signature/resource rows match their accepted fixtures exactly; no missing rows. Update only summit-run.json: old8d22229769719d5f73c1c7219767438619464520c434222ae350d82786b0d01e (667nodes/642meshes/21209instances/112geometries/61materials/19textures) becomesedf3abccb266a9e0f09cfdbff7e1cce859ed7bc837e2b6920602de8a1fa4f6f9 (667/642/21123/113/62/19). This records the reviewed authored Summit glows and retained rejoin geometry; it is not formal art acceptance. No capture tool, guard, assertion, other fixture or tolerance changes. Final original nearby/build remain required after source freeze. Normalize only this owned note's lone Windows punctuation byte to valid UTF-8, preserving its words.


The first original nearby on456839cd completed100/101, failed only test-circuit-summit, zero unrun, exit1,426425.2687ms. Its old Summit branch assertion still expected generic winter RGB[.34,.38,.42], whereas Claude explicitly requested a darker Open Road and reviewed authored0x293135 produces the actual linear RGB[.02217388478862708,.030713443727452196,.035601314869097636]. Root granted only that assertion's expected colour to new THREE.Color(SUMMIT_RUN.snowWorld.branchTone).toArray(). The additive absent-tone legacy assertion keeps exact[.34,.38,.42]; clone immutability and roughness checks stay unchanged. This is an explained authored visual-contract correction, not a threshold/tolerance relaxation. No source/photo/signature changes or build/pass claim for the failed freeze. Corrected original nearby/build and same ordinary confirmation remain required.
