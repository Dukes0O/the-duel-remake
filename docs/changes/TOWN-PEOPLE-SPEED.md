# TOWN-PEOPLE-SPEED

## Changed

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

- `node tools/test-town-core.mjs` - passed, 641 checks. The 10,000-person,
  5,000-building day took 27.69 ms; the slowest tick took 4.89 ms. The
  100,000-tick replay matched.
- `node tools/test-town-people.mjs` - passed, 35 checks. The 30-year towns
  produced 7,188 living people and 38 Old Ground entries. The 10,000-person
  day took 28.95 ms.
- `npm.cmd run build` - passed. Vite reported non-blocking dynamic-import and
  large-chunk warnings.
- Browser and look checks - not named by this card. No race fingerprints
  apply; the town core replay comparison passed.

## Changed assertions

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
