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
and adds one real High fork approach outside the roof; capture waits for night.

## Changed assertions and source union

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
factory-source-881700c8. Final nearby lane, build and save fixtures await receipts.

Scheduling mistake: a combined CIM/launch call ran one 2.5 s focused check
briefly as a third job after another parent appeared; it drained. Future launches
use a separate fresh CIM read. No passing check is repeated for this mistake.

Round one has 16 real views, 309,720 B, memory-only, zero warnings/errors.
Claude holds it for grove/snow/night/window/fork fixes; route readability remains
weak, with no fork acceptance. Sheet and review stay in docs/board/looks/p4-summit.
Round-two native capture/acceptance and new strategies remain unrun.
No hidden-course frame timing; eventual reachable-course timing is deferred.

## Removed

Obsolete central registration/count edits, duplicated cyclic assertions and
incorrect nominal collider assumptions are removed. Repeated note history is
folded here. Two own unpublished sheet drafts went to Recycle Bin.
Keep current assets, original thresholds, round-one hold and needed evidence.
