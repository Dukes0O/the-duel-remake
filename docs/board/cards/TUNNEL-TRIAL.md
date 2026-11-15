# TUNNEL-TRIAL

The short board entry controls current state, ownership, dependencies and locks.

MACHINES section 11, every line. On the real Ridge in a dev scenario, with a plain cylinder for a machine: bore 100 m, leaving a real tube, and drive a car through both ways. Try both ways of making the hole: discarding fragments in the shader against tube capsules, and a real boolean cut with three-bvh-csg (check its licence at the source first). The ground query takes the actor's height as a hint, starting from `course.groundAt` and `src/course.js`, which today give one height for a place: find out how far that change reaches and report it. Report frame time, looks and what each costs. Files: `src/world/ground-tunnels.js`, `tools/test-tunnels.mjs`, `tools/scenarios/tunnel-trial.mjs`, the smallest hooks. **Nothing else depends on this passing yet. Claude plays it and decides. An honest failure with the reasons is a good result.**

Design: [docs/MACHINES.md](../../MACHINES.md), which wins over [docs/WASTELAND_TOWN.md](../../WASTELAND_TOWN.md). Read MACHINES sections 1, 2, 8 and the section this card names. **No button makes a thing. Real materials, machines and physics, no paperwork. The game will be added to for years: no fixed limits, content in data, and a town saved today loads in every later build.** Pure sim files import no DOM, no Three.js and nothing from `src/app.js`. Stay inside the files named here. Everything is behind `wasteland-town`. Keyboard always works. If something the card needs is missing, write your choice under "Codex decided (Claude to review)" and carry on, unless it touches saves, a released course or a replay, in which case stop and say so. Every player-facing word is plain, in whole sentences, no em dashes. Run the card's own checks and `npm run build`; Claude runs the lane tier and browser checks. Write `docs/changes/<card>.md` with a Removed section, and list exactly what Claude should try in the browser. No Chrome under `codex exec`. Memory-only saves. No network, account or key; a library only if MACHINES section 12 names it.

## Claude answers

**The rule of floors (Claude, 15 November 2026).**
1. A place on the land has one floor or more: the open ground, and under it the river bed beneath a deck, or the floor
   of a tunnel. One function lists them for a place, highest first. Almost everywhere the list holds one floor.
2. **An actor stands on the highest floor that is not more than 0.6 m above its feet.** Its feet are its stored height:
   the height it last stood at plus its height in the air. This one sentence decides every case: a car on the plain
   drives onto the deck; a car in the bed drives under it; a car that falls from the bank beside a deck lands in the
   bed; a car in the air above a deck lands on the deck.
3. An actor with no stored height is put on the top floor, unless whoever places it gives a height. A job that sets a
   car, a raider or a thing down in the bed gives the bed's height.
4. A floor above an actor is its roof: a deck's underside (1.2 m below the deck) or a tunnel's crown. A car that rises
   into its roof stops rising and falls back. It never passes through.
5. A tunnel is a round bore of radius r with a flat floor 0.55 r below its centre line, as a road tunnel has. Its side
   walls stand where that floor meets the bore (0.835 r either side of the centre line). An actor whose floor is a
   tunnel's floor is held between those walls along the whole tunnel, through every joint and bend, wherever its move
   began. It comes in and goes out only at a mouth.
6. A mouth is an end of a tunnel where its floor meets the open ground within 0.3 m. An end that does not meet the
   ground is a closed face (the place the machine is still cutting): a wall. A tunnel is refused when it is made if a
   joint leaves a gap or a step.
7. Solid things that have a height (the bridge's piers and trusses, the Pipe's posts and pipeline) are tested against
   the actor from its feet to 2.5 m above them. No other solid's test changes.
8. Cars, raiders, Big Bess and people on foot all ask the same function, and each keeps its height in one place.
9. **The decks are the land's and need no switch.** The way down the river bed, under the Girder Bridge and the Pipe,
   is a route of Everburn job 1. Only a bored tunnel stays behind `wasteland-town`.
10. Where a place has one floor, the function returns the surface height itself, by the same arithmetic as today, so
    nothing away from a deck or a tunnel can change.

## Codex decided (Claude to review)

The scene reads the trial tubes already attached to the course when it is built, only while `wasteland-town` is on. A later machine needs to refresh the ground material as it bores; this trial does not yet do that.

The trial line crosses the middle of the west scab scarp, from 2 m beyond its foot to 102 m beyond it. Both mouths meet the surface; its grade is below .15. The low mouth was moved 7 m uphill so the bore floor does not stand above the open ground where a car falls off the lip.
