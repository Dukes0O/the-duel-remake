# LAB-CLASSROOM-STRENGTH

The short board entry controls current state, ownership, dependencies and locks.

Strength against weight as a classroom lesson. Rebuild order 6 of 15 (LAB-CLASSROOM section 6);
audit severity 4 of 5 (5 is as broken as the old pendulum).

**What is wrong today** (audit, 31 October 2026): No thickness number shows while the handle turns (20 presses to 50 mm), the required "hang the load" step is not in the prompt, and carbon fibre "bends", against the word just taught.

**First fix:** Show thickness and weight live, name every step in the prompt, and make carbon fibre snap.

Rebuild on the classroom pattern of [LAB-CLASSROOM](LAB-CLASSROOM.md) sections 2 and 3, as
the pendulum was: `src/lab/lessons/strength-classroom.js` (steps and model, no DOM),
`strength-board.js` (the 2D board in the steel workshop look), one line in
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

## Claude's script (2 November 2026)

The challenge stays the bench's own goal (`strengthBench`): a hook arm that holds 2,000 kg for no
more than 15% over the lightest arm that can. It passes on the lesson's own hook-arm runs, the
player's hangs in the tries and Brian's job, fed to the bench through `onChallenge` as Fuel's were;
the pass opens the Heavy hook in the Lab shop. The recap's button says "Finish the lesson".

Numbers: every bar and arm is `loadBar` or `hookArm` from `src/lab/benches/strength.js`. Test bars
are half a metre long, 40 mm wide and weigh 1 kg each, so the lighter material makes the thicker
bar: steel 6.4 mm, aluminium 18.5 mm, carbon fibre 31.3 mm. Loaded at the tip, steel bends for good
at 14 kg, aluminium at 128 kg, and carbon fibre snaps at 1,991 kg. Under 10 kg the steel bar dips
23.7 mm and the carbon fibre bar 0.3 mm, and both spring back. The hook arm is half a metre long and
60 mm wide and carries the 2,000 kg car; it holds when it uses no more than two thirds of its
strength (metals) or a third (carbon fibre, which snaps without warning), and dips no more than
10 mm. The thickness handle moves 10 mm a press. Steel holds from 80 mm (18.8 kg), aluminium from
80 mm (6.5 kg), carbon fibre from 50 mm (2.4 kg), the lightest arm that holds.

**The board.** The steel workshop. On the left a vice clamps a bar or a hook arm side on, drawn to
scale, with the load hanging from its tip: stacked 10 kg weights, the ram's load cell for the big
loads, or the 2,000 kg car on its sling. Its material, thickness and weight are written on it and
change as the player changes them. Beside it two gauges: **Strength used** (0 to 150%, a red line
at 100% where it bends for good or snaps, and a green zone up to Brian's safety line) and
**Dips** (millimetres, with the 10 mm line for the hook arm). A bar past its strength stays bent
(metals) or splits and falls (carbon fibre). Keys: 1, 2, 3 pick aluminium, steel, carbon fibre
from the rack (a click on a bar does the same, and the chosen one is lit); ↑ and ↓ thicken and thin
the arm 10 mm a press (or a click on the handle's arrows); Space hangs the car. This replaces the
old thickness handle (1 mm a press, no number while turning), the hang button the prompt never
named, and carbon fibre drawn bending.

| Step | Brian says | The player does | Wrong move, and why |
| --- | --- | --- | --- |
| Wonder | Both arms hold the same 2,000 kg car. One weighs 18.8 kg, the other 2.4 kg. How can the light one hold as much? | Watches the car lowered onto a steel arm (80 mm) and a carbon fibre arm (50 mm), each with its weight; R replays. | |
| Strength | Strength is how much load a part takes before it bends for good or breaks. | ↑ hangs 10 kg weights on a steel bar; the Strength used needle climbs: 10 kg uses 72% and the bar springs back; 20 kg is 145%: it bends for good. | |
| Stiff | Stiff means it bends very little. | Space hangs 10 kg on a steel bar and a carbon fibre bar: 23.7 mm against 0.3 mm on the Dips gauge; both spring back. | |
| Brittle | Brittle means it snaps instead of bending. | Space starts the ram on the carbon fibre bar: it holds and springs back all the way to 1,991 kg, then snaps in two. | |
| Watch | Three bars, each 1 kg: the lighter the material, the thicker its bar (voice `lab.brian.strength.intro`). | Watches the ram load all three together: steel bends for good at 14 kg, aluminium at 128 kg, carbon fibre snaps at 1,991 kg; a table fills in. The words aluminium, steel and carbon fibre go in the notebook here. | |
| Try: too thin | Pick carbon fibre (3); the arm is 20 mm. Will the car make it hold, bend for good or snap? | 3, Space, then a guess from three pictures of results; the car hangs: 164% of its strength, and it snaps. | Wrong guess: "Holds": "the car used 164% of its strength: past 100%, so it broke"; "Bends": "carbon fibre is brittle: it snaps, it never bends for good". Either way the player goes on. Space before carbon fibre: "This try is the carbon fibre arm: press 3 first." |
| Try: thick enough | Make a steel arm that holds the car: ↑ to thicken it, Space to hang the car. | ↑ from 40 mm to 80 mm, Space: 61% of its strength, dips 1.6 mm, weighs 18.8 kg. | 50 or 60 mm: "157% of its strength: it bent for good. Thicker: ↑." 70 mm: "It held, but used 80% of its strength; Brian's line for metal is two thirds, 67%, so a bump on the cable can't bend it. Thicker: ↑." |
| On your own: Brian's job | The Heavy hook. Build the lightest arm that holds the car: any material, any thickness. | Tries materials and thicknesses; the job card lists every arm that held and the lightest so far. Carbon fibre at 50 mm, 2.4 kg, finishes it. | Too thin: why, with its percentage and dip ("carbon fibre at 40 mm used 41% of its strength, over its third, and dipped 18.9 mm; the hook may dip 10 mm"). Held but heavy: "It holds at 6.5 kg. Your lightest so far is 6.5 kg: can a lighter material do it?" Carbon fibre 60 mm: "It holds at 2.9 kg. Can a thinner one still hold?" |
| Question 1 | Three bars weigh 1 kg each. The load grows. Which bends for good first? | Steel, aluminium, carbon fibre. | "Steel, at 14 kg: it is the heaviest for its size, so its 1 kg bar is the thinnest." Aluminium: "it held 128 kg". Carbon fibre: "it never bends for good: it held 1,991 kg, then snapped". |
| Question 2 | Which one snaps instead of bending? | Aluminium, steel, carbon fibre (pictures of the plain bars). | "Carbon fibre is brittle. Aluminium and steel bend for good first, which gives a warning." |
| Question 3 | The Heavy hook lets Kestrel One lift 2,000 kg, up from 1,500 kg. Which arm would you fit? | Steel 80 mm (18.8 kg), carbon fibre 50 mm (2.4 kg), carbon fibre 30 mm (1.4 kg). | Steel: "It holds, but weighs 16.4 kg more for the helicopter to lift, for the same job." 30 mm: "It used 73% of its strength, over carbon fibre's third, and dipped 45 mm." |
| Recap | Aluminium is about a third the weight of steel; carbon fibre is lighter still and very stiff, but snaps; choose by what the part must do (voice `lab.brian.strength.explain`). | Three key ideas; Enter finishes the lesson and opens the Heavy hook in the shop. | |

Help on every step climbs from a nudge, to the plain step, to Brian's pointer on the rack, the
handle or the hook; Show me picks, turns and hangs for the player. The notebook keeps the old six
words under their ids (`strength-strength`, `strength-stiff`, `strength-brittle`,
`strength-aluminium`, `strength-steel`, `strength-carbon-fibre`).

Not in this card: Carbon plates is sold in the Lab shop after this lesson, but nothing in the game
reads it yet (armour weighs the same with or without it). Brian does not mention it; a follow-up
card wires it or removes it.

**Checks** (before code): `tools/test-lab-classroom-strength.mjs` (a child who follows each prompt
passes; each wrong try says why with the real percentages, dips and kilograms; every number is
`loadBar`'s or `hookArm`'s; help climbs to Brian's pointer and Show me builds and hangs; the
lesson's runs pass the bench's goal through `onChallenge`); the browser scenario
`tools/scenarios/lab-classroom-strength.mjs` plays the lesson by keyboard, with one mouse click on a
bar in the rack, to the pass and the Heavy hook for sale; `lab-view` and `lab-walk` reach Strength's
classroom from the walking room. Lane tier, build, every `tools/test-lab-*.mjs` and the Lab
scenarios.
