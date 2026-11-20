# MACHINE-YARD-NEXT

Claude's card, cut on 19 November 2026 when MACHINE-ROADS and MACHINE-DRILL were closed (rules by Codex, 14 November;
drawing and hand play by a Claude session, 19 November; sheets in `docs/board/looks/machine-roads/` and
`docs/board/looks/machine-drill/`). Everything is behind `wasteland-town`. These are what the hand plays found and what
the two closed cards left.

## Found in play

- Machines pass through each other in the yard (the roller drove into the parked dozer).
- A paver cannot lay on scraped ground, only on fill, and nothing tells the player.
- Six roller passes are needed before fill counts as firm, because each pass also pushes fill sideways. Decide whether
  that is right, and show the player how firm the fill is.
- A 13 m well is about two and a half minutes of holding Space. Decide the pace, or what there is to do meanwhile.
- The dust puffs in `src/machines/view.js` are drawn far from the machine.
- Ground the blade only scraped hardly shows from standing height; the heap ahead of the blade is one shape; the first
  water is pale and the hole itself is not drawn. Nobody has judged the sounds.

## Model faults (one Blender round on `tools/blender/town-machines-2.py`)

The roller's yokes are plain bars, a pale panel sits behind the paver's seat, the drill truck's deck is blurred where
photos meet and its outriggers are plain bars.

## Left by the rules cards

- Sending a yard road or a yard-drilled well to a player's town (which town, which save, when) is not built. The
  machine yard holds no town and no save.
- Loose material rolled across the edge of an eight-metre town cell leaves the neighbouring cell's saved grade as
  paved. No player path writes a town's road yet; cure it in the card that makes one.
- The roller and the paver are ready for the Dig by their look. DIG-YARD-TOY decides when `digMachineIds` adds them.

## Checks

Each item names its own check when it is taken up. The yard's suites are `tools/test-machine-roads.mjs`,
`tools/test-machine-drill.mjs` and `tools/test-machine-view.mjs`; the scenarios are `machine-roads` and `machine-drill`.

## Done (19 November 2026, pull request 56, merged)

The five "Found in play" items are built: machines meet each other as solids (`src/machines/yard-solids.js`, each machine's
`footprint` measured from its model, sound `machine-contact`); the paver says where the nearest fill is; the roller shows the
fill's firmness as a percentage; a 13 m well takes about a minute at a steady feed; dust sits at the machine. Still open on
this card: the model round on `town-machines-2.py`, sending yard work to a town, the cell-edge grade case, the roller and paver
in the Dig, and one new finding: the roller compacts the cell at its middle while its drum is drawn about 2 m ahead, and the
paver lays at its middle while its screed is drawn about 4 m behind (Claude: keep the rules where they are for now; decide
with the next machine card).
