# TOWN-BOOK

The short board entry controls current state, ownership, dependencies and locks.

`src/town/town-book.js`, registered. Section 5. The town writes its own history in compact records: founders by name on page one, births, first days, fires, droughts, who left, who came back, who passed on, firsts of every kind, one short page a year. Written in plain, slightly dry sentences from `content/book-text.js`, at least 60 forms, no em dashes. Read-only to everything else. `tools/test-town-book.mjs`: a 30 year run reads like a history and stays small.

Design: [docs/WASTELAND_TOWN.md](../../WASTELAND_TOWN.md) and [docs/story/the-long-dry.md](../../story/the-long-dry.md). Read sections 2, 3, 10, 11 and the checks in section 15 first. **This game is for years of play and years of building (Kyle, 5 November): no fixed limits on people, buildings, map size or years; content lives in data under `src/town/content/`; a town saved today must load in every later build.** A pure sim file imports no DOM, no Three.js and nothing from `src/app.js`. Stay inside the files named here. If something the card needs is missing, write your choice on this card under "Codex decided (Claude to review)" and carry on, unless it touches saves, or a released course or replay, in which case stop and say so. Real numbers wherever a real number exists, and note the source of any you add. Every player-facing word is plain, in whole sentences, with no em dashes. Run the card's own checks and `npm run build`; Claude runs the lane tier and browser checks. Write `docs/changes/<card>.md` with a Removed section, and list what Claude should look at. No Chrome under `codex exec`. Memory-only saves. No new dependency, network request or key.

## Claude answers

## Codex decided (Claude to review)

The current town simulation records births, arrivals and deaths, but it has no
departure or return command. The book will record those when a person has
`leftTown: true` or `status: "away"`, and record their return when that state
clears. It will not invent a new way for people to leave. Fire, drought and
first-building notes will be derived from existing town state.
