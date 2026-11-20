# BOWL-WEAPONS-LOOK

The short board entry controls current state, ownership, dependencies and locks.

The weapons, the rivals' bolt-ons and the damage, drawn. Design: [BOWL-SHOW-2](BOWL-SHOW-2.md), sections 7 and 9.
Claude's card: it is judged by pictures from the game and by driving. Drawn in code first, gritty, never toy-like.

**Seen in the hand drive:** in Last Truck Rolling, Big Kettle was a bare chassis on wheels with no body and no boiler.

## What to draw

1. **The three weapons on a truck,** each moving with the rules' state: the hammer's arm rising (the tell) and coming
   down with a dust ring; the saw's disc spinning, throwing sparks where it cuts and glowing when it must cool; the
   launcher's plate snapping up with a puff of air, and its gauge.
2. **Each rival known at a glance by what it carries:** Rust Rhino's horn, Big Kettle's boiler and hammer, Tin Lizard's
   tail and saw, Old Bess's launcher, Dragon Wagon's stacks and fire. Every rival has a whole body.
3. **Damage on the trucks:** at three fifths of health a panel hangs loose; at one fifth smoke; at nothing fire and a
   stopped truck. A launched truck tumbles and rights itself.
4. **The choosing card's three pictures,** from the weapons as drawn.

## What done looks like

Pictures from the real game with its screen up: each weapon at its tell and at its hit; the five rivals side by side; a
truck at each damage state; a truck in the air off the launcher beside the wall. One comparison sheet under
`docs/board/looks/bowl-weapons/` with Claude's verdict, sent to Kyle with a pick.

## Files and locks

`src/bowl/bowl-weapons-view.js` (new), `src/bowl/bowl-view.js`, the rivals' bolt-ons where they are drawn today,
`docs/board/looks/bowl-weapons/`. No lock.

## Checks

1. The view builds each weapon once and reads the rules' state without writing it (a check beside
   `tools/test-bowl-weapons.mjs`).
2. Laptop only: the pictures above, and a hand drive of Last Truck Rolling with each weapon.

## Sound cues

None new: the events and their cues are BOWL-WEAPONS's.
