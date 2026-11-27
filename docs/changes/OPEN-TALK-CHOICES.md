# OPEN-TALK-CHOICES

- Shared storyline talks offer eligible decisions beside the opening questions. Answers stay recorded, and choosing closes the talk and applies the existing outcome. Authored dialogue is preserved and `story-choices` stays off for players.
- **Changed assertions** `test-open-somebody-elses-flag` now selects from the talk screen. It checks choosing immediately at the site, then answering one question and signing in the same schedule talk. `test-burned-camp` adds coverage for the Grey Pen and home.
- **Changed scenario** `open-somebody-elses-flag` chooses before asking at the site and asks one question before signing the schedule. Its page expressions parse. Other scenarios retain their authored prerequisites, including asking Sprat about the wind to unlock his lead.
- **Removed** The requirement to finish the question menu before making an otherwise available decision.
- Node `22.23.5`, memory-only on `b5b15db3be64`. Rule 23 plus `test-open-*` and `test-burned-camp*` passed 25 of 26, including the new Burned Pen suite. Core passed 804 checks, race replays 306, combat replays 12, and world composition 65. All pins were preserved.
- `test-open-doors` still reports `null` for `bess-shed` at line 219. The same failure reproduces with Node 22 on clean integration `7aec938d8` and is tracked by `QA-OPEN-DOORS-WASH`.
- `npm run build` passed on `b5b15db3be64`. The merge preserves the Burned Pen's authored talk path, and the later integration update `ee70a4307` only changes board documents. Board and repository placement checks passed.
- **For Claude to run** The memory-only storyline browser scenarios, Windows line-stamp fixtures and merged build listed in the PR. Independent code and written assertion review and the Rule 23 batch drive are owed.
