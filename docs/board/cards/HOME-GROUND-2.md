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
