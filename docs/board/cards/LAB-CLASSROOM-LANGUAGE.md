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
