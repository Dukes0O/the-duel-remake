# MACHINE-ROADS

The short board entry controls current state, ownership, dependencies and locks.

Dozer: blade down, pushes material ahead of it as a real heap, cuts to the blade's height, fills ditches. Roller and paver: drive along a route and a proper road comes out behind you, in real grades that make trucks faster. `tools/test-machine-roads.mjs`.

Design: [docs/MACHINES.md](../../MACHINES.md), which wins over [docs/WASTELAND_TOWN.md](../../WASTELAND_TOWN.md). Read MACHINES sections 1, 2, 8 and the section this card names. **No button makes a thing. Real materials, machines and physics, no paperwork. The game will be added to for years: no fixed limits, content in data, and a town saved today loads in every later build.** Pure sim files import no DOM, no Three.js and nothing from `src/app.js`. Stay inside the files named here. Everything is behind `wasteland-town`. Keyboard always works. If something the card needs is missing, write your choice under "Codex decided (Claude to review)" and carry on, unless it touches saves, a released course or a replay, in which case stop and say so. Every player-facing word is plain, in whole sentences, no em dashes. Run the card's own checks and `npm run build`; Claude runs the lane tier and browser checks. Write `docs/changes/<card>.md` with a Removed section, and list exactly what Claude should try in the browser. No Chrome under `codex exec`. Memory-only saves. No network, account or key; a library only if MACHINES section 12 names it.

## Claude answers

**The drawing that was owed (Claude, 19 November 2026).** This answers the "Not done" line below. No rule in
`src/machines/` changed; only what is drawn. Sheets and review notes: `docs/board/looks/machine-roads/`.

- **What a player saw, measured in the real game.** The roller and the paver were a yellow box and a green box with a
  grey drum: the yard loaded only `machines-1.glb`, and the photo-built roller and paver were in `machines-2.glb`, never
  loaded. The dozer's blade never moved and its seat view showed no part of the machine. After a full pass of the dozer
  the ground showed nothing at all, because the colours were painted on the yard floor and the floor lies under the
  edited ground.
- **The machines now.** The yard loads `machines-2.glb` and uses its roller and paver. The dozer's blade goes down to cut
  while Space is held, sits half way to spread and lifts to travel, with a heap of loose earth rolling ahead of it. The
  roller's drum turns with the ground it covers. The paver's screed comes down to lay and lifts to travel, and steam
  rises off the new surface behind it. Each machine has a driver's seat that shows the tool it works: the top of the
  blade over the bonnet, the drum under the hood, the hopper and its drag chain.
- **The ground now.** Worked ground is its own drawn surface 0.07 m above the ground, on the same corners as the edited
  ground. Scraped by the blade: plain, the ground's grain showing through. Loose fill: dark clods with a ragged edge.
  Rolled: paler and flatter with each pass. Paved: a dark mat with a straight edge. Paved on fill that was never made
  firm: crazed, with earth in the cracks. Paved too fast, off its line or over a bump: rippled and torn, with a ragged
  edge. A heap or a pit is not drawn as work; it is the ground's own shape.
- **A fault found in the model file.** One paver track wheel stood 22 m from the paver and the roller's root sat on top
  of the loader, because the recipe used the name `roller` twice. The wheel is back on its track (72 points moved by
  20.38 m in `machines-2.glb`), the roller's root is at x = 22, and the recipe line is corrected. The file was corrected
  in place, not exported again from Blender; the next export from the corrected recipe gives the same placement.
- **Changed assertions, reviewed.** `tools/test-machine-roads.mjs` used to read the yard floor's vertex colours and
  heights. Those were never seen in the game, so the floor painting is removed and the same claims are now made of the
  drawn surface: work shows and changes height, it reaches across the drum and no further, bad work and repaired work
  differ, a paved edge is clean, loose, firm and paved are three different surfaces, and removing work removes the
  drawing. Two claims are added (cut ground is drawn apart from fill; ground the roller only measured is not drawn).
  Nothing is loosened. `tools/test-machine-view.mjs` now takes the drill from `machines-2.glb`, where the game takes
  it, and adds a check for each road machine that its seat is clear of the model and that the eye meets the blade, the
  drum or the paver's own front in the lower half of the picture.
- **Played by hand** in a visible window with real keys: cut through the heap, filled the ditch, scraped a stretch,
  spread the load, rolled six passes, paved too fast, at a steady pace, and over unrolled fill. What I met: machines
  pass through each other (I rolled into the parked dozer); six passes are needed before fill counts as firm, because
  each pass also pushes fill sideways; a paver cannot lay on scraped ground, only on fill, and nothing says so.
- **Ready for the Dig?** Yes for their look. The roller and the paver read as themselves from 30 m and from the seat.
  `digMachineIds` still leaves them out without the town's switch; DIG-YARD-TOY decides when to add them.

## Codex decided (Claude to review)

- Road work uses whole-metre cells. A blade carries material from a cut into a fill; rolling firms the fill and paving records its condition. The yard uses Space while driving to operate each road machine. The town connection still needs to be built.
- The yard starts with a raised patch and a shallow ditch in front of the dozer. They provide material to move and reset when the visit ends.
- Hold Shift while driving the paver to keep the steady pace needed for a smooth surface. Driving at full speed can leave a rough surface that the player can pave again.
- A town can apply the same individual machine actions to an optional road-work layer. Old towns gain no new field until work is applied. The yard remains separate from town saves.

- Town road work uses the Scablands and groups whole-metre work into eight-metre town cells. The weakest part sets the grade: dirt until all parts are firm, the existing middle road speed when firm, and paved when all parts are smooth. A rough patch lowers the grade until repaired.

- The dozer cuts ten centimetres below ordinary ground while Space is held. Releasing Space spreads the carried material while driving.

**Built and merged behind `wasteland-town` (Claude, 14 November 2026).** Codex built it in rounds: the dozer cuts and gathers ordinary ground and spreads it, the roller packs it (material is kept, less a stated packing), the paver lays a surface at a steady pace on its own working line, bad work (soft, ragged, bumped) is found from where the machine really drove and can be put right, all on the yard's one shared ground, so the dozer fills a ditch the trencher dug. A town's truck routing reads a saved road's grade. Four independent reviews by Codex; the last found no fault a player would meet in ordinary use.
- **Settled by Claude:** the machine yard holds no town and no save. Sending a yard road to a player's town is a later card.
- **Left for that later card (the fourth review's rare case):** loose material rolled across the edge of an eight-metre town cell leaves the neighbouring cell's saved grade as paved. No player path writes a town's road yet.
- **Not done:** a finished road does not show in the yard's ground, and the machines share one plain shape. Claude draws the machines and the three states of worked ground and plays them by hand before the card is called done.
- Known and carded already (QA-TIMING-UNDER-LOAD): `test-town-people`'s timing check fails when other jobs run beside it.
