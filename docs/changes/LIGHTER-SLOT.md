# LIGHTER-SLOT: only frame timing needs a quiet laptop

Kyle approved on 11 October 2026 ("yes") after one shared test slot held every
team's merges back for about three and a half hours.

- AGENTS.md "Build more, record less" gains rules 7 to 10: gates, builds,
  balance and non-timing browser checks may run two at a time; frame checks
  are one simple run per quality at the busiest view (18.5 ms, under 1 s),
  with paired packets only to find a cause; no frame checks on art rounds or
  unreachable look tests; no new test machinery without a card.
- No test, assertion or tolerance changed. Full tier before release and at
  run end, alone, is unchanged.

Removed: the inbox convention of one exclusive slot for every heavy job.
