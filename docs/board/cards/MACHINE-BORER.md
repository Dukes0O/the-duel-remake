# MACHINE-BORER

The short board entry controls current state, ownership, dependencies and locks.

MACHINES section 6. Waits for TUNNEL-TRIAL's go. Thrust and slow steering, cutter head turning, dirt on the conveyor, rock and sparks at the face, breaking through into daylight. Name it when you build it. Tunnels join the road and pipe networks. Stops at reserved places with a sentence. Gratian's favourite thing in the game: Claude plays it before anyone calls it done.

Design: [docs/MACHINES.md](../../MACHINES.md), which wins over [docs/WASTELAND_TOWN.md](../../WASTELAND_TOWN.md). Read MACHINES sections 1, 2, 8 and the section this card names. **No button makes a thing. Real materials, machines and physics, no paperwork. The game will be added to for years: no fixed limits, content in data, and a town saved today loads in every later build.** Pure sim files import no DOM, no Three.js and nothing from `src/app.js`. Stay inside the files named here. Everything is behind `wasteland-town`. Keyboard always works. If something the card needs is missing, write your choice under "Codex decided (Claude to review)" and carry on, unless it touches saves, a released course or a replay, in which case stop and say so. Every player-facing word is plain, in whole sentences, no em dashes. Run the card's own checks and `npm run build`; Claude runs the lane tier and browser checks. Write `docs/changes/<card>.md` with a Removed section, and list exactly what Claude should try in the browser. No Chrome under `codex exec`. Memory-only saves. No network, account or key; a library only if MACHINES section 12 names it.

## Claude answers

**The trial passed (Claude, 15 November 2026).** Read `docs/board/cards/TUNNEL-TRIAL.md`, "Claude answers" and "Claude's
verdict", before anything else. What it settles for this card:

- **The tunnel is the trial's:** `src/world/ground-tunnels.js` (the rules), `course.setGroundTunnels(list)` (the scene
  follows its revision), the rule of floors. The machine adds segments as it cuts; the last end is a closed face until
  it breaks through.
- **A tunnel begins and ends in a face.** The machine may start only where the ground rises the bore's full height
  within 12 m of the mouth, and it breaks through only into such a face. Anywhere else it stops with a sentence ("There
  is not enough hill over her here. Dig her a cutting first."). The first place to bore on the Scablands is the Ridge.
- **Saving.** A town's tunnels are a list of segments in the town's own ground data, beside the dug ground: start, end,
  radius, and whether each end is open. A save with no list has no tunnels. Nothing already saved changes shape. This
  touches saves, so it gets the save checker and an independent review before it merges.
- **Drawing is Claude's:** rock lining with rings and a pipe run, lamps, darkness between them, the portal at each
  mouth (`public/assets/models/wasteland/town/borer.glb` holds `borer`, `tunnel-ring` and `portal`), sparks and dirt at
  the face. Build with plain shapes and hand over.
- **Not yet explained from the trial:** for the first second after a car is set down outside a mouth, neither car nor
  mouth showed in two of Claude's pictures. Look for it when the camera is touched.

