# WILD-ART-DESERT

The short board entry controls current state, ownership, dependencies and locks.

Part of the animals line (`docs/board/cards/WILD-ART-SRC.md` has the full history and rules). Real species, natural and gritty, never cartoon. Reuse the recipes, donors and sheet tools in `tools/blender/wildlife/`: most animals are adapted from the licensed Quaternius and Poly donors already there, and `art-library/` holds their licences. Do not download anything that needs an account. Each animal: metres, feet on the ground, natural colours and markings, an Idle and a Walk or Run clip (birds a flight loop), at most 5,000 triangles (birds 2,000), texture at most 1K. Runtime models go in `public/assets/wildlife/`, with credits in the credits file there. One sheet per round, JPG at most 500 KB, under `docs/board/looks/<card in lower case>/round-N.jpg` with `round-N-review.md` beside it. At most six rounds. Look at your own sheet and fix it before you submit: one submitted sheet is one round. An animal that cannot pass is left out and named in the change note, as the wildcat was. Not placed on any course here. `tools/test-blender-output.mjs` entry, `docs/changes/<card>.md` with a Removed section. No Chrome. No frame timing.

## Animals
Roadrunner, jackrabbit, desert bighorn, collared lizard, pelican, California condor. (The coyote is done.) For Pacific Canyon and Red Mesa, and the Scablands.

## Claude answers

**19 November 2026, changed assertions in `tools/test-wildlife-view.mjs` (rule 18).** The six ids
are already on Red Mesa's and Pacific Canyon's lists in `src/wildlife.js`, so a model row alone
would put them on those courses, which this card forbids. `src/wildlife-models.js` therefore
gains `HELD_FROM_COURSES` (the same list WILD-ART-CITY adds for its ids; whichever merges second
joins the two), and `APPROVED_MODEL_IDS` leaves the held ids out. Three assertions that walked
`APPROVED_MODEL_IDS` (the table matches the files on disk, the table is frozen, every row has
its file, species and clips) now walk every key of `WILDLIFE_MODELS`. Nothing is loosened: they
check more rows than before, and new assertions hold that every held id has a model, that the
approved ids are exactly the rest, that Red Mesa stays empty and Pacific Canyon keeps only its
coyotes while the six are held, and that Red Mesa has its four and the condor once they are let go.
