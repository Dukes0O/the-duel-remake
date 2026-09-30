# WAR-PAY

The settled warlord pay now uses the completed fight's difficulty and actual
wrecks on its warlord. Sal pays 600 / 720 / 840 for the first win on Easy /
Medium / Hard. A three-wreck rematch pays 260 / 312 / 364. A loss pays 60 per
warlord wreck, capped at three, times the same difficulty factor. Saved results
explain FIRST WIN, REMATCH or wreck pay beside the amount.

## Contract and boundaries

SCRAPDOME section 5, settled by Claude and Kyle on 30 September, is the rule.
The pure exported warlordPay policy covers all eight ladder positions, adding
100 base scrap for each earlier warlord. Unknown difficulty, invalid boss wreck
counts and unsupported economic context reject without a reward or marker.
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

Independent acceptance tests committed as 8e9c74d failed18/18 on the old pay
and missing public ladder policy. Additional invalid-context tests committed
as a7ce6d9 also failed before production edits: invalid economics still paid150.
New focused tests now pass19/19 with93 checks. Existing reward settlement tests
pass29/29 with234 checks. The public policy covers every ladder entry at every
difficulty; rematches and losses cover zero through three boss wrecks, a capped
nine-wreck fixture and uncredited wall wrecks. Actual App fights cover a fresh
Preview first win720, rematch312 and two-wreck loss144, captured difficulty,
result explanation, failed save, fresh owner retry and one atomic registry write.

## Changed assertions

The new App fixture initially cleared every participant's wreckCounted guard
while an old boss actor was still combatWrecking. That recounted a third boss
wreck during the two-wreck loss. It now advances Duel.step through the real
respawn lifecycle and requires live actors before the next controlled damage.
Its two-wreck loss expectation144 and total1176 stay unchanged.

Existing tools/test-warlord-settlement.mjs payout assertions150 became720 for
explicit Medium fixtures; banks160 became730 and185 became1042 (start10,
first720, rematch312). The rematch assertion25 became312. Fresh defeated owner
retry bank325 became612 (saved300 + rematch312). The never-saved fixture retains
its default Easy difficulty and expects600. Actual callback, duplicate, retry,
fresh owner, durable marker and genuine unsaved owner amount assertions follow
those exact values. The no-unpaid-reward screen regex follows720. The pure
three-wreck fixture now records three wrecks on its losing participant, and
all pure payloads explicitly supply Medium. Its zero-boss-wreck loss stays0.
No save rejection, unknown-field, marker, ownership or kit assertions weaken.

Existing tools/scenarios/warlord-reward.mjs explicitly selects Medium and
checks720 first,312 rematch,0 zero-boss-wreck loss and bank1032 through reload.
Its failed-save rejection checks the new unpaid720 amount. All actual click,
atomic write, fresh owner, free equip, future car, named player, race record and
switch-isolation checks remain. The shared controlled contact fixture is
exported for the new private Preview recipe. tools/preview.js exposes its App
only under the existing __DUEL_QA__ compile guard for that recipe.

## Removed

Replaced the old fixed150/25/0 payout branch and its obsolete amount assertions
in the same card. No save guards, kit entitlement, sounds, assets or replay pins
removed. Review evidence remains temporary until its independent verdict is
committed; the Director owns evidence cleanup and lane removal after merge.

## Gates and review

Focused: node --test tools/test-warlord-pay.mjs tools/test-warlord-settlement.mjs
passes48/48,327 acceptance checks, no skips. Private Preview and reward browser
checks, mandatory lane tier/build, independent Reviewer and Save Guardian
verdicts are pending. No merge, push, release or real-save access performed.
