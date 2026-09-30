# WAR-02a-REWARD

Status: partial core checkpoint; App integration blocked by TITAN-HANDLING.
Save Guardian review pending on this exact checkpoint. `rewardBuilt` remains false.
No merge, release or finished reward claim.

## Settled contract before tests

Read SPEC 0, docs/SCRAPDOME.md section 5 and the card's owned files.
Use a pure settleWarlordResult(profile, options) export in
src/arena/warlord-settlement.js. Options match ordinary arena settlement:
runId, ownerPlayerId, activePlayerId, arena and car (the winning player's car).
Return profile, key, awarded and scrapEarned. awarded means a completed result
transaction was accepted, including a loss whose scrapEarned is zero.
Reject unfinished/abandoned results, stale owner identity, unknown warlords,
unsupported career versions and repeats without changing the input profile.

A completed result records warlord:<runId> in wasteland.settledResults, using
the existing 1000-entry/180-character marker limit and runId limit of 128.
The first win records defeated, adds one win, claims Sal's territory, grants
Side Saws and pays 150 scrap. Rematches pay 25 and add one win. A completed
loss only adds one loss. Preserve all unknown profile, career, warlord and
territory fields. Pure settlement never writes storage. App commits the full
new player-registry profile in one existing save transaction and annotates the
result only after success; failed saves restore the previous visible profile.
A repeated callback, stale state, player switch, restart or abandoned fight
cannot duplicate or transfer a reward. Retry a failed save using the same result.

Side Saws use id side-saws. Keep the three paid plating entries in ARMOR_KITS
intact; use a separate earned-kit catalog/lookup. The existing public
validArmorKit, getEquippedArmorKit and equipArmorKit APIs support Side Saws.
The named player's settled Sal defeat is the permanent entitlement on every
car owned now or bought later. Autoequip only the winning car, preserve other
cars' equipped kits. Entitled kits can be equipped for zero scrap and credits;
they never require rank or a purchase. Migration of either supported legacy
Sal defeat shape grants entitlement without paying scrap or autoequipping an
unknown historical winning car. Side Saws add zero armor and zero mass.

Actual contact damage uses the attacker's contact face for equipped Side Saws
(1.6 only on left/right). Sal sweep reads salSaw.stage and doubles damage only
to a victim side; Sal window scales rear damage to Sal by 1.5. Sal modifiers
are limited to her enabled warlord duel. Multiply before the existing damage
caps; retain front spikes, shields, respawn/invulnerability, teams and incident
cadence. Emit saw sparks only with actual positive saw contact damage.
Use existing combatRamHit event plus sideSaws: true to mark those sparks.

## Dependencies and reviews

App hook waits for TITAN-HANDLING merge. rewardBuilt stays false until the
App/save/contact/armory path is implemented and reviewed. Save Guardian review
and Claude/Kyle Preview review remain required, not claimed by headless tests.
Tests use only memory storage and QA warlords enablement. Run focused suites
only while the Director's other runner owns full/heavy gates.
Existing tools/replays/warlord-format-ordinary.json is reused unchanged.

## Changed assertions

None. Existing tools/test-armor-kits.mjs requires exactly three paid prices
[350, 950, 2500]. An enumerable addition to ARMOR_KITS would contradict it;
the earned-kit lookup avoids that conflict without weakening the old test.

## Removed

Replaced the paid-only kit lookup with separate paid and earned lookups;
removed no paid tier. Replaced the Armory's paid-only presentation and unpacked
its touched panel and the contact function. Replaced Sal's static sweep pose
with stage-time rotation. The missed-window spark node keeps its old role;
the tell uses a renderer clone named `kit-sal-tell-sparks`.
No runtime assets, dependencies, saves, review captures or test assertions removed.
No stub stands in for the pending App save hook.

## Tests-first red verdict (30 September 2026)

node tools/test-warlord-settlement.mjs: 11 subtests; 2 passed, 9 failed;
22 assertions reached. Exact failure messages:
- Seven pure-settlement tests: "WAR-02a-REWARD must expose pure
  settleWarlordResult before any reward can be awarded".
- App result: "actual arenaResult callback settles the first win".
- Failed save: "screen reports an unsaved settlement".
Restart/abandon/stale-state and second-player controls pass.

node tools/test-side-saws.mjs: 25 subtests; 14 passed, 11 failed;
71 assertions reached. Exact failure messages:
- "falcone_f42: settled Sal defeat owns this reward".
- "a newly acquired car inherits this named player earned entitlement".
- "legacy defeat owns usable Side Saws".
- "public kit lookup includes the earned item".
- "owned Side Saws appear as a working armory item".
- Left and right: "equipped attacker side deals exactly 1.6 damage
  (actual 11.26540799999998, expected 18.024652799999966)".
- "high-speed saw hit retains maximum damage cap (actual 77.248512, expected 80)".
- "signature sweep doubles side damage
  (actual 14.399999999999977, expected 28.799999999999955)".
- "window respects Sal rear face
  (actual 11.26540799999998, expected 16.89811199999997)".
- "saw damage preserves combat team protection".

The allied-contact check also exposes existing friendly armor damage before
any Side Saws implementation. Preserve teams by rejecting friendly damage in
the owned contact/damage path, rather than multiplying that old leak.
Three existing ordinary fingerprints pass unchanged.

Contact handshake: only a positive sweep hit to the target side sets
attacker.salSaw.hit = true and emits SAW SWEEP! immediately. SAL reads the hit
on its next fixed tick; unrelated armor loss cannot mark a successful sweep.

Renderer conflict found without changing an assertion:
tools/test-sal-art.mjs requires the authored missed-window spark node hidden
during spin-up. Use a separate tell-spark effect so the settled rising tell
can spark without changing that old assertion. Sweeping blades must rotate;
ordinary rigs retain their existing behavior.

Focused red evidence only. No full lane gate or build was run because the
Director assigned the focused suites while another runner owns heavy gates.

## Presentation tests-first addition

The renderer's separate tell effect is named kit-sal-tell-sparks. It is visible
during spin-up only, and never changes simulation state. Keep kit-sal-sparks
reserved for the reviewed missed window. Reviewed left and right blades rotate
in the sweeping phase using stageTimeSec and sinceSec, with deterministic poses.

Focused Side Saws rerun after these new checks: 27 subtests, 14 passed,
13 expected failures, 75 assertions reached. Additional exact messages:
- "sweeping stage visibly rotates both reviewed blades".
- "distinct tell-spark effect is visible while the saws spin up".

The sweep/player-side fixture moves both cars into contact; this intentionally
avoids the existing NPC cut-in safety-yield path. Wrong-context modifier tests
use actual Last Car Rolling contact with stray Sal fields, both with the dev
warlord switch requested and absent. They pass and do not fake the damage path.


## Implemented core checkpoint (30 September 2026)

`settleWarlordResult` now builds one pure, additive transaction. First win
pays 150 scrap, claims Sal, records defeat and equips Side Saws on only the
winning car. New rematches pay 25; losses pay zero and add one loss. Run
markers, participant facts, named-player identity, career version and discovery
reject unsupported or repeated results without changing the old profile.
Unknown profile, career, warlord, territory and kit fields survive.

Side Saws use a separate earned catalog. A named career's Sal defeat supplies
permanent ownership on current and future unlocked cars. Both legacy defeat
shapes work without scrap repayment or guessed autoequipping. Equip is free;
undefeated players cannot buy or equip it. The three paid prices stay
[350, 950, 2500]. Side Saws add zero armor and zero mass. The Armory shows the
owned item under the warlords switch and uses existing equip actions.

Actual contact faces drive the damage rules: equipped attacker left/right
gets 1.6 times; enabled Sal sweep to the player's left/right gets 2 times;
hits on Sal's rear during her window get 1.5 times. Multipliers precede the
existing damage caps. A genuine positive saw hit marks `combatRamHit` with
`sideSaws: true` and uses the existing bounded `burst(..., 'spark')` pool,
already drawn by combat effects. No new fields or bursts enter ordinary
contacts. Only positive sweep damage sets `salSaw.hit = true` and immediately
calls out `SAW SWEEP!`.

The corrected owned projectile file is `src/combat-projectiles.js`.
It forwards its existing contact zone for direct hits only. Bombs and splash
hits have no guessed contact face and do not get rear-window damage. No Sal
FSM, pilot or shared renderer file was edited.

The friendly-contact red fixture exposed a real older bug: contacts passed
correct participant-owner ids, but the damage guard checked only respawn
protection and never rejected an allied team. The owned armor path now rejects
distinct allied arena participants. Own bomb damage, shields, invulnerability,
respawn protection and one-hit-per-contact cadence remain intact.

Authored Side Saws show the existing saw meshes without paid plating. Sal's
reviewed blades rotate in the sweeping phase; a distinct clone of the reviewed
spark geometry tells during spin-up. `kit-sal-sparks` stays hidden during the
tell and remains reserved for the missed window. All motion reads simulation
time and changes no race or save state.

## Current checks and remaining dependency

- `node tools/test-side-saws.mjs`: 27/27 subtests passed, 116 acceptance checks.
  All three ordinary fingerprints in the unchanged
  `tools/replays/warlord-format-ordinary.json` pass.
- `node tools/test-warlord-settlement.mjs`: 9/11 subtests passed, 87 checks
  reached. The two remaining App failures are exactly
  "actual arenaResult callback settles the first win" and
  "screen reports an unsaved settlement". They require the owned App hook
  after TITAN-HANDLING merges; these assertions were not weakened or skipped.
- Ten focused suites for Side Saws, paid kits, authored kits, visual kits,
  resource lifecycle, Sal art, armor, bomb radius, Wasteland profiles and
  warlord metadata: 81/81 subtests passed in 1.83 seconds. Existing missed-window
  spark assertion and own-bomb checks remain unchanged.
- Final focused reruns with Node's spec reporter repeat 27/27 Side Saws
  (116 checks) and 9/11 settlement (87 checks), after the readable contact
  rewrite and malformed-owned-list guard. The same two App assertions fail.
- Read-only, memory-only production `stepProjectiles` proof: rear bolt 12
  to 18 armor during the window; front bolt 12 to 12; radial bomb
  17.18181818181813 to 17.18181818181813. An initial scratch expectation of
  an 18-damage centered bomb failed because modern blast floor clearance
  causes falloff; the measured positive control and window are equal.
  No tracked test or assertion changed. Malformed owned-kit objects are
  safely rejected by the public ownership lookup.
- Save fixtures were not rerun here. Save Guardian remains mandatory and
  independent. Headless checks do not claim a complete App storage
  transaction, browser reward flow or final result presentation.
- Lane tier, build and browser reward scenario remain pending. No heavy gate,
  private browser build, merge, push or history rewrite was run during the
  Director's Rustwall gate. Browser recipe and end-to-end App/storage review
  follow once the App hook clears; current work is a reviewable partial core.

Freeze this source checkpoint for Save Guardian. `src/app.js` is untouched,
`src/warlords.js` still has `rewardBuilt: false`, and the reward is not declared
built until the working App/save/contact/armory path passes final review.

## Save Guardian findings: reject before settlement

Independent review of `0a66105` found three unsafe inputs. Root schema 99
could earn a reward that later normalization would discard. A damage result
with missing boss and placing ids could earn 150 scrap. A malformed
`unlockedCars` object could throw during a paid-car lookup. The Director added
three failing rejection tests in `d24235b` before this fix.

Settlement now accepts root profile versions 1 and 2 only. It requires an
owned-car array of known car ids and Sal's canonical player / cpu-1 roster.
Malformed participant or result objects also reject before the transaction.
Every rejection returns the exact old profile reference without changing it.
No assertion was changed.

Focused check: 12/14 settlement subtests pass, with 116 acceptance checks
reached. Only the two existing App transaction cases still fail. Side Saws
remains 27/27, with 116 checks and the three unchanged ordinary fingerprints.
Titan has merged into integration as `7c9ff20`; the App hook may now proceed
in a separate checkpoint. `rewardBuilt` remains false. No heavy gate or
browser build ran for this guard checkpoint.
