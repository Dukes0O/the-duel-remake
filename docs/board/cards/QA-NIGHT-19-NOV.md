# QA-NIGHT-19-NOV

The night check of 19 November 2026 on `a7b2f60c1`. Claude's card (Kyle moved the overnight testing to Claude on
18 November).

## What happened

- The Windows task "The Duel full check" stopped the run at 08:00, exactly four hours after it started (task result
  267014; the task's execution limit is `PT4H`). The full tier, frames and combat balance had finished; the browser
  stage was in its last 35 scenarios. Nothing was published, so no `night-2026-11-19` record exists.
- **Full tier:** 687 of 687 passed.
- **Frames (Performance, the gate):** p95 18.0 ms, world build 309 ms: passes. First race load 5,349 ms (over 5 s, a
  warning). High p95 28.3 ms; `frame-pacing` is on the standing list, and High is a gate only against a control timed
  with the laptop alone (rule 8), which last night cannot show.
- **Browser:** 197 ran, 11 failed. Claude ran the 35 that were cut off afterwards: 34 passed, including the save and
  pay guards (`warlord-pay`, `wasteland-career`, `yard-home`).

## Sorted

- **Standing list:** `deep-frames`, `frame-pacing`.
- **Cured:** `lab-classroom-fire`, `-lift`, `-projectile`, `lab-view`. The test page's QA panel (open by default) had
  grown and two of its buttons lay under the key-idea card; the overlap check now leaves that panel out (`3df6aa7af`,
  merged in `414201059`, confirmed by an independent reviewer). Not a game fault.
- **Known card:** `machine-borer` (the Dig's second view inside the rock; ruling on QA-NIGHT-18-NOV).
- **Passed on one rerun alone (rule 3):** `arsenal-wave1-audio`, `p4-audio`, `everburn-job1`, `lab-walk`.
- **Open, here:** `wildlife-view` fails ("Nothing ran: [0,0]", the herd does not flee) on every run today, including on
  `42f002f59`, the commit on which it passed in the night of 18 November; Chrome is unchanged since 17 November. So
  the failure follows something outside the code: suspect the clock or date (time of day, a date-seeded herd) or the
  laptop's state. Within rule 4's 30 minutes the cause was not found.

## What to do

1. `wildlife-view`. Found so far (19 November, morning): `src/wildlife-view.js` places herds by `calendarPlayDay(new Date())`, so the herds stand somewhere new each calendar day. Today the scenario picks a herd of 8 at lateral -26 m on seed and lap; only 2 animals (of 3 in the scene) are drawn, and neither flees as the car passes, though `startle` is 35 m. Next: give the scenario a fixed play day (`createWildlifeView` already takes `playDay`), then see whether the herd still does not flee: if it does not, the startle has a real fault. Then find what the herd's start reads besides the code (search the wildlife modules and the scenario for
   `Date`, `performance.now`, time of day); make the scenario fix it, or show it is real.
2. The four-hour limit: a full night with every browser scenario takes longer than four hours on this laptop.
   QA-NIGHT-SIZED (merged 19 November) makes most nights smaller, but a full night still needs more time. Done: Kyle raised
   the limit to six hours on 19 November (decisions page).
3. High at 28.3 ms: at the next frame check with the laptop alone, time the last commit that passed on High as the
   control first (rule 8).
4. Fold the one-off misses into their existing cards only if they fail again.

## Item 1 is done (Claude, 19 November 2026, evening)

`wildlife-view` was not a fault in the game. The herds stand somewhere new each calendar day, and on 19 November the
check's own sweep along the lap startled its herd before the drive that was meant to. The scenario now fixes its play
day (`globalThis.__qaWildlifeDay`, a QA hook read by `viewPlayDay`), plans the herd from the rules, steps a fixed
distance a frame and checks the herd stands where the plan put it. The startle is sound: over 40 days on two courses,
205 of 210 animals within 34 m of the road ran from a passing car. Still open here: item 3, High at 28.3 ms.
