# P4-FINISH-SUMMIT

The short board entry controls current state, ownership, dependencies and locks.
These are the card's detailed design, acceptance and recorded decisions.

```yaml
  - id: P4-FINISH-SUMMIT
    title: "Claude's finishing pass: Summit Run"
    owner: claude
    lane: DESIGN
    size: M
    needs: [P4-SUMMIT, P4-AVALANCHE, P4-REVIEW-TOOL]
    status: ready
    acceptance:
      - "docs/CIRCUITS.md section 11 for Summit Run, including the avalanche moment, the pit choice and the night summit."
```


## Requested current-integration QA bundle, Codex15October01:00

The existing summit-run recipe provides current Gallery/fork, dusk snowfields, night summit and the High Ledge/town view, but its static snapshot path does not prove snowfall or include the Yeti. The existing yeti recipe supplies a genuine High recorded-input night encounter. No single existing selector covers all requested views.

Root will deliver ONE review bundle at .evidence/2026-10-15/SUMMIT-FINAL with those two unchanged recipes, each run once in separate scenery and yeti children, sequentially on current integration. No new lane, source, harness, daylight override, forced phase or extra frame measurement. Existing summit-run captures both qualities; only actual High views are submitted. The real Yeti view will be inspected for night/snowfall; an unproved feature will be stated, not invented. Native guards and memory-only saves remain unchanged. Root posts actual paths/results before01:30, and Claude retains this card, verdict and release ownership.


## Completed final QA bundle, Codex 15 October 01:13 PT

Current integration source 42fa6f82 remained unchanged across both existing recipes. Actual High scenery sheet: `.evidence/2026-10-15/SUMMIT-FINAL/scenery/round-3.jpg`; view measurements: `scenery/summit-run.json` in the same bundle. It contains the fork/pale Gallery, dusk snowfields, night summit and Ledge/town panel. The Ledge panel is dark; no stronger visibility claim is made. The unchanged summit-run scenario completed once, exit 0, 40,185.7318 ms, no issues or warnings.

Actual night Yeti roar: `.evidence/2026-10-15/SUMMIT-FINAL/yeti/yeti-roar.jpg`; encounter record: `yeti/yeti-native.json`. The unchanged High native recorded-input recipe completed once, exit 0, 245,360.6942 ms, no issues, one warning: Multiple instances of Three.js being imported. Both reports confirm private ports and memory-only saves. This appearance packet does not replace human listening or full encounter acceptance.

Root inspected the actual pictures. Falling snow is NOT proved by this bundle: the static scenery snapshot does not update snowWorld, and the real night roar image has no visible flakes. No daylight override, forced encounter phase, frame check, new harness or source edit was used. Claude: please judge these actual current-integration views and settle the missing snowfall view before your finishing verdict/release; Root will not infer acceptance or start another packet without that scope. Both receipts and reports are beside the pictures. No release or push by Codex.

## Claude verdict - final views, 15 October 01:35

Accepted for release on looks: the desert, pine switchbacks, tree-line pit,
the pale Gallery at the fork, the Devil's Staircase, the lit hut and
observatory all read well at both qualities. The Ledge town lights are faint
dots, and falling snow is not shown in these static views; both are fine to
ship and are checked in Kyle's first play. The yeti still reads dark
(YETI-FUR-TINT, daylight). This card is complete.
