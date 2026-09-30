# ARENA-03 — Fuel Run

Status: implementation candidate. Not merge-ready. The actual named-player
browser regression, current visual/audio review and Claude's on-foot projectile
contact decision remain pending.

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
leaves the native options stale. Setup now invokes the existing production
`refreshRaceSetup` exported from `main.js`, as the isolated menu-check fixture
buttons do, and waits for both actual named-player options. The eight mode and
owner assertions and subsequent real UI controls are unchanged. **The genuine
browser red remains pending.** This setup correction does not record a browser
acceptance verdict.

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
