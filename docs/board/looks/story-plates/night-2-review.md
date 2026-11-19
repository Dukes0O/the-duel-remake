# Night 2 · Strangers at the gate

**Part 1, 18–19 November 2026.** The top row pairs the native Blender frame with the selected painting. The lower left overlays the two pictures and the boundaries of every visible game object group. The lower right is reserved for Claude's capture from the running game. [Comparison sheet](night-2.jpg)

## Staging

The viewpoint stands 9.4 m inside the south gate at world `(5974.65, 1.62, 52.60)`. The camera has a 48° vertical field of view and looks 8.4° up toward the opening. A wider 72° trial made Rell only 106 pixels tall. She occupies 151 pixels above the road here and the cast spans 536 pixels at native width. Both framing posts and the three hanging lamps remain in view. The gate, fences, weathered drums, shacks, ground and eleven posed figures use game geometry. The two rear carts overlap the front carts as they do in the staged formation.

Rell stands in her split rust coat at the front. Dace stands beside the near right cart, looking into town. Six-year-old Wim sits in her mustard jacket at the front of the left cart. The cart bed is 0.509 m high. The capture recipe suppresses the sitting action's default camp stool. **Part 2 and STORY-NIGHT-2 must keep the cart as Wim's support and suppress the ground stool on every rendered frame of this tableau.** This handoff supplies the review staging and camera.

The stage exports the game's detailed and coarse ground and road meshes. The East Road runs under the travellers with worn ruts 5.6 m either side of centre. Both cameras clip at 0.15 m and 2,400 m. An independent projection of the exported ground matched the runtime mesh across 1,001 central image columns to 0.1 pixel. Earlier drafts included terrain beyond the player's far plane. The offline stage uses the shipped hardpan and gravel photographs. The ordinary laptop preset shades the same road ruts procedurally with `scablands-realism` off.

## Registration

**Outlines moved more than 2% of picture width (38.4 pixels): none found.** At 1920 × 1080, the eleven people, four handcarts and three lamp shades, cords and bulbs can be reconciled one for one. Both post frames, their openings, the twelve visible beam openings, fence ends, shack edges and the ground/sky boundary stay in register. The steel grain, worn cloth, gravel, dusk haze and warm lamp falloff change across those outlines.

The sheet overlays 32% Blender on the painting. Cyan traces IDs from the same Cycles pass as the base image. Ochre marks 126 corresponding points on the painting. Each person, cart and gate assembly was first matched across a ±46 px search. Local edge matching and native-pixel inspection located individual seams, crowns and contact points. The largest marked displacement was 8.5 px at the right post's front foot. The maxima were 1.4 px for people, 1.0 px for carts and 6.1 px for lamps. In a separate trace through 967 visible sky/terrain columns, the painted ridge lay from 3 px above to 5 px below the Blender ridge. An independent reviewer traced the paint against the actual game's terrain and found a median of 1.1 px and a maximum of 8.9 px over 901 unobstructed columns. The faint road ruts converge toward the people in both views. Their worn edges become broad under the foreground dust. [Native point pairs](../../../../tools/art/story-plates/night-2-registration.csv)

## Claude's verdict (18 November 2026)

The lower right panel is the running game at the plate's camera, at Light the Town's dusk, with the photographed ground on (`scablands-realism`). Without it the ground is plain brown and the lamp pool is missing.

- **One place: yes.** Every post, lamp, cart and person in the painting sits where the game puts it.
- **Does the game look poor beside it: yes.** The painting's lamps throw warm light on the posts, the drums and the people. The game's lamps light only a patch of ground, so the posts and people stay flat and dark. The game's sky is a warm mauve where the painting is a cold blue dusk. The game's people stand stiffly in a row, like figurines.

By the card's rule the trial stops at this one plate. Nothing goes where the game loads it, and Part 2 is not built. The painting stays as the look the game's own gate scene should reach: lamp light on the posts and people, a blue dusk for Night 2, people standing and sitting as people do (Wim on the cart).
## Claude's laptop comparison

From the repository root, run these commands with Blender 4.5 with OpenImageDenoise, Node, and Python with NumPy and Pillow. The harness uses an isolated QA tab. It takes the game's own composer output at the staged eye, aim and lens and writes `laptop.png` at 1920 × 1080.

The full browser suite can also run `story-plate-reference` in an empty output directory. It reads the approved camera, eleven placements and four cart axles from the branch. When a freshly staged manifest is present, the scenario verifies those same values before drawing. [Approved pose](../../../../tools/art/story-plates/night-2-pose.json)

```sh
node tools/art/story-plates/night-2-stage.mjs .evidence/night-2-look
blender -b -t 4 --python-exit-code 1 --python tools/art/story-plates/night-2-render.py -- .evidence/night-2-look
node tools/browser-harness.mjs scenario story-plate-reference --headed --output-dir .evidence/night-2-look
python tools/art/story-plates/night-2-sheet.py .evidence/night-2-look tools/art/story-plates/night-2-painting.jpg tools/art/story-plates/night-2-registration.csv docs/board/looks/story-plates/night-2.jpg --laptop .evidence/night-2-look/laptop.png
```

Claude records whether the painting and game read as one place and whether the game looks poor beside it. A poor match ends the experiment at this plate. A written yes on this card unlocks Part 2. [Plate brief and gate](../../cards/STORY-PLATE-NIGHT-2.md)
