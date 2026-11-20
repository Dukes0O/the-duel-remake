# WILD-ART-CITY

The short board entry controls current state, ownership, dependencies and locks.

Part of the animals line (`docs/board/cards/WILD-ART-SRC.md` has the full history and rules). Real species, natural and gritty, never cartoon. Reuse the recipes, donors and sheet tools in `tools/blender/wildlife/`: most animals are adapted from the licensed Quaternius and Poly donors already there, and `art-library/` holds their licences. Do not download anything that needs an account. Each animal: metres, feet on the ground, natural colours and markings, an Idle and a Walk or Run clip (birds a flight loop), at most 5,000 triangles (birds 2,000), texture at most 1K. Runtime models go in `public/assets/wildlife/`, with credits in the credits file there. One sheet per round, JPG at most 500 KB, under `docs/board/looks/<card in lower case>/round-N.jpg` with `round-N-review.md` beside it. At most six rounds. Look at your own sheet and fix it before you submit: one submitted sheet is one round. An animal that cannot pass is left out and named in the change note, as the wildcat was. Not placed on any course here. `tools/test-blender-output.mjs` entry, `docs/changes/<card>.md` with a Removed section. No Chrome. No frame timing.

## Animals
Black kite, little egret, black-faced spoonbill, pigeon, raccoon, street cat, owl. For Harbour Lights and the city courses. The town uses the pigeon and the cat too.

## Claude answers

**19 November 2026, Claude (builder and judge on this card, Kyle's "Yes, start them").** All seven pass round 1; the sheet, the verdict on each animal and its weak points are in `docs/board/looks/wild-art-city/round-1-review.md`.

Two things for the merge. First, `src/wildlife.js` already has these animals on Harbour Lights and the city courses, so the models are held off every course by `HELD_FROM_COURSES` in `src/wildlife-models.js`; a placement card lets each go after its course has been looked at and timed. Second, rule 18: `tools/test-wildlife-view.mjs` changes its assertions. The check that the table and the files on disk agree, and the checks of each model's file and clips, now run over every row of `WILDLIFE_MODELS`, because a held row is no longer in `APPROVED_MODEL_IDS`; new assertions pin the held list, that a course may use exactly the rows not held, and that the five city courses have no animals while the seven are held. Every earlier assertion still runs on at least the rows it ran on before. Nothing is loosened.
