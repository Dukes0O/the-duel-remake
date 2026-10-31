# LAB-CLASSROOM

The short board entry controls current state, ownership, dependencies and locks.

Kyle, 31 October 2026: "go through the lab questions and interactions. We
really struggled with the pendulum one and it was super janky. it was a good
start, but we can make it more of a lesson with more interactive support too.
Brian doesn't really help much yet. think of the Lab as a real classroom kind
of piece of software we're developing to teach the physics and mechanics of
the game elements. we can really go to town on the graphics and lessons the
way learning software follows a pedagogical, UX and UI approach to teaching."

Claude (Director and design lead) audited the Lab, wrote this design and
rebuilt the pendulum lesson first. Switch `lab-classroom` (dev): Kyle and
Gratian try it before it goes live (Gratian tries screen changes first).

## 1. Audit (played on integration 8811fe45, port 5191, memory-only saves)

### 1.1 The pendulum, played as a child would

- **Following the instructions fails.** The guided try says "Hang the weight
  on the 5 m string, then pull it back." The hook button cycles 15, 25, 5, so
  one press goes to 25 m, the wrong way. The weight starts already pulled
  back, so pressing "Pull the weight back / let it hang" lets it hang. The run
  then takes 20 seconds of a still weight and ends: "The weight was hanging
  still. Pull it back before letting go." The player did exactly what was
  asked. This is the jank Kyle and Gratian hit.
- **The question comes before the set-up.** "Compared with a light weight on
  15 m, how fast will it swing?" appears first; what "it" is only appears
  after a guess is picked.
- **The answer pictures give the answer away.** "Faster" is a drawing of a
  5 m string, "Slower" a 25 m string: they show set-ups, not results.
- **The clock lies.** Every animation runs at half speed, while the labels
  say "4.5 s per swing". A real 4.5 s swing takes 9 s on screen.
- **Long locked waits.** "Let all three go" locks Continue for 20 s; each try
  run waits 20 s whatever happens.
- **The words never show what they mean.** "Swing time" lasts 4 clock
  seconds, so the 7.8 s swing it defines never finishes. The "Pendulum" word
  already shows "One swing: 7.8 s" and a graph before "swing time" exists.
- **"Change only the weight" shows one weight**, not two side by side, so
  there is nothing to compare.
- **Small, crowded labels.** The graph is a thumbnail nobody can read; three
  captions sit on top of the stopwatch; the swing is only 12 degrees.
- **Controls show no state.** A tick appears after any press; the player
  cannot see which hook or weight is chosen without reading the 3D scene.

### 1.2 Brian

In the room, E at Brian offers two buttons: "What should I try next?" and
"Tell me about this machine." Inside a lesson Brian is a voice line at the
wonder, words and watch steps, and the text "Brian: This is a model, one
tenth the size." He has no face on screen, never notices a player who is
stuck, offers no help until a run has failed, and "Show me" waits for three
failures. Hints are fixed sentences, not a ladder the player can climb.
Nothing celebrates a right answer.

### 1.3 Every lesson (the frame they share)

The faults in 1.1 that come from `lesson-frame.js` and `lesson-ui.js` touch
all sixteen lessons: half-speed clock, locked waits, prediction before
set-up, cycling buttons with no state, "4 / 5" as the only progress, no
recap. Section 6 ranks the other lessons for rebuilding.

## 2. How the Lab teaches (the classroom pattern)

Every rebuilt lesson follows these rules. They extend LAB.md 12.2, which
stays the scaffold.

1. **One idea per step.** A step teaches one thing, with one picture and at
   most two sentences from Brian.
2. **Every word defined with a picture, and used once by the player.** A new
   word appears on the board with a labelled drawing, then the player does
   one small thing with it (pull the weight, tap when it comes back, click
   the longest string) before the lesson uses the word.
3. **Worked example, guided try, free try.** Brian shows it working; the
   player tries with arrows and prompts; then tries alone on a small puzzle.
4. **Set up, then predict, then run.** The player builds the experiment
   first, then guesses the result from pictures of results (stopwatches,
   distances), never pictures of set-ups.
5. **Real time, honest numbers.** Clocks run at real speed. A "Slow motion"
   button halves speed and says so on the clock.
6. **After a wrong guess or a failed try, say why.** Name what happened with
   the numbers ("it came back in 4.5 s, sooner than 7.8 s") and the reason in
   one sentence. A wrong guess is a lesson, not a wall: the player can carry
   on once Brian has explained it.
7. **Help that climbs.** One Help button (and H) climbs three rungs: a nudge,
   a plain instruction, then "Show me", where Brian's pointer does the step
   and hands it back.
8. **Progress you can see.** A strip across the top names every part of the
   lesson, ticks what is done and lights where you are. The lesson ends with
   a recap of the key ideas, each with its picture, before the game
   challenge.
9. **Clear controls.** Controls are things on the board you click (hooks,
   weights, the weight itself), each with a key shown beside it. A control
   always shows what is chosen. Nothing cycles, nothing toggles back.
10. **Mouse and keyboard, one player at a time.** Everything works with the
    mouse (click a part of the picture, drag the weight, hover over any part
    for a few words about it) and with keys (number keys pick, Space lets go,
    Enter continues, H asks Brian, Esc leaves). Kyle, 31 October 2026: "it can
    use the mouse too. eventually we'll buy a steering wheel with pedals, but
    lab lessons won't be a part of that": no steering wheel in the Lab. No
    two-player controls. Laptop screen only.

## 3. Brian, the tutor

Brian sits in a panel beside the board: his portrait (rendered from his Lab
model, no new art), a speech bubble and the Help button.

- **Explains** each step in one or two sentences, and plays his recorded
  voice where a line already exists (`lab.brian.pendulum.intro` at Watch,
  `explain` at the recap; new lines are text until voice credits are spent).
- **Notices when you are stuck.** After 12 s with no progress on a step that
  needs the player, he offers help ("Stuck? Press H and I'll help."). After
  25 s he gives the first hint himself.
- **Hints that climb**, one rung per press of Help, and one rung after each
  failed try: nudge, plain instruction, Show me.
- **Shows you.** At the third rung his pointer moves across the board, does
  the step (clicks the hook, lets the weight go) and hands the next part back
  ("Like that." and the next instruction). Where doing it for the player
  would teach nothing (tapping along with the swing) he only points, and the
  green mark flashes when to tap.
- **Celebrates.** A right guess or a passed try gets a short cheer, a burst
  of sparks on the board and the bonus sound.
- **Explains wrong guesses** with the two numbers side by side and replays
  the two swings together.

## 4. The pendulum lesson, rebuilt

Board: a 2D drawing in the centre of the Lab screen (the room stays behind
it, dimmed), drawn to scale (1 m of string = the same length on every
string), at real speed, with a big stopwatch for each swing.

| Part | Step | What the player does | Brian says |
| --- | --- | --- | --- |
| Wonder | The car on the cable | Watches the helicopter stop and the car keep swinging | The helicopter stopped, but the car kept swinging. Why, and how long does one swing take? |
| Words | Pendulum | Drags the weight aside and lets go (or Space) | A pendulum is a weight on a string that can swing. Pull it aside and let go. |
| Words | Swing time | Presses Space each time the weight comes back to the green start mark (two good taps) | One swing is out and back to where it started. Swing time is how long that takes. |
| Words | Length | Clicks the longest string; a tape measure drops beside it | Length is how far it is from the hook to the middle of the weight. |
| Watch | Three lengths | Watches 5, 15 and 25 m released together, each with its own stopwatch; a table fills in 4.5, 7.8, 10.0 s | (voice) the intro line |
| Watch | Light and heavy | Watches 20 kg and 200 kg on 15 m side by side; they stay in step | Ten times the weight, the same swing time. Length matters, weight does not. |
| Try with help | Short string | Hangs the weight on the 5 m hook (glowing arrow), predicts against the grey 15 m, lets go | Shorter string, shorter trip, quicker swing. |
| Try with help | Heavy weight | Swaps in the 200 kg weight on 15 m, predicts, lets go | It took 7.8 s, the same as the light one. |
| On your own | Brian's crane | Sets up a swing of about 10 s with no arrows, tests it | That's it, the long 25 m string. |
| Check | Three questions | Picks a picture: which swings slowest; what 200 kg on 15 m takes; how to settle the car | Right or wrong, the answer is shown with its picture |
| Recap | Key ideas | Reads three cards, each animated, then "Try it in the game" | (voice) the explain line |

Numbers come from `stringPeriod()` in `src/lab/benches/pendulum.js`, the
same function the bench and its test use: 4.5, 7.8 and 10.0 s. The game
challenge, its reward and the save are unchanged (LAB.md 4.1).

## 5. Build

- `src/lab/classroom/`: the classroom frame (steps, progress, help ladder,
  idle timer; plain data, testable without a browser), Brian's tutor rules,
  the board UI and Brian's portrait.
- `src/lab/lessons/pendulum-classroom.js`: the pendulum's steps and board
  drawing.
- `src/lab/lesson-ui.js` opens a classroom lesson instead of the old
  five-step panel when `lab-classroom` is on and the lesson has one.
- When `lab-classroom` goes live, the old pendulum lesson files are removed
  (replace means remove); until then they serve the switch-off path.
- Checks: `tools/test-lab-classroom.mjs` (a child who does exactly what each
  prompt says passes every try with one press; wrong guesses explain with the
  real numbers; help climbs to Show me; idle offers help; every number comes
  from `stringPeriod`); `tools/scenarios/lab-classroom.mjs` plays the
  pendulum by keyboard alone with the switch on. Lane tier, build and every
  `tools/test-lab-*.mjs`.
- Art: at most three rounds, sheets `docs/board/looks/lab-classroom/round-N.jpg`,
  judged by Claude and sent to Kyle.

## 6. The other lessons (follow-up cards, in rebuild order)

A helper read every lesson and ran each lesson's own rules to check the
numbers; Claude spot-checked the wax trap in the code. Severity 5 is as broken
as the old pendulum. Each has its own card, `LAB-CLASSROOM-<NAME>`.

| Order | Lesson | Severity | Main problem |
| --- | --- | --- | --- |
| 1 | Lift and weight | 4 | Hover is a 1.5% window a held arrow crosses in hundredths of a second; kg labels hidden; first fuel press empties the tank |
| 2 | Projectile motion | 5 | Flag starts at 24 m, water lands at 10 m, 66 presses to move it; the landing mark is never drawn |
| 3 | Headings and maps | 5 | Compass stops at 359 with no wrap, so the guided 15 degrees cannot be reached; ruler needs about 179 presses |
| 4 | Ski wax | 4 | The pendulum's trap: the selector starts on Hard, so pressing it as told picks Medium |
| 5 | Fuel and weight | 4 | The same trap: "Pour 5 litres" at full empties the can; "pour" adds while the prompt says pour out |
| 6 | Strength against weight | 4 | No thickness number while turning; a needed step missing from the prompt; carbon fibre "bends" |
| 7 | Braking | 4 | The starting lever already slides; "Keep 70%" starts at 60%; try 3 passes untouched |
| 8 | Air and altitude | 3 | Site hidden while setting up; following the prompt after predicting turns a right answer wrong |
| 9 | Fire triangle | 3 | Coat button toggles off but keeps its tick; the raked strip vanishes once coated |
| 10 | Downforce | 3 | "Keep the wing steep" starts flat; raw decimals on screen; try 3 met at the start |
| 11 | Launch angles | 3 | Landing distance hidden; a picture prints the guided answer; speed only goes up |
| 12 | Rust | 3 | Tries have no goal; 20 s runs; "compare with your last try" with nothing to compare |
| 13 | G-force | 3 | Try 3 met only by the untouched start; radius only moves out |
| 14 | Grip and slip | 2 | 4.5 degrees reads "100% grip" but counts as lost grip; the rule is never stated |
| 15 | Suspension | 2 | Works; the challenge says "the other spring" but accepts either; "lean" not "body roll" |

Faults shared by many lessons, which the classroom frame fixes for every
lesson rebuilt on it: numbers hidden while setting up; cycling controls with
no value; settings that reset between tries although the prompt says "keep";
every control highlighted instead of the named one; check pictures that print
the answer; Brian hidden while the text talks about him.

LAB-CLASSROOM-LIVE switches `lab-classroom` on after Kyle and Gratian have
tried the pendulum, and removes the old pendulum lesson files.

## 7. Look (round 1 of 3)

Sheet: `docs/board/looks/lab-classroom/round-1.jpg`, the same three screens
in three looks: A steel workshop, B blueprint, C chalkboard. Claude's pick:
**A, steel**. It belongs in the hangar (painted steel beam, brass and iron
weights, a real stopwatch), it is the grittiest, and its colours match the
Lab's panels. B reads best but looks like a drawing office, not a workshop;
C is close to A but flatter. B and C were removed from the code after the
pick. Brian's portrait is his Lab model rendered once, so it needs no art
round of its own.
