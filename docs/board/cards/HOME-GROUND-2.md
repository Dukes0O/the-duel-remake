# HOME-GROUND-2

The short board entry controls current state, ownership, dependencies and locks.

Claude's card. Step 2 of `docs/HOME_GROUND.md` (read sections 3, 4, 7 and 15 first): **hens, nest boxes and the real
clock, with the board at the gate**, plus what Claude's drive of step 1 found (`docs/board/looks/home-ground/drive-1.md`).
Behind `home-ground`. Kyle started it on 27 November without waiting for the try of step 1; notes from that try are
folded in when they come. The hens' look comes from HOME-GROUND-LOOK-1 (building now): use the wildlife chicken until
it merges, then its parts, and do not count the stand-in as finished.

**Hens and nest boxes.**
- Moss brings two Tin Town Brown hens in a crate on the first visit after the fence is closed (one short talk). He
  builds a nest box from an old crate (the "seconds" step: hold B). Hens wander his ground, peck, scratch, and go to a
  box to lay. He names each hen; the name shows when he looks at her.
- A Tin Town Brown lays about 6 eggs a real day (a hen's week, section 4). A box holds three days of eggs; when every box
  is full, the hens wait. He gathers eggs by walking up to a box (one press each box), and the eggs go into his store.
- No hen is ever lost or hurt in this step. The look comes from HOME-GROUND-LOOK-1.

**The real clock.**
- On opening an outing, the game reads the laptop's clock once and hands the home rules one number: the real time
  since his last visit, capped at 3 days and never less than nothing (a clock set back loses nothing). The rules stay
  repeatable from their inputs; nothing reads the clock during play.
- In this step the real clock drives only laying. Builders, crops and raids come later.

**The board at the gate.** On arrival, a board by the gate says in three or four plain sentences what happened while he
was away ("Your hens laid 14 eggs while you were gone. The nest boxes are full, so they stopped laying."). F at the
board shows it again.

**From the drive of step 1.**
1. **A tool in his hands, not his weapon** (Kyle, 27 November: "just make a tool like a hammer or a wrench for when he's
   building"). On his own ground, whenever he builds, the rocket launcher goes on his back and he holds a hammer (a
   wrench for the gate's hinges), drawn in the look of step 1's tin, swinging with each strike. Show the panel rising
   through its three seconds, and name the cue `home.fence.hammer` for each strike. He takes the launcher back with
   one press, as he does now.
2. On his own ground, hide the car-aim label.
3. From above, mark where he stands, and draw built pieces clearly (darker than the grid, at their real width).
4. Show the build outline only after he presses B once (or holds it), not every moment on his ground; facing a piece
   he built within reach, the prompt offers to pick it up.
5. When the gate is refused for being off the edge, say "Step up to the edge of your ground to hang the gate."
6. Tint his ground a shade apart from the plain.

**Save.** `world.open.home` gains `hens`, `boxes`, `eggs` and `lastSeen`; an older save (step 1 or none) loads
unchanged. One independent review of the save and the clock.

**Sound cues:** `home.hen.cluck`, `home.hen.lay`, `home.egg.gather`, `home.box.full`, `home.board.read`,
`home.fence.hammer` (now per strike).

**Checks:** a suite without graphics (laying over real time, full boxes, gathering, the clock capped and set back, save
and reload, the older save, the switch off); the rule 23 set and the lane tier (the save changes); `npm run build`; the
`open-home-ground` scenario extended by real keys (hens, a box, eggs gathered after a jump of the clock); Claude's drive
by hand; then Kyle's and Gratian's try.

## Claude answers

Settled by the building session on 27 November 2026, before the code:

- **The record** becomes version 2: `{version: 2, name, pieces, marks, hens: [{name, breed, due}], boxes: [{i, j, eggs}],
  eggs, lastSeen}`. A version 1 record (step 1) is read and saved exactly as it is; the part turns it into version 2,
  adding only the four new fields, the first time it runs with the switch on. `due` is the seconds until a hen's next
  egg (0 while she waits for room). `lastSeen` is the real moment, in seconds since 1970, at which the dues are true.
- **The clock.** `src/app.js` reads `Date.now()` once as an open outing starts, only with the switch on, and the job
  carries it as `definition.open.homeClock`. The part takes one number from it, `awayFor(lastSeen, clock)`: never below
  0, never above 3 days. During play the hens lay over the outing's own seconds, and `lastSeen` becomes the clock's
  reading plus those seconds. A clock set back counts as no time and loses nothing; `lastSeen` then follows the clock,
  so the time counts again once the clock is put right, and nothing can stall. Gaming the clock can give no more than
  full boxes, which waiting three days gives anyway.
- **Laying.** One egg every 4 hours a hen (6 a real day). A box holds 18 (three days of one hen). Each egg goes to the
  box with fewest eggs. Moss's hens arrive due in 2 and 7 minutes, so the first egg comes before he leaves; a hen with
  nowhere to lay waits and settles 45 seconds after room is made.
- **Moss** comes the moment the fence is closed (every edge step and the gate): the crate of hens stands outside the
  gate with a spare crate, F there is his four-line talk, and his answer brings the hens and asks for each one's name.
  Moss is heard at the crate; drawing him standing there is left to the look card.
- **Nest boxes** stand in a cell of the grid, not on its lines; two old crates, two boxes. G cycles panel, gate (while
  carried), crate (while he has one). F at a box gathers it; B picks it up and gathers it first.
- **The board** is a second board beside the gate's other post. It shows itself once an outing as he comes within 12 m,
  for 14 seconds, and F there shows it again. The name board stays where it was.
- **The drive's fixes.** The outline shows after B, R or G (B also starts the hammering) and goes after 10 seconds
  without one; facing a built piece within reach always offers to pick it up. On his ground the launcher is lowered and
  the car-aim words hidden; while he builds the first-person hands hold a claw hammer drawn in code (a wrench for the
  gate), swinging with each 0.6 s strike, and the real panel, leaves or crate rise out of the ground through the
  hammering. The fire key takes the launcher back; B gives the tool back. From above: a yellow ring and arrow where he
  stands, and every built piece as a dark strip of its real length. His ground is tinted a shade darker than the plain.
