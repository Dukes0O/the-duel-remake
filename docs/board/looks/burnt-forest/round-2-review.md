# Burnt forest props, Claude's original models: rounds 1 and 2 (14 October 2026)

Sheet: removed 15 October (the looks folder's 20 MB limit); the props are
now seen in the game on `../fire-view/round-2.jpg`. Recipe: `tools/blender/burnt-forest.py`.
2,760 triangles for all seven props, PBR colours, 112 KB.

- Round 1: snags read well; trunks too smooth, grey patches like stickers,
  the stump looked sawn, shoots too uniform.
- Round 2: rougher char with a charcoal sheen, rarer ash-grey patches, a stump
  burnt to a ragged point, thinner and varied shoots.

Verdict (Claude): **pick for H2** (scatter props and fireweed for FIRE-BURNT-LOOK; the charred course trees and ground looks are part 2). Reads right at road and helicopter
distance. Nodes `snag_tall` (9.5 m), `snag_broken` (5 m, scorched break),
`snag_leaning` (7.5 m), `log_fallen` (5 m), `stump`, `shoots` (regrowth stage
2), `fireweed` (stage 3, magenta spikes about 1.3 m). Each origin at the
centre of its base on the ground, +Y up. Placing them and darkening the
course's own trees and ground is code for H2's burnt-course card.
