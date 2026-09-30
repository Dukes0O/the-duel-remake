# WAR-02a-FORMAT

status: ready-for-review

## What changed

Sal now has a playable one-on-one fight from her full-hold territory card in
the discovered yard. The intro names her Banshee Muscle and shows one text
taunt. BEGIN FIGHT starts the countdown. REMATCH keeps Sal; BACK TO THE YARD
clears the event.

The headless format follows docs/SCRAPDOME.md section 5: first to three
credited wrecks, 1.5 times normal arena armor for Sal, and one phase-two hook
after her first wreck. Four minutes always opens sudden death, even with a
2-0 lead. The next victim wreck decides, including an uncredited wall wreck.
If neither car is wrecked during the existing 30-second sudden-death period,
most damage wins; equal damage keeps stable participant order. These choices
were written before implementation. Seed and inputs decide simulation rules.

Sal uses the plain rammer brain until WAR-02a-SAL. Her team is warlord:sal;
future escorts with that team cannot target or strike their boss. Claude settled a separate warlords development switch after the Scrapdome release merged. Both Scrapdome and warlords are required; production has only Scrapdome, so every warlord launch and intro gate stays off. The released Last Car Rolling stays available. WAR-02a-REWARD owns atomic settlement and working Side
Saws. No ordinary arena pay is awarded here, and no Side Saws earned message
appears before that reward is built. Loss, rematch and yard return leave the
wallet and ordinary racing records unchanged.

Disabled-yard and main-menu Armory maps expose no inert FIGHT control.
Ordinary arena rules, racing saves, runtime assets and renderer code remain
unchanged. The game.js hook gates the foundation warlord entry. Ordinary initial state stays unchanged.

## Tests first and changed assertions

The independent acceptance suite was committed first at 2703873. Its initial
failure was the missing public headless warlord API. Three ordinary race
hashes were frozen before implementation in warlord-format-ordinary.json.
A later launch-control test failed first on the disabled-yard FIGHT button.

The Director approved the additional hooks and assertion changes in board
commits 3c527ad and 695dade. test-warlords now expects only Sal built because
this card supplies her playable format. Unbuilt-territory tests explicitly
inject an empty built list, so saved future defeats still cannot launch an
unbuilt fight. The saved Sal defeat test keeps DEFEATED, CLAIMED and REMATCH,
and rejects Side Saws EARNED until REWARD is built. The venue-label assertion
names the already playable Scrapdome without coming later. No access or
save-safety check was removed.

The exact 240-second assertion caught a fixed-step sum landing just below
240. The format now uses the existing deadline convention of a 1e-9 tolerance
and clamps to the exact deadline. The test assertion stayed unchanged.

## Checks and evidence

- FORMAT acceptance: 24/24 tests passed, including the post-release development gate and Armory regression. Covers both winners,
  intro freeze, phase two once, four-minute and damage deadlines, wall sudden
  death, team exclusions, gates, free loss, rematch and 30/60/144 FPS equality.
- FORMAT plus arena UI, territory UI, territory screen and warlord metadata:
  34/34 tests passed. Existing entry-hint checks: 15/15 passed after the HUD hook.
- npm run build: passed, 241 modules. Existing large-chunk advisory only.
- node --check on the new event and browser recipe; git diff --check: passed.
- Private memory-only browser warlord-format: passed on port 60633 in High
  and Performance, 1280x720, six captures, zero warnings and zero errors.
  Real buttons cover menu visit, territory FIGHT, frozen intro, countdown,
  fight, loss, same-boss rematch and yard return. Only discovery/hold and
  three controlled player wrecks are fixtures. Bank and racing records match
  before and after. Reviewed captures show readable intro, fight HUD and
  result actions in both qualities, with no new layout overlap.
- The first browser attempt failed on Three.js compileAsync isReady during
  transitions despite completing both journeys. The recipe had waited for
  asset load alone. It now lets two real animation frames observe each
  transition, then waits for App.visualReady, settled warmup, ready assets
  and hidden loading UI before continuing. No production renderer edit,
  disabled warmup or suppressed error was used. Both reports are retained.
- The final mandatory lane tier and build are pending the Director's gate queue after the gate and fingerprint fixes. This note does not grant merge approval.

Independent reviewer: no findings on frozen 1a268b6. Separate headless probes confirmed wall sudden-death wins, respawn armor, one phase event and exact deadline results. Save Guardian: clean on the same source, including seven profiles, 247 preservation checks, stale-player rejection, repeated callbacks, reload and the 4 MB budget. No storage shape or key changed; no unfinished reward is paid. Both reviewers inspected the changed assertions and browser verdict.

Raw browser evidence is under the integration folder's
.evidence/2026-09-30/WAR-02a-FORMAT/: ready-flow contains the passing report
and six captures; initial-failure-report.json preserves the failed verdict.
The recipe is committed; raw evidence is ignored and deleted after review.

## Ordinary fingerprints

All three frozen hashes are unchanged:

| Race | SHA-256 |
| --- | --- |
| duel / Pacific / 1989 | 04548ba7a765a0880d7d93ca73488d4aed40445c1abd75d24ce2c6d6847cf443 |
| time trial / Red Mesa / 42 | b080b14b5862cea7f8528c04f1a846b7d4712257521de52e1b36a56150db7889 |
| objective / Timberline / 17 | 108d30f0ed9f84e9e959f03559568007cd0a46fba7edff6e222efd4ee8fcf254 |

No race or world signature was regenerated.

## Event sound cues

The format reuses interface.countdown, the existing go cue, arena.wreck-credit
and arena.respawn. The phase-two event is a simulation hook; WAR-02a-SAL owns
its move tells and sound. The taunt is text; no new recorded cue is claimed.

## Removed

The empty built-fight list and Sal's unbuilt-fight message are replaced by
her playable format. Stale Scrapdome coming-later copy is removed. Signature
moves and atomic rewards remain owned by WAR-02a-SAL and WAR-02a-REWARD.
No runtime asset or binary is replaced by this card.

## Gate findings fixed forward

The first mandatory lane tier on a9094d1 failed the existing HINTS full-state fingerprint. FORMAT had added arena:null to the initial Duel state. Removed that field; the exact existing 15/15 HINTS tests and all four frozen hashes now pass unchanged. Two new FORMAT rejection tests had assumed null; they now prove complete before/after state equality and unchanged property presence instead. No existing replay expectation or HINTS assertion changed. This is a stronger rejection invariant, under independent review.

Claude answered the questions in SCRAPDOME5 and the inbox, and merged release 73f63eb before this lane synced it. New gate tests were committed before implementation: 18/23 passed, five failed for the missing gate. The foundation test fixture first used an invalid numeric opponent field; corrected it to a valid car array so it reaches and fails the missing gate. The implementation covers headless, foundation, intro, App and yard launches; no launch promise appears without warlords. Source flag-table assertions now include the new dev entry, while retaining all released entries and production isolation. Feature-switch checks24/24 and Wasteland beta3/3 pass. The yard module was unpacked when rewritten. Browser readiness and all ordinary pins remain unchanged; the final mandatory lane/build gates still await.

Final source review at c3b6308: no findings. The reviewer reproduced and confirmed the Armory off-gate promise fix in 32 independent checks across six profiles; enabled Armory content and yardContent are byte-identical to their prior rendering. Its new regression failed first and now passes without changing old assertions. Save Guardian again confirms seven fixtures/247 preservation checks, backup and 4 MB budget suites, plus40 independent saved-byte probes through rejected actions, win/loss, quit and reload.

Final private browser: port22761, seven captures, memory-only, zero warnings/errors. Actual production Armory and released yard have no unfinished Sal launch; Last Car Rolling remains available. Explicit warlords QA request then covers the High/Performance intro, fight, loss, same-boss rematch and yard return with unchanged wallet/history. Director inspected the released-yard, intro, fight and loss pixels. QA controls remain visible only in the released-yard evidence capture; they are harness UI. The intro/fight/results are readable without overlap. Source/renderer errors are not filtered. All raw reports/images are consumed after the committed verdict.

Final merge gate: exact clean unchanged e837be1 passed lane299/299 in519.84s and build1.15s. No skipped suite; all campaigns ran. The previously failing HINTS suite passed15/15 with all original pins untouched. FORMAT is merged; warlords remains dev. No release by this Director.
