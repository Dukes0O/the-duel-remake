# ARENA-PIT: actual layout checkpoint

The private native Pit is built; the card remains incomplete. The Director's
independent tests preceded Source and retain their reach and containment limits.
Future boss cards own Pit selection. No public picker or boss wiring is added.

## Settled design and implementation

The centreline is an exact radius-40 circle. The settled Pit half-width of 32 m
gives an 8–72 m driving band (the released ring half-width is 18 m), with the
outer hulk wall at radius 75. The only fixed
interior obstacle is the solid radius-8 centre pile. Eight native movable junk
cars, two opposite ramps and eight safe opposed starts use existing arena rules.
Pit-only frame/inverse projection handles its short final sample exactly.
Ring, Salt and ordinary Course branches retain their existing behavior.

The actual world draws its floor and ramps from the native Course. Instanced
released salvage parts form the circular wall, central pile and scrap outside
the floor. Existing oval stands, roofs, lights and crowd are translated to the
same centre; their frame does not become the circular collision boundary.
Presentation reads native junk state and disposes its owned resources.
Independent review found gaps between lower hulks at the original 64 stations.
The Director added a genuine failing native-wall-span ray test first. The lower
tier now uses 128 overlapping instances of the same kit; upper tiers remain 64.
No assets, dependencies, simulation limits or pilot/brain overrides were added.
Existing arena wall, contact, crushing and respawn sound cues are reused.

## Bounded evidence

Geometry/admission/wall/ring-control selection: 7/7 pass. Renderer real-world
entry, finite geometry, unchanged state/features/samples and disposal: 1/1 pass.
The added bumper-height rays at native wall span midpoints pass.
Native ordinary junk/Titan crushing and Easy rammer recovery: 2/2 pass.
New module/scenario syntax and diff whitespace checks pass.
Ring geometry hash, native trace and ordinary replay control remain unchanged;
no world or race signature was regenerated. Independent geometry review is clear,
including 10,000 seeded frame/inverse samples (Director evidence).

The Director repaired only the reachable-floor fixture's targetId from null to
'player': native thinking replaced every null-target cached goal immediately.
The new first-step identity assertion preserves the actual cached pilot goal.
No tell state, reach tolerance, time limit or physics assertion was relaxed.

The corrected Falcone native reach still fails the outer sample. Across all
3,600 steps its goal identity and player target persist. Inner/middle closest
distances are 0.025818/0.032940 m; outer is 4.722646 m (required below 3.5).
The failed goal is s=75.398224, lateral=27, world=(-20.704139,63.720787),
radius 67 m; closest is tick 360 at lateral=22.547853.
At tick 320 the one-second pilot probe predicts lateral 28.716 above its 28.5
wall-sense margin and substitutes an inward heading. Both cars remain live;
zero wrecks, wall/vehicle-contact/crushing events and no moved junk isolate it.
Native weapons fire three times and hit the player once; CPU armor stays 120.
ARS owns src/arena/arena-pilot.js; the Director has the exact owner request.
No alternate AI or reach workaround is included in Pit Source.

## Remaining checks

Full native matrix: 17/26 pass; all nine failures are the outer reach sample.
All nine inner/middle samples, all three brains × three difficulties, junk,
wall/respawn and released ring controls pass. Outer closest distances in metres:

| Car | Outer closest |
| --- | ---: |
| falcone_f42 / falcone_heritage | 4.722646 |
| stuttgart_959s | 4.751284 |
| aurora_gt | 4.732836 |
| dusthawk_rally | 4.734717 |
| banshee_muscle | 4.765455 |
| viper_proto | 4.700915 |
| titan_monster | 4.741996 |
| koenigsegg_jesko | 4.701343 |

All outer drives keep the exact cached goal/player target for 30 seconds with
zero wreck ticks. ARS pilot ownership remains the genuine acceptance blocker.
Production build passes. The actual memory-only private browser scenario passes
both qualities: eight full/racing captures, zero errors/warnings, state purity.
Measured ring/Pit P95 is 16.9/16.8 ms High and 16.8/16.8 ms Performance,
within 10%. High draw calls/triangles rise 546/556442 to 647/1861324;
Performance rises 341/355450 to 361/986832. The extra scenery cost is retained
explicitly; these RAF samples show observed frame pacing on this laptop.
Fresh round 1 comparison is 308498 bytes; Claude look and Kyle feel are pending.

Official generator refreshed only sourceFingerprint to
45c75c657202115575b8535e7483d2b08db855c96689ebe30ac21500068494d8.
All 15 entries remain byte-identical, SHA256
75814c8568c605503a62c9798198810ba78f9e8d84fe6ce9f471af3f9d46acc7.
No freshness assertion or preset was edited by hand. Changed-lane gate remains
held for the native pilot fix. This is not a merge or completion claim.

## Removed

Nothing is replaced by this added venue. Existing ring/Salt paths, assets,
licensed sources, test pins and public entry remain. Review evidence is temporary
under .evidence and is removed after its verdict is recorded.
