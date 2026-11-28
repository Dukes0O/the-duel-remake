# HOME-RAID-BIKE-LOOK

The short board entry controls current state, ownership, dependencies and locks.

Codex's card (Astra: art), round 2 of the Rats' raid bike. Round 1 (`docs/board/looks/home-ground/round-1.jpg`, merged
with HOME-GROUND-4) put the game's bike beside a photographed 1972 Suzuki TC90 trail bike, and it reads as a toy: a
boxy frame that looks like planks, solid wheels with no spokes, no tank, no engine, and a pole with a lamp standing up
from the back like a street light. The buggy and the tower pass for now.

What must read, from 3 m and from 20 m, ridden and wrecked: a real, small trail bike that has been ridden hard for
years. A thin tubular frame you can see through; a narrow dented tank; an engine block with its cylinder fins under the
tank; spoked wheels with knobbly tyres; long front forks; a worn seat; mismatched mudguards; rust, tape and a wired-on
crate or jerrycan. The Rat sits on it leaning forward. If a flag is wanted, a short whip pole with a rag, not a lamp.

Method: code-drawn in `src/world/open/looks/home-raiders-look.js`, as round 1 was, using the parts and the scrap
colours of `src/world/scablands-yard-look.js`; or `tools/blender/photo_model.py` with the TC90 photo if code cannot
make it read. Keep the draw count and the budgets of `tools/test-home-ground.mjs`. One sheet,
`docs/board/looks/home-ground/bike-round-2.jpg` (500 KB at most), with the photograph beside the game at the same angle,
and a short review note. More rounds while each improves it.

Checks: `tools/test-home-ground.mjs`, the rule 23 guards and `npm run build`. No frame check.

## Claude answers

## Builder handoff (28 November 2026)

Round 2 is ready for the art verdict: `docs/board/looks/home-ground/bike-round-2.jpg` and its review note.
Card checks and build passed; independent code review passed. See `docs/changes/HOME-RAID-BIKE-LOOK.md`.
The placement check rejects this card's required sheet name: `tools/test-repo-hygiene.mjs:75` allows only
`hens-round` or `step` prefixes in this family. Please authorize adding `bike-round` to that rule at review;
the single 382,519-byte comparison sheet meets the existing size limit. No test assertion was changed here.
