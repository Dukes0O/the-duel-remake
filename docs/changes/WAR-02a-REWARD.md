# WAR-02a-REWARD

Status: Reward implementation and independent save/art/contact/browser reviews
are complete. Sal's reviewed `rewardBuilt` is true; the warlords feature remains
under its existing development switch. The final metadata checks pass 99/99.
Mandatory lane/build gates and integration merge remain Director-owned and
pending. No release was made.


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

Titan merged as `7c9ff20` and the App hook is implemented. `rewardBuilt` stays
false until the App/save/contact/armory path is reviewed. Save Guardian review
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

## Core checkpoint checks before App integration

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

At that core checkpoint, `src/app.js` was untouched and `rewardBuilt` was
false. Later sections record the completed App hook and new checks. The reward
is not declared built until the whole path passes final review.

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


## Retry control red check

The Director assigned only the `warlord-retry-save` click-handler case in
`src/screen-router.js` as a named hook. Before adding that UI or handler,
a separate acceptance test used an actual three-wreck App result with failing
memory-only storage. It failed at "failed result provides the production
RETRY SAVE control"; 14/15 settlement subtests passed and 130 checks reached.
The existing transaction, failure and API retry assertions remain unchanged.
The new test also requires clear failure text, no unpaid kit or +150 claim,
and removal of the retry control after one successful save.


## Dev-switch regression red check

The App completion exposed a missing switch boundary: a saved Side Saws kit
could still multiply damage in a released arena with `warlords` off. Before
adding its contact guard, two separate regressions failed. Actual flag-off
side contact removed 18.0246528 armor with the saved kit against 11.265408
without it (1.6 times). App also allowed equip with that switch off.
The tests keep the saved entitlement, require ordinary Last Car Rolling to
remain playable, and require its started actor to have no active Side Saws.
No old contact assertion, FSM rule or fingerprint changed.


A third separate red test found the same switch leak in the Armory's equipped
heading: its item row was hidden, but the saved kit still advertised
"SIDE SAWS EQUIPPED" and 1.6 times damage. The test fails before changing that
heading, requires all three paid choices to remain visible, and proves the
presentation does not erase the saved kit. Existing assertions are unchanged.


## App and result integration checkpoint

The actual `arenaResult` event now dispatches warlord results to the pure
transaction. App checks the current state, event identity, starting named
player, active player and enabled warlord access before saving. It uses the
existing `_saveShopProfile` path: one player-registry write contains scrap,
defeat, claim, kit and marker. A failed write restores the previous visible
profile and registry. The result advertises zero scrap and no kit until the
save succeeds. The same completed result can retry; duplicate success cannot
pay again. Unknown profile and career fields remain additive.

Failed results explain the failure and show RETRY SAVE. The owned App retry
verb retries only that current failed result. The only screen-router change
is the Director-assigned `warlord-retry-save` click-handler case. The handler
calls the verb and refreshes result presentation. First saved win states that
Side Saws are unlocked and equipped on the winning car.

The dev-switch fixes have separate red cases above. Contact multiplication
requires `warlords`; App leaves a saved earned kit inactive at event/race start
and rejects its equip when the switch is off. The Armory also hides its saved
equipped heading then. These guards preserve stored entitlement and all three
paid kits. Sal's FSM, contact faces and ordinary replay hashes are unchanged.

- Settlement: 16/16, 143 acceptance checks. This includes the real App event,
  exact one-write transaction, storage failure, same-result retry and new UI
  and switch cases. Original API assertions are unchanged.
- Side Saws: 29/29, 124 checks. Both new switch regressions pass; the original
  27 cases and all three ordinary fingerprint controls remain unchanged.
- Sixteen focused suites: 140/140 subtests pass in 2.53 seconds. These cover
  ordinary arena settlement/UI, warlord format, paid/authored/visual kits,
  resource lifecycle, Sal art, armor/bomb radius, Wasteland profile,
  progression integration and territory presentation.
- Browser recipe syntax and `git diff --check` pass. The recipe uses the
  bundled QA App and UI, with no `/src` imports. It checks actual damaging
  contact wrecks, the real retry click, one registry write, authored earned
  saws and spark bursts, first/rematch/loss economy, current/future free equip,
  same-tab reload and named-player/dev-switch isolation in High/Performance.
- Browser attempt 1 on private port 63426 stopped because a nested recipe
  string lost its regex escape before `+150`. No runtime assertion or console
  issue was hidden. The equivalent literal text check fixes the recipe; the
  rerun is in progress. Evidence is ignored under `.evidence/2026-09-30/`.

Save Guardian cleared the earlier exact guards checkpoint `8347dd2` with 180
probes, 247 fixture checks and backup/budget checks. This App delta still needs
its separate final review. The Director authorized the private QA build;
mandatory lane/build gates are held until reviewed source is frozen.

## Removed in App integration

Removed the App's warlord early-return placeholder. The ordinary arena
settlement path stays in place; its regression suite passes. No save format,
paid kit, real player data, asset binary or Sal FSM was removed. The dev switch
only suspends the earned kit; it never deletes it from the career.


## Independent App and original-geometry review: red fixes

Save Guardian found a stale retry registry in `38a77e2`: the first failed
write sets `profileSaved = false`, so `_refreshPlayer` skips durable data.
Public retry could replace another player's later 900 credits with old 100,
or replace the owner's later 1765 credits with old progress. Separate real
three-wreck/public-retry tests reproduce both before the fix. More red tests
require fresh rematch status, exact-marker idempotence, supported raw profiles
for every player, unchanged rejection of missing/switched/unreadable data,
and preservation of genuine unsaved sessions. The strictly proved never-saved
happy path is a passing control. The unsaved-other-player red first reported
an absent player as a property error; optional access makes the same required
900-credit equality fail clearly, without changing its acceptance.

The Director approved first-registry creation only with successful proof of
absence captured before the first failed settlement and still absent at
retry, the same run and active local owner, and supported local profiles.
A read failure or a loader-generated default is never absence proof.

The actual failed-save screenshot also showed HOLD 0/100 while the career
still held Sal at 100. Its separate stronger test fails with undefined versus
100 before the integer-guarded initializer fix. No transaction assertion changed.

General review used the original Falcone GLB geometry and found whole earned
housings orbiting the vehicle origin. An original-geometry regression fails
with 1.410157468 metres of center displacement at a quarter turn. A second
original-geometry test proves paid `kit-raider-painted-metal` stays visible
inside the earned kit. The fixture preserves all original vertices and
transforms; only material references are removed from an in-memory GLB copy
because Node has no browser image decoder. No asset file is edited.
The authorized fix keeps earned housings static, hides only that direct paid
mesh, and preserves paid Raider and Sal-specific motion.

Browser attempt 2 (private port 53470, zero issues/warnings) passed High's
retry click, complete 150 award, rematch 25, free loss and genuine authored
saw/contact spark proof, then timed out returning to the yard. The stopped
App needed renderer/course readiness before fixed-step advance. The recipe
now waits for the existing readiness gate. Attempt 3 (private port 8438,
zero issues/warnings) additionally passed current-car free equip, then used
the menu Armory close selector in the yard. The yard has BACK TO HOME; correct
that production selector, without bypassing navigation or runtime assertions.
Both attempt verdicts remain explicit; full High/Performance rerun follows.


## Reviewed recovery and geometry fixes

The narrow warlord retry path now reads the durable registry directly and
validates every raw player's supported root/career schema before the existing
save normalizer can discard data. It requires the same starting owner and
persisted active player. The immutable completed result is applied to the
fresh owner's career and all other fresh players travel in the same candidate.
Missing, malformed, deleted, future, unreadable or externally switched data
rejects without changing the visible career or storage and leaves RETRY SAVE.

Genuine unsaved owner work survives when its previously captured durable owner
is still identical. Conflicting newer owner work fails closed instead of being
guessed away. The Director-approved never-saved exception requires proved
absence captured before the first failure, still-absent storage, the same run
and local owner, and valid local profiles. Read failure never authorizes it.
An already durable exact result marker adopts that proven saved career without
another write or reward and removes the stale retry warning. A failed re-save
retains the fresh candidate's previous career. Global shop helpers are unchanged.

The failed result now initializes HOLD from the unchanged career with a safe
integer/range guard. Earned original saw housings remain at their reviewed
fit; only Sal's actual blade nodes retain their stage-time spin. The earned
kit hides the direct paid Raider plating mesh; paid Raider restores it. No
asset or pivot changed and no synthetic animation assertion was replaced.

- New original-geometry regressions pass: zero center displacement, earned
  plating hidden, paid Raider plating/cage restored, attachments released.
- Settlement 25/25, 210 checks; Side Saws 31/31, 133 checks. All original
  transaction, Sal-motion, missed-window, damage and fingerprint assertions
  remain unchanged. Sixteen focused suites pass 151/151 in 2.46 seconds.
- Independent review of the earlier `38a77e2` contact core cleared 15 probes
  and an 8-second actual saw-contact replay. Its full state/event SHA-256
  `ea9da8ff7ab83d933a11efeb2767fc1c3dcf754cb5d7aebca22a6f7c0e908351`
  matched at 30/60/144 FPS. That limited verdict did not clear the two original
  geometry findings or the stale retry; those now have red/pass evidence.
- Browser recipe now uses a local pose fixture inside each evaluation, with
  no helper installed in the game or browser globals and no `/src` imports.
  The real `_vehicleContact` performs damage and the actual event credits
  wrecks. Its actual retry click will also check a second memory tab's newer
  owner and other-player fields. The complete High/Performance rerun and
  final Save Guardian/general review remain pending on this checkpoint.

## Removed in review fixes

Removed whole earned-housing rotation about the vehicle-origin pivot and its
renderer-only rest-angle cache. The original static housings and all Sal blade
motion remain. Removed paid Raider direct plating from the earned-only view;
paid Raider still loads it. Replaced the stale retry save route with a narrow
fresh-registry candidate transaction; ordinary shop and arena paths remain.


## Browser pass and remaining initial-write review

The complete High/Performance private browser flow passed on `ee8de512`,
port 36958: 12 screenshots, zero errors and zero warnings. Actual RETRY SAVE
preserved the newer durable owner's 50100 credits and additive field plus
another player's 900 credits/additive field in one reward write. First win
paid 150, rematch 25, loss zero; final scrap 175, wins 2, losses 1. Actual
side contact removed 18.0246528 armor and added one spark in each mode. The
recipe proved current Stuttgart and later purchased Banshee free equip,
same-tab reload, other-player rejection and released Armory switch isolation.
Visual inspection of earned-contact, corrected failed HOLD and future-car
Armory captures found no covered controls or misleading reward claim.
Evidence: `.evidence/2026-09-30/warlord-reward-2026-09-30T18-18-03-813Z/`.

Guardian then found a related initial-write hole with pre-existing unsaved
work. A real failed `_saveProfile` left local credits 2777; another tab saved
owner credits 4765, then the first completed fight could replace that newer
career. Three separate tests now fail before fixing it: conflict after launch,
conflict already present before launch, and a dropped fresh other player on
initial success with unchanged owner. Existing assertions stay unchanged.

The Director approved a small evidence hook after successful `_saveProfile`,
without changing global shop save/rollback behavior. It records an earlier
verified serialized owner only when a supported durable registry matches the
saved profile. Constructor/run-start proof also requires that exact match.
Initial and retry reward writes must share fresh-candidate rules; unknown or
changed proof retains both genuine local work and durable progress and leaves
a retryable failure. The complete browser pass above is a limited verdict for
`ee8de512`; the corrected source needs Guardian and a fresh browser rerun.


## Shared initial and retry transaction correction

Tests-first checkpoint `1fea4e3` reproduced all three initial-write defects
before this correction. The real prior failed save is used in both owner
conflict cases. No old or new assertion was weakened.

Initial settlement now uses the same directly read, validated fresh registry
and one-write candidate as retry. Both paths retain all fresh other players.
An owner with genuine unsaved work needs an earlier verified durable owner
snapshot that still matches. A changed or absent snapshot leaves the complete
local career and durable registry untouched, with RETRY SAVE and no award.
The strictly proved never-saved exception remains separate and unchanged.

A small approved bookkeeping hook reads the supported durable registry after
a successful existing `_saveProfile`. It records proof only if the named owner,
persisted active owner and serialized saved profile match exactly. Constructor
and warlord launch apply the same rule; an unsaved profile cannot establish
new proof at launch. Read failure or mismatch cannot overwrite earlier proof.
The hook does not change the existing shop save result or rollback behavior.

- Settlement: 28/28 tests and 226 acceptance checks pass.
- Side Saws: 31/31 tests and 133 acceptance checks pass.
- Sixteen focused suites: 154/154 pass in 2.54 seconds, including ordinary
  arena/UI, warlord format, paid/authored/visual/resource kits, Sal art, armor,
  bomb radius, Wasteland profile, progression and territory presentation.
- `git diff --check` passes. Complete corrected-source browser and independent
  Save Guardian review remain pending; no mandatory gate or merge was run.

## Removed in the initial-write correction

Removed the separate warlord initial award route through `_refreshPlayer`
and `_saveShopProfile`, which skipped fresh data after an earlier failed save.
The narrow shared reward candidate replaces it. Ordinary arena and global
shop save behavior remain unchanged.


## Corrected-source browser verdict

The complete recipe passes on `ad819aa120517f7ec7ea9d0a84c6887b57d19cef`,
private port 38622: High and Performance, 12 screenshots, zero errors and zero
warnings. It uses only memory-only player storage and the existing bundled
QA App. Actual RETRY SAVE preserves the newer owner and other player in one
complete registry write. First win pays 150, rematch 25, loss zero; final
scrap is 175 with two wins and one loss. Actual side contact removes
18.0246528 armor and creates one spark in each mode.

Actual current Stuttgart and later purchased Banshee free equip, same-tab
reload, other-player rejection and released-switch Armory isolation all pass.
Visual inspection of High failed-save HOLD/retry and earned-contact captures
plus Performance future-car Armory finds clear controls, HOLD 100/100 during
failure, static fitted original saw housings and visible real contact sparks.
The three earlier failed recipe attempts remain recorded above.

Ignored evidence is under
`.evidence/2026-09-30/warlord-reward-2026-09-30T18-27-34-444Z/`;
`report.json` holds console/capture results and `reward-verdict.json` holds
both quality verdicts. The source is frozen for Save Guardian and general
review. No mandatory lane tier/build, merge, release or flag flip was run.

## Removed after browser validation

None. The reproducible recipe remains; review evidence stays ignored until
the Director records its verdict and removes it under the janitor rule.


## Final review and built-reward metadata red

Save Guardian clears runtime `ad819aa120517f7ec7ea9d0a84c6887b57d19cef`
(note-only HEAD `2fe1defa`) with 502 independent memory-only checks and no
findings. Both original retry repros and initial owner conflicts before and
after launch preserve all credits and opaque fields. Review also covers
proved/unproved unsaved boundaries, fresh other players, rejected future or
malformed registry data, active-owner changes, exact-marker zero-write adoption,
root-1 support, new-player identity, successful ordinary save with bookkeeping
read failure and damaged normalization. Seven save fixtures/247 checks, backup
and budget, progression/27 and police/225 checks pass.

The Director records general art/contact source clearance, including all nine
original car GLBs. The complete corrected-source browser pass above remains
the current gameplay verdict. The Director authorizes only final built metadata
after these reviews; warlords remain under their existing dev feature state.

A new owned settlement test first wins via the actual three-wreck App event,
reloads its named saved owner, and checks defeated/claimed/equipped state. It
requires the working SIDE SAWS EARNED claim on the defeated territory and in
enabled Armory. Controls require explicit unbuilt ids, a saved future boss
defeat and warlords-off Armory to hide their earned claims/actions. Rendering
must preserve the saved profile. The test correctly fails before metadata is
changed: 0/1, after eight checks, because the actual durable Sal territory lacks
the reviewed working reward claim. Existing assertions are unchanged.

## Removed in final metadata completion

None. Only the reviewed Sal reward's build marker is to be completed; future
unbuilt fights and the warlords development gate keep their existing controls.


## Final built metadata and reviewed assertion completion

Tests-first `ea0e795cee1fc36add3cb439da40f0b3512d3170` supplies the actual
saved App-win proof before the single runtime metadata change. Setting only
Sal's `rewardBuilt` to true makes that new territory/Armory proof pass. The
warlords feature flag and all future boss metadata remain unchanged.

The first focused metadata run passed 98/99. It exposed the old assertion
in `tools/test-territory-ui.mjs:63`: noMatch SIDE SAWS EARNED with the premise
"WAR-02a-REWARD has not supplied a working reward". That premise described
the foundation card before this reward existed. The Director assigned only
that obsolete test hook in integration `0265f90`, then obtained independent
approval before its edit. The replacement is stronger: the same full-hold,
defeated, built fixture must match DEFEATED · SIDE SAWS EARNED · CLAIMED.
Its name now describes completed earned-reward behavior. All existing FIGHT,
REMATCH, unbuilt, future and switch-off controls remain unchanged; the separate
new actual App-win proof stays in place. No replay pin or other assertion changed.

The narrow independent review ran nine probes: no false earned/rematch claim
when disabled, unbuilt or future; no profile mutation. General art/contact and
router clearance carries, including all nine original car GLBs. Final Save
Guardian's 502 memory probes and corrected-source High/Performance browser
verdict above remain the actual transaction/gameplay clearance.

Seven relevant focused suites pass 99/99 in 2.05 seconds: settlement 29/29
with 235 checks, Side Saws 31/31 with 133 checks, territory UI 5/5 with 23
checks, territory screen, warlord metadata, paid kit/Armory and warlord format.
`git diff --check` passes. Mandatory lane/build gates are pending on the final
synced source; no heavy gate, browser rerun, feature release or merge was run
during this metadata completion.

## Removed in the reviewed assertion completion

Replaced the obsolete pre-implementation "working reward not supplied"
assertion with the reviewed complete earned/claimed requirement. No runtime
path, control, asset, save field or replay fingerprint was removed.
