# LAB-CLASSROOM-RUST

The short board entry controls current state, ownership, dependencies and locks.

Rust as a classroom lesson. Rebuild order 12 of 15 (LAB-CLASSROOM section 6);
audit severity 3 of 5 (5 is as broken as the old pendulum).

**What is wrong today** (audit, 31 October 2026): The tries have no goal, so any set-up passes; runs take 20 real seconds; the exhaust story contradicts itself; try 2 says "compare with your last try" with nothing to compare.

**First fix:** Give each try a goal, a week that passes in a few seconds with a day counter, and the last jar kept beside the new one.

Rebuild on the classroom pattern of [LAB-CLASSROOM](LAB-CLASSROOM.md) sections 2 and 3, as
the pendulum was: `src/lab/lessons/rust-classroom.js` (steps and model, no DOM),
`rust-board.js` (the 2D board in the steel workshop look), one line in
`src/lab/classroom/classroom-lessons.js`, behind `lab-classroom`. Every number from the
function the lesson's challenge uses. The challenge, its reward and the save are unchanged.
Claude writes the step script (what Brian says, the set-up, the guesses and the reasons
for each wrong answer) under "Claude's script" here before code.

Checks: in `tools/test-lab-classroom.mjs`, a child who does exactly what each prompt says
passes with one press; each wrong guess says why with the real numbers; help climbs to
Brian's pointer. The `lab-classroom` browser scenario plays this lesson by keyboard alone.
Lane tier and build. The old lesson files go in LAB-CLASSROOM-LIVE.
If the challenge is a bench run ('inline' from `onChallenge` in `lab-view.js`), feed the
classroom's machine runs to it: the pendulum only needed the flying path, and `lesson-ui.js`
refuses 'inline' with a message until a lesson wires it.

## Claude's script (3 November 2026)

The challenge is unchanged and stays where it is: after the lesson the Lab's parts panel opens
(underbody, exhaust, armour plate: leave bare or zinc coat), judged by `checkProtections` in
`lab-workshop.js`, as Projectile hands over to its helicopter challenge. Passing opens the Galvanised
finish and, once she is raised, Restore the Sirena in the shop. The lesson does not pass it.

Numbers: every rust share is the rust bench's own (`jarAfter` in `benches/rust.js`, the function
`rustOf` and the challenge use): fresh water rusts a bare nail 2% a day, salt water 12%; a zinc coat
in salt water wears away over 20 days (35% of it in a week) and the steel under it stays clean until
it is gone. After a week: dry 0%, fresh 14%, salt 84%, zinc in salt 0% with 65% of the coat left.
Salt, 3 days: 36%; 5 days: 60%. Zinc in salt, 10 days: half the coat left; 22 days: coat gone, 24%
rust; 25 days: 60%. "Clean" is the challenge's own line: 10% or less after a week (`RUST_OK`). The
old lesson's paint and hot-exhaust story is dropped: no bench rule backs it, and the challenge's
exhaust lives dry. The notebook keeps "Paint" for players who learned it.

**The board.** Brian's shelf in the steel workshop look: up to four glass jars, each with a steel
nail, its label (Dry air, Fresh water, Salt water, Zinc coat in salt water), water drawn in the wet
ones and salt crystals in the salt ones. A wall calendar shows the day; Space runs the days
(about half a second each) and orange patches grow on each nail as the bench says, the zinc nail's
grey coat thinning first. Under each jar its rust share and, for zinc, the coat left. The last
week's nails stay on the shelf beside the new ones. Right: the day dial (↑ more days, ↓ fewer) when a
try needs it, and in Brian's job the protection switch (← Bare, → Zinc coat). Bottom: the results
table, or the job card with the thing to protect and where it lives.

| Step | Brian says | The player does | Wrong move, and why |
| --- | --- | --- | --- |
| Wonder | The Sirena lay on the sea floor for sixty years and came up crusted orange. Two steel nails: one in a dry jar, one in salt water. Watch a week. | Watches (R replays): 0% and 84%. "Same steel, same week. What did the water do?" | |
| Rust | Rust is iron turning flaky orange when water and air reach it. A nail in fresh water: run a week. | Space: 14%. "Water and air reached the iron. The dry nail had air but no water: 0%." | |
| Salt water | Salt water is water with salt in it. Same nail, salt water: run a week. | Space: 84% beside 14%. "Six times as much: salt water 12% a day, fresh water 2%." | |
| Zinc coat | A zinc coat is a thin layer of zinc on the steel. Coat a nail and put it in salt water: run a week. | Space: rust 0%, coat 65% left. "The zinc wears away first and the steel stays clean." | |
| Watch | (voice `lab.brian.rust.intro`) | The four jars for a week: 0, 14, 84 and 0% (coat 65% left). Watch again, slow motion. | |
| Try: three days | A bare nail in salt water. The day dial reads 7: turn it to 3, then run and guess. | ↓ four times, Space, a guess (about 6, 36 or 84%); 36%. | 6%: "That is fresh water's 2% a day. Salt water rusts 12% a day: 3 days is 36%." 84%: "That was the whole week. Rust grows day by day: 3 days is 36%." Space at another day: "This try is 3 days: press ↓ until the dial reads 3." |
| Try: how long the zinc lasts | The zinc lost 35% of its coat in a week. When is it all gone? | Guess (about 10 days, about 20, never), then Space runs it to day 25: gone at day 20, then the steel rusts, 60% by day 25. | 10: "At 10 days half the coat was still there." Never: "Wearing away is the zinc's job: it goes first, for 20 days, and then the steel rusts." |
| On your own: Brian's job | Three things in the yard; give each the least protection that keeps it clean (10% or less in a week), since zinc costs work. 1: the boat trailer, dunked in the sea at every launch. 2: the toolbox on the dry shelf in the shed. 3: the garden gate out in the rain. | Zinc, bare, zinc. | Too little: "Bare in salt water: 84% in a week. More than 10% is not clean: press → for zinc." Too much: "It stayed clean, but so would bare: dry air rusts nothing. Save the zinc for where water reaches: press ←." The gate bare: "Fresh water is slow, 14% in a week, but that is more than 10%: zinc." |
| Question 1 | A bare nail in salt water for 5 days. How rusty? | 10%, 60%, 100%. | "12% a day for 5 days: 60%." |
| Question 2 | A zinc-coated nail in salt water for 22 days. What do you find? | Clean with zinc on; the coat gone and the steel 24% rusty; 100% rusty like a bare nail. | "The coat lasts 20 days, then 2 days of 12%: 24%." / "The zinc kept it clean for 20 days: 24%, not 100%." |
| Question 3 | Before restoring the Sirena, Brian soaks her in fresh water for weeks. Why? | To draw the salt out; to wash the rust off; fresh water stops rust. | Wash: "Rust is part of the metal now; water does not wash it off. The soak draws the salt out: salt rusts 12% a day, fresh 2%." Stops: "Fresh water still rusts steel, 14% a week, but six times slower than salt." |
| Recap | Water and air make rust; salt makes it six times faster; zinc goes first and saves the steel (voice `lab.brian.rust.explain`). | Three key ideas; Enter starts the challenge: protect three parts of a car. | |

Help on every step climbs from a nudge, to the plain step, to Brian's pointer on the calendar, the
day dial or the switch; Show me sets and runs for the player. The notebook keeps the old words under
their ids (`rust-rust`, `rust-salt-water`, `rust-zinc-coat`, and `rust-paint` kept for old notebooks).

**Checks** (before code): `tools/test-lab-classroom-rust.mjs` (every share is `jarAfter`'s; the job's
answers are `rightProtection`'s rule; a child who follows each prompt passes; each wrong guess and
wrong pick says why with the real numbers; help climbs to Show me; finishing opens the parts panel);
the browser scenario `tools/scenarios/lab-classroom-rust.mjs` plays the lesson by keyboard, with one
click on the switch, to the parts panel and the pass. Lane tier, build, every `tools/test-lab-*.mjs`
and the Lab scenarios. The old Rust lesson, its 3D drawing and the Rust parts of the workshop suite
and scenario go in this card.
