# P4-QUALIFYING

Status: scoped final lane; accepted native and save review retained; lane/build pending.

## Design before code

Optional Grand Prix qualifying uses normal controls, circuit gates and lap
clocks for two timed flying laps, alone. Claude settled the moving start on
11 October: 80 km/h at the authored pit exit, or just before the line on the
actual racing line when no pit exists. The first native crossing arms the
clock; that approach does not count as a practice lap. No warm-up lap or fake
finish. The faster valid lap determines the grid; assisted laps cannot improve
it. CPU times integrate existing racing-line profiles, difficulty and seeded
skill. Exact ties favour the CPU; two invalid laps keep the default grid.

The real race reloads the same circuit and field seed with fresh driving state
and its normal five-light start. Qualifying emits no race result or reward.
Its phase becomes complete before stageLoaded so GP recording can initialize.
The session-only choice explicitly defaults to SKIP. Timed lap events retain
practice markers and a count for P4-INTEL-LEVELS, which owns intel settlement.
This remains behind the existing grand-prix switch.

Claude check-in 3 settles qualifying telemetry now: save the best clean lap
per named player, event and route, using the existing bounded companion store.
Both genuine clean timed laps still count as future Intel2 practice. Native
arming must prime the recorder at the actual interpolated start crossing;
native lap completion must reach telemetry before the real GP stage reload.
The reproduced two-lap loss is fixed forward, without fake lap events, altered
race positions or weakened recorder validity checks. GP ghosts still exclude
qualifying. Save Guardian and scheduled native/lane/build checks are required.

## Evidence

- Before-code acceptance failed for the missing module. Focused session/grid
  tests pass, as do all 42 existing race-settings checks. Tests cover seeded
  CPU times, ties, assisted laps, invalid laps, smaller fields, opt-in/skip,
  feature-off safety and the exact authored pit-exit start seam.
- Actual App driver controls, physics and native checkpoints in memory-only
  storage complete 51.553 / 50.372 s laps in 6,131 steps, with one arming event,
  two practice events, automatic real GP countdown, no results or credits.
- Native private-browser recipe passed port 52676: real menu opt-in, solo
  driving, the same timed laps, earned pole and fresh eight-car GP; selecting
  SKIP retains the normal Medium back-half slot. Zero warnings or errors.
  All three screenshots reviewed; choice, moving session and grid are clear.
- Fixture corrections: the omitted-option helper no longer defaults true;
  the browser waits for menu readiness and explicitly chooses Medium before
  checking its unchanged expected grid. The original failure was Easy's valid
  slot 4 against a Medium slot 5 expectation. No assertion was weakened.
- The native browser exercises a no-pit course. Authored pit metadata has a
  focused seam check; an actual authored-pit browser run follows P4-PIT sync.
  Final lane/build and one independent review remain.
- Synced reviewed P4-PIT c1898d47, telemetry 9fbcc671 and GP 4cb54419.
  Pit/telemetry merged cleanly; five App conflicts retained both recorder
  imports, stage startup, native lap handling and cleanup. Qualifying choices
  remain present. The authored-pit recipe now replaces only the disposable
  QA venue definition before normal loading: named 500 m Service Straight,
  real installed exit, unchanged native gates/clocks and real driver controls.
  It checks two timed laps, no pay, fresh earned GP and GP recorder startup.
  App and scenario syntax checks pass. Its native run awaits the quiet slot;
  no gate, build or browser has run after this sync.
- Native regression first failed with zero saved laps despite two clean native
  finishes. The fix primes telemetry from interpolated observed approach/current
  points at the real arming crossing and reads qualifying lap events before
  reload. It never writes race state or changes ordinary recorder admission.
- Both genuine finishes now save: 51.553 s first, replaced by 50.372 s second;
  exactly one best record, native t=0/endpoints, two practice events and the
  earned GP recorder. A second real named-driver run with synthetic quota
  denial keeps one best session candidate and every previous player/event/route
  byte. Prior fixtures use a validated native record shape; Route B's fixture
  was corrected to curated seed 42, with no assertion changed.
- Focused telemetry and career recovery each pass 19 groups. Native ordinary
  telemetry off/on fingerprint remains 06e9dba5bf807c38e49465a3bd2a9d3212146ba7e6656e389772e5a436bcc565.
  QA a89e562c and GP 09e01b86 merged; equivalent App cleanup spellings retain
  all recorders. Queued pit browser also checks the best lap and exact prior
  layout record. Save Guardian, source review and scheduled gates remain.

Native 6abe1284 passes on private 22510: real 51.553/50.372 s laps, one best
clean saved lap, two practice events and a fresh eight-car/three-lap GP. Skip
keeps Medium slot 5. Real authored pit exit is 490 m at exactly 80 km/h;
32.225/32.225 s laps finish in 5328 steps. GP recorder starts after completion;
the prior layout record stays exact. Five screenshots, zero warnings/errors.
Driving, earned grid and authored pit views inspected; no injected finishes,
frame measurement or performance claim. Mandatory lane/build remain queued.

## Final integration seam

The final lane starts from accepted integration 5092a018 and carries only
qualifying files and named hooks. The original lane and its dirty native note
stay intact. Approved session and telemetry source is retained. Earned-grid
placement now keeps the authored grid setback, so qualifying cannot undo the
opening room approved for Azure and Panorama. A focused regression adds checks
for every player/CPU slot and its previous position; no assertion is weakened.
Provisional Grand Prix source is not imported. Its actual recorder dependency
will be checked after that card lands.

## Removed

The provisional full-lap no-pit approach is replaced by Claude's approved
moving line start. No existing race lifecycle or save format is removed.

## Accepted pay dependency sync before fixture edits

Sync actual integration c80ab166 into this scoped lane. Preserve incoming Snow
on, Grand Prix Career dev, all 25 catalogue switches and the accepted payment,
record, recovery and ghost-capacity paths. Keep only the owned qualifying
source delta; no provisional GP admission, tuning or Summit source is imported.
The App event conflict retains the incoming go/lap/discontinuity recorder logic
and adds qualifying arming and pre-reload telemetry handling alongside it.
Closed-course eligibility and the initialized grid-origin derivation stay exact.

Existing headless/browser fixtures require the fresh Grand Prix ghost recorder
after qualifying. That accepted recorder now belongs to grand-prix-career dev,
so these fixtures explicitly enable the switch. Qualifying itself still pays
zero, records no GP ghost and drives the same real timed laps. Keep every
previous timing, earned-grid, default-skip, quota and prior-byte assertion.
This changes fixture admission, not any acceptance threshold. Focused, native,
lane and build checks are queued; no new result is claimed by this sync.
