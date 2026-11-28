# HOME-GROUND-5C
Added spinach, carrots, beets, garlic, three timed pairs, and one stored egg per meal with T (E still strafes).
Version 9 adds four seed/food counts and the once-only growers' gift; verified v8 backup, load and additive migration preserve all older fields.
Shared hook: `game.js` only forwards the existing 4/5/6 food inputs and T. Powers, fights and carrying stay behind the enabled home part.
Source ends at `5911e7dfe`; final additions are acceptance tests and handoff records. Home Ground: 782 assertions passed; hens: 1,256 passed.
Guards, on-foot/input and every suite naming career-backup: 38/39 initially; the sole pinned hens v8 expectation was updated to v9 and passed.
Lane started on `ed3af93b2` plus that hens fixture: 160/162 passed. Two HUD failures were fixed without changing their assertions.
The 42 checks for changes since that run passed 41; its in-repo temporary hygiene fixture needed Git's parent search capped. All 165 hygiene checks then passed.
Replay 306, combat replay 12 and world-composition 65 checks preserve their fingerprints. Combat balance --check, final build, board (605) and placement checks passed.
Easy ground raids: none 12/20; spinach 12/20; carrots 12/20; beets 12/20; garlic 12/20. Recipe and limitations are in HOME_GROUND section 16 and the question file.
One independent reviewer found repeated damage from one car contact and cancelled active pairs; both fixes were confirmed. The final HUD fixes were also confirmed.
Changed assertion: hens' enabled migration expects v9 rather than v8, retaining strict piece/mark/name preservation. Claude's written review and food-aware hand drive remain due.
Cues: home.power.spinach/sight/iron/stink/pair/protein. Night-only: test-convoy-tanker-art, test-everburn-easy, test-field-battle, test-first-person-polish, test-old-smoke.
Removed: two-food-only store validation and leaf limit; the input whitelist no longer drops food keys. No saved field was removed.
Sweep: audit candidates advisory; build and QA scratch recycled; STATUS refreshed with other lane inspections skipped. Cockpit sync is left to integration under the lane-only instruction.
