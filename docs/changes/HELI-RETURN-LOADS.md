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

- Claude's second answer (26 October) approves exactly three further pin
  updates: `OTHER_ARRIVALS_PIN` in `test-heli-summit-arrival.mjs`,
  1120341889 -> 624439558; `SUMMIT_ONLY_PIN` in
  `test-heli-summit-rescues.mjs`, 274976626 -> 1829644530;
  `AUTOPILOT_PIN` in `test-heli-summit-tune.mjs`,
  4100670798 -> 1475763491. No other line in those files changed. Only
  the intended passive crate changes the fingerprints; no behavior
  assertion or tolerance is loosened. Claude's card note is the review.
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

- Full lane PASS: 82 passed, 0 failed, 0 not run in 576.94 s.
  `node tools/run-tests.mjs --tier lane --changed --jobs 4 --keep-going`.
  PowerShell, System32 first on PATH. All four reviewed helicopter pins,
  original race replay guards and world signatures pass.
- Production build PASS: `npm.cmd run build`, 1.13 s, after the green lane.
  Used the approved shared dependency cache; PowerShell blocks npm.ps1.
- Jobs: 5,917 checks; save: 44 groups; view: 270 checks, all passing in
  the lane. Jobs cover seeded routes, every leg's premium-fuel margin,
  rounding, Real pay, Table discovery stability, actual home/onward flights,
  payment once, receiving-pad cargo and supply-mission coexistence.
- Independent save review APPROVED: 23 historical fixtures plus one forged
  fixture, 1,029 migration checks; corrupt inputs; combat/fines/quit/reload
  wallet safety; existing migration backups. Budget passed at 3.61/4 MB.
  Completion flags add at most 1,154 UTF-16 bytes per player across today's
  valid places. No real saves accessed. Revised pay independently approved.
- The fresh lane exposed a real supply-hook conflict after the old pins
  were corrected: 44 passed, 1 failed, 37 not run (195.71 s). An idle local
  return crate could intercept H and redirect active supply work while its
  board was hidden. Kept the supply assertion unchanged. The spawn hook
  now stows only unhooked local return cargo during supply work, restores
  it when the mission clears and guards startup before a site exists.
  Held/foreign cargo, all supply crates, credits and done flags stay intact.
  Independent code/save review APPROVED; the final full lane above verifies
  the correction. No extra assertion in the three restricted files changed.
- Native headless browser picture already PASS, memory-only storage,
  private port 50261, zero errors/warnings. Snow's board shows both ends,
  476 kg, 180 credits and the lodge sender; the actual crate is beside the
  pad. The inspected picture remains valid: Snow's pay and normal arrival
  display are unchanged. Picture retained for handoff at
  `.evidence/2026-10-26/HELI-RETURN-LOADS/tremblant-snow-return-board.png`.
  No frame timing.
- Merged integration first (736b90d3). Only STATUS.md conflicted; kept this
  lane's copy as requested. No code file conflicted.
- Heavy-job admission checked before each gate/build; admitted below three
  with no hold. Corrected gate's one-minute count was three; build started
  at one. Session-end status and Cockpit sync completed (0 task changes).

## Decisions

All questions are resolved by Claude's written answers on the card under
rule 18. His second answer is the review of the three additional pin-only
updates. Independent probes restored each old hash by omitting only the
new passive crate; flight states, fuel, credits, events and 164 sampled
flight records stayed exact. No save shape changed after its approval.
The resolved question file is removed. No design or review items remain open.

## Removed

Recycled the resolved `docs/board/questions/HELI-RETURN-LOADS.md` after its
facts and Claude's answer were recorded in the card and this note.
Recycled this run's generated production build, QA bundle,
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
