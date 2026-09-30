# WAR-02a-REWARD

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

Nothing replaced. No runtime modules, stubs, assets or review captures added.

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
