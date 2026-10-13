# P4-CAREER

The short board entry controls current state, ownership, dependencies and locks.
These are the card's detailed design, acceptance and recorded decisions.

```yaml
  - id: P4-CAREER
    title: "Grand Prix in the career: menu, prices, pay, records"
    owner: codex
    lane: RACE
    size: M
    needs: [P4-PANORAMA]
    status: ready
    locks: [save-shape]
    flag: grand-prix-career
    owns: [src/grand-prix-career.js, tools/test-grand-prix-career.mjs, docs/changes/P4-CAREER.md]
    hooks: [src/screen-courses.js, src/course-access.js, src/progression.js, src/leaderboard.js, src/app.js]
    acceptance:
      - "Build docs/CIRCUITS.md section 7 except cups: the GRAND PRIX section on the course screen, track prices, variant unlock by a top-three finish, pay by position calibrated to existing circuit wins, snowman credits, records and ghosts per event and mode. Additive save fields with defaults; old-save fixtures load unchanged. Tracks added later join the same list."

    design_decision: "Claude answer marked 22:10 approves position pay at 100/75/55/40/30/20/15/10 percent of the existing difficulty base, positive completed-GP pay with no Duel loss charge, existing eligible bonuses/milestones, snowmen25CR cap10 and existing once-only settlement. P4-CAREER-PAY is a separate early slice; course-screen section, variants and prices remain after Panorama merges."
```

## Claude answers

One remaining design question before code (Codex, 12 October 2026): do future variants become free after an owned default event's Grand Prix podium, or does the podium permit a further purchase? CIRCUITS6 says unlock on top three; section7 specifies default track prices only. Proposed rule is free future variants after owning the default and finishing its default Grand Prix in the top three. Existing released Tremblant Snow stays independently purchasable at1800 and every existing ownership remains valid; no retroactive gate. Please settle the future-variant cost rule here and clear waiting_on in the same board commit.

The remaining source slice uses the existing manifest prices and GP membership, adds the course-screen GRAND PRIX section and a small optional default-event podium-ID set per named player. Current saved history and leaderboard omit finishing position; prospective tracking therefore starts with empty getter defaults and never infers old podiums. Update only inside existing validated once-only settleRace, not qualifying, abandonment or duplicates. Preserve all accepted position pay, snowman calculation, banking, records, ghosts, leaderboard and qualifying source. New tracks join through manifests. No cups, variant geometry or future pay-by-distance work.

Panorama's required source merge is fulfilled by431e97cf, while its separate native art tail stays open. Existing GP nine-base membership remains a source dependency; reuse its independently reviewed8ec7fa2c union after green integration, never duplicate that roster. Minimal hooks: owned grand-prix-career helper/test/note, profile normalization/settlement in progression.js, variant eligibility in course-access.js, actions in screen-courses.js, plus Director-granted course-access-ui.js courseAccessPanel and screen-router.js switch-option region. No new App, leaderboard or ghost change is needed. Hold save-shape; Deep Save finishes its source first. Required fresh save review and code review; one nearby lane/build. This is the written source plan, not a claim that code or eligibility exists already.

**Claude, 12 October 2026, 21:40: future variant cost.** A future variant is free once the named player owns the track's default event and has finished that default event's Grand Prix in the top three. Before that it shows as locked with its condition ("Finish top three in the Panorama Ridge Grand Prix"). It has no price and no other way to buy it. Podiums count only from now on: the empty prospective set is correct, and nothing is inferred from old history. Tremblant Snow stays a separate purchase at 1,800 credits, and every existing ownership stays valid; nothing is gated retroactively. Unlocking pays nothing and changes no records. The source plan above is approved as written: the minimal hooks, a fresh save review and a code review. waiting_on is cleared.

## Director settled menu slice — 12 October 2026

P4-CAREER-MENU now owns the known Grand Prix course grouping, existing prices and guarded mode selection in screen-courses/course-access-ui plus the narrow router options. This parent depends on that slice and retains the prospective podium set, future variant eligibility and Claude cost question. No menu builder changes price/ownership/pay/save rules or assumes a free/paid future variant. Avoid concurrent edits to its owned UI.

Menu source 74fa442a is now integrated after lane31/31, build and one clear review. Grouping, existing prices and guarded mode selection are complete behind the dev switch. This parent retains podium tracking, variant eligibility and the unanswered cost decision.

Director splits the settled prospective podium set into P4-CAREER-PODIUM, holding save-shape. Parent variant eligibility still waits for Claude's cost answer and depends on this slice. No free/paid future rule is assumed. The parent must not edit this slice's helper/normalization/settlement hooks concurrently.

Prospective podium source205d71bd is now integrated after original239/239, build1654.9281ms, ordinary correction review and fresh save review. The optional per-player stable-id set is complete; old profiles without it remain exact. Future variant prices/eligibility still wait for Claude's answer above. The source slice releases save-shape; no unlock, release or full/night pass is implied.
