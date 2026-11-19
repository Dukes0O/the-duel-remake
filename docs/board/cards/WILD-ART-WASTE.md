# WILD-ART-WASTE

The short board entry controls current state, ownership, dependencies and locks.

Part of the animals line (`docs/board/cards/WILD-ART-SRC.md` has the full history and rules). Real species, natural and gritty, never cartoon. Reuse the recipes, donors and sheet tools in `tools/blender/wildlife/`: most animals are adapted from the licensed Quaternius and Poly donors already there, and `art-library/` holds their licences. Do not download anything that needs an account. Each animal: metres, feet on the ground, natural colours and markings, an Idle and a Walk or Run clip (birds a flight loop), at most 5,000 triangles (birds 2,000), texture at most 1K. Runtime models go in `public/assets/wildlife/`, with credits in the credits file there. One sheet per round, JPG at most 500 KB, under `docs/board/looks/<card in lower case>/round-N.jpg` with `round-N-review.md` beside it. At most six rounds. Look at your own sheet and fix it before you submit: one submitted sheet is one round. An animal that cannot pass is left out and named in the change note, as the wildcat was. Not placed on any course here. `tools/test-blender-output.mjs` entry, `docs/changes/<card>.md` with a Removed section. No Chrome. No frame timing.

## Animals
Goat, chicken, scruffy camp dog, turkey vulture, big desert monitor lizard, scorpion (large enough to see at 10 m). The goat, chicken and dog live in the player's town and must look like working animals on a poor farm: thin, dusty, not pets. The dog can come from the wolf donor, the goat from the deer donor.

## Claude answers

**19 November 2026, round 1 (Claude, builder and judge).** Sheet `docs/board/looks/wild-art-waste/round-1.jpg`,
review beside it. Scorpion PASS. Goat, chicken, camp dog, turkey vulture and desert monitor not yet: the dark
coats lay under a grey veil of shine, the chicken's neck was a bowling pin, the dog's paws were clubs, the
vulture's bill was an ibis's and its wing showed no silver from below, the monitor's pattern was soft stripes on
pillar legs. Species settled here: the dog is a village (pariah) dog, the monitor is the desert monitor
*Varanus griseus* at 1.4 m, the scorpion is the giant desert hairy scorpion *Hadrurus arizonensis* built at four
times life size (0.55 m) so that it can be seen from a car at 10 m. Each is judged beside a public-domain or CC0
photograph of the real animal (`tools/blender/wildlife/waste-references.json`).

**19 November 2026, round 2, final (Claude).** Sheet `round-2.jpg`, review beside it. Goat PASS, chicken PASS,
camp dog PASS, turkey vulture PASS, desert monitor PASS. All six are in `public/assets/wildlife/` with a row each
in `src/wildlife-models.js` and `src/wildlife.js` (species only; on no course). They pass at the distances a
player sees them, 10 to 30 m from a car and 60 m up over the town; none is a close-up model. Weak points, for a
later card if they are ever seen close: the dog's even coat, the monitor's pale soft pattern, the vulture's plain
wing from the side. From the town's camera at 60 m up a goat is about 10 pixels long and a hen 3.
