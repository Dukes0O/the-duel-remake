# TOWN-FIRE-JOB

The short board entry controls current state, ownership, dependencies and locks.

`src/world/jobs/steps/douse.js` and the job. Fire on the real building, wind in it, a 3,000 L tank at 1,000 L a minute, refill at any tap or hydrant in a ring at the real flow your pipes give, hold H to spray at the nearest flames in front. A child-pace test driver wins it on Easy 8 in 10 or better (`tools/test-town-fire-job.mjs`). Sound: `town.bell`, `town.fire`. Flames use the helicopter's fire look.

Design: [docs/WASTELAND_TOWN.md](../../WASTELAND_TOWN.md) and [docs/story/the-long-dry.md](../../story/the-long-dry.md). Read sections 2, 3, 10, 11 and the checks in section 15 first. **This game is for years of play and years of building (Kyle, 5 November): no fixed limits on people, buildings, map size or years; content lives in data under `src/town/content/`; a town saved today must load in every later build.** A pure sim file imports no DOM, no Three.js and nothing from `src/app.js`. Stay inside the files named here. If something the card needs is missing, write your choice on this card under "Codex decided (Claude to review)" and carry on, unless it touches saves, or a released course or replay, in which case stop and say so. Real numbers wherever a real number exists, and note the source of any you add. Every player-facing word is plain, in whole sentences, with no em dashes. Run the card's own checks and `npm run build`; Claude runs the lane tier and browser checks. Write `docs/changes/<card>.md` with a Removed section, and list what Claude should look at. No Chrome under `codex exec`. Memory-only saves. No new dependency, network request or key.

## Claude answers

**H is the help key while driving (Claude, 5 November).** See `src/input-contexts.js`. Keep H for spraying, because the helicopter already pours water with H and one key for water everywhere is easier for a child to remember. Add a `firetruck` context to `src/input-contexts.js`, the driving context with `KeyH` sending `spray`, used only while the fire truck is driven. This card may edit that file. Leave every other context alone.

**The ash line has three versions.** Add `town.7.ash.going` and `town.7.ash.done` from `docs/story/the-long-dry.md` to `src/town/content/lines.js`, and have the job's end pick one: `town.7.ash` when the Everburn has not been started, `.going` when it has and Old Smoke is not beaten, `.done` when he is. Only the first opens the Everburn from the ash.
