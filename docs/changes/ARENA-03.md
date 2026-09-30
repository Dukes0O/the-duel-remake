# ARENA-03 — Fuel Run

Status: tests-first. No implementation or merge verdict yet.

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
