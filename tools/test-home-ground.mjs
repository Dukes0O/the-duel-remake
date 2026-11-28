// HOME-GROUND-1: the player's own ground, without graphics (docs/board/cards/HOME-GROUND-1.md). Placing, refusing,
// lifting, the lane from the gate, marks made from above, the solids, the burst, a save and a reload, the save made
// before this card, and the switch off. Memory-only storage: no real save is read or written.
import assert from 'node:assert/strict';
import {HOME_CROPS} from '../src/world/open/content/home-ground.js';
import {buildBed, bedRefusal, cropInLand, plantCrop, harvestCrop, packTin, eatFromTin, stepHomePowers, powerStrength,
  homeFootPlatforms, newGarden, tinWords} from '../src/world/open/home-rule.js';
import {footControlInput} from '../src/input-contexts.js';
import {createFighter, stepFighter, FIGHTER_STEP_SECONDS, FIGHTER_RULES} from '../src/onfoot.js';
import {readFileSync} from 'node:fs';
import {PLAYERS_KEY, activePlayer, loadPlayers, replacePlayerProfile, savePlayers} from '../src/progression.js';
import {beginOpenLand, stepOpenLand} from '../src/world/open/open-land.js';
import {newWorld} from '../src/world/open/open-record.js';
import {savedOpenRecord, settleOpenWorld} from '../src/world/open/open-save.js';
import {worldForProfile} from '../src/world/open/open-world.js';
import {homePart} from '../src/world/open/parts/home.js';
import {applyEffects} from '../src/world/open/open-effects.js';
import {createJobSolidGrid, SOLID_GRID, SCABLANDS_SOLIDS} from '../src/world/scablands-solids.js';
import {distanceToNet} from '../src/world/scablands-road.js';
import {scablandsSurfaceHeightAt} from '../src/world/scablands-ground.js';
import {tinTownGateFor} from '../src/world/tin-town-gate.js';
import {LAND} from '../src/world/scablands-names.js';
import {FOOT_BURST, HOME_CELLS, HOME_CORNER, HOME_CUES, HOME_OFFER_ID, HOME_PANELS, HOME_SIZE, HOME_WORDS,
  defaultHomeName} from '../src/world/open/content/home-ground.js';
import {boardSpot, build, cleanHomeName, groundPoint, homeSolids, lift, newHome, outlineFor, panelsLeft, pieceInLand,
  readableHome, refusal, slotInFront, buildSlot, buildBounds, toggleMark, markBuild, buildRefusal, liftBuild, raiseBuild, buildInLand,
  homeLoadKg, transferHomeLoad, buildBox, giveHens, buildingDoor, boardLines, crewOffer, handToCrew, advanceCrew, upgradeHome, newsBoardSpot, boxSlotInFront, boxInLand, facedThing, ripenHome} from '../src/world/open/home-rule.js';
import {HOME_LOAD_STACK, HOME_BUILDS} from '../src/world/open/content/home-ground.js';
import {createHomeGroundView} from '../src/world/open/looks/home-ground-look.js';
import {PerspectiveCamera, Vector3} from 'three';
import {CARS} from '../src/config.js';
import {ARENA_FIELD} from '../src/arena/arena-event.js';
import {homeCameraPose, homeBuildCameraPose, stepHomeLift} from '../src/world/open/home-camera.js';
import {LegacyRoadsideDuel} from './legacy-roadside-duel.mjs';
import {stepFootTransition} from '../src/onfoot-transition.js';
import {FEATURE_STATES} from '../src/feature-flags.js';
import {HOME_RAID, HOME_TOWER} from '../src/world/open/content/home-ground.js';
import {openHomeSitting, homeRaidDue, startHomeRaid, stepHomeRaid, ramHomePanels,
  towerAtLadder, stepHomeTower, homeTowerPose} from '../src/world/open/home-raid-rule.js';
import {standPanel, lootOnBed, sendCarters, finishCarters, shedWords} from '../src/world/open/home-rule.js';
import {finishHomeRaid} from '../src/world/open/home-raid-rule.js';
import {homeRocketReach, selectFootGear, stepFootWeapons} from '../src/onfoot-weapons.js';
import {syncHomeGround} from '../src/arena/modes/home-ground.js';
import {damageRaider} from '../src/raiders.js';
import {COMBAT_TUNING} from '../src/wasteland-tuning.js';
import {stepProjectiles} from '../src/combat-projectiles.js';
import {worldHudModel} from '../src/world/world-hud.js';
import {drillSite} from '../src/machines/drill.js';
import {HOME_TANK} from '../src/world/open/content/home-ground.js';
import {markWell, wellInLand, homeDrillHole, drillHomeWell, fitHomePump, fillHomeTanks, tankConnected,
  wellRefusal, tankWords} from '../src/world/open/home-rule.js';

let checks = 0;
const check = (condition, message) => { assert.ok(condition, message); checks++; };
const equal = (a, b, message) => { assert.deepEqual(a, b, message); checks++; };
const DT = 1 / 60;
const parts = [homePart];

// Step 5: the real drill, saved depth and water that waits without taking anything away.
{
  let home = newHome('Water', 1000);
  home = {...home, builds: [{kind: 'coop', i: 2, j: 8, turn: 0, stage: 4}],
    boxes: [{i: 2, j: 8, eggs: 0}, {i: 3, j: 8, eggs: 0}, {i: 2, j: 9, eggs: 0}]};
  const seed = 42, cell = {i: 12, j: 12};
  home = markWell(home, cell, seed);
  const at = wellInLand(home.well);
  equal(home.well.water, drillSite(seed, Math.round(at.x), Math.round(at.z)).depth, 'water depth is the existing drill site at whole world metres');
  equal(markWell({...home, well: null}, cell, seed), home, 'the same seed and well mark find the same water');
  equal(wellRefusal(home, {i: 14, j: 14}), 'wellExists', 'there is one saved well');
  const first = drillHomeWell(home, seed, {mastDown: true, feed: .5}, 30);
  check(first.home.well.depth > 0 && first.home.well.depth < home.well.water, 'a short drilling session leaves a partial hole');
  const restored = JSON.parse(JSON.stringify(first.home));
  equal(homeDrillHole(restored, seed).depth, first.hole.depth, 'the next outing resumes the saved depth');
  const rocky = {...home, well: {...home.well, depth: homeDrillHole(home, seed).site.gravelEnd}};
  const jam = drillHomeWell(rocky, seed, {mastDown: true, feed: 1}, 1);
  check(jam.hole.jammed && jam.home.well.depth === rocky.well.depth, 'hard feeding in rock jams without advancing');
  const clear = drillHomeWell(jam.home, seed, {mastDown: true, feed: -1}, 1, jam.hole);
  check(!clear.hole.jammed, 'backing off clears the existing drill jam');
  let cut = {home: restored, hole: homeDrillHole(restored, seed)}, seconds = 30;
  while (cut.home.well.depth < cut.home.well.water && seconds < 600) {
    cut = drillHomeWell(cut.home, seed, {mastDown: true, feed: .5}, 1, cut.hole); seconds++;
  }
  equal(cut.home.well.depth, home.well.water, 'drilling stops exactly at water');
  check(seconds > 90 && seconds < 360, 'a steady well takes a few minutes of play');
  equal(drillHomeWell(cut.home, seed, {mastDown: true, feed: .5}, 60, cut.hole).home, cut.home, 'feeding after water never drills deeper');
  home = fitHomePump(cut.home);
  check(home.well.pump && readableHome(home), 'the finished hand pump survives record validation');
  const tank = {kind: 'tank', i: 14, j: 12, turn: 0, stage: 0, litres: 0, filled: null};
  home = markBuild(home, tank);
  home = {...home, loads: {...home.loads, tank: {i: tank.i, j: tank.j}}};
  for (let n = 0; n < 4; n++) home = raiseBuild(home, tank);
  const row = home.builds.find(item => item.kind === 'tank');
  check(tankConnected(home, row) && readableHome(home), 'a finished tank within eight metres has a pump connection');
  equal(row.filled, 1000, 'the tank starts its clock when its lid is fitted');
  const half = fillHomeTanks(home, 1000 + HOME_TANK.seconds / 2);
  equal(half.builds.at(-1).litres, HOME_TANK.litres / 2, 'six real hours fills half the tank');
  equal(fillHomeTanks(half, 900), half, 'a backward clock loses no water or counted time');
  equal(fillHomeTanks(half, half.builds.at(-1).filled), half, 'the same clock moment cannot fill twice');
  const full = fillHomeTanks(JSON.parse(JSON.stringify(half)), 1000 + HOME_TANK.seconds);
  equal(full.builds.at(-1).litres, HOME_TANK.litres, 'a closed game and reload completes the twelve-hour fill');
  equal(fillHomeTanks(full, 1000 + 10 * HOME_TANK.seconds).builds.at(-1).litres, HOME_TANK.litres, 'water never passes full');
  const dry = {...home, well: {...home.well, pump: false}};
  const waited = fillHomeTanks(dry, 1000 + HOME_TANK.seconds);
  equal(waited.builds.at(-1).litres, 0, 'an empty tank without a pump waits harmlessly');
  equal(fillHomeTanks({...waited, well: home.well}, 1000 + HOME_TANK.seconds).builds.at(-1).litres, 0, 'fitting a pump cannot claim old disconnected time');
  check(tankWords(half, half.builds.at(-1)).endsWith('.') && tankWords(half, half.builds.at(-1)).includes('500'), 'F reads a whole sentence with the water amount');
  for (const well of [{...home.well, depth: -1}, {...home.well, water: Infinity}, {...home.well, depth: 0}, {...home.well, i: 20}])
    check(!readableHome({...home, well}), 'invalid or premature pumped wells are rejected');
  for (const litres of [-1, Infinity, HOME_TANK.litres + 1])
    check(!readableHome({...home, builds: home.builds.map(item => item.kind === 'tank' ? {...item, litres} : item)}), 'invalid tank amounts are rejected');
}

// Step 4B: persistent loot, one bed, the store and the carters' one-hour contract.
{
  const home = newHome('Loot', 1000), seed = 22;
  const raid = startHomeRaid(home, seed, false);
  raid.riders[0].health = 0; raid.riders[2].health = 0; raid.riders[1].fled = true;
  const won = finishHomeRaid(home, raid, 'won', seed);
  const wrecks = won.home.loot.filter(row => row.kind !== 'crate');
  equal(wrecks.map(row => row.kind), ['bike', 'buggy'], 'only wrecked raiders leave wrecks');
  equal(wrecks.map(row => row.position), [raid.riders[0], raid.riders[2]].map(row => ({...row.position, yaw: row.yaw})),
    'wrecks keep the exact place where each raider stopped');
  check(won.home.loot.length >= 3 && won.home.loot.length <= 4, 'a win leaves one or two crates beside the wrecks');
  equal(finishHomeRaid(home, raid, 'won', seed), won, 'seeded loot repeats exactly');
  equal(finishHomeRaid(won.home, won.raid, 'won', seed).home, won.home, 'a finished raid never pays twice');
  for (const outcome of ['lost', 'left']) equal(finishHomeRaid(home, raid, outcome, seed).home.loot, [], outcome + ' leaves nothing');
  equal(finishHomeRaid(home, {...raid, test: true}, 'won', seed).home.loot, [], 'the harmless lesson yields no loot');
  let loaded = won.home;
  for (const row of won.home.loot.slice(0, 3)) loaded = transferHomeLoad(loaded, {vehicle: 'flatbed', position: row.position, speedKmh: 0});
  equal(lootOnBed(loaded).length, 3, 'three taps put three pieces on the bed');
  const extra = {kind: 'crate', position: groundPoint(10, 10), worth: 4}; extra.position.yaw = 0;
  loaded = {...loaded, loot: [...loaded.loot, extra]};
  equal(transferHomeLoad(loaded, {vehicle: 'flatbed', position: extra.position, speedKmh: 0}), loaded, 'three pieces fill the bed');
  equal(transferHomeLoad(loaded, {vehicle: 'flatbed', position: HOME_LOAD_STACK, speedKmh: 0}), loaded, 'loot leaves no room for a building bundle');
  check(homeLoadKg(loaded) > 0 && readableHome(loaded), 'the carried loot has weight and survives validation');
  const shed = {kind: 'shed', i: 2, j: 8, turn: 0, stage: 4};
  loaded = {...loaded, builds: [shed]};
  const worth = lootOnBed(loaded).reduce((sum, row) => sum + row.worth, 0);
  const delivered = transferHomeLoad(loaded, {vehicle: 'flatbed', position: buildingDoor(shed), speedKmh: 0});
  equal([delivered.scrap, lootOnBed(delivered).length], [worth, 0], 'one shed tap stores the whole load at its full worth');
  check(shedWords({...delivered, eggs: 1}).includes('one egg and ' + worth + ' scrap'), 'the shed names eggs and scrap in one sentence');
  const sent = sendCarters(loaded, 1000), total = loaded.loot.reduce((sum, row) => sum + row.worth, 0);
  check(readableHome(sent), 'the carters and carried pieces survive save validation');
  equal(transferHomeLoad(sent, {vehicle: 'flatbed', position: buildingDoor(shed), speedKmh: 0}), sent, 'reserved loot cannot also be delivered by hand');
  equal(sendCarters(sent, 1100), sent, 'a second press cannot restart the carters');
  for (const now of [999, 1000, 4599]) equal(finishCarters(sent, now).home, sent, 'carters cannot finish early or on a backward clock');
  const returned = finishCarters(sent, 4600);
  equal(returned.receipt, {scrap: total - Math.floor(total / 5), pay: Math.floor(total / 5)}, 'the carters keep a fifth rounded down');
  equal([returned.home.scrap, returned.home.loot.length, returned.home.carters.began], [returned.receipt.scrap, 0, null], 'all loot is paid and the job ends');
  equal(finishCarters(returned.home, 9000).home, returned.home, 'completed carters cannot pay twice');
  for (const bad of [{...loaded, scrap: -1}, {...loaded, loot: [{...extra, worth: 99}]},
    {...loaded, carters: {began: Infinity}}, {...loaded, loot: [...loaded.loot, {...extra, position: 'bed'}]},
    {...loaded, loads: {...loaded.loads, coop: 'bed'}}]) check(!readableHome(bad), 'damaged version 6 loot is rejected');
  const {loot, scrap, carters, well: _well, ...older} = loaded;
  older.loads = {...older.loads}; delete older.loads.tank; delete older.loads.greenhouse;
  const legacy = {...older, version: 5, raids: {...older.raids, won: 7}, loads: {...older.loads, tower: 'bed'}};
  const bytes = JSON.stringify(legacy);
  check(readableHome(legacy), 'version 5 remains readable');
  const upgraded = upgradeHome(legacy);
  equal(JSON.stringify(legacy), bytes, 'loading version 5 does not mutate it');
  const {loot: freshLoot, scrap: freshScrap, carters: freshCarters, well: freshWell, ...kept} = upgraded;
  kept.loads = {...kept.loads}; delete kept.loads.tank; delete kept.loads.greenhouse;
  equal(freshWell, null, 'the version 7 well starts unmarked');
  equal({...kept, version: 5}, legacy, 'version 6 preserves every version 5 field including raids and the tower load');
  equal([freshLoot, freshScrap, freshCarters], [[], 0, {began: null}], 'only the three new fields are added');
}

check(FEATURE_STATES['home-ground'] === 'dev', 'the ground is behind the development switch home-ground');

// ---- The place: flat, clear of roads, solids and other places, a short walk from Tin Town's gate. ----------------
{
  let low = Infinity, high = -Infinity, road = Infinity;
  for (let x = 0; x <= HOME_SIZE; x += 2) for (let z = 0; z <= HOME_SIZE; z += 2) {
    const h = scablandsSurfaceHeightAt(HOME_CORNER.x + x, HOME_CORNER.z + z);
    low = Math.min(low, h); high = Math.max(high, h);
    if (x % 4 === 0 && z % 4 === 0) road = Math.min(road, distanceToNet(HOME_CORNER.x + x, HOME_CORNER.z + z));
  }
  check(high - low < .8, 'the ground rises less than 0.8 m across its 40 m');
  check(road - 14 > 15, 'the ground is more than 15 m from the edge of any road');
  const clear = SCABLANDS_SOLIDS.every(solid => solid.x < HOME_CORNER.x - 15 || solid.x > HOME_CORNER.x + HOME_SIZE + 15 ||
    solid.z < HOME_CORNER.z - 15 || solid.z > HOME_CORNER.z + HOME_SIZE + 15);
  check(clear, 'no solid of the land stands within 15 m of the ground');
  const gate = tinTownGateFor(LAND).gate;
  const walk = Math.hypot(HOME_CORNER.x + HOME_SIZE - gate.x, HOME_CORNER.z - gate.z);
  check(walk < 60, 'the ground\'s nearest corner is less than 60 m from Tin Town\'s gate');
}

// ---- A small open land with only this part, and a way to step it. ----------------------------------------------
function openLand(world = newWorld({seed: 5, night: 2})) {
  return beginOpenLand({id: 'roam-test', steps: [{kind: 'roam'}], open: {world}});
}
const auntie = {id: 'auntie-solder', position: {x: 5980, y: 0, z: 10}};
function viewOf(fighter, keys = {}, extra = {}) {
  return {openRoam: true, homeGround: true, onFoot: !!fighter, fighter: fighter && {position: {x: fighter.x, y: 0, z: fighter.z}, yaw: fighter.yaw},
    carPosition: null, interact: false, people: [auntie], playerName: 'Gratian', jobEvents: [], homeKeys: keys, ...extra};
}
function run(open, view, seconds) {
  const events = [], requests = [];
  for (let t = 0; t < seconds - 1e-9; t += DT) {
    const out = stepOpenLand(open, view, DT, parts);
    open = out.open; events.push(...out.events); requests.push(...out.requests);
    view = {...view, jobEvents: []};
  }
  return {open, events, requests};
}
const cues = events => events.filter(event => event.type === 'homeCue').map(event => event.cue);
const homeOf = open => open.world.open.home;
const given = () => {
  let open = openLand();
  open = run(open, viewOf({x: 5980, z: 11, yaw: 0}, {}, {interact: true}), DT).open;
  return run(open, viewOf({x: 5980, z: 11, yaw: 0}, {}, {jobEvents: [{type: 'talkChoice', id: 'take', scene: HOME_OFFER_ID}]}), DT).open;
};

// The name form gives each kind of name its own instruction, and marks the HUD only while a build tool is held.
{
  const record = {...newHome('G-Town'), hens: [{name: 'Clover', breed: 'tin-town-brown', due: 120}]};
  const home = {on: true, naming: true, namingKey: 'hen-0', namingHen: 0, tool: 'hammer'};
  const worldJob = {open: {parts: {home}, world: {open: {home: record}}}};
  const model = () => worldHudModel({worldJob}).home;
  equal(model().nameHint, 'Type a name and press Enter.', 'a hen name asks only for typing and Enter');
  check(model().building, 'the HUD knows the hammer is in his hands');
  home.namingHen = null; home.namingKey = 'ground'; home.tool = 'wrench';
  check(model().nameHint.includes('Press F at the board') && model().building, 'the ground keeps its board hint and the wrench hides the weapon panel too');
  home.tool = null;
  check(!model().building, 'putting away the tool restores the weapon panel');
}

// ---- The switch off: nothing is read, written or asked to be drawn. ---------------------------------------------
{
  let open = openLand();
  const record = JSON.stringify(open.world.open);
  const view = {...viewOf({x: 5920, z: 120, yaw: 0}, {build: true, view: true, burst: true, forward: true}), homeGround: undefined};
  const out = run(open, view, 1);
  equal(out.events, [], 'with the switch off the ground raises no event');
  equal(out.requests, [], 'with the switch off the ground asks for nothing');
  equal(JSON.stringify(out.open.world.open), record, 'with the switch off the open record is unchanged');
  check(out.open.parts.home?.on !== true, 'with the switch off the drawing has nothing to draw');
  // Even a saved ground is not read: the part does not look at it while its switch is off.
  const withHome = {...open.world, open: {...open.world.open, home: build(newHome('Kept'), {kind: 'panel', i: 3, j: 3, axis: 'x'})}};
  const kept = run(openLand(withHome), view, .5);
  equal(kept.requests, [], 'with the switch off a saved ground stands no solids and asks for nothing');
}

// ---- Auntie Solder gives him the ground. ------------------------------------------------------------------------
{
  let open = openLand();
  let out = run(open, viewOf({x: 5915, z: 110, yaw: 0}), DT);
  equal(out.open.parts.home.prompt, HOME_WORDS.askAuntie, 'at the bare ground before the talk he is told to ask Auntie Solder');
  out = run(out.open, viewOf({x: 5980, z: 11, yaw: 0}, {}, {interact: true}), DT);
  const talk = out.requests.find(request => request.type === 'talk');
  check(talk?.id === HOME_OFFER_ID && talk.speaker === 'auntie-solder' && talk.threadPriority === true,
    'pressing F beside Auntie Solder opens her one talk about the ground');
  check(homeOf(out.open) === undefined, 'the ground is not his before he answers');
  out = run(out.open, viewOf({x: 5980, z: 11, yaw: 0}, {}, {jobEvents: [{type: 'talkChoice', id: 'take', scene: HOME_OFFER_ID}]}), DT);
  equal(homeOf(out.open), newHome(defaultHomeName('Gratian')), 'his answer gives him the ground under his own name');
  check(out.requests.some(request => request.type === 'marker' && request.place), 'the ground is marked for him');
  check(out.requests.some(request => request.type === 'say' && request.text === HOME_WORDS.given), 'he is told where the panels are');
}

// ---- Placing by hand: three seconds of the build key, at the outline in front of him. ---------------------------
const standAt = (i, j, yaw = Math.PI) => ({...groundPoint(i, j), yaw});
{
  let open = given();
  // He stands 1.6 m south of the line j = 5, facing north: the panel runs east and west across his way.
  const me = {...groundPoint(6.5, 5.8), yaw: Math.PI};
  const expected = slotInFront('panel', me, me.yaw);
  equal(expected, {kind: 'panel', i: 6, j: 5, axis: 'x'}, 'the outline stands across the way he faces, on the 2 m grid');
  // HOME-GROUND-2 (the drive of step 1, item 4): the outline is shown only once he has pressed B.
  let out = run(open, viewOf(me), DT);
  equal(out.open.parts.home.outline, null, 'standing on his ground he sees no outline until he presses B');
  equal(out.open.parts.home.prompt, HOME_WORDS.startBuild, 'the sentence tells him that B builds');
  out = run(out.open, viewOf(me, {build: true}), DT);
  out = run(out.open, viewOf(me), DT);
  equal(out.open.parts.home.outline.mode, 'build', 'after one press of B the outline is ready to build on clear ground');
  check(out.open.parts.home.prompt.includes('Hold B'), 'the sentence tells him to hold B');
  out = run(out.open, viewOf(me, {build: true}), 2);
  equal(homeOf(out.open).pieces, [], 'two seconds of hammering do not raise a panel');
  check(out.open.parts.home.outline.progress > .6 && out.open.parts.home.outline.progress < .7, 'the outline fills as he hammers');
  out = run(out.open, viewOf(me), DT);
  equal(out.open.parts.home.outline.progress, 0, 'letting go of B starts the hammering again');
  out = run(out.open, viewOf(me, {build: true}), 3.05);
  equal(homeOf(out.open).pieces, [expected], 'three seconds of holding B hammer the panel up where the outline stood');
  const heard = cues(out.events);
  check(heard.filter(cue => cue === HOME_CUES.hammer).length >= 5 && heard.includes(HOME_CUES.up), 'each strike and the panel going up have their cues');
  equal(panelsLeft(homeOf(out.open)), HOME_PANELS - 1, 'one panel fewer is carried');
  // Turning a quarter: R turns the outline to run north and south.
  out = run(out.open, viewOf({...groundPoint(9.5, 6.3), yaw: Math.PI}, {turn: true}), DT);
  equal(out.open.parts.home.outline.piece.axis, 'z', 'R turns the piece a quarter');
  out = run(out.open, viewOf({...groundPoint(9.5, 6.3), yaw: Math.PI}, {turn: true}), DT);
  equal(out.open.parts.home.outline.piece.axis, 'z', 'holding R does not keep turning it');

  out = run(out.open, viewOf(me), DT);
  out = run(out.open, viewOf(me, {turn: true}), DT);
  equal(out.open.parts.home.outline.piece.axis, 'x', 'a second press turns it back');
  // Lifting: the panel he faces is offered, and one press of B picks it up, free.
  out = run(out.open, viewOf(me), DT);
  equal(out.open.parts.home.outline.mode, 'lift', 'facing a panel offers to pick it up');
  equal(out.open.parts.home.prompt, 'Press B to pick up this tin panel.', 'the sentence says so');
  out = run(out.open, viewOf(me, {build: true}), DT);
  equal(homeOf(out.open).pieces, [], 'one press of B picks the panel up');
  check(cues(out.events).includes(HOME_CUES.lift), 'picking up has its cue');
  equal(panelsLeft(homeOf(out.open)), HOME_PANELS, 'the panel is back in his hands');
  out = run(out.open, viewOf(me, {build: true}), .5);
  equal(homeOf(out.open).pieces, [], 'the same press does not hammer the panel back up at once');
}

// ---- Refusing, with a plain sentence for each. ------------------------------------------------------------------
{
  const home = newHome('Test');
  equal(refusal(home, {kind: 'panel', i: 20, j: 3, axis: 'x'}), 'offGround', 'a panel off the ground is refused');
  equal(refusal(home, {kind: 'panel', i: -1, j: 3, axis: 'x'}), 'offGround', 'a panel west of the ground is refused');
  equal(refusal(home, {kind: 'gate', i: 6, j: 6, axis: 'x'}), 'gateEdge', 'the gate must hang in the outside fence');
  const one = build(home, {kind: 'panel', i: 4, j: 0, axis: 'x'});
  equal(refusal(one, {kind: 'gate', i: 3, j: 0, axis: 'x'}), 'onTop', 'the gate cannot stand on top of a panel');
  // The gate hangs in the north fence from node 8 to node 12; its lane runs south from there to the far fence.
  const gated = build(home, {kind: 'gate', i: 8, j: 0, axis: 'x'});
  equal(gated.pieces.length, 1, 'the gate hangs in the north fence');
  equal(refusal(gated, {kind: 'panel', i: 9, j: 5, axis: 'x'}), 'lane', 'a panel across the lane is refused');
  equal(refusal(gated, {kind: 'panel', i: 10, j: 12, axis: 'z'}), 'lane', 'a panel standing in the middle of the lane is refused');
  equal(refusal(gated, {kind: 'panel', i: 8, j: 5, axis: 'z'}), null, 'a panel along the lane\'s side is allowed');
  equal(refusal(gated, {kind: 'panel', i: 9, j: HOME_CELLS, axis: 'x'}), null, 'the far fence may close the lane\'s end');
  equal(refusal(gated, {kind: 'panel', i: 2, j: 5, axis: 'x'}), null, 'a panel beside the lane is allowed');
  const blocked = build(home, {kind: 'panel', i: 9, j: 5, axis: 'x'});
  equal(refusal(blocked, {kind: 'gate', i: 8, j: 0, axis: 'x'}), 'gateLane', 'a gate whose lane a panel crosses is refused');
  equal(refusal(gated, {kind: 'gate', i: 0, j: 4, axis: 'z'}), 'noGate', 'he has one gate');
  equal(refusal(gated, {kind: 'panel', i: 9, j: 0, axis: 'x'}), 'onTop', 'nothing stands on the gate');
  for (const reason of ['offGround', 'gateEdge', 'onTop', 'lane', 'gateLane', 'noPanels', 'noGate'])
    check(/^[A-Z].*\.$/.test(HOME_WORDS[reason]) && !HOME_WORDS[reason].includes('—'), 'the refusal "' + reason + '" is a plain sentence');
  let full = newHome('Full');
  for (let n = 0; n < HOME_PANELS; n++) full = build(full, {kind: 'panel', i: n % 20, j: 1 + Math.floor(n / 20) * 2, axis: 'x'});
  equal(refusal(full, {kind: 'panel', i: 0, j: 10, axis: 'x'}), 'noPanels', 'with no panels left another is refused');
  equal(outlineFor(gated, {kind: 'panel', i: 9, j: 0, axis: 'x'}).mode, 'lift', 'a panel aimed at the gate offers to take it down');

  // In play: the red outline says why, and pressing B is answered with its cue and nothing built.
  let open = given();
  open = {...open, world: applyEffects(open.world, {id: 'home-ground/test', effects: [{type: 'home', record: gated}]}).world};
  const me = {...groundPoint(10.5, 5.8), yaw: Math.PI};
  let out = run(open, viewOf(me, {build: true}), DT);
  out = run(out.open, viewOf(me), DT);
  equal(out.open.parts.home.outline.mode, 'refused', 'the outline across the lane turns red');
  equal(out.open.parts.home.prompt, HOME_WORDS.lane, 'and says why in a sentence');
  out = run(out.open, viewOf(me, {build: true}), 3.5);
  equal(homeOf(out.open).pieces.length, 1, 'holding B on a red outline builds nothing');
  check(cues(out.events).includes(HOME_CUES.refused), 'the refusal has its cue');
}

// ---- The gate, the name, the board and the solids. --------------------------------------------------------------
{
  let open = given();
  const me = {...groundPoint(10, .8), yaw: Math.PI};
  let out = run(open, viewOf(me, {piece: true}), DT);
  equal(out.open.parts.home.kind, 'gate', 'G changes the piece to the gate');
  equal(out.open.parts.home.outline.piece, {kind: 'gate', i: 8, j: 0, axis: 'x'}, 'the gate\'s outline stands centred in front of him');
  out = run(out.open, viewOf(me, {build: true}), 4.05);
  equal(homeOf(out.open).pieces, [{kind: 'gate', i: 8, j: 0, axis: 'x'}], 'four seconds of hammering hang the gate');
  check(cues(out.events).includes(HOME_CUES.gate), 'hanging the gate has its cue');
  check(out.open.parts.home.naming && out.open.parts.home.kind === 'panel', 'hanging the gate asks for a name and puts a panel back in his hands');
  out = run(out.open, viewOf(me, {}, {homeName: {name: '  G-Town '}}), DT);
  equal(homeOf(out.open).name, 'G-Town', 'the name he types is on the record');
  check(!out.open.parts.home.naming, 'the name box closes');
  equal([cleanHomeName(''), cleanHomeName('x'.repeat(25)), cleanHomeName('<b>')], [null, null, null], 'an empty, long or odd name is refused');
  // Every player name the game allows (progression.js: up to 24 characters that are not control characters) gives a
  // starting name the record can hold.
  for (const player of ['Gratian', 'Abcdefghijklmnop', 'Kyle_B', 'Dad (Kyle)', 'x'.repeat(24), '   ', '***', 'Zoë 2', 'abcdefghijklmn' + String.fromCodePoint(0x1D400) + 'x',
    String.fromCodePoint(0x1D400).repeat(12), '', null])
    check(readableHome(newHome(defaultHomeName(player))), 'the player name ' + JSON.stringify(player) + ' gives a name the ground can keep');
  equal([defaultHomeName('Kyle_B'), defaultHomeName('***')], ["KyleB's Ground", 'My Ground'], 'odd marks are left out of the starting name');
  // At the board he can rename it.
  const board = boardSpot(homeOf(out.open).pieces[0]);
  out = run(out.open, viewOf({x: board.x, z: board.z, yaw: 0}, {}, {interact: true}), DT);
  check(out.open.parts.home.naming, 'F at the board opens the name box again');
  out = run(out.open, viewOf({x: board.x, z: board.z, yaw: 0}, {}, {homeName: {cancel: true}}), DT);
  check(!out.open.parts.home.naming && homeOf(out.open).name === 'G-Town', 'Escape keeps the name');

  // Solids: a panel is a thin wall; the gate's posts always, its leaves only while it is shut.
  const record = build(homeOf(out.open), {kind: 'panel', i: 3, j: 0, axis: 'x'});
  const shut = homeSolids(record, {gateOpen: false, heightAt: scablandsSurfaceHeightAt});
  const open2 = homeSolids(record, {gateOpen: true, heightAt: scablandsSurfaceHeightAt});
  equal(shut.length - open2.length, 1, 'the open gate takes away only its leaves');
  const panel = shut.find(row => row.id.startsWith('home/panel'));
  const at = pieceInLand({kind: 'panel', i: 3, j: 0, axis: 'x'});
  check(Math.abs(panel.x - at.x) < 1e-9 && panel.halfX === 1 && panel.height >= 1.8, 'the panel\'s solid is where it is drawn, 2 m long');
  const grid = createJobSolidGrid(SOLID_GRID);
  grid.setOpenSolids('home-ground', shut);
  const near = grid.near(at.x - .5, at.z - 2, at.x + .5, at.z + 2, 1).map(row => row.id);
  check(near.includes(panel.id), 'the job\'s collision grid holds the fence for walkers and cars');
  // In play the part stands the solids, and stands them again when the gate opens for him.
  out = run(out.open, viewOf({...groundPoint(10, 6), yaw: 0}), DT);
  const requests = run(out.open, viewOf({...groundPoint(10, 1.5), yaw: 0}), DT).requests.filter(request => request.type === 'solids');
  check(requests.length === 1 && requests[0].id === 'home-ground' && requests[0].solids.length === 2, 'the gate opens as he comes to it');
}

// ---- Marks made from above, built on the ground. ----------------------------------------------------------------
{
  let open = given();
  const me = {...groundPoint(4, 4), yaw: Math.PI};
  let out = run(open, viewOf(me, {view: true}), DT);
  check(out.open.parts.home.above && cues(out.events).includes(HOME_CUES.viewUp), 'V lifts the view straight above the ground');
  const start = out.open.parts.home.cursor;
  out = run(out.open, viewOf(me, {view: true, turnRight: true}), 1);
  check(out.open.parts.home.cursor.a > start.a + 4, 'D moves the outline east from above');
  out = run(out.open, viewOf(me, {build: true}), DT);
  const mark = out.open.parts.home.outline.piece;
  equal(homeOf(out.open).marks, [mark], 'B marks where the piece will go');
  equal(homeOf(out.open).pieces, [], 'nothing is built from above');
  check(cues(out.events).includes(HOME_CUES.mark), 'a mark has its cue');
  out = run(out.open, viewOf(me, {view: true}), DT);
  check(!out.open.parts.home.above && cues(out.events).includes(HOME_CUES.viewDown), 'V again brings the view back down');
  equal(homeOf(out.open).marks, [mark], 'the mark stays on the ground');
  // Down on the ground, the outline in front of him takes the mark, and hammering it builds it and clears the mark.
  const on = pieceInLand(mark);
  const there = {x: on.x, z: on.z + 1.4, yaw: Math.PI};
  out = run(out.open, viewOf(there), DT);
  equal(out.open.parts.home.outline.piece, mark, 'the outline settles on his mark');
  check(out.open.parts.home.outline.marked && out.open.parts.home.prompt.startsWith('Hold B to hammer up the tin panel you marked'), 'and says it is his mark');
  out = run(out.open, viewOf(there, {build: true}), 3.05);
  equal([homeOf(out.open).pieces, homeOf(out.open).marks], [[mark], []], 'building the mark clears it');
  // A mark can be cleared from above.
  let record = toggleMark(newHome('M'), {kind: 'panel', i: 1, j: 1, axis: 'x'});
  record = toggleMark(record, {kind: 'panel', i: 1, j: 1, axis: 'x'});
  equal(record.marks, [], 'B on a mark from above clears it');
  // The camera's pose is a pure reading of the lift.
  const foot = {position: {x: 0, y: 2, z: 0}, target: {x: 0, y: 2, z: 8}, fov: 72};
  equal(homeCameraPose(foot, 0), foot, 'with no lift the camera is the walker\'s own');
  const top = homeCameraPose(foot, 1, 1);
  check(top.position.y > 50 && Math.abs(top.position.x - top.target.x) < 1e-9, 'fully lifted the camera looks straight down');
  check(stepHomeLift(0, true, .35) > .4 && stepHomeLift(.5, false, 1) === 0, 'the lift rises and falls in under a second');
}

// ---- Sprint and the burst. --------------------------------------------------------------------------------------
{
  let open = given();
  const me = {x: 5800, z: 300, yaw: 0};
  let out = run(open, viewOf(me, {forward: true, sprint: true}), .2);
  check(cues(out.events).includes(HOME_CUES.sprint), 'the sprint has its cue');
  check(!out.open.parts.home.burst.shown, 'the burst bar is not shown before it is used');
  out = run(out.open, viewOf(me, {forward: true, burst: true}), 1);
  check(out.open.parts.home.burst.active && out.open.parts.home.burst.shown, 'X while walking forward is the burst, with its bar');
  check(cues(out.events).includes(HOME_CUES.burst), 'the burst has its cue');
  out = run(out.open, viewOf(me, {forward: true, burst: true}), FOOT_BURST.seconds - 1 + .05);
  check(!out.open.parts.home.burst.active && out.open.parts.home.burst.spent, 'the burst empties in three seconds');
  check(cues(out.events).includes(HOME_CUES.spent), 'running out has its cue');
  out = run(out.open, viewOf(me, {forward: true, burst: true}), 2);
  check(!out.open.parts.home.burst.active, 'a spent burst cannot be used until it has refilled');
  out = run(out.open, viewOf(me, {forward: true}), FOOT_BURST.refillSeconds - 2 + .1);
  check(out.open.parts.home.burst.charge === 1 && !out.open.parts.home.burst.spent && !out.open.parts.home.burst.shown,
    'it refills in six seconds and the bar goes');
}

// ---- The save: written, reloaded, and the save made before this card. -------------------------------------------
const fixture = JSON.parse(readFileSync(new URL('./fixtures/saves/26-story-open.json', import.meta.url))).storage;
const memory = values => {
  const map = new Map(Object.entries(values).map(([key, value]) => [key, typeof value === 'string' ? value : JSON.stringify(value)]));
  return {getItem: key => map.get(key) ?? null, setItem: (key, value) => map.set(key, String(value)), removeItem: key => map.delete(key)};
};
{
  const store = memory(fixture), before = store.getItem(PLAYERS_KEY);
  const old = activePlayer(loadPlayers(store)).profile;
  const record = savedOpenRecord(old);
  check(record && !Object.hasOwn(record, 'home'), 'the save made before this card is read and has no ground');
  const world = worldForProfile(old, 0);
  check(!Object.hasOwn(world.open, 'home'), 'reading the older save makes no ground');
  // An outing with the switch off, stepped through the open land, settles the record exactly as it was read.
  const offView = {...viewOf({...groundPoint(5, 5), yaw: 0}, {build: true, view: true, burst: true, forward: true}), homeGround: undefined};
  const offRun = run(beginOpenLand({id: 'roam-off', steps: [{kind: 'roam'}], open: {world}}), offView, 2);
  const settled = settleOpenWorld(old, offRun.open.world, {atStart: world, savedAtStart: {ledger: old.story.ledger, open: record}});
  check(settled.ok, 'the older save settles');
  equal(settled.profile.story.open, record, 'with the switch off the saved open land is unchanged');
  equal(JSON.stringify(settled.profile), JSON.stringify(old), 'with the switch off the whole profile is unchanged');
  equal(store.getItem(PLAYERS_KEY), before, 'reading the older save writes nothing to storage');

  // With the switch on: given the ground, a fence and the gate, then saved, then read back from storage.
  let open = beginOpenLand({id: 'roam-save', steps: [{kind: 'roam'}], open: {world}});
  open = run(open, viewOf({x: 5980, z: 11, yaw: 0}, {}, {interact: true}), DT).open;
  open = run(open, viewOf({x: 5980, z: 11, yaw: 0}, {}, {jobEvents: [{type: 'talkChoice', id: 'take', scene: HOME_OFFER_ID}]}), DT).open;
  open = run(open, viewOf({...groundPoint(2.5, .8), yaw: Math.PI}, {build: true}), 3.05).open;
  open = run(open, viewOf({...groundPoint(10, .8), yaw: Math.PI}, {piece: true}), DT).open;
  open = run(open, viewOf({...groundPoint(10, .8), yaw: Math.PI}, {build: true}), 4.05).open;
  open = run(open, viewOf({...groundPoint(10, .8), yaw: Math.PI}, {}, {homeName: {name: 'G-Town'}}), DT).open;
  const home = open.world.open.home;
  equal(home.pieces, [{kind: 'panel', i: 2, j: 0, axis: 'x'}, {kind: 'gate', i: 8, j: 0, axis: 'x'}], 'the fence and the gate stand where he hammered them');
  const saved = settleOpenWorld(old, open.world, {atStart: world, savedAtStart: {ledger: old.story.ledger, open: record}});
  check(saved.ok && saved.changed, 'the outing with the ground settles');
  const registry = loadPlayers(store);
  check(savePlayers(replacePlayerProfile(registry, registry.activePlayerId, saved.profile), store), 'the profile is written to memory storage');
  const reloaded = activePlayer(loadPlayers(store)).profile;
  equal(savedOpenRecord(reloaded).home, home, 'after a reload his ground is exactly where he left it');
  equal(worldForProfile(reloaded, 0).open.home, home, 'the next outing begins with his ground');
  // Everything else of the record is as it was.
  const {home: _home, ...rest} = savedOpenRecord(reloaded);
  equal({...rest, journal: rest.journal.length}, {...record, journal: record.journal.length}, 'the ground changes nothing else of the open record');
  check(rest.journal.length === record.journal.length, 'the ground writes no journal rows');
  // A record whose ground cannot be read is not read at all, as with every other part of the open record.
  check(savedOpenRecord({story: {version: 1, open: {...record, home: {version: 1, name: '', pieces: [], marks: []}}}}) === null,
    'a ground with no name is not readable');
  check(!readableHome({...home, pieces: [{kind: 'gate', i: 6, j: 6, axis: 'x'}]}), 'a gate inside the ground is not readable');
  check(!readableHome({...home, pieces: [{kind: 'tower', i: 0, j: 0, axis: 'x'}]}), 'a piece of an unknown kind is not readable');
  check(readableHome(lift(home, home.pieces[0])), 'a ground with a piece picked up is readable');
}

// The enabled part transfers on a short F release, exposes weight, and draws the bundle at the truck's pose.
{
  let home = buildBox({...build(newHome('Delivery'), {kind: 'gate', i: 8, j: 0, axis: 'x'}),
    hens: [{name: 'Clover', breed: 'tin-town-brown', due: 120}]}, {i: 2, j: 3});
  const coop = {kind: 'coop', i: 2, j: 8, turn: 0, stage: 0};
  home = markBuild(home, coop);
  const world = newWorld({seed: 5, night: 2});
  let open = openLand({...world, open: {...world.open, home}});
  const drive = viewOf(null, {}, {homeVehicle: 'flatbed', carPosition: HOME_LOAD_STACK, homeCarHeading: .7, speedKmh: 0});
  let result = run(open, {...drive, homeVehicle: null}, DT);
  equal(result.open.parts.home.prompt, HOME_WORDS.needsFlatbed, 'an ordinary car gets the flatbed explanation');
  equal(homeOf(result.open).loads.coop, 'stack', 'an ordinary car cannot load');
  result = run(open, {...drive, speedKmh: 2, interact: true}, DT);
  equal(homeOf(result.open).loads.coop, 'stack', 'a moving flatbed cannot load');
  result = run(open, drive, DT);
  check(result.open.parts.home.prompt.includes('Press F to load the tin for the coop'), 'a stopped flatbed names the load');
  result = run(result.open, {...drive, interact: true}, DT);
  equal(homeOf(result.open).loads.coop, 'stack', 'pressing F alone never moves a load');
  result = run(result.open, drive, DT);
  open = result.open;
  equal(homeOf(open).loads.coop, 'bed', 'one tap loads the coop through the open part');
  equal(open.parts.home.loadKg, HOME_BUILDS.coop.kg, 'the part exposes the carried load weight');
  check(cues(result.events).includes(HOME_CUES.loadOn), 'loading emits its sound cue');
  const at = buildInLand(coop), arrival = {...drive, carPosition: at, homeCarHeading: 1.2};
  result = run(open, {...arrival, interact: true}, DT);
  equal(homeOf(result.open).loads.coop, 'bed', 'holding F does not unload again on arrival');
  open = run(result.open, {...arrival, interact: true}, .4).open;
  open = run(open, arrival, DT).open;
  const view = createHomeGroundView(), job = {open};
  const before = JSON.stringify(open);
  view.update(job, {}, 0);
  const bundle = view.group.getObjectByName('home-load-coop');
  check(bundle.visible, 'the carried bundle is visible');
  equal(bundle.rotation.y, 1.2, 'the bundle turns with the truck');
  check(Math.hypot(bundle.position.x - at.x, bundle.position.z - at.z) < 2, 'the bundle sits behind the cab');
  check(bundle.position.y > scablandsSurfaceHeightAt(at.x, at.z) + 1, 'the bundle rests on the raised deck');
  equal(JSON.stringify(open), before, 'drawing the bed never changes the home or outing state');
  result = run(open, {...arrival, interact: true}, DT);
  result = run(result.open, arrival, DT);
  equal(homeOf(result.open).loads.coop, {i: coop.i, j: coop.j}, 'one fresh tap sets the load beside the mark');
  equal(result.open.parts.home.loadKg, 0, 'unloading clears the exposed weight');
  check(cues(result.events).includes(HOME_CUES.loadOff), 'unloading emits its sound cue');
  view.update({open: result.open}, {}, 0);
  equal(bundle.rotation.y, 0, 'a delivered bundle no longer follows the truck heading');
  view.dispose();
  const duel = new LegacyRoadsideDuel({seed: 1989});
  duel.startCampaign({mode: 'wasteland', car: 'falcone_f42', startStage: 0, discoveredGate: true, seed: 1989});
  Object.assign(duel.state, {status: 'racing', countdown: 0, speedMph: 0});
  duel.state.input.interact = true;
  let leaving = result.open;
  for (let n = 0; n < 24; n++) {
    stepFootTransition(duel, DT);
    const person = duel.state.onFoot ? {...arrival.carPosition, yaw: 0} : null;
    leaving = run(leaving, viewOf(person, {}, {...arrival, onFoot: duel.state.onFoot,
      fighter: person && {position: person, yaw: 0}, interact: true}), DT).open;
    equal(homeOf(leaving).loads.coop, {i: coop.i, j: coop.j}, 'holding F never lifts the delivered tin');
  }
  check(duel.state.onFoot, 'the existing 0.4 second hold still gets him out');
  leaving = run(leaving, viewOf({...arrival.carPosition, yaw: 0}), DT).open;
  equal(homeOf(leaving).loads.coop, {i: coop.i, j: coop.j}, 'release after leaving keeps the tin on the ground');
  const untouched = run(openLand({...world, open: {...world.open, home}}), {...drive, homeGround: false, interact: true}, DT);
  equal(homeOf(untouched.open), home, 'with the switch off, delivery changes no home fields');
}

// Step 3: one load, one mark, four hand-raised stages. No race or arena vehicle is added.
{
  let home = build(newHome('Buildings'), {kind: 'gate', i: 8, j: 0, axis: 'x'});
  const coop = {kind: 'coop', i: 2, j: 8, turn: 0, stage: 0};
  equal(buildRefusal(home, {...coop, i: 9}), 'lane', 'a building cannot close the eight-metre lane');
  equal(buildRefusal(home, {...coop, i: 19}), 'offGround', 'the whole building must fit on his ground');
  home = markBuild(home, coop);
  equal(buildRefusal(home, {...coop, kind: 'shed'}), 'onTop', 'buildings cannot overlap');
  equal(raiseBuild(home, 'coop'), home, 'a mark cannot be raised before its load arrives');
  equal(liftBuild(home, 'coop').builds, [], 'a mark can be picked up before the first stage');
  const drive = {vehicle: 'flatbed', position: HOME_LOAD_STACK, speedKmh: 0};
  equal(transferHomeLoad(home, {...drive, vehicle: 'rattler'}), home, 'only the flatbed carries the building loads');
  equal(transferHomeLoad(home, {...drive, speedKmh: 2}), home, 'the flatbed must stop to load');
  home = transferHomeLoad(home, drive);
  equal(home.loads, {coop: 'bed', shed: 'stack', tower: 'stack', tank: 'stack', greenhouse: 'stack'}, 'one press loads the coop and leaves the other stacks');
  equal(homeLoadKg(home), HOME_BUILDS.coop.kg, 'the bed exposes its loadKg for the existing haul weight bridge');
  equal(transferHomeLoad(home, drive), home, 'a full bed cannot take the second load');
  home = transferHomeLoad(home, {...drive, position: buildInLand(coop)});
  equal(home.loads.coop, {i: 2, j: 8}, 'one press sets the load beside the marked footprint');
  equal(homeLoadKg(home), 0, 'unloading removes all cargo weight');
  const view = createHomeGroundView();
  for (let n = 1; n <= 4; n++) {
    home = raiseBuild(home, 'coop');
    equal(home.builds[0].stage, n, 'one completed hammering raises exactly one stage');
    const saved = JSON.parse(JSON.stringify(home));
    check(readableHome(saved), 'each half-raised stage is a readable save');
    equal(liftBuild(home, 'coop').builds, home.builds, 'a raised building cannot be lifted as a mark');
    const before = JSON.stringify(home);
    view.update({open: {parts: {home: {on: true}}, world: {open: {home}}}}, {}, 0);
    equal(view.group.getObjectByName('home-coop').children.filter(child => child.name.includes('-stage-') && child.visible).length, n,
      'the drawing shows exactly the raised stages');
    equal(JSON.stringify(home), before, 'the drawing changes no rule state');
  }
  view.dispose();
  equal(raiseBuild(home, 'coop'), home, 'the finished roof cannot be built twice');
  equal(transferHomeLoad(home, {...drive, position: groundPoint(2, 8)}), home, 'materials already built into a coop cannot be collected again');
  home = markBuild(home, {kind: 'shed', i: 13, j: 8, turn: 1, stage: 0});
  home = transferHomeLoad(home, drive);
  equal(home.loads.shed, 'bed', 'the second trip loads the shed');
  home = transferHomeLoad(home, {...drive, position: buildInLand(home.builds[1])});
  for (let n = 0; n < 4; n++) home = raiseBuild(home, 'shed');
  check(readableHome(home), 'the coop, shed, nests and both delivered loads form a readable record');
  check(!Object.hasOwn(CARS, 'flatbed') && !ARENA_FIELD.includes('flatbed'),
    'the flatbed is absent from the race cars and arena field');
  home = {...home, eggs: 31, hens: [{name: 'Clover', breed: 'tin-town-brown', due: 120}]};
  check(boardLines({}, home).includes(shedWords(home)) && shedWords(home).startsWith('Your shed holds 31 eggs and 0 scrap.'), 'the board names both stores once the shed stands');
  const world = newWorld({seed: 5, night: 2}), door = buildingDoor(home.builds[1]);
  const out = run(openLand({...world, open: {...world.open, home}}), viewOf({...door, yaw: Math.PI}, {}, {interact: true}), DT);
  check(out.requests.some(row => row.text === shedWords(home) + ' ' + tinWords(home)), 'one press at the shed door reads both stores');
  check(cues(out.events).includes(HOME_CUES.shedDoor), 'the shed door has its sound cue');
}

// Real part inputs mark a footprint, hold the hammer for four stages and read the shed.
{
  let home = buildBox(giveHens(newHome('Hand built')), {kind: 'box', i: 3, j: 3});
  const world = newWorld({seed: 5, night: 2});
  let open = openLand({...world, open: {...world.open, home}});
  const me = {...groundPoint(2.5, 7), yaw: 0};
  for (let n = 0; n < 3; n++) {
    open = run(open, viewOf(me, {piece: true}), DT).open;
    open = run(open, viewOf(me), DT).open;
  }
  equal(open.parts.home.kind, 'coop', 'G cycles from panel through gate and crate to coop');
  open = run(open, viewOf(me, {build: true}), DT).open;
  equal(homeOf(open).builds[0].stage, 0, 'B marks the footprint without raising the floor');
  open = run(open, viewOf(me), DT).open;
  // Delivery is provided by the tested load rule while the vehicle bridge waits for Claude's scope decision.
  home = transferHomeLoad(homeOf(open), {vehicle: 'flatbed', position: HOME_LOAD_STACK, speedKmh: 0});
  home = transferHomeLoad(home, {vehicle: 'flatbed', position: buildInLand(home.builds[0]), speedKmh: 0});
  open = {...open, world: {...open.world, open: {...open.world.open, home}}};
  const out = run(open, viewOf({...me, x: me.x + .2}, {build: true}), 24.2);
  equal(homeOf(out.open).builds[0].stage, 4, 'holding B raises all four six-second stages');
  equal(cues(out.events).filter(name => name === HOME_CUES.coopStage).length, 4, 'each coop stage has its cue');
  check(readableHome(homeOf(out.open)), 'the part writes a valid version 4 record');
  const talk = out.requests.find(request => request.id === 'home-ground/builders');
  check(talk?.anchorPosition && talk.scene.lines[0].speaker === 'wren', 'the first hand-built coop opens Wren teaching');
  check(Math.hypot(talk.position.x - me.x - .2, talk.position.z - me.z) < 2.5,
    'the teaching anchor is within talk range, so the job cannot close it as a distant talk');
  const wren = out.open.parts.home.crewPeople.find(person => person.id === 'wren');
  equal({x: wren.x, z: wren.z}, {x: talk.position.x, z: talk.position.z}, 'Wren stands at her teaching anchor');
  const toPlayer = Math.atan2(me.x + .2 - wren.x, me.z - wren.z);
  check(Math.abs(Math.sin(wren.yaw - toPlayer)) < 1e-8 && Math.cos(wren.yaw - toPlayer) > .99, 'Wren faces him while teaching');
}

// The same marked front remains reachable across its width, at each turn and after every stage.
{
  for (const kind of ['coop', 'shed']) for (let turn = 0; turn < 4; turn++) {
    const row = {kind, i: 7, j: 7, turn, stage: 0};
    const centre = buildInLand(row), heading = turn * Math.PI / 2;
    for (const side of [-1.7, 0, 1.7]) {
      const front = HOME_BUILDS[kind].depth + 2;
      const me = {x: centre.x + Math.sin(heading) * front + Math.cos(heading) * side,
        z: centre.z + Math.cos(heading) * front - Math.sin(heading) * side, yaw: heading + Math.PI};
      let home = markBuild(newHome('Reach'), row);
      home = {...home, loads: {...home.loads, [kind]: {i: row.i, j: row.j}}};
      for (let stage = 0; stage < 4; stage++) {
        const world = newWorld({seed: 5, night: 2});
        const out = run(openLand({...world, open: {...world.open, home}}), viewOf(me, {build: true}), 6.05);
        equal(homeOf(out.open).builds[0].stage, stage + 1, 'anywhere along the faced front raises the next stage');
        home = homeOf(out.open);
      }
    }
    const me = {...groundPoint(10, 10), yaw: heading};
    const slot = buildSlot(kind, me, me.yaw, turn), b = buildBounds(slot);
    const lo = groundPoint(b.i0, b.j0), hi = groundPoint(b.i1, b.j1);
    const gap = Math.hypot(Math.max(lo.x - me.x, 0, me.x - hi.x), Math.max(lo.z - me.z, 0, me.z - hi.z));
    check(gap >= 1 && gap <= 3, 'the snapped new footprint starts about two metres beyond his feet');
  }
}
// Carried counts use the singular only when one remains.
{
  let home = {...newHome('Counts'), hens: [{name: 'Clover', breed: 'tin-town-brown', due: 120}],
    boxes: [{i: 1, j: 1, eggs: 0}]};
  const world = newWorld({seed: 5, night: 2}), me = {...groundPoint(5, 5), yaw: 0};
  let open = openLand({...world, open: {...world.open, home}});
  for (let n = 0; n < 2; n++) {
    open = run(open, viewOf(me, {piece: true}), DT).open;
    open = run(open, viewOf(me), DT).open;
  }
  check(open.parts.home.prompt.includes('You have 1 old crate left.'), 'one remaining crate has a singular noun');
  home = {...newHome('Panels'), pieces: Array.from({length: 79}, (_, n) => ({kind: 'panel', i: n % 20,
    j: Math.floor(n / 20), axis: 'x'}))};
  open = run(openLand({...world, open: {...world.open, home}}), viewOf(me, {build: true}), DT).open;
  open = run(open, viewOf(me), DT).open;
  check(open.parts.home.prompt.includes('You have 1 tin panel left.'), 'one remaining panel has a singular noun');
  home = {...newHome('One egg'), boxes: [{i: 5, j: 5, eggs: 1}]};
  const boxAt = boxInLand(home.boxes[0]);
  const out = run(openLand({...world, open: {...world.open, home}}),
    viewOf({x: boxAt.x, z: boxAt.z + 2, yaw: Math.PI}, {}, {interact: true}), DT);
  check(out.requests.some(request => request.text === 'You gathered one egg. You have 1 egg in your store.'),
    'gathering one egg also uses the singular store count');
}

// Four quarter turns still alternate a panel's two axes in the overhead view.
{
  let open = given(), me = {...groundPoint(5, 5), yaw: 0};
  open = run(open, viewOf(me, {view: true}), DT).open;
  const axes = [];
  for (let n = 0; n < 4; n++) {
    open = run(open, viewOf(me, {turn: true}), DT).open;
    axes.push(open.parts.home.outline.piece.axis);
    open = run(open, viewOf(me), DT).open;
  }
  equal(axes, ['z', 'x', 'z', 'x'], 'R alternates panel axes after building turns expand to four');
}

// Step 3B: the second building, two clocks, helping, one job and older records.
{
  let home = newHome('Crew', 1000);
  const first = {kind: 'coop', i: 2, j: 8, turn: 0, stage: 0};
  home = markBuild(home, first);
  home = {...home, loads: {...home.loads, coop: {i: 2, j: 8}}};
  equal(crewOffer(home), null, 'the first coop must be raised by hand');
  equal(handToCrew(home, first, 1000), home, 'the crew refuses an untaught kind');
  for (let n = 0; n < 4; n++) home = raiseBuild(home, first);
  const legacy = {...home, version: 3, loads: {...home.loads}};
  delete legacy.crew; delete legacy.raids; delete legacy.loads.tower; delete legacy.loads.tank; delete legacy.loads.greenhouse;
  const original = JSON.stringify(legacy);
  check(readableHome(legacy), 'a completed version 3 coop remains readable');
  const upgraded = upgradeHome(legacy), {crew: _crew, raids: _raids, ...oldFields} = upgraded;
  const {tower: _tower, tank: _tank, greenhouse: _greenhouse, ...oldLoads} = oldFields.loads;
  equal({...oldFields, loads: oldLoads, version: 3}, legacy, 'version 3 loses no field, nest or stored egg when upgraded');
  equal(JSON.stringify(legacy), original, 'upgrading leaves the old record unchanged');
  const second = {...first, i: 5};
  home = markBuild(home, second);
  equal(crewOffer(home), null, 'a mark without its load cannot be handed over');
  home = transferHomeLoad(home, {vehicle: 'flatbed', position: HOME_LOAD_STACK, speedKmh: 0});
  home = transferHomeLoad(home, {vehicle: 'flatbed', position: buildInLand(second), speedKmh: 0});
  equal(crewOffer(home), second, 'after teaching and delivery the second coop is offered');
  const ready = home;
  home = handToCrew(home, second, 1000);
  check(readableHome(home), 'the assigned job is a readable version 4 record');
  equal(transferHomeLoad(home, {vehicle: 'flatbed', position: groundPoint(second.i, second.j), speedKmh: 0}), home,
    'a stage-zero crew job keeps the delivered load it needs');
  const carried = transferHomeLoad(ready, {vehicle: 'flatbed', position: groundPoint(second.i, second.j), speedKmh: 0});
  const remarked = markBuild(liftBuild(carried, second), {...second, j: 13});
  equal(remarked.loads.coop, 'bed', 'moving an unassigned mark keeps the carried tin');
  equal(handToCrew(home, second, 1001), home, 'the crew accepts only one job at a time');
  equal(advanceCrew(home, -60).home, home, 'a clock set back loses no work');
  const quarter = advanceCrew(home, 450).home;
  equal(quarter.builds[1].stage, 1, 'one quarter hour of work raises one coop stage');
  const helped = raiseBuild(advanceCrew(home, 200).home, second);
  equal(helped.builds[1].stage, 1, 'his hammer finishes a stage at once');
  equal(advanceCrew(helped, 1150).home.builds[1].stage, 4, 'his stage saves a full stage of waiting');
  equal(advanceCrew(home, 1799).home.builds[1].stage, 3, 'the crew does not finish early');
  const complete = advanceCrew(home, 1800);
  equal(complete.home.builds.map(row => row.stage), [4, 4], 'thirty minutes finishes the next coop and keeps the first');
  equal(complete.home.boxes.length, 6, 'both coops keep their three nests');
  check(readableHome(complete.home), 'two complete coops remain readable');
  const view = createHomeGroundView();
  const before = JSON.stringify(complete.home);
  view.update({open: {parts: {home: {on: true}}, world: {open: {home: complete.home}}}}, {}, 0);
  equal(view.group.children.filter(node => node.name === 'home-coop' && node.visible).length, 2, 'both coops are drawn');
  equal(JSON.stringify(complete.home), before, 'drawing the next coop changes no record'); view.dispose();
  const full = {...home, hens: [{name: 'Clover', breed: 'tin-town-brown', due: 0}],
    boxes: home.boxes.map(box => ({...box, eggs: 18}))};
  const afterAway = ripenHome(full, 1800 + 14400);
  check(afterAway.laid.length > 0 && afterAway.home.boxes.slice(3).some(box => box.eggs > 0),
    'hens use the new nests for the time remaining after the crew finishes while away');
  const world = newWorld({seed: 5, night: 2});
  const land = record => openLand({...world, open: {...world.open, home: record}});
  const me = {...groundPoint(16, 14), yaw: 0};
  const returned = run(land(home), viewOf(me, {}, {homeClock: 2800}), DT);
  equal(homeOf(returned.open).builds[1].stage, 4, 'a coop finishes across a closed game');
  check(boardLines(returned.open.parts.home.opened, homeOf(returned.open)).includes('Rook and Wren finished your second coop.'), 'the board reports the completed second coop');
  const reloaded = run(land(JSON.parse(JSON.stringify(homeOf(returned.open)))), viewOf(me, {}, {homeClock: 2800}), DT);
  equal(homeOf(reloaded.open).boxes, homeOf(returned.open).boxes, 'a second load cannot add duplicate nests');
  // A real gate is needed for the board handoff.
  let withGate = build(ready, {kind: 'gate', i: 8, j: 0, axis: 'x'});
  for (let cell = 0; cell < HOME_CELLS; cell++) for (const piece of [
    {kind: 'panel', i: cell, j: 0, axis: 'x'}, {kind: 'panel', i: cell, j: HOME_CELLS, axis: 'x'},
    {kind: 'panel', i: 0, j: cell, axis: 'z'}, {kind: 'panel', i: HOME_CELLS, j: cell, axis: 'z'},
  ]) withGate = build(withGate, piece);
  check(withGate.pieces.length === 77, 'the builders walk into a fully fenced ground');
  withGate = giveHens(withGate);
  const board = newsBoardSpot(withGate.pieces.find(row => row.kind === 'gate'));
  const at = {...board, x: board.x - 5, yaw: 0};
  let out = run(land(withGate), viewOf(at, {}, {homeClock: 1000}), DT);
  equal(out.open.parts.home.prompt, 'Press F to hand the coop to the builders.', 'the board offers the job within six metres');
  out = run(out.open, viewOf(at, {}, {homeClock: 1000, interact: true}), DT);
  check(homeOf(out.open).crew.job && cues(out.events).includes(HOME_CUES.crewArrive), 'F hands the job over and names the arrival cue');
  check(out.open.parts.home.crewPeople.length === 2, 'Rook and Wren walk from town in the rule state');
  const saved = JSON.parse(JSON.stringify(homeOf(out.open)));
  const away = {...groundPoint(18, 18), yaw: 0};
  let crossed = new Set(), openedForCrew = false;
  const previous = new Map(out.open.parts.home.crewPeople.map(person => [person.id, person]));
  const gateAt = pieceInLand(withGate.pieces.find(row => row.kind === 'gate'));
  for (let n = 0; n < 60 * 60; n++) {
    out = run(out.open, viewOf(away, {}, {homeClock: 1000}), DT);
    const state = out.open.parts.home;
    openedForCrew ||= state.gateOpen;
    for (const person of state.crewPeople) {
      const before = previous.get(person.id);
      if (before.z < gateAt.z && person.z >= gateAt.z) {
        check(Math.abs(person.x - gateAt.x) < .01 && state.gateOpen, 'each builder crosses the middle of the open gate');
        crossed.add(person.id);
      }
      previous.set(person.id, person);
    }
  }
  check(openedForCrew && crossed.size === 2, 'both builders open and walk through the gate while the player is away');
  check(out.open.parts.home.crewPeople.every(person => person.working), 'both reach the site and start working within a minute');
  check(out.open.parts.home.crewPeople.every(person => Math.hypot(person.x - buildingDoor(second).x,
    person.z - buildingDoor(second).z) < 1), 'both work beside the assigned building');
  out = run(out.open, viewOf(at, {}, {homeClock: 1000}), 540);
  const active = homeOf(out.open);
  const offline = run(land(saved), viewOf(at, {}, {homeClock: saved.lastSeen + 600 - DT}), DT);
  check(Math.abs(active.crew.done - homeOf(offline.open).crew.done) < 1e-6, 'outing seconds and closed-game seconds count the same work');
  const delayed = {...land(newHome('Late ground')), seconds: 600};
  const late = run(delayed, viewOf(me, {}, {homeClock: 1000}), DT);
  equal(homeOf(late.open).lastSeen, 1600 + DT, 'ground acquired later uses the current outing moment');
  const delayedJob = {...land(ready), seconds: 600};
  let lateJob = run(delayedJob, viewOf(me, {}, {homeClock: 1000}), DT);
  const assignedLate = handToCrew(homeOf(lateJob.open), second, homeOf(lateJob.open).lastSeen);
  lateJob = {...lateJob.open, world: {...lateJob.open.world, open: {...lateJob.open.world.open, home: assignedLate}}};
  const immediate = run(land(assignedLate), viewOf(me, {}, {homeClock: assignedLate.lastSeen - DT}), DT);
  equal(homeOf(immediate.open).crew.done, 0, 'reopening immediately cannot credit play before a delayed handoff');
  const oldOff = run(land(legacy), {...viewOf(me), homeGround: false}, 30);
  equal(JSON.stringify(homeOf(oldOff.open)), original, 'the switch off preserves version 3 byte for byte');
  let shed = markBuild(complete.home, {kind: 'shed', i: 13, j: 8, turn: 0, stage: 0});
  shed = {...shed, loads: {...shed.loads, shed: {i: 13, j: 8}}};
  for (let n = 0; n < 4; n++) shed = raiseBuild(shed, 'shed');
  const nextShed = {kind: 'shed', i: 16, j: 8, turn: 0, stage: 0};
  shed = markBuild(shed, nextShed); shed = {...shed, loads: {...shed.loads, shed: {i: 16, j: 8}}};
  shed = handToCrew(shed, nextShed, 1000);
  equal(advanceCrew(shed, 3599).home.builds.at(-1).stage, 3, 'a shed needs the full hour');
  check(advanceCrew(shed, 3600).finished?.kind === 'shed', 'a shed finishes in one real hour');
  for (const crew of [null, {}, {job: {kind: 'coop', i: 19, j: 19}, began: 1000, done: 0}, {...home.crew, done: NaN}])
    check(!readableHome({...home, crew}), 'a damaged crew cannot hide inside a valid home record');
}
// The small box lies above the prompt in the standing camera, and can be gathered without moving.
{
  const me = {...groundPoint(4.5, 6.3), yaw: Math.PI};
  const box = boxSlotInFront(me, me.yaw), at = boxInLand(box);
  const pose = homeBuildCameraPose({position: {x: me.x, y: 1.62, z: me.z}, target: {x: me.x, y: 1.62, z: me.z - 8}, fov: 72});
  const camera = new PerspectiveCamera(pose.fov, 16 / 9, .1, 100);
  camera.position.set(pose.position.x, pose.position.y, pose.position.z); camera.lookAt(pose.target.x, pose.target.y, pose.target.z); camera.updateMatrixWorld();
  const projected = new Vector3(at.x, .34, at.z).project(camera);
  check(Math.abs(projected.x) < 1 && projected.y > -.45 && projected.y < 1, 'the box top is inside the standing camera above the prompt');
  const home = {...newHome('Box'), boxes: [{i: box.i, j: box.j, eggs: 1}]};
  check(facedThing(home, me, me.yaw)?.kind === 'box', 'F and B still reach the box at its new distance');
}

// HOME-GROUND-4: play-only demands, a harmless lesson, bounded losses and the tower.
{
  const seed = 37, me = {...groundPoint(10, 10), yaw: 0};
  let home = newHome('Raid ground');
  home = markBuild(home, {kind: 'coop', i: 3, j: 5, turn: 0, stage: 0});
  home = {...home, loads: {...home.loads, coop: {i: 3, j: 5}}, eggs: 47};
  for (let n = 0; n < 4; n++) home = raiseBuild(home, 'coop');
  const legacy = {...home, version: 4, loads: {coop: home.loads.coop, shed: home.loads.shed},
    crew: {job: null, began: null, done: 0}};
  delete legacy.raids;
  const bytes = JSON.stringify(legacy), migrated = upgradeHome(legacy);
  check(readableHome(legacy) && readableHome(migrated), 'both version 4 and version 5 are readable');
  for (const key of ['pieces', 'hens', 'eggs', 'builds', 'boxes', 'crew', 'flatbed', 'lastSeen'])
    equal(migrated[key], legacy[key], 'version 5 keeps old ' + key);
  equal(JSON.stringify(legacy), bytes, 'migration never mutates the original');
  const world = newWorld({seed, night: 2});
  const land = record => openLand({...world, open: {...world.open, home: record}});
  const off = stepOpenLand(land(legacy), {...viewOf(me), homeGround: false}, 100, parts);
  equal(JSON.stringify(homeOf(off.open)), bytes, 'the off switch preserves version 4 bytes');
  let out = stepOpenLand(land(home), viewOf(me, {}, {homeClock: 1000, partOfDay: 'day'}), 10, parts);
  equal(homeOf(out.open).raids.played, 10, 'play seconds are counted');
  equal(homeOf(out.open).raids.sittings, 1, 'one outing opens one sitting');
  const deadline = homeOf(out.open).raids.nextDue;
  check(deadline >= HOME_RAID.earliest && deadline <= HOME_RAID.latest, 'the first deadline is 75 to 105 play minutes');
  out = stepOpenLand(land(homeOf(out.open)), viewOf(me, {}, {homeClock: 1000 + 3 * 86400, partOfDay: 'day'}), 0, parts);
  equal(homeOf(out.open).raids.played, 10, 'three days away add no raid time');
  equal(homeOf(out.open).raids.nextDue, deadline, 'time away does not move a deadline');
  equal(homeOf(out.open).raids.sittings, 2, 'reopening counts one new sitting');
  let eligible = {...home, raids: {...home.raids, testDone: true, nextDue: 0}};
  for (let n = 1; n <= 4; n++) {
    eligible = openHomeSitting(eligible, seed);
    equal(homeRaidDue(eligible), n < 4 ? null : 'real', 'real raid eligibility in sitting ' + n);
  }
  const far = {...me, x: me.x + 300};
  out = stepOpenLand(land(eligible), viewOf(far, {}, {partOfDay: 'day'}), 1, parts);
  out = stepOpenLand(out.open, viewOf(far, {}, {partOfDay: 'dusk'}), 1, parts);
  check(!out.open.parts.home.raid, 'an overdue raid waits while away at dusk');
  out = stepOpenLand(out.open, viewOf(me, {}, {partOfDay: 'dusk'}), 1, parts);
  check(!out.open.parts.home.raid, 'returning after dusk waits for the next dusk');
  out = stepOpenLand(out.open, viewOf(me, {}, {partOfDay: 'day'}), 1, parts);
  out = stepOpenLand(out.open, viewOf(me, {}, {partOfDay: 'dusk'}), 1, parts);
  check(out.open.parts.home.raid?.riders.length === 3, 'two bikes and a buggy arrive at the next home dusk');
  check(cues(out.events).includes(HOME_CUES.raidCall), 'the dusk call names its cue');
  const saved = JSON.parse(JSON.stringify(homeOf(out.open)));
  equal(Object.keys(saved.raids).sort(), ['played', 'sittings', 'nextDue', 'testDone', 'won', 'lost'].sort(), 'no active raid enters the record');
  check(!stepOpenLand(land(saved), viewOf(me, {}, {partOfDay: 'dusk'}), 0, parts).open.parts.home.raid, 'reopening never resumes an active raid');
  const view = {...viewOf(me), difficulty: 'easy'};
  const test = startHomeRaid(home, seed, true, 'easy');
  const lesson = stepHomeRaid(home, test, view, 60, seed);
  equal(lesson.raid.outcome, 'won', 'waiting one minute wins the test raid');
  equal(lesson.home.eggs, home.eggs, 'the test raid loses no eggs');
  check(lesson.home.raids.testDone && lesson.home.raids.won === 0 && lesson.home.raids.lost === 0, 'the test only marks its lesson complete');
  const chased = stepHomeRaid(home, test, {...view, fighter: {position: test.riders[0].position}}, 1, seed);
  check(chased.raid.riders[0].retreat, 'chasing the test bike sends it away');
  check(stepHomeRaid(home, test, {...view, onFoot: false, carPosition: test.riders[0].position}, 0, seed)
    .raid.riders[0].retreat, 'chasing in the truck also sends the test bike away');
  const shot = stepHomeRaid(home, test, {...view, actors: [{id: test.riders[0].id, health: 1}]}, 1, seed);
  check(shot.raid.riders[0].retreat, 'hitting the test bike sends it away');
  const raid = startHomeRaid(eligible, seed, false, 'easy');
  equal(raid, startHomeRaid(eligible, seed, false, 'easy'), 'the same seed and home choose the same raid');
  const grazed = stepHomeRaid(eligible, raid, {...view, actors: [{id: raid.riders[0].id, health: raid.riders[0].health - 1}]}, 0, seed);
  check(!grazed.raid.riders[0].retreat, 'a real raider does not flee after a harmless graze');
  const hurt = stepHomeRaid(eligible, raid, {...view, actors: [{id: raid.riders[0].id, health: 1}]}, 0, seed);
  check(hurt.raid.riders[0].retreat, 'a real raider below its difficulty health threshold retreats');
  let breached = newHome('Breach');
  for (let n = 0; n < 20; n++) for (const piece of [
    {i: n, j: 0, axis: 'x'}, {i: n, j: 20, axis: 'x'}, {i: 0, j: n, axis: 'z'}, {i: 20, j: n, axis: 'z'},
  ]) breached = build(breached, {kind: 'panel', ...piece});
  breached = {...breached, pieces: breached.pieces.map(piece => piece.axis === 'x' && piece.j === 0 && piece.i === 5
    ? {...piece, down: true} : piece)};
  const retreating = {...raid, entry: groundPoint(5.5, 0), normal: {x: 0, z: -1},
    riders: raid.riders.map((row, index) => ({...row, position: groundPoint(14, 14), entered: true,
      retreat: true, health: index === 0 ? row.health : 0}))};
  check(stepHomeRaid(breached, retreating, view, 240, seed).raid.riders[0].fled,
    'a retreating bike leaves through the breach instead of running into intact fence');
  const nearFence = {...retreating, riders: retreating.riders.map(row => ({...row, position: groundPoint(18, 3)}))};
  check(stepHomeRaid(breached, nearFence, view, 240, seed).raid.riders[0].fled,
    'a near-side retreat continues beyond the exit waypoint arrival tolerance');
  const inside = {...raid, seconds: 239, riders: raid.riders.map(row => ({...row, position: me, entered: true}))};
  const loss = stepHomeRaid(eligible, inside, view, 1, seed);
  equal(loss.raid.outcome, 'lost', 'a live raider inside at four minutes loses the raid');
  equal(loss.home.eggs, 43, 'a loss takes four of 47 eggs, at most a tenth');
  equal(loss.home.hens, eligible.hens, 'a loss keeps every hen');
  equal(loss.home.builds, eligible.builds, 'a loss keeps every building');
  const left = stepHomeRaid(eligible, inside, {...view, leaving: true}, 1, seed);
  equal([left.raid.outcome, left.home.eggs, left.home.raids.won, left.home.raids.lost], ['left', 47, 0, 0], 'leaving beats timeout with nothing lost or won');
  const dead = {...raid, riders: raid.riders.map(row => ({...row, health: 0}))};
  equal(stepHomeRaid(eligible, dead, view, DT, seed).raid.outcome, 'won', 'wrecking every raider wins');
  equal(stepHomeRaid(eligible, raid, view, 8, seed), stepHomeRaid(eligible, raid, view, 8, seed), 'the same inputs repeat movement and fence results');
  const panel = {kind: 'panel', i: 5, j: 0, axis: 'x'}, fenced = build(home, panel);
  const from = groundPoint(5.5, -3), to = groundPoint(5.5, 3);
  for (const [speed, kind] of [[25, 'buggy'], [40, 'bike']])
    equal(ramHomePanels(fenced, from, to, speed, kind).fallen.length, 0, 'only a buggy above 25 km/h flattens tin');
  const rammed = ramHomePanels(fenced, from, to, 26, 'buggy');
  equal(rammed.fallen.length, 1, 'a fast buggy flattens the contacted panel');
  check(!homeSolids(rammed.home, {heightAt: () => 0}).some(row => row.id === 'home/panel/x/5/0'), 'fallen tin is no longer solid');
  const down = rammed.home.pieces.find(row => row.down);
  const repaired = standPanel(rammed.home, down);
  check(homeSolids(repaired, {heightAt: () => 0}).some(row => row.id === 'home/panel/x/5/0'), 'repair restores the solid');
  const hammerAt = {...groundPoint(5.5, -.6), yaw: 0};
  const tapped = run(land(rammed.home), viewOf(hammerAt, {build: true}), DT);
  check(!homeOf(tapped.open).pieces[0].down && cues(tapped.events).includes(HOME_CUES.fenceUp), 'one B press repairs a fallen panel');
  let towerHome = markBuild(home, {kind: 'tower', i: 13, j: 7, turn: 0, stage: 0});
  towerHome = {...towerHome, loads: {...towerHome.loads, tower: {i: 13, j: 7}}};
  for (let n = 0; n < 4; n++) towerHome = raiseBuild(towerHome, 'tower');
  const row = towerHome.builds.find(row => row.kind === 'tower'), door = buildingDoor(row);
  equal(towerAtLadder(towerHome, door), row, 'F finds the finished tower ladder');
  let tower = stepHomeTower(null, row, true, DT);
  tower = stepHomeTower(tower, row, false, 2);
  equal(tower.progress, 1, 'two seconds reaches the platform');
  const pose = homeTowerPose(tower);
  check(Math.abs(pose.y - scablandsSurfaceHeightAt(pose.x, pose.z) + 1.62 - 6) < .1, 'the eye stands about six metres above the ground');
  const duel = {state: {arena: {worldJob: {open: {parts: {home: {tower}}}}}}};
  equal(homeRocketReach(duel), 1.25, 'the tower extends rocket reach by a quarter');
  equal(selectFootGear(duel, 2), false, 'the hammer cannot replace the launcher on the tower');
  tower = stepHomeTower(tower, row, true, 1);
  check(tower.progress > 0 && tower.progress < 1, 'F starts the climb down');
  equal(stepHomeTower(tower, row, false, 1), null, 'two seconds returns to the ground');
  const second = {kind: 'tower', i: 16, j: 7, turn: 0, stage: 0};
  towerHome = markBuild(towerHome, second);
  towerHome = {...towerHome, loads: {...towerHome.loads, tower: {i: 16, j: 7}}};
  equal(crewOffer(towerHome), second, 'builders can raise the second tower after the first');
  check(readableHome(towerHome), 'a tower and raid record round-trip as version 5');
  const game = new LegacyRoadsideDuel({seed});
  game.startCampaign({mode: 'wasteland', car: 'falcone_f42', startStage: 0, discoveredGate: true, seed});
  Object.assign(game.state, {status: 'racing', countdown: 0, speedMph: 0});
  game.state.input.interact = true;
  for (let n = 0; n < 25; n++) stepFootTransition(game, DT);
  game.state.input.interact = false;
  const top = {row, progress: 1, direction: 0};
  const live = {on: true, raid, tower: top};
  const job = {actors: [], job: {steps: [{kind: 'roam'}], stepIndex: 0},
    open: {world: {seed}, parts: {home: live}}};
  game.state.arena = {worldJob: job, participants: [{id: 'player'}]};
  syncHomeGround(game, job);
  equal(job.actors.length, 3, 'raid actors enter the existing combat hit pipeline');
  check(job.actors.every(actor => actor.homeRaid && actor.ambushKey), 'home combat bodies cannot revive as roadside raiders');
  equal(game.state.fighter.y, homeTowerPose(top).y, 'the adapter puts the real fighter on the platform');
  game.state.fighterInput = {fire: true};
  stepFootWeapons(game, DT);
  const rocket = game.state.combat.projectiles.find(item => item.kind === 'rpg');
  check(rocket && rocket.y > game.state.fighter.y, 'a real rocket launches from the raised fighter');
  equal(rocket.lifetimeSeconds, COMBAT_TUNING.foot.rpgLifetimeSeconds * 1.25, 'the actual rocket flies a quarter longer');
  // Keep this shot clear of terrain and bodies while checking actual expiration, not only launch data.
  Object.assign(rocket, {y: 1000, vy: 0, age: COMBAT_TUNING.foot.rpgLifetimeSeconds});
  stepProjectiles(game, DT);
  check(game.state.combat.projectiles.includes(rocket), 'an unlocked tower rocket survives the ordinary range limit');
  rocket.age = rocket.lifetimeSeconds;
  stepProjectiles(game, DT);
  check(!game.state.combat.projectiles.includes(rocket), 'the tower rocket expires at its extended limit');
  const victim = job.actors[0];
  damageRaider(game, victim, victim.health);
  const hit = stepHomeRaid(eligible, raid, {...view, actors: job.actors}, DT, seed);
  equal(hit.raid.riders[0].health, 0, 'combat damage reaches the raid rule');
  live.raid = null; live.tower = null;
  syncHomeGround(game, job);
  equal(job.actors.length, 0, 'ending the raid removes its combat bodies');
  equal(game.state.fighter.y, scablandsSurfaceHeightAt(door.x, door.z), 'climbing down restores the ground');
}

// Step 4B through the real home part: F release, offline/online time, reloads and a read-only look.
{
  const world = newWorld({seed: 5, night: 2});
  const land = home => openLand({...world, open: {...world.open, home}});
  const gate = {kind: 'gate', i: 8, j: 0, axis: 'x'};
  const shed = {kind: 'shed', i: 2, j: 8, turn: 0, stage: 4};
  const point = {...groundPoint(10, 10), yaw: .3};
  const loot = ['bike', 'buggy', 'crate', 'crate'].map(kind => ({kind, position: {...point}, worth: kind === 'bike' ? 6 : kind === 'buggy' ? 15 : 4}));
  const home = {...build(newHome('Haul', 1000), gate), builds: [shed], loot, eggs: 9};
  const drive = viewOf(null, {}, {homeClock: 1000, homeVehicle: 'flatbed', carPosition: point, homeCarHeading: .7, speedKmh: 0});
  let out = stepOpenLand(land(home), drive, 0, parts);
  check(out.open.parts.home.prompt.includes('load this bike'), 'a stopped flatbed offers the nearby wreck');
  out = stepOpenLand(out.open, {...drive, interact: true}, .5, parts);
  out = stepOpenLand(out.open, drive, DT, parts);
  equal(lootOnBed(homeOf(out.open)).length, 0, 'holding F never loads a wreck');
  out = stepOpenLand(out.open, {...drive, interact: true}, DT, parts);
  out = stepOpenLand(out.open, drive, DT, parts);
  equal(lootOnBed(homeOf(out.open)).length, 1, 'one short release loads one wreck');
  check(cues(out.events).includes(HOME_CUES.lootOn), 'the loading cue is named');
  const saved = JSON.parse(JSON.stringify(homeOf(out.open)));
  const reopened = stepOpenLand(land(saved), {...drive, homeClock: saved.lastSeen}, 0, parts);
  equal(homeOf(reopened.open).loot, saved.loot, 'carried and ground loot survive a new outing');
  const look = createHomeGroundView(), before = JSON.stringify(reopened.open);
  look.update({open: reopened.open}, {}, 0);
  const bike = look.group.getObjectByName('home-raid-bike');
  const buggy = look.group.getObjectByName('home-raid-buggy');
  const crate = look.group.getObjectByName('home-raid-crate');
  check(bike.visible && buggy.visible && crate.visible, 'the existing raider look draws the wrecks and dropped crates');
  check(bike.position.y > scablandsSurfaceHeightAt(point.x, point.z) + 1, 'carried loot rests on the flatbed');
  check(bike.rotation.z !== 0 && buggy.children.some(mesh => mesh.scale.y < 1), 'wrecks tip and dent the existing models');
  equal(JSON.stringify(reopened.open), before, 'drawing wrecks never changes the saved loot');
  const unload = {...drive, carPosition: buildingDoor(shed)};
  out = stepOpenLand(reopened.open, {...unload, interact: true}, DT, parts);
  out = stepOpenLand(out.open, unload, DT, parts);
  equal([homeOf(out.open).scrap, homeOf(out.open).eggs, out.open.parts.home.loadKg], [6, 9, 0], 'shed delivery preserves eggs and clears load mass');
  check(cues(out.events).includes(HOME_CUES.lootOff), 'unloading names its cue');
  look.update({open: out.open}, {}, 1);
  check(!bike.visible, 'a delivered wreck is removed from the drawing');
  look.dispose();
  const news = newsBoardSpot(gate), at = {...news, x: news.x - 5, yaw: 0};
  const read = viewOf(at, {}, {homeClock: 1000});
  out = stepOpenLand(land(home), read, 0, parts);
  equal(out.open.parts.home.prompt, HOME_WORDS.cartersOffer, 'the news board offers the carters');
  // A late handoff must not count the time spent before F was pressed.
  out = stepOpenLand(out.open, {...read, interact: true}, 600, parts);
  const sent = JSON.parse(JSON.stringify(homeOf(out.open)));
  equal(sent.carters.began, 1600, 'the carters begin at the supplied current moment');
  check(cues(out.events).includes(HOME_CUES.cartersGo), 'sending names its cue');
  out = stepOpenLand(out.open, read, 1799, parts);
  const mid = JSON.parse(JSON.stringify(homeOf(out.open)));
  equal(mid.scrap, 0, 'half an online hour does not deliver');
  const backward = stepOpenLand(land(mid), {...read, homeClock: 900}, 0, parts);
  equal(homeOf(backward.open).lastSeen, mid.lastSeen, 'a backward clock keeps the last counted moment');
  equal(homeOf(backward.open).scrap, 0, 'a backward clock never pays early');
  const resumed = stepOpenLand(backward.open, {...read, homeClock: 900}, 1801, parts);
  const away = stepOpenLand(land(mid), {...read, homeClock: 5200}, 0, parts);
  const online = stepOpenLand(out.open, read, 1801, parts);
  for (const result of [resumed, away, online]) {
    equal([homeOf(result.open).scrap, homeOf(result.open).loot.length, homeOf(result.open).carters.began], [24, 0, null],
      'online, offline and backward-clock resumed play pay the same 24 scrap');
    check(cues(result.events).includes(HOME_CUES.cartersBack), 'the return cue is named once');
    check(boardLines(result.open.parts.home.opened, homeOf(result.open)).includes("Tin Town's carters brought in 24 scrap and kept 5 as their pay."),
      'the board reports net scrap and rounded pay');
  }
  const again = stepOpenLand(land(homeOf(away.open)), {...read, homeClock: 8800}, 0, parts);
  equal(homeOf(again.open).scrap, 24, 'reopening after completion cannot pay again');
  check(!cues(again.events).includes(HOME_CUES.cartersBack), 'reopening does not repeat the return cue');
  const off = stepOpenLand(land(mid), {...read, homeGround: false, homeClock: 8800}, 100, parts);
  equal(JSON.stringify(homeOf(off.open)), JSON.stringify(mid), 'the off switch leaves version 6 and the carter job untouched');
  const {loot: _loot, scrap: _scrap, carters: _carters, ...old} = home;
  const version5 = {...old, version: 5};
  equal(JSON.stringify(homeOf(stepOpenLand(land(version5), {...read, homeGround: false}, 100, parts).open)), JSON.stringify(version5),
    'the off switch preserves version 5 byte for byte');
  for (const piece of [null, {...loot[0], kind: {toString: null}}, {...loot[0], kind: ['bike']}]) {
    const damaged = {...home, loot: [piece]};
    check(!readableHome(damaged), 'damaged loot kinds are rejected without throwing');
    equal(savedOpenRecord({story: {version: 1, open: {...world.open, home: damaged}}}), null, 'a damaged version 6 save refuses cleanly');
    check(!settleOpenWorld({}, {...world, open: {...world.open, home: damaged}}).ok, 'a damaged version 6 record cannot replace a save');
  }
  for (const record of [saved, mid, homeOf(away.open)]) {
    const settled = settleOpenWorld({}, {...world, open: {...world.open, home: record}});
    check(settled.ok, 'version 6 settles through the actual save writer');
    equal(savedOpenRecord(settled.profile).home, record, 'carried loot, active carters and stored scrap each survive the save round trip');
  }
}

// Step 5 through the enabled part: choose a mark, drill, leave, resume, fit the pump and read a tank.
{
  let home = newHome('Well and tank', 1000);
  const coop = {kind: 'coop', i: 2, j: 8, turn: 0, stage: 0};
  home = markBuild(home, coop); home = {...home, loads: {...home.loads, coop: {i: 2, j: 8}}};
  for (let n = 0; n < 4; n++) home = raiseBuild(home, coop);
  const world = newWorld({seed: 42, night: 2});
  const land = saved => openLand({...world, open: {...world.open, home: saved}});
  const me = {...groundPoint(12.5, 10.6), yaw: 0};
  let out = run(land(home), viewOf(me, {}, {homeClock: 1000}), DT);
  out.open.parts.home.kind = 'tower';
  out = run(out.open, viewOf(me, {piece: true}, {homeClock: 1000}), DT);
  equal(out.open.parts.home.kind, 'well', 'G offers the well after the completed coop');
  out = run(out.open, viewOf(me, {build: true}, {homeClock: 1000}), DT);
  check(homeOf(out.open).well?.water > 0, 'B marks a real seeded well');
  const marked = homeOf(out.open), at = wellInLand(marked.well);
  const drive = extra => viewOf(null, {}, {homeClock: 1100, homeVehicle: 'drill', carPosition: at, homeCarHeading: 0,
    speedKmh: 0, ...extra});
  out = stepOpenLand(land(marked), drive({homeDrillKeys: {KeyB: true}}), DT, parts);
  check(out.open.parts.home.drilling && cues(out.events).includes(HOME_CUES.drillLower), 'B lowers the stopped borrowed rig over the mark');
  out = stepOpenLand(out.open, drive({homeDrillKeys: {Space: true}}), 20, parts);
  const depth = homeOf(out.open).well.depth;
  check(depth > 0, 'Space feeds the real drill through the home part');
  const middle = JSON.parse(JSON.stringify(homeOf(out.open)));
  out = stepOpenLand(land(middle), drive({homeClock: 5000}), DT, parts);
  equal(homeOf(out.open).well.depth, depth, 'an outing away never drills on the real clock');
  out = stepOpenLand(out.open, drive({homeClock: 5000, homeDrillKeys: {KeyB: true}}), DT, parts);
  const drillEvents = [];
  for (let seconds = 0; homeOf(out.open).well.depth < middle.well.water && seconds < 600; seconds += .25) {
    out = stepOpenLand(out.open, drive({homeClock: 5000, homeDrillKeys: {Space: true}}), .25, parts);
    drillEvents.push(...out.events);
  }
  equal(homeOf(out.open).well.depth, middle.well.water, 'the resumed outing stops at the same water depth');
  check(cues(drillEvents).includes(HOME_CUES.drillRock) && cues(drillEvents).includes(HOME_CUES.drillWater), 'rock and water have distinct home cues');
  const foot = {...at, z: at.z - 1.6, yaw: 0};
  out = run(out.open, viewOf(foot, {}, {homeClock: 5000}), DT);
  out = run(out.open, viewOf(foot, {build: true}, {homeClock: 5000}), 3);
  check(!homeOf(out.open).well.pump, 'half the hammering time does not fit the pump');
  out = run(out.open, viewOf(foot, {build: true}, {homeClock: 5000}), 3.1);
  check(homeOf(out.open).well.pump && cues(out.events).includes(HOME_CUES.pumpFit), 'six held seconds fits the pump with its own cue');
  home = homeOf(out.open);
  const tank = {kind: 'tank', i: 14, j: 12, turn: 0, stage: 0, litres: 0, filled: null};
  home = markBuild(home, tank);
  home = transferHomeLoad(home, {vehicle: 'flatbed', position: HOME_LOAD_STACK, speedKmh: 0});
  equal(home.loads.tank, 'bed', 'the marked tank load is chosen before unmarked shed and tower loads');
  home = transferHomeLoad(home, {vehicle: 'flatbed', position: buildInLand(tank), speedKmh: 0});
  equal(home.loads.tank, {i: tank.i, j: tank.j}, 'the existing flatbed delivery supplies the tank');
  for (let n = 0; n < 4; n++) home = raiseBuild(home, tank);
  const completedAt = home.lastSeen;
  const reader = {...buildingDoor(tank), yaw: Math.PI};
  out = stepOpenLand(land(home), viewOf(reader, {}, {homeClock: completedAt + HOME_TANK.seconds / 2, interact: true}), 0, parts);
  equal(homeOf(out.open).builds.at(-1).litres, HOME_TANK.litres / 2, 'six closed hours fills the tank through the actual outing clock');
  check(out.requests.some(request => request.text?.includes('500 of its 1000 litres.')), 'F at the tank reads its current water in a whole sentence');
  const readOnly = JSON.stringify(out.open);
  const look = createHomeGroundView(); look.update({open: out.open}, null, 1);
  check(look.group.getObjectByName('home-hand-pump')?.visible, 'the completed hand pump is drawn');
  check(look.group.getObjectByName('home-well-tank-pipe')?.visible, 'the connected tank has a drawn pipe');
  equal(JSON.stringify(out.open), readOnly, 'drawing the pump, water gauge and pipe never changes saved water'); look.dispose();
  const kept = homeOf(out.open), snapshot = JSON.stringify(kept);
  const settled = settleOpenWorld({}, {...world, open: {...world.open, home: kept}});
  check(settled.ok, 'the version 7 well and tank settle through the real save writer');
  equal(savedOpenRecord(settled.profile).home, kept, 'a version 7 save round trip keeps the well, water and clock');
  equal(JSON.stringify(homeOf(stepOpenLand(land(kept), viewOf(reader, {}, {homeGround: false, homeClock: 999999}), 100, parts).open)), snapshot,
    'with the switch off no well or tank field is touched');
  out = stepOpenLand(land(kept), viewOf(reader, {}, {homeClock: completedAt + HOME_TANK.seconds}), 0, parts);
  equal(homeOf(out.open).builds.at(-1).litres, HOME_TANK.litres, 'two separate outings total twelve real hours without double counting');
  // A crew-built tank starts filling only after its lid is complete, even when both events happened offline.
  const second = {...tank, i: 14, j: 9};
  let crew = {...home, lastSeen: 1000, builds: home.builds.map(row => row.kind === 'tank' ? {...row, filled: 1000} : row)};
  crew = markBuild(crew, second); crew = {...crew, loads: {...crew.loads, tank: {i: second.i, j: second.j}}};
  crew = handToCrew(crew, second, 1000);
  check(crew.crew.job?.kind === 'tank', 'a later tank uses the existing taught crew rule');
  const work = ripenHome(crew, 3600 + HOME_TANK.seconds / 2);
  equal(work.home.builds.at(-1).litres, HOME_TANK.litres / 2, 'crew construction time is not counted as filling time');
  // Version 6 is read unchanged, including loot and a carter contract, then gains only the two new fields.
  const legacy = {...home, version: 6, builds: home.builds.filter(row => row.kind !== 'tank'),
    loot: [{kind: 'crate', position: 'bed', worth: 4}], scrap: 123, carters: {began: home.lastSeen - 10}, loads: {...home.loads}};
  delete legacy.well; delete legacy.loads.tank; delete legacy.loads.greenhouse;
  const bytes = JSON.stringify(legacy);
  check(readableHome(legacy), 'a real version 6 home remains readable');
  const upgraded = upgradeHome(legacy), {well: freshWell, ...old} = upgraded;
  old.loads = {...old.loads}; delete old.loads.tank; delete old.loads.greenhouse;
  equal({...old, version: 6}, legacy, 'version 7 preserves every version 6 value, including the active carters and cargo');
  equal(freshWell, null, 'old homes gain no automatic well');
  equal(JSON.stringify(legacy), bytes, 'upgrading version 6 never mutates the source');
}


// Step 5B: the same crops and water across outings, time partitions, save versions and the real controls.
{
  let home = newHome('Garden', 1000);
  home = {...home, builds: [{kind: 'tank', i: 5, j: 5, turn: 0, stage: 4, litres: 10, filled: 1000}]};
  home = buildBed(home, {i: 3, j: 5, turn: 0});
  home = plantCrop(home, 0);
  equal(home.beds[0].crop, 'spinach', 'the first available seed plants spinach');
  equal(plantCrop({...home, beds: [{...home.beds[0], crop: null, grown: 0}]}, 0, false, 'firePeppers').beds[0].crop, null,
    'a power food cannot be planted outside glass');
  const world = newWorld({seed: 5, night: 2}), land = saved => openLand({...world, open: {...world.open, home: saved}});
  const me = {...groundPoint(18, 18), yaw: 0};
  const after = (saved, moment) => homeOf(stepOpenLand(land(saved), viewOf(me, {}, {homeClock: moment}), 0, parts).open);
  const ripe = after(home, 4600);
  equal(ripe.beds[0].grown, 3600, 'spinach ripens across a closed game through the actual supplied clock');
  equal(after(ripe, 4600).beds, ripe.beds, 'reopening at the same moment cannot grow twice');
  equal(after(ripe, 500).beds, ripe.beds, 'a backward clock preserves a ripe crop');
  const dry = {...home, builds: home.builds.map(row => ({...row, litres: 0}))};
  equal(after(dry, 90000).beds, dry.beds, 'a dry bed waits for a whole day and never dies');
  const unclockedTank = {...dry, well: {i: 6, j: 8, depth: 10, water: 10, pump: true},
    builds: dry.builds.map(row => ({...row, filled: null}))};
  equal(after(unclockedTank, 4600).beds, after(after(unclockedTank, 2800), 4600).beds,
    'an older tank with no fill stamp starts at the known interval and gives identical split growth');
  equal(after(unclockedTank, 4600).beds[0].grown, 3600, 'the null-stamp tank begins watering at the known interval start');
  const far = {...home, builds: home.builds.map(row => ({...row, i: 17, j: 17}))};
  equal(after(far, 90000).beds, far.beds, 'water farther than twelve metres cannot grow a bed');
  const gathered = harvestCrop(ripe, 0);
  equal([gathered.vegetables.spinach, gathered.beds[0].crop, gathered.seeds.spinach], [1, null, 6], 'harvesting stores food and returns its seed');
  equal(harvestCrop(gathered, 0), gathered, 'an empty bed cannot be harvested twice');
  let growing = plantCrop(gathered, 0);
  equal(growing.beds[0].crop, 'carrots', 'the next planting rotates to carrots');
  equal(after(growing, 4600 + 14400).beds[0].grown, 14400, 'carrots need four watered hours');
  growing = plantCrop({...gathered, beds: [{...gathered.beds[0]}]}, 0, false, 'beans');
  equal(after(growing, 4600 + 28800).beds[0].grown, 28800, 'plain beans need eight watered hours');
  equal(bedRefusal(home, {i: 4, j: 5, turn: 1}), 'onTop', 'turned beds cannot overlap existing beds');
  equal(buildRefusal(home, {kind: 'greenhouse', i: 2, j: 4, turn: 0, stage: 0}), 'onTop', 'a greenhouse cannot cover a bed');
  equal(refusal(home, {kind: 'panel', i: 3, j: 5, axis: 'x'}), 'onTop', 'a later fence cannot cross a bed');
  // Construction time is excluded, even when the tank finishes halfway through one closed-game catch-up.
  let crew = {...dry, well: {i: 6, j: 8, depth: 10, water: 10, pump: true}};
  const tank = {kind: 'tank', i: 7, j: 6, turn: 0, stage: 0, litres: 0, filled: null};
  crew = {...crew, builds: crew.builds.map(row => ({...row, i: 17, j: 17}))};
  crew = markBuild(crew, tank); crew = {...crew, loads: {...crew.loads, tank: {i: tank.i, j: tank.j}}};
  crew = handToCrew(crew, tank, 1000);
  const once = after(crew, 1000 + 5400), split = after(after(crew, 1000 + 3600), 1000 + 5400);
  equal(once.beds[0].grown, 1800, 'a crew-built tank waters only the time after completion');
  equal(once.beds, split.beds, 'splitting at tank completion preserves the same crop sums');
  const glass = {kind: 'greenhouse', i: 7, j: 4, turn: 1, stage: 0};
  home = markBuild(home, glass);
  home = transferHomeLoad(home, {vehicle: 'flatbed', position: HOME_LOAD_STACK, speedKmh: 0});
  equal(home.loads.greenhouse, 'bed', 'the greenhouse load uses the existing flatbed');
  home = transferHomeLoad(home, {vehicle: 'flatbed', position: buildInLand(glass), speedKmh: 0});
  for (let n = 0; n < 3; n++) home = raiseBuild(home, glass);
  equal(home.pots, [], 'unfinished glass has no working pots');
  home = raiseBuild(home, glass);
  equal(home.pots.length, 6, 'the fourth greenhouse stage provides exactly six pots');
  home = plantCrop(home, 0, true, 'firePeppers'); home = plantCrop(home, 1, true, 'jumpingBeans');
  check(readableHome(home), 'beds, greenhouse and planted pots form a readable version 8 record');
  const powersRipe = after(home, 1000 + 43200);
  equal(powersRipe.pots.slice(0, 2).map(row => row.grown), [43200, 43200], 'both power foods need twelve watered real hours');
  const chunked = after(after(home, 1000 + 12345), 1000 + 43200);
  equal(chunked.pots, powersRipe.pots, 'separate closed-game visits give identical pot growth');
  let stocked = harvestCrop(harvestCrop(powersRipe, 0, true), 1, true);
  stocked = {...stocked, foods: {...stocked.foods, firePeppers: 3}};
  const packed = packTin(stocked);
  equal(packed.tin.length, 3, 'the tin holds exactly three foods');
  equal(Object.values(packed.foods).reduce((a, b) => a + b, 0), 1, 'packing takes only the three foods put in the tin');
  equal(packTin(packed), packed, 'packing a full tin cannot spend food');
  const lunch = {...packed, tin: ['firePeppers', 'jumpingBeans', null]};
  let ate = eatFromTin(lunch, 0, {firePeppers: 0, jumpingBeans: 0});
  equal([ate.home.tin[0], ate.powers.firePeppers], [null, 90], 'eating consumes one pepper and starts ninety play seconds');
  ate = eatFromTin(ate.home, 1, ate.powers);
  equal(ate.powers.jumpingBeans, 120, 'jumping beans last two play minutes');
  equal(stepHomePowers(ate.powers, 90), {firePeppers: 0, jumpingBeans: 30}, 'both powers count down independently');
  equal(stepHomePowers(ate.powers, 120), {firePeppers: 0, jumpingBeans: 0}, 'both powers end without another key');
  equal([powerStrength(20), powerStrength(10), powerStrength(0)], [1, .5, 0], 'the final twenty seconds ease powers back to normal');
  const controls = footControlInput({Digit4: true, Digit5: true, Digit6: true}, {});
  check(controls.homeEat1 && controls.homeEat2 && controls.homeEat3, 'the three free number keys reach foot input');
  let outing = stepOpenLand(land(lunch), viewOf(me, {eat1: true}, {homeClock: lunch.lastSeen}), 0, parts);
  equal(homeOf(outing.open).tin[0], null, 'the real home part eats a tin slot on a fresh key press');
  check(cues(outing.events).includes(HOME_CUES.eat), 'eating names its sound cue');
  outing = stepOpenLand(outing.open, viewOf(me, {eat1: true, burst: true, forward: true}), 5, parts);
  check(outing.open.parts.home.burst.active && outing.open.parts.home.powers.firePeppers === 85, 'a pepper keeps the third speed beyond three seconds');
  outing = stepOpenLand(outing.open, viewOf(me), 85, parts);
  check(cues(outing.events).includes(HOME_CUES.powerEnd) && outing.open.parts.home.powers.firePeppers === 0, 'the part ends the power with its cue');
  const talking = stepOpenLand(land(lunch), viewOf(me, {eat1: true}, {homeTalking: true}), 0, parts);
  equal(homeOf(talking.open).tin, lunch.tin, 'talk cannot eat a lunch slot');
  const settled = settleOpenWorld({}, {...world, open: {...world.open, home: lunch}});
  check(settled.ok, 'version 8 settles through the real save writer');
  equal(savedOpenRecord(settled.profile).home, lunch, 'the saved beds, pots, seeds, stores and tin round-trip exactly');
  const legacy = {...home, version: 7, builds: home.builds.filter(row => row.kind !== 'greenhouse'), loads: {...home.loads},
    well: {i: 10, j: 10, depth: 7, water: 12, pump: false}, scrap: 87, carters: {began: 950}, loot: [{kind: 'crate', position: 'bed', worth: 4}]};
  delete legacy.loads.greenhouse;
  for (const key of Object.keys(newGarden())) delete legacy[key];
  const bytes = JSON.stringify(legacy);
  check(readableHome(legacy), 'a genuine version 7 record remains readable');
  const upgraded = upgradeHome(legacy);
  for (const [key, value] of Object.entries(legacy)) if (key !== 'version')
    equal(upgraded[key], key === 'loads' ? {...value, greenhouse: 'stack'} : value, 'version 8 preserves version 7 field ' + key);
  equal(JSON.stringify(legacy), bytes, 'migration never mutates the original version 7 record');
  equal(homeOf(stepOpenLand(land(legacy), viewOf(me, {}, {homeGround: false}), 10, parts).open), legacy, 'the off switch keeps version 7 byte-for-byte');
  for (const bad of [{...home, tin: [{toString: null}, null, null]},
    {...home, beds: [{...home.beds[0], crop: {toString: null}}]}, {...home, tin: [null, null, null, null]}, {...home, seeds: {...home.seeds, spinach: -1}},
    {...home, beds: [{...home.beds[0], crop: 'firePeppers'}]}, {...home, pots: home.pots.slice(1)},
    {...home, pots: home.pots.map((row, n) => n ? row : {...row, grown: Infinity})}])
    check(!readableHome(bad), 'a malformed garden record cannot overwrite a good save');
  const drawnOpen = stepOpenLand(land(powersRipe), viewOf(me, {}, {homeClock: powersRipe.lastSeen}), 0, parts).open;
  const beforeDraw = JSON.stringify(drawnOpen), look = createHomeGroundView(); look.update({open: drawnOpen}, null, 1);
  check(look.group.getObjectByName('home-greenhouse')?.visible && look.group.getObjectByName('home-pot/7/4/0')?.visible,
    'the greenhouse and its pots are drawn at their saved places');
  equal(JSON.stringify(drawnOpen), beforeDraw, 'drawing crops never advances their clock or changes the save'); look.dispose();
  check(homeFootPlatforms(powersRipe, () => 0).some(row => row.y === 3.1), 'the finished greenhouse roof can receive a jumping fighter');
}



// G, held hammering and F complete the bed loop with the same real home part used in play.
{
  let home = newHome('Hand Garden', 1000);
  const coop = {kind: 'coop', i: 2, j: 8, turn: 0, stage: 0};
  home = markBuild(home, coop); home = {...home, loads: {...home.loads, coop: {i: coop.i, j: coop.j}}};
  for (let n = 0; n < 4; n++) home = raiseBuild(home, coop);
  home = {...home, builds: [...home.builds, {kind: 'tank', i: 12, j: 13, turn: 0, stage: 4, litres: 10, filled: 1000}]};
  const world = newWorld({seed: 5, night: 2}), land = saved => openLand({...world, open: {...world.open, home: saved}});
  const me = {...groundPoint(14, 12), yaw: 0};
  let out = stepOpenLand(land(home), viewOf(me, {}, {homeClock: 1000}), 0, parts);
  for (let n = 0; n < 10 && out.open.parts.home.kind !== 'bed'; n++) {
    out = run(out.open, viewOf(me, {piece: true}), DT); out = run(out.open, viewOf(me), DT);
  }
  equal(out.open.parts.home.kind, 'bed', 'G offers the garden bed after the tank');
  out = run(out.open, viewOf(me, {build: true}), 2.6);
  equal(homeOf(out.open).beds.length, 1, 'holding B hammers up a one-by-two-cell bed in seconds');
  const at = cropInLand(homeOf(out.open), homeOf(out.open).beds[0]);
  const tending = {x: at.x, z: at.z - 2.5, yaw: 0};
  out = run(out.open, viewOf(tending, {}, {interact: true}), DT);
  equal(homeOf(out.open).beds[0].crop, 'spinach', 'F at the empty bed plants the next seed');
  check(cues(out.events).includes(HOME_CUES.plant), 'planting uses the named bed cue');
  const planted = homeOf(out.open);
  out = stepOpenLand(land(planted), viewOf(tending, {}, {homeClock: planted.lastSeen + 3600, interact: true}), 0, parts);
  equal(homeOf(out.open).vegetables.spinach, 1, 'F at the ripe bed harvests into the vegetable store');
  check(cues(out.events).includes(HOME_CUES.harvest), 'harvesting uses the named bed cue');
  let stored = homeOf(out.open);
  const shed = {kind: 'shed', i: 6, j: 10, turn: 0, stage: 0};
  stored = markBuild(stored, shed); stored = {...stored, loads: {...stored.loads, shed: {i: shed.i, j: shed.j}}};
  for (let n = 0; n < 4; n++) stored = raiseBuild(stored, shed);
  stored = {...stored, foods: {firePeppers: 1, jumpingBeans: 1}};
  out = stepOpenLand(land(stored), viewOf({...buildingDoor(shed), yaw: Math.PI}, {}, {homeClock: stored.lastSeen, interact: true}), 0, parts);
  equal(homeOf(out.open).tin, ['firePeppers', 'jumpingBeans', null], 'F at the shed packs harvested power food into the tin');
  check(out.requests.some(row => row.text?.includes('Press 4, 5 or 6')), 'the shed explains the free eating keys');
}

// Power foods reach the fixed-step walker, including safe landings and the walk off a roof.
{
  const course = {def: {}, groundAt: (s, lateral) => ({x: lateral, y: 0, z: s, heading: 0}),
    nearest: (x, z) => ({s: z, lateral: x}), obstaclesNear: () => []};
  const car = {s: 0, lateral: 0};
  for (const height of [1.8, 2.5, 4.4]) {
    const fighter = createFighter(course, car, {s: 0, lateral: 0});
    const platforms = [{x: 0, z: 5, halfX: 2, halfZ: height === 1.8 ? .12 : 2, heading: 0, y: height}];
    let peak = 0;
    for (let n = 0; n < 360; n++) {
      stepFighter(course, car, fighter, {jump: n === 0, forward: fighter.z < 5, homeJumpMeters: 6, homePlatforms: platforms});
      peak = Math.max(peak, fighter.y);
    }
    check(peak > 5.9 && peak < 6.1, 'jumping beans lift the real walker six metres');
    equal(fighter.y, height, 'the walker lands on the wall, roof or tower rather than falling through it');
    for (let n = 0; n < 240; n++) stepFighter(course, car, fighter, {forward: true, homePlatforms: platforms});
    equal(fighter.y, 0, 'walking off the raised surface returns to the ground');
  }
  const game = new LegacyRoadsideDuel({seed: 5});
  game.startCampaign({mode: 'wasteland', car: 'falcone_f42', startStage: 0, discoveredGate: true, seed: 5});
  Object.assign(game.state, {status: 'racing', countdown: 0, speedMph: 0});
  game.state.input.interact = true;
  for (let n = 0; n < 25; n++) stepFootTransition(game, DT);
  game.state.input.interact = false;
  const home = {on: true, powers: {firePeppers: 90, jumpingBeans: 120}, burst: {active: true, strength: 1}};
  game.course = course; game.state.fighter = createFighter(course, car, {s: 0, lateral: 0});
  Object.assign(game.state, {s: 0, lateral: 0, arena: {mode: 'world-job', worldJob: {job: {steps: [{kind: 'roam'}], stepIndex: 0}, open: {parts: {home}, world: {...newWorld({seed: 5, night: 2}), open: {...newWorld({seed: 5, night: 2}).open, home: newHome('Power')}}}}, participants: []}, opponents: []});
  game.state.fighterInput = {forward: true, jump: true};
  let peak = 0;
  for (let n = 0; n < 150; n++) { stepFootTransition(game, DT); peak = Math.max(peak, game.state.fighter.y); }
  check(peak > 5.9 && game.state.fighter.z > 37, 'the actual foot adapter applies both the pepper speed and bean jump');
  equal(game.state.fighter.speed, FIGHTER_RULES.burstMetersPerSecond, 'the pepper uses the existing third speed');
  home.burst.strength = powerStrength(10); game.state.fighterInput = {forward: true};
  stepFootTransition(game, DT);
  check(game.state.fighter.speed < FIGHTER_RULES.burstMetersPerSecond && game.state.fighter.speed > FIGHTER_RULES.sprintMetersPerSecond,
    'the fixed-step walker slows during the final twenty seconds');
  home.burst.active = false; home.powers = {firePeppers: 0, jumpingBeans: 0}; stepFootTransition(game, DT);
  check(Math.abs(game.state.fighter.speed - FIGHTER_RULES.walkMetersPerSecond) < 1e-9, 'expired powers restore ordinary walking');
}

console.log(`Home ground: ${checks} checks passed.`);
