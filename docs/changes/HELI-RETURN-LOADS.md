# HELI-RETURN-LOADS

Design: implement HELICOPTER 13.2. Seed the weight and destination from the
play day and departure place. Choose home or an onward pad whose leg fits
the tank. Claude's 26 October answer sets pay to the larger of 60% of the
same leg's car pay and 1.25 times fuel at the dearest endpoint pump, rounded
up to the next 10 credits. Where there is no premium pump, use home's
1.5-credit price. Real mode adds the usual 25%. Fuel prices stay unchanged.
Crates wait beside the away pad; hooking one aims at its destination.
A clean release in that destination's landing circle pays once. Use the
lesson crate model, cable rules and existing job radio cues.
The Table offers outbound loads once discovered, but is not a drop-off:
discovering it in flight cannot redraw an advertised job or change its pay.

Save: optional `heli.returnLoads` maps departure places to their completed
play day. Absence means none done. Normalize it without changing the save
version or dropping unknown top-level keys. The card's explicit normalizeHeli
requirement entails the small heli-save.js hook and old-save fixture.

Checks: seeded routes/weights and pay versus fuel; memory-only save round
trip and old-save fixture; scripted hooked-crate flight and payment. Picture:
Tremblant Snow arrival board. Lane tier (jobs 4), then production build.
No frame timing.

## Changed assertions

- `tools/test-heli-autopilot-rescue.mjs`: OFF_PIN 3531442031 → 2230200939.
  The whole-view snapshot now includes the away-pad crate and board.
  Claude explicitly reviewed this exact change on the card (26 October).
  No other line in that test changed; no behavior assertion was loosened.
- `tools/test-heli-jobs.mjs`: replaced the initial return-load profitability
  check at home's 1.5-credit price with a check at the dearest endpoint
  pump. This strengthens the check to match Claude's revised rule. Added
  exact pay, rounding, symmetry and profitability checks for every leg,
  plus the Pacific–Red Mesa 340-credit example and seeded-job pay wiring.

## Review and results

- Targeted: heli-jobs 5,897 checks (includes actual Snow-to-home and
  Snow-to-Panorama hooked flights, payment, the onward pad's next crate,
  every leg's revised pay, 30-day route/weight/fuel checks and Table-discovery stability);
  heli-save 44 groups; heli-view 270 checks. All pass.
- Independent save review APPROVED after correcting the missing onward
  crate and the changing Table-discovery payment. Review verified 23 old
  fixtures plus one forged fixture (1,029 checks), corrupt input handling,
  combat/fines/quit/reload wallet safety and existing migration backups.
  Storage budget passed at 3.61/4 MB; flags add at most 1,154 UTF-16 bytes
  per player across today's valid places. No real saves accessed.
- Earlier lane attempt stopped at the old snapshot pin: 21 passed,
  1 failed, 57 not run (199.14 s). Claude has now approved its exact update.
- Independent review of the revised pay and pin APPROVED. Verified the
  endpoint prices, ceiling to 10, unchanged original three pays, Pacific
  premium examples, Real bonus, duplicate protection and Table stability.
  Save approval is unchanged.
- Fresh full lane attempt, jobs 4: sandbox blocked the existing
  temporary-copy test's PowerShell child (19 passed, 1 failed, 61 not run,
  63.76 s). Reran with the required tool access and no assertion changes.
- Full lane with tool access, jobs 4: 39 passed, 1 failed, 41 not run
  (197.17 s). The approved autopilot pin passes. The next old snapshot,
  `test-heli-summit-arrival`, expects 1120341889, actual 624439558.
  Ran the skipped 41 suites once with `--keep-going`: 39 passed, 2 failed,
  0 not run (391.43 s). Failures are only `test-heli-summit-rescues` and
  `test-heli-summit-tune` snapshot pins listed below. Across all 81 selected
  suites: 78 passed, 3 failed, none unattempted. Passing suites were not
  repeated after those snapshot failures. Original race replay and world
  signatures pass. This is not a green lane.
- Final production build PASS (1.12 s): PowerShell with System32 first on
  PATH, `npm.cmd run build`, using the approved shared dependency cache.
- Native headless browser PASS, memory-only storage, private port 50261:
  Snow board names both ends, 476 kg, 180 credits and the lodge sender;
  the actual lesson crate is beside the pad. One picture inspected:
  `.evidence/2026-10-26/HELI-RETURN-LOADS/tremblant-snow-return-board.png`.
  Text is readable without covering the helicopter or crate. No browser
  errors or warnings. No frame timing. Picture retained for handoff.
- Heavy admission counted before every gate/build/browser launch; each
  started below three, with no current hold. One-minute counts were two
  and three. A build attempt at count three did not start; it ran at two.
- Session-end status generated and Cockpit sync completed (0 task changes).
  Two unrelated cards lack task links: GHOST-SAVE-MESSAGE and
  SUMMIT-FINISH-AREA; left to the Director.

## Decisions

Both previous questions are resolved by Claude's written answers on the
card, under rule 18. Kyle's approval is not required. Ordinary race replay
and world-signature pins are untouched. The return-load save shape has not
changed since the approved save review.

Three additional old flight snapshots need Claude's written review:
`test-heli-summit-arrival` 1120341889 → 624439558,
`test-heli-summit-rescues` 274976626 → 1829644530,
`test-heli-summit-tune` 4100670798 → 1475763491.
All three files are untouched. The independent reviewer proved that
omitting only the new entry crate spawn in memory restores every old hash
exactly. Helicopter states, flying area, events, credits and fuel match;
the tune probe also matches all 164 flight samples. These are solely new
passive-crate fingerprints, with no flight-physics regression. The exact
scope extension and technical review are recorded for Claude in
`docs/board/questions/HELI-RETURN-LOADS.md`. A green lane is not claimed
while those unchanged assertions fail.

## Removed

Nothing replaced. Recycled this run's generated production build, QA bundle,
scratch capture scripts and browser report. Kept the requested picture for
handoff; integration can recycle it after accepting the visual verdict.

## Pay table: every available leg

137 leg pairs with the pilot's map, Summit Run and the Table available.
Each row covers both directions where away boards offer them. Home receives
loads; the Table sends them. Other same-pad and over-400-kg legs are not
offered. Original three-destination mode uses the same three original-leg
pays below. All pays are credits; pump prices are credits per kg.

| Leg | Fuel kg | Dearest pump | Assisted | Real |
| --- | ---: | ---: | ---: | ---: |
| Tremblant Snow -> Tremblant Woods | 25 | 1.5 | 180 | 225 |
| Panorama Ridge -> Tremblant Woods | 120 | 1.5 | 360 | 450 |
| Summit Run -> Tremblant Woods | 160 | 1.5 | 360 | 450 |
| Eifel Crown -> Tremblant Woods | 185 | 1.5 | 360 | 450 |
| Alpine Serpent -> Tremblant Woods | 275 | 2.2 | 760 | 950 |
| Cloudbreak Skyway -> Tremblant Woods | 335 | 1.5 | 630 | 788 |
| Ridge Rally -> Tremblant Woods | 200 | 1.5 | 380 | 475 |
| Timberline Checkpoint Rush -> Tremblant Woods | 265 | 1.5 | 500 | 625 |
| High Country Grand Tour -> Tremblant Woods | 340 | 1.5 | 640 | 800 |
| Red Mesa Corkscrew -> Tremblant Woods | 225 | 1.5 | 430 | 538 |
| Pacific Canyon Circuit -> Tremblant Woods | 290 | 2.0 | 730 | 913 |
| Harbour Lights -> Tremblant Woods | 215 | 1.8 | 490 | 613 |
| Harbor & Highlands -> Tremblant Woods | 235 | 1.5 | 450 | 563 |
| Neon Docks Circuit -> Tremblant Woods | 245 | 1.5 | 480 | 600 |
| Neon Drift Trial -> Tremblant Woods | 245 | 1.5 | 480 | 600 |
| Midnight Muscle Chase -> Tremblant Woods | 245 | 1.5 | 480 | 600 |
| Titan arenas -> Tremblant Woods | 145 | 1.5 | 280 | 350 |
| Azure Riviera -> Tremblant Woods | 215 | 1.5 | 410 | 513 |
| The Table -> Tremblant Woods | 205 | 1.5 | 390 | 488 |
| Tremblant Snow <-> Panorama Ridge | 110 | 1.5 | 270 | 338 |
| Tremblant Snow <-> Summit Run | 150 | 1.5 | 360 | 450 |
| Tremblant Snow <-> Eifel Crown | 170 | 1.5 | 360 | 450 |
| Tremblant Snow <-> Alpine Serpent | 255 | 2.2 | 710 | 888 |
| Tremblant Snow <-> Cloudbreak Skyway | 315 | 1.5 | 600 | 750 |
| Tremblant Snow <-> Ridge Rally | 195 | 1.5 | 370 | 463 |
| Tremblant Snow <-> Timberline Checkpoint Rush | 250 | 1.5 | 480 | 600 |
| Tremblant Snow <-> High Country Grand Tour | 335 | 1.5 | 630 | 788 |
| Tremblant Snow <-> Red Mesa Corkscrew | 230 | 1.5 | 440 | 550 |
| Tremblant Snow <-> Pacific Canyon Circuit | 300 | 2.0 | 750 | 938 |
| Tremblant Snow <-> Harbour Lights | 225 | 1.8 | 510 | 638 |
| Tremblant Snow <-> Harbor & Highlands | 240 | 1.5 | 450 | 563 |
| Tremblant Snow <-> Neon Docks Circuit | 255 | 1.5 | 480 | 600 |
| Tremblant Snow <-> Neon Drift Trial | 255 | 1.5 | 480 | 600 |
| Tremblant Snow <-> Midnight Muscle Chase | 255 | 1.5 | 480 | 600 |
| Tremblant Snow <-> Titan arenas | 155 | 1.5 | 360 | 450 |
| Tremblant Snow <-> Azure Riviera | 230 | 1.5 | 440 | 550 |
| The Table -> Tremblant Snow | 215 | 1.5 | 410 | 513 |
| Panorama Ridge <-> Summit Run | 90 | 1.5 | 270 | 338 |
| Panorama Ridge <-> Eifel Crown | 225 | 1.5 | 430 | 538 |
| Panorama Ridge <-> Alpine Serpent | 190 | 2.2 | 530 | 663 |
| Panorama Ridge <-> Cloudbreak Skyway | 235 | 1.5 | 450 | 563 |
| Panorama Ridge <-> Ridge Rally | 105 | 1.5 | 270 | 338 |
| Panorama Ridge <-> Timberline Checkpoint Rush | 160 | 1.5 | 360 | 450 |
| Panorama Ridge <-> High Country Grand Tour | 240 | 1.5 | 450 | 563 |
| Panorama Ridge <-> Red Mesa Corkscrew | 165 | 1.5 | 360 | 450 |
| Panorama Ridge <-> Pacific Canyon Circuit | 270 | 2.0 | 680 | 850 |
| Panorama Ridge <-> Harbour Lights | 320 | 1.8 | 720 | 900 |
| Panorama Ridge <-> Harbor & Highlands | 335 | 1.5 | 630 | 788 |
| Panorama Ridge <-> Neon Docks Circuit | 355 | 1.5 | 670 | 838 |
| Panorama Ridge <-> Neon Drift Trial | 355 | 1.5 | 670 | 838 |
| Panorama Ridge <-> Midnight Muscle Chase | 355 | 1.5 | 670 | 838 |
| Panorama Ridge <-> Titan arenas | 255 | 1.5 | 480 | 600 |
| Panorama Ridge <-> Azure Riviera | 320 | 1.5 | 600 | 750 |
| The Table -> Panorama Ridge | 175 | 1.5 | 360 | 450 |
| Summit Run <-> Eifel Crown | 275 | 1.5 | 520 | 650 |
| Summit Run <-> Alpine Serpent | 145 | 2.2 | 400 | 500 |
| Summit Run <-> Cloudbreak Skyway | 175 | 1.5 | 360 | 450 |
| Summit Run <-> Ridge Rally | 75 | 1.5 | 270 | 338 |
| Summit Run <-> Timberline Checkpoint Rush | 85 | 1.5 | 270 | 338 |
| Summit Run <-> High Country Grand Tour | 175 | 1.5 | 360 | 450 |
| Summit Run <-> Red Mesa Corkscrew | 160 | 1.5 | 360 | 450 |
| Summit Run <-> Pacific Canyon Circuit | 285 | 2.0 | 720 | 900 |
| Summit Run <-> Harbour Lights | 400 | 1.8 | 900 | 1125 |
| Summit Run <-> Titan arenas | 330 | 1.5 | 620 | 775 |
| Summit Run <-> Azure Riviera | 395 | 1.5 | 750 | 938 |
| The Table -> Summit Run | 200 | 1.5 | 380 | 475 |
| Eifel Crown <-> Alpine Serpent | 255 | 2.2 | 710 | 888 |
| Eifel Crown <-> Cloudbreak Skyway | 320 | 1.5 | 600 | 750 |
| Eifel Crown <-> Ridge Rally | 320 | 1.5 | 600 | 750 |
| Eifel Crown <-> Timberline Checkpoint Rush | 315 | 1.5 | 600 | 750 |
| Eifel Crown <-> Red Mesa Corkscrew | 375 | 1.5 | 710 | 888 |
| Eifel Crown <-> Harbour Lights | 235 | 1.8 | 530 | 663 |
| Eifel Crown <-> Harbor & Highlands | 200 | 1.5 | 380 | 475 |
| Eifel Crown <-> Neon Docks Circuit | 265 | 1.5 | 500 | 625 |
| Eifel Crown <-> Neon Drift Trial | 265 | 1.5 | 500 | 625 |
| Eifel Crown <-> Midnight Muscle Chase | 265 | 1.5 | 500 | 625 |
| Eifel Crown <-> Titan arenas | 190 | 1.5 | 360 | 450 |
| Eifel Crown <-> Azure Riviera | 315 | 1.5 | 600 | 750 |
| The Table -> Eifel Crown | 375 | 1.5 | 710 | 888 |
| Alpine Serpent <-> Cloudbreak Skyway | 75 | 2.2 | 270 | 338 |
| Alpine Serpent <-> Ridge Rally | 215 | 2.2 | 600 | 750 |
| Alpine Serpent <-> Timberline Checkpoint Rush | 115 | 2.2 | 320 | 400 |
| Alpine Serpent <-> High Country Grand Tour | 265 | 2.2 | 730 | 913 |
| Alpine Serpent <-> Red Mesa Corkscrew | 300 | 2.2 | 830 | 1038 |
| Alpine Serpent <-> Titan arenas | 385 | 2.2 | 1060 | 1325 |
| The Table -> Alpine Serpent | 340 | 2.2 | 940 | 1175 |
| Cloudbreak Skyway <-> Ridge Rally | 235 | 1.5 | 450 | 563 |
| Cloudbreak Skyway <-> Timberline Checkpoint Rush | 115 | 1.5 | 270 | 338 |
| Cloudbreak Skyway <-> High Country Grand Tour | 245 | 1.5 | 480 | 600 |
| Cloudbreak Skyway <-> Red Mesa Corkscrew | 320 | 1.5 | 600 | 750 |
| The Table -> Cloudbreak Skyway | 370 | 1.5 | 700 | 875 |
| Ridge Rally <-> Timberline Checkpoint Rush | 130 | 1.5 | 270 | 338 |
| Ridge Rally <-> High Country Grand Tour | 145 | 1.5 | 280 | 350 |
| Ridge Rally <-> Red Mesa Corkscrew | 95 | 1.5 | 270 | 338 |
| Ridge Rally <-> Pacific Canyon Circuit | 220 | 2.0 | 550 | 688 |
| Ridge Rally <-> Titan arenas | 340 | 1.5 | 640 | 800 |
| Ridge Rally <-> Azure Riviera | 380 | 1.5 | 720 | 900 |
| The Table -> Ridge Rally | 140 | 1.5 | 270 | 338 |
| Timberline Checkpoint Rush <-> High Country Grand Tour | 160 | 1.5 | 360 | 450 |
| Timberline Checkpoint Rush <-> Red Mesa Corkscrew | 215 | 1.5 | 410 | 513 |
| Timberline Checkpoint Rush <-> Pacific Canyon Circuit | 340 | 2.0 | 850 | 1063 |
| Timberline Checkpoint Rush <-> Titan arenas | 400 | 1.5 | 750 | 938 |
| The Table -> Timberline Checkpoint Rush | 265 | 1.5 | 500 | 625 |
| High Country Grand Tour <-> Red Mesa Corkscrew | 170 | 1.5 | 360 | 450 |
| High Country Grand Tour <-> Pacific Canyon Circuit | 275 | 2.0 | 690 | 863 |
| The Table -> High Country Grand Tour | 235 | 1.5 | 450 | 563 |
| Red Mesa Corkscrew <-> Pacific Canyon Circuit | 135 | 2.0 | 340 | 425 |
| Red Mesa Corkscrew <-> Titan arenas | 355 | 1.5 | 670 | 838 |
| Red Mesa Corkscrew <-> Azure Riviera | 365 | 1.5 | 690 | 863 |
| The Table -> Red Mesa Corkscrew | 70 | 1.5 | 270 | 338 |
| Pacific Canyon Circuit <-> Titan arenas | 390 | 2.0 | 980 | 1225 |
| Pacific Canyon Circuit <-> Azure Riviera | 355 | 2.0 | 890 | 1113 |
| The Table -> Pacific Canyon Circuit | 100 | 2.0 | 270 | 338 |
| Harbour Lights <-> Harbor & Highlands | 75 | 1.8 | 270 | 338 |
| Harbour Lights <-> Neon Docks Circuit | 40 | 1.8 | 180 | 225 |
| Harbour Lights <-> Neon Drift Trial | 40 | 1.8 | 180 | 225 |
| Harbour Lights <-> Midnight Muscle Chase | 40 | 1.8 | 180 | 225 |
| Harbour Lights <-> Titan arenas | 75 | 1.8 | 270 | 338 |
| Harbour Lights <-> Azure Riviera | 125 | 1.8 | 290 | 363 |
| The Table -> Harbour Lights | 375 | 1.8 | 850 | 1063 |
| Harbor & Highlands <-> Neon Docks Circuit | 85 | 1.5 | 270 | 338 |
| Harbor & Highlands <-> Neon Drift Trial | 85 | 1.5 | 270 | 338 |
| Harbor & Highlands <-> Midnight Muscle Chase | 85 | 1.5 | 270 | 338 |
| Harbor & Highlands <-> Titan arenas | 105 | 1.5 | 270 | 338 |
| Harbor & Highlands <-> Azure Riviera | 195 | 1.5 | 370 | 463 |
| Neon Docks Circuit <-> Neon Drift Trial | 5 | 1.5 | 180 | 225 |
| Neon Docks Circuit <-> Midnight Muscle Chase | 5 | 1.5 | 180 | 225 |
| Neon Docks Circuit <-> Titan arenas | 110 | 1.5 | 270 | 338 |
| Neon Docks Circuit <-> Azure Riviera | 135 | 1.5 | 270 | 338 |
| Neon Drift Trial <-> Midnight Muscle Chase | 5 | 1.5 | 180 | 225 |
| Neon Drift Trial <-> Titan arenas | 110 | 1.5 | 270 | 338 |
| Neon Drift Trial <-> Azure Riviera | 135 | 1.5 | 270 | 338 |
| Midnight Muscle Chase <-> Titan arenas | 110 | 1.5 | 270 | 338 |
| Midnight Muscle Chase <-> Azure Riviera | 135 | 1.5 | 270 | 338 |
| Titan arenas <-> Azure Riviera | 135 | 1.5 | 270 | 338 |
| The Table -> Titan arenas | 320 | 1.5 | 600 | 750 |
| The Table -> Azure Riviera | 315 | 1.5 | 600 | 750 |
