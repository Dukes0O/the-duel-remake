// TOWN-FIRE-JOB: the town's first fire, from the mission card to the town's result (docs/board/cards/TOWN-FIRE-JOB.md).
// The rules are proved without driving: the fire grows and spreads with the wind, the cannon knocks it down by the water a
// building needs, the tank empties and fills at each water point's real flow, a well runs dry, the result says what was saved
// and lost, the result is applied once per run id, a town saved before this card loads unchanged, a save round trip, the
// three ash lines, the firetruck input context and every player-facing line. One scripted drive shows the job can be
// finished: a child-pace driver on Easy saves the soup kitchen at least 8 times in 10.
import assert from 'node:assert/strict';
import test from 'node:test';
import {readFileSync} from 'node:fs';
import {Duel} from '../src/game.js';
import {createTown, serializeTown, deserializeTown} from '../src/town/town-state.js';
import {stepTown, dispatchTownCommand} from '../src/town/index.js';
import {getTownNext} from '../src/town/town-chapters.js';
import {TOWN_CAPTIONS} from '../src/town/content/lines.js';
import {townMissionResult, TOWN_MISSION_SETTLED_LIMIT} from '../src/town/town-missions.js';
import {townMissionCardMarkup, townMissionCardModel, TOWN_FIRE_CARD_FACTS} from '../src/town/ui/town-mission-card.js';
import {createTownJobRun, openTownJobs, townAshLine, townFireWater, townJobDefinition, townJobResult, TOWN_FIRE_GATE_TAP} from '../src/world/jobs/town-jobs.js';
import {DOUSE_RULE, douseAim, douseLine, douseNeedLpm, douseSentence, stepDouse, tapFlowLpm} from '../src/world/jobs/steps/douse.js';
import {createJob} from '../src/world/jobs/job-engine.js';
import {setScablandsTownLayout, clearScablandsTownLayout} from '../src/world/scablands-ground.js';
import {cleanupWorldJobLoan, drivingFireTruck, setJobVehicleSpray} from '../src/arena/modes/world-job.js';
import {INPUT_CONTEXTS, heldInput, keyboardAction} from '../src/input-contexts.js';
import {nearestOnLine} from '../src/world/scablands-ways.js';
import {wrapHeading} from '../src/offroad-physics.js';
import {makeRng} from '../src/rng.js';
import {SOUND_BANK} from '../src/sound-bank.js';

const dt = 1 / 120;
// A town at Chapter 7: the first winter is over, the soup kitchen stands, the well is dug, and a few buildings stand near them.
// `layout` picks one of several towns, so the driver meets the fire in different places with different neighbours.
const LAYOUTS = Object.freeze([
  [['soup-kitchen', 1, -6], ['hand-well', -4, -6], ['latrine', -8, -3], ['compost-heap', 4, -4], ['chicken-run', -1, -6]],
  [['soup-kitchen', -2, -5], ['hand-well', 3, -6], ['chicken-run', 1, -3], ['compost-heap', -5, -3], ['latrine', -9, -5]],
  [['soup-kitchen', 2, -4], ['hand-well', -2, -6], ['chicken-run', 5, -3], ['compost-heap', 2, -2], ['latrine', -7, -2]],
]);
function fireTown(seed = 7, layout = 0, wind = 45) {
  const town = createTown(seed, 'Fire test');
  town.story = {facts:{pitsDug:true, wellBuilt:true, salvageDelivered:true, soupBuilt:true, latrineBuilt:true, winterPassed:true},
    completed:{'town.act1.twelve':true, 'town.act1.water':true, 'town.act1.salvage':true, 'town.act1.soup':true, 'town.act1.smell':true,
      'town.act1.winter':true}};
  for (const [buildingId, x, z] of LAYOUTS[layout % LAYOUTS.length]) {
    const placed = dispatchTownCommand(town, {type:'placeBuilding', buildingId, x, z});
    assert.equal(placed.ok, true, `${buildingId} at ${x}, ${z}: ${placed.message}`);
  }
  for (const building of town.buildings) building.state = 'finished';
  town.weather = {...(town.weather ?? {}), windDirection:wind, windSpeedKph:18, windFactor:1};
  return town;
}
const fireStep = (town = fireTown()) => townJobDefinition(town, 'town-fire-first').steps[0];
const kitchenOf = step => step.buildings.find(building => building.id === step.mainId);
const view = (position, extra = {}) => ({player:{position}, speedKmh:0, difficulty:'medium', onFoot:false, heading:0, controls:{}, ...extra});
// Facing a building from `metres` south of its south side, nose to it.
const southOf = (building, metres = 12) => ({x:building.x, z:building.z - building.halfZ - metres});

function run(step, state, seconds, viewFor) {
  let current = state, events = [], requests = [], outcome = null;
  for (let t = 0; t < seconds; t += .1) {
    outcome = stepDouse(step, current, viewFor(t, current), .1);
    current = outcome.state; events = events.concat(outcome.events); requests = requests.concat(outcome.requests);
    if (outcome.complete) break;
  }
  return {state:current, events, requests, complete:outcome?.complete === true, closingLines:outcome?.closingLines};
}

test('the fire grows while nobody sprays it, burns its building down, and spreads downwind first', () => {
  const town = fireTown(7, 0, 0), step = fireStep(town), kitchen = kitchenOf(step);
  const left = run(step, {}, 600, () => view({x:-200, z:-200}));
  assert.equal(left.complete, true, 'left alone, the fire burns itself out');
  assert.equal(left.state.fires[kitchen.id].state, 'lost', 'and takes the soup kitchen with it');
  assert.ok(left.events.some(event => event.type === 'douseLost' && event.id === kitchen.id));
  assert.ok(left.closingLines.includes('town.7.burnt'), 'Odessa says the kitchen is lost');
  // The same fire with the wind the other way catches the buildings on the other side first.
  const caughtFirst = windDirection => {
    const windStep = fireStep(fireTown(7, 0, windDirection));
    const caught = run(windStep, {}, 600, () => view({x:-200, z:-200})).events.find(event => event.type === 'douseCaught');
    return caught && windStep.buildings.find(building => building.id === caught.id);
  };
  const east = caughtFirst(0), west = caughtFirst(180);
  assert.ok(east && west, 'the fire spreads both times');
  assert.ok(east.x > kitchen.x - 1 && west.x < kitchen.x + 1, `downwind first: east wind ${east.name}, west wind ${west.name}`);
  // Easy is slower to grow and to spread.
  const growth = difficulty => run(step, {}, 20, () => view({x:-200, z:-200}, {difficulty})).state.fires[kitchen.id].heat;
  assert.ok(growth('easy') < growth('medium') && growth('medium') < growth('hard'));
});

test('the cannon sprays the nearest flames in front, at the pump rate, and knocks the fire down by the water it needs', () => {
  const step = fireStep(), kitchen = kitchenOf(step), stand = southOf(kitchen);
  assert.equal(douseAim(kitchen, stand, 0), 1, 'facing it from 12 m, all the water lands');
  assert.equal(douseAim(kitchen, stand, Math.PI), 0, 'facing away, none does');
  assert.equal(douseAim(kitchen, {x:kitchen.x, z:kitchen.z - 80}, 0), 0, 'from 80 m it cannot reach');
  assert.ok(douseAim(kitchen, {x:kitchen.x, z:kitchen.z - kitchen.halfZ - 35}, 0) < 1, 'beyond 25 m the wind takes some');
  assert.equal(Math.round(douseNeedLpm(128)), 1741, 'the soup kitchen needs about 1,740 L a minute fully alight (NFA)');
  // Holding H facing away wastes nothing: the cannon opens only on flames.
  const away = run(step, {}, 5, () => view(stand, {heading:Math.PI, controls:{spray:true}}));
  assert.equal(away.state.tankL, 3000);
  assert.equal(away.state.spraying, false);
  const sprayed = run(step, {}, 6, () => view(stand, {controls:{spray:true}}));
  assert.ok(Math.abs(sprayed.state.usedL - 100) < 2, `1,000 L a minute is 100 L in 6 s (${sprayed.state.usedL})`);
  assert.equal(sprayed.state.targetId, kitchen.id);
  assert.ok(sprayed.events.some(event => event.type === 'douseSpray'));
  // The kitchen on its own (its neighbours are tried in the first test): a minute's head start, then the cannon on it.
  const alone = {...step, buildings:[kitchen]};
  const out = run(alone, {}, 240, () => view(stand, {controls:{spray:true}}));
  assert.equal(out.complete, true);
  assert.equal(out.state.fires[kitchen.id].state, 'out');
  assert.ok(out.state.usedL > 1200 && out.state.usedL < 3000, `the kitchen takes most of a tank (${Math.round(out.state.usedL)} L)`);
  const done = out.events.find(event => event.type === 'douseDone');
  assert.deepEqual(done.savedIds, [kitchen.id]);
  assert.deepEqual(done.lostIds, []);
  assert.equal(done.lineId, 'town.7.won');
  assert.match(done.sentence, /^You saved the soup kitchen from the fire\. Nothing burnt down\. You used [\d,]+ litres of water\.$/);
  assert.deepEqual(out.closingLines, ['town.7.won', 'town.7.ash']);
  // Seen again (the closing lines hold the job), it does not report twice.
  assert.equal(stepDouse(alone, out.state, view(stand), dt).events.some(event => event.type === 'douseDone'), false);
});

test('the tank runs dry, fills at each water point at its own flow, and a well holds only what is in it', () => {
  // A part-full tank, and a fire that cannot burn itself out while the truck fills up.
  const whole = fireStep(), step = {...whole, tank:{...whole.tank, startL:600}, buildings:whole.buildings.map(row => ({...row, fuelHours:1e6}))};
  const kitchen = kitchenOf(step), stand = southOf(kitchen, 30);
  const well = step.water.find(point => point.kind === 'well'), gate = step.water.find(point => point.kind === 'gate');
  assert.equal(well.flowLpm, 1000);
  assert.equal(well.storeL, 2200);
  assert.equal(gate.flowLpm, 600);
  assert.deepEqual(gate.position, TOWN_FIRE_GATE_TAP);
  assert.equal(tapFlowLpm(0), 0, 'a tap with no pressure gives nothing');
  assert.ok(tapFlowLpm(12, 50) > 500 && tapFlowLpm(12, 50) < 2000, `a 50 mm tap at 12 m of head gives ${tapFlowLpm(12, 50)} L a minute`);
  // Spray a part-full tank dry from 30 m, where only part lands.
  const empty = run(step, {}, 200, (t, state) => view(stand, {controls:{spray:state.tankL > 0}}));
  assert.equal(empty.state.tankL, 0);
  assert.ok(empty.events.some(event => event.type === 'douseEmpty'));
  assert.ok(empty.requests.some(request => request.lineId === 'town.fire.empty'));
  assert.match(douseLine(step, empty.state), /^The tank is empty\./);
  assert.equal(empty.state.markId, step.water.reduce((best, point) => Math.hypot(point.position.x - stand.x, point.position.z - stand.z) <
    Math.hypot(best.position.x - stand.x, best.position.z - stand.z) ? point : best).id, 'the marker points at the nearest water');
  // The well: 1,000 L a minute until its 2,200 L are gone, then dry.
  const atWell = run(step, empty.state, 60, () => view(well.position));
  assert.ok(Math.abs(atWell.state.tankL - 1000) < 20, `a minute at the well is about 1,000 L (${atWell.state.tankL})`);
  const dry = run(step, atWell.state, 120, () => view(well.position));
  assert.ok(Math.abs(dry.state.tankL - 2200) < 1, `the well gave all it held (${dry.state.tankL})`);
  assert.ok(dry.events.some(event => event.type === 'douseDry' && event.id === well.id));
  assert.ok(dry.requests.some(request => request.lineId === 'town.fire.dry'));
  // The gate's tap: slower, and it keeps going to a full tank.
  const atGate = run(step, empty.state, 60, () => view(gate.position));
  assert.ok(Math.abs(atGate.state.tankL - 600) < 20, `a minute at the gate is about 600 L (${atGate.state.tankL})`);
  const full = run(step, atGate.state, 300, () => view(gate.position));
  assert.equal(full.state.tankL, 3000);
  assert.ok(full.events.some(event => event.type === 'douseFull'));
  // Moving through a ring fills nothing.
  assert.equal(run(step, empty.state, 5, () => view(gate.position, {speedKmh:20})).state.tankL, 0);
});

test('the fire calls open from the town: Chapter 7 after the first winter, then whenever a building burns', () => {
  const fresh = createTown(3, 'Too early');
  assert.equal(openTownJobs(fresh).some(job => job.kind === 'fire'), false);
  const town = fireTown();
  assert.equal(openTownJobs(town)[0].id, 'town-fire-first', 'a fire comes before any other job');
  const definition = townJobDefinition(town, 'town-fire-first');
  assert.equal(definition.vehicle, 'fire-truck');
  assert.equal(definition.chapter, 'town.act1.fire');
  assert.doesNotThrow(() => createJob(definition));
  assert.equal(kitchenOf(definition.steps[0]).buildingId, 'soup-kitchen');
  assert.match(definition.captions['town.7.fire'], /^Odessa: The soup kitchen is on fire!/);
  // After Chapter 7, a fire the town's own fire system lit opens a fire call on that building.
  const later = fireTown(); later.story.completed['town.act1.fire'] = true; later.story.facts.firstFireOut = true;
  assert.equal(openTownJobs(later).some(job => job.kind === 'fire'), false, 'nothing is burning');
  const coop = later.buildings.find(building => building.buildingId === 'chicken-run');
  coop.fireStage = 1;
  assert.equal(openTownJobs(later)[0].id, 'town-fire-call');
  const call = townJobDefinition(later, 'town-fire-call');
  assert.equal(call.steps[0].mainId, coop.id);
  assert.match(call.captions['town.fire.go'], /^Odessa: There's a fire at the chicken run\./);
  assert.match(townMissionCardModel(later).line, /^There's a fire at the chicken run\./);
  // While the call is driven the town's own fire leaves that building alone, and puts its stage back after each hour.
  const runner = createTownJobRun({town:later, runId:'run-hold', holdFires:call.steps[0].buildings.map(row => row.id)});
  runner.frame(300);
  assert.equal(runner.ticks, 30);
  assert.equal(coop.fireStage, 1, 'the call\'s fire did not grow in the town');
  assert.equal(coop.state, 'finished');
  assert.equal(later.buildings.some(building => building.id !== coop.id && building.fireStage), false, 'nor spread in the town');
});

test('a fire result is applied once per run id: saved buildings stop burning, lost ones are left to rebuild, Chapter 7 ends', () => {
  const town = fireTown(), kitchen = town.buildings.find(row => row.buildingId === 'soup-kitchen');
  const coop = town.buildings.find(row => row.buildingId === 'chicken-run');
  const result = {runId:'run-a', jobId:'town-fire-first', kind:'fire', savedIds:[kitchen.id], lostIds:[coop.id], waterL:2400,
    chapter:'town.act1.fire', ash:'ash'};
  const first = townMissionResult(town, result);
  assert.equal(first.settled, true);
  assert.equal(kitchen.state, 'finished');
  assert.equal(coop.state, 'burnt-1', 'the chicken run is a black frame to build again');
  assert.equal(town.story.completed['town.act1.fire'], true);
  assert.equal(town.story.facts.firstFireOut, true);
  assert.equal(town.story.facts.everburnFromAsh, true, 'the first ash line opens the Everburn from the ash');
  assert.equal(getTownNext(town).chapter?.id, 'town.act1.payday', 'Chapter 8 is next');
  const once = serializeTown(town);
  for (let i = 0; i < 3; i++) assert.equal(townMissionResult(town, result).settled, false, 'the same run never applies twice');
  assert.equal(serializeTown(town), once);
  // The other two ash lines finish the chapter but do not open the Everburn from the ash.
  for (const ash of ['going', 'done']) {
    const other = fireTown(), main = other.buildings.find(row => row.buildingId === 'soup-kitchen');
    assert.equal(townMissionResult(other, {...result, runId:`run-${ash}`, savedIds:[main.id], lostIds:[], ash}).settled, true);
    assert.equal(other.story.completed['town.act1.fire'], true);
    assert.equal(other.story.facts.everburnFromAsh, undefined, ash);
  }
  // A town fire that was put out stops burning there, as a hose does.
  const later = fireTown(); later.story.completed['town.act1.fire'] = true;
  const burning = later.buildings.find(row => row.buildingId === 'chicken-run'); burning.fireStage = 2; burning.fireStartedTick = 3n;
  assert.equal(townMissionResult(later, {runId:'run-call', jobId:'town-fire-call', kind:'fire', savedIds:[burning.id], lostIds:[], waterL:900,
    chapter:null, ash:null}).settled, true);
  assert.equal(burning.fireStage, undefined);
  assert.equal(burning.fireOut, true);
  // Only a clear result is taken.
  const base = {runId:'run-bad', jobId:'town-fire-first', kind:'fire', savedIds:[kitchen.id], lostIds:[], waterL:100, chapter:'town.act1.fire', ash:'ash'};
  for (const bad of [{savedIds:['nobody']}, {lostIds:[kitchen.id]}, {waterL:-1}, {waterL:1.5}, {waterL:100_001}, {jobId:'town-steel-run'},
    {chapter:null}, {ash:'maybe'}, {jobId:'town-fire-call'}, {runId:''}, {savedIds:[kitchen.id, kitchen.id]}, {savedIds:'all'}])
    assert.equal(townMissionResult(fireTown(), {...base, ...bad}).ok, false, JSON.stringify(bad));
  assert.equal(dispatchTownCommand(town, {type:'townMissionResult', ...result, runId:'forged'}).ok, false, 'a result is not an ordinary town command');
  for (let i = 0; i < TOWN_MISSION_SETTLED_LIMIT + 2; i++)
    townMissionResult(town, {...result, runId:`bulk-${i}`, jobId:'town-fire-call', chapter:null, ash:null, savedIds:[], lostIds:[]});
  assert.equal(town.missions.settled.length, TOWN_MISSION_SETTLED_LIMIT, 'the settled list stays bounded');
});

test('a town saved before this card loads unchanged, and a save round trip keeps the result and the settled run', async () => {
  const fixture = readFileSync(new URL('./fixtures/town/town-v1.json', import.meta.url), 'utf8');
  const old = deserializeTown(fixture);
  const before = serializeTown(old);
  openTownJobs(old); townMissionCardModel(old); townJobDefinition(old, 'town-fire-first'); townJobDefinition(old, 'town-fire-call'); townFireWater(old);
  assert.equal(serializeTown(old), before, 'reading the fire jobs, the card and the water writes nothing');
  assert.equal(serializeTown(deserializeTown(before)), before);
  const town = fireTown();
  for (let i = 0; i < 30; i++) stepTown(town);
  const kitchen = town.buildings.find(row => row.buildingId === 'soup-kitchen');
  const definition = townJobDefinition(town, 'town-fire-first');
  let saved = null;
  const runner = createTownJobRun({town, runId:'run-save', holdFires:definition.steps[0].buildings.map(row => row.id),
    save:async target => { saved = serializeTown(target); return true; }});
  const worldJob = {definition, job:{done:true}, fireResult:{savedIds:[kitchen.id], lostIds:[], usedL:1800, mainSaved:true}};
  const [a, b] = await Promise.all([runner.settle(worldJob), runner.settle(worldJob)]);
  assert.deepEqual(a, b);
  assert.equal(a.settled, true);
  assert.equal(a.saved, true);
  const loaded = deserializeTown(saved);
  assert.deepEqual(loaded, town);
  assert.equal(loaded.story.completed['town.act1.fire'], true);
  assert.deepEqual(loaded.missions.history.at(-1), {runId:'run-save', jobId:'town-fire-first', kind:'fire', savedIds:[kitchen.id], lostIds:[],
    waterL:1800, tick:String(town.tick)});
  assert.equal(townMissionResult(loaded, townJobResult(worldJob, 'run-save')).settled, false, 'settled before the save, settled after it');
  assert.equal(townJobResult({...worldJob, fireResult:null}, 'run-x'), null, 'no fire result, nothing for the town');
  // A very long call still hands the town its result: the water used is recorded up to the town's bound.
  const long = townJobResult({...worldJob, fireResult:{...worldJob.fireResult, usedL:250_000}}, 'run-long');
  assert.equal(long.waterL, 100_000);
  assert.equal(townMissionResult(fireTown(), {...long, savedIds:[]}).settled, true);
});

test('the ash line has three versions, and the firetruck input context sprays with H', () => {
  assert.equal(townAshLine({}), 'ash');
  assert.equal(townAshLine({started:true}), 'going');
  assert.equal(townAshLine({started:true, smokeBeaten:true}), 'done');
  for (const [ember, lineId] of [[{}, 'town.7.ash'], [{started:true}, 'town.7.ash.going'], [{started:true, smokeBeaten:true}, 'town.7.ash.done']]) {
    const definition = townJobDefinition(fireTown(), 'town-fire-first', {ember});
    assert.deepEqual(definition.steps[0].closing, [lineId]);
    assert.ok(definition.captions[lineId]);
  }
  assert.equal(keyboardAction('firetruck', 'KeyH'), 'spray');
  assert.equal(heldInput('firetruck', 'spray', {KeyH:true}), true);
  assert.equal(keyboardAction('car', 'KeyH'), 'help', 'every other car keeps H for help');
  assert.ok(INPUT_CONTEXTS.firetruck.gamepad.some(([button, action]) => button === 8 && action === 'help'));
});

test('every fire line, card line and result sentence is a plain whole sentence, and every event names its sound cue', () => {
  const ids = Object.keys(TOWN_CAPTIONS).filter(id => /^town\.(7|fire)\./.test(id));
  assert.ok(ids.length >= 16, ids.length);
  const later = fireTown(); later.story.completed['town.act1.fire'] = true;
  later.buildings.find(row => row.buildingId === 'chicken-run').fireStage = 1;
  const cards = [townMissionCardModel(fireTown()), townMissionCardModel(later)];
  const step = fireStep();
  const lines = [...ids.map(id => TOWN_CAPTIONS[id].text.replaceAll('{building}', 'the soup kitchen')),
    ...cards.flatMap(card => [card.line, ...card.facts, card.later]), TOWN_FIRE_CARD_FACTS.laterChapter, TOWN_FIRE_CARD_FACTS.later,
    douseSentence(['the soup kitchen'], [], 1800), douseSentence(['the soup kitchen', 'the chicken run'], ['the latrine'], 4200),
    douseSentence([], ['the soup kitchen', 'the latrine', 'the compost heap'], 3000),
    douseLine(step, {}), douseLine(step, {tankL:0}), douseLine(step, {tankL:900, filling:step.water[0].id}),
    douseLine(step, {tankL:900, spraying:true, targetId:step.mainId}),
    douseLine(step, {tankL:900, fires:Object.fromEntries(step.buildings.map(row => [row.id, {state:'burning'}]))})];
  for (const line of lines) {
    assert.ok(line.length <= 260, line);
    assert.doesNotMatch(line, /—|–| - |\{/, `no dashes and nothing left to fill in: ${line}`);
    assert.match(line, /^[A-Z0-9"'].*[.?!]$/, `a whole sentence: ${line}`);
  }
  for (const card of cards) {
    assert.match(townMissionCardMarkup(card), /GO YOURSELF/);
    assert.match(townMissionCardMarkup(card), /NOT NOW/);
  }
  for (const cue of ['town.fire', 'town.spray', 'town.fire.out', 'town.fill', 'town.bell', 'vehicle.crush', 'interface.bonus']) {
    assert.ok(SOUND_BANK[cue], cue);
    if (SOUND_BANK[cue].files) for (const file of SOUND_BANK[cue].files)
      assert.ok(readFileSync(new URL(`../public/assets/audio/${file}`, import.meta.url)).length > 0, file);
  }
});

// ---- The one scripted drive --------------------------------------------------------------------------------------------
// A child's pace: about 30 km/h through the town, slowing well before the fire, steering late (a fifth of a second) and a
// little unevenly, stopping 10 to 18 m short of the flames and holding H. When the tank runs low the child goes to fill up,
// at the nearest water some of the time and at the gate's tap the rest, and fills to a different amount each time. A win is the
// soup kitchen saved; the result also says what else caught and was saved or lost.
function childDrive(seed) {
  const rng = makeRng(seed * 613 + 29), town = fireTown(seed, seed % LAYOUTS.length, rng.int(0, 359));
  const definition = townJobDefinition(town, 'town-fire-first', {seed});
  const step = definition.steps[0];
  const duel = new Duel({seed:1989 + seed, featureFlags:{'wasteland-town':true}});
  duel.state.wastelandGateDiscovered = true;
  setScablandsTownLayout(definition.layout);
  try {
    assert.equal(duel.startArenaEvent({venueId:'scablands', mode:'world-job', job:definition}), true);
    duel.state.cpuDifficulty = 'easy';
    while (duel.state.status === 'countdown') duel.step(dt);
    assert.equal(drivingFireTruck(duel.state), true, 'the player drives the fire truck, so H sprays');
    const pose = () => { const s = duel.state, p = duel.course.worldAt(s.s, s.lateral); return {x:p.x, z:p.z, heading:duel.course.at(s.s).heading + s.headingError}; };
    const cruise = 24 + rng.int(0, 10), wobble = .08 + rng.float() * .12, standoff = 10 + rng.int(0, 8);
    const nearestWater = rng.float() < .6, fillTo = 1800 + rng.int(0, 1200);
    let path = null, goal = null, mode = null, late = [], lastSteer = 0, heard = [], arrivedAt = null, fills = 0, choice = null;
    const plan = (to, toward) => {
      // Come in along the line from `toward` through `to`, so the truck stops nose first.
      const p = pose(), dx = to.x - toward.x, dz = to.z - toward.z, length = Math.hypot(dx, dz) || 1;
      const lead = {x:to.x + dx / length * 18, z:to.z + dz / length * 18};
      path = [{x:p.x, z:p.z}, {x:p.x + Math.sin(p.heading) * 8, z:p.z + Math.cos(p.heading) * 8}, lead, to]; goal = to;
    };
    for (let t = 0; t < 1200; t += dt) {
      if (duel.state.status !== 'racing') break;
      const worldJob = duel.state.arena.worldJob, state = worldJob.job.stepState;
      if (!state.fires) { duel.step(dt); continue; }
      const p = pose();
      const burning = step.buildings.filter(row => state.fires[row.id]?.state === 'burning');
      // Out of water (or nearly): to the water. Else to the fire nearest the truck, the kitchen first.
      if (mode !== 'water' && state.tankL < 60 && burning.length) {
        const points = step.water.filter(point => !(Number.isFinite(point.storeL) && point.storeL - (state.drawn[point.id] ?? 0) < 200));
        const near = points.reduce((best, point) => !best || Math.hypot(point.position.x - p.x, point.position.z - p.z) <
          Math.hypot(best.position.x - p.x, best.position.z - p.z) ? point : best, null);
        choice = nearestWater ? near : points.find(point => point.kind === 'gate') ?? near;
        mode = 'water'; plan(choice.position, {x:p.x, z:p.z});
      }
      if (mode === 'water' && (state.tankL >= Math.min(fillTo, 2999) || state.tankL > 100 && !state.filling && Math.hypot(goal.x - p.x, goal.z - p.z) < 6 &&
          Math.abs(duel.state.speedMph) < .5 && choice && Number.isFinite(choice.storeL) && choice.storeL - (state.drawn[choice.id] ?? 0) <= 0)) {
        mode = null; fills++;
      }
      if (mode !== 'water') {
        const target = burning.find(row => row.id === step.mainId) ?? burning.reduce((best, row) => !best ||
          Math.hypot(row.x - p.x, row.z - p.z) < Math.hypot(best.x - p.x, best.z - p.z) ? row : best, null);
        if (target && mode !== target.id) {
          const dx = target.x - p.x, dz = target.z - p.z, length = Math.hypot(dx, dz) || 1, reach = Math.max(target.halfX, target.halfZ) + standoff;
          mode = target.id; plan({x:target.x - dx / length * reach, z:target.z - dz / length * reach}, {x:target.x, z:target.z});
          path[2] = {x:path[3].x - dx / length * 16, z:path[3].z - dz / length * 16};
        }
      }
      late.push(p); if (late.length > 24) late.shift();
      const seen = late[0], near = nearestOnLine(path, seen.x, seen.z);
      let ahead = near.along + 9, sum = 0, aim = path.at(-1);
      for (let i = 0; i + 1 < path.length; i++) {
        const a = path[i], b = path[i + 1], span = Math.hypot(b.x - a.x, b.z - a.z);
        if (sum + span >= ahead) { const k = (ahead - sum) / span; aim = {x:a.x + (b.x - a.x) * k, z:a.z + (b.z - a.z) * k}; break; }
        sum += span;
      }
      const distance = Math.hypot(goal.x - p.x, goal.z - p.z), kmh = duel.state.speedMph * 1.609344;
      const speed = distance < 2.5 ? 0 : Math.min(cruise, Math.max(5, distance * .6));
      const error = wrapHeading(Math.atan2(aim.x - seen.x, aim.z - seen.z) - seen.heading);
      if (Math.round(t / dt) % 30 === 0) lastSteer = -error * 2 + (rng.float() - .5) * wobble;
      duel.setInput({throttle:kmh < speed - 2 ? 1 : 0, brake:kmh > speed + 3 || speed === 0 && kmh > .3 ? 1 : 0,
        steer:speed === 0 ? 0 : Math.max(-1, Math.min(1, lastSteer)), boost:false});
      // The child holds H once the fire is close.
      const fire = step.buildings.find(row => row.id === mode);
      setJobVehicleSpray(duel, !!fire && Math.hypot(fire.x - p.x, fire.z - p.z) < 45);
      if (fire && distance < 4) arrivedAt ??= duel.state.stageTimeSec;
      duel.step(dt);
      heard.push(...worldJob.job.events.map(event => event.type));
    }
    const worldJob = duel.state.arena.worldJob;
    const won = duel.state.arena.result?.winnerId === 'player' && worldJob.fireResult?.mainSaved === true;
    return {won, result:worldJob.fireResult, seconds:duel.state.stageTimeSec, arrivedAt, fills, heard, town,
      runResult:worldJob.fireResult ? townJobResult(worldJob, `drive-${seed}`) : null, tankL:worldJob.vehicle?.tankL};
  } finally { cleanupWorldJobLoan(duel); clearScablandsTownLayout(); }
}

test('a child-pace driver on Easy saves the soup kitchen at least 8 times in 10, and the town gets the result', () => {
  const drives = Array.from({length:10}, (_, index) => childDrive(index + 1));
  const wins = drives.filter(drive => drive.won).length;
  console.log(`child-pace fire call on Easy: ${wins} of 10 saved the kitchen. Minutes to the fire: ${drives.map(drive => ((drive.arrivedAt ?? NaN) / 60).toFixed(1)).join(', ')}; ` +
    `whole call: ${drives.map(drive => (drive.seconds / 60).toFixed(1)).join(', ')}; fills: ${drives.map(drive => drive.fills).join(', ')}; ` +
    `lost: ${drives.map(drive => drive.result?.lostIds.length ?? '-').join(', ')}; water: ${drives.map(drive => drive.result?.usedL ?? '-').join(', ')} L.`);
  assert.ok(wins >= 8, `${wins} of 10`);
  const drive = drives.find(row => row.won);
  assert.ok(drive.heard.includes('douseSpray') && drive.heard.includes('douseOut') && drive.heard.includes('douseDone'));
  const before = serializeTown(drive.town);
  assert.equal(townMissionResult(drive.town, drive.runResult).settled, true);
  assert.equal(drive.town.story.completed['town.act1.fire'], true);
  assert.notEqual(serializeTown(drive.town), before);
});
