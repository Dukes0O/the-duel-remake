# WILD-ART-WASTE

**Changed.** Six animals for the Wasteland and the player's town, each judged beside a photograph of the real
animal: `goat.glb` (from the CC0 Quaternius deer), `camp-dog.glb` (from the CC0 Quaternius wolf), and original
recipes `chicken.glb`, `turkey-vulture.glb`, `desert-monitor.glb` (Varanus griseus, 1.4 m) and `scorpion.glb`
(Hadrurus arizonensis at four times life size, to be seen from a car at 10 m), all in `public/assets/wildlife/`
with `CREDITS.md`. Clips: Idle and Walk; the vulture Idle and Fly; goat and dog keep every donor clip. One row
each in `src/wildlife-models.js` and `src/wildlife.js` (species only, on no course), because
`test-wildlife-view` holds the table equal to the files. Recipes, `waste_sheet.py` (photograph beside model,
and 1:1 crops at the player's distances) and `waste_references.py` are in `tools/blender/wildlife/`;
`bird.py` gains `dihedral`, `teeter` and `refine`, `original.py` gains `sprawl_step`, `adapt.py` a `MATTE` set
(the black bear's output is unchanged). Lessons are in `docs/ART_LINE.md`, "Animals".

**Verdict (Claude).** All six PASS at the player's distances: scorpion in round 1, the other five in round 2.
Sheets and reviews: `docs/board/looks/wild-art-waste/round-1.jpg`, `round-2.jpg`. None left out.

**Checks, on the commit that holds this note.** `test-blender-output` 413 checks; `test-repo-hygiene` passed;
`test-wildlife-view` 3,871; `test-wildlife` 33,644; `test-heli-survey` 9,990; `test-heli-story` 157;
`test-heli-skin-gear` 277; `test-heli-skin-session` 200; `test-board` 694. Lane tier and build: see the last line.
No assertion changed: `test-blender-output` gains six rows (the chicken, a bird that walks, keeps 2,000 triangles).
No race fingerprint moves: no animal is placed on a course. No sound cue: no game event is added.

**Not done.** Not loaded in the game by this card (TOWN-VIEW-LIFE draws the town three; course placement is a
later card). Reference photographs are Wikimedia Commons public domain or CC0 and stay in the art library.

**Removed.** Nothing was replaced. Candidates and renders under `.qa-dist/` are deleted.

**Lane tier and build.** LANE_LINE
