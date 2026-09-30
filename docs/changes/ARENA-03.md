# ARENA-03 — Fuel Run

Status: held implementation candidate. Not merge-ready. The named-player UI
red/green and current High/Performance browser checks pass. Save Guardian's
durable-retry/result-proof fixes pass the independent acceptance tests and
current browser probe; independent re-review, final lane/full gates, audio/art
review and Claude's on-foot projectile contact decision remain pending.

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
