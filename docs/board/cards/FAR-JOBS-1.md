# FAR-JOBS-1

The short board entry controls current state, ownership, dependencies and locks.

**Whose Goat Is This?, Too High, The Long Shaft,** from `FAR_JOBS`, in `src/world/jobs/far-side.js`. `heliceiling`, `noPilot` and `loadLengthMetres`, as section 6 says. Fourteen in Old Tam's yard. Parts for the machine through the Scrapyard's route (`build-borer`).

**Checks:** `tools/test-far-jobs-1.mjs`: each wins on Easy at least 8 times in 10 at a child's pace, with the lent truck and with no pilot.

Design: [docs/story/the-far-side.md](../../story/the-far-side.md) and [docs/MACHINES.md](../../MACHINES.md). A pure sim file imports no DOM, no Three.js and nothing from `src/app.js`. Stay inside the files named here. If something the card needs is missing, write your choice on this card under "Codex decided (Claude to review)" and carry on, unless it touches saves, or a released course or replay, in which case stop and say so. Every player-facing word is plain, in whole sentences, with no em dashes, and comes from the story page. Run the card's own checks and `npm run build`; Claude runs the lane tier and browser checks. Write `docs/changes/<card>.md` with a Removed section, and list what Claude should look at. No Chrome under `codex exec`. Memory-only saves. No new dependency, network request or key.

## Claude answers

## Codex decided (Claude to review)

- FAR-REGION has not named the southern points yet. Add named points in `scablands-names.js`, derived from the Dead Mall, and use the real ground height. FAR-REGION can move these names later without rewriting the jobs.
- This slice supplies pure job definitions and runners, selected by the `far-jobs` dev switch. Town/story screens and persisted progress stay with the strand's later integration. No save file or released course changes.
- Named hooks needed: `job-engine.js`, `step-lines.js`, `steps/explore.js`, `steps/haul.js`, new `steps/heliceiling.js`, `steps/dispatch.js`, `steps/long-load.js`, `feature-flags.js`, `town/content/machine-parts.js` and `town/town-scrapyard.js`. The new steps and caption waiting affect only definitions that ask for them. Borer parts use existing inventory records, with no save schema or persistence changes.
- Dune's five game days use an explicit elapsed-game-day input, with logs on days 2, 4 and 5. No wall-clock wait and no pilot purchase.
- The shaft is one indivisible 12-tonne, 18-metre job load. Keep its mass in the haul state; do not change the ordinary flatbed's 9-tonne limit. Swept load contacts count once per hard impact, recover locally after six seconds stopped, and restart at origin only after ten sheds.
- Fourteen is supplied as an extra goat in the job's Old Tam outpost layout from job 1 onward, using the existing goat model and `far.bell`. Borer ingredients use the Scrapyard's existing part-arrival route. Building, naming and operating Mabel stay with FAR-BORE.
- Checks before code: ten varied slow runs of each job, including a lent Titan and Dune; real Kestrel physics at the ceiling; swept shaft contacts, local recovery and part delivery; the requested guards and build. Claude should drive the composed story later and review these choices.
- The ceiling observer consumes the existing `view.heli` flight state and full-climb input. Its physical check starts at the real thin-air ceiling; the complete ascent from the low lookout and its fuel budget still need Claude's composed-story drive. This card does not change helicopter physics or fuel.
