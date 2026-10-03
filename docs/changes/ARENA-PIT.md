# ARENA-PIT: actual layout checkpoint

The private native Pit is built and ready for its final merge gate. The Director's
independent tests preceded Source and retain their reach and containment limits.
The merged Twin Vultures now select it through central warlord data. No public
picker or Pit-only brain is added.

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

Claude settled reach samples at least 7 m from the centre pile and outer wall.
The test now uses lateral -22, 0 and 22, giving 10 m clearance from the pile
and 13 m from the wall. Pilot code, reach tolerance and physics stay unchanged.
Focused native tests pass 26/26, including all nine cars and every brain and
difficulty. Production build, private High/Performance browser checks and frame
pacing pass. Round 2 scores 4/5 on every look item in both qualities; Claude
approved the sheet. Kyle will first see the Pit in the Twin Vultures fight.

On the current integration base, the lane gate passed 344/344 and the build
passed before final boss routing. The new routing keeps other warlords on the
ring, names the Pit in the intro, and accepts the configured venue in settlement.
Pit and Warlord focused suites pass 77/77. The Vultures out-of-reach fixture
now places the player physically beyond the same 80 m trigger on the shorter
Pit; the original idle assertion and combat rules are unchanged. Final lane
gate and build follow this routing and note change.

## Gate fixture scope extension

The current lane gate exposes a pre-existing audio crash-peak fixture issue:
the lane's `.evidence` junction makes Node resolve its generated harness under
the integration evidence path, so the harness CLI guard skips it. Running its
entry point explicitly then exposes a Vite config import and an HTML input
outside the project root. This Pit lane owns a narrow repair to
`tools/test-audio-crash-peak.mjs`: keep generated harness/config/build files in
`.qa-dist`, keep capture evidence in integration `.evidence`, and preserve all
audio assertions and the real browser scenario. The focused real-browser audio
suite now passes 23/23 with its peak limits unchanged. The current-base lane
gate exposed one more documentation mismatch: the tracked Pit review notes use
`round-1.md` and `round-2.md`, while the repository check requires matching
`round-1-review.md` and `round-2-review.md` names. Their contents and JPGs are
unchanged; only the filenames are normalized. The current-base gate and build
passed after these fixture and note-path changes.

## Removed

The Twin Vultures' temporary ring assignment and the settlement rule that
accepted only ring warlord results are replaced by the configured Pit venue.
Other ring/Salt paths, assets, licensed sources, test pins and public entry
remain. Review evidence is temporary under .evidence and is removed after its
verdict is recorded.
