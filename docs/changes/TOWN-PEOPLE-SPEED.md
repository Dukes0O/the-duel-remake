# TOWN-PEOPLE-SPEED

## Changed

- Follow-up review fix: the 30-year helper now advances exactly 24 hourly ticks per simulated day. The previous merged helper jumped 23 ticks, ran one step, then ran 24 more steps, so it simulated 48 ticks per day. Population, generation, mood, health, family, history, and no-cap checks remain active.
- Registered the people system through the town entry point. It now runs each
  town tick and processes a stable slice of the population across the day.
- Saved the slice cursor, identity work, deaths, and household totals on the
  town so a save loaded mid-day resumes the same work. Older saves without a
  cursor finish their first update at the next day boundary.
- Kept job matching, home changes, births, arrivals, and family pairing at
  the end of the daily pass.
- Made the core benchmark use five-person households. It still measures
  10,000 people and 5,000 buildings with the existing 30 ms limit.

## Checks

- `node tools/test-town-people.mjs` - passed all 36 checks in 26.95 seconds. The 30-year town produced 1,410 living people and 999 Old Ground entries; the 10,000-person day took 20.32 ms.
- `node tools/test-town-core.mjs` - passed 641 checks. The slowest tick was 7.88 ms; its 100,000-tick replay matched.
- `node tools/test-town-deeds.mjs`, `node tools/test-town-money.mjs`, and `node tools/test-town-goods.mjs` - passed.
- `npm.cmd run build` - passed. Vite reported non-blocking dynamic-import and large-chunk warnings.
- Browser and look checks - not named by this card. No race fingerprints
  apply; the town core replay comparison passed.

## Changed assertions

- Added a check that each simulated day advances exactly 24 ticks. No population or performance assertions were weakened.
- Updated the people-system cadence check from one run every 24 ticks to one
  run each tick, as required to spread its work across the day. This does not
  loosen the check. Added entry-point registration, mid-day save/load resume,
  and maximum-tick checks; the 30 ms day limit is unchanged.
- Claude should review the changed cadence assertion, the saved cursor, and
  the grouped benchmark households.

## Removed

- Removed the old whole-population `ensureHomes` pass; homes are now prepared
  as each stable slice is processed.
- Removed the obsolete partner-map path from `recordPassing`; partner links
  are cleared when the daily pass is assembled.
