# SUMMIT-FINISH-AREA — round 2

Claude's verdict: close, five final fixes requested. See the card's
"Claude's verdict, round 2" for the decision and round 3 scope.

`round-2.jpg`: 354,886 bytes, 1945 × 1550. Rows: car 100 m before the line,
car 30 m before, at the line, actual summit helipad, wide. Columns: High dusk,
Performance dusk, High night, Performance night. All twenty pictures use the
native renderer, actual High/LOD kits and memory-only saves. No frame timing.

The camera for each car pose is 1.65 m above the road. The helipad camera
stands 20 m behind the pad centre and 2 m above its landing elevation. The
wide view is 40 m up. Dusk and night use declared ART-only copies of the
course light path; normal race lighting is unchanged. Each capture checks
that race state, profile and memory storage remain unchanged.

Rebuild: `node tools/browser-harness.mjs scenario summit-finish-area`.
Evidence: `.evidence/2026-10-26/SUMMIT-FINISH-AREA/round-2/`.
Private port 19038. Browser report passes: no errors or warnings.
Captured on `b5c04d78`; the post-release merge `8306db7e` changes helicopter
jobs and integration checks, with no further finish scene or kit change.

## Changes from rejected round 1

The enlarged hut and dome frame the line. Both have warm glazing; three
practical lights illuminate the gantry and fence. SUMMIT lettering is on the
timber gantry. Twelve crowd cards face approaching cars. The unsupported
parking box is replaced by a surface on a graded terrace; the terrain and
native far-ground queries share that grade.

## Pad decision

The actual ski/rescue pad remains at its established location, roughly 240 m
before the line. Its yard now has a packed path to the hut. This preserves
working ski/rescue rules but does not meet a literal beside-hut pad placement.
Claude's round 2 verdict explicitly keeps the operational pad here and asks
for clearer markings and a short marker-post path. The pad picture shows
the actual location; the placement question is closed.

Independent code review found no new defect. Art scores and acceptance are
Claude's. The scene signature remains unchanged until the look is accepted.
