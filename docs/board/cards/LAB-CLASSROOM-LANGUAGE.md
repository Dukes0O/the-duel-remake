# LAB-CLASSROOM-LANGUAGE

The short board entry controls current state, ownership, dependencies and locks.

Kyle, 4 November 2026, after taking the Launch and Projectile lessons: the wording is short
chopped clauses that no teacher would use, objects are called "she" and "her", units are mixed and
undefined, verbs are wrong ("speed decides", "the air takes"), a question can be answered literally
with the wrong thing, words replace each other too quickly, and there are no formulas. "This means
the next cut requires a full review and fix of the language in all lessons." Art rounds and Blender
are allowed, and animations are encouraged.

## The rules for every lesson's words

1. **Whole sentences a teacher would say aloud.** A sentence has a subject and a verb, and clauses
   are joined with words such as because, so, while and which. No telegraphic fragments ("Faster,
   further."), and no colon used to skip a verb.
2. **Name the object.** Say "the helicopter" and "the stone". Objects are never "she" or "her", and
   "it" is used only where a single object is in play and the meaning cannot be mistaken.
3. **Accurate verbs.** Nothing without a mind decides, wants or takes. Speed determines distance. The
   friction of the air slows the droplets.
4. **Explain the reason** in simple language, then the number. When something changes the physics,
   say how, and show it in the formula panel.
5. **Define before use.** Every word and every unit is defined the first time it appears. A lesson
   that uses m/s says "metres per second, written m/s" first. Where speed matters, m/s against m/s²
   and the conversion to km/h (multiply by 3.6, because an hour has 3,600 seconds and a kilometre has
   1,000 metres) are explained once.
6. **One measurement system.** Metric only: metres, m/s, km/h, kilograms, litres. The game's own
   screens show km/h. No mph anywhere in a lesson.
7. **Questions have one literally correct answer as worded.** Read the question and each answer
   together as sentences. The answers must answer the question that was asked.
8. **No talking down, and no slang.** The player is a capable learner. Long words are fine once they
   are explained.

## The shared classroom

- **The page.** Brian's side of the screen is one running page, like a textbook: every step adds its
  heading, its explanation and its result below the last, and nothing is replaced. The newest text is
  highlighted and scrolled into view; the player can scroll back at any time. Hints and short "watch
  this" lines appear only under the newest text and are not kept.
- **The physics panel.** A lesson may send `formulas` with each view: `{title, formula, worked, note}`.
  The panel sits between the board and the page, hides and shows with F or its button, and is open by
  default when the screen has room. `worked` carries the numbers now on the board, so a change to a
  control changes the sum at once. A lesson with no formulas shows no panel.
- **Going to the game.** A water challenge (Projectile, Fire) fits the bucket itself when it starts, so
  the player never has to find it on a menu in the middle of a lesson (Kyle's pick).

## Experiment

Each lesson gains a step where the player sets the controls freely, watches the formula change, and
compares several results before being asked to get a particular answer.

## Order

Projectile and Launch first, since Kyle took them and judges them first, and they set the standard.
Then the language of Rust, Downforce, Fire, Air and altitude, Braking, Strength, Fuel, Wax, Headings,
Lift and Pendulums, one at a time, with formulas where the lesson has physics to show. G-force, Grip
and Suspension are built to this standard from the start. Brian's recorded lines change with the
words (`src/lab/lab-lines.js`, `tools/audio/build-lab-voice.mjs`).

## How each remaining lesson is rewritten

Worked examples: `src/lab/lessons/projectile-classroom.js`, `launch-classroom.js` and their boards, tests and scenarios.
Faults already found once, so not to be repeated, are in the Review section of `docs/changes/LAB-CLASSROOM-LANGUAGE.md`.

- **Read every string aloud:** `say`, `prompt`, `hints`, `right`, `wrong`, question and answer labels, `KEY_IDEAS`, `CHALLENGE_CARD`,
  `WORDS` meanings, `PASS_SAY`, button labels, and in the board `hoverInfo` and every drawn caption. Short captions on a picture
  may be labels ("flag 27 m"); anything that makes a statement is a sentence.
- **The numbers stay the game's own.** The rules, challenges, rewards, save and notebook ids do not change; every number comes from
  the same bench function as before. Change wording, teaching order and pictures, not the rules.
- **Formulas.** Give `formulas` on each step where there is real physics to show, as `{title, formula, worked, note}`, only for what
  has been explained so far. `worked` must come out on a calculator from exactly the numbers it shows, so round the inputs first and
  compute from the rounded values. Use the game's own rule. Where the game's rule is a simplification, say "in this game". A lesson
  with no honest formula on a step shows none on that step.
- **Controls move the sums.** Wherever the player changes a control, the worked line changes on that press.
- **A free test step** (`try-free`, part 3) wherever the bench has controls: the player changes them freely and compares results kept
  on the board or in a table. Only different settings count, and three open Continue. The sums show first, so the player can predict.
- **Word steps** that use a dial stay open after the answer, so the player can keep experimenting, and their closing words must stay true
  while the player does.
- **Units.** Metric only, defined the first time they appear in that lesson, because a player may take the lessons in any order. Speeds show
  in km/h (`mph x 1.609344`, or `m/s x 3.6`, rounded for the dial) and the sums use m/s. Nothing in a lesson file says mph.
- **Pictures.** The picture must show the idea, not only decorate it. Add arrows, marks or labels that make the mechanism visible,
  in the manner of Projectile's second marks and speed arrows.
- **Fit.** Longer text must still fit: recap cards use `wrap(ctx, text, x, y, width, {size: 19, weight: 600})` and must stay inside
  their cards. Read the screenshots at 1920 by 1000 to check.
- **Tests.** Assertions on wording move to the new sentence and keep their numbers. Never loosen or delete a check of behaviour. A speed in
  mph becomes the same speed in km/h. Add the card's new behaviour: formula changes with a control, and the free test.
  Scenarios run at 1920 by 1000.
- **Shared files are not edited in a lesson's lane:** `src/lab/classroom/*`, `src/lab/lab-lines.js`, `tools/audio/*`, `docs/LAB.md`,
  `tools/test-lab-classroom-page.mjs`, the board and the inbox. A rewritten recorded line is proposed in the lesson's change note,
  and Claude records them together at the merge. A lesson's Watch and recap words should match what its proposed voice lines say.

## Checks

- `tools/test-lab-classroom-page.mjs` (new, the card asks for it): the page keeps earlier steps and
  results; every listed lesson's source has no "she" or "her", no "mph" and no "decides".
- Each rewritten lesson's own suite and browser scenario, read aloud against the rules by Claude.
- Look: Claude reads each step's picture from the walkthrough.
- Lane tier, build, and one independent review per batch.
- Starting a water challenge from the Lab fits the bucket (`tools/test-lab-challenges` or the heli
  session's own suite).

## Removed

The short bubble that replaced itself goes in the same change as the page. Old wording goes as each
lesson is rewritten.
