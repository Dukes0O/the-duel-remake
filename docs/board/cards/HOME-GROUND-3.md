# HOME-GROUND-3

The short board entry controls current state, ownership, dependencies and locks.

Codex's card (Astra: rules, code-drawn buildings and a vehicle on the bed), Home Ground's step 3, first half: the first
coop and the first shed, raised by hand from a load he brings in on Tin Town's flatbed with one press. The builders who
raise the next ones are the second half, card HOME-GROUND-3B. Kyle cut it on 27 November 2026, before his and Gratian's
try of step 2. Design: `docs/HOME_GROUND.md` sections 5, 6 ("One press picks it up") and 16; steps 1 and 2 as built are
in section 16. Behind `home-ground`, but it changes the save, so it keeps the lane tier and one independent review of
the save before the merge (rule 23, "Not covered").

## Design, settled by Claude before code

**How it starts.** Once his hens have a nest box, the board at the gate adds: "Your hens need a coop before the Rats
find them. Auntie Solder has left tin for a coop and a shed at Tin Town's gate, and her flatbed by yours." The words go
in `src/world/open/content/home-ground.js`; every line is a whole plain sentence, no em dashes.

**The flatbed.** Tin Town's flatbed (`src/town/content/work-vehicles.js` row `flatbed`, its model and its bed) stands
parked beside his gate. On foot, F beside it gets him in; F while stopped gets him out beside it. The car he drove out in
stays where he left it, and F beside that car gets him back in, as now. The flatbed is a Wasteland work machine: it
never races a course or enters an arena (Kyle's ruling of 27 November). If the open outing cannot change his vehicle
without changing race state, physics or files outside this card's area, stop and write the question to
`docs/board/questions/HOME-GROUND-3.md` with what you found.

**One press loads, one press unloads.** Two loads wait in a stack outside Tin Town's gate (about (5975, 76)): the coop's
(8 tin sheets, 4 posts, a roll of wire) and the shed's (10 tin sheets, 6 posts, a door). Stopped within 4 m of a load,
the prompt names it ("Press F to load the tin for the coop onto the flatbed."), and one press puts it on the bed, drawn
there with the haul look (`src/town/view/haul-load-look.js`) and given its weight through the haul step's `loadKg`
(`src/world/jobs/steps/haul.js`), so the truck is heavier while it carries it. Stopped within 4 m of a marked footprint
on his ground, one press sets the load down beside it. The bed holds one load. A load never falls off on this short
road.

**Marking the footprint.** On foot on his ground, G now cycles tin panel, gate, old crate, coop and shed. The coop is
4 m by 4 m (2 by 2 cells), the shed 4 m by 6 m (2 by 3); R turns them. B marks the outline on the ground; the lane rule,
the edge rule and the red refusal with its reason apply as for panels. A mark can be picked up with B until the first
stage is raised.

**Raising it by hand, in four stages.** With its load set down beside it, he holds B at the footprint for each stage:
the floor, the frame, the walls, the roof, about 6 seconds each, with the hammer in his hands and the stage rising as he
hammers (step 1's panel method). Walking from the stack, driving and four stages take a few minutes, as section 5's
"Minutes" row says. A half-raised building waits, drawn at its stage, across outings.

**What they do.**
- **The coop** houses up to 6 hens. At dusk on the land's own day his hens walk into it and at dawn walk out; while
  they are in, they are drawn inside its open front. Its 3 built-in nest boxes lay and hold eggs exactly like the
  nest boxes he hammers (18 each), and F at the coop gathers them all.
- **The shed** is where his store is. F at its door shows what the store holds in one plain sentence ("Your shed holds
  31 eggs."). The board's store line names the shed once it stands.

**The look.** Code-drawn, gritty and real, never toy-like: tin and scrap from `scrapBuilder` and the sheet pictures in
`src/world/scablands-yard-look.js`, and the corrugated tin of `src/world/open/looks/home-hens-look.js`. Each stage is
its own set of parts. Wire mesh on the coop's run, a sloped roof, posts that are not perfectly straight. No Blender.

**The save.** `world.open.home` becomes version 3 and gains `builds` (each `{kind, i, j, turn, stage}`), `loads` (where
each load is: `'stack'`, `'bed'` or a set-down point) and `flatbed` (where it stands). A version 1 or 2 record loads
unchanged and gains the fields the first time the part runs with its switch on.

**Sound cues** to name: `home.load.on`, `home.load.off`, `home.coop.stage` (per stage), `home.shed.stage`,
`home.hens.roost`, `home.shed.door`.

## Checks

- `tools/test-home-ground.mjs` and `tools/test-home-hens.mjs` gain the step's rules by behaviour: one press loads and
  unloads; a mark refuses the lane; four stages raise a coop; hens go in at dusk and out at dawn; the coop's boxes
  lay and gather; a version 2 save loads unchanged; the flatbed never appears in a race field or an arena.
- The lane tier, the rule 23 guards and `npm run build`. One independent review of the save.
- The scripted drive: extend `tools/scenarios/open-home-ground.mjs` through one coop, by real keys. It runs at night;
  Claude drives the merged step by hand.

## Claude answers

## Builder handoff

The version 3 record, load rules, footprints, hand-raised stages, coop care and shed store are implemented. The
flatbed handoff and the migration backup hook need the scope decision in `docs/board/questions/HOME-GROUND-3.md`.
The real-key scenario includes the delivery and coop stages but cannot pass before that vehicle bridge exists.

Changed assertions for Claude's written review: two version 1 upgrade expectations now require version 3 and its
added fields; the exact board text now includes the settled building invitation; the board's reread check compares
all of its text instead of only its former four-line count. No tolerance or old progress check was loosened.
