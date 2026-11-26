import assert from 'node:assert/strict';
import hauler from '../src/story/threads/content/stranded-hauler.js';
import {MISSION_KINDS} from '../src/world/open/content/mission-kinds.js';
import {LAND} from '../src/world/scablands-names.js';
import {FEATURE_STATES, createFeatureFlags} from '../src/feature-flags.js';
import {haulerStop, haulerIsTrap, haulerGate, haulerAtGate, haulerPeople} from '../src/world/open/content/stranded-hauler-places.js';
import {haulerTalkScene, haulerGateNews} from '../src/world/open/content/talk-hauler.js';
import {beginOpenLand, stepOpenLand} from '../src/world/open/open-land.js';
import {createThreadsPart, OPEN_THREADS, threadsAtBankedHearth} from '../src/world/open/parts/threads.js';
import {missionsPart} from '../src/world/open/parts/missions.js';
import {applyEffects} from '../src/world/open/open-effects.js';
import {sampleWorld} from '../src/world/open/samples.js';
import {isHeld} from '../src/world/open/holds.js';
import {walkThread} from './thread-crossings.mjs';
import {createHaulerLook} from '../src/world/open/looks/stranded-hauler-look.js';
import {pageSource, pageFunctions, scenarioWorld} from './scenarios/open-stranded-hauler.mjs';
import {Duel} from '../src/game.js';
import {openRoamJob} from '../src/world/open/roam-job.js';
import {placeActor} from '../src/arena/arena-event.js';
import {worldPose} from '../src/arena/arena-floor.js';
import {applyArmorDamage} from '../src/combat-armor.js';
import {checkpointRoadView, roadRiderGoal} from '../src/arena/modes/road-riders.js';
import {worldHudModel} from '../src/world/world-hud.js';

const starts = [LAND.at('tin-town', 50, 50), LAND.at('tin-town', 80, 50)];
const path = [LAND.at('tin-town', 0, 0), LAND.at('tin-town', 0, 2000)];
const place = id => id === 'path' ? path : starts[Number(id)];
const view = {carPosition: path[0], missionHeightAt: () => 0};
for (const [beat, outcomes] of [['trap-fight', ['won', 'lost']], ['trap-from-behind', ['won', 'lost']],
  ['trap-run', ['away', 'caught']], ['escort', ['all-kept', 'some-kept', 'none-kept', 'car-wrecked']]]) {
  const authored = hauler.beats[beat].mission, kind = MISSION_KINDS[authored.kind];
  const mission = {...authored, rule: {...authored.rule, riderStarts: ['0', '1'], path: 'path', load: {count: 40, lostAtATime: 10}}};
  assert.deepEqual(Object.keys(mission.outcomes), outcomes);
  const route = kind.prepare(mission, place);
  assert.ok(route, beat);
  assert.equal(kind.prepare(mission, () => null), null);
  const begun = kind.begin(mission, route, view).state;
  const copy = structuredClone(begun);
  const tick = kind.step(mission, begun, view, 1);
  assert.deepEqual(begun, copy, 'a mission tick is pure');
  if (mission.kind === 'rider-fight') {
    assert.equal(tick.requests.find(row => row.type === 'riders').vehicles.length, 2);
    assert.equal(kind.step(mission, tick.state, {...view, road: {id: 'passing'}}, 1).requests.length, 0);
    assert.equal(kind.step(mission, tick.state, {...view, jobEvents: [{type: 'riderFight', id: mission.id, outcome: 'won'}]}, 1).outcome, 'won');
    assert.equal(kind.step(mission, tick.state, {...view, combatWrecking: true}, 1).outcome, 'lost');
  } else if (mission.kind === 'outrun') {
    assert.equal(kind.step(mission, tick.state, view, 60).outcome, null, 'waiting still is no escape');
    assert.equal(kind.step(mission, tick.state, {...view, carPosition: path[1]}, 60).outcome, 'away');
    assert.equal(kind.step(mission, tick.state, {...view, combatWrecking: true}, 1).outcome, 'caught');
  } else {
    assert.equal(tick.requests.some(row => row.type === 'riders'), false, 'the ridge gives half a minute');
    assert.equal(kind.step(mission, begun, view, 30).requests.find(row => row.type === 'riders').escort, mission.id);
    assert.equal(kind.step(mission, begun, {...view, combatWrecking: true}, 1).outcome, 'car-wrecked');
    assert.ok(!kind.end(mission, begun, {...view, combatWrecking: true}).some(row => row.action === 'recover-car'),
      'an escort without its own tow leaves recovery to the open land');
    for (const [tyres, outcome] of [[40, 'all-kept'], [30, 'some-kept'], [0, 'none-kept']]) {
      const last = {...begun, metres: route.length - .1, tyres};
      assert.equal(kind.step(mission, last, view, 1).outcome, outcome);
    }
    const waiting = {...begun, sentRiders: true};
    let out = kind.step(mission, waiting, view, 0);
    const cart = {id: 'buggy', x: out.state.truck.x, z: out.state.truck.z - 8, speed: out.state.speed};
    const beside = {...view, road: {id: mission.id, cars: [cart]}};
    const events = [];
    for (let tick = 0; tick < 41; tick++) {
      cart.x = out.state.truck.x;
      cart.z = out.state.truck.z - 8;
      out = kind.step(mission, out.state, beside, .1);
      events.push(...out.events);
    }
    assert.equal(out.state.tyres, 30);
    assert.equal(events.find(row => row.moment === 'tyres-lost').cue, 'open.tyres.lost');
    assert.equal(kind.step(mission, out.state, {...beside, road: {id: mission.id, cars: [{...cart, wrecked: true}]}}, 1).state.tyres, 30);
  }
}

const parts = [createThreadsPart([hauler]), missionsPart];
const fixture = (seed = 1, beat = 'sign', effects = []) => {
  const world = applyEffects({...sampleWorld('after-the-smoke'), seed}, {id: 'fixture/hauler', effects: [
    {type: 'thread', id: hauler.id, to: beat, cast: {rumoured: 'radio-hill', burned: 'glasshouse'}}, ...effects,
  ]}).world;
  return beginOpenLand({id: 'open-roam', steps: [{kind: 'roam'}], open: {world}});
};
const tick = (open, point = haulerStop(open.world).truck, dt = .1, extra = {}) => stepOpenLand(open,
  {player: {position: point}, carPosition: point, openRoam: true, checkpointsEnabled: true,
    missionHeightAt: () => 0, ...extra}, dt, parts);
const atBeat = open => open.world.open.threads[hauler.id].beat;
const mark = (open, name) => open.world.ledger.marks.includes(hauler.id + '/' + name);
const bank = open => ({...open, world: {...open.world, ledger: {...open.world.ledger, night: open.world.ledger.night + 1}}});
const seedFor = trap => Array.from({length: 100}, (_, i) => i + 1).find(seed => haulerIsTrap(fixture(seed).world) === trap);
const seen = trap => {
  const open = fixture(seedFor(trap)), stop = haulerStop(open.world);
  let out = tick(open, stop.spots.crest, 2.99);
  assert.equal(atBeat(out.open), 'sign');
  out = tick(out.open, stop.spots.crest, .01);
  assert.equal(atBeat(out.open), trap ? 'trap-road' : 'hauler-road');
  assert.equal(out.events[0].cue, 'open.hauler.seen');
  assert.equal(out.requests.filter(row => row.type === 'say').length, 2);
  return tick(out.open, stop.spots.crest).open;
};
assert.ok(OPEN_THREADS.includes(hauler));
// Direct only this storyline, so another loaded storyline cannot take its place at a hearth.
const direct = (world, view) => threadsAtBankedHearth({world, view}, [hauler]);
const fromHearth = Array.from({length: 30}, (_, index) => direct({...sampleWorld('after-the-smoke'), seed: index + 1}));
assert.ok(fromHearth.some(world => world.open.threads[hauler.id]?.beat === 'sign'));
assert.ok(fromHearth.every(world => !world.open.threads['dry-pump'] && !world.open.threads['somebody-elses-flag']));
assert.equal(FEATURE_STATES['story-choices'], 'dev');
assert.equal(createFeatureFlags({qa: false, storage: null, search: ''}).enabled('story-choices'), false);
assert.deepEqual(walkThread(hauler).faults, []);
assert.deepEqual(haulerStop(fixture(1).world), haulerStop(fixture(1).world), 'the checkpoint draw repeats');
const far = fixture();
assert.equal(tick(far, LAND.at('yard'), 10).requests.filter(row => ['say', 'marker'].includes(row.type)).length,
  0, 'there is no distant label or marker');

let trapped = seen(true), stop = haulerStop(trapped.world);
trapped = tick(trapped, stop.spots.crest, 2).open;
assert.ok(mark(trapped, 'found/waving') && mark(trapped, 'found/load'));
assert.ok(!mark(trapped, 'found/doors'));
trapped = tick(trapped, stop.spots.verge, 2).open;
assert.ok(mark(trapped, 'found/ground') && mark(trapped, 'found/doors') && mark(trapped, 'found/tracks'));
assert.ok(!mark(tick(trapped, stop.spots['high-ground'], 2).open, 'found/behind'), 'the slag is read on foot');
trapped = tick(trapped, stop.spots['high-ground'], 2, {onFoot: true}).open;
assert.ok(mark(trapped, 'saw-the-trap-first'));
const warned = tick(trapped, stop.spots['high-ground'], .1, {onFoot: true,
  jobEvents: [{type: 'openTalkQuestion', scene: hauler.id + '/radio', id: 'warn-the-road'}]}).open;
assert.ok(mark(warned, 'warned-the-road'), 'asking the warning writes its effects');
assert.equal(atBeat(tick(trapped, stop.spots['high-ground'], 6, {onFoot: true}).open), 'trap-fight');
const shut = tick(trapped, stop.truck).open;
assert.equal(atBeat(shut), 'trap-shut');
const greeted = tick(shut, stop.truck).open;
const paid = tick(greeted, stop.truck, .1, {interact: true}).open;
assert.equal(atBeat(paid), 'between');
assert.ok(mark(paid, 'paid-the-trap'));
assert.equal(paid.world.scrap, Math.max(0, greeted.world.scrap - 40));
const repeated = tick(bank(bank(paid)), stop.spots.back).open;
assert.equal(atBeat(repeated), 'sign');
assert.notEqual(haulerStop(repeated.world).road, stop.road, 'the next truck is on another road');
assert.equal(haulerIsTrap(repeated.world), false);
const second = tick(repeated, haulerStop(repeated.world).spots.crest, 3);
assert.equal(atBeat(second.open), 'hauler-road');
assert.equal(second.requests.filter(row => row.type === 'say').length, 3, 'the second truck remembers the trap');
let readingAgain = tick(second.open, haulerStop(second.open.world).spots.crest).open;
readingAgain = tick(readingAgain, haulerStop(readingAgain.world).spots.crest, .5).open;
assert.equal(mark(readingAgain, 'found/waving/again'), false, 'the second truck must be read afresh');
readingAgain = tick(readingAgain, haulerStop(readingAgain.world).spots.crest, 1.5).open;
assert.ok(mark(readingAgain, 'found/waving/again'));
const secondAlone = fixture(1, 'parted', ['second-truck', 'helped', 'entered/alone/again'].map(name =>
  ({type: 'mark', id: hauler.id + '/' + name})));
assert.ok(haulerTalkScene(hauler.id + '/later/tally-left-the-ridge', {world: secondAlone.world}),
  'Tally remembers being left alone after the second truck');

for (const [beat, outcome, expected] of [['trap-fight', 'won', 'trap-broken'], ['trap-fight', 'lost', 'lost-to-the-trap'],
  ['trap-from-behind', 'won', 'trap-broken'], ['trap-from-behind', 'lost', 'lost-to-the-trap'],
  ['trap-run', 'away', 'ran-from-the-trap'], ['trap-run', 'caught', 'lost-to-the-trap'],
  ['escort', 'all-kept', 'load-saved'], ['escort', 'some-kept', 'load-saved'],
  ['escort', 'none-kept', 'load-lost'], ['escort', 'car-wrecked', 'towed-by-patience']]) {
  let run = tick(fixture(1, beat)).open;
  assert.ok(isHeld(run.holds, 'checkpoints') && isHeld(run.holds, 'signs'), beat);
  const active = run.parts.missions.active;
  const kind = MISSION_KINDS[active.mission.kind];
  const leaving = tick(run, undefined, .1, {missionLeaving: true});
  assert.equal(leaving.events.at(-1).type, 'threadMissionCancelled');
  assert.equal(isHeld(leaving.open.holds, 'checkpoints'), false);
  let finish;
  if (active.mission.kind === 'rider-fight') finish = tick(run, undefined, .1, {
    jobEvents: [{type: 'riderFight', id: active.id, outcome}]});
  else if (active.mission.kind === 'outrun') finish = tick(run, LAND.at('tin-town', 0, 3000), 61,
    outcome === 'caught' ? {combatWrecking: true} : {});
  else {
    const tyres = outcome === 'some-kept' ? 30 : outcome === 'none-kept' ? 0 : 40;
    run = {...run, parts: {...run.parts, missions: {active: {...active,
      state: {...active.state, tyres, metres: active.state.route.length - .1}}}}};
    finish = tick(run, undefined, 1, outcome === 'car-wrecked' ? {combatWrecking: true} : {});
  }
  assert.equal(finish.events.at(-1).outcome, outcome);
  assert.equal(isHeld(finish.open.holds, 'signs'), false);
  const finished = tick(finish.open).open;
  assert.ok(mark(finished, expected), beat + '/' + outcome);
  if (outcome === 'won') assert.equal(finished.world.scrap, run.world.scrap + 30);
  if (outcome === 'all-kept' || outcome === 'some-kept') assert.equal(finished.world.ledger.words.tally, 'Sworn');
  assert.deepEqual(tick(finished).open.world.scrap, finished.world.scrap, 'an outcome pays once');
  assert.ok(kind);
}

let helped = seen(false); stop = haulerStop(helped.world);
helped = tick(helped, stop.truck).open;
assert.equal(atBeat(helped), 'hauler');
helped = tick(helped, stop.spots.axle, .1, {onFoot: true}).open;
assert.equal(atBeat(helped), 'hauler', 'entering the beat does not mend it');
helped = tick(helped, stop.spots.axle, 11, {onFoot: true, wrench: true}).open;
assert.equal(atBeat(helped), 'hauler');
helped = tick(helped, stop.spots.axle, 1, {onFoot: true, wrench: true}).open;
assert.equal(atBeat(helped), 'owing');
assert.equal(helped.world.ledger.words.tally, 'Friendly');
assert.ok(helped.world.ledger.obligations.some(row => row.id === hauler.id + '/tally-owes'));
assert.ok(mark(helped, 'helped'));
assert.equal(haulerPeople(helped.world, {checkpointsEnabled: true})[0].talk, null,
  'the return talk cannot interrupt the first invitation');
for (const choice of ['gate', 'one-gate', 'no-debt']) {
  let run = tick(helped, stop.spots.axle, .1, {onFoot: true}).open;
  run = tick(run, stop.spots.axle, .1, {onFoot: true, jobEvents: [{type: 'talkChoice',
    id: hauler.id + '/owing/decision/' + choice}]}).open;
  assert.equal(atBeat(run), 'ridge');
  assert.equal(mark(run, 'gate-open'), choice !== 'no-debt');
  assert.equal(mark(run, 'one-gate-only'), choice === 'one-gate');
  run = tick(run, stop.spots.axle).open;
  run = tick(run, stop.spots.back).open;
  assert.equal(atBeat(run), 'alone');
  run = tick(run).open;
  run = tick(run).open;
  run = tick(run).open;
  if (choice === 'no-debt') {
    assert.equal(run.world.open.threads[hauler.id].end, 'her-own-way');
    assert.ok(haulerTalkScene(hauler.id + '/later/tally-on-the-road', {world: run.world}));
  } else {
    assert.equal(atBeat(run), 'gate');
    assert.equal(haulerAtGate(run.world), false);
    run = bank(run);
    assert.ok(haulerAtGate(run.world));
    run = tick(run, haulerGate).open;
    assert.ok(mark(run, 'entered/gate'));
    const news = haulerGateNews({world: run.world});
    assert.ok(news.questions.some(row => row.id === 'free-news'));
    run = tick(run, haulerGate, .1, {onFoot: true, jobEvents: [{type: 'openTalkQuestion', scene: hauler.id + '/radio', id: 'free-news'}]}).open;
    assert.ok(run.world.ledger.marks.includes('rumour/radio-hill'));
    run = tick(run, LAND.at('yard')).open;
    assert.equal(run.world.open.threads[hauler.id].end, choice === 'gate' ? 'at-the-gate' : 'one-gate-only');
    const leak = haulerTalkScene(hauler.id + '/later/tally-told-sump-of-the-fire', {world: run.world});
    assert.equal(!!leak, choice === 'gate');
    assert.equal(haulerAtGate(bank(run).world), false);
    assert.equal(haulerAtGate(bank(bank(bank(run))).world), true);
  }
}
for (const trap of [true, false]) {
  const open = seen(trap), ignored = tick(bank(bank(open))).open;
  assert.equal(trap ? atBeat(ignored) : ignored.world.open.threads[hauler.id].end,
    trap ? 'between' : 'left-on-the-road');
}
const visuals = createHaulerLook(), drawn = seen(false), before = structuredClone(drawn);
visuals.update(drawn, haulerStop(drawn.world).truck, 5);
assert.ok(visuals.root.visible && visuals.root.getObjectByName('Patience'));
assert.deepEqual(drawn, before, 'drawing does not change the world');
visuals.dispose();
for (const name of Object.keys(pageFunctions)) new Function('return ' + pageSource(name, {}, [], 'test'));
assert.equal(haulerIsTrap(scenarioWorld()), false);
assert.equal(haulerStop(scenarioWorld()).road, 'boneyard-road');
const native = (world, on = true) => {
  const duel = new Duel({seed: world.seed, featureFlags: {'hidden-road': true, 'story-choices': on,
    'scablands-realism': true, arsenal: true}});
  duel.state.wastelandGateDiscovered = true;
  assert.ok(duel.startArenaEvent({seed: world.seed, venueId: 'scablands', mode: 'world-job',
    car: 'falcone_f42', cpuDifficulty: 'easy', opponents: [], job: {...openRoamJob({}, world.seed), open: {world}}}));
  while (duel.state.status === 'countdown') duel.step(1 / 60);
  return duel;
};
const placeNative = (duel, at, heading = haulerStop(duel.state.arena.worldJob.open.world).truck.heading) => {
  duel.state.onFoot = false;
  duel.state.fighter = null;
  const near = duel.course.nearest(at.x, at.z);
  placeActor(duel, duel.state, {...near, headingError: heading - duel.course.at(near.s).heading, height: near.y});
};
const drive = native(scenarioWorld());
const nativeStop = haulerStop(scenarioWorld());
placeNative(drive, nativeStop.spots.crest);
for (let tick = 0; tick < 200; tick++) drive.step(1 / 60);
assert.equal(atBeat(drive.state.arena.worldJob.open), 'hauler-road', 'the real ground lets the truck be seen');
placeNative(drive, nativeStop.spots.passed);
drive.state.speedMph = 20;
drive.step(1 / 60);
assert.equal(drive.state.arena.worldJob.open.world.open.threads[hauler.id].end, 'left-on-the-road');
for (const beat of ['trap-fight', 'trap-from-behind', 'escort']) {
  const duel = native(fixture(12, beat).world), job = duel.state.arena.worldJob;
  placeNative(duel, haulerStop(job.open.world).spots.crest);
  for (let tick = 0; tick < 3; tick++) duel.step(1 / 60);
  if (beat === 'escort') {
    job.open.parts.missions.active.state.elapsed = 30;
    duel.step(1 / 60);
  }
  assert.equal(duel.state.opponents.length, 2, 'a mission spawns two native cars');
  assert.ok(duel.state.opponents.every(car => car.roadRider.fightToEnd));
  if (beat === 'escort') {
    assert.ok(duel.state.opponents.every(car => !car.weaponLoadout.length), 'the thieves do not shoot Patience');
    assert.equal(worldHudModel({worldJob: job}).line, 'There are 40 tyres on the cart.', 'the load stays on screen');
    const car = duel.state.opponents[0], goal = roadRiderGoal(duel, car, 1 / 60);
    assert.ok(Math.hypot(goal.x - job.open.parts.missions.active.state.truck.x,
      goal.z - job.open.parts.missions.active.state.truck.z) < 35, 'the thieves drive at the cart');
  } else {
    if (beat === 'trap-from-behind') assert.equal(duel.state.opponents[0].armor, 1, 'the first buggy is caught standing');
    for (const car of duel.state.opponents) while (!car.combatWrecking)
      applyArmorDamage(duel, car, 'fixed', {amount: 100, owner: 'player'});
    for (let tick = 0; tick < 10; tick++) duel.step(1 / 60);
    assert.ok(mark(job.open, 'trap-broken'), 'native wrecks finish the authored fight');
  }
  const road = checkpointRoadView(duel, job).road;
  if (road) assert.ok(road.cars.every(car => typeof car.id === 'string' && typeof car.wrecked === 'boolean'));
}
const off = native(scenarioWorld(), false);
placeNative(off, nativeStop.spots.crest);
for (let tick = 0; tick < 200; tick++) off.step(1 / 60);
assert.equal(off.state.opponents.length, 0, 'the off switch adds no native cars');
assert.equal(atBeat(off.state.arena.worldJob.open), 'sign', 'the off switch leaves the storyline alone');
console.log('test-open-stranded-hauler: passed');
