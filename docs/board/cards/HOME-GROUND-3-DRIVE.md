# HOME-GROUND-3-DRIVE

The short board entry controls current state, ownership, dependencies and locks.

Codex's card (Sol), small, behind `home-ground`. The eight things Claude's drive by hand of step 3 and the builders
found (`docs/board/looks/home-ground/drive-4.md`). Files: the home files (`src/world/open/home-rule.js`,
`content/home-ground.js`, `parts/home.js`, `looks/home-ground-look.js`), and for item 1 only the narrow F handling the
home part already has on a flatbed outing. No save shape change.

## Design, settled by Claude before code

1. **Loading is a tap, leaving is a hold.** On a flatbed outing, the load or unload happens when F is let go after a
   tap shorter than 0.4 s. A held F that gets him out of the truck never moves a load. Check by behaviour: holding F
   beside a set-down load gets him out and leaves the load where it is; a tap still loads and unloads.
2. **Rook and Wren come in through the gate.** Their walk from Tin Town goes to the outside of his gate, through the
   gate's lane, then to the site; they never stop against the fence. If the gate is shut it opens for them as it does
   for him. Check: from Tin Town they reach the site and start working within about a minute of the handover.
3. **Wren's teaching line plays** the first time he finishes a coop or a shed by hand, as a talk with Wren standing by
   the new building facing him (the existing `HOME_CREW_TALK`); the stray "We can talk when you come back." never
   shows for it.
4. **A mark he faces is a mark he can raise.** Within the build reach and facing a marked footprint (or a building
   below its last stage) anywhere along its front, the prompt offers the next stage; the exact cell of his feet does
   not matter. The "already stands there" refusal is only for a new outline over something else.
5. **The footprint starts in front of him:** a new coop or shed outline's near edge is about 2 m ahead of him, so he
   stands outside it while he hammers.
6. **The outline lies on the ground:** a coloured rectangle on the ground with four short corner posts and the faint
   height of the first stage, not a full pale volume; panels and boxes the same way. It stays red with its reason when
   refused.
7. Counts agree with their noun: "1 old crate", "1 tin panel".
8. The coop's and shed's tin take the fence's wear: rust at the seams, a few dented or bent sheets, darker lower edges.
   Code-drawn, gritty, never toy-like.

## Checks

`tools/test-home-ground.mjs` gains items 1, 2 (the walk reaches the site), 4, 5 and 7 by behaviour; the rule 23 set
with `test-home-ground`, `test-home-hens` and `test-career-backup`; `npm run build`. Claude drives it by hand.

## Claude answers
