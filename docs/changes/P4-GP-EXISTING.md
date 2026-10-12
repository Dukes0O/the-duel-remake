# P4-GP-EXISTING

Status: building. Nine existing circuits receive Grand Prix eligibility and bounded field tuning. No release. Remaining original circuits: Alpine Serpent (final attempt remains), Red Mesa, Neon Docks and Cloudbreak Skyway.

## Current behavior and settled design

Grand Prix uses the existing switch, course access rules, eight cars, three laps, and no traffic, police or radar on the nine original closed circuits. Authored circuits keep their own lap counts and field sizes. Course IDs, layout versions and other modes stay exact. Team Room remains base-only; the Director opened the low-priority Azure Grand Prix comparison follow-up.

Azure alone stages the grid 400 m earlier; timing and the visible line remain zero. Its approved GP entry adds 1 m per road edge, smoothly from 225 m through the 260 m peak to 295 m. Course width, road surfaces, scenery clearance, world vertices and racing line share that metadata. Legacy geometry fingerprint stays 7f43383b; GP geometry is honestly 58a80e29. Its fieldFollow uses wallRoom 1 and first-lap margin 5, reaction .5, closeIn .8 and wallRoom 1.4; default leadBraking stays 1.15. The staged first lap keeps its time but cannot become a ghost; clean flying laps use their exact native crossing clocks. No new width or following mechanism is added.

Pay, records and best-lap ghosts are the accepted P4-CAREER-PAY implementation, merged at c80ab166 from 02d914c3, behind its own career dev switch. Pay follows the approved position table; GP keys remain separate, legacy Duel/Time Trial deduplication stays exact, and playback remains Time Trial only. Damaged legacy sample arrays, record capacity, archival bytes, once-only settlement and wallet limits keep their reviewed guards. Actual Qualifying ancestry 4211bf2 is synced; app, game, qualifying, menu control, telemetry and its native fixture/scenario match that accepted source byte-exact. This card has no new pay, save, ghost or qualifying implementation.

The Director grants two menu copy corrections: derive scene distance/lap text and start-note field/lap text from authored grandPrixLaps and fieldSize. Harbour Lights displays four laps; original eight-car/three-lap text stays exact; open courses say ONE RUN. Entry reward copy and all race/pay/save rules stay unchanged.

## Bounded original race measurements

Claude's 11 October 21:20 decision allows at most three original 90-race attempts per circuit, then the closest measured setting and Kyle's play judgment. Safety and completion come before win-band and passing gaps. Interrupted Azure attempt one counts toward the cap. No fourth attempts, target waivers or optional repeats.

Command: node tools/race-field-balance.mjs --course ID --races 30 --difficulty easy,medium,hard --jobs 4 --car falcone_f42 --check --json. Pacific uses the default course. Driver, route seeds, original field seeds, memory-only storage and all section 3.2 targets stay exact. The CLI emits no final-state hashes; none are claimed. Raw JSON and source metadata remain in owned ignored integration evidence leaves under .evidence/2026-10-12/P4-GP-EXISTING until review consumes them.

In the table, wins and opening pile-ups are Easy/Medium/Hard counts out of 30 each. Passing is Medium mean passes, with after-start mean in parentheses. Every complete row has 90 actual player three-lap finishes, 630 CPU finishes, no unfinished cars and empty stderr. PASS means every original target passed; OUT retains genuine failures.

| Circuit / attempt | Source | Seconds | Wins | Opening | Passing | Verdict |
| --- | --- | ---: | --- | --- | --- | --- |
| Pacific 1 | 2ec80395 | 197.78 | 22/13/5 | 0/0/0 | 3.4667 | PASS; stop |
| Azure 1 | 3a82b78b | interrupted | incomplete | 0 in 15 Easy races | incomplete | Capacity interruption; no complete report |
| Azure 2 | 2ec80395 | 406.97 | 30/30/30 | 0/0/0 | 2.4667 (2.4667) | OUT: wins and passing |
| Azure 3 | 5bb31482 | 387.67 | 10/6/2 | 0/0/0 | 2.3333 | OUT: wins and passing; cap exhausted |
| High Country 1 | f9ccc11f | 206.94 | 30/29/29 | 0/1/0 | 4.2667 (4.1) | OUT: wins |
| High Country 2 | d985cf8f | 220.25 | 19/11/2 | 0/1/0 | 3.1667 (3.1) | OUT: Hard wins |
| High Country 3 | df38ec84 | 285.28 | 19/11/6 | 0/1/0 | 3.1667 (3.1) | PASS; stop |
| Harbour & Highlands 1 | df38ec84 | 249.77 | 30/27/27 | 0/1/0 | 2.8333 (2.6667) | OUT: wins and passing |
| Harbour & Highlands 2 | 15abd87a | 255.41 | 21/9/3 | 0/0/0 | 2.4 (2.3333) | OUT: passing |
| Harbour & Highlands 3 | 74512529 | 191.69 | 19/13/3 | 1/0/1 | 2.6 (2.5333) | OUT: passing; cap exhausted |
| Eifel Crown 1 | 74512529 | 283.43 | 1/0/0 | 1/1/0 | 1.5 (1.3) | OUT: wins and passing |
| Eifel Crown 2 | dc273258 | 357.24 | 8/0/0 | 0/2/1 | 1.8333 (1.5333) | OUT: wins, Medium opening and passing |
| Eifel Crown 3 | 5cf0d412 | 210.74 | 23/5/10 | 1/0/0 | 1.7667 (1.3667) | OUT: Medium/Hard wins and passing; cap exhausted |
| Alpine Serpent 1 | 5cf0d412 | 185.22 | 0/0/0 | 2/3/6 | 1.9333 (1.1333) | OUT: wins, opening and passing |
| Alpine Serpent 2 | df78d6e5 | 172.38 | 15/0/0 | 4/5/3 | 2.6 (1.5333) | OUT: wins, opening and passing |

## Retained settings and decisions before code

Pacific retains pace and aggression multipliers one: baseline passes all targets. No repeat.

Azure retains pace .96/.91/.90 and aggression 1.8. Attempt two used .80/.78/.77 and aggression 1.4. Its measured finish ratios estimated .9614/.9112/.8999 for the final attempt; aggression increased through unchanged capped passing logic. Both complete runs pass safety/completion; the final win shares are closer than attempt two's 100 percent at each difficulty. Passing remains below three. Cap exhausted; retain the failure honestly.

High Country retains pace 1.10/1.065/1.050, aggression one. Baseline finish ratios estimated 1.0982/1.0656/1.0561 for attempt two's 1.10/1.065/1.055. Only Hard changed in the final attempt: .995789 times 1.055 estimated 1.0506. Final measurement passes every target.

Harbour & Highlands retains pace 1.085/1.043/1.035, aggression 1.6. Baseline ratios 1.0848/1.0485/1.0393 led to attempt two's 1.085/1.050/1.040 and aggression 1.25. Final ratios .993701/.995534 moved Medium and Hard toward their band centres, with aggression 1.6 for the passing deficit. Both tuned settings pass safety/completion/wins; the final passing result is closer, though still outside. Cap exhausted.

Eifel retains pace .934/.903/.881, aggression 1.4. Baseline ratios .95934/.93439/.90897 led to attempt two's .960/.935/.910 and aggression 1.8. Attempt two's .972887/.965342/.968122 ratios gave the final pace; reducing aggression addressed its Medium opening failure. Final safety passes and wins/passing are closer than the safety-passing baseline. Medium/Hard wins and passing still fail. Cap exhausted. Estimates never count as acceptance.

Alpine attempt two uses GP-only pace .960/.938/.917 from measured baseline finish ratios .959377/.938122/.917437. Its zero player wins call for slower CPU pace; aggression drops from one to .85 because all opening safety targets fail. Safety takes priority over the passing deficit. Two attempts remain, and these estimates are not acceptance. No geometry, first-lap, driver, seed, target or assertion changes.

Alpine final attempt uses pace .929/.902/.892 from measured ratios .967564/.961557/.973027 applied to the current pace. Aggression decreases from .85 to .6 because opening safety remains outside at every difficulty, with 12 pile-up races against baseline 11. This is the last attempt; retain the closest complete measured setting with safety first. No geometry, first-lap, driver, seed, target or assertion change.

Every choice was written and settled before its data edit. All other course settings, geometry, first-lap values, driver, seeds, assertions and targets remain exact. Immutable overlays use only existing fieldPace and fieldAggression options; no new balance mechanism.

## Checks and changed assertions

Current card-required native grid/corner/narrow-spot browser coverage, owned pure/native fixtures, lane gate with jobs 4, build and final ordinary review remain pending after tuning. Accepted Pay already passed its 400-suite lane and build; Qualifying passed its 401-suite lane and build. Those are carried ancestry, not current GP gate evidence.

Earlier owned width checks passed 11,228 course/surface/line/world/shader/ghost assertions, 11 storage checks and 86 Time Trial ghost checks. Native Azure actual capture on the reviewed entry source proved honest -426 m staging, excluded clean first lap at 86.134 s, and saved flying lap from zero at exact 62.87027493425816 s; its event rounds to 62.87 s. Earlier 18-case browser coverage stopped at Azure High with three crashes at 8.775 s; no full native pass is claimed. Current bounded opening rates replace no native assertion. Final browser coverage still waits.

The following meaningful assertion changes were approved before code; no tolerance, timing bound, capacity, legacy byte or record-validity assertion was weakened:

- Newly eligible High Country replaced by Titan Arena in the unsupported-event rejection fixture. Unsupported events must still reject Grand Prix.
- Save Guardian reproduced Duel 120 s then slower Time Trial 130 s admitting an extra row after an unconditional mode discriminator. Restore the original combined legacy key; faster Time Trial 115 s replaces Duel 120 s, while GP 180 s remains separate through its event key. The old three-row coexistence assumption becomes the correct two rows.
- Actual authored Harbour four-lap completion/reload is valid; malformed Pacific four-lap completion remains invalid and default three stays exact. The new Harbour fixture first failed on old source. Authored one-run counts remain generic.
- Pay merge supersedes the enabled-records/free-wallet assumption. Record/ghost fixtures explicitly enable career dev; actual Medium position pay, exact bank delta, reload and duplicate settlement bytes replace zero pay. Accepted flag-off fixtures still prove zero pay. Ghost capacity/damaged-legacy/partial-lap expectations remain exact.
- The new Azure clock fixture compares unrounded native crossing clocks with saved ghosts and keeps the existing event's millisecond rounding separately. First staged capture cannot claim a saved ghost.

The existing private browser recipe bundles actual source helpers in memory because a built preview cannot serve raw imports. Its 18 native assertions remain exact; no runtime dependency, shared harness, frame test or new publisher. The Director granted the existing rate recipe course parameter only; this run uses the original CLI for bounded throughput. No test machinery or selector change.

## Removed

Removed stale hard-coded GP three-lap menu labels and the obsolete no-pay/records claim through the accepted Pay source. Replaced duplicate GP shoulder width with the shared Course width hook and implicit staged rejection with its reviewed explicit ghost policy. Folded superseded design/history paragraphs into current behavior and this attempt table; Git keeps their text history. No runtime asset or legacy mode is removed. Unconsumed ignored evidence remains needed until the final verdict is committed.
