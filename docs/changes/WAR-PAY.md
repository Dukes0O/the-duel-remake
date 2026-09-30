# WAR-PAY

The settled warlord pay now uses the completed fight's difficulty and actual
wrecks on its warlord. Sal pays 600 / 720 / 840 for the first win on Easy /
Medium / Hard. A three-wreck rematch pays 260 / 312 / 364. A loss pays 60 per
actual warlord wreck, with no loss cap, times the same difficulty factor. Saved results
explain FIRST WIN, REMATCH or wreck pay beside the amount.

## Contract and boundaries

SCRAPDOME section 5, settled by Claude and Kyle on 30 September, is the rule.
The pure exported warlordPay policy covers all eight ladder positions, adding
100 base scrap for each earlier warlord. Unknown difficulty, invalid boss wreck
counts, unsafe computed pay and unsupported economic context reject without a reward or marker.
The validated career settlement still accepts Sal alone. Later warlord cards
must extend their actual format, entitlement and reward before they can settle.

App passes state.cpuDifficulty from the captured fight directly. The menu's
later choice cannot alter pay. The existing atomic registry write, fresh owner
lookup, unknown fields, failed-save rollback, durable marker checks and retry
rules stay in place. Payout explanation enters the result only after success;
a failed save still advertises zero scrap and no earned item.

No race rules, replay inputs, runtime assets, sounds, dependencies or storage
keys change. No save shape or migration changes. The existing warlords dev
switch controls the fight and its earned kit.

## Why Kyle saw 25

The prior pure settlement explicitly paid 150 on first win, 25 on rematch and
zero on loss, independent of difficulty. tools/preview-player.js seeds a new
tab with Sal undefeated. tools/preview.js seeds only when its temporary player
registry is absent. Same-tab reload restores its isolated store through
window.name, including an earlier Sal defeat. A second completed fight in that
tab therefore paid 25 under the old rule. This explains a possible rematch;
Kyle's historical tab state is unavailable, so its exact cause remains unproved.
The new actual Preview recipe checks first win, rematch, same-tab reload and
a different tab using .qa-dist, a private port and memory-only saves.

## Tests first

Independent acceptance tests committed as 8e9c74d failed 18/18 on the old pay
and missing public ladder policy. Additional invalid-context tests committed
as a7ce6d9 also failed before production edits: invalid economics still paid 150.
The initial focused tests passed 19/19 with 93 checks, but their loss cap
contradicted the literal card. The correction below removes it. Existing reward
settlement tests pass 29/29 with 234 checks. The public policy covers every ladder
entry at every difficulty; rematches cover the three-wreck cap, while losses
count every actual boss wreck, including nine and uncredited wall wrecks. Actual App fights cover a fresh
Preview first win 720, rematch 312 and two-wreck loss 144, captured difficulty,
result explanation, failed save, fresh owner retry and one atomic registry write.

## Changed assertions

The new App fixture initially cleared every participant's wreckCounted guard
while an old boss actor was still combatWrecking. That recounted a third boss
wreck during the two-wreck loss. It now advances Duel.step through the real
respawn lifecycle and requires live actors before the next controlled damage.
Its two-wreck loss expectation 144 and total 1176 stay unchanged.

Existing tools/test-warlord-settlement.mjs payout assertions 150 became 720 for
explicit Medium fixtures; banks 160 became 730 and 185 became 1042 (start 10,
first 720, rematch 312). The rematch assertion 25 became 312. Fresh defeated owner
retry bank 325 became 612 (saved 300 + rematch 312). The never-saved fixture retains
its default Easy difficulty and expects 600. Actual callback, duplicate, retry,
fresh owner, durable marker and genuine unsaved owner amount assertions follow
those exact values. The no-unpaid-reward screen regex follows 720. The pure
three-wreck fixture now records three wrecks on its losing participant, and
all pure payloads explicitly supply Medium. Its zero-boss-wreck loss stays 0.
No save rejection, unknown-field, marker, ownership or kit assertions weaken.

Existing tools/scenarios/warlord-reward.mjs explicitly selects Medium and
checks 720 first, 312 rematch, 0 zero-boss-wreck loss and bank 1032 through reload.
Its failed-save rejection checks the new unpaid 720 amount. All actual click,
atomic write, fresh owner, free equip, future car, named player, race record and
switch-isolation checks remain. The shared controlled contact fixture is
exported for the new private Preview recipe. tools/preview.js exposes its App
only under the existing __DUEL_QA__ compile guard for that recipe.

## Removed

Replaced the old fixed 150/25/0 payout branch and its obsolete amount assertions
in the same card. No save guards, kit entitlement, sounds, assets or replay pins
removed. Review evidence remains temporary until its independent verdict is
committed; the Director owns evidence cleanup and lane removal after merge.

## Gates and review

Focused: node --test tools/test-warlord-pay.mjs tools/test-warlord-settlement.mjs
passes 54/54, 342 acceptance checks, no skips after the correction below.

node tools/browser-harness.mjs scenario warlord-pay --output-dir
.evidence/2026-09-30/WAR-PAY-preview passed on private port 14082. High and
Performance each prove fresh Preview first win 720, second win 312, same-tab
reload preserving its two wins and bank 1032, a third rematch 312, and a genuinely
different browser tab seeded undefeated with first win 720. Six screenshots,
zero warnings, zero errors. The recipe uses the actual Preview entry and mouse
clicks for the first tab's production controls; the different tab calls the same
production App entry and contact functions. Contacts cause three actual wrecks
with real credit and respawn handling. Its disposable build stamp lives only
in .qa-dist; .preview-dist and the user's running Preview remain untouched.

node tools/browser-harness.mjs scenario warlord-reward --output-dir
.evidence/2026-09-30/WAR-PAY-reward passed on private port 41076. High and
Performance each prove the actual RETRY SAVE click, unchanged failed career,
no unpaid item or amount, one complete registry write, fresh owner and other
player fields, repeat rejection, first 720, rematch 312, zero-wreck loss 0,
authored Side Saws contact sparks, free current and future car equip, reload,
separate named players, unchanged race records and dev-switch isolation.
Twelve screenshots, zero warnings, zero errors.

The old browser fixture restores its menu settings when changing named players
and when discovered-menu presentation refreshes. Its first attempt remained on
Easy and failed the new exact Medium amount check. The final recipe selects
Medium through the actual menu control after that setup; it changes no expected
amount or transaction guard. The new Preview recipe also waits for renderer
readiness before yard/fight advancement. High first win, Performance rematch
and the failed-save screenshots were inspected: amounts and reasons are readable,
and the unpaid result shows zero with RETRY SAVE.

Mandatory lane tier/build and independent Reviewer and Save Guardian verdicts
are held for the Director's review/runner handoff. No merge, push, release or
real-save access performed.

### Tests-first correction: loss wreck count

The Director's initial test brief incorrectly applied the rematch's three-wreck
pay cap to losses. SCRAPDOME section 5 and WAR-PAY cap rematches only: losses
pay 60 for every actual boss wreck, including uncredited wall wrecks beyond
three. New red checks require nine-wreck losses to pay 540 / 648 / 756 on
Easy / Medium / Hard and require the public rule to reject unsafe payout
arithmetic. Existing capped-loss assertions are reported as contradictions and
remain unchanged by the test author; their replacement needs reviewer approval.
No source files or earlier assertions changed in the test-author commit c901742:
its six new checks correctly failed before this fix. Implementation then removed
the loss cap in both pay and explanation and rejects an unsafe computed payout
before any transaction. Only the contradictory loss-matrix expectation changed
from 60 * min(3, count) * factor to 60 * count * factor. Rematch cap expectations,
the actual two-wreck loss 144, total 1176 and every save guard remain unchanged.
The independent Reviewer must verify this literal-rule replacement before merge.
Correction-focused tests pass 54/54 with 342 checks (new pay 25/25, 108 checks;
existing settlement 29/29, 234 checks). The real two-wreck loss and atomic save
checks pass unchanged. Earlier browser data stays valid for its zero-to-three
wreck fixtures; both private browser recipes will also be rerun on this correction.
