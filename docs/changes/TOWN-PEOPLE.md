# TOWN-PEOPLE

## Design

The daily system creates twelve named founders, then advances individual
people with names, birth time, family, home, job, skills, needs, health, mood,
short history and seasonal thoughts. It uses existing town fields and adds
optional, backward-compatible person data. Birth time is an absolute town-hour
tick. Arrival conditions are read from optional measured water and shelter
values; home growth also needs painted ground.

The simulation uses the design's 15 litre survival-water need, 2,100 kcal food
need, 16 to 65 working ages and eight-hour day. School runs from age 6 for ten
years. The card records that arrival growth, births, old-age passing and
health, mood and home timing are simulation tuning choices because the design
does not give rates. Year 1 arrivals follow the section 14 formula; their
monthly target grows as the town ages.

## Evidence

- `node tools/test-town-people.mjs`: passed, 35 checks. The 30-year run ended
  with 7,357 living people and 33 Old Ground entries. The steady-state day
  measured 14.61 ms with 10,001 people and 5,000 buildings, below the 30 ms
  target.
- `npm.cmd run build`: passed. Vite reports the existing `src/game.js`
  dynamic-import warning, warns that several bundles exceed 500 kB, and reports
  plugin timing details.
- Browser and look checks: not run. Claude should review the name, need,
  thought and Old Ground records when the town view is connected; this card
  has no rendered town screen.
- Changed assertions: no existing assertions changed or loosened. The new
  30-year test jumps directly to each daily boundary because this system runs
  once per day. It checks the full 30 years and deterministic replay.
- Race fingerprints: not run. No race code or course data changed.

## Removed

Nothing in game code was replaced. Temporary test and build logs will be
removed before commit.
