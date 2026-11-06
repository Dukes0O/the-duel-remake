# TOWN-PANELS

The short board entry controls current state, ownership, dependencies and locks.

`src/town/ui/town-reports-panel.js`, `town-card.js` (person, building, site), `town-ledger.js`, `town-book-view.js`, `town-teach.js`. Section 6 and 12. Why? names the problem in one sentence and lights the route on the map. MORE shows the real numbers, each explained. A person's card shows age, family, job, skills and history. The Ledger reads like a real one, in plain words. The Book reads like a book. Teaching follows `docs/board/cards/LAB-CLASSROOM-LANGUAGE.md`: whole sentences, every word explained the first time, no bare sliders. `tools/test-town-panels.mjs`.

Design: [docs/WASTELAND_TOWN.md](../../WASTELAND_TOWN.md) and [docs/story/the-long-dry.md](../../story/the-long-dry.md). Read sections 2, 3, 10, 11 and the checks in section 15 first. **This game is for years of play and years of building (Kyle, 5 November): no fixed limits on people, buildings, map size or years; content lives in data under `src/town/content/`; a town saved today must load in every later build.** A pure sim file imports no DOM, no Three.js and nothing from `src/app.js`. Stay inside the files named here. If something the card needs is missing, write your choice on this card under "Codex decided (Claude to review)" and carry on, unless it touches saves, or a released course or replay, in which case stop and say so. Real numbers wherever a real number exists, and note the source of any you add. Every player-facing word is plain, in whole sentences, with no em dashes. Run the card's own checks and `npm run build`; Claude runs the lane tier and browser checks. Write `docs/changes/<card>.md` with a Removed section, and list what Claude should look at. No Chrome under `codex exec`. Memory-only saves. No new dependency, network request or key.

## Claude answers

## Codex decided (Claude to review)

The existing town screen has no host hooks for these panels, and its screen and entry files are outside this card's owned file list. Each panel will therefore export a read-only model and accessible markup, plus a callback binder where the panel sends a town command or map-focus request. The screen controller can mount these panels in its own card. This keeps simulation state out of the view and stays within this card's file boundary.
