# OPEN-THREAD-SHAPE: what the shape could not say

All nine files pass the tightened `checkThread`. Wherever section 18 has no key for something a file says, the
thing is kept word for word under `notes` (on the beat, or at the top of the file) and the work carried on. Each
line below says what was put under `notes`, and my pick for what section 18 should add. Nothing is blocked.

## Things that change what the game does if the rule never reads `notes`

These are the ones to settle first, because the rule would not make the effect or ask the condition.

- **`effects` on a question.** A question asked can make a mark, a rumour or a favour (stranded-hauler, dace-goes-looking,
  mall-road-toll, market-day, radio-hill-voice, lights-on-the-whites, runaway; about 25 questions). They sit under the
  beat's `notes.questionEffects` (or `notes.questions.<id>.effects`). Several of those marks are read by the file's own
  conditions (mall-road-toll `stands-*`, market-day `odd-asked`). Pick: add `effects` to a question.
- **Outcomes on a beat that is not a mission** (dry-pump `hall`, `shoe-shop`, `road-out`; runaway `search-slept`).
  dry-pump's three are wrapped in a mission that holds only `id` and `outcomes` (`dry-pump/mall/...`), with
  `notes.partOfMission`. Pick: allow `outcomes` on a beat, or say a mission may be one scene of a larger one.
- **A person or a people as a place** (`reach`): stranded-hauler `@hauler`, dace-goes-looking `@dace`, runaway `@haven`
  (cast from peoples). Kept as `notes.when`. Pick: `reach` accepts a person's id, and a role cast from persons or peoples.
- **The sign's own place** (`{near: 'sign', within}` in stranded-hauler). Pick: `{reach: 'sign'}`.
- **A beat that waits for the director to draw the sign again** (stranded-hauler `between`, `{sign: 'again'}`). Pick: a
  condition `{sign: 'again'}`, and `again: {afterNights, when, at}` on the sign.
- **Times of day finer than `day`, `dusk`, `dark`** (`first-light`, `noon`; mall-road-toll, market-day). Kept in notes. Pick: add `dawn`
  and `noon` to `part`.
- **A place that is only the hearth or the yard.** mall, market, flag and runaway write `['tin-town', 'the hearth']`
  or `['tin-town', 'the yard']`, keeping the writer's string as the spot. somebody-elses-flag `at: 'tin-town-board'` is
  written `['tin-town', 'board']`: that spot name is a guess. Pick: the register names Tin Town's spots.
- **Ending a storyline and keeping a beat open** (dry-pump `penny-owed`, runaway `what-he-leaves` and `drawn-at-the-haven`).
  Mended so the walk is clean: each follows a beat with `after` and names the end the storyline already reached. Pick: say
  in section 18 that a beat may follow an end, and `next` there repeats it.
- **A condition for one end** (`{ended: 'unanswered'}`) for `later` rows: radio-hill-voice and mall-road-toll use
  `{fact: 'thread', at: 'over'}` plus marks, which is true for any end. Pick: `{ended: 'name'}`.
- **`ignored` that fires after a count of choices or days** (market-day and somebody-elses-flag `orAfter`, runaway `after: {days}`),
  and **`ignored` that differs by beat** (stranded-hauler: trap versus hauler). In `notes`. Pick: `ignored.afterChoice`, and
  `ignored` may be a list of {when, ...}.
- **Several effects of one list that depend on each other** (mall-road-toll `paying` counts five steps with the effect of
  step 1 changing its own condition). Pick: say in section 18 that the `when` of every effect in a list is judged before any is made.

## Words and numbers the rule would want a key for

- `cue` on a line, a choice, an outcome, a question and a mission; a second cue on a beat (mall `open.toll.pole`, market
  `open.market.crowd`). In `notes`. Pick: `cue` on each of those.
- `at`/`moment` on a mission line or thought (said when `buggies-seen`, `tyres-lost`, and so on): lines keep their order and the
  moments are in `notes.lineMoments`. Pick: a `moment` key on a line and a thought.
- `thoughtWhen` on a choice (the choice is offered to everybody, the thought only on a condition: mall `home`,
  flag `pen-down`). The thought text is on the choice, so it would be read for everybody. Pick: `thoughtWhen`.
- `after`/`before` slots for a thought or a line (runaway `hearth` closing line, `shed` thoughts before the choice; radio
  `wait-dark` thought after a choice). Pick: a `slot` on a line or thought, or `afterChoice`.
- `choices` and `questions` on a thing to find, an outcome or a question, and `thoughts` on an outcome (mall `lost-buggy`,
  `round.outcomes.seen`, `stand.outcomes.held`; runaway `among-the-walkers`; lights `sounded`). Each was lifted to a new beat
  that holds them (mall `caught`, `wage-offer`; runaway `surrounded`, `arrived`; dace-goes-looking `radio-check`, `telling`,
  `leaving`, `key-was-taken`, `he-took-it`, `he-stayed`; market `glass`), so the beat list is longer than before.
- `when` on an outcome (lights `two-trips` `met-on-the-way`; dry-pump `road-out` `clear`). In `notes.outcomeWhen`.
- A mend's `cue`, `during` and `after` lines (stranded-hauler, dry-pump, dace). In `notes.mend`.
- `service` (a trade, with prices) on a beat (stranded-hauler `gate`); `prices` on a mission (market `day`).
- A role's `hostileWith` (market `odd`), `placed` (radio `pocket`), site kinds (dace `siteKinds`). In top-level `notes`.
- Sign extras: `what`, `lamps`, `mapName`, `struck`, `stands: {road, share}`, `toward`, `haze` and the like. In top-level `notes.sign`.
- A refusing choice (radio `read-the-news`) is written with real keys: the refusal line has `when: ratsAtWar` and the rest `when: {not: ratsAtWar}`.
- `words` on a `later` row, for a talk the player starts (mall `round.tell`: the player's words are in `notes.laterWords`). A `later` row
  speaks unprompted, so this one changes who starts the talk.
- `next` as "may lead to any of these" (lights `give-ember`, runaway `hearth`). `next` left off, the list in `notes`.
- `nights: 1` with no `since` on a beat that needs it to be live (`afterBankedNight`): read as "since this beat was reached",
  which is circular for a beat that waits on it. Pick: `{nights: 1, since: 'beat'}` with an earlier beat.

## Choices I made that the Director should look at

- A mark's `text` is on the first effect that makes it, as the card says. The same sentence was sometimes written on several effects, and the
  string comparison counts each, so the extra copies sit word for word in `notes` (`markSentenceRepeats`, `repeatedMarkText`,
  `marks`): about 30 in all. They can be deleted when the comparison no longer needs them.
- `when: 'sign-seen'` replaces market-day's `{talk: 'dot'}`, with `sign.by: 'dot'`.
- A choice or question that came out of a talk now has `when: {asked: id}`; mall-road-toll's promise choices add `{not: stands(x)}` so one is
  not offered twice; runaway `gate` gets `inTinTown` on `keep`, `pay`, `hand-back` and `not inTinTown` on `not-telling`, which the file only implied.
- Beat `closed` is now `shut` (mall) and `quarrel` is now `yard-quarrel` (market), because an end has the same name and `next` could not tell them apart.
- A car wrecked in a mission is not written (`takesShareOfScrap` and a `wrecked` outcome of mall `round` are gone). The sentences stay. The `lost` lines
  still say "half the scrap".
- A `later` row's prose `where` is kept word for word in `notes`, since a row cannot carry `notes`; where the prose named a place the register has, `at` is set.
- Mission `by` (`car` or `foot`) was set where a page said "driven" or "walked", and left off where it did not.
