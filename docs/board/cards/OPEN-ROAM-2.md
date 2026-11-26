# OPEN-ROAM-2

The short board entry controls current state, ownership, dependencies and locks.

**Codex model: Sol.** Cut on 26 November 2026 from Claude's first hand drive of the merged open land (the roam, Tin
Town's people, a talk, the drive out and the finding of the Glasshouse). Design: `docs/story/open-scablands.md`
sections 13 and 14.

## What the drive found, and what to build

1. **Tin Town is nearly empty and still.** Outside the sheds only Auntie Solder and Cinder are about, each moving
   about two metres every twenty seconds beside the hearth. A town of forty-five shacks needs people going about their
   day. Give it:
   - **Auntie Solder, by day:** a round of the town, not a loop at the hearth: the hearth (40 s, `cook`), the store
     door (20 s), the pump (15 s), the gate (20 s, looking out), back to the hearth. Dusk at the hearth; dark asleep.
   - **Cinder, by day:** the kiln (60 s), carrying a load to the store (`haul-sack`), back. Dusk banking the kiln.
   - **The cook, the porter and the child** (the figures `tin-cook`, `tin-porter` and `tin-child`, merged and unused):
     the cook between the hearth and the store, the porter carrying sacks between the store and the gate, the child
     wandering between the pump and the washing lines, and fetching water.
   - Each walk is at least thirty metres, so that a player standing anywhere in the town sees somebody moving.
2. **A greeting ends by itself.** Walking up to somebody gives their lines, and then the talk closes on its own. "Walk
   away." as the only choice is a menu with nothing in it. A talk shows choices only when there is something to ask or
   choose.
3. **The pause screen says what this is.** In a roam it reads "Out in the open" as its title (not "Job on hold"),
   shows no "Time on the job", and does not say that leaving forfeits earnings, because leaving a roam saves. Its
   buttons are "Back out" and "Home to the yard"; "Start again" is not offered in a roam.
4. **No objective banner in a roam.** "Keep going" shows while nothing is asked of the player. Show nothing.
5. **The weapon is lowered in town.** On foot inside Tin Town, or within 60 m of a found camp whose people are not
   hostile, the weapon is held low and no aiming prompt shows. It comes up by itself when a car or an enemy comes
   within range, or when the player presses the fire button.

## Files and locks

`src/world/open/content/people-town.js`, `src/world/open/parts/people.js`, `src/world/open/content/talk-town.js`, the
talk's close in `src/story/talk.js` or its step (whichever owns "options"), the pause screen's roam case in
`src/screen-arena.js`, the HUD's objective line and weapon prompt where they read the job (find them), and the lowered
weapon in the on-foot weapons' view. Lock: `busy-game-files` if `src/app.js` is touched.

## Checks

`tools/test-open-roam.mjs` and `tools/test-open-routines.mjs` extended: over ten minutes of day every resident walks
thirty metres or more, nobody stands in a solid, a greeting with no question closes itself; the pause screen's roam
words; no banner. Every older suite that names the talk, the pause screen or the weapon prompt. The scenario `open-roam`
with a picture of the town by day showing three people or more moving. Rule 23 with those suites and `npm run build`.

## Rules

Behind `story-choices`; nothing changes with it off (Night 2's talks still offer what they offer). Questions go to
`docs/board/questions/OPEN-ROAM-2.md` with your pick. Write `docs/changes/OPEN-ROAM-2.md` with a **Removed** line.
After the pull request is open the card is finished: do not wait for review comments.
