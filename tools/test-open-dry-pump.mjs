import assert from 'node:assert/strict';
import {Duel} from '../src/game.js';
import {activeTalkStep} from '../src/world/jobs/steps/talk.js';
import {openRoamJob} from '../src/world/open/roam-job.js';
import dryPump from '../src/story/threads/content/dry-pump.js';
import {createFeatureFlags} from '../src/feature-flags.js';
import {DRY_PUMP_MISSIONS, DRY_PUMP_SOLIDS, DRY_PUMP_SPOTS as spots, mallPlace} from '../src/world/open/content/dry-pump-places.js';
import {MISSION_KINDS} from '../src/world/open/content/mission-kinds.js';
import {isHeld} from '../src/world/open/holds.js';
import {applyEffects} from '../src/world/open/open-effects.js';
import {beginOpenLand, stepOpenLand} from '../src/world/open/open-land.js';
import {favoursOf, newWorld, stageOf, wordOf} from '../src/world/open/open-record.js';
import {abandonOpenMission, inheritThreadMission, missionsPart, prepareThreadMission} from '../src/world/open/parts/missions.js';
import {openThreadSigns, threadsAtBankedHearth, threadsPart} from '../src/world/open/parts/threads.js';
import {sitePosition, siteSpot} from '../src/world/open/site-rule.js';
import {LAND} from '../src/world/scablands-names.js';
import {scablandsSurfaceHeightAt} from '../src/world/scablands-ground.js';
import {createJobSolidGrid, pushOutOfSolids} from '../src/world/scablands-solids.js';
import {run as scenario, pageFunctions, pageSource} from './scenarios/open-dry-pump.mjs';
import {walkThread} from './thread-crossings.mjs';

const cast = {camp: 'glasshouse', friend: 'walkers'};
const id = dryPump.id;
const effect = (kind, key, rest) => ({type: kind, id: key && `${id}/${key}`, ...rest});
const withEffects = (world, ...effects) => applyEffects(world, {id: 'fixture/' + world.open.journal.length, effects}).world;
const initial = (beat = 'sign', seed = 2, casting = cast, extras = []) => withEffects(newWorld({seed, night: 2}),
  {type: 'find', site: casting.camp}, {type: 'thread', id, to: beat, cast: casting}, ...extras);
const begin = world => beginOpenLand({id: 'open-roam', steps: [{kind: 'roam'}], open: {world}});
const house = sitePosition('glasshouse', 2);
const pump = siteSpot('glasshouse', 2, 'pump');
const leader = siteSpot('glasshouse', 2, 'marigold');
const away = LAND.at('dead-mall', 2200, -350);
const frame = (open, point, inputs = {}, dt = .1) => stepOpenLand(open, {
  player: {position: point}, onFoot: true, carPosition: point, openRoam: true,
  sitePositions: Object.fromEntries(['glasshouse', 'radio-hill', 'bus-ring'].map(site => [site, sitePosition(site, open.world.open.landSeed)])),
  checkpointsEnabled: true, missionHeightAt: () => 0, ...inputs,
}, dt, [threadsPart, missionsPart]);
const beatOf = open => open.world.open.threads[id].beat;
const endOf = open => open.world.open.threads[id].end;
const mark = (open, name) => open.world.ledger.marks.includes(`${id}/${name}`);
const advance = (open, nights) => ({...open, world: {...open.world, ledger: {...open.world.ledger, night: open.world.ledger.night + nights}}});
const choose = (open, point, option) => {
  const step = frame(open, point, {interact: true});
  const talk = step.requests.find(row => row.type === 'talk');
  const choice = talk?.scene.choices.find(row => row.id.endsWith(`/${option}`));
  assert.ok(choice, `offered ${option} on ${beatOf(open)}`);
  return frame(step.open, point, {jobEvents: [{type: 'talkChoice', id: choice.id}]}).open;
};
const done = frame => frame.events.find(event => event.type === 'threadMissionOutcome')?.outcome;

assert.equal(createFeatureFlags({qa: false, storage: null, search: ''}).enabled('story-choices'), false);
const muted = frame(begin(initial()), house, {checkpointsEnabled: false, interact: true});
assert.equal(beatOf(muted.open), 'sign');
assert.deepEqual(muted.events, []);
const available = openThreadSigns({world: initial(), view: {sitePositions: {glasshouse: house}}});
assert.deepEqual(available.map(row => [row.id, row.sign.kind, row.sign.seenWithin, row.sign.lastsNights]), [[id, 'words', 60, 4]]);
for (const camp of ['glasshouse', 'radio-hill', 'bus-ring']) {
  let picked = 0;
  for (let seed = 1; seed <= 75; seed++) {
    const world = withEffects(newWorld({seed, night: 2}), {type: 'find', site: camp});
    const site = sitePosition(camp, seed), view = {player: {position: away}, sitePositions: {[camp]: site}};
    const fromHearth = threadsAtBankedHearth({world, view});
    if (!fromHearth.open.threads[id]) continue;
    picked++;
    assert.equal(fromHearth.open.threads[id].cast.camp, camp);
    const visited = withEffects(world, {type: 'mark', id: `threads/visited/${camp}/night-2`});
    assert.equal(threadsAtBankedHearth({world: visited, view}).open.threads[id], undefined);
    assert.equal(threadsAtBankedHearth({world: {...world, ledger: {...world.ledger, night: 1}}, view}).open.threads[id], undefined);
  }
  assert.ok(picked > 10 && picked < 65, `${camp} has a nightly chance`);
}
const notNear = frame(begin(initial()), {x: house.x + 61, z: house.z});
assert.equal(notNear.events.length, 0);
const sign = frame(notNear.open, {x: house.x + 60, z: house.z}, {onFoot: false});
assert.equal(sign.events[0].cue, dryPump.sign.cue);
assert.deepEqual(sign.requests.filter(row => row.type === 'say').map(row => row.text), dryPump.beats.sign.thoughts);
assert.equal(beatOf(sign.open), 'sign');
assert.equal(frame(sign.open, house).events.length, 0, 'the pump clanks once');
const asked = frame(sign.open, leader, {interact: true});
const request = asked.requests.find(row => row.type === 'talk');
assert.equal(beatOf(asked.open), 'asking');
assert.equal(request.scene.lines[0].words, dryPump.beats.asking.lines[0].words);
assert.equal(request.scene.thoughts[0], dryPump.beats.asking.notes.thoughtsWhen[1].thought);
assert.equal(request.scene.questions.length, dryPump.beats.asking.questions.length);
// Use the running roam job and the real foot transition, as the laptop does. A friendly
// Marigold meets the player at the car stop, where her side away from camp is beyond 22 m.
{
  const world = initial('sign', 2, {camp: 'glasshouse'}, [
    {type: 'word', person: 'glasshouse', set: 'Friendly'}, {type: 'mark', id: 'open/met/glasshouse'},
  ]);
  const post = siteSpot('glasshouse', world.open.landSeed, 'car-stop');
  const dx = post.x - house.x, dz = post.z - house.z, radius = Math.hypot(dx, dz);
  const anchor = LAND.at('ships-in-sand');
  const footStart = {...LAND.at('ships-in-sand', post.x - anchor.x + dx * 6 / radius,
    post.z - anchor.z + dz * 6 / radius), heading: Math.atan2(-dx, -dz)};
  const definition = openRoamJob({}, world.seed);
  const duel = new Duel({seed: world.seed, featureFlags: {'hidden-road': true, 'story-choices': true}});
  duel.state.wastelandGateDiscovered = true;
  assert(duel.startArenaEvent({seed: world.seed, venueId: 'scablands', mode: 'world-job', car: 'falcone_f42',
    cpuDifficulty: 'easy', opponents: [], job: {...definition, open: {world}, steps: [{...definition.steps[0], footStart}]}}));
  const dt = 1 / 60;
  while (duel.state.status === 'countdown') duel.step(dt);
  const step = seconds => { for (let tick = 0; tick < Math.round(seconds / dt); tick++) duel.step(dt); };
  step(12);
  duel.setFighterInput({forward: true});
  step(1);
  duel.setFighterInput({forward: false});
  const {fighter, arena: {worldJob}} = duel.state;
  assert.ok(Math.hypot(fighter.x - post.x, fighter.z - post.z) < 2.5, 'the driver walks up to Marigold');
  assert.ok(Math.hypot(fighter.x - house.x, fighter.z - house.z) > 22, 'the driver stands on her side away from camp');
  assert.equal(beatOf(worldJob.open), 'sign');
  duel.setInput({interact: true});
  step(.12);
  duel.setInput({interact: false});
  assert.equal(activeTalkStep(duel.state)?.id, 'dry-pump/asking/decision', 'F opens the Dry Pump in the live roam job');
  assert.equal(activeTalkStep(duel.state).openPerson, 'marigold');
  assert.equal(activeTalkStep(duel.state).openRadio, false);
  assert.equal(beatOf(worldJob.open), 'asking');
  assert.equal(worldJob.job.stepState.screen.line.words, dryPump.beats.asking.lines[0].words);
  for (let tick = 0; tick < 12 && worldJob.job.stepState.screen.phase !== 'options'; tick++) {
    worldJob.talkAction = {type: 'advance'};
    duel.step(dt);
  }
  const options = worldJob.job.stepState.screen.options.filter(row => row.kind === 'say').map(row => row.words);
  assert.deepEqual(options, dryPump.beats.asking.choices.filter(row => !row.when).map(row => row.words));
  // Restore the site ground installed by the world job before the remaining pure cases run.
  duel.state.arena = null;
  duel.emit({});
}
const ignore = frame(advance(begin(initial()), 4), away).open;
assert.equal(endOf(ignore), 'fetched-it-themselves');
assert.ok(mark(ignore, 'fetched-it-themselves'));
assert.equal(wordOf(ignore.world, 'glasshouse'), 'Strangers');
assert.equal(mark(ignore, 'mall-way-in'), false);
assert.equal(frame(advance(ignore, 8), leader, {interact: true}).requests.some(row => row.type === 'talk'), false);
assert.ok(frame(advance(ignore, 9), leader, {interact: true}).requests.some(row => row.type === 'talk' && row.id.includes('the-camp-went-themselves')));

const offered = begin(initial('asking', 2, cast, [{type: 'favour', person: 'walkers', by: 1}]));
const unavailable = frame(offered, leader, {interact: true, outingAvailable: false});
assert.ok(!unavailable.requests.find(row => row.type === 'talk').scene.choices.some(row => row.id.endsWith('/go-today')));
const refused = choose(offered, leader, 'refuse');
assert.equal(beatOf(refused), 'left-dry');
assert.equal(wordOf(refused.world, 'glasshouse'), 'Wary');
assert.equal(stageOf(frame(advance(refused, 4), away).open.world, 'glasshouse'), 'empty');
const promised = choose(offered, leader, 'promise');
assert.equal(promised.world.ledger.obligations.find(row => row.id === `${id}/valve`).due, 5);
const due = frame(advance(promised, 3), away).open;
assert.equal(beatOf(due), 'promise-broken');
const late = frame(due, leader).open;
assert.ok(mark(late, 'promise-broken'));
assert.equal(wordOf(late.world, 'glasshouse'), 'Wary');
assert.equal(beatOf(choose(late, leader, 'go-late')), 'mall-outside');
assert.equal(beatOf(choose(late, leader, 'leave-it')), 'left-dry');
assert.equal(beatOf(choose(promised, leader, 'go-now')), 'mall-outside');
for (const expect of ['fitting', 'promised']) {
  let found = false;
  for (let seed = 1; seed <= 30; seed++) {
    const camp = siteSpot('glasshouse', seed, 'marigold');
    const ready = begin(initial('asking', seed, cast, [{type: 'favour', person: 'walkers', by: 1}]));
    const away = choose(ready, camp, 'send-friends');
    assert.equal(favoursOf(away.world, 'walkers'), 0);
    assert.equal(beatOf(frame(advance(away, 1), camp).open), 'friends-away');
    const home = frame(advance(away, 2), camp).open;
    if (beatOf(home) !== expect) continue;
    assert.ok(mark(home, expect === 'fitting' ? 'friends-fetched-it' : 'friends-came-back-empty'));
    assert.equal(mark(home, 'mall-way-in'), false);
    found = true;
    break;
  }
  assert.ok(found, `friends can lead to ${expect}`);
}
const walkers = begin(initial('asking', 2, cast, [
  {type: 'favour', person: 'walkers', by: 1}, {type: 'word', person: 'walkers', set: 'Friendly'}, {type: 'mark', id: 'told-walkers-of-mall'},
]));
assert.equal(beatOf(frame(advance(choose(walkers, leader, 'send-friends'), 2), house).open), 'fitting');

// Drive the graph without graphics, including the shared hold across talk, mending and a child mission.
const visit = choose(offered, leader, 'go-today');
const parking = frame(visit, spots['car-park'], {onFoot: false});
assert.ok(isHeld(parking.open.holds, 'checkpoints') && isHeld(parking.open.holds, 'signs'));
assert.ok(parking.requests.some(row => row.type === 'solids' && row.solids.length > 0));
assert.equal(isHeld(abandonOpenMission(parking.open).holds, 'checkpoints'), false);
assert.deepEqual(abandonOpenMission(parking.open).world, parking.open.world);
assert.equal(beatOf(choose(parking.open, spots['east-front'], 'front-doors')), 'hall');
const roof = choose(parking.open, spots['north-side'], 'roof');
assert.equal(beatOf(roof), 'gallery');
const gallery = frame(roof, spots.gallery);
assert.equal(beatOf(gallery.open), 'hall');
assert.equal(gallery.events.filter(row => row.type === 'threadCue').length, 3);
const hall = frame(gallery.open, spots.hall);
assert.equal(hall.open.parts.missions.active.mission.partOf, `${id}/mall`);
assert.equal(done(frame(hall.open, spots['staff-door'])), 'not-seen');
let penny = frame(frame(hall.open, spots['staff-door']).open, spots['staff-door']).open;
assert.equal(beatOf(penny), 'penny');
assert.ok(isHeld(penny.holds, 'checkpoints'));
const neither = choose(penny, spots['staff-door'], 'take-neither');
assert.equal(beatOf(frame(neither, spots['tunnel-door']).open), 'came-home-empty');
const spare = choose(penny, spots['staff-door'], 'fetch-the-spare');
assert.equal(beatOf(spare), 'shoe-shop');
let shop = frame(spare, spots['staff-door']).open;
shop = frame(shop, spots['shoe-shop'], {interact: true}).open;
assert.ok(shop.parts.missions.active.state.carrying);
shop = frame(shop, spots['shoe-shop']).open;
assert.ok(mark(shop, 'saw-the-ash-store'));
assert.ok(mark(shop, 'found/the-valve'));
assert.equal(done(frame(shop, spots['staff-door'])), 'not-seen');

let hisPipe = choose(penny, spots['staff-door'], 'take-his');
assert.ok(mark(hisPipe, 'signed-the-book'));
assert.equal(beatOf(hisPipe), 'his-pipe');
hisPipe = frame(hisPipe, spots['penny-pipe'], {wrench: true}, 9.99).open;
assert.equal(mark(hisPipe, 'took-penny-valve'), false);
hisPipe = frame(hisPipe, spots['penny-pipe'], {wrench: true}, .01).open;
assert.ok(mark(hisPipe, 'took-penny-valve'));
const tunnel = choose(hisPipe, spots['penny-pipe'], 'promise-the-spare');
assert.equal(beatOf(tunnel), 'tunnel');
const road = frame(tunnel, spots['tunnel-door']).open;
assert.ok(mark(road, 'mall-way-in'));
assert.equal(beatOf(road), 'road-out');
const car = frame(road, spots['car-park'], {onFoot: false});
const escaped = frame(car.open, spots['car-park'], {onFoot: false});
assert.equal(done(escaped), 'clear');
const fitting = frame(escaped.open, spots['car-park'], {onFoot: false});
assert.equal(beatOf(fitting.open), 'fitting');
const just = frame(fitting.open, pump, {wrench: true}, 11.99);
assert.equal(mark(just.open, 'water-back'), false);
const water = frame(just.open, pump, {wrench: true}, .01);
assert.ok(mark(water.open, 'water-back'));
assert.equal(water.events[0].cue, 'open.pump.water');
assert.equal(isHeld(water.open.holds, 'checkpoints'), false);
const returned = choose(water.open, leader, 'tell-of-penny');
assert.equal(wordOf(returned.world, 'glasshouse'), 'Sworn');
assert.equal(endOf(returned), 'water-back');
assert.ok(mark(returned, 'penny-has-friends'));
const debt = frame(returned, spots['tunnel-door'], {interact: true}).open;
assert.equal(beatOf(debt), 'penny-owed');
const second = frame(debt, spots['tunnel-door']).open;
assert.equal(second.parts.missions.active.id, `${id}/second-trip`);
const taken = frame(second, spots['shoe-shop'], {interact: true}).open;
const delivered = frame(taken, spots['penny-pipe'], {wrench: true}, 10);
assert.equal(done(delivered), 'brought-down');
const back = frame(delivered.open, spots['penny-pipe']).open;
assert.ok(mark(back, 'penny-valve-returned'));
assert.equal(endOf(back), 'water-back');
assert.equal(back.world.ledger.obligations.length, 0);
const overdue = frame(advance(returned, 5), spots['tunnel-door'], {interact: true}).open;
const broken = frame(overdue, spots['tunnel-door']).open;
assert.ok(mark(broken, 'penny-promise-broken'));
assert.equal(wordOf(broken.world, 'mr-penny'), 'Wary');

// Check exposure and pursuit thresholds with fixed, readable light geometry using the same kind runner.
const heist = MISSION_KINDS.heist;
const missionAt = name => DRY_PUMP_MISSIONS[`${id}/${name}`];
const parent = {id: `${id}/mall`, kind: 'heist', ...missionAt('mall')};
const stage = (name, parentMission = parent) => inheritThreadMission({id: `${id}/mall/${name}`, partOf: parent.id,
  ...missionAt(`mall/${name}`)}, parentMission);
assert.equal(inheritThreadMission({partOf: 'missing'}, parent), null);
for (const name of ['hall', 'shoe-shop', 'road-out']) assert.ok(prepareThreadMission(stage(name), mallPlace));
const at = (x, z) => ({x, z});
const points = {goal: at(10, 10), light: at(0, 0), valve: at(0, 8), leave: at(0, 12), cover: at(8, 8)};
const setup = (mission, rule) => {
  const next = {...mission, rule: {...mission.rule, lamps: [{at: 'light', turnsIn: 3600, phase: 0}], range: 18,
    cover: 'cover', coverRadius: 1, destination: 'goal', within: .5, ...rule}};
  const route = prepareThreadMission(next, point => points[point]);
  return {mission: next, state: heist.begin(next, route, {missionHeightAt: () => 0}).state};
};
const step = (setup, p, dt, input = {}) => ({mission: setup.mission, ...heist.step(setup.mission, setup.state,
  {onFoot: true, player: {position: points[p]}, carPosition: points[p], missionHeightAt: () => 0, ...input}, dt)});
const lit = (start, duration) => step(start, 'valve', duration);
const hallCase = setup(stage('hall'), {retreat: 'leave'});
let nearly = lit(hallCase, 1.99);
assert.equal(nearly.state.seen, false);
assert.equal(lit(nearly, .01).state.seen, true);
assert.equal(lit(step(nearly, 'cover', 1), 1.99).state.seen, false);
assert.equal(step(lit(hallCase, 2), 'goal', .1).outcome, 'seen');
assert.equal(step(lit(hallCase, 2), 'leave', .1).outcome, 'ran-out');
const shopCase = setup(stage('shoe-shop'), {pickup: 'valve', eject: 'leave'});
const carrying = step(shopCase, 'valve', 2, {interact: true});
assert.ok(carrying.state.carrying);
assert.equal(step(carrying, 'goal', .1).outcome, 'seen');
assert.equal(lit(step(lit(carrying, 1.9), 'cover', 2), 2.1).outcome, 'caught');
assert.equal(step(carrying, 'light', .1).outcome, 'caught');
const revisited = setup({id: `${id}/second-trip`, kind: 'heist', ...missionAt('second-trip')}, {pickup: 'valve', eject: 'leave'});
const loaded = step(revisited, 'valve', 2, {interact: true});
assert.equal(step(loaded, 'goal', 10, {wrench: true}).outcome, 'seen-and-brought-down');
assert.equal(lit(loaded, 4).outcome, 'caught');
const pursuit = stage('road-out');
const route = prepareThreadMission(pursuit, mallPlace);
const pursuitStart = heist.begin({...pursuit, alarmed: true}, route, {}).state;
const chase = heist.step(pursuit, pursuitStart, {carPosition: spots['car-park']}, 0);
assert.equal(chase.requests[0].vehicles.length, 2);
assert.equal(heist.step(pursuit, chase.state, {carPosition: spots['car-park'], combatWrecking: true}, 0).outcome, 'wrecked');
assert.equal(heist.step(pursuit, chase.state, {carPosition: {x: spots['car-park'].x + 1999, z: spots['car-park'].z}}, 0).outcome, null);
assert.equal(heist.step(pursuit, chase.state, {carPosition: {x: spots['car-park'].x + 2000, z: spots['car-park'].z}}, 0).outcome, 'outrun');

const grid = createJobSolidGrid();
grid.setOpenSolids(id, DRY_PUMP_SOLIDS);
for (const [name, point] of Object.entries(spots)) {
  const y = scablandsSurfaceHeightAt(point.x, point.z);
  assert.ok(!pushOutOfSolids(point.x, point.z, .45, grid, y).hit, `${name} is on clear ground`);
}
assert.deepEqual(walkThread(dryPump).faults, []);
for (const name of Object.keys(pageFunctions)) new Function('return ' + pageSource(name, {}, [], 'test'));
const syntax = source => new Function('return ' + source);
await scenario({navigate() {}, waitFor: syntax, evaluate(source) {
  syntax(source);
  if (source === pageSource('campState')) return {world: initial(), site: {site: 'glasshouse'}};
}, screenshot() {}});
console.log('The Dry Pump: director, written scenes, holds, outcomes, ledger, terrain and browser source pass.');
