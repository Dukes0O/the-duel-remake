# ARENA-03 — Fuel Run

Status: settled contact/depot and reviewed attribution/standing-carrier
implementation candidate. Not merge-ready. The current new frozen tests,
prior focused controls and ordinary replay fingerprints pass. Independent
whole-card review, Save Guardian, fresh browser/feel/audio checks, exact
lane/build gates and Claude's review remain before merge. Earlier sections
record prior source evidence; the latest changes are in the final section.

## Tests first

The card builds SCRAPDOME section 10's Fuel Run and shared sections 3 and 6.
SPEC 0.12 requires a new `fuel-run:dev` switch because Scrapdome has already
been released. Tests use the actual Duel, App, damage and on-foot entry points.
All player registries are fabricated in memory; no real saves are read.

Run on pre-build source `60c20f0294cc7a0e852d7e9923602ee4c191fffa`:

`node --test --test-reporter=tap tools/test-arena-fuel-run.mjs`

Result: **33 tests; 5 pass, 28 fail, 0 skipped; 102 assertion checks reached;
exit 1.** The missing feature is the reason for each failure. Later assertions
in those tests become reachable when Fuel's real entry works; this is not a
claim that every planned assertion executed before implementation.

The suite covers four inner-floor pads; distinct coloured depots near each
spawn; one carried canister; five-second refill; car and fighter collection;
own-depot delivery without repeat points; first-to-five and three-minute wins;
delivery sudden death; actual 25/26-armor boundaries; multiple smaller hits;
blocked damage; wreck drops and enemy recovery; actual F exit and re-entry;
70% loaded walking with unchanged direction; collector and carrier-hunting
brains using the existing pilot; rank/discovery/yard/switch gates; readable
delivery HUD; CAR-01 pay and Kettle hold; complete and malformed rosters;
atomic save failure/retry; named-player preservation; abandonment; duplicate
settlement; and actual fixed-step App playback at 30, 60 and 144 FPS.

The Director approved this observable interface before production code:
`arena.fuelRun = {pads, depots, canisters}`; participants expose
`fuelDelivered` and `fuelCanisterId`. Pads have stable IDs, floor pose,
`canisterId` and `refillSec`; canisters have stable IDs, pose and `carriedBy`;
depots identify `participantId`, team, colour and floor pose. Fighter carrying
uses the player's ownership and actual fighter pose, not the parked car.
The yard action uses `App.startArenaEvent({mode: 'fuel-run', opponents})`;
the pure yard panel receives `profile` and `featureFlags`.

### Each red test and its first failure

| Test | First failure message |
| --- | --- |
| Fuel mode module | ARENA-03 must supply the Fuel Run mode module |
| New switch | Fuel Run starts in dev under SPEC 0.12 |
| Four pads and depots | the real Duel entry starts Fuel Run with its switch enabled |
| One carried / five-second refill | the real Duel entry starts Fuel Run with its switch enabled |
| Own depot / duplicate delivery | the real Duel entry starts Fuel Run with its switch enabled |
| Player's fifth delivery | the real Duel entry starts Fuel Run with its switch enabled |
| Computer's fifth delivery | the real Duel entry starts Fuel Run with its switch enabled |
| Three-minute delivery placing | the real Duel entry starts Fuel Run with its switch enabled |
| Delivery sudden death | the real Duel entry starts Fuel Run with its switch enabled |
| 25 armor retains fuel | the real Duel entry starts Fuel Run with its switch enabled |
| 26 armor drops fuel | the real Duel entry starts Fuel Run with its switch enabled |
| Separate smaller hits | the real Duel entry starts Fuel Run with its switch enabled |
| Actual lost armor / protection | the real Duel entry starts Fuel Run with its switch enabled |
| Wreck drop / enemy recovery | the real Duel entry starts Fuel Run with its switch enabled |
| Fighter pickup / delivery | the real Duel entry starts Fuel Run with its switch enabled |
| 70% walk / F re-entry | the real Duel entry starts Fuel Run with its switch enabled |
| Collector goals | the real Duel entry starts Fuel Run with its switch enabled |
| Rammer hunts carrier | the real Duel entry starts Fuel Run with its switch enabled |
| Hunter hunts carrier | the real Duel entry starts Fuel Run with its switch enabled |
| Rank 6 yard choice | rank 6 sees Fuel Run in the enabled yard panel |
| Rank gate | rank gate refuses the launch |
| Fuel dev gate | fuel-run gate refuses the launch |
| Delivery HUD | the real Duel entry starts Fuel Run with its switch enabled |
| Fuel pay / hold | four-car win with two wrecks pays (80 + 120 + 120) times 1.2 |
| Real App payment / named players | App starts the selected rules |
| Failed App save / retry | App passes the selected mode to the simulation |
| Abandonment / wrong owner | App passes the selected mode to the simulation |
| 30/60/144 FPS repeatability | App passes the selected mode to the simulation |

The five passing tests are the existing Scrapdome, discovery and menu launch
guards, rejection of malformed/foreign Fuel settlement payloads, and the
unchanged-mode fingerprints. Rejection of malformed Fuel payloads currently
passes because Fuel settlement is unsupported; the positive payment test
prevents treating that blanket rejection as a finished implementation.

### Fingerprints and later checks

New `tools/replays/arena-fuel-run-controls.json` pins pre-build traces for
ordinary Pacific Canyon duel, Red Mesa time trial, Timberline objective event,
Last Car Rolling and Sal. Each runs ten seconds at 120 Hz. The suite compares
all five traces with Fuel's switch both off and on: **10 unchanged checks
pass**. Each sampled arena state is copied so later steps cannot rewrite
earlier evidence. No existing fingerprint or assertion was changed.

The builder still owes a private browser scenario at High and Performance,
including the roof canister, coloured pads, real yard selection, actual F
controls, loaded walking, delivery scoreboard, results and sounds. Browser,
look, audio and balance checks are not claimed by this headless test commit.
Lane/build gates and independent Reviewer/Save Guardian review remain pending.

## Removed

Nothing. This tests-first commit adds only the new suite, its new control
fingerprints and this test record. Existing production code, assertions and
fingerprints remain unchanged.

## Reviewed test fixture setup

The Director approved two setup corrections after independent real-engine
reproductions. During `point()` refill waits, the controlled participant now
stays at its depot before each of the same **601 Duel steps**. Without this,
the unrestricted collector legally took `fuel-2` at **2.733333 s** while pad 0
refilled `fuel-5`, so a later pickup correctly could not replace its carry.
The separate collector-brain test remains unrestricted. In the isolated
reproduction, the computer delivered canisters 1, 5, 6, 7 and 8; delivery five
won at **20.125 s**, with all one-carry, score, status and winner assertions
preserved.

Only the walking/re-entry test now parks the car **20 m away** before exiting.
The original walking ratio already passed: **0.9 m empty, 0.63 m loaded,
70%**. Its final F return occurred with the car on its own depot and correctly
emitted `fighterEntered` plus `fuelDelivery` at **1.425 s**. The isolated setup
puts the measurement origin **22.31 m** from the depot and the re-entry pose
**22.98 m** away, so the unchanged return assertion measures carry preservation
without also performing a valid delivery.

The focused suite against the builder's current source passes **33/33 tests,
771 checks, 0 failures and 0 skipped; exit 0**. The ten unchanged-mode
fingerprint checks and actual 30/60/144 FPS comparison still pass. A strict
comparison with the committed suite proved the only text changes were these
two approved setup replacements. Every assertion, input, loop duration and
fingerprint remains unchanged. This test-only commit does not grant a passing
lane/build gate or an independent production review.

## Tests first — settled review regressions

The independent reviewer found additional settled acceptance gaps. Before the
builder fixes them, the new suite adds six real-engine checks. Actual F exit
and a real pad pickup establish the on-foot carrier; no carry ownership is
fabricated. These checks cover immediate recovery by the original dropped-fuel
owner, rammer and hunter pursuit of the actual fighter, Hard crossbow launch
bearing, actual scheduled CPU weapon choice from the fighter's range, and
guidance after the fighter moves. They preserve the physical parked-car hit
point and every existing replay control. A real fired bolt's initial trajectory
is controlled only in the guidance test, isolating guidance from the separately
tested launch-bearing bug.

Pre-fix command:
`node --test --test-reporter=tap tools/test-arena-fuel-run.mjs`.
Result: **39 tests, 33 pass, 6 fail, 0 skipped, 838 checks reached; exit 1**.

| New regression | Exact first failure |
| --- | --- |
| Original owner recovers immediately | anyone includes the original carrier on the very next drive-over step |
| Rammer follows fighter | rammer pilot goal follows the actual stationary fighter carrying fuel |
| Hunter follows fighter | hunter pilot goal follows the actual stationary fighter carrying fuel |
| Hard crossbow aim | Hard bolt follows the fighter within its existing 0.03-radian spread; error was 140.84640403121608 degrees |
| Scheduled attack range | the real scheduled CPU attack measures its on-foot carrier, not the parked car |
| Guidance follows moved fighter | guidance turns toward the moved fighter; angular error 0.10366448131998918 became 0.12161495279853485 |

### Reviewed existing assertion change

`tools/test-feature-flags.mjs` first failed its unchanged seven-entry catalog
assertion on the builder's new Fuel catalog. Reviewer `fuel_review` approved
the exact **7 → 8** count and explicit `fuel-run:dev` / production-default-off
coverage; the Director granted this file on integration in `186256b` and
authorized this narrow change. Every previous feature state and retirement
condition remains asserted. The production-off check retains career backup
and warlords and adds Fuel. A separate production URL check proves
`?flags=fuel-run` cannot expose it. After the reviewed change, the switch suite
passes **25 checks**. No other old assertion or fingerprint changed.

### Separate browser regression

The new suite exports `checkFuelPlayerModeFallback(context)` for the owned
private-browser scenario. It uses the real visible player select and yard
buttons: discovered rank-six player selects Fuel, returns to the menu, changes
to another discovered rank-five player, sees Last Car Rolling, and presses
ENTER THE SCRAPDOME. The resulting mode must be the displayed Last Car Rolling
and must belong to that current named player. Its profile setup uses only the
isolated QA memory store. **The Node result above excludes this browser
verdict; a real browser run is still pending.**

No fighter projectile damage, splash, knockdown or drop values were assumed or
asserted. That separate design gap is with Claude; these tests cover only the
settled chase, aim, carrying, selection and switch behavior.

### Browser fixture menu refresh

The first private-browser attempt stopped before acceptance at
`Named-player option missing` (private port **44766**, memory-only saves).
The fixture IDs match production option values. Direct App fixture creation
emits state but does not call the menu's `updatePlayers`; a frame render alone
leaves the native options stale. The first correction imported `/src/main.js`
at runtime, which would fail in compiled `.qa-dist`: that build serves hashed
asset modules and no source path. That import was removed before a retry.
Setup instead selects the first existing native player option through its real
change handler, which already calls production `refreshRaceSetup`, then waits
for both actual fixture options. All eight mode and owner assertions and the
subsequent real UI controls are unchanged. Syntax and diff checks pass.
**The genuine browser red remains pending.** No browser was launched for this
setup correction; missing options or modules do not count as acceptance reds.

## Implementation candidate

Fuel Run uses the real arena event, pilot, combat damage, F exit/re-entry and
fixed-step fighter movement. Four level inner-floor fuel pads refill after five
seconds. A participant owns one canister across car/fighter transfers. Each
team's depot is a visible **4 m-wide disk, 2 m center-overlap radius**, beside
its starting spawn; the simulation and visible ring use that same radius.
Five deliveries win; otherwise the three-minute delivery placing wins, and a
delivery tie waits for the next delivery. Wreck counts still determine the
existing CAR-01 wreck bonus, never the Fuel winner. Settlement uses the existing
owner/complete-event/atomic-save safeguards and Kettle hold rule.

Collector goals use available fuel and their own depot. Rammer and hunter
pursuit, range selection, crossbow launch and guidance use an actual on-foot
carrier's pose; moving lead uses the real fighter input and observed walking
speed. Combat `point()` remains the parked car's physical hit position. Roads,
Last Car Rolling and Sal keep their existing target paths.

A proposed 0.75-second original-owner pickup block was withdrawn. A real heavy
hit emits a drop before another fixed step, and an overlapping original owner
can legally reclaim it on the next step. The independent recovery regression
failed with the proposed block and now passes without any exception to
Claude's settled "anyone can take it" rule. Browser probes must check the
actual drop event rather than require an arbitrary unclaimed interval.

Presentation reads arena state. Native canister geometry is instanced; pads
and depot signs, mesh capacity and the color attribute are prepared on events.
The renderer reuses its entry buffer only in Fuel, and counts cargo in its
existing update loop. It does not allocate new Fuel entry/filter arrays on
ordinary frames or create visual resources during rendering. Pickup, drop and
delivery map to existing authored `interface.bonus`, `vehicle.landing` and
`interface.go` cues. Results use `interface.win` or `interface.lose`.
Protected sound banks, catalogs and assets are unchanged.

### Current headless evidence

After tests-first commit `9028370`, all six reviewed regressions pass:
**39/39 Fuel tests, 842 assertion checks, zero skips**. The switch suite passes
**25 checks**. The focused existing on-foot/direction/weapon, projectile-body,
arena, Sal, CAR-01/warlord reward, settlement and fabricated-save guards pass
**195/195 tests**, zero skips. No existing fingerprint changed.

Fuel's switch off/on both preserve all five pre-build control traces:

| Control | SHA-256 |
| --- | --- |
| Pacific Canyon duel, seed 1989 | cc93330532ebadc03575549ccdb03552b0ea378999c1bdbfb50dd3692dfd05ae |
| Red Mesa time trial, seed 42 | 0616b40744d3fdd27f7df283adaf317f67c8511962bfddd6f944ab3f89d0f500 |
| Timberline objective event, seed 17 | a0bdaa42703432581339f0275a950ace468aef188f291199b080896adbc83a68 |
| Last Car Rolling, seed 1989 | 0bea25ff94c52712c8ff0de88af58f31a382c91333f2a17f1fc1d5e6cef51d88 |
| Sal, seed 1989 | 67c00e4e979986de686266b64cc1d920d491282b7a733657dcfe2cbcd552c5e5 |

Actual App Fuel samples, ownership, canisters, refill timers, delivery scores,
event traces and settled result match exactly at **30/60/144 FPS**.

### Limited seeded completion sample

The owned scenario exports `measureFuelRounds()`: two seeds at each difficulty,
fixed 120 Hz, real driving input and existing car limits. Its simple player
seeks fuel/depot without teleported pickups, weapons or boosts. It is a round
completion smoke check, not a human win-rate or full balance claim. All six
ended at five deliveries in **55.65–146.52 s**: **103 pickups, 41 drops,
51 deliveries, four hard wall-hit events**. Collectors won four rounds; rammers
won two. The scripted player delivered twice across the six rounds.

| Difficulty / seed | Seconds | Winner | Trace SHA-256 |
| --- | ---: | --- | --- |
| Easy / 1989 | 93.92 | cpu-2 | f2e00693dfe009c861c96add0e8daef9a2c94503bdd31d17b514a5d57c8ed616 |
| Easy / 77123 | 55.65 | cpu-1 | 3291f4f204a75b218fd6831c05b174b60c86b263e2fc7efa1bb38d4b83fa440d |
| Medium / 1989 | 78.59 | cpu-1 | 263f507290f7f7173848c94495ef32de67fc5f6a52f71df42460a1353fc84ad7 |
| Medium / 77123 | 146.52 | cpu-1 | 69714bafbcbc8264445fe05b03f36219028c7c073504a5242f304c5f91def3a4 |
| Hard / 1989 | 97.56 | cpu-1 | bc6db388aaf69c0dfab0bf924c51bbefc3a78f85614168be58de11529f71f59e |
| Hard / 77123 | 132.78 | cpu-2 | 265a4ac213a84913031e9307ada82c132db1f24ce3327aa3b35a87c127b4d5d1 |

### Review boundary and browser work

The preliminary reviewer proved that current projectiles can aim at a carrying
fighter but contact only car actors. Fighter projectile health/splash/drop
rules were not settled by the card. The Director sent that question to Claude
in writing and marked the card waiting on Claude. This candidate does not
invent a damage value or claim finished fighter projectile support.

An earlier private High/Performance browser pass tested real yard launch, roof
and fighter cargo, heavy contact/wreck drops, enemy pickup, F exit/re-entry,
loaded walking, five-second refill, delivery sudden death and failed-save retry.
It predates the reviewed recovery/targeting/allocation fixes and is **not a
current candidate verdict**. The next run stopped at `Page.navigate timed out`
on private port **14128**, before acceptance, with zero screenshots/warnings
or console errors. That is a harness/setup failure, not a game failure or pass.
Its exact disposable Chrome profile/process cleanup was completed. Further
browser work waits for the other lane's gate to release laptop resources.

The named-player fixture setup correction in `9ed52e0` remains to run against
the deliberately absent UI clamps, prove the actual stale Fuel-selection red,
then rerun green after the settled clamp. Lane/build gates, current browser
checks and independent Reviewer/Save Guardian/audio verdicts remain pending.
No merge, release, live folder, Preview build or real player save was touched.

## Removed — implementation

Removed the proposed owner pickup block, its canister fields and all timer/goal
filters in the same change. Removed the added per-frame Fuel entry/map/filter
allocations and moved color-buffer creation to preparation. No runtime asset,
old mode, old assertion or replay fingerprint was removed or regenerated.

## Integration sync for partial review

The Director requested a clean partial candidate so Save Guardian can review
the implemented economy while UI/contact/browser work waits. Partial commit
`a3a222f0ffd7be1a9fcf34f471ae1652eebf5486` was clean before merging current
integration `0bbb68d`. The merge conflicted only in `src/feature-flags.js` and
`tools/test-feature-flags.mjs`: Claude's released `warlords:on` is preserved,
as are all upstream released-state and production-on assertions. The approved
Fuel additions are only `fuel-run:dev`, exact eight-entry count, explicit
production-off and production-URL-off checks. The resulting switch suite passes
27 checks; no released feature was turned back off. The router clamps remain
absent for the actual browser red. This sync is not a feature merge or a
merge-ready verdict.

Post-sync focused verification: **39/39 Fuel tests, 842 checks, zero skips**;
**27 switch checks**. All ten existing-mode traces and the actual 30/60/144
comparison still pass without regenerating any pin.

## Actual named-player browser red

With fixture-only setup `c10b493`, private port **34000**, memory-only saves,
the helper reached the genuine defect: the rank-six named player selected
Fuel through the yard, the real native select changed to the rank-five player,
the yard displayed Last Car Rolling and hid Fuel, and its actual ENTER button
left event mode **null**, rather than starting the displayed Last Car Rolling.
The failure was the unchanged expected-mode assertion; no module/option/setup
error occurred. There were zero warnings and console errors. The same imported
Node suite separately passed **39/39**, 842 checks; that does not turn the UI
red into a pass.

After this red, the builder restored only the reviewed router mode clamps:
re-check the current player's Fuel availability before rendering and before
launch. App/economy/settlement paths remain unchanged. The exact same browser
helper and eight assertions will now run green.

## Current browser candidate evidence

The unchanged eight-assertion named-player helper passes on private port
**49518**, memory-only saves: rank-six Fuel selection, actual native player
change, rank-five displayed Last Car Rolling and real Last Car Rolling start
for the current owner. One capture, zero warnings/errors; exit 0. Its imported
Node checks separately pass 39/39. The only production change is the two
reviewed router mode clamps; App and settlement were unchanged.

The current full High/Performance scenario passes on private port **49373**,
memory-only saves, **22 captures, zero warnings and console errors; exit 0**.
It covers real rank-gated yard controls, roof and fighter cargo, actual heavy
contact and wreck drops, enemy recovery, F exit/re-entry, loaded walking, refill,
delivery sudden death, named-player isolation and the real Retry Save button.
Each quality records eight pickups, three drops, five deliveries and one result.
The actual heavy hit removes **38.624256 armor**. Loaded walking covers
**0.63 m over 0.2 s** while the resting car stays parked. Refill takes exactly
**5 s**. The synthetic failed save leaves the owner/raw memory registry unchanged;
retry banks **240 scrap and 25 hold once** and preserves the spectator.

Existing authored bonus/landing/go/win cues were dispatched during their real
engine events; no sound bank, catalog or audio asset changed. This is an event
and dispatch check, not an independent listening verdict. The final audio
review remains pending. The builder inspected the current roof, fighter and
result captures: canister handle/body and loaded fighter canister are visible,
and HUD/results are readable. The roof canister is dark under the current
lighting. No independent art score or art approval is claimed.

The actual running four-car 150-RAF pacing sample (after 30 warmup frames) has
mean **16.6664 ms**, p95 **16.8 ms**, in both qualities. High reports **506 draws /
564,805 triangles**; Performance **304 / 363,903**. This is a narrow private-browser
sample, without a baseline overhead comparison or a general frame-budget claim.

These browser checks predate fixes for Save Guardian's two new findings. The
existing save probe does not cover another-tab durable owner changes, and the
payout probe does not prove rejection of forged completions. Those clearances
are **blocked**, not passing. Tests first are being added independently; no
App/settlement production fix has started. Earlier option/module/navigation
setup failures remain excluded from these verdicts.

## Tests first — durable Fuel retry and result legitimacy

Save Guardian found two blockers after the browser candidate review. New
checks in the owned Fuel suite exercise only fabricated in-memory registry
writes, the actual Fuel engine and the actual App Retry action. No production
file, old assertion, fixed-step input or replay fingerprint changed.

### Durable retry

The fixture starts a real four-car Medium Fuel event for a named owner with
1000 credits, plus a separate named spectator. Five real deliveries complete
it while the atomic registry write is deliberately blocked. Another synthetic
tab then changes the durable owner to 2000 credits, 100 scrap, engine level 1
and 10 Kettle hold, updates the spectator, and preserves unknown owner fields.
The actual Retry must add exactly 240 scrap and 25 hold to those durable
values, retain every named player and newer field, write one complete registry
and store one event receipt. Duplicate Retry/result events must write nothing.
A second blocked Retry must leave durable bytes intact and still permit one
later successful write. Removed, switched or future-version owners cannot
permit stale local progress to replace the registry. A durable event receipt
must end Retry without another payment and adopt the current durable bank.

Creating/selecting fixture players restores their normal race settings, so the
setup explicitly selects Medium again and verifies the actual event difficulty.
No assertion was changed to accommodate the initial fixture's Easy reset.

### Fuel result proof

Forged complete-looking Fuel rosters test the settled rules: first-five needs
its fifth delivery; the three-minute whistle needs a unique delivery leader;
unsupported reasons cannot pay; placings must follow unequal nonwinner scores.
A sudden-death result with no delivery cannot pay. Rejection must add no scrap,
hold or receipt and preserve the exact profile. Existing count-type and roster
checks are unchanged.

Positive controls use the actual engine's first-five, whistle and next-delivery
sudden-death results. Equal-score nonwinner order may vary. An additional real
engine control reaches the whistle with leaders at two deliveries each, then
CPU 2 wins sudden death with its first delivery: scores **[2, 2, 1, 0]**.
That legitimate lower-scoring winner remains eligible; the player receives
**192 scrap and zero hold** in second. The checks do not impose top-only
sudden-death eligibility or infer an unsettled projectile/contact rule.

Command: `node --test --test-reporter=tap tools/test-arena-fuel-run.mjs`.
Pre-fix result: **58 tests, 43 pass, 15 fail, 0 skipped, 1345 checks reached;
exit 1**. All four new genuine-engine completion controls pass. Existing-mode
pins and the 30/60/144 FPS comparison pass unchanged.

| Regression | Exact first failure |
| --- | --- |
| Durable progress | Retry preserves durable 2000 credits and engine 1, adding exactly 240 to durable scrap 100 |
| Repeated blocked write | repeated failure never authorizes replacing newer durable owner progress |
| Switched durable owner | changed active owner cannot authorize the event owner's Retry |
| Removed durable owner | removed event owner cannot authorize the event owner's Retry |
| Invalid durable owner | invalid event owner cannot authorize the event owner's Retry |
| Existing durable receipt | an already-paid durable receipt cannot pay through Retry |
| Early zero score | early all-zero first-five is not a completed Fuel result and earns no reward or hold |
| Wrong first-five winner | declared winner below CPU delivery five is not a completed Fuel result and earns no reward or hold |
| Unsupported reason | unsupported completion reason is not a completed Fuel result and earns no reward or hold |
| Early whistle | time result before the three-minute whistle is not a completed Fuel result and earns no reward or hold |
| Missing fifth delivery | first-five result with no fifth delivery is not a completed Fuel result and earns no reward or hold |
| Tied whistle | time result with tied leaders is not a completed Fuel result and earns no reward or hold |
| Wrong whistle winner | time winner below another delivery score is not a completed Fuel result and earns no reward or hold |
| Empty sudden death | sudden death with no delivery is not a completed Fuel result and earns no reward or hold |
| Reversed unequal placings | placings reversing unequal nonwinner deliveries is not a completed Fuel result and earns no reward or hold |

The two retry progress failures actually save **credits 1000 / scrap 240 /
engine 0**, instead of **2000 / 340 / 1**. The owner/receipt boundaries wrongly
return true. Each forged-result case wrongly returns awarded true, **240 scrap
and 25 hold**. These are meaningful pre-fix reds, not setup/module failures.
No lane/build/full gate or new browser verdict is claimed by this test commit.

### Removed — this tests-first follow-up

Nothing removed. This adds only the new acceptance checks and their evidence.
The separate malformed-JSON progression fix stays with its assigned lane.

## Save findings fixed for independent re-review

After the independent tests-first commit `fb2634d`, Fuel settlement now reads
and validates the durable registry on initial completion and every real Retry.
It reuses the existing owner-validation, verified-owner and atomic registry
adoption guards. Pending identity remains tied to the exact state, result,
run and owner. Newer durable owner progress is the base for the award; changed,
missing and unsupported owners refuse Retry without a write. An existing
receipt adopts the durable bank and closes Retry without another reward or
write. Failed writes never expose banked scrap/hold or make stale local progress
trusted. Fuel no longer uses the ordinary profile-save shortcut after failure.
Last Car Rolling and Warlord settlement bodies retain their existing behavior.

Pure Fuel result validation now rejects missing fifth deliveries, wrong
first-five winners, early/tied/wrong whistle winners, unsupported reasons,
empty sudden-death results and reversed unequal nonwinner placings. The
settled lower-scoring next-delivery sudden-death winner remains valid; equal
nonwinner counts may appear in any order. No top-only SD rule was introduced.

The actual Fuel suite passes **58/58 tests, 1397 checks, zero skips; exit 0**,
including all 15 independent save/result reds and all four actual-engine
completion controls. Switch coverage passes **27 checks**. The focused existing
Last Car Rolling settlement, released Warlord format/pay/settlement and
fabricated-save guards pass **88/88 tests**, including 247 historical save
round-trip checks. All ten unchanged-mode fingerprints and actual 30/60/144
Fuel traces pass without changing any assertion or pin.

### Current browser after save fixes

The owned scenario adds a newer-owner memory-registry write between the actual
failed completion and the same real Retry button. This fixture does not use
App's stale registry, fabricate a result or bypass payment. Every original
Retry/+240/+25/one-write/spectator/duplicate assertion remains intact; new
assertions verify the durable credits, bank, engine, hold and unknown field.

Current High and Performance pass on private port **42338**, memory-only saves,
**22 captures, zero warnings/console errors; exit 0**. Both finish with durable
**credits 2000, scrap 340, engine 1, hold 35**, adding exactly **240 scrap and
25 hold** once to the newer bank. The spectator remains unchanged. Heavy hit,
walking, refill, gameplay events and authored cue-dispatch checks still pass.
Each quality traces eight pickups, three drops, five deliveries and one result.
Their complete event trace hashes match:
`7096999c721371f43df65dddee343def5eb54aaee86ed556c5b28f34948a1a77`.
The same narrow pacing sample remains mean 16.6664 ms / p95 16.8 ms in both
qualities, with 506 draws / 564,805 triangles High and 304 / 363,903 Performance.
The builder inspected the current result capture: it displays the +240 award
and correctly shows total Kettle hold 35/100. Independent listening/look review
is still pending.

`npm run build` passes for this isolated lane's current source, 246 modules;
the existing large-chunk warning remains. No lane/full-tier pass is claimed by
this builder note. The Director's independent runner and Save Guardian must
review the clean freeze. Contact design still waits for Claude, so this card
remains held rather than merge-ready.

### Removed — save fixes

Removed Fuel's use of the stale profile-save path after a failed award and its
old retryable-flag branches. That ordinary path remains for its existing
callers. Replaced Fuel's count-only finish validation with the settled result
proof in the same change. No assertion, replay pin, licensed/runtime asset or
protected audio source was removed, relaxed or regenerated.

## Tests first — impossible sudden-death nonwinner score

Save Guardian found one remaining result-proof gap on clean source
`e20470ab6587765c3cf2144235b2e2000c323efa`. A forged three-car result declares
sudden death at 180 seconds with deliveries **player 1 / CPU 1 5 / CPU 2 0**,
placings `[player, cpu-1, cpu-2]`, and the player as winner. The CPU's fifth
delivery would already have ended the real event; this result cannot pay.
The new check requires zero scrap/hold and no new receipt, preserving the exact
profile. The existing real-engine **[2, 2, 1, 0]** lower-scoring sudden-death
winner remains valid and unchanged. No top-only sudden-death rule was added.

Command: `node --test --test-reporter=tap tools/test-arena-fuel-run.mjs`.
Pre-fix result: **59 tests, 58 pass, 1 fail, 0 skipped, 1398 checks reached;
exit 1**. Exact first failure:
`a nonwinner with five deliveries already ended Fuel Run before sudden death and cannot authorize payment`.
Actual returned award: **awarded true, 192 scrap, 25 hold**; expected:
**awarded false, zero scrap and zero hold**. The legitimate lower-scoring
sudden-death positive control passes, as do all other existing tests, unchanged
mode pins and the 30/60/144 FPS comparison. No existing assertion/input/pin,
production file, progression file or contact design was changed. This is
pre-fix acceptance evidence, not a lane/build/full gate or browser verdict.

### Removed — this narrow tests-first follow-up

Nothing. Only the new acceptance check and its evidence are added.

## Narrow sudden-death proof fixed

After tests-first red `9759af4`, only the Fuel finish validator changes:
sudden death cannot have a nonwinner at five deliveries, because that fifth
delivery would already have ended the event. The declared next-delivery winner
can still have a lower score than the previous leaders. Nonwinner ordering
and all prior score/type/time rules remain intact. App, progression, render,
feature switches and contact behavior are unchanged.

Focused Fuel plus existing arena/Warlord economy and fabricated-save guards
pass **147/147 tests, zero skips; exit 0**. Fuel accounts for **59/59 tests and
1400 checks**, including rejection of the forged [1, 5, 0] result with no award
or receipt, and acceptance of the actual [2, 2, 1, 0] lower-scoring next-delivery
winner. All prior assertions, inputs, mode fingerprints and the actual
30/60/144 FPS comparison remain unchanged.

Per the Director's narrow follow-up, no broader browser or gate was repeated
for this pure validator change. The private `browser-save-fixed` evidence for
`e20470ab` still records the actual newer-owner 2000-credit / 340-scrap / engine-1
Retry proof; that App path did not change. Fresh Save Guardian review, current
mandatory gates and Claude's contact decision remain pending. This is a held
review candidate, not an integration merge or release.

### Removed — narrow proof fix

Replaced the permissive sudden-death nonwinner condition in the same change.
No assertion, input, replay pin, runtime asset or audio source was changed or
removed.

## Director held-review checkpoint

Synced the integrated SAVE-DAMAGED-FIELDS fix and current card ownership.
The narrow validator review clears prior P2 on source24a27af9:123/123
independent tests,280 sudden-death score combinations and nine proof controls
pass. Impossible nonwinner-five results pay nothing; real lower-scoring
next-delivery winner remains valid. App hash is unchanged from the current
durable retry/browser review:2000 credits,340 scrap,engine1,one write.
After integration sync, all59 Fuel tests/1400checks,86 damaged-field tests/
3654checks,sevenfixtures/247checks and build pass. No old assertion or pin
changed. No new whole lane/full tier, audio or visual clearance is claimed.
Fighter projectile contact rules still await Claude; this is a clean retained
partial review candidate, not ready to merge or release.

## Tests first — durable launch eligibility and stationary Fuel view

On clean held source `2d29b2f900e6898a925b8e64b7299e93a0de6b8a`, the
Director assigned two independently reviewed P2 findings. Only new acceptance
checks are added to the existing NEW Fuel suite. Production, existing
assertions, fixed-step inputs and replay pins are unchanged.

The actual memory-only App starts in a discovered rank-six yard. A fabricated
other-tab registry update changes that same named owner's durable XP to 2,500
and rank to five, or removes discovery. Fuel launch must refuse before changing
the Duel state object or any field, run ID, owner, seed, serial, settlement
receipt/retry context or durable storage bytes. The current normal profile
refresh may adopt the newer owner's 8,765 credits and unknown field; the new
checks also verify that adoption. Positive controls accept a newer discovered
rank-six owner and preserve the existing `profileSaved === false` guard after
actual synthetic atomic save failures, for both locally eligible and locked
session ranks. Launch alone must not write a receipt or registry.

The view checks use the actual Three Fuel scene and instance buffers. Only
unavailable Canvas2D label drawing is substituted in Node. A warmed stationary
view receives 144 real updates with four unchanged loose canisters and must
make zero `course.groundAt` calls. Matrix/color attributes, their arrays,
geometry, mesh identity and actual instance poses stay stable; rendering must
leave the race state unchanged.

Separate real-engine creation, five-second refill and qualifying armor-hit
drop controls verify the correct new canister ID/pose with the existing
presentation lift. A second identical Duel without the view proves that event
presentation changes no simulation field. View updates must use already
prepared poses and reuse the same instance resources. No particular new event
name or cache API is required: fixed pad ground poses may be cached at
initialization for refill, and the existing `fuelDrop` event may update drop
poses. These tests do not require a `fuelRefill` emit or a simulation change.

Command: `node --test --test-reporter=tap tools/test-arena-fuel-run.mjs`.
Pre-fix result: **68 tests, 62 passed, 6 failed, zero skipped; 1,537 acceptance
checks reached; exit 1**. All 59 prior Fuel checks pass, including the unchanged
mode fingerprints and actual 30/60/144 FPS comparison. The three new positive
eligibility/session-save controls pass. Exact first failures:

| New check | First failure | Observed / required |
| --- | --- | --- |
| Newer durable rank lock | newer durable rank lock must refuse Fuel before starting or seeding an event | true / false |
| Newer durable discovery lock | newer durable discovery lock must refuse Fuel before starting or seeding an event | true / false |
| Stationary 144-frame view | 144 steady Fuel view updates must make zero groundAt calls for unchanged loose fuel | 576 / 0 calls |
| Actual creation | creation ground poses must be prepared at the actual event before rendering | 4 / 0 calls |
| Actual refill | refill ground poses must be prepared at the actual event before rendering | 4 / 0 calls |
| Actual drop | drop ground poses must be prepared at the actual event before rendering | 4 / 0 calls |

Before each lifecycle allocation failure, the real pose, unchanged race-state
and stable-buffer controls pass. These are observed rule/rendering defects,
not missing-module, canvas or fixture failures. No browser, build, full tier or
contact-design clearance is claimed.

### Removed — durable eligibility/view tests-first follow-up

Nothing. This follow-up adds acceptance and its red evidence only.

Coverage decision: automatic approval rejected a proposed removal of the two
new post-rejection profile-adoption checks as test weakening. No removal or
retry occurred. The Director explicitly accepted the retained stronger
contract: the existing durable refresh adopts the same owner's newer credits
and unknown field while refusing the launch. All acceptance remains intact.

## Durable launch gate and event-owned presentation cache fixed

After independent tests-first freeze 3c67fe4, Fuel performs one authoritative
existing owner refresh before its rank, discovery and switch checks inside
_startArenaFight. Rejection happens before run IDs, seeds, receipts, retries
or race state change. Newer durable credits and unknown fields are adopted
by the existing refresh. Its failed-save session guard remains intact.
Last Car Rolling and Warlord keep their previous refresh position.

Fuel presentation caches each fixed pad ground pose during initialization.
Existing pickup, drop and delivery events prepare loose-canister poses in
the view; a refill uses its already prepared pad pose. The render loop does
not call groundAt, create pose objects or put caches into race state. Real
creation/refill/drop pose and twin-engine checks preserve all mesh, geometry,
matrix and color buffer identities. No new simulation event or sound cue is
needed.

Focused acceptance passes 68/68 tests with zero failures or skips; all 59
prior tests, unchanged-mode fingerprints and actual 30/60/144 FPS controls
remain unchanged. The switch suite passes its 27 checks. Existing arena
settlement, Warlord settlement/pay and progression controls pass 64/64.
The isolated lane build passes, 246 modules, 0.524 seconds; the existing
large-chunk warning remains. Commands were node --test --test-reporter=dot
with the named suites, node tools/test-feature-flags.mjs and npm run build.
Independent narrow code and Save Guardian re-review are still required.
No whole-lane/full, fresh browser or final feature merge verdict is claimed.
Claude's fighter-contact design lane has not merged; that implementation
and final gameplay/audio/look checks remain held.

### Removed — durable launch and render cache

Replaced Fuel's stale pre-refresh launch check and repeated render-time
ground sampling. No existing test assertion, replay pin, storage key, save
schema, runtime or licensed asset was changed or removed.

## Narrow follow-up review at 53e6796

Independent code review passes 10 checks with 162 assertions for the durable
launch gate and event-owned render cache. Save Guardian passes 77 tests and
six additional actual memory-only App probes. Each launch performs one
existing owner refresh and zero writes. Refusal preserves race state, event
IDs, seeds and settlement context; the newer profile retains its credits and
unknown fields. Failed-save session guards remain intact. The settlement and
retry bodies are unchanged by this follow-up.

These reviews cover source commit
53e67964fb3e5c1f2a2c75d4ca087b1b8306cb08. They clear the two measured
findings, not the complete Fuel Run feature. Earlier browser evidence covers
an earlier source commit. Fresh browser, gameplay, sound and look checks, the
whole lane/build floor and a complete independent review still follow the
fighter-contact implementation. Claude's design branch has not merged, so
contact code and the feature merge remain paused. No real save is used.

### Removed — narrow review

Nothing. Current recipes, retained acceptance and source fingerprints remain.


## Settled fighter contacts and four-metre depot: tests-first freeze

Claude's design merged before this work. docs/CREW.md, "Car weapons against
fighters on foot", fixes car bolts at 35 health, car splash at up to 60 with
the existing radial falloff, knockdown strictly inside half the blast radius,
and fighter cargo loss only on knockdown. SCRAPDOME section 10 raises the
Fuel depot from two to four metres. This freeze adds acceptance only; source
at the red run is 70c2c507c69e0fda53291389ff0282d19f64a4eb.

The two new suites run the real Duel entry, a real 0.4-second F exit,
actual projectile sweeps and expiry, generated raiders, the event's physical
canisters and actual Three depot geometry. Incoming contacts cover both
Fuel Run and ordinary discovered Wasteland. Direct projectile steps isolate
contact rules; two additional native Duel.step checks prove fight integration.
Splash health checks use an explicit 0.005-health tolerance for the existing
player/raider body centres (.85 to 1 m), without imposing a new private
centre. Half- and three-quarter-radius damage separately recover the maximum
of 60 from actual health removed, within 0.02 health. Centre and .499-radius
knockdowns are checked separately from surviving .5-radius damage, for both
base and upgraded bomb radii. The radius edge stays zero damage. No public
geometry tuning changes.

Positive controls retain physical player and later CPU car armor hits,
body misses, friendly teams, victim/owner respawn protection, radius-edge
misses and enemy depots. Rook keeps native 110 health; base crew keep 100;
generated raiders keep 70. The test does not create future computer-crew
fighter state: CREW-04 must apply these settled shared rules once its actual
exit contract exists. Dune signature gear also remains CREW-02's scope.

An actual parked-car bomb removing more than 25 armor currently emits a
fuelDrop for a standing carrier. The test asserts the emitted event and
ownership before another Fuel step, so immediate recollection cannot hide
that unwanted drop. Knockdown checks require one actual drop at the fighter
pose, unchanged three-second recovery, and no recovery restart.

New command: node --test --test-reporter=tap
 tools/test-onfoot-car-contacts.mjs tools/test-arena-fuel-depot.mjs.
Result: **74 tests, 25 passed, 49 failed, zero skipped; 361 checks reached;
exit 1.** Contact suite: 57 tests, 19 passed, 38 failed, 288 checks.
Depot suite: 17 tests, six passed, 11 failed, 73 checks. Each failure below
is the actual first failing assertion on that scenario, after native fixture
controls pass. No missing-module or unsupported roster fixture failure is
counted.

| Failing scenario | Actual first failure message |
| --- | --- |
| the settled depot radius is four metres | Claude review raises every depot from two to four metres 2 !== 4 |
| player delivers real car cargo inside the enlarged radius 2.001 | native delivery scores at every point inside four metres 0 !== 1 |
| player delivers real car cargo inside the enlarged radius 3.999 | native delivery scores at every point inside four metres 0 !== 1 |
| cpu-1 delivers real car cargo inside the enlarged radius 2.001 | native delivery scores at every point inside four metres 0 !== 1 |
| cpu-1 delivers real car cargo inside the enlarged radius 3.999 | native delivery scores at every point inside four metres 0 !== 1 |
| cpu-2 delivers real car cargo inside the enlarged radius 2.001 | native delivery scores at every point inside four metres 0 !== 1 |
| cpu-2 delivers real car cargo inside the enlarged radius 3.999 | native delivery scores at every point inside four metres 0 !== 1 |
| cpu-3 delivers real car cargo inside the enlarged radius 2.001 | native delivery scores at every point inside four metres 0 !== 1 |
| cpu-3 delivers real car cargo inside the enlarged radius 3.999 | native delivery scores at every point inside four metres 0 !== 1 |
| actual fighter depot boundary at 3.999 metres | the same four-metre rule reads the actual fighter pose 0 !== 1 |
| actual Three depot rings and bases show four metres without changing race state | 'actual visible depot ring reaches four metres: expected 4, received 2' |
| fuel-run: swept incoming car bolt removes 35 health from the fighter, not parked armor | a real car bolt removes exactly 35 fighter health 100 !== 65 |
| fuel-run: three bolts knock a base-health fighter down, without an early knock | successive real bolts use the settled 35-health damage 100 !== 65 |
| fuel-run: bomb level 0 at radius share 0.5 uses car falloff on fighter health | 'car splash removes up to 60 health using the existing linear radial falloff: expected 70, received 100' |
| fuel-run: bomb level 0 at radius share 0.75 uses car falloff on fighter health | 'car splash removes up to 60 health using the existing linear radial falloff: expected 85, received 100' |
| fuel-run: bomb level 0 at radius share 0.999 uses car falloff on fighter health | 'car splash removes up to 60 health using the existing linear radial falloff: expected 99.94, received 100' |
| fuel-run: bomb level 0 inside half radius 0 knocks down | a fighter strictly inside half the upgraded blast radius is knocked down false !== true |
| fuel-run: bomb level 0 inside half radius 0.499 knocks down | a fighter strictly inside half the upgraded blast radius is knocked down false !== true |
| fuel-run: bomb level 3 at radius share 0.5 uses car falloff on fighter health | 'car splash removes up to 60 health using the existing linear radial falloff: expected 70, received 100' |
| fuel-run: bomb level 3 at radius share 0.75 uses car falloff on fighter health | 'car splash removes up to 60 health using the existing linear radial falloff: expected 85, received 100' |
| fuel-run: bomb level 3 at radius share 0.999 uses car falloff on fighter health | 'car splash removes up to 60 health using the existing linear radial falloff: expected 99.94, received 100' |
| fuel-run: bomb level 3 inside half radius 0 knocks down | a fighter strictly inside half the upgraded blast radius is knocked down false !== true |
| fuel-run: bomb level 3 inside half radius 0.499 knocks down | a fighter strictly inside half the upgraded blast radius is knocked down false !== true |
| wasteland: swept incoming car bolt removes 35 health from the fighter, not parked armor | a real car bolt removes exactly 35 fighter health 100 !== 65 |
| wasteland: three bolts knock a base-health fighter down, without an early knock | successive real bolts use the settled 35-health damage 100 !== 65 |
| wasteland: bomb level 0 at radius share 0.5 uses car falloff on fighter health | 'car splash removes up to 60 health using the existing linear radial falloff: expected 70, received 100' |
| wasteland: bomb level 0 at radius share 0.75 uses car falloff on fighter health | 'car splash removes up to 60 health using the existing linear radial falloff: expected 85, received 100' |
| wasteland: bomb level 0 at radius share 0.999 uses car falloff on fighter health | 'car splash removes up to 60 health using the existing linear radial falloff: expected 99.94, received 100' |
| wasteland: bomb level 0 inside half radius 0 knocks down | a fighter strictly inside half the upgraded blast radius is knocked down false !== true |
| wasteland: bomb level 0 inside half radius 0.499 knocks down | a fighter strictly inside half the upgraded blast radius is knocked down false !== true |
| wasteland: bomb level 3 at radius share 0.5 uses car falloff on fighter health | 'car splash removes up to 60 health using the existing linear radial falloff: expected 70, received 100' |
| wasteland: bomb level 3 at radius share 0.75 uses car falloff on fighter health | 'car splash removes up to 60 health using the existing linear radial falloff: expected 85, received 100' |
| wasteland: bomb level 3 at radius share 0.999 uses car falloff on fighter health | 'car splash removes up to 60 health using the existing linear radial falloff: expected 99.94, received 100' |
| wasteland: bomb level 3 inside half radius 0 knocks down | a fighter strictly inside half the upgraded blast radius is knocked down false !== true |
| wasteland: bomb level 3 inside half radius 0.499 knocks down | a fighter strictly inside half the upgraded blast radius is knocked down false !== true |
| Rook keeps 110 health: three 35-health car bolts leave five health, fourth knocks down | car contact does not erase the existing Rook health perk 110 !== 75 |
| Fuel carrier: a surviving 35-health body bolt keeps cargo with the real fighter | the actual carrier is no longer immune to car bolts 100 !== 65 |
| Fuel carrier: surviving outer splash keeps cargo | 'half-radius splash removes 30 health without knockdown: expected 70, received 100' |
| Fuel carrier: third-bolt drops cargo once at the fighter pose | actual projectile contacts knock the carrier down false !== true |
| Fuel carrier: inner-bomb drops cargo once at the fighter pose | actual projectile contacts knock the carrier down false !== true |
| Fuel carrier: more than 25 armor lost by its distant parked car does not drop fighter cargo | a parked-car hit never emits a drop for a standing on-foot carrier 1 !== 0 |
| ordinary Wasteland: car crossbow strikes a real generated raider body for 35 health | actual car bolt applies the same 35-health rule to a generated raider 70 !== 35 |
| ordinary Wasteland: car bomb splash reaches real raider at 0.5 radius | 'raiders take the same native car-splash health falloff: expected 40, received 70' |
| ordinary Wasteland: car bomb splash reaches real raider at 0.75 radius | 'raiders take the same native car-splash health falloff: expected 55, received 70' |
| ordinary Wasteland: inner car bomb knocks a generated raider down with its existing recovery | inside half radius car splash also knocks raiders down false !== true |
| a second car bolt cannot damage or restart recovery of an already knocked fighter | real first incoming bolt knocks a low-health fighter down false !== true |
| fuel-run: the actual Duel step resolves incoming fighter contact | native fight integration applies the settled car bolt to the real fighter 100 !== 65 |
| wasteland: the actual Duel step resolves incoming fighter contact | native fight integration applies the settled car bolt to the real fighter 100 !== 65 |
| ordinary Wasteland: two car bolts knock the native 70-health raider down | the real raider retains native health and the same 35-health car bolt 70 !== 35 |

Existing command: node --test --test-reporter=tap tools/test-arena-fuel-run.mjs.
All **68/68** existing Fuel tests pass, zero skipped, including the existing
unchanged-mode fingerprints, actual 30/60/144 FPS checks, durable eligibility,
one-time settlements and read-only presentation cache checks. Existing
assertions and replay JSON remain byte-for-byte unchanged. No browser,
whole-lane gate, implementation or merge clearance is claimed by this freeze.

### Removed — settled contact/depot red tests

Nothing. This adds two test suites and their red evidence. No simulation,
save, runtime asset, audio bank, assertion, replay pin or world signature
was changed or regenerated. Licensed originals and current game assets stay.

## Settled contact/depot implementation — current candidate

Built after independent RED freeze 4a2ee897b0423afdb4beb0cf7c2924afafa2b00a.
Car crossbow sweeps now compare the current player's real fighter body using
FIGHTER_RULES (0.34 m radius, 1.7 m height), and generated raiders using their
existing body geometry. The earliest physical car or fighter contact consumes
the bolt once. Car bolts remove 35 fighter health without a forced knockdown;
actual exhausted health uses the existing three-second recovery. Native crew
health, including Rook's 110, remains. Car bomb splash removes up to 60 health
with the existing linear radial falloff and each current upgraded radius;
strictly inside half the radius also knocks the fighter down. Existing RPG
contacts, vehicle armor hits and ordinary projectile ownership remain.

Participant team and owner/victim respawn guards apply to fighter contacts.
The standing fighter's cargo no longer reads the parked car's armor loss or
wreck. Its own knockdown drops the physical canister once at its own pose;
carrying in the occupied car retains the existing heavy-hit/wreck rule.

The depot rule is 4 m in both simulation and actual Three ring/base geometry.
The yellow pickup markers keep their prior outer radius 1.3 m, inner radius
1.157 m and base height 0.052 m. Separate reusable pickup geometries are made
once and disposed once; delivery geometry still reads the shared FUEL_RULES.
No new geometry, material or ground sampling is added during rendering.

Body hits emit the existing combatHit event, mapped to combat.hit; bombs keep
the established combat.blast path. Fuel pickup/drop/delivery retain
interface.bonus, vehicle.landing and interface.go. No audio bank or asset was
changed. Fresh actual listening remains a whole-card gate. Future CREW-04
computer exits must join this shared settled path when their real state exists;
this work adds no invented computer fighter state or signature gear.

### Verification on this source

Command: node --test --test-reporter=tap tools/test-onfoot-car-contacts.mjs
 tools/test-arena-fuel-depot.mjs tools/test-arena-fuel-run.mjs
 tools/test-combat-projectiles.mjs tools/test-combat-projectile-order.mjs
 tools/test-combat-replays.mjs tools/test-onfoot.mjs
 tools/test-onfoot-transition.mjs tools/test-onfoot-race.mjs
 tools/test-onfoot-weapons.mjs tools/test-raiders.mjs
 tools/test-combat-field-shields.mjs tools/test-arena-settlement.mjs
 tools/test-warlord-pay.mjs tools/test-warlord-settlement.mjs
 tools/test-feature-flags.mjs.

Result: 276 tests pass, zero failures or skips. The new contact suite reaches
397 checks, the depot suite 107, and all 68 existing Fuel tests reach 1,552.
The frozen contact/depot assertions, every existing Fuel assertion, its five
mode-control fingerprints and actual 30/60/144 FPS checks are unchanged.
Separate node tools/test-replays.mjs passes all 162 ordinary fingerprints
without regeneration. Existing combat replay checks also pass unchanged.
No App, storage, settlement or reward source was edited by this follow-up.

Two additional actual regressions were proved red before their fixes in
disposable memory-only probes under .evidence/2026-09-30/ARENA-03:

- parked-wreck-splash-probe.mjs uses an actual F exit, parked armor 1 and
  an expired enemy bomb at the real fighter. The initial helper borrowed the
  car's invulnerableSec: the same blast wrecked the car, gave it 4 s recovery
  protection and left the fighter at 100 health. After removing that borrowed
  car-only timer, the same blast still wrecks the car and knocks the fighter
  down to zero health. Actual participant respawn guards remain.
- pickup-pad-view-probe.mjs uses the real Fuel view and Three geometry. The
  shared depot change first grew pickup rings/bases to 2.6 m. Separate reusable
  geometry retains all four native pickup marker measurements above, while
  every actual depot still measures 4 m in the frozen suite.

Rebuildable measureFuelRounds() from tools/scenarios/arena-fuel-run.mjs runs
seeds 1989 and 77123 at each difficulty using real input, CPU pilot, canisters
and delivery rules. All six finish at five deliveries in 46.59–104.33 s.
Collectors win five and a rammer wins one. Aggregate: 82 pickups, 23 drops,
56 deliveries and three wall-hit events. This is a completion smoke sample,
not a human win-rate verdict. These new Fuel traces reflect the intentional
depot change; no existing replay file was replaced.

| Difficulty / seed | Seconds | Winner | Trace SHA-256 |
| --- | ---: | --- | --- |
| easy / 1989 | 64.67 | cpu-1 | a3cf98cb1cb485b6011bfa4531fbea452612d2e0043a0cdfaa193288125d978f |
| easy / 77123 | 46.59 | cpu-1 | 5d2ef81c404af20efced172ccd5b42a150efa7d5015af0d97e57ba326464e303 |
| medium / 1989 | 64.12 | cpu-1 | 2ea130095e58b99be337f22caac0255f3cd409af3518ddc3b8ccaf5cb874ee34 |
| medium / 77123 | 94.66 | cpu-1 | c13523a2063ff2f083df40267afb63218ab7bf77554c9e711b073edd481fa7c1 |
| hard / 1989 | 104.33 | cpu-2 | 580b2e160c740650ca5ad2d9ae651f3c1cd86a3ba89ed5e4136ca0245b7f9c87 |
| hard / 77123 | 97.63 | cpu-1 | 84775f93a4fc5a2335c9a1442bb4563b5b32c808bc673a91dd841d376c91a9d8 |

| Current source | SHA-256 |
| --- | --- |
| src/combat-projectiles.js | 77bd0d8bf846eed114660012bf22704564303be68777be7c09d78899d6f5406b |
| src/arena/modes/fuel-run.js | d7bf8b46872b921f27320950421e8cedc506ba2d4d3a7cd9a37a634bd7d0335e |
| src/arena/modes/fuel-run-view.js | 0919b28384deef5706eb0441279a721948877093806218bb6bfa9f1dd124ca03 |

### Remaining review and gates

The current code reuses damageRaider for real raider health, knockdown, recovery
and one-time award handling. That existing helper labels its award source
onFoot; independent review must check whether the new car contact needs a
source-tag follow-up before merge. No raider reward rule was redesigned and
raiders.js remains outside this slice.

This freeze grants no current whole-lane, build, browser, sound, complete
Save Guardian or Claude merge clearance. The Director owns those next gates.
No live folder, Preview, port 5174, real save, runtime dependency, world
signature or protected audio source was touched.

### Removed — current contact/depot implementation

Replaced the 2 m depot boundary with 4 m. Removed parked-car armor/wreck
conditions from standing fighter cargo, and the transient borrowed car
recovery guard from new fighter contacts. Pickup markers retain their original
geometry. No old assertion, replay pin, current game asset, licensed original,
save key or save schema was removed or changed.


## Independent red follow-up: car attribution and standing-carrier targeting

Two independent review findings are reproduced on source 38ec12eb859b0333808b2c8e7090e6f844e37ef8.
The Director claimed the two new suites in b5132f9 before work. The held Fuel
lane ordinarily merged that integration claim, without rebasing or rewriting
history. This freeze adds tests only; prior source and frozen acceptance stay.

### Car knockdowns and the existing eligible XP award

The actual player remains in its occupied car while fireWeapon creates two
real car crossbow projectiles. A controlled swept path crosses one real
seeded 70-health raider; the native four-second combat cooldown update makes
the second shot legal. No direct damageRaider call or fake reward event is
used. The actual contact currently reports a player knockdown with no source
in its gameplay event, labels the award onFoot, promises +25 NOTORIETY,
and banks that false on-foot award through combatNotoriety and settleRace.
The actual completed Duel result supplies the settled combat snapshot.

SPEC 3.8 gives raider knockdowns 25 XP. RAID-02's current written card records
one player-RPG award per raider per race, and the existing accepted XP filter
requires owner player and source onFoot. This follow-up preserves that filter
and adds no car bonus. Genuine native F exit, RPG input/launch, three-second
recovery, no recovery restart and repeated-result receipts remain positive
controls. Real foot-first recovery cannot farm another award.

The Director interprets the existing entitlement as the first eligible
on-foot knockdown: an ineligible car action must not consume it. The added
car-first test uses actual three-second raider recovery, a real 48-step F
exit and native RPG launch on the same raider, and requires a newly eligible
onFoot record and truthful first-eligible callout. A later genuine RPG down
must not duplicate it; real settlement keeps exactly 25 raider XP. No explicit
contradictory design text was found. This preservation interpretation is
recorded for Claude's required whole-card review before any feature merge.

### Standing carrier and the physical parked wreck

A genuine 48-step F exit and native pad pickup establish the actual fighter,
physical canister and participant. One native hostile car bolt against parked
armor 1 wrecks that car. The fighter remains standing at 100 health and keeps
its cargo. Physical outOfPlay must still return true for the actual parked
wreck. Medium and Hard hunter/rammer checks require the real selection,
brain, pursuit goal, arena weapon target, native crossbow launch and guidance
to follow this standing carrier. The current car-only guards incorrectly drop
all those paths.

Native healthy-car controls prove the existing seeded CPU crossbow actually
hits this fighter. Explicit launch/hit checks use eight metres so the unchanged
Medium/Hard spread fits the real body; scheduled weapon/range and moved-fighter
guidance checks keep their original forty-metre setup. No aiming spread,
weapon range or physical-car hitbox is changed by these tests. Actual knocked
down, participant-protected, delivered/no-cargo and friendly controls exclude
targets. The downed-fighter exclusion is checked before the native Fuel step
clears cargo, and weapon exclusions are checked before the brain clears its
target. Native Last Car Rolling still excludes a real physically wrecked car.

### Final native red verdict and unchanged controls

Command: node --test --test-reporter=tap tools/test-fuel-car-attribution.mjs
 tools/test-fuel-standing-carrier.mjs.
**36 tests, 10 passed, 26 failed, zero skipped, 618 checks reached; exit 1.**
Car attribution: ten tests, three passed, seven failed, 225 checks.
Standing carrier: 26 tests, seven passed, 19 failed, 393 checks.
Every first failure below follows passing native fixture controls; full
simulation dumps are not retained as verdict prose.

| Failing scenario | Actual first assertion message |
| --- | --- |
| actual car-to-raider knockdown has accurate car attribution in its gameplay event | the real car knockdown event identifies a car source |
| actual car-to-raider contact never creates a false on-foot XP event | a car bolt cannot label its raider knockdown as an on-foot award |
| a car raider knockdown does not display a false +25 Notoriety promise | a real car raider hit never promises the excluded on-foot +25 XP |
| the actual XP filter excludes real car raider events while keeping normal finish and win XP | the existing on-foot XP filter excludes the actual car-caused knockdown |
| native finish and real settlement never bank fake on-foot raider XP from car bolts | real settlement excludes the false on-foot award from actual car hits |
| car bolt recovery cannot farm a false on-foot XP award | repeated real car knockdowns never farm an on-foot award |
| an ineligible car knockdown preserves the first genuine on-foot award after actual recovery | an ineligible car knockdown cannot consume the first genuine on-foot XP entitlement |
| medium hunter: target selection retains the actual standing carrier after its parked car wrecks | CPU selection still targets the standing fuel carrier despite its parked wreck |
| medium hunter: actual brain and pilot goal follow the standing carrier after its parked wrecks | the real Fuel brain cannot discard a standing carrier because its car is wrecked |
| medium hunter: native arena weapon target retains the carrier while physical car stays out of play | the native arena weapon target still identifies the standing carrier participant |
| medium hunter: actual CPU crossbow fires and aims at the standing carrier after parked-car wreck | native CPU crossbow can fire at the standing carrier despite its parked wreck |
| medium rammer: target selection retains the actual standing carrier after its parked car wrecks | CPU selection still targets the standing fuel carrier despite its parked wreck |
| medium rammer: actual brain and pilot goal follow the standing carrier after its parked wrecks | the real Fuel brain cannot discard a standing carrier because its car is wrecked |
| medium rammer: native arena weapon target retains the carrier while physical car stays out of play | the native arena weapon target still identifies the standing carrier participant |
| medium rammer: actual CPU crossbow fires and aims at the standing carrier after parked-car wreck | native CPU crossbow can fire at the standing carrier despite its parked wreck |
| hard hunter: target selection retains the actual standing carrier after its parked car wrecks | CPU selection still targets the standing fuel carrier despite its parked wreck |
| hard hunter: actual brain and pilot goal follow the standing carrier after its parked wrecks | the real Fuel brain cannot discard a standing carrier because its car is wrecked |
| hard hunter: native arena weapon target retains the carrier while physical car stays out of play | the native arena weapon target still identifies the standing carrier participant |
| hard hunter: actual CPU crossbow fires and aims at the standing carrier after parked-car wreck | native CPU crossbow can fire at the standing carrier despite its parked wreck |
| hard rammer: target selection retains the actual standing carrier after its parked car wrecks | CPU selection still targets the standing fuel carrier despite its parked wreck |
| hard rammer: actual brain and pilot goal follow the standing carrier after its parked wrecks | the real Fuel brain cannot discard a standing carrier because its car is wrecked |
| hard rammer: native arena weapon target retains the carrier while physical car stays out of play | the native arena weapon target still identifies the standing carrier participant |
| hard rammer: actual CPU crossbow fires and aims at the standing carrier after parked-car wreck | native CPU crossbow can fire at the standing carrier despite its parked wreck |
| medium: native scheduled CPU attack still fires at standing carrier beside its parked wreck | 'the actual scheduled CPU attack uses the standing carrier and emits its real crossbow' |
| hard: native scheduled CPU attack still fires at standing carrier beside its parked wreck | 'the actual scheduled CPU attack uses the standing carrier and emits its real crossbow' |
| an already-fired CPU bolt still guides toward the moved carrier after the parked car wrecks | 'actual in-flight bolt guidance continues toward the moved standing carrier' |

The prior commands remain unchanged: node --test --test-reporter=tap
 tools/test-onfoot-car-contacts.mjs tools/test-arena-fuel-depot.mjs
 tools/test-arena-fuel-run.mjs tools/test-notoriety.mjs tools/test-raiders.mjs.
**156/156 pass**, zero skipped. All five suites and the existing Fuel replay
JSON are byte-identical to this source. No fingerprint is regenerated, no
existing assertion changes, and no source file is edited. Tests use isolated
Duel state and freshly fabricated profiles; no real storage is accessed.
No whole-lane/build, browser, Save Guardian or Claude merge clearance is
claimed by this red freeze.

| New frozen suite | SHA-256 |
| --- | --- |
| tools/test-fuel-car-attribution.mjs | 0da0ab8c095741b175ca1c2bee30bb222f8ec1de00616a8d8406bba81e82b88a |
| tools/test-fuel-standing-carrier.mjs | f92b26e339935f1b319bbe263f73b975f335133561b97c311d09bbc2e42531fe |

### Removed — attribution and standing-carrier red follow-up

Nothing. The two claimed suites and this failure record are new. Existing
simulation, reward filter, settlement, save format, assets, audio, prior
assertions, replay pins and world signatures remain unchanged.

## Reviewed attribution and standing-carrier fixes — current source

Built after independent RED freeze 6c40a77b02300813ef6a2ed95302b565572ebe47:
36 tests reached 618 checks, with 10 passes and 26 meaningful failures.
The new attribution/carrier suites, prior contact/depot acceptance, old
assertions and all replay pins remain byte-for-byte unchanged.

### Accurate car damage and first eligible on-foot XP

Car crossbow/bomb contacts now pass source car and the actual owner to
damageRaider. Hit and knockdown gameplay events report that provenance.
A car knockdown emits no false onFoot award or +25 Notoriety promise.
The existing once-per-raider physical knockdown counter is separate from
the first eligible on-foot award. An ineligible car down does not consume
the on-foot entitlement. After native three-second recovery, a genuine
F-exit/RPG down earns the existing first 25 XP; later recovery/down and
repeated settlement cannot farm it. The existing XP filter, reward amount,
result receipts, progression and save schema are unchanged.

RAID-02's accepted foot-only entitlement and the Director's preservation
interpretation remain subject to Claude's required whole-card review. This
adds no new car XP award. Existing genuine RPG callers retain the established
onFoot provenance and physical recovery behavior.

### Hunt the actual standing Fuel carrier

The shared arenaTargetOutOfPlay check reads the actual Fuel participant and
current fighter. A carrier remains available while its parked car wrecks;
knockdown, protection, no cargo, finished/crushed state and hostile-team
guards exclude it. Brain selection, pursuit/retargeting, the native arena
weapon target, crossbow launch and in-flight guidance share that check.
A stale friendly target is dropped immediately in Fuel.

The physical outOfPlay function and actual car hitboxes are unchanged.
Outside Fuel, target availability delegates to the previous car rule;
ordinary/non-Fuel crossbow launch and guidance retain their prior guards.
No invented computer fighter state, tuning, difficulty spread, weapon range
or simulator randomness was introduced. The real Medium/Hard hunter and
rammer can launch a bolt that hits the standing fighter, and the actual
weapon scheduler and moved-carrier guidance still follow its current pose.

### Verification

Command: node --test --test-reporter=tap tools/test-fuel-car-attribution.mjs
 tools/test-fuel-standing-carrier.mjs tools/test-onfoot-car-contacts.mjs
 tools/test-arena-fuel-depot.mjs tools/test-arena-fuel-run.mjs
 tools/test-notoriety.mjs tools/test-raiders.mjs.
Result: 192 tests pass, zero failures or skips. This includes all 36 new
regressions and all 156 prior controls. The new attribution suite reaches
242 checks and standing-carrier suite 437; current contacts reach 397,
depots 107, and existing Fuel tests retain their 30/60/144 FPS and mode pins.

Additional command: node --test --test-reporter=tap
 tools/test-combat-projectiles.mjs tools/test-combat-projectile-order.mjs
 tools/test-combat-replays.mjs tools/test-enemy-aim.mjs tools/test-onfoot.mjs
 tools/test-onfoot-transition.mjs tools/test-onfoot-race.mjs
 tools/test-onfoot-weapons.mjs tools/test-combat-field-shields.mjs
 tools/test-arena-event.mjs tools/test-arena-feel.mjs tools/test-sal-fight.mjs
 tools/test-arena-settlement.mjs tools/test-warlord-pay.mjs
 tools/test-warlord-settlement.mjs tools/test-feature-flags.mjs.
Result: 170 tests pass, zero failures or skips. Existing combat replays,
Sal, arena targeting, on-foot physics, damage guards, settlement and
feature switches pass without changed assertions.

Separate node tools/test-replays.mjs passes all 162 ordinary fingerprints
on the current source without regeneration. git diff --check passes.
Logs are disposable under .evidence/2026-09-30/ARENA-03.

| Current source | SHA-256 |
| --- | --- |
| src/arena/arena-brains.js | 2b33a9836553fd235441b279d8a8964256a49f2c9bc989682a4a8e2450991e18 |
| src/combat-teams.js | 477b75f8f41c8dad9647225dbc8a71da483d1060b0c817f02a600c589c010f15 |
| src/combat-weapons.js | 8edc3a6e3fb569ce757bedb86519575905fc23775b799529399cee02e3b2991a |
| src/combat-projectiles.js | f8b38e45adc212e7b0744613911476adf274e428152d284bb24d9af7f57189a4 |
| src/raiders.js | 515b728d1877e3d904d2c1dd54152fc8afd2664c12278804b0fee6aeab2add5e |

### Remaining gates and ownership

This clean freeze returns the candidate to the independent Reviewer and
Save Guardian. The Director owns exact lane/build, fresh browser/feel/audio,
Claude review and integration. No whole-card or merge clearance is claimed.
The granted raiders.js change is limited to damage provenance, separating
physical counting from eligible award consumption and truthful event/callout
handling. No App, economy filter, save source/schema, steering, art, audio bank,
live folder, Preview, port 5174, real save or world signature was edited.

### Removed — reviewed attribution and standing-carrier fixes

Removed the false onFoot provenance and +25 promise for car-caused raider
knockdowns, and the parked-car-only availability guards from Fuel target,
launch and guidance paths. Kept physical-car guards and the existing reward
filter. No frozen assertion, replay pin, runtime/licensed asset, storage key,
save schema, difficulty tuning or audio resource was removed or replaced.


### Independent player guard regression — tests-first freeze, 30 September 2026

RED production source: 88715915953db56e59dea06c4ba0829d5f7fb3cf. Added eight append-only native player
controls to tools/test-fuel-standing-carrier.mjs. The complete prior frozen
file remains a byte-identical prefix; no old helper, assertion or CPU no-cargo
control changed. No production source or replay pin was edited.

The computer hunter remains carrier-only under SCRAPDOME section 10.
The occupied player car retains its earlier physical-car attack eligibility.
The guidance reproduction starts with a native player launch at a CPU that
collected a real pad canister. A native level-three bomb removes 26.1 armor,
drops that actual canister and leaves the CPU physically healthy. Its already-
fired player bolt must still turn toward the moved car inside the unchanged
public homing cone. Cargo and events are never fabricated for this case.

Positive controls preserve player guidance while cargo is held, native launch
and guidance in Last Car Rolling, physical-wreck launch and guidance guards,
and actual projectile no-damage contacts with protected owner and target.
Protection controls test the established arenaDamageBlocked policy; they do
not invent a player launch or guidance prohibition. All 26 frozen Medium/Hard
CPU carrier, knockdown, friendly, no-cargo and parked-wreck controls pass.

Focused RED command: node --test --test-reporter=tap
 tools/test-fuel-standing-carrier.mjs
 tools/test-fuel-car-attribution.mjs
 tools/test-arena-fuel-run.mjs
 tools/test-combat-projectiles.mjs
 tools/test-enemy-aim.mjs.
Result: tests 148, pass 146, fail 2, skipped 0.
Standing-carrier suite alone: 34 tests, 32 pass, 2 fail, 531 acceptance checks
reached. Existing attribution, Fuel frame-rate/replay pins, projectile and
enemy-aim controls pass unchanged. The exact failure messages are:

- player crossbow launches at a healthy Fuel CPU without cargo: the occupied player car can launch its native crossbow at this physical CPU target
- already-fired player bolt keeps guiding after a native hit drops CPU cargo: actual in-flight PLAYER bolt keeps turning toward its healthy CPU after native cargo loss

The source worker may distinguish player physical targets from enemy carrier
targets in launch and guidance. Claude must review the whole card before merge;
this RED freeze does not claim lane/build, browser or merge clearance.

### Removed — player guard regression freeze

Nothing removed. These are append-only acceptance controls. No frozen assertion,
fingerprint, source, runtime asset, save, Preview or audio resource changed.


### Independent native-hit fixture correction — 30 September 2026

The two enemy-versus-player source guards are held unstaged by the worker.
They expose an unrelated fixture obstruction in the new noncarrier hit check.
An independent native simulation reproduced the review probe: player s=39.8,
CPU s=79.8, both lateral=-6. At tick 4 the real bolt is y=1.8537099385,
below the raised ramp floor y=1.8981294873. It is consumed 27.56146 m before
the CPU, so zero damage is correct for that obstructed path.

Changed only that new test's target pose to s=47.8, eight metres from the same
player. No existing assertion or helper changed. The same native player launch
now contacts the CPU at tick 2, removes exactly 12 armor, and records one
player scoring hit with damageDealt=12. The real projectile owner is player;
the CPU still has no cargo. Existing positive guidance, wreck/protection and
CPU carrier-only controls retain their previous fixtures and assertions.

Read-only RED witness: loaded the original combat-weapons.js from source
88715915953db56e59dea06c4ba0829d5f7fb3cf as an in-memory ES module, resolving
its relative imports to existing native modules. Against that same eight-metre
healthy no-cargo fixture, original fireWeapon returns false and emits zero
projectiles. No source file was replaced or reverted. This confirms the
fixture correction preserves the original player launch regression.

### Removed — native-hit fixture correction

Removed only the new hit control's obstructed forty-metre target placement.
Kept every original assertion, the eight new player behaviors, frozen CPU
helpers and controls, replay pins and production source unchanged.

Focused verification with the worker's two held guard edits: node --test
 --test-reporter=tap tools/test-fuel-standing-carrier.mjs. Result: all 34
 tests pass, zero failures, 535 acceptance checks reached. git diff --check
 passes. Byte comparison with freeze 42ffd63 proves the test file differs
 only by three fixture/comment lines; every assertion and helper is unchanged.
 No lane/build or whole-card merge clearance is claimed.

## Final narrow player guards and lazy raider count — current source

Built after independent player RED freeze 42ffd6341caa6ef0fad5d2b2fac2ad3cff00514d
and the reviewed native clear-line fixture correction at
48ae971c34255567d2a02bb5a9925f0b2763315b. No frozen helper or assertion was
changed by the source worker. The independent author proved the same corrected
8 m no-cargo pose still refuses launch on original 8871591 loaded in memory,
and that the restored native launch physically removes 12 armor. The original
40 m hit pose met a real raised ramp 27.56 m before the target; that fixture
correction changed placement only and is recorded above.

The source delta is limited to three lines:

- The carrier-aware Fuel launch check applies only when enemy is true.
- The corresponding Fuel bolt-guidance check applies only when projectile.enemy
  is true. The player's exact prior finished/crushed/combatWrecking checks and
  normal non-Fuel paths remain. CPU standing-carrier and no-cargo rules, physical
  damage protection, aim spread, weapon range and reward provenance remain.
- Removed only the eager knockdownCounted:false initializer from generated
  raiders. The existing lazy !raider.knockdownCounted check and true assignment
  at an actual eligible physical knockdown remain unchanged, as do every
  damage/recovery/award rule and the first eligible on-foot entitlement.

### Original full-state fingerprint: meaningful red then green

Independent review compared integration 86e1f3f and Fuel every 360 ticks in
the unchanged tools/test-onfoot-hints.mjs replay. The sole difference before
any damage/contact was nine eagerly added false raider properties. Removing
those properties from the review samples exactly restored the old full-state
pin. This source worker also ran the unchanged original test before editing:
14/15 checks passed, one failed. Actual wasteland/true fingerprint was
535de930230e76bd5d3a189c56449dcca59f854e2d874b0faf12cce61c44d24b
versus its original c0317a1bac65cfc107254bf6696218cf2c49944ecb7124a8ec69874979318552.

After removing that eager initializer, node tools/test-onfoot-hints.mjs
passes all 15/15 checks against the original recorded pin. Its test and
replay JSON were neither changed nor regenerated. Red/green logs are
raider-lazy-count-red.txt and raider-lazy-count-green.txt under the card's
disposable evidence folder.

### Final focused checks

Command: node --test --test-reporter=tap tools/test-fuel-car-attribution.mjs
 tools/test-fuel-standing-carrier.mjs tools/test-onfoot-car-contacts.mjs
 tools/test-arena-fuel-depot.mjs tools/test-arena-fuel-run.mjs
 tools/test-notoriety.mjs tools/test-raiders.mjs
 tools/test-combat-projectiles.mjs tools/test-combat-projectile-order.mjs
 tools/test-combat-replays.mjs tools/test-enemy-aim.mjs tools/test-onfoot.mjs
 tools/test-onfoot-transition.mjs tools/test-onfoot-race.mjs
 tools/test-onfoot-weapons.mjs tools/test-combat-field-shields.mjs
 tools/test-arena-event.mjs tools/test-arena-feel.mjs tools/test-sal-fight.mjs
 tools/test-arena-settlement.mjs tools/test-warlord-pay.mjs
 tools/test-warlord-settlement.mjs tools/test-feature-flags.mjs.
Result: 370 tests pass, zero failures or skips. The appended standing-carrier
file passes 34 tests and 535 checks, including all 26 original CPU controls
and all eight player controls. Car attribution passes ten tests and 242
checks; original contacts/depot/Fuel and nearby aim/projectile/order/arena,
Sal, reward, protection and actual 30/60/144 FPS controls pass unchanged.

Separate node tools/test-replays.mjs passes all 162 ordinary fingerprints.
No test assertion or replay pin was regenerated. git diff --check passes.
Focused logs are player-guard-lazy-count-focused.txt and
player-guard-lazy-count-replays.txt in .evidence/2026-09-30/ARENA-03.

| Current narrow source | SHA-256 |
| --- | --- |
| src/combat-weapons.js | b37efa29b8e9834886ed20dba8cf39a1c469e246608a108a839e030fa4e601ab |
| src/combat-projectiles.js | f36e7c9b109a72e15d0dc2b36ce05451a9ba0cffcbfd6fccdc78c63e3cad4747 |
| src/raiders.js | d0045f2216943659b82eb50fac55b2d52e40a6675742cd7d0f53d53bcb2b7c57 |

### Ownership and remaining gates

Only combat-weapons.js, combat-projectiles.js, raiders.js and this note belong
to this selective source freeze. The Director's unstaged
tools/scenarios/arena-fuel-run.mjs work is neither staged, changed nor reverted
by the source worker. Owned source files are clean after this commit; the
whole worktree retains that separately owned scenario edit. No heavy lane/full
gate was run here. Independent review, Save Guardian, exact lane/build, current
browser/feel/audio and Claude review remain the Director's merge gates.

### Removed — final narrow player guards and lazy count

Removed carrier-only eligibility from player crossbow launch/guidance and the
eager false raider counter field. Lazy physical counting and every award rule
remain. No frozen assertion, fingerprint, damage/tuning rule, runtime asset,
protected audio file, save key/schema, live folder, Preview or real save changed.

## Director browser readiness and durable review follow-up

The actual High/Performance yard and Fuel harness at8871591 completed on
private port13364 with memory-only storage and no console errors, warnings
or failed requests. It verifies rank5 hidden/rank6 clicked launch, car/foot
pickup and delivery, heavy-hit/wreck drops, enemy recovery, five-second
refill, delivery sudden death and actual atomic Retry of240 scrap/25 hold.
A newer owner profile remains intact, other named players are unchanged,
and duplicate settlement does not pay. Moving samples were17.96/17.81ms
mean and18.20/18.10ms P95 (High/Performance). These are observed samples,
not a final source or human feel clearance.

All22 images were inspected. Performance foot pickup caught the primitive
loading fallback; a later delivery image shows the authored fighter. The
scenario previously waited for the car body only. The Director now polls
the actual selected crew readiness and visible authored SkinnedMesh, fails
on recorded asset errors, and renders without advancing simulation time.
Every capture waits for readiness, including rematch loading indicators.
Independent review found no assertion weakening or side effect. Every
original rule, persistence and cue assertion stays unchanged. This final
readiness/source freeze needs its own fresh browser and exact lane/build.

Markers overlap scoreboard/minimap, and the centre re-entry hint crosses
carried cargo; record a narrow HUD follow-up after its owned hook is free.
These screenshots use labelled pose/held-CPU and whistle fixtures. They do
not visually prove bolt/bomb fighter contacts or the4m depot boundary; the
native acceptance suites do. Cue dispatch includes countdown/go/bonus,
impact/landing/blast, respawn and win. Dispatch alone is not human listening
or sound-balance approval. Current authored cues are reused; no sound bank
asset, audio source or external protected audio file changes.

Independent Save Guardian actual settlement/reload at8871591 confirms
car-only0 raider XP versus400 completion/win XP, and car-first recovery then
genuine F-exit/RPG25 raider XP versus425 total, once. Repeated knockdowns,
settlement and reload cannot farm it. Both paths preserve9999 owner credits,
3333 other-player credits and additive fields, with one settlement write.
Focused102 tests pass, including247 checks on all seven historical fixtures.
Later013cc6c changes only CPU-versus-player launch/guidance predicates and
removes an eager false counter initializer; award/damage/lazy counting, App,
progression and settlement source remain unchanged. Fresh narrow final
review and source-gate proof still follow; no merge clearance is claimed.

### Removed — browser readiness follow-up

Removed car-only readiness from authored-fighter captures and immediate
capture of unsettled rematch presentation. Kept every original assertion,
current crew assets, runtime renderer and simulation source. Failed and
pending-review captures stay private until their verdict is consumed.

## Existing launcher gate follow-up — tests first

At clean1b9628e the exact lane gate reached237 passes,1 failure and75 not
run in418.02s; build did not run. The unchanged22-check launcher suite
reproduces21pass/1fail: Preview URL must request fuel-run, now a dev switch.
The Director grants only start-preview.bat's URL flag hook. The checked-in
flag list now adds fuel-run beside existing warlords; all other recipe text,
ports, output paths, isolation and launch behavior are retained. The test
assertions are unchanged. No launcher is executed or Preview build/process
changed. This is source-only preparation for a future user launch.

Actual final1b9628e browser passes all22 captures on private54854,
memory-only with no warnings/errors/failed requests. High/Performance moving
means16.667/16.666ms, P9516.8ms. Both capture authored fighters and settled
sudden death with no loading fallback. The HUD overlaps and possible carry-
cell visual mismatch remain observations for a narrow native reproduction;
fixture intersections are labelled, not natural gameplay claims.

Fresh exact lane/build and independent review of the single URL change are
required before merge. No old assertion, race pin, world signature or runtime
asset changes. Final human feel/audio and Claude review remain separate.

### Removed — launcher hook

Removed the source URL omission of the new fuel-run development switch.
No Preview output, running service, shortcut, real save or code path removed.

## Exact switch catalog follow-up and recorded audio — 30 September

Clean4a60b99 lane failed301pass/1fail/11notrun in436.45s. The unchanged
release test in test-wasteland-beta required the complete old switch catalog,
so the required new fuel-run:dev entry was its only mismatch. Director granted
that exact test hook in integration927f57c after independent review approved
the correction. The exact dictionary keeps every old entry/assertion and adds
only fuel-run:dev; production default stays false. A separate behavioral
control proves production URL cannot enable it, explicit QA request can,
and unnamed QA remains false. No generic partial-dictionary assertion,
removed release-state assertion, skipped case or changed replay pin.

Final actual22-image High/Performance browser at1b9628e passed on private54854,
memory-only, zero errors/warnings/failed requests. Fighter carry uses the
actual authored mesh, Sudden Death has no loading indicator. Scoped actual
WebAudio capture at4a60b99 maps Fuel pickup/drop/delivery/result and measures
onsets within30ms. It is not a clean whole-audio pass: an otherwise identical
Last Car Rolling60mph contact with no Fuel cues exceeds sample/true peak
(-0.049dBFS/+0.22dBTP). Fuel is-0.087/+0.15; suppressing only landing still
exceeds limits, so Fuel feedback is not the necessary cause. AUD-CRASH-PEAK
owns the separate audio-owner follow-up. Pickup/delivery are14–16/10dB below
engine and flagged for Kyle listening, not a weapons-only+6dB assertion.
Actual terminal delivery/win overlap is reported, not independently timed.
Private recordings/causal controls and graphs remain for pending review at
.evidence/2026-09-30/ARENA-03/audio-final-4a60b99/VERDICT.md. No human ears,
Preview feel, full-audio, fresh exact gate or whole-feature review is invented.

### Removed — switch test follow-up

Removed the old catalog expectation's accidental exclusion of the required
new Fuel dev entry while retaining its complete release-state check. No production
rule/source, prior assertion, runtime asset, licensed file or pin removed.
