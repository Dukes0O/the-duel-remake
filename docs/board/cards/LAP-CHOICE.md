# LAP-CHOICE

The short board entry controls current state, ownership, dependencies and locks.
These are the card's detailed design, acceptance and recorded decisions.

```yaml
  - id: LAP-CHOICE
    title: "Choose how many laps; longer races pay more"
    owner: codex
    lane: RACE
    size: M
    needs: []
    status: ready
    locks: [busy-game-files]
    flag: lap-choice
    owns: [src/lap-choice.js, tools/test-lap-choice.mjs, docs/changes/LAP-CHOICE.md]
    hooks: [src/progression.js, src/screen-courses.js, src/course-access-ui.js, src/app.js, src/leaderboard.js]
```

## Kyle's direction (12 October 2026, evening)

"Being able to select how many laps, and then the more laps you win, the more
points you get." This replaces the parked card FUT-PAY-BY-DISTANCE: its formula
is folded in here and that card is closed (replace means remove).

## Settled design (Claude, 12 October 2026)

- **Where.** Lap racing events only: Duel races and Grand Prix on circuits
  with laps. Not on point-to-point Summit Run, Stunt Trial, Checkpoint Rush or
  the combat arenas; those keep their fixed rules.
- **The choice.** Before the start, next to the difficulty: LAPS with the
  event's default (today's `stage.laps`, or `grandPrixLaps` for a Grand Prix),
  then 5 and 10 when they are larger than the default. A default of 3 offers
  3, 5 and 10. No fewer laps than the default, so a shorter race never pays
  the same as a full one. The choice is remembered for the session only; no
  save field.
- **Pay.** Race pay = today's pay x max(1, race distance / 8 km), rounded to
  the nearest 5 credits. Race distance is laps x lap length.
  - "Today's pay" means the existing difficulty base with its finishing
    percentages, bonuses and milestones.
  - The floor of 1 means no race pays less than today.
  - There is no cap: pay grows with distance, so credits per minute of driving
    stay about the same and a ten-lap race is worth its time.
  - Combat bonuses, fines, milestones and once-only settlement are unchanged.
    The factor multiplies the race's finishing pay only.
- **Results and records.** Records, ghosts and leaderboards are already kept
  per lap count (`eventKey` includes laps); keep that. A result is valid when
  its laps equal one of the offered choices for that event, instead of only
  the default.
- **The results screen** shows the distance line under the pay:
  "10 laps · 42.0 km · x5.25".
- **Sound and art.** No new cue or asset; the menu uses the existing option
  control.

## Acceptance

- Every lap-race event offers its choices. Events without laps show none.
- A race at the default lap count pays exactly what it pays today on every
  circuit shorter than 8 km per race. Name every live event whose default
  distance is over 8 km, with its old and new pay, in the change note.
- 5 and 10 laps pay by the formula; completing a race of the chosen length is
  required (quit or timeout pays nothing, as now).
- Old saves, records and ghosts load unchanged. Default-lap replay
  fingerprints are unchanged.
- One independent review (money and pay, rule 17). Lane tier and build.
- Behind a new `lap-choice` switch, dev until Kyle says "go live".

## Removed

FUT-PAY-BY-DISTANCE is closed into this card.

## Director start — 12 October 2026

The control-fix chat owns this next core card under Kyle’s approved shared plan. Mouse and Ambush fixes are integrated; both new lane folders, their consumed output and their merged branch registrations were recycled/removed. Hold busy-game-files and save-shape for runtime, pay and record validation. No new saved lap preference. Before code, map existing runtime/pay/ghost hooks and grant only the additional files actually required. Preserve all default replays and existing single-lap Grand Prix ghost semantics unless Claude explicitly changes that design. No new test machinery, art, cue or dependency. One independent money/save review, one targeted lane/jobs4 and a build. Heavy browser/full checks belong to the scheduled full check.
