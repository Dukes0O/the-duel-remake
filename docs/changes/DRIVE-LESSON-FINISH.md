# DRIVE-LESSON-FINISH

## Decision before code

Kyle asked Codex to gather evidence for Claude's finishing card and fix unclear
lesson 1 guidance. Keep simulation, pass rules, instructor pace and rolling
speeds unchanged. Clarify the four rules and show the first failed rule with
the action to take on the result card itself (the live checklist is hidden
on results). Explain wall, off-road, stop and slow-challenge retries there too.
Only lesson 1 wording changes; no helicopter files change.

Checks: scripted keyboard late/right attempts on both corners and settings,
slightly imperfect challenge attempts, 1280x720 browser captures, existing
lesson UI checks, lane tier with four jobs, production build. Feature switches
are enabled only by QA URLs; all careers use memory-only storage.

## Findings

**The Cutting can be passed on the keyboard. Beaver Hairpin is not cleared by
this check. The late try does not reliably demonstrate a long screech.**

Final browser run: private port 6088, 1280x720, seed 1989, stock Falcone F42,
Club driver, all seven upgrades at zero. Each row uses a fresh funded temporary
player, so a challenge's brake reward cannot alter the next setting. Both
`driving-lessons` and `tyre-slip` are enabled only in the QA URL. No real
careers are read. No helicopter files, physics, pass rules or flag defaults
changed.

The script sends Arrow key and E/Q key events through the production keyboard
adapter and steps the App at 120 Hz. It follows the instructor's recorded line
with binary key taps; it never places the car, supplies analog controls or
invents a result. These are automated keyboard results, not a child playtest.
The headless browser is muted: screech below means measured tyre-slip duration,
not an independently heard or recorded sound verdict.

| Corner / setting | Instructor mark / time | Late try | Late time lost | Late screech / wide | Right try / time lost |
| --- | --- | --- | --- | --- | --- |
| The Cutting / Casual | 92% / 10.35 s | Finished; late demo falls short of 0.50 s screech | -1.94 s (faster) | 0.21 s / 3.80 m wider than instructor trace | Pass, four rules / +0.11 s |
| The Cutting / Pro | 97% / 10.03 s | Wall at 237.9 m; demo falls short of 0.50 s screech | No finish comparison | 0.27 s / 6.43 m wider | Pass, four rules / +0.07 s |
| Beaver Hairpin / Casual | 92% / 16.87 s | Wall at 216.6 m, before brake cone | No finish comparison | 0.00 s / hairpin not reached | Fail: same wall, no brake press / no finish comparison |
| Beaver Hairpin / Pro | 97% / 16.28 s | Wall at 217.0 m, before brake cone | No finish comparison | 0.00 s / hairpin not reached | Fail: same wall, no brake press / no finish comparison |

Rolling starts remain 100 mph at The Cutting and 75 mph at Beaver Hairpin.
The late stage always advances under the unchanged rules; its `passed` field
is not its teaching verdict. No positive time loss is invented for a crash.
The Cutting's faster late entry agrees with the design's section 3.8: it must
not teach that a late brake necessarily loses time.

At Woods the binary-key trace follower hits the preceding kink before it can
perform the intended brake-point exercise. This establishes a failing script
and leaves child accessibility unproved; it does not establish that all human
keyboard drivers fail. The instructor can use light braking below 50% on that
approach; a keyboard brake press is 100%. A bounded earlier-lift follow-up also
failed; no game tuning was applied to make this check pass. Claude should
review the approach before accepting this corner.

## Margin without a perfect run

At The Cutting, a 99%-of-line-speed keyboard run wins three consecutive
attempts on both settings:

| Setting | Student | Instructor | Margin each time | Imperfection |
| --- | --- | --- | --- | --- |
| Casual | 9.84 s | 10.35 s | 0.51 s (4.9%) | Brake misses the right-try window; line runs up to 1.52 m wide of instructor |
| Pro | 9.93 s | 10.03 s | 0.11 s (1.1%) | Binary steering and line up to 1.42 m wide of instructor |

These are short corner attempts, not perfect laps. Challenge rules check time
and a clean finish, not the four right-try rules. All three identical replays
passed, but they are one deterministic driving pattern, not three independent
human trials. Pro's spare time is small. Woods challenge margin was not
measured because the right try did not pass; do not call it child-ready.

## Screen guidance and fix

Before the fix, right-try failures showed `Try again`, the times and screech.
The checklist named missed rules while driving, but CSS hides the entire panel
on results. Radio coaching named a rule, but the result card did not preserve
why it failed or what to change.

The result card now names the first missed rule and a next action: brake at
cone 1 within the actual window, pass within 2.5 m of cone 2, hold the
accelerator before cone 3 and finish on the outside half, or finish braking
before turning to keep screech under 0.30 s. Wall, off-road, stop and a slow
challenge each get their own explanation. The running guide spells out those
cone rules instead of `Accelerate out wide`. The right-try guide is readable
at 1280x720. Pass rules and existing test assertions are unchanged.

The captured Woods failure now says: `You hit the wall. Brake earlier and
steer gently to stay on the road.` A first-run Pro apex miss also displayed
`You missed inside cone 2. Aim closer: pass within 2.5 m of it.` No generic
`Not quite` message remains as the only explanation in these lesson 1 cards.
Recorded radio remains unchanged; its brake-cone coaching can still follow a
wall result, so Claude should include that in the teaching review.

## Proposals only

- Keep Casual at 92% and The Cutting's 100 mph start: measured spare time is
  0.51 s with imperfect keyboard driving.
- Trial Pro at 95% instead of 97%. That lowers its planned speed by 2.06%
  relative to today; current measured spare time is only 0.11 s. This is a
  proposal, not a measured new margin, and needs Claude's review.
- Trial Woods' rolling start at 60 mph instead of 75 mph (20% lower) before
  moving its cones or rules. Compare a lift-only approach and both late/right
  tries. No claim that 60 mph passes: it was not applied or measured here.
- Do not change the pass rules or claim the keyboard late try produces
  0.50 s of screech. Its short/absent screech and the Woods approach need a
  separate design decision; tuning cannot be called a finished fix here.

## Evidence and reproduction

All 22 full screenshots and the JSON results are in
`.evidence/2026-10-26/DRIVE-LESSON-FINISH/`. The one comparison sheet is
`lesson1-comparison.jpg` (333,859 bytes, below 500 KB). It shows a close cone
approach, right-try instructions, the failed-try advice and the three-win Pro
result. Raw pictures remain for Claude's requested review. Earlier trial
pictures and the interrupted follow-up were recycled.

Recipe in PowerShell (the flag exists only in this child Node process):

```powershell
node --input-type=module -e "process.env.DUEL_LESSON_FINISH='1'; const {main}=await import('./tools/browser-harness.mjs'); process.exitCode=await main(['scenario','drive-lesson-run','--output-dir','.evidence/2026-10-26/DRIVE-LESSON-FINISH']);"
python tools/drive-lesson-finish-sheet.py .evidence/2026-10-26/DRIVE-LESSON-FINISH
```

The final captures preceded the recipe's move behind the existing scenario's
opt-in hook; only its dispatch location changed, not the driver or game.
Ordinary daily browser runs keep their existing lesson scenario unchanged.
The normal harness's `passed` means the browser scenario completed without
console errors; the per-attempt JSON and table above retain the driving
failures. It is not a lesson acceptance pass. The final run had zero console
errors and warnings.

One follow-up was stopped after discovering two older heavy jobs; only this
lane's own process tree was stopped and its temporary profile recycled. No
other session's jobs or the live server were touched.

## Validation

- Independent code review: clear. The reviewer confirmed advice matches the
  unchanged rules and lessons 2 to 4 are unaffected.
- Existing focused UI checks: 3 passed before the added retry regression.
- Lane tier: initial exact requested command
  `node tools/run-tests.mjs --tier lane --changed --jobs 4` earned seven
  passes, then stopped on the existing browser-discovery assertion. The new
  manual scenario had changed its discovery list. Fixed the recipe placement
  and opt-in hook instead of changing that assertion. Continued the same
  four-job lane tier with filters for the fixed suite and every remaining
  suite (including the final change's extra affected suite): 25 passed,
  zero failed, zero not run, 141.26 s. Combined final selection: 32/32 passed;
  the seven unchanged passes were not repeated, per AGENTS rule 19.
- Native lesson UI/session acceptance, the new eight-path retry regression,
  helicopter isolation, and lessons 2 to 4 view checks passed in that tier.
- Replay fingerprints: 225 checks across 25 cases, 23 events, nine categories,
  three FPS values and three runs passed. Combat replay fingerprints: 12
  checks across four encounters passed. World composition: 47 exact scene
  and immutable-feature checks passed. No pins were re-recorded.
- `npm run build`: passed, 540 modules, 991 ms. Vite reports the existing
  large-chunk and mixed static/dynamic game import warnings.
- Final independent code and evidence-hook reviews: clear. The manual capture
  is excluded from daily runs by using only the existing scenario's opt-in
  environment flag; the browser-discovery implementation is unchanged.
- Session-end status generated without a live-root argument; Cockpit board
  sync completed. It flagged unrelated HELI-CARRY-CLEAR as lacking a task;
  this lane did not edit that card or its tracking.
- No replay pins, world signatures or existing test assertions changed.

## Removed

Replaced vague lesson 1 rule labels and unexplained result retries. No assets,
pass rules, saves or runtime dependencies removed.
