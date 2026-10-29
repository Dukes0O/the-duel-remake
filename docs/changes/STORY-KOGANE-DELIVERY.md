# STORY-KOGANE-DELIVERY: Supplies for the Summit

Card row: `docs/story/kogane-invitation.md` section 12. Branch `claude/story-delivery`. Not merged.

## What changed

- `src/heli/heli-story.js` (new). The story's one dispatch job.
  - `storyJob()`: id `story-kogane-supplies`, a 420 kg crate from the home pad to Kogane Pass, `kind: 'crate'` (so the logbook counts it
    as a crate job). Pay is `payForMinutes(deliveryMinutes(false))`, read live (2,100); the clean bonus is `cleanBonusFor(pay)` (550);
    Real adds a quarter (2,625 and 688).
  - `storyOffered({enabled, step, carryDone})`: the job exists only with the switch on, the story at the `supplies` step (letter read,
    driving lesson passed) and the helicopter's carry lesson done.
  - `finishStorySupplies(profile, {mode, clean, day, step, mark})`: one change to a copy of the profile. It pays (credits capped at
    1,000,000,000 by the existing `finishJob`), puts the job on the day's done list, writes `kogane-pass-night` into
    `profile.heli.map.found` with `writeMapRecord`, and then calls the story's writer (`markKoganeSupplies`) that the session passes in.
    If any part is refused (a map record from a newer game, a story that will not take the mark, a second finish) the profile comes
    back exactly as it was. It imports only other `src/heli/` files; the step and the writer arrive as arguments.
- `src/heli/heli-session.js`.
  - New option `koganeStoryEnabled` (default off). The job is on the board only when it is on and the pilot's map and Kogane Pass are
    on too. Nothing in `app.js` passes it yet, so it stays off until the HOOKS card wires the `kogane-invitation` switch. That switch
    does not exist yet in `src/feature-flags.js`; a missing switch is treated as off, and it is not added here.
  - `boardJobs()` adds the story row beside the recovery job. The seeded `dayJobs` and their fingerprints are not touched (the test
    proves the other rows are identical with the story on and off).
  - `takeJob(id)` takes it through the existing `takeJob` save call (`profile.heli.jobs.taken = 'story-kogane-supplies'`), so one job at
    a time and Drop job behave as they do. A crate (id `crate`, 420 kg) is laid at the home pad's crate spot. After a crash the visit
    restarts at the pad and the crate is laid again; the job stays.
  - Hooking the crate points the way to Kogane Pass and marks the clean-delivery start (as the return crates do). A clean release
    inside the circle at Kogane (`released`) finishes the job once: pay, the Night version found (`secretFound`, the existing found cue),
    the story mark, the `jobDone` event. A release from height (`releasedHigh`) is charged as a drop, pays nothing and the job stays;
    set down again cleanly it pays the base only (a repair was charged, so no clean bonus).
  - A refused finish (for example a helicopter record from a newer game) says so with a `storyBlocked` event and changes nothing.
  - Drop job removes the crate. The carry lesson still gets its own crate; a story crate is moved aside for it and laid again after.
- `src/heli/heli-board.js`: the story row uses its own title and shows "Race tyres and tea-house supplies: hook the crate by the pad".
- `src/heli/pilot-map-view.js`: a red flag with "Daichi's tea house" at Kogane Pass while the job is in hand (also in the place note),
  and a found star by Kogane Pass for `kogane-pass-night`.
- `src/heli/pilot-map-data.js` (the one data line the brief allowed, plus the lines drawn from it): Kogane Pass was at (22, 2),
  22.1 km from the home pad. Now at (14, 0.5): 14.0 km, due east. Each leg is 175 kg by the map's rule, so out and back is 350 kg of a
  400 kg tank. The three Kogane chart regions (forest, volcano, lake) moved with it so the chart stays whole. The place's one-line
  description now reads "east of the home valley" (it said "east of the harbour").
- `tools/test-heli-mode.mjs`: the import list gains `../story/story-save.js` (the one story file the helicopter rules read).
- `tools/test-heli-story.mjs` (new): 130 checks, memory only. See Tests.

## Choices to know about

- **Why 14 km and not 16.** Sixteen km is the most the leg rule allows (2 x 197 kg). In a real flight the helicopter also burns about
  50 kg getting to the area edge at each end (my test pilot used 56 kg at the home pad and 48 kg between the arrival point and the
  circle). So at 15.5 km the pilot arrives with about 97 kg and the way home needs 195: not enough. At 14 km the legs are 175 kg and the
  margin is 50 kg, enough for a quick flyer. A slow flyer will still run short; the fuel truck (calls when the tank is empty) is the
  existing answer. There is no pump at Kogane. A card to add one, or to bring the place closer, is Claude's call.
- **The landing circle is not at the tea house.** The circle is found by the existing search at s 0, lateral 30 (beside the start
  line). The tea house stands at s 110, lateral 22, so the circle is about 110 m from it, past the "within about 60 m" the packet
  wanted (Open 1). Not changed here; `src/circuits/kogane-pass.js` and `courseSite` are not mine. The pin says "Daichi's tea house".
- **Dusk light.** See "Dusk light" below. `DELIVERY_TIME_WORDS` stays "at dusk".
- **Lift at Kogane.** 1,300 m, thrust 1.08 x 3,130 kg x e^(-1300/8500) = about 2,900 kg. Loaded (empty 1,150, pilot 80, a full 400 tank,
  crate 420 = 2,050) the spare lift is about 851 kg; the test asserts at least 600.
- **A closed Kogane.** If Kogane burns, the course closes for ten play days. The helicopter can still land there, so the job is not
  closed by this card; the Story card (SCREENS) shows the closed-by-fire message.

## Dusk light

The helicopter world has no light of its own. A helicopter visit is a race-less start of the course (`startHeliVisit` in
`src/game.js`, status `heli`), the race state is not stepped, and `src/render3d.js` applies the course's lighting every frame with
the state's distance, which is 0. Kogane's light path (`lightPath` in `src/circuits/kogane-pass.js`) starts `dusk` at 0 and holds it to
1,500 m, so the helicopter sees Kogane Pass at dusk, and it stays dusk wherever the helicopter flies. The Night version would show
night the same way. So "at dusk" is right and no scene light setting is needed. Not checked in a browser (code reading only).

## Tests

- `node tools/test-heli-story.mjs`: 130 checks pass. They cover: pay 2,100 and bonus 550 from the race rate (Real 2,625 and 688);
  Kogane within 16 km, east, both legs inside one tank; the lift margin at 1,300 m; the offer rules (switch off or missing, wrong
  steps, carry lesson not done, newer story, no Kogane or no pilot's map); the seeded rows identical with and without the story; the
  board markup; taking, taking twice, one job at a time, Drop job and taking again; the pure finish (pay, done list, Night found,
  story mark, input not changed, once only, step and day checks, Real, not clean, credit cap, found earlier, other finds kept, newer
  helicopter record, refused story mark undoes the pay); two real flights home to Kogane (a clean set-down pays 2,650, finds the Night
  version, moves the story to the duel, counts one crate job and no car job, cannot be taken or paid again; a crate let go from 6 m is
  charged, pays nothing, keeps the job, then pays the base 2,100); the map pin and the found star.
- `test-heli-mode` (265), `test-heli-jobs` (5,946), `test-pilot-map` (310), `test-heli-view` (359), `test-heli-fire-session` (80) pass.
- Lane tier and build: see the foot of this note.

## Changed assertions

- `tools/test-heli-mode.mjs`: the helicopter rules' allowed-import list gains `'../story/story-save.js'`. Reason: the session reads the
  story's step and writes its mark through that one pure file (the way `../lessons/lesson-core.js` joined). Nothing is loosened: any other
  new import still fails.

## Removed

Nothing. No old code, test or doc is replaced by this card. The pilot-map-data line "east of the harbour" is a changed description, not
a removal.

## Still to do (not in this card)

- The `kogane-invitation` switch (`src/feature-flags.js`) and `app.js` passing it to `createHeliSession` as `koganeStoryEnabled`
  (HOOKS), plus the Story card's "Finish Brian's flying lessons at the helipad first" line (SCREENS, which can read
  `koganeStep` and the lessons).
- The circle-to-tea-house distance (see Choices) and a fuel answer for the trip home (see Choices).

Lane tier (`node tools/run-tests.mjs --tier lane --changed --jobs 2`): 65 passed, 0 failed. `npm run build`: built.
