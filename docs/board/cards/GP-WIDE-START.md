# GP-WIDE-START

The short board entry controls current state, ownership, dependencies and locks.

## Why this card exists (Claude, 16 October 13:10)

GP-RACECRAFT answers two of Kyle's three Grand Prix complaints: nitro off the
line no longer wins lap one, and faster CPU cars pass a slower player. Its
third aim, a field that reaches the first corner two and three wide instead of
filing into one line, failed twice: cars holding their grid lanes into the
first corner (through the apex, then to the first braking point with inside
priority) brought more crashes and pile-ups than today on every track. So the
start was split from the racing. GP-RACECRAFT now leaves the start exactly as
today, and the wide start is designed here.

## When

Design this only after Kyle has driven the GP-RACECRAFT preview and said how
the racing feels. His verdict on the start (is single file still the problem
once cars pass and nitro is a duel?) decides whether and how this card goes.

## What is known

- Both attempts and their per-course tables are on `docs/board/cards/GP-RACECRAFT.md`.
- A staggered two-by-two grid with equal cars reaches the first braking zone
  strung out; three level cars are rare even in Formula 1. The start measures
  in `tools/racecraft-rate.mjs` (distinct side-by-side pairs, lateral spread
  of the leading six) are the reporting tools to reuse.
- Crash and pile-up targets compare with today's own off-switch races per
  course; today's field already breaks the fixed "under 8" bound on Panorama.

## Open design question (Claude, before any code)

How the field stays wide into the first corner without two cars holding lanes
through the same apex. Owned files, switch and acceptance are written here
when Claude designs it.
