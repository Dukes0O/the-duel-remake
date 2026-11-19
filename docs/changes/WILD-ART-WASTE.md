# WILD-ART-WASTE

**Changed.** Six animals in `public/assets/wildlife/`, each judged beside a photograph of the real animal:
`goat.glb` (CC0 Quaternius deer), `camp-dog.glb` (CC0 Quaternius wolf), and original recipes `chicken.glb`,
`turkey-vulture.glb`, `desert-monitor.glb` (Varanus griseus, 1.4 m), `scorpion.glb` (Hadrurus arizonensis at four
times life size, to be seen from a car at 10 m). Clips Idle and Walk (vulture: Idle and Fly); goat and dog keep
every donor clip. One row each in `src/wildlife-models.js` and `src/wildlife.js` (species only, on no course),
because `test-wildlife-view` holds the table equal to the files. In `tools/blender/wildlife/`: the six recipes,
`waste_sheet.py`, `waste_references.py`; `bird.py` gains `dihedral`, `teeter`, `refine`; `original.py` gains
`sprawl_step`; `adapt.py` a `MATTE` set (black bear unchanged). `CREDITS.md` beside the models. Lessons in
`docs/ART_LINE.md`, "Animals".

**Verdict (Claude).** All six PASS at the player's distances: scorpion in round 1, five in round 2. None left
out. Sheets and reviews: `docs/board/looks/wild-art-waste/round-1.jpg`, `round-2.jpg`.

**Checks, on `61ee0785d`** (integration/wasteland merged in; only this note changed after). Lane tier
(`--tier lane --changed --jobs 4`): 63 suites passed, 0 failed, 1,122 s. `npm run build` passed. Alone:
`test-blender-output` 413 checks, `test-repo-hygiene`, `test-wildlife-view` 3,871, `test-board` 694. No assertion
changed (`test-blender-output` gains six rows). No race fingerprint moves and no sound cue: nothing is placed.

**Not done.** Nothing here loads the animals in the game: TOWN-VIEW-LIFE draws the town three, a later card
places the rest. **Removed.** Nothing replaced; candidates and renders under `.qa-dist/` are deleted.
