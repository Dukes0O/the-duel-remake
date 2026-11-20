// TOWN-VIEW-ART: which art piece the town's view draws for each thing in the town. View data only: the town's rules
// never read it. Each family keeps the contract of its art card: one cell is 8 m, a piece's origin is the middle of its
// footprint, its front faces -Z (the road side), and its parts are `<id>:<part>` children. The pieces and their parts
// are the ones `tools/test-blender-output.mjs` checks in each family file.
//
// Adding a building is a row in `src/town/content/buildings.js`, a row here and a test row (docs/WASTELAND_TOWN.md
// section 10). A building with no row here is drawn as a staked plot and is reported by `townArtMissing`.

export const TOWN_ART_FOLDER = '/assets/models/wasteland/town/';

// Every family file the town's view reads. The walkers and the trucks that drive are drawn by town-walkers.js,
// which loads walkers.glb, trucks-1.glb and works.glb itself; the parked trucks here come from the same files.
export const TOWN_ART_FAMILIES = Object.freeze({
  homes:'homes.glb', stages:'stages.glb', water:'water.glb', sanitation:'sanitation.glb', food:'food.glb',
  works:'works.glb', services:'services.glb', 'services-2':'services-2.glb', power:'power.glb', safety:'safety.glb',
  fun:'fun.glb', plants:'plants.glb', 'machines-1':'machines-1.glb', 'machines-2':'machines-2.glb',
  'trucks-1':'trucks-1.glb', 'trucks-2':'trucks-2.glb', outposts:'outposts.glb', vane:'vane.glb', dome:'dome.glb',
});

// Export faults the view works round until the family is next rebuilt: parts farther than this many metres from their
// piece's origin are left out. The Dome gate's sand banks were moved by the gate's offset twice and lie 90 m out on
// its road (TOWN-ART-DOME; tools/blender/town-dome.py makes them after the gate's children are moved).
export const TOWN_ART_KEEP_WITHIN = Object.freeze({'dome/dome-gate':60});

const piece = (family, node, extra = {}) => Object.freeze({family, node, ...extra});
const at = (family, node, x, z, turn = 0) => Object.freeze({family, node, x, z, turn});

// Buildings by their content id. `tile` repeats a small piece across a larger plot ([across, deep], evenly spaced).
// `parked` puts vehicles inside the plot, in metres from its middle, front toward -Z. `markers` names the
// numbered parts that show one each for the town's dead (the Old Ground). Footprints are the content table's.
export const TOWN_BUILDING_ART = Object.freeze({
  // Water (TOWN-ART-WATER)
  'hand-well':piece('water', 'hand-well'), standpipe:piece('water', 'standpipe'), 'water-tower':piece('water', 'water-tower'),
  'pump-house':piece('water', 'pump-house'), 'treatment-plant':piece('water', 'treatment-plant'), reservoir:piece('water', 'reservoir'),
  // Clean (TOWN-ART-SANITATION)
  latrine:piece('sanitation', 'latrine'), bathhouse:piece('sanitation', 'bathhouse'), 'reed-bed':piece('sanitation', 'reed-bed'),
  'trash-sorter':piece('sanitation', 'trash-sorter'), 'compost-heap':piece('sanitation', 'compost-heap'),
  // Food (TOWN-ART-FOOD). A greenhouse plot is 24 by 16 m and one glasshouse is 4.9 by 6.8 m: three stand in a row.
  'soup-kitchen':piece('food', 'soup-kitchen'), 'chicken-run':piece('food', 'chicken-run'), 'goat-pen':piece('food', 'goat-pen'),
  greenhouse:piece('food', 'greenhouse', {tile:Object.freeze([3, 1])}), 'market-hall':piece('food', 'market-hall'),
  canteen:piece('food', 'canteen'), 'shopfront-a':piece('food', 'shopfront-a'), 'shopfront-b':piece('food', 'shopfront-b'),
  'shopfront-c':piece('food', 'shopfront-c'), 'stall-a':piece('food', 'stall-a'), 'stall-b':piece('food', 'stall-b'), 'stall-c':piece('food', 'stall-c'),
  // Goods (TOWN-ART-WORKS)
  'salvage-yard':piece('works', 'salvage-yard'), sawmill:piece('works', 'sawmill'), kiln:piece('works', 'kiln'),
  warehouse:piece('works', 'warehouse'),
  'old-ground':piece('works', 'old-ground', {markers:Object.freeze(Array.from({length:12}, (_, index) => `marker-${index + 1}`))}),
  'pile-brick':piece('works', 'pile-brick'), 'pile-clay':piece('works', 'pile-clay'), 'pile-pipe':piece('works', 'pile-pipe'),
  'pile-salvage':piece('works', 'pile-salvage'), 'pile-sand':piece('works', 'pile-sand'), 'pile-steel':piece('works', 'pile-steel'),
  'pile-timber':piece('works', 'pile-timber'), 'pile-tin':piece('works', 'pile-tin'), 'pipe-stack':piece('works', 'pipe-stack'),
  // Services (TOWN-ART-SERVICES, TOWN-ART-SERVICES-2)
  'town-hall':piece('services', 'town-hall'), scrapyard:piece('services', 'scrapyard'), forge:piece('services', 'forge'),
  workshop:piece('services', 'workshop'), 'paint-shop':piece('services', 'paint-shop'), 'trading-post':piece('services', 'trading-post'),
  // The motor pool keeps its four work vehicles in front of its bays.
  'motor-pool':piece('services', 'motor-pool', {parked:Object.freeze([at('trucks-1', 'supply-truck', -11, -4), at('trucks-1', 'water-tanker', -4, -4),
    at('trucks-1', 'tow-rig', 3, -4), at('trucks-2', 'dozer', 10.5, -4)])}),
  'toll-bank':piece('services-2', 'toll-bank'), school:piece('services-2', 'school'), 'radio-mast':piece('services-2', 'radio-mast'),
  helipad:piece('services-2', 'helipad'), 'notice-board':piece('services-2', 'notice-board'),
  // Power (TOWN-ART-POWER). A solar plot is 16 m square and one rack is 4.4 by 3.3 m: two across, three deep.
  windmill:piece('power', 'windmill'), generator:piece('power', 'generator'), 'solar-rack':piece('power', 'solar-rack', {tile:Object.freeze([2, 3])}),
  'fuel-depot':piece('power', 'fuel-depot'), 'power-pole':piece('power', 'power-pole'),
  // Safety (TOWN-ART-SAFETY). The fire station's truck stands in front of its bays; the clinic's ambulance by its door.
  watchtower:piece('safety', 'watchtower'), 'guard-post':piece('safety', 'guard-post'),
  'fire-station':piece('safety', 'fire-station', {parked:Object.freeze([at('trucks-1', 'fire-truck', -4, -2.5)])}),
  clinic:piece('safety', 'clinic', {parked:Object.freeze([at('trucks-2', 'ambulance', 5, -5.2)])}),
  'gate-scrap':piece('safety', 'gate-scrap'), hydrant:piece('safety', 'hydrant'), 'fire-hydrant':piece('safety', 'hydrant'),
  searchlight:piece('safety', 'searchlight'),
  // Fun (TOWN-ART-FUN)
  tavern:piece('fun', 'tavern'), 'wreck-ring':piece('fun', 'wreck-ring'), 'drive-in':piece('fun', 'drive-in'), 'mud-pit':piece('fun', 'mud-pit'),
  'big-wheel':piece('fun', 'big-wheel'), 'scrap-coaster':piece('fun', 'scrap-coaster'), fountain:piece('fun', 'fountain'),
  statue:piece('fun', 'statue'), 'fun-stall-a':piece('fun', 'fun-stall-a'), 'fun-stall-b':piece('fun', 'fun-stall-b'),
  // The machine yard and the concrete plant (TOWN-ART-PLANTS) when the town has them as buildings.
  'machine-yard':piece('plants', 'machine-yard', {parked:Object.freeze([at('machines-1', 'excavator', -14, -9), at('machines-2', 'loader', -6, -9),
    at('machines-2', 'roller', 2, -9), at('machines-1', 'dump-truck', 10, -9)])}),
  'batch-plant':piece('plants', 'batch-plant'), crusher:piece('plants', 'crusher'), 'pump-station':piece('plants', 'pump-station'),
  radar:piece('plants', 'radar'), wellhead:piece('plants', 'wellhead'), conveyor:piece('plants', 'conveyor'),
  // Mrs Vane's buildings, if the town ever holds one as its own.
  'vane-kiosk':piece('vane', 'vane-kiosk'), 'vane-tank':piece('vane', 'vane-tank'), 'vane-depot':piece('vane', 'vane-depot'),
  'vane-billboard':piece('vane', 'vane-billboard'), 'vane-tower':piece('vane', 'vane-tower'),
});

// Things built cell by cell that join their neighbours: one piece runs straight along the cell's middle, one turns a
// corner and one ends a run (TOWN-ART-SAFETY: the straight and corner joints meet at cell edges). Each corner piece
// runs from the middle of the cell to two of its edges, named here, as authored.
export const TOWN_LINE_ART = Object.freeze({
  'fence-wood':Object.freeze({family:'safety', straight:'fence-wood-straight', corner:'fence-wood-corner', end:'fence-wood-end', cornerEdges:'WS'}),
  'fence-chain':Object.freeze({family:'safety', straight:'fence-chain-straight', corner:'fence-chain-corner', end:'fence-chain-end', cornerEdges:'WS'}),
  'wall-scrap':Object.freeze({family:'safety', straight:'wall-scrap-straight', corner:'wall-scrap-corner', end:'wall-scrap-end', cornerEdges:'WS'}),
  'wall-steel':Object.freeze({family:'safety', straight:'wall-steel-straight', corner:'wall-steel-corner', end:'wall-steel-end', cornerEdges:'WS'}),
});

// Pipes and sewers being laid show their trench (TOWN-ART-WORKS: the trench corner turns from the -X edge to the -Z
// edge); laid ones are underground, and a valve box marks each end and joint. Wires stand on poles.
export const TOWN_UTILITY_ART = Object.freeze({
  trench:piece('works', 'trench'), trenchCorner:piece('works', 'trench-corner', {cornerEdges:'WN'}), valve:piece('works', 'valve-box'),
  pole:piece('power', 'power-pole'), poleEvery:3,
});

// A site's stage (TOWN-ART-STAGES): pegs and timber, then open foundations, then the frame. Each scaffold piece is
// also drawn at n by n cells (8n - 1 m across); the view chooses by stage and fits it to the plot.
export const TOWN_SITE_ART = Object.freeze({plan:'scaffold-1', foundation:'scaffold-2', frame:'scaffold-3', finishing:'scaffold-4'});
// Ruins, by plot size in cells (1 to 4): burnt ones after a fire, rubble after the building is ruined.
export const TOWN_RUIN_ART = Object.freeze({burnt:Object.freeze(['burnt-1', 'burnt-2', 'burnt-3', 'burnt-4']), rubble:Object.freeze(['rubble-1', 'rubble-2', 'rubble-3', 'rubble-4'])});
// A burnt or ruined fence or wall leaves a heap of junk, not a house frame.
export const TOWN_LINE_RUIN = 'junk-pile';

// Machines at work on a site, from the town's own record of the site (its state and size), never moving.
export const TOWN_SITE_MACHINES = Object.freeze({
  foundation:Object.freeze([at('machines-1', 'excavator', -1, 0), at('machines-1', 'dump-truck', 1, 0)]),
  frame:Object.freeze([at('machines-2', 'crane-truck', -1, 0), at('machines-2', 'mixer-truck', 1, 0)]),
  // On roads being made: one machine every `every` cells, by the cell's place.
  road:Object.freeze({'road-dirt':at('machines-1', 'dozer', 0, 0), 'road-plank':at('machines-2', 'loader', 0, 0),
    'road-paved':at('machines-2', 'paver', 0, 0)}), roadEvery:6,
  pipe:at('machines-1', 'trencher', 0, 0), pipeEvery:5,
});

// Homes by tier (1 tent to 5 brick terrace). The view never puts the same model twice in a row along a street or
// across one; with one model in a tier there is nothing to vary.
export const TOWN_HOME_ART = Object.freeze([
  null,
  Object.freeze(['tent-a', 'tent-b']),
  Object.freeze(['shack-a', 'shack-b', 'shack-c']),
  Object.freeze(['stack-a', 'stack-b']),
  Object.freeze(['block-a', 'block-b']),
  Object.freeze(['terrace-a']),
]);

// Street things (TOWN-ART-STAGES): scattered along the sides of finished roads by their own seeded stream, more as a
// street gets older. `weight` is how often each is chosen; `homes` ones stand only where the side faces a home.
export const TOWN_STREET_THINGS = Object.freeze([
  Object.freeze({node:'bin', weight:5}), Object.freeze({node:'barrels', weight:4}), Object.freeze({node:'crate-stack', weight:4}),
  Object.freeze({node:'junk-pile', weight:3}), Object.freeze({node:'bench', weight:2}), Object.freeze({node:'signpost', weight:1}),
  Object.freeze({node:'sandbags', weight:1}), Object.freeze({node:'dead-tree', weight:1}), Object.freeze({node:'barrel-fire', weight:1, minAge:.5}),
  Object.freeze({node:'washing-line', weight:3, homes:true}),
]);
export const TOWN_STREET_RULE = Object.freeze({
  // Two things at most on each side of a road cell; the second needs an older street.
  perSide:2, secondShare:.6,
  // A street reaches half its clutter in about two game years (1 - e^(-years / 3)).
  yearsScale:3,
  // Things stand 0.35 to 0.8 m inside the road's edge, clear of the walkers' lanes 1.4 m either side of the middle,
  // and clear of a door by 1.8 m.
  edgeInset:[.35, .8], doorClear:1.8,
  // A street lamp every `lampEvery` cells along a street once it is a year old.
  lampEvery:3, lampAge:.25,
});

// Places outside the town's own grid, in metres (src/world/scablands.js and docs/story/the-long-dry.md section 3).
// The Dome's family is authored round the middle of its oval with the gate at -92 m on -Z; the town's oval is at
// z = -168.5 with its gate toward the town (+Z), so the family is turned half round there.
export const TOWN_WORLD_ART = Object.freeze({
  dome:Object.freeze([Object.freeze({family:'dome', node:'dome-outer', x:0, z:-168.5, turn:Math.PI, size:[28, 20]}),
    Object.freeze({family:'dome', node:'dome-gate', x:0, z:-168.5, turn:Math.PI, size:[6, 3], authoredAt:[0, -92]})]),
  // The neighbours' outposts stand where the drive puts them (src/town/content/outposts-world.js, TOWN-OUTPOST-SCENE).
  // Mrs Vane's kiosks, deed sites and Vane Reach stand where the drive puts them (src/town/content/vane-world.js, TOWN-VANE-SCENE).
});
