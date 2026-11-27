# HOME-GROUND-LOOK-1: two Tin Town Brown hens, a crate nest box, a tin coop and a brown egg (art, round 4)

**Changed.** New look module `src/world/open/looks/home-hens-look.js`, drawn in code, used by no game file yet: named parts
`home-hen` (the wildlife chicken widened, deepened and repainted as a brown laying hen; poses peck, scratch, walk, sit,
stand; a leg band whose colour can change), `home-nest-box`, `home-coop` (level 1, tin), `home-egg`. The look stand
`tools/open-look-stand.js` gains a `home-hens` row behind the switch `home-ground`, inside a fence drawn by step 1's code.
Scenario `look-home-hens` (registered in `tools/run-browser-scenarios.mjs`), suite `tools/test-home-hens-look.mjs`, sheet
script `tools/art/home-hens-sheet.py` with credited photographs in `tools/art/home-hens-references.json`. The placement check
allows `docs/board/looks/home-ground/hens-round-N.jpg`. No rule, save or runtime dependency changed.

**Checks** on a working tree over af42cc8d0: rule 23 set plus the stand's readers (`core`, `test-replays`,
`test-combat-replays`, `test-world-composition`, `test-home-hens-look`, `test-browser-scenarios`, `test-dace-look`,
`test-rats-nest-look`, `test-radio-hill-look`, `test-site-ground`): 10 passed. `npm run build` passed. `look-home-hens`
passed in rounds 2 to 4 (at most 18 draws, 15,942 triangles; budget 24 and 30,000). Board and hygiene checks passed.
No changed assertions; replay fingerprints unchanged. No frame check (rule 9).

**Removed:** nothing; step 2 of Home Ground places these parts and gives the hens their laying.
