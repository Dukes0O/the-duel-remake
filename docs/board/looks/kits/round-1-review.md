# Kit round 1: fitted asset trial

[Matched sheet](round-1.jpg) compares the top-panel war-rig reference, Blender render with the real Falcone GLB, and private memory-only High and Performance game captures. The browser captured intact, critical and wreck states in both qualities with zero warnings or errors. The first attempted game capture was blank because the harness stopped before combat effects made the canvas visible; the retained comparison waits for a visible canvas and the authored kit. The game shot still overlaps four cars and HUD, limiting visual judgment. Nine GLBs and the four-actor lifecycle tests pass structural checks, but those checks do not establish likeness.

| Axis | Score |
| --- | ---: |
| Reference likeness | 2/5 |
| Readability at speed | 2/5 |
| Grounding | 1/5 |
| Scene consistency | 2/5 |
| Frame cost | Unscored pending quiet measurement |

Independent review finds five gaps: (1) roof rails float well above the car; (2) a solid roof slab hides cabin glass; (3) side blocks and front bars extend beyond the body; (4) metal reads as flat boxes, with weak thin sheet edges, bolts and open cage structure; (5) the four-car/HUD shot obscures the target kit. The existing combat bow and bumper bars are separate from this authored kit and must be distinguished in later review.

The source cause is a coordinate conversion error: the kit generator built game-local +Y-up positions directly in Blender's +Z-up workspace. The GLB exporter converts Blender axes, so roof and forward offsets landed on the wrong runtime axes. Round 2 first corrects that transform, then uses body-hugging thin plates and an open cage with visible glass, and captures an isolated car for visual review. It will not promote the kit or claim frame cost from this round.
