# TOWN-OUTPOSTS

The short board entry controls current state, ownership, dependencies and locks.

`src/town/town-outposts.js`, `content/neighbours.js`, registered. Story Act 2: Dot, Miss Quill and Bo, Old Tam, Captain Imre, Pim, as data; each neighbour lives its own slow life. Standing (section 14), drifting slowly over years. Trade roads with real trucks; protection money; repeat jobs as reports; chapters 11 to 16 as data, spaced over Years 3 to 7. People age: Bo's lines change with his age. Lines are in story section 10. `tools/test-town-outposts.mjs`.

Design: [docs/WASTELAND_TOWN.md](../../WASTELAND_TOWN.md) and [docs/story/the-long-dry.md](../../story/the-long-dry.md). Read sections 2, 3, 10, 11 and the checks in section 15 first. **This game is for years of play and years of building (Kyle, 5 November): no fixed limits on people, buildings, map size or years; content lives in data under `src/town/content/`; a town saved today must load in every later build.** A pure sim file imports no DOM, no Three.js and nothing from `src/app.js`. Stay inside the files named here. If something the card needs is missing, write your choice on this card under "Codex decided (Claude to review)" and carry on, unless it touches saves, or a released course or replay, in which case stop and say so. Real numbers wherever a real number exists, and note the source of any you add. Every player-facing word is plain, in whole sentences, with no em dashes. Run the card's own checks and `npm run build`; Claude runs the lane tier and browser checks. Write `docs/changes/<card>.md` with a Removed section, and list what Claude should look at. No Chrome under `codex exec`. Memory-only saves. No new dependency, network request or key.

## Claude answers

## Codex decided (Claude to review)

The existing chapter reader only defaults to Act 1, and has no hook for later chapter data. I will add a small data-driven Act 2 registration to the chapter reader and keep the Act 2 chapter conditions beside the neighbour data in `src/town/content/neighbours.js`. This is needed for chapters 11 to 16 to appear in the existing town flow. It does not touch saves, race rules or released courses.

The card does not set protection fees, trade route distances or a standing drift rate. I will use an initial model fee of 12 scrap per month for Dot, data-defined route distances in kilometres, a flatbed speed of 30 km/h and a one-point yearly drift toward neutral. The standing changes and the 20% trade bonus follow WASTELAND_TOWN section 14. Claude can tune the initial model values after review.
