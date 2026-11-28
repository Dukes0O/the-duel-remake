// HOME-GROUND-1 and HOME-GROUND-2 (docs/HOME_GROUND.md, sections 4 to 7 and 15): the player's own ground beside Tin
// Town, as data. The
// rules are in src/world/open/home-rule.js, the part in src/world/open/parts/home.js and the drawing in
// src/world/open/looks/home-ground-look.js. Nothing here reads or writes a save.
import {validateTalkScene} from '../../../story/talk.js';
import {LAND} from '../../scablands-names.js';

// The place, measured on the land on 27 November 2026 (docs/board/cards/HOME-GROUND-1.md, "Claude answers"): its
// north-west corner is 100 m west and 100 m south of Tin Town's centre, so the ground runs from 100 m to 60 m west of
// the centre and from 100 m to 140 m south of it. It rises 0.5 m from its north edge to its south edge.
export const HOME_CORNER = LAND.at('tin-town', -100, 100);
export const HOME_SIZE = 40;   // metres on a side; later steps let it grow a strip at a time
export const HOME_STEP = 2;    // metres: the grid that panels stand on
export const HOME_CELLS = HOME_SIZE / HOME_STEP;

// The pieces of step 1. `cells` is how many grid steps a piece spans; `hammer` the seconds of holding the build key.
// Level 1 is tin (Kyle, 27 November 2026); the timbered level is a later step's.
export const HOME_PIECES = Object.freeze({
  panel: Object.freeze({id: 'panel', name: 'tin panel', cells: 1, hammer: 3, height: 1.8, upCue: 'home.fence.up'}),
  gate: Object.freeze({id: 'gate', name: 'gate', cells: 4, hammer: 4, height: 2.2, upCue: 'home.gate.hang'}),
});
// HOME-GROUND-2: a nest box is knocked together from an old crate in a cell of the grid, not on its lines. It is hammered
// up like a panel, and picked up again free.
// Its size is HOME-GROUND-LOOK-1's crate on its side on two blocks (home-hens-look.js, HOME_NEST_SIZE), with room round it.
export const HOME_BOX = Object.freeze({id: 'box', name: 'nest box', hammer: 2.5, size: .5, height: .55, upCue: 'home.box.up'});
export const HOME_BUILDS = Object.freeze({
  coop: Object.freeze({name: 'coop', width: 2, depth: 2, hammer: 6, hens: 6, kg: 320, cue: 'home.coop.stage'}),
  shed: Object.freeze({name: 'shed', width: 2, depth: 3, hammer: 6, kg: 440, cue: 'home.shed.stage'}),
  tower: Object.freeze({name: 'watchtower', width: 2, depth: 2, hammer: 6, kg: 360, cue: 'home.tower.stage'}),
  tank: Object.freeze({name: 'water tank', width: 2, depth: 2, hammer: 6, kg: 280, cue: 'home.fence.hammer'}),
  greenhouse: Object.freeze({name: 'greenhouse', width: 3, depth: 3, hammer: 6, kg: 380, cue: 'home.glass.stage'}),
});
export const HOME_BED = Object.freeze({width: 1, depth: 2, hammer: 2.5, count: 6, reach: 12});
export const HOME_GLASS_STAGES = Object.freeze(['base', 'frame', 'glass', 'door']);
export const HOME_CROPS = Object.freeze({
  spinach: Object.freeze({name: 'spinach', seconds: 3600, power: false, seeds: 6}),
  carrots: Object.freeze({name: 'carrots', seconds: 14400, power: false, seeds: 6}),
  beans: Object.freeze({name: 'beans', seconds: 28800, power: false, seeds: 6}),
  firePeppers: Object.freeze({name: 'fire peppers', seconds: 43200, power: true, seeds: 3, lasts: 90}),
  jumpingBeans: Object.freeze({name: 'jumping beans', seconds: 43200, power: true, seeds: 3, lasts: 120}),
  superSpinach: Object.freeze({name: 'super spinach', seconds: 10800, power: true, seeds: 3, lasts: 120, cue: 'home.power.spinach'}),
  nightCarrots: Object.freeze({name: 'night carrots', seconds: 28800, power: true, seeds: 3, lasts: 180, cue: 'home.power.sight'}),
  ironBeets: Object.freeze({name: 'iron beets', seconds: 57600, power: true, seeds: 3, lasts: 120, cue: 'home.power.iron'}),
  stinkGarlic: Object.freeze({name: 'stink garlic', seconds: 57600, power: true, seeds: 3, lasts: 120, cue: 'home.power.stink'}),
});
export const HOME_EXTRA_FOODS = Object.freeze(['superSpinach', 'nightCarrots', 'ironBeets', 'stinkGarlic']);
export const HOME_PAIRS = Object.freeze({ram: ['superSpinach', 'firePeppers'], leap: ['firePeppers', 'jumpingBeans'],
  thump: ['superSpinach', 'jumpingBeans']});
export const HOME_LOAD_STACK = Object.freeze({x: 5975, z: 76});
export const HOME_STAGES = Object.freeze(['floor', 'frame', 'walls', 'roof']);
export const HOME_TOWER_STAGES = Object.freeze(['legs', 'platform', 'ladder', 'rail and roof']);
export const HOME_TANK_STAGES = Object.freeze(['stand', 'legs', 'drum', 'lid']);
export const HOME_TANK = Object.freeze({litres: 1000, seconds: 12 * 60 * 60, reach: 8});
export const HOME_DIG = Object.freeze({depth: 1.5, scoops: 4, seconds: 1.8, width: 3.1});
// A four-metre square pond at 1.5 metres deep holds 24 cubic metres.
export const HOME_POND = Object.freeze({width: 2, depth: 2, litres: 24000, seconds: HOME_TANK.seconds, reach: HOME_TANK.reach});
export const HOME_WELL = Object.freeze({width: 1, depth: 1, reach: 1.5, pumpSeconds: 6, cuttingTime: 1 / 3});
export const HOME_TOWER = Object.freeze({platform: 4.4, climbSeconds: 2, reach: 2.5, rocketReach: 1.25});
// HOME-GROUND-4: demands count supplied play seconds only. No value here is a wall-clock deadline.
export const HOME_RAID = Object.freeze({
  firstSitting: 4, earliest: 75 * 60, latest: 105 * 60, seconds: 4 * 60,
  testSeconds: 60, near: 150, fled: 60, ramKmh: 25, eggShare: .1,
  startMetres: 45, bikeMps: 7, buggyMps: 9, chaseMetres: 10,
  // Easy raiders flee after losing a fifth of their health; a harmless graze still leaves them fighting.
  easy: Object.freeze({bikeHealth: 45, buggyHealth: 110, retreatHealth: .8, blockedSeconds: 45}),
  medium: Object.freeze({bikeHealth: 60, buggyHealth: 140, retreatHealth: .3, blockedSeconds: 65}),
  hard: Object.freeze({bikeHealth: 75, buggyHealth: 170, retreatHealth: .2, blockedSeconds: 85}),
});
// Auntie Solder has the panels stacked at the ground for him: 76 fence the edge round the gate, and four are over.
export const HOME_PANELS = 80;
// The lane runs from the gate straight across the ground to the far fence, as wide as the gate (section 6).
export const HOME_LANE_CELLS = HOME_PIECES.gate.cells;
// A strike of the hammer is heard this often while the key is held.
export const HAMMER_STRIKE_SECONDS = .6;
// The outline stands this far in front of him.
export const HOME_REACH = 1.6;
export const HOME_BOX_REACH = 3;
export const HOME_CREW_SECONDS = Object.freeze({coop: 30 * 60, shed: 60 * 60, tower: 45 * 60, tank: 60 * 60, greenhouse: 60 * 60});
export const HOME_LOOT = Object.freeze({
  bike: Object.freeze({worth: 6, kg: 110}),
  buggy: Object.freeze({worth: 15, kg: 480}),
  crate: Object.freeze({worth: 4, kg: 60}),
});
export const HOME_CARTER_SECONDS = 60 * 60;
export const HOME_LOOT_CAPACITY = 3;
// The cursor from above moves this fast, in metres a second.
export const HOME_CURSOR_SPEED = 12;
// The camera from above: straight down over the middle of the ground, high enough to see all of it with room round it.
export const HOME_VIEW = Object.freeze({height: 62, fov: 52, liftSeconds: .7});
// The board with his ground's name stands just outside the gate, on its left.
export const HOME_NAME_LONGEST = 24;

// ---- HOME-GROUND-2: hens, nest boxes and the real clock (sections 4 and 7) ----------------------------------------
// A real day is a hen's week: a Tin Town Brown lays about 6 eggs a week in life (the usual breed-guide figure for a brown
// laying hen), so about 6 a real day here, one every 4 hours. A nest box holds three days of one hen's eggs; when every
// box is full the hens wait, and nothing is lost.
export const HEN_BREEDS = Object.freeze({
  'tin-town-brown': Object.freeze({id: 'tin-town-brown', name: 'Tin Town Brown', egg: 'brown', eggsADay: 6}),
});
export const DAY_SECONDS = 24 * 60 * 60;
export const layInterval = breed => DAY_SECONDS / HEN_BREEDS[breed].eggsADay;
export const BOX_HOLDS = 3 * HEN_BREEDS['tin-town-brown'].eggsADay;
// The old crates Moss leaves: the one the hens came in and a spare. Each becomes one nest box.
export const HOME_CRATES = 2;
// Moss's two hens, with the names they have until he gives his own. The first lays soon after she has a box, so that the
// first egg comes before he leaves (section 15); after that each lays every 4 hours.
export const MOSS_HENS = Object.freeze([
  Object.freeze({name: 'Clover', breed: 'tin-town-brown', due: 120}),
  Object.freeze({name: 'Nutmeg', breed: 'tin-town-brown', due: 420}),
]);
// A hen who had nowhere to lay settles into a box with room this many seconds after the room is made.
export const HEN_SETTLE_SECONDS = 45;
// The laptop's clock is read once when an outing opens. The time since his last visit counts for no more than this, and a
// clock set back counts as no time at all.
export const AWAY_LONGEST = 3 * DAY_SECONDS;
// The board at the gate shows itself once an outing when he comes this near, and stays up this long.
export const BOARD_NEAR = 6;
export const BOARD_SECONDS = 14;
// The build outline goes away when he has pressed none of the build keys for this long.
export const BUILD_IDLE_SECONDS = 10;
// He sees a hen's name when he faces her this near.
export const HEN_LOOK = 4.5;

// On foot: sprinting is the game's own; the third speed (15 m a second, FIGHTER_RULES in src/onfoot.js) is far too
// fast and lasts three seconds, then refills in six.
export const FOOT_BURST = Object.freeze({seconds: 3, refillSeconds: 6});

// Every event's sound cue. OPEN-SOUND chooses and registers the sounds; until then these are names only.
export const HOME_CUES = Object.freeze({
  digBite: 'home.dig.bite', digDump: 'home.dig.dump', digTear: 'home.dig.tear', digDitch: 'home.dig.ditch', pondFill: 'home.pond.fill',
  plant: 'home.bed.plant', harvest: 'home.bed.harvest', glassStage: 'home.glass.stage',
  potGlow: 'home.pot.glow', eat: 'home.eat', powerEnd: 'home.power.end',
  pair: 'home.power.pair', protein: 'home.power.protein',
  hammer: 'home.fence.hammer', up: 'home.fence.up', lift: 'home.piece.lift', gate: 'home.gate.hang',
  refused: 'home.place.refused', sprint: 'foot.sprint', burst: 'foot.burst', spent: 'foot.burst.spent',
  viewUp: 'home.view.up', viewDown: 'home.view.down', mark: 'home.mark.set', unmark: 'home.mark.clear',
  // HOME-GROUND-2
  cluck: 'home.hen.cluck', lay: 'home.hen.lay', gather: 'home.egg.gather', boxFull: 'home.box.full',
  boardRead: 'home.board.read', boxUp: 'home.box.up', crateOpen: 'home.crate.open',
  loadOn: 'home.load.on', loadOff: 'home.load.off', coopStage: 'home.coop.stage', shedStage: 'home.shed.stage',
  roost: 'home.hens.roost', shedDoor: 'home.shed.door',
  crewArrive: 'home.crew.arrive', crewHammer: 'home.crew.hammer', crewDone: 'home.crew.done',
  raidCall: 'home.raid.call', raidBike: 'home.raid.bike', raidRam: 'home.raid.ram',
  fenceFall: 'home.fence.fall', fenceUp: 'home.fence.up', towerClimb: 'home.tower.climb',
  raidWon: 'home.raid.won', raidLost: 'home.raid.lost',
  lootOn: 'home.loot.on', lootOff: 'home.loot.off', cartersGo: 'home.carters.go', cartersBack: 'home.carters.back',
  drillLower: 'home.drill.lower', drillGrind: 'home.drill.grind', drillRock: 'home.drill.rock',
  drillJam: 'home.drill.jam', drillWater: 'home.drill.water', pumpFit: 'home.pump.fit', tankFill: 'home.tank.fill',
});

// What he reads. Every line is a whole sentence.
export const HOME_WORDS = Object.freeze({
  digger: "Auntie Solder has a digger doing nothing in her yard. It's yours to borrow.",
  digDrive: 'Drive with W, A, S and D. Press B to stop and work the bucket.',
  digWork: 'Press B to drive again. Press G to choose tearing down, a ditch, a cellar or a pond.',
  digLocked: 'Finish your water tank first, and Auntie Solder will lend you her digger.',
  digAim: 'Move the bucket over the place you want to dig.',
  digTear: 'Hold Space with the bucket against your building to take off its next stage. Press E to empty the bucket.',
  digBusy: 'Finish moving or building the other one of this kind first.',
  digHens: 'Your hens are walking out. Wait until they are clear of the coop.',
  digFull: 'The bucket is full. Press E to empty it before the next scoop.',
  digDitch: 'Hold Space to dig this ditch cell. No wheel can cross it.',
  ditchOutside: 'Dig the ditch just outside your fence.',
  ditchGate: 'That would cut off the gate. Leave the lane and its edges open.',
  digCellar: 'Hold Space with the bucket over your shed to dig its cellar in four scoops.',
  cellarDone: 'Your cellar keeps half your eggs and scrap safe from the Rats.',
  digPond: 'Hold Space to dig this pond in four scoops. A pump within eight metres will fill it.',
  pondDone: 'Your pond is dug. A pump within eight metres will fill it in twelve hours.',
  pondExists: 'Finish digging the pond you have started first.',
  doorLane: 'That would block the digger from a building door. Leave a clear way at least three metres wide.',
  pileOn: 'Press F to lift this building pile onto the flatbed. Its plants travel with it.',
  pileOff: 'Press F to put this building pile beside its new mark.',
  pondWater: 'Your pond holds {litres} litres of water. The hens can drink here.',
  raidLostStore: 'The Rats took {eggs} eggs and {scrap} scrap from above ground. Your hens will walk home.',
  bedTimber: "Auntie Solder left old timber with the tank for six garden beds. Press G to choose a bed.",
  seedsGift: "Marigold's growers sent you seeds: fire peppers and jumping beans. They only grow under glass.",
  moreSeeds: "Marigold's growers have sent more seeds: super spinach, night carrots, iron beets and stink garlic.",
  protein: 'You ate an egg from your store. Your last power food will last half as long again.',
  noProtein: 'Eat a power food first, then press T within five seconds while you have an egg in your store.',
  ram: 'You can run through a fence. You will have to stand your own panels up again.',
  leap: 'Your running jump can clear a ditch or a wall.',
  thump: 'Your landing will tip over bikes within six metres.',
  spinachUse: 'Press F beside a bike or buggy to throw it over. Press F at your panel stack to carry the whole bundle.',
  fenceCarry: 'You are carrying your bundle of fence. Press F to set it down.',
  glassReady: 'Walk inside to plant your power food seeds in the pots.',
  glassLoad: "Auntie Solder left glass and frame at Tin Town's gate. Bring them home on the flatbed for your greenhouse.",
  bedHold: 'Hold B to hammer up this garden bed.',
  bedLift: 'Press B to pick up this garden bed with its crop.',
  bedCarry: 'Press B to set your garden bed down. It keeps its crop.',
  digUnfinished: 'Bring the digger back to finish taking this building down.',
  bedsUsed: 'You have used all six beds of old timber.',
  plantCrop: 'Press F to plant {crop}.',
  harvestCrop: 'Press F to harvest your {crop}.',
  cropGrowing: 'Your crop of {crop} is growing. It needs {time} more with water.',
  cropDry: 'Your crop of {crop} is waiting for water from a tank within 12 metres. It will not die.',
  noSeeds: 'You have no seeds left for this space.',
  cropPlanted: 'You planted {crop}.',
  cropGathered: 'You put {crop} in your store and kept its seed for planting again.',
  tinPacked: 'Your lunch tin holds {foods}. Press 4, 5 or 6 on foot to eat from that slot. Press T within five seconds to eat an egg and make it last half as long again.',
  tinEmpty: 'Your lunch tin is empty. Harvest power food and press F at the shed to pack it.',
  tinEat: 'You ate {crop}.',
  tinSlotEmpty: 'That slot in your lunch tin is empty.',
  powerEnded: 'The effect of your {crop} has worn off.',
  foodStore: 'Your store holds {foods}.',

  askAuntie: 'This bare ground is spoken for. Ask Auntie Solder about it in town.',
  given: 'Your ground is marked on the map. The tin panels are stacked by its corner.',
  hold: 'Hold B to hammer up the {piece}. Press R to turn it and G to change it.',
  holdMark: 'Hold B to hammer up the {piece} you marked from above.',
  hammering: 'Keep holding B to hammer it up.',
  lift: 'Press B to pick up this {piece}.',
  offGround: 'That is off your ground. Build inside the four stakes.',
  lane: 'That would close the lane from your gate. Keep it 8 metres wide so that machines can get in.',
  onTop: 'Something already stands there. Pick it up first.',
  gateEdge: 'Step up to the edge of your ground to hang the gate.',
  gateLane: 'A panel stands in the lane this gate needs. Pick it up first.',
  noPanels: 'You have no panels left. Pick one up to move it.',
  noGate: 'You have no gate left. Pick it up to move it.',
  panelsLeft: 'You have {count} tin panels left.',
  panelLeft: 'You have 1 tin panel left.',
  aboveHelp: 'Move the outline with W, A, S and D. Press B to mark a piece, R to turn it and G to change it. Press V to go back down.',
  aboveClear: 'Press B to clear this mark.',
  aboveBuilt: 'That is built. Go down to the ground to pick it up.',
  viewHint: 'Press V to look down on your ground from above.',
  nameAsk: 'What will you call your ground?',
  nameHint: 'Type a name and press Enter. Press F at the board to change it later.',
  renameHint: 'Press F to change the name on the board.',
  burstReady: 'Hold X for a burst of speed.',
  // HOME-GROUND-2
  startBuild: 'Press B to build here. Press V to look down on your ground from above.',
  holdBox: 'Hold B to hammer the old crate into a nest box. Press G to change it.',
  boxCell: 'A nest box stands there already. Pick it up first.',
  boxLane: 'That would stand in the lane from your gate. Set the nest box beside it.',
  noCrates: 'You have no old crates left. Pick up a nest box to move it.',
  gateLaneBox: 'A nest box stands in the lane this gate needs. Pick it up first.',
  cratesLeft: 'You have {count} old crates left.',
  crateLeft: 'You have 1 old crate left.',
  gather: 'Press F to gather the {count} eggs in this nest box.',
  gatherOne: 'Press F to gather the egg in this nest box.',
  emptyBox: 'This nest box is empty. Press B to pick it up.',
  gathered: 'You gathered {count} eggs. You have {store} {storeEggs} in your store.',
  gatheredOne: 'You gathered one egg. You have {store} {storeEggs} in your store.',
  laid: '{hen} laid an egg in the nest box.',
  boxFull: 'The nest boxes are full, so your hens have stopped laying until you gather the eggs.',
  henSeen: '{hen}, a Tin Town Brown. Press F to give her a new name.',
  henAsk: 'What will you call this hen?',
  henNameHint: 'Type a name and press Enter.',
  crateWaiting: 'Moss has brought two hens in a crate. Press F to talk to him.',
  firstBox: 'Your hens need somewhere to lay. Press B, then G until you hold an old crate, and hold B to make a nest box.',
  boardHint: 'Press F to read the board again.',
  buildMark: 'Press B to mark the ground for your {piece}. Press R to turn it and G to change it.',
  buildLift: 'Press B to pick up this mark before you raise the floor.',
  buildLoad: 'Bring the tin for your {piece} to this mark on the flatbed.',
  buildStage: 'Hold B to raise the {stage} of your {piece}.',
  buildDone: 'Your {piece} is finished.',
  buildExists: 'You have already marked a place for this building.',
  loadOn: 'Press F to load the tin for the {piece} onto the flatbed.',
  loadOff: 'Press F to set the tin for the {piece} down beside its mark.',
  needsFlatbed: 'This needs a truck with a bed. Go out in Tin Town\'s flatbed to bring it home.',
  gatherCoop: 'Press F to gather the eggs from the coop.',
  shedDoor: 'Press F to see what your shed holds.',
  shedStore: 'Your shed holds {count} eggs and {scrap} scrap.',
  shedStoreOne: 'Your shed holds one egg and {scrap} scrap.',
  lootOn: 'Press F to load this {piece} onto the flatbed.',
  lootOff: 'Press F to put all the loot in your shed.',
  lootFull: 'The flatbed holds three pieces. Take them to your shed.',
  lootStored: 'You put {count} scrap in your store.',
  cartersOffer: 'Press F to send Tin Town\'s carters for the loot. They keep a fifth as their pay.',
  cartersBusy: 'Tin Town\'s carters are fetching the loot. They will bring it home within an hour.',
  cartersBack: 'Tin Town\'s carters brought in {scrap} scrap and kept {pay} as their pay.',
  crewHand: 'Press F to hand the {piece} to the builders.',
  crewBusy: 'Rook and Wren are raising your {piece}. You can help them by hammering a stage yourself.',
  towerUp: 'Press F to climb your watchtower.',
  towerDown: 'Press F to climb down from your watchtower.',
  towerClimbing: 'You are climbing the ladder.',
  fenceUp: 'Tap B with the hammer to stand this panel up.',
  raidCall: 'The Rats are coming. Get up a tower or meet them at the fence.',
  raidWren: 'Rats on the road! Get up the tower!',
  raidTest: 'One Rat tested your fence and rode away. Nothing was taken.',
  raidWon: 'The Rats came at dusk. You drove them off.',
  raidLost: 'The Rats got into the coop and took {count} eggs before they left.',
  raidLostOne: 'The Rats got into the coop and took one egg before they left.',
  raidLeft: 'You left the raid. Nothing was lost and nothing was won.',
  panelsDown: '{count} panels of your fence are down. Tap B with the hammer to stand them up.',
  panelDown: 'One panel of your fence is down. Tap B with the hammer to stand it up.',
  wellMark: 'Press B to mark the ground for your well. Press G to change what you build.',
  wellLift: 'Press B to clear this well mark before you start drilling.',
  wellExists: 'You have already marked a place for your well.',
  wellLocked: 'Finish your coop first, and Auntie Solder will lend you her drill rig.',
  wellBring: 'Bring Tin Town\'s drill rig over this mark to drill your well.',
  wellDepth: 'Your well is {depth} metres deep. Bring the drill rig back to carry on.',
  drillPark: 'Stop the drill rig over your well mark, then press B to lower the mast.',
  drillLower: 'Press B to lower the mast. Hold Space to feed the auger. Hold W with Space to feed harder.',
  drillFeed: 'You are drilling through {material} at {depth} metres. Hold Space to feed, S to back off, or press B to raise the mast.',
  drillJam: 'The auger is jammed in rock. Hold S to back off, then use Space alone to feed gently.',
  drillWater: "You've hit water at {depth} metres. Raise the mast with B, step out, and hold B at the well to fit the hand pump.",
  pumpFit: "You've hit water at {depth} metres. Hold B to fit the hand pump.",
  pumpReady: 'Your hand pump is ready. Build a water tank within 8 metres of it.',
  tankRead: 'Press F to see how much water is in your tank.',
  tankFullness: 'Your water tank holds {litres} of its {capacity} litres.',
  tankWaiting: 'It will fill when a well with a hand pump is within 8 metres.',
});

// What the board at the gate says (src/world/open/home-rule.js, boardLines). Every line is a whole sentence.
export const BOARD_WORDS = Object.freeze({
  away: 'You were away for {time}.',
  awayLong: 'You were away for more than three days, and the board counts only the last three.',
  laidMany: 'Your hens laid {count} eggs while you were gone.',
  laidOne: 'Your hens laid one egg while you were gone.',
  laidNone: 'Your hens laid no eggs while you were gone.',
  full: 'The nest boxes are full, so they stopped laying.',
  noBox: 'They have no nest box yet, so they have not laid.',
  waiting: 'The nest boxes hold {count} eggs, waiting for you to gather them.',
  waitingOne: 'The nest boxes hold one egg, waiting for you to gather it.',
  emptyBoxes: 'The nest boxes are empty.',
  store: 'You have {count} eggs in your store.',
  storeOne: 'You have one egg in your store.',
  storeNone: 'Your store has no eggs in it yet.',
  fenceFirst: 'Close your fence all the way round, and Moss will bring you two hens.',
  crate: 'Moss has left two hens in a crate by your gate.',
  firstBuildings: 'Your hens need a coop before the Rats find them. Auntie Solder has left tin for a coop and a shed at Tin Town\'s gate. Go out in Tin Town\'s flatbed to bring it home.',
  drillRig: 'Auntie Solder says the land under your ground has water in it somewhere. Her drill rig is yours to borrow.',
  wellHint: 'Old Tam says water runs shallower near the low corner.',
});

// Auntie Solder's one talk. The choice gives him the ground (src/world/open/parts/home.js).
export const HOME_OFFER_ID = 'home-ground/offer';
export const HOME_OFFER = Object.freeze({
  id: HOME_OFFER_ID,
  lines: [
    {speaker: 'auntie-solder', words: "There's a bare patch of ground past the gate, on your right as you go out. Nobody has used it in years."},
    {speaker: 'auntie-solder', words: "If you fence it, it's yours. I've had tin panels stacked there for you, and a gate."},
    {speaker: 'auntie-solder', words: 'Leave a wide way in from the gate, because one day you will want to drive a machine in there.'},
  ],
  choices: [{id: 'take', words: "I'll fence it."}],
});
validateTalkScene(HOME_OFFER);

// HOME-GROUND-2: Moss's one talk at the hens' crate, once the fence is closed all the way round.
export const MOSS_HENS_ID = 'home-ground/moss-hens';
export const MOSS_TALK = Object.freeze({
  id: MOSS_HENS_ID,
  lines: [
    {speaker: 'moss', words: "Auntie told me you'd closed your fence, so I've brought you two hens in this crate."},
    {speaker: 'moss', words: "They're Tin Town Browns, the best layers we have. Each one lays about six eggs a day if she has a nest box."},
    {speaker: 'moss', words: 'Knock a nest box together from this crate, and from the spare one I left beside it.'},
    {speaker: 'moss', words: 'Give them names, too. My gran always said a hen comes to her name.'},
  ],
  choices: [{id: 'take', words: "I'll look after them."}],
});
validateTalkScene(MOSS_TALK);
export const HOME_CREW_TALK = Object.freeze({
  id: 'home-ground/builders',
  lines: [{speaker: 'wren', words: "You've shown us how you like it done. Mark the next one, bring the tin, and we'll put it up while you're away."}],
  choices: [{id: 'thanks', words: "I'll mark the next one."}],
});
validateTalkScene(HOME_CREW_TALK);
// The same test as checkSentence (src/world/open/check-tables.js), written here so that this table imports no rules.
const checkSentence = text => [...(text.includes('—') ? ['"' + text + '" has an em dash.'] : []),
  ...(/[.!?]["')\]*]*$/.test(text.trim()) ? [] : ['"' + text + '" does not end as a sentence.'])];
const wrongWords = [...Object.values(HOME_WORDS), ...Object.values(BOARD_WORDS),
  ...[HOME_OFFER, MOSS_TALK, HOME_CREW_TALK].flatMap(scene => [...scene.lines.map(line => line.words), ...scene.choices.map(choice => choice.words)])]
  .flatMap(checkSentence);
if (wrongWords.length) throw new Error('Home ground words:\n  ' + wrongWords.join('\n  '));

// The name he starts with, until he types his own. It keeps only the letters a ground's name may have
// (src/world/open/home-rule.js, cleanHomeName), and is short enough to be one: "Kyle_B" gives "KyleB's Ground".
const NAME_SUFFIX = "'s Ground";
export function defaultHomeName(playerName) {
  const kept = typeof playerName === 'string' ? playerName.replace(/[^\p{L}\p{N} -]/gu, '').replace(/\s+/g, ' ').trim() : '';
  // Whole characters only, so that a letter written as two code units is never cut in half.
  let short = '';
  for (const letter of kept) { if (short.length + letter.length > HOME_NAME_LONGEST - NAME_SUFFIX.length) break; short += letter; }
  short = short.trim();
  return short ? short + NAME_SUFFIX : 'My Ground';
}
