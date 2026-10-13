# FIX-AMBUSH-OPENING

Kyle, 12 October 2026: the fort falls within about15seconds. Fix the first wave so two players learning the controls have a fair chance, and explain those controls before entry. Keep testing lean.

## Settled design before code

Wave one gets20seconds from its simulation start before enemy rockets or nearby-raider wear can damage the fort. Raiders still approach and the player can knock them down immediately. Wave-one rocket reload is6.6seconds per existing group, instead of2.2seconds. At worst three nearby raiders and two direct-hit groups leave the300-health fort alive at30seconds without player input. This is a learning window, not a free win. Waves2–5, enemy counts, knockdown rules, damage, health, repair, pay and saves retain their existing rules. Time is simulation time, so pause cannot spend the window.

The Ambush entry panel shows the five-wave objective, the first-wave window, movement/turn/strafe, mouse fire/aim, separate RPG clicks and automatic reload, slots1–3, repair beside cover, car ammunition refill, and H help. Enter remains the existing deliberate start action. No new art, cue, dependency or test harness. Existing wave cue is reused.

## Owned files and acceptance

Own src/arena/modes/ambush-alley.js, the Ambush-only hook in src/raiders.js, the Ambush entry branch in src/screen-arena.js, tools/test-arena-ambush-alley.mjs, and docs/changes/FIX-AMBUSH-OPENING.md. Locks: ambush-first-wave and arena-menu; no busy-game-files or save-shape lock.

Add nearby acceptance for native opening survival in both venues, pause, the first-wave shot schedule and unchanged wave-two cadence, plus visible pre-start controls. Existing wear/rocket/repair fixtures begin after the new approach window; their damage/range assertions stay exact. One focused development run as needed, one nearby lane/jobs4, build and one independent code/design-number review. Heavy browser/balance/frame/full checks belong to the installed FAC-03 night shift. No release.

## Claude answers

No open art or sound decision. Kyle authorized the gameplay fix; the bounded timing above is written before code and receives independent review.
