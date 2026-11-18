import assert from 'node:assert/strict';
import {createJob, stepJob} from '../src/world/jobs/job-engine.js';
import {BELLOWS_RULE, BELLOWS_LINES, bellowsPay, bellowsSentence,
  stepBellowsLoad, bellowsAshBox, stepBellowsAsh, bellowsThiefSpeedKmh,
  bellowsBlockingSide, bellowsBlockingMove, stepBellowsPursuit, stepBellowsEnding,
  bellowsWreckRoute} from '../src/world/jobs/bellows-rule.js';
import {BONEYARD_WRECKS, boneyardWrecks} from '../src/world/boneyard-wrecks.js';
import {LAND} from '../src/world/scablands-names.js';
import {SCABLANDS_SOLIDS} from '../src/world/scablands-solids.js';
import {ROAD_NET} from '../src/world/scablands-road.js';
import {sweepObstacle, CAR_HALF_WIDTH} from '../src/collision.js';

// Job 3.4: prove whole segments clear, rather than sampling points or driving.
const wreckSnapshot = JSON.stringify(BONEYARD_WRECKS);
const entry = ROAD_NET.road('tin-road').points[0];
const exit = LAND.at('boneyard', -284, 166);
const wreckRoute = bellowsWreckRoute(BONEYARD_WRECKS, entry, exit);
const clearance = Math.max(CAR_HALF_WIDTH, BELLOWS_RULE.thiefRadiusMetres) + BELLOWS_RULE.sideClearanceMetres;
for (const points of [wreckRoute.line, wreckRoute.wide]) {
  assert.deepEqual(points[0], {x:entry.x, z:entry.z});
  assert.deepEqual(points.at(-1), exit);
  for (let index = 1; index < points.length; index++) {
    for (const solid of SCABLANDS_SOLIDS) {
      assert.equal(sweepObstacle(points[index - 1], points[index], solid, 0,
        {halfWidth:clearance, halfLength:clearance}), null,
      `Segment ${index} needs the car width and one metre clear of ${solid.id}.`);
    }
  }
}
const turns = wreckRoute.line.slice(1, -1).map((point, index) => {
  const from = wreckRoute.line[index], to = wreckRoute.line[index + 2];
  const ax = point.x - from.x, az = point.z - from.z, bx = to.x - point.x, bz = to.z - point.z;
  return Math.acos(Math.max(-1, Math.min(1, (ax * bx + az * bz) /
    (Math.hypot(ax, az) * Math.hypot(bx, bz))))) * 180 / Math.PI;
});
assert(turns.filter(degrees => degrees >= BELLOWS_RULE.wreckTurnDegrees).length >= BELLOWS_RULE.wreckTurnCount);
// Each designated end is passed exactly 2.5 m clear, using that box's size.
for (const [id, segment, end] of [['east', 2, 'south'], ['north', 4, 'north'], ['south', 6, 'south']]) {
  const wreck = BONEYARD_WRECKS.find(row => row.id === id);
  const z = wreck.z + (end === 'north' ? -1 : 1) * wreck.size[2] / 2;
  for (const point of wreckRoute.line.slice(segment, segment + 2))
    assert.equal(Math.abs(point.z - z), BELLOWS_RULE.wreckEndClearanceMetres);
}
assert(wreckRoute.wideExtraMetres > 0);
assert.deepEqual(bellowsWreckRoute(BONEYARD_WRECKS, entry, exit), wreckRoute);
assert.equal(JSON.stringify(BONEYARD_WRECKS), wreckSnapshot);
// Moving the land moves the route with it; no absolute world coordinates.
const movedLand = {at:(id, dx = 0, dz = 0) => {
  const p = LAND.at(id, dx, dz); return {x:p.x + 137, z:p.z - 211};
}};
const shifted = bellowsWreckRoute(boneyardWrecks(movedLand),
  {x:entry.x + 137, z:entry.z - 211}, {x:exit.x + 137, z:exit.z - 211});
for (let index = 0; index < wreckRoute.line.length; index++)
  assert.deepEqual(shifted.line[index], {x:wreckRoute.line[index].x + 137, z:wreckRoute.line[index].z - 211});
assert(Math.abs(shifted.wideExtraMetres - wreckRoute.wideExtraMetres) < 1e-9);
console.log(`PASS Run Him Down: wreck ends clear by 2.5 m, ${turns.filter(degrees => degrees >= 40).length} turns, every segment clears all solids; wide way adds ${wreckRoute.wideExtraMetres.toFixed(1)} m.`);

// Job 3.2: speed, attempted passes and each sack's six-second road-width box.
assert.equal(bellowsThiefSpeedKmh(200, false), 195);
assert.equal(bellowsThiefSpeedKmh(130, false), 125);
assert.equal(bellowsThiefSpeedKmh(200, true), 60);
for (const [along, side, expected] of [
  [-30, -2, -1], [-30, 2, 1], [-30.01, 2, 0], [0, 2, 1], [0.01, 2, 0], [-5, 0, 0],
]) assert.equal(bellowsBlockingSide(along, side), expected);
const cloud = Object.freeze(bellowsAshBox('first', {x: 10, z: 20, heading: 0.7}, 12));
assert.deepEqual(cloud, {id: 'first', x: 10, z: 20, yaw: 0.7,
  length: 30, width: 12, remaining: 6});
const aged = stepBellowsAsh([cloud], 5);
assert.equal(aged[0].remaining, 1);
assert.equal(cloud.remaining, 6);
assert.deepEqual(stepBellowsAsh(aged, 1), []);
console.log('PASS Run Him Down: road speed, passing side and ash box lifetime.');

// Blocking reads the attempted pass in the road's frame, at any heading.
// These are one-step facts, without scripted controls or a driving route.
for (const heading of [0, .7, Math.PI / 2, Math.PI]) {
  const f = {x:Math.sin(heading), z:Math.cos(heading)};
  const r = {x:f.z, z:-f.x};
  const point = (along, across) => ({x:100 + f.x * along + r.x * across,
    z:200 + f.z * along + r.z * across});
  for (const side of [-1, 1]) {
    const from = Object.freeze(point(50, 0)), proposed = Object.freeze(point(51, 0));
    const moved = bellowsBlockingMove(from, proposed, point(0, 0), point(100, 0), point(30, side * 4), 12, .5);
    assert(Math.abs((moved.x - proposed.x) * r.x + (moved.z - proposed.z) * r.z - side) < 1e-9);
    assert(Math.abs((moved.x - proposed.x) * f.x + (moved.z - proposed.z) * f.z) < 1e-9);
    for (const along of [19.9, 50.1]) assert.deepEqual(
      bellowsBlockingMove(from, proposed, point(0, 0), point(100, 0), point(along, side * 4), 12, .5), proposed);
    const edge = bellowsBlockingMove(from, proposed, point(0, 0), point(100, 0), point(30, side * 40), 12, 10);
    assert(Math.abs((edge.x - proposed.x) * r.x + (edge.z - proposed.z) * r.z - side * (6 - BELLOWS_RULE.thiefRadiusMetres)) < 1e-9);
    const aligned = point(51, side * 4);
    assert.deepEqual(bellowsBlockingMove(point(50, side * 4), aligned, point(0, 0), point(100, 0), point(30, side * 4), 12, 1), aligned);
    for (const [player, width, dt] of [[null, 12, 1], [point(30, 4), 12, 0], [point(30, 4), 2, 1]])
      assert.deepEqual(bellowsBlockingMove(from, proposed, point(0, 0), point(100, 0), player, width, dt), proposed);
  }
}
console.log('PASS Run Him Down: blocking follows either passing side within the road and the 30 m approach.');

// Job 3.3 and 3.6: snapshots of contacts and loads, never a driving script.
const tick = (state = {}, facts = {}, dt = 0) => stepBellowsLoad(state, facts, dt);
assert.equal(tick().state.bellows, 100);
assert.equal(tick({}, {}, 10).state.bellows, 100);
const scorched = tick({}, {flameContact: true}, 2);
assert.equal(scorched.state.bellows, 70);
assert.deepEqual(scorched.events, [{type: 'say', lineId: 'bellows.warning'}]);
assert.equal(tick(scorched.state, {flameContact: true}, 10).state.bellows, 0);
assert.equal(tick(scorched.state, {flameContact: true}, 1).events.length, 0);
assert.equal(tick({}, {behindMetres: 100}).events[0].lineId, 'bellows.warning');
assert.equal(tick({}, {behindMetres: 100.01}).events.length, 0);
assert.equal(tick({}, {behindMetres: -1}).events.length, 0);
assert.equal(BELLOWS_LINES.warning, 'Cinder: Not the flamethrower! Leather burns.');

const hard = {carContact: true, carGapMetres: 3, meetingKmh: 20};
assert.equal(tick({}, {...hard, meetingKmh: 19.99}).state.knocks, 0);
let state = tick({}, hard).state;
assert.equal(state.knocks, 1);
assert.equal(tick(state, hard, 10).state.knocks, 1);
state = tick(state, {carGapMetres: 8}).state;
assert.equal(tick(state, hard).state.knocks, 1, 'Eight metres still holds the meeting.');
state = tick(state, {carGapMetres: 8.01}).state;
state = tick(state, hard).state;
assert.equal(state.knocks, 2);
state = tick(state, {carGapMetres: 9}).state;
const stopped = tick(state, hard);
assert.equal(stopped.state.knocks, BELLOWS_RULE.stopKnocks);
assert.equal(stopped.state.thiefStopped, true);
assert.equal(stopped.events.at(-1).type, 'thiefStopped');
assert.deepEqual(tick(stopped.state, {flameContact: true}, 9).state, stopped.state);
const soft = tick({}, {...hard, meetingKmh: 1}).state;
assert.equal(tick(soft, hard).state.knocks, 0, 'A soft touch must separate before a new knock.');
const wall = {solidContact: true, solidImpactKmh: 20};
state = tick({}, wall).state;
assert.equal(state.knocks, 1);
assert.equal(tick(state, wall).state.knocks, 1);
state = tick(state, {}).state;
assert.equal(tick(state, wall).state.knocks, 2);
assert.equal(tick({}, {...hard, ...wall}).state.knocks, 1);
assert.equal(tick({}, {...wall, solidImpactKmh: 19.99}).state.knocks, 0);
for (const [condition, pay, sentence] of [
  [100, 120, 'The bellows came back whole.'], [80, 120, 'The bellows came back whole.'],
  [79.99, 80, 'The bellows will patch.'], [40, 80, 'The bellows will patch.'],
  [39.99, 50, 'The bellows are scorched.'], [0, 50, 'The bellows are scorched.'],
]) {
  assert.equal(bellowsPay(condition), pay);
  assert.equal(bellowsSentence(condition), sentence);
}
const before = Object.freeze({bellows: 90, knocks: 1});
assert.deepEqual(tick(before, hard), tick(before, hard));
assert.deepEqual(before, {bellows: 90, knocks: 1});
// Flame costs depend on elapsed contact time, not how many frames are drawn.
let partitioned = {};
for (let frame = 0; frame < 120; frame++)
  partitioned = tick(partitioned, {flameContact: true}, 1 / 120).state;
assert(Math.abs(partitioned.bellows - tick({}, {flameContact: true}, 1).state.bellows) < 1e-9);
assert.equal(tick({}, {flameContact: true}, 0).state.bellows, 100);
const softWall = tick({}, {...wall, solidImpactKmh: 1}).state;
assert.equal(tick(softWall, wall).state.knocks, 0, 'Leaning against a solid is one meeting too.');
console.log('PASS Run Him Down: load, warning, separate meetings, three knocks and result boundaries.');

// Job 3.2 and 3.5: rules snapshots cross sack marks and reach the furnace.
const roadFacts = {roadMetres: 0, roadWidthMetres: 28, furnaceMetres: 1000,
  sackPoints: [{x: 10, z: 20, heading: 1}, {x: 30, z: 40, heading: 2}]};
const pursue = (state, facts = {}, dt = 0) => stepBellowsPursuit(state, {...roadFacts, ...facts}, dt);
assert.equal(pursue({}, {roadMetres: 799.99}).state.clouds.length, 0);
let pursuit = pursue({}, {roadMetres: 800});
assert.deepEqual(pursuit.state.sacksThrown, [0]);
assert.deepEqual(pursuit.events, [{type: 'thiefAsh', id: 'thief-ash-0'}]);
assert.equal(pursuit.state.clouds[0].width, 28);
const firstSack = pursuit.state;
pursuit = pursue(firstSack, {roadMetres: 800}, 6);
assert.deepEqual(pursuit.events, []);
assert.deepEqual(pursuit.state.clouds, []);
assert.equal(firstSack.clouds[0].remaining, 6, 'Stepping must not age the earlier snapshot.');
pursuit = pursue(pursuit.state, {roadMetres: 1600});
assert.deepEqual(pursuit.state.sacksThrown, [0, 1]);
assert.equal(pursuit.state.clouds[0].x, 30);
assert.equal(pursue({}, {roadMetres: 2000}).state.clouds.length, 2);
assert.equal(pursue({}, {furnaceMetres: 400.01}).requests.length, 0);
pursuit = pursue(pursuit.state, {furnaceMetres: 400});
assert.deepEqual(pursuit.requests, [{type: 'bellowsRiders'}]);
assert.equal(pursue(pursuit.state, {furnaceMetres: 100}).requests.length, 0);
assert.equal(pursue(pursuit.state, {furnaceMetres: 30.01}).events.length, 0);
const loadedChase = {...pursuit.state, bellows: 37, knocks: 2, meetingHeld: true, solidHeld: true};
const restarted = pursue(loadedChase, {furnaceMetres: 30});
assert.equal(restarted.state.bellows, 37);
assert.equal(restarted.state.knocks, 2);
assert.equal(restarted.state.ridersStarted, true);
assert.deepEqual(restarted.state.sacksThrown, [0, 1]);
assert.deepEqual(restarted.state.clouds, []);
assert.equal(restarted.state.meetingHeld, false);
assert.equal(restarted.state.solidHeld, false);
assert.deepEqual(restarted.requests, [{type: 'say', lineId: 'bellows.restart'},
  {type: 'bellowsRestart', leadMetres: 150}]);
assert.equal(pursue({...loadedChase, thiefStopped: true}, {furnaceMetres: 0}).requests.length, 0);
console.log('PASS Run Him Down: two sacks, furnace riders and restart preserve the load.');

// Job 3.6: the player must collect the bellows; proximity while walking or
// driving through the circle cannot bank the load or send the furnace away.
const endingFacts = {onFoot: false, playerSpeedKmh: 0, carGapMetres: 8};
const end = (state, facts = {}, dt = 0) => stepBellowsEnding(state, {...endingFacts, ...facts}, dt);
assert.equal(end({}).complete, false);
const captured = {thiefStopped: true, bellows: 70, knocks: 3};
for (const facts of [{onFoot: true}, {playerSpeedKmh: 1}, {playerSpeedKmh: -1}, {carGapMetres: 8.01}]) {
  const waiting = end(captured, facts, 9);
  assert.equal(waiting.complete, false);
  assert.equal(waiting.state.bellowsLoaded, undefined);
  assert.deepEqual(waiting.requests, [{type: 'bellowsThiefFlee'}]);
}
let ending = end(captured, {}, 0);
assert.equal(ending.complete, false);
assert.deepEqual(ending.events, [{type: 'bellowsLoaded'}]);
assert.deepEqual(ending.requests, [{type: 'bellowsThiefFlee'}, {type: 'bellowsFurnaceLeave'},
  {type: 'say', lineId: 'story.ember.cinder.22'}]);
ending = end(ending.state, {}, 8.99);
assert.equal(ending.complete, false);
assert.deepEqual(ending.requests, []);
ending = end(ending.state, {}, .01);
assert.equal(ending.complete, true);
assert.deepEqual(ending.events, [{type: 'bellowsArrived', bellows: 70, knocks: 3,
  pay: 80, sentence: 'The bellows will patch.'}]);
assert.deepEqual(end(ending.state, {}, 10).events, []);
const lateCollection = end(end(captured, {carGapMetres: 100}, 20).state);
assert.equal(lateCollection.complete, true);
assert.equal(lateCollection.events.filter(event => event.type === 'bellowsArrived').length, 1);
assert.deepEqual(end(Object.freeze(captured)), end(Object.freeze(captured)));
console.log('PASS Run Him Down: theft escape, collection, furnace departure and nine-second ending.');

// Exercise the ordinary job engine with snapshots, without a driver. The
// bellows chase must not inherit the old health, contact or leash shortcuts.
const chaseStep = {kind: 'chase', bellows: true, targetId: 'thief',
  path: [{position: {x: 0, z: 0}}, {position: {x: 2000, z: 0}}]};
const chaseView = {onFoot: false, speedKmh: 0, carPosition: {x: 0, z: 0},
  player: {position: {x: 0, z: 0}},
  actors: [{id: 'thief', health: 0, position: {x: 3, z: 0}}], contact: 'thief',
  bellows: {...roadFacts, playerTopSpeedKmh: 200}};
let chase = createJob({steps: [chaseStep]}, 17);
const missing = stepJob(chase, {...chaseView, actors: []}, 100);
assert.equal(missing.done, false);
assert.equal(missing.stepState.bellows, undefined);
assert.equal(missing.requests.find(request => request.type === 'follow').speed, 0);
chase = stepJob(chase, chaseView);
assert.equal(chase.done, false, 'Health zero and proximity cannot stop the thief.');
assert.equal(chase.stepState.knocks, 0);
assert.equal(chase.requests.find(request => request.type === 'follow').speed, 195 / 3.6);
assert.equal(chase.requests.find(request => request.type === 'follow').actorId, 'thief');
chase = stepJob(chase, {...chaseView, carPosition: {x: -10000, z: 0}});
assert.equal(chase.failedStep, false, 'The bellows chase has no old distance leash.');
const warning = stepJob(chase, {...chaseView,
  bellows: {...chaseView.bellows, flameContact: true}}, 1);
assert.equal(warning.stepState.bellows, 85);
assert(warning.requests.some(request => request.type === 'say' && request.lineId === 'bellows.warning'));
for (let knock = 0; knock < 3; knock++) {
  chase = stepJob(chase, {...chaseView, bellows: {...chaseView.bellows, ...hard}});
  assert.equal(chase.stepState.knocks, knock + 1);
  if (knock < 2) chase = stepJob(chase, {...chaseView, carPosition: {x: -10, z: 0}});
}
assert.equal(chase.done, false);
assert.equal(chase.stepState.bellowsLoaded, true);
assert.equal(chase.requests.find(request => request.type === 'follow').speed, 0);
assert(chase.requests.some(request => request.type === 'bellowsThiefFlee'));
chase = stepJob(chase, chaseView, 9);
assert.equal(chase.done, true);
assert(chase.events.some(event => event.type === 'bellowsArrived' && event.knocks === 3));
assert(chase.events.some(event => event.type === 'done'));
assert.equal(chaseView.actors[0].health, 0, 'The rule never writes into an actor snapshot.');
let retry = stepJob(createJob({steps: [chaseStep]}), {...chaseView,
  bellows: {...chaseView.bellows, flameContact: true, furnaceMetres: 30}}, 2);
assert.equal(retry.failedStep, false, 'Restarting the route must not reset the job state.');
assert.equal(retry.stepState.bellows, 70);
assert(retry.requests.some(request => request.type === 'bellowsRestart' && request.leadMetres === 150));
assert(retry.requests.some(request => request.type === 'say' && request.lineId === 'bellows.warning'));
assert(retry.stepState.lineQueue.includes('bellows.restart'), 'The warning stays ahead of the restart caption.');
retry = stepJob(retry, chaseView, 2.2);
assert(retry.requests.some(request => request.type === 'say' && request.lineId === 'bellows.restart'));
const finalKnock = createJob({steps: [chaseStep]});
finalKnock.stepState = {bellows: 70, knocks: 2};
retry = stepJob(finalKnock, {...chaseView,
  bellows: {...chaseView.bellows, ...hard, furnaceMetres: 30}});
assert.equal(retry.stepState.thiefStopped, true);
assert.equal(retry.stepState.bellows, 70);
assert(!retry.requests.some(request => request.type === 'bellowsRestart'),
  'A third knock wins before the same step can restart at the furnace.');
console.log('PASS Run Him Down: existing chase engine uses knocks, captions, collection and hold.');

// Job 3.3: the gauge reads the load before boarding, during the chase and
// through collection. It must never change the rule state it presents.
const {worldHudModel, drawBellowsGauge} = await import('../src/world/world-hud.js');
for (const onFoot of [true, false]) {
  for (const condition of [undefined, 100, 79, 40, 0]) {
    const ruleState = Object.freeze(condition === undefined ? {} : {bellows: condition, bellowsLoaded: true});
    const job = Object.freeze({steps: [chaseStep], stepIndex: 0, stepState: ruleState});
    const worldJob = Object.freeze({job, actors: chaseView.actors});
    const before = JSON.stringify(worldJob);
    const hud = worldHudModel({worldJob, onFoot});
    assert.deepEqual(hud.bellows, {value: condition ?? 100, max: 100});
    assert.equal(JSON.stringify(worldJob), before);
    const removed = [], properties = {}, attributes = {};
    const gauge = {style: {setProperty: (name, value) => { properties[name] = value; }},
      classList: {remove: (...names) => removed.push(...names)},
      setAttribute: (name, value) => { attributes[name] = value; }};
    const bar = {style: {}}, label = {}, note = {};
    drawBellowsGauge(hud.bellows, gauge, bar, label, note);
    assert.equal(label.textContent, 'BELLOWS');
    assert.equal(bar.style.width, `${(condition ?? 100).toFixed(1)}%`);
    assert.equal(note.textContent, `${condition ?? 100} / 100`);
    assert.equal(attributes['aria-label'], bellowsSentence(condition ?? 100));
    assert.deepEqual(removed, ['is-out', 'is-losing', 'is-flashing']);
    assert.equal(properties['--ember-glow'], ((condition ?? 100) / 100).toFixed(2));
  }
}
assert.equal(worldHudModel().bellows, null);
assert.equal(worldHudModel({worldJob: {job: {steps: [{kind:'chase'}], stepIndex:0,
  stepState: {bellows: 50}}}}).bellows, null);
console.log('PASS Run Him Down: bellows gauge shows the rule load and clears ember styles without changing rules.');

// Job 3.1: start through the real arena path, with memory-only saves. No
// scripted walking is needed to prove the existing fighter can return to the car.
const {App} = await import('../src/app.js');
const {createFeatureFlags} = await import('../src/feature-flags.js');
const {EVERBURN_JOBS} = await import('../src/world/jobs/everburn.js');
const {stepFootTransition, fighterDistanceToCar} = await import('../src/onfoot-transition.js');
const memory = new Map();
globalThis.localStorage = {getItem:key => memory.get(key) ?? null,
  setItem:(key, value) => memory.set(key, String(value)), removeItem:key => memory.delete(key)};
globalThis.cancelAnimationFrame ??= () => {};
const app = new App();
app.audio.unlock = () => {};
app.duel.featureFlags = createFeatureFlags({storage:null, overrides:{
  'hidden-road':true, 'story-everburn':true, arsenal:true, 'arsenal-wave3':true}});
const savedBeforeStart = JSON.stringify([...memory]);
const definition = EVERBURN_JOBS[2], town = EVERBURN_JOBS[1].steps[0];
const routeDefinition = definition.steps[0].bellowsRoute;
assert.deepEqual(routeDefinition.wrecks.map(place => ({x:place.position.x, z:place.position.z})), wreckRoute.line);
assert.deepEqual(routeDefinition.road.at(-1).position, routeDefinition.wrecks[0].position);
assert.equal(routeDefinition.roadWidthMetres, ROAD_NET.road('tin-road').halfWidth * 2);
assert.equal(routeDefinition.wideExtraMetres, wreckRoute.wideExtraMetres);
assert.deepEqual(routeDefinition.road.slice(1).map(place => ({x:place.position.x, z:place.position.z})),
  [...ROAD_NET.road('tin-road').points].reverse().map(point => ({x:point.x, z:point.z})));
app.duel.state.wastelandGateDiscovered = true;
assert.equal(app.duel.startArenaEvent({venueId:'scablands', mode:'world-job',
  car:'falcone_f42', playerId:app.player.id, seed:1989, opponents:[], job:definition}), true);
const duel = app.duel, playerState = duel.state;
assert.equal(playerState.onFoot, true);
assert(playerState.fighter && playerState.footTransition && playerState.footWeapons);
const bay = duel.course.groundAt(playerState.s, playerState.lateral);
const far = town.places.find(lamp => lamp.id === 'far').position;
assert(Math.hypot(bay.x - town.carStart.x, bay.z - town.carStart.z) < 1e-6);
assert(Math.abs(fighterDistanceToCar(duel) - BELLOWS_RULE.footStartFromCarMetres) < 1e-6);
assert((playerState.fighter.x - bay.x) * (far.x - bay.x) +
  (playerState.fighter.z - bay.z) * (far.z - bay.z) > 0,
  'The player starts on the far lamp side of the bay.');
assert.equal(playerState.speedMph, 0);
assert.equal(JSON.stringify([...memory]), savedBeforeStart, 'The start writes no saved fields.');
playerState.status = 'racing'; playerState.countdown = 0;
const beforeWalk = {...playerState.fighter};
playerState.fighterInput = {forward:1};
stepFootTransition(duel, 1 / 120);
assert(Math.hypot(playerState.fighter.x - beforeWalk.x,
  playerState.fighter.z - beforeWalk.z) > 0, 'The normal fighter can walk from the starting point.');
playerState.fighterInput = {};
Object.assign(playerState.fighter, {x:bay.x, y:bay.y, z:bay.z,
  s:playerState.s, lateral:playerState.lateral, groundY:bay.y});
playerState.input.interact = true;
for (let n = 0; n < 120 && playerState.onFoot; n++) stepFootTransition(duel, 1 / 120);
assert.equal(playerState.onFoot, false, 'The normal hold-F transition returns the player to the car.');
assert.equal(JSON.stringify([...memory]), savedBeforeStart);
app.returnToMenu(); app.dispose?.();
console.log('PASS Run Him Down: real arena starts the existing fighter 60 m from the parked bay car.');

// Jobs 3.2, 3.3 and 3.6: the same load moves between roofs; opaque ash uses
// the rule's road box, expires and cannot leave a drawing in another job.
const {createBellowsView} = await import('../src/world/bellows-view.js');
const THREE = await import('three');
const drawing = createBellowsView({groundAt: () => ({x: 10, y: 2, z: 20}),
  nearest: () => ({s: 1, lateral: 2}), at: () => ({heading: .4})});
const loadState = {s: 1, lateral: 2, headingError: .2, onFoot: true,
  arena: {mode: 'world-job', worldJob: {actors: [{id: 'thief',
    position: {x: 100, y: 3, z: 200}, heading: .7}],
    job: {steps: [chaseStep], stepIndex: 0, stepState: {clouds: [cloud]}}}}};
const beforeDrawing = JSON.stringify(loadState);
drawing.update(loadState);
assert.equal(drawing.group.visible, true);
assert.equal(drawing.load.visible, true);
assert.deepEqual(drawing.load.position.toArray(), [100, 3 + BELLOWS_RULE.roofLoadLift, 200]);
assert.equal(drawing.load.rotation.y, .7);
const drawnAsh = drawing.clouds.get('first');
assert.deepEqual(drawnAsh.scale.toArray(), [cloud.width, BELLOWS_RULE.ashHeightMetres, cloud.length]);
assert.deepEqual(drawnAsh.position.toArray(), [cloud.x, 2 + BELLOWS_RULE.ashHeightMetres / 2, cloud.z]);
assert.equal(drawnAsh.rotation.y, cloud.yaw);
assert.equal(drawnAsh.material.transparent, false);
assert.equal(drawnAsh.material.side, THREE.DoubleSide);
assert.equal(drawnAsh.material.depthWrite, true);
assert.equal(JSON.stringify(loadState), beforeDrawing, 'Drawing must not write any job fact.');
drawing.update(loadState);
assert.equal(drawing.clouds.get('first'), drawnAsh, 'A living cloud reuses its mesh.');
loadState.arena.worldJob.job.stepState = {bellowsLoaded: true, clouds: [{...cloud, remaining: 0}]};
drawing.update(loadState);
assert.deepEqual(drawing.load.position.toArray(), [10, 2 + BELLOWS_RULE.roofLoadLift, 20]);
assert(Math.abs(drawing.load.rotation.y - .6) < 1e-9);
assert.equal(drawing.clouds.size, 0);
assert.equal(drawnAsh.parent, null);
drawing.update({arena: {mode: 'race'}});
assert.equal(drawing.group.visible, false);
assert.equal(drawing.load.visible, false);
const released = [];
for (const resource of [drawing.load.geometry, drawing.load.material, drawnAsh.geometry, drawnAsh.material])
  resource.addEventListener('dispose', () => released.push(resource));
drawing.dispose();
assert.equal(new Set(released).size, 4);
assert.equal(drawing.group.children.length, 0);
console.log('PASS Run Him Down: roof transfer, opaque road ash, read-only drawing and cleanup.');

// Job 3.7: the actual arena event bridge selects procedural bank recipes,
// places each sound, and leaves the rule snapshots untouched.
const {playBellowsEvent} = await import('../src/arena/modes/world-job.js');
const {SOUND_BANK} = await import('../src/sound-bank.js');
const heard = [];
const listener = {emit:event => heard.push(event)};
const audioJob = Object.freeze({job:Object.freeze({stepState:Object.freeze({clouds:Object.freeze([cloud])})})});
const parked = Object.freeze({x:1, y:2, z:3});
const beforeAudio = JSON.stringify(audioJob);
const ashEvent = Object.freeze({type:'thiefAsh', id:'first'});
assert.equal(playBellowsEvent(listener, audioJob, chaseStep, ashEvent, parked), true);
assert.equal(playBellowsEvent(listener, audioJob, chaseStep, {type:'bellowsLoaded'}, parked), true);
assert.deepEqual(heard.map(event => event.arenaTell), [
  {id:'first', targetId:'player', seconds:0, cue:'world.thief.ash',
    position:{x:cloud.x, y:parked.y, z:cloud.z}},
  {id:'bellows-load', targetId:'player', seconds:0, cue:'world.bellows.load', position:{...parked}},
]);
for (const cueId of ['world.thief.ash', 'world.bellows.load']) {
  const recipe = SOUND_BANK[cueId];
  assert(recipe.layers.length > 0);
  assert(!recipe.files?.length, 'These cues must use bank recipes without new audio files.');
}
assert.equal(playBellowsEvent(listener, audioJob, {kind:'chase'}, ashEvent, parked), false);
assert.equal(playBellowsEvent(listener, audioJob, chaseStep, {type:'say'}, parked), false);
assert.equal(heard.length, 2);
assert.equal(JSON.stringify(audioJob), beforeAudio);
assert.deepEqual(parked, {x:1, y:2, z:3});
console.log('PASS Run Him Down: sack and loading sounds use bank recipes and read-only event positions.');

// Job 3.5 and 3.6: the furnace waits at the wing gap until collection.
// Stopping the thief, waiting, or reading the scene cannot release it.
const {furnaceSighting, FURNACE_LEAVING} = await import('../src/world/jobs/furnace-sightings.js');
const {applyBellowsFurnaceLeave} = await import('../src/arena/modes/world-job.js');
const furnaceJob = {definition:{storyId:'everburn', number:3}, clockSec:0,
  job:{steps:[chaseStep], stepIndex:0, stepState:{}}};
const waiting = furnaceSighting(furnaceJob);
assert.equal(waiting.x, FURNACE_LEAVING.from.x);
assert.equal(waiting.z, FURNACE_LEAVING.from.z);
furnaceJob.wonAtSec = 0;
furnaceJob.clockSec = 100;
furnaceJob.job.stepState.thiefStopped = true;
const beforeSighting = JSON.stringify(furnaceJob);
assert.deepEqual(furnaceSighting(furnaceJob), waiting);
assert.equal(JSON.stringify(furnaceJob), beforeSighting);
const horns = [];
const hornListener = {emit:event => horns.push(event)};
assert.equal(applyBellowsFurnaceLeave(hornListener, furnaceJob, {type:'follow'}), false);
const release = {type:'bellowsFurnaceLeave'};
assert.equal(applyBellowsFurnaceLeave(hornListener, furnaceJob, release), true);
assert.equal(furnaceJob.bellowsLeavingAtSec, 100);
assert.equal(horns.length, 1);
assert.equal(horns[0].arenaTell.cue, 'world.furnace.horn');
assert.equal(horns[0].arenaTell.position.x, waiting.x);
assert.equal(horns[0].arenaTell.position.z, waiting.z);
assert.deepEqual(furnaceSighting(furnaceJob), waiting);
furnaceJob.clockSec += FURNACE_LEAVING.seconds / 2;
applyBellowsFurnaceLeave(hornListener, furnaceJob, release);
assert.equal(horns.length, 1);
assert.equal(furnaceJob.bellowsLeavingAtSec, 100);
const halfway = furnaceSighting(furnaceJob);
assert.equal(halfway.x, (FURNACE_LEAVING.from.x + FURNACE_LEAVING.to.x) / 2);
assert.equal(halfway.z, (FURNACE_LEAVING.from.z + FURNACE_LEAVING.to.z) / 2);
furnaceJob.clockSec += FURNACE_LEAVING.seconds / 2;
assert.deepEqual(furnaceSighting(furnaceJob), {hidden:true});
const oldChase = {...furnaceJob, clockSec:0, wonAtSec:undefined,
  job:{steps:[{kind:'chase'}], stepIndex:0, stepState:{}}};
assert.equal(furnaceSighting(oldChase), null);
applyBellowsFurnaceLeave(hornListener, oldChase, release);
assert.equal(horns.length, 1);
console.log('PASS Run Him Down: furnace waits, horns once at collection, leaves and disappears.');

// Job 3.6: stopping the car releases one unarmed foot actor. The same
// mover used by the other job raiders carries him away from the player.
const {applyBellowsThiefFlee, stepWorldJob} = await import('../src/arena/modes/world-job.js');
const escapeApp = new App(); escapeApp.audio.unlock = () => {};
escapeApp.duel.featureFlags = createFeatureFlags({storage:null, overrides:{
  'hidden-road':true, 'story-everburn':true, arsenal:true, 'arsenal-wave3':true}});
escapeApp.duel.state.wastelandGateDiscovered = true;
assert(escapeApp.duel.startArenaEvent({venueId:'scablands', mode:'world-job',
  car:'falcone_f42', playerId:escapeApp.player.id, seed:1989, opponents:[], job:definition}));
const escapeDuel = escapeApp.duel, escapeState = escapeDuel.state;
escapeState.onFoot = false;
const escapeJob = escapeState.arena.worldJob;
const carAt = escapeDuel.course.worldAt(escapeState.s, escapeState.lateral);
const stoppedCar = {id:'thief', position:{x:carAt.x + 12, y:carAt.y, z:carAt.z}, heading:0,
  health:20, renderCar:'dusthawk_rally'};
escapeJob.actors = [stoppedCar];
escapeJob.job = createJob({steps:[chaseStep]}, 1989);
escapeJob.job.stepState = {thiefStopped:true, bellows:70, knocks:3};
const savedBeforeEscape = JSON.stringify([...memory]);
const raidCount = escapeState.raids?.zones.length ?? 0;
assert.equal(applyBellowsThiefFlee(escapeDuel, escapeJob, {type:'follow'}), false);
stepWorldJob(escapeDuel, 0);
const runner = escapeJob.actors.find(actor => actor.bellowsThief);
assert(runner, 'The ending request must reach the arena actor bridge.');
assert.equal(runner.approachSpeed, BELLOWS_RULE.thiefRunMps);
assert(Math.abs(Math.hypot(runner.x - stoppedCar.position.x,
  runner.z - stoppedCar.position.z) - BELLOWS_RULE.thiefExitMetres) < 1e-6);
assert.equal(runner.groundY, undefined, 'The foot mover owns his current floor.');
const parkedBeforeEscape = JSON.stringify(stoppedCar.position);
const beforeEscape = {x:runner.x, z:runner.z};
assert.equal(applyBellowsThiefFlee(escapeDuel, escapeJob, {type:'bellowsThiefFlee'}), true);
assert.equal(escapeJob.actors.filter(actor => actor.bellowsThief).length, 1);
// Flat test ground isolates the existing foot mover from the unfinished wreck
// route. No driving or walking controls are supplied to this rule snapshot.
escapeDuel.course.def = {...escapeDuel.course.def, scablands:false};
stepWorldJob(escapeDuel, .5);
assert(Math.abs(Math.hypot(runner.x - beforeEscape.x,
  runner.z - beforeEscape.z) - BELLOWS_RULE.thiefRunMps * .5) < 1e-6);
assert(runner.x > beforeEscape.x, 'He runs away from the player.');
assert.equal(JSON.stringify(stoppedCar.position), parkedBeforeEscape);
assert.equal(escapeState.raids?.zones.length ?? 0, raidCount, 'He cannot join a shooting raid.');
assert.equal(JSON.stringify([...memory]), savedBeforeEscape);

const escapeDrawing = createBellowsView(escapeDuel.course);
escapeDrawing.update(escapeState);
assert.equal(escapeDrawing.figures.group.visible, true);
assert(escapeDrawing.figures.group.children[0].count > 0, 'The fleeing actor is drawn.');
const beforeEscapeDrawing = JSON.stringify(runner);
escapeDrawing.update(escapeState);
assert.equal(JSON.stringify(runner), beforeEscapeDrawing, 'Drawing never moves the thief.');
escapeDrawing.update({arena:{mode:'race'}});
assert.equal(escapeDrawing.figures.group.visible, false);
assert.equal(escapeDrawing.figures.group.children[0].count, 0);
escapeDrawing.dispose();
// The actor bridge applies blocking only to the remade thief. Use flat ground
// to isolate steering from the still undecided Boneyard route.
const blockingPath = [{position:{x:carAt.x - 4, z:carAt.z - 50}},
  {position:{x:carAt.x - 4, z:carAt.z + 100}}];
const blockingStep = {...chaseStep, path:blockingPath, roadWidthMetres:12,
  actor:{id:'thief', path:blockingPath}};
for (const [remade, onFoot, expectedShift] of [[true, false, 1], [false, false, 0], [true, true, 0]]) {
  escapeState.onFoot = onFoot;
  escapeJob.job = createJob({steps:[{...blockingStep, bellows:remade}]});
  escapeJob.actors = [{id:'thief', health:20, renderCar:'dusthawk_rally', pathIndex:1,
    position:{x:carAt.x - 4, y:carAt.y, z:carAt.z + 20}}];
  escapeJob.follow = {actorId:'thief', speed:10};
  stepWorldJob(escapeDuel, .5);
  assert(Math.abs(escapeJob.actors[0].position.x - (carAt.x - 4) - expectedShift) < 1e-9);
}
assert.equal(JSON.stringify([...memory]), savedBeforeEscape);
escapeApp.returnToMenu(); escapeApp.dispose?.();
console.log('PASS Run Him Down: stopped thief runs once through the existing foot mover and read-only figures.');
console.log('PASS Run Him Down: arena mover blocks a driving pass only in the remade chase.');

// The live bridge reads swept meetings, not closeness or weapon buttons.
const {bellowsArenaFacts} = await import('../src/arena/modes/world-job.js');
const factsApp = new App(); factsApp.audio.unlock = () => {};
factsApp.duel.featureFlags = createFeatureFlags({storage:null, overrides:{
  'hidden-road':true, 'story-everburn':true, arsenal:true, 'arsenal-wave3':true}});
factsApp.duel.state.wastelandGateDiscovered = true;
assert(factsApp.duel.startArenaEvent({venueId:'scablands', mode:'world-job',
  car:'falcone_f42', playerId:factsApp.player.id, seed:1989, opponents:[], job:definition}));
const factsDuel = factsApp.duel, factsState = factsDuel.state;
const factsJob = factsState.arena.worldJob;
const factsStep = {...definition.steps[0], bellows:true};
const roadPlaces = factsStep.bellowsRoute.road;
const thiefAt = {...roadPlaces[2].position};
factsJob.actors = [{id:factsStep.targetId, position:thiefAt, pathIndex:3,
  bellowsSolidContact:false, bellowsSolidImpactKmh:0}];
factsState.onFoot = false;
factsState.input.fire = true;
const factsSaved = JSON.stringify([...memory]);
const readFacts = hits => bellowsArenaFacts(factsDuel, factsJob, factsStep, hits).bellows;
let measured = readFacts([]);
assert.equal(measured.flameContact, false);
assert.equal(measured.carContact, false);
assert.equal(measured.meetingKmh, 0);
assert.equal(measured.inBoneyard, false);
assert(measured.roadMetres > 0);
assert.equal(measured.sackPoints.length, 2);
assert.equal(measured.roadWidthMetres, routeDefinition.roadWidthMetres);
const thiefPose = factsDuel.course.nearest(thiefAt.x, thiefAt.z);
assert.equal(measured.playerTopSpeedKmh,
  factsDuel._drivingSurface(thiefPose.s, thiefPose.lateral).speedLimit * 1.609344);
factsJob.carContacts = [{actor:factsJob.actors[0], kmh:31}, {actor:{id:'other'}, kmh:90}];
const contactsBefore = JSON.stringify(factsJob.carContacts);
measured = readFacts([{id:factsStep.targetId, flame:true}]);
assert.equal(measured.flameContact, true);
assert.equal(measured.carContact, true);
assert.equal(measured.meetingKmh, 31);
assert.equal(JSON.stringify(factsJob.carContacts), contactsBefore);
assert.equal(readFacts([{id:'other', flame:true}]).flameContact, false);
factsState.onFoot = true;
assert.equal(readFacts([]).carContact, false, 'The parked car cannot ram while the player walks.');
factsJob.actors[0].pathIndex = roadPlaces.length;
factsJob.actors[0].position = {...factsStep.bellowsRoute.wrecks.at(-1).position};
factsJob.actors[0].bellowsSolidContact = true;
factsJob.actors[0].bellowsSolidImpactKmh = 22;
measured = readFacts([]);
assert.equal(measured.inBoneyard, true);
assert.equal(measured.furnaceMetres, 0);
assert.equal(measured.solidContact, true);
assert.equal(measured.solidImpactKmh, 22);
assert.deepEqual(bellowsArenaFacts(factsDuel, factsJob, definition.steps[0], []), {});
assert.equal(JSON.stringify([...memory]), factsSaved);
factsApp.returnToMenu(); factsApp.dispose?.();
console.log('PASS Run Him Down: arena facts measure the authored road, surface speed, flame and swept impacts without save writes.');
