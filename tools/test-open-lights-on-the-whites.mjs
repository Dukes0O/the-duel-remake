import assert from 'node:assert/strict';
import {FEATURE_STATES} from '../src/feature-flags.js';
import story from '../src/story/threads/content/lights-on-the-whites.js';
import {witnessLights} from '../src/story/threads/signs.js';
import {deckFloorHeightAt, WHITES_LADDER} from '../src/world/deck-plates.js';
import {isHeld} from '../src/world/open/holds.js';
import {arrivalChance, OPEN_CHECKPOINTS} from '../src/world/open/checkpoint-rule.js';
import {checkpointsPart} from '../src/world/open/parts/checkpoints.js';
import {MISSION_KINDS} from '../src/world/open/content/mission-kinds.js';
import {lightsStory, lightsPlaces, lightsWeather, LIGHTS_LADDER_MARK} from '../src/world/open/content/lights-on-the-whites-places.js';
import {applyEffects} from '../src/world/open/open-effects.js';
import {beginOpenLand, stepOpenLand} from '../src/world/open/open-land.js';
import {favoursOf, isFound, newWorld} from '../src/world/open/open-record.js';
import {missionsPart} from '../src/world/open/parts/missions.js';
import {createThreadsPart, openThreadSigns, threadsAtBankedHearth} from '../src/world/open/parts/threads.js';
import {stepRoam} from '../src/world/open/roam-step.js';
import {sitePosition} from '../src/world/open/site-rule.js';
import {scablandsSurfaceHeightAt} from '../src/world/scablands-ground.js';
import {stepMover} from '../src/world/scablands-movers.js';
import {walkThread} from './thread-crossings.mjs';
import {run, scenarioWorld} from './scenarios/open-lights-on-the-whites.mjs';

const world = scenarioWorld(), id = story.id;
const p = lightsPlaces(world.open.landSeed);
const road = p['whites-road-start'], roadHome = p['whites-road-home'], home = p['whites-ship-side'];
const crew = p['whites-crew'], meeting = p['whites-meeting'], buoy = sitePosition('bell-buoy', world.open.landSeed);
const offshore = {x: 850, z: -3900};
const view = {openRoam: true, checkpointsEnabled: true, partOfDay: 'dark'};
const parts = [createThreadsPart([lightsStory]), missionsPart];
const begin = (initial = world) => beginOpenLand({id: 'open-roam', open: {world: initial}, steps: [{kind: 'roam'}]});
const frame = (previous, point, dt = .1, extra = {}) => stepOpenLand(previous.open ?? previous, {
  ...view, player: {position: point}, carPosition: point, ...extra,
}, dt, parts);
const beat = out => out.open.world.open.threads[id].beat;
const end = out => out.open.world.open.threads[id].end;
const marked = (out, key) => out.open.world.ledger.marks.includes(id + '/' + key);
const held = out => ['checkpoints', 'signs'].every(system => isHeld(out.open.holds, system));
const cue = (out, key) => out.events.some(event => event.cue === key);
const talkChoice = (out, point, name, extra = {}) => {
  const selected = beat(out);
  const ready = frame(out, point, .1, {...extra, interact: true});
  const choice = ready.requests.find(request => request.type === 'talk')?.scene.choices.find(choice => choice.id.endsWith('/' + name));
  assert.ok(choice, selected + ' offers ' + name);
  const done = frame(ready, point, .1, {...extra, jobEvents: [{type: 'talkChoice', id: choice.id}]});
  return done;
};
const ask = (out, point, ...questions) => {
  const ready = frame(out, point, .1, {interact: true});
  const {scene} = ready.requests.find(row => row.type === 'talk');
  for (const id of questions) assert.ok(scene.questions.some(row => row.id === id), id);
  return frame(ready, point, .1, {jobEvents: questions.map(id => ({type: 'openTalkQuestion', id, scene: scene.id}))});
};

assert.equal(FEATURE_STATES['story-choices'], 'dev');
assert.deepEqual(walkThread(story).faults, []);
assert.deepEqual(walkThread(lightsStory).faults, []);
assert.equal(crew.x, buoy.x * .6);
assert.equal(openThreadSigns({world, view: {...view, partOfDay: 'dusk'}}).length, 0);
assert.equal(openThreadSigns({world, view: {...view, checkpointsEnabled: false}}).length, 0);
const [sign] = openThreadSigns({world, view});
assert.deepEqual(sign.at, crew);
assert.equal(witnessLights(sign, {player: road}, 0, 2.9).witnessed, false);
assert.equal(witnessLights(sign, {player: road}, 2.9, .1).witnessed, true);
assert.equal(witnessLights(sign, {player: offshore}, 3, .1).seconds, 0);
assert.equal(witnessLights(sign, {player: road, missionHeightAt: (x, z) =>
  z < road.z - 200 && z > road.z - 260 ? 1000 : 0}, 2.9, .1).witnessed, false);
assert.equal(witnessLights({...sign, sign: {...sign.sign, seenWithin: 30}}, {player: road}, 3, .1).witnessed, false);

const eligible = Array.from({length: 100}, (_, seed) => newWorld({seed, night: 3, embers: 2})).find(initial =>
  threadsAtBankedHearth({world: initial, view: {...view, player: road}}, [lightsStory]).open.threads[id]);
assert.ok(eligible);
const shelvedWorld = applyEffects(eligible, {id: 'test/shelf', effects: [{type: 'thread', id, to: 'shelved'}]}).world;
const backOnTheRoad = frame(begin(shelvedWorld), road);
assert.equal(beat(backOnTheRoad), 'sign');
assert.equal(openThreadSigns({world: backOnTheRoad.open.world, view}).length, 1);
assert.equal(threadsAtBankedHearth({world: eligible, view: {...view, player: road, lastNight: 3}}, [lightsStory]).open.threads[id], undefined);
assert.equal(threadsAtBankedHearth({world: eligible, view: {...view, player: offshore}}, [lightsStory]).open.threads[id], undefined);
assert.equal(threadsAtBankedHearth({world: eligible, view: {...view, player: road, partOfDay: 'day'}}, [lightsStory]).open.threads[id], undefined);

const see = initial => frame(frame(begin(initial), road, 2.9), road, .1);
const sight = see();
assert.ok(cue(sight, 'open.lamps.seen'));
assert.ok(marked(sight, 'entered/sign'));
assert.equal(sight.requests.filter(row => row.type === 'say').length, 2);
const bumped = out => ({...out.open, world: {...out.open.world, ledger: {...out.open.world.ledger, night: 4}}});
const unseen = frame(frame(bumped({open: begin()}), offshore, 1), offshore);
assert.equal(beat(unseen), 'shelved');
assert.equal(end(unseen), null);
assert.equal(marked(unseen, 'drove-on'), false);
const ignored = frame(bumped(sight), offshore);
assert.equal(end(ignored), 'passed-by');
assert.ok(marked(ignored, 'drove-on'));
assert.equal(end(talkChoice(sight, road, 'drive-on')), 'passed-by');
const skipped = frame(begin(), road, 4, {checkpointsEnabled: false});
assert.equal(marked(skipped, 'entered/sign'), false);

const sail = sight => frame(frame(frame(sight, home), home), home);
const ships = sail(sight);
assert.ok(ships.open.world.ledger.marks.includes(id + '/entered/ships'));
assert.ok(sail(see(applyEffects(world, {id: 'qa/cold', effects: [
  {type: 'word', person: 'deck-folk', set: 'Cold'},
]}).world)).open.world.ledger.words['deck-folk'] === 'Cold');
assert.equal(end(frame(ships, roadHome)), 'passed-by');
assert.ok(marked(frame(ships, roadHome), 'heard-and-left'));

const withEmber = () => talkChoice(ask(ships, home, 'your-lamp', 'which-way'), home, 'give-ember');
const basket = withEmber();
assert.equal(beat(basket), 'basket');
assert.equal(basket.open.world.ledger.stocks.embers, 1);
assert.equal(favoursOf(basket.open.world, 'deck-folk'), 1);
assert.ok(basket.open.world.ledger.marks.includes('rumour/bell-buoy'));
const byBasket = frame(frame(frame(frame(basket, roadHome), roadHome), roadHome), roadHome);
assert.equal(beat(byBasket), 'aboard');
assert.equal(byBasket.open.world.ledger.words['deck-folk'], 'Friendly');
assert.ok(byBasket.open.world.ledger.made.includes(LIGHTS_LADDER_MARK));

const fromRoad = () => frame(frame(sight, offshore), offshore);
const cart = started => frame(frame(started, crew), crew);
const hunt = fromRoad();
assert.equal(beat(hunt), 'salt');
assert.ok(held(hunt));
assert.equal(hunt.requests.some(row => row.type === 'marker' && row.place), false);
const dark = frame(hunt, offshore, 60);
assert.ok(cue(dark, 'open.haze.down'));
assert.equal(lightsWeather(dark.open).fogFar, 70);
const loss = frame(frame(dark, offshore, 150), offshore);
assert.equal(beat(loss), 'in-at-dawn');
assert.ok(marked(loss, 'lost-the-lamps'));
assert.equal(held(loss), false);
assert.equal(end(frame(frame(loss, home), home)), 'in-at-dawn');
const leaveBasket = () => frame(frame(frame(basket, offshore), offshore), offshore);
const lostWithBasket = frame(frame(leaveBasket(), offshore, 211), offshore);
assert.equal(beat(lostWithBasket), 'home-by-the-basket');
const found = frame(cart(hunt), crew);
assert.equal(beat(found), 'crew');
assert.ok(marked(found, 'found-the-crew'));

function loadTwo(out, option) {
  return frame(talkChoice(out, crew, option), crew);
}
function rescueHome(out, expected, pickup = crew) {
  const first = frame(out, home, 55);
  assert.equal(first.open.parts.missions.active.state.delivered, 2);
  assert.equal(first.open.parts.missions.active.state.phase, 'search');
  const reunited = frame(first, pickup, 47);
  assert.equal(reunited.events.find(event => event.type === 'threadRescueReunion')?.outcome, expected);
  assert.equal(reunited.open.parts.missions.active.state.delivered, 2);
  const arrived = frame(reunited, home, 51);
  assert.equal(arrived.events.find(event => event.type === 'threadMissionOutcome')?.outcome, expected);
  return frame(frame(frame(arrived, home), home), home);
}
const hands = rescueHome(loadTwo(found, 'two-trips'), 'found');
assert.equal(beat(hands), 'aboard');
assert.equal(hands.open.world.ledger.words['deck-folk'], 'Friendly');
assert.ok(marked(hands, 'all-hands-home'));
assert.equal(favoursOf(hands.open.world, 'deck-folk'), 1);
const two = loadTwo(found, 'two-trips');
const overdue = frame(two, home, 155);
assert.equal(overdue.open.parts.missions.active.state.delivered, 2);
const dawn = frame(frame(frame(frame(overdue, offshore, 121), offshore), home), home);
assert.equal(end(dawn), 'two-at-dawn');
assert.ok(marked(dawn, 'two-at-dawn'));
assert.equal(favoursOf(dawn.open.world, 'deck-folk'), 0);
assert.equal(dawn.open.world.ledger.made.includes(LIGHTS_LADDER_MARK), false);
const guided = rescueHome(loadTwo(ask(found, crew, 'sprat-knows'), 'sprat-leads'), 'met-on-the-way', meeting);
assert.ok(marked(guided, 'sprat-led'));
const basketCrew = frame(cart(leaveBasket()), crew);
assert.ok(marked(rescueHome(loadTwo(basketCrew, 'two-trips'), 'met-by-the-basket', meeting), 'all-hands-home'));

const sounded = frame(talkChoice(ask(found, crew, 'what-for'), crew, 'sounding-first'), crew);
assert.ok(held(sounded));
const bell = frame(sounded, {x: buoy.x - 250, z: buoy.z}, 4);
assert.ok(cue(bell, 'open.buoy.bell'));
const short = frame(bell, buoy, 19);
assert.equal(beat(short), 'buoy');
const stopped = frame(short, buoy, 1);
let taken = frame(frame(stopped, buoy), buoy);
assert.equal(beat(taken), 'sounding');
assert.ok(isFound(taken.open.world, 'bell-buoy'));
taken = ask(taken, buoy, 'why-measure');
const back = frame(frame(frame(taken, crew), crew), crew);
const again = frame(frame(back, crew), crew);
assert.equal(beat(again), 'crew-after-sounding');
const sworn = rescueHome(loadTwo(again, 'two-trips'), 'found');
assert.ok(marked(sworn, 'sounding-taken'));
assert.equal(sworn.open.world.ledger.words['deck-folk'], 'Sworn');

for (const pickedUp of [true, false]) {
  const starts = frame(talkChoice(found, crew, 'walk-in'), crew);
  const lostLamps = frame(starts, offshore, 1);
  assert.match(lostLamps.requests.find(row => row.type === 'say').text, /Driver, slow down/);
  assert.equal(lostLamps.open.parts.missions.active.state.walked, 0);
  const halfway = frame(lostLamps, crew, 60);
  const across = halfway.requests.find(row => row.type === 'threadCarPosition').place;
  const next = frame(halfway, across, .1, {interact: pickedUp});
  const done = frame(next, home, 60);
  assert.equal(done.events.find(event => event.type === 'threadMissionOutcome')?.outcome, pickedUp ? 'all-in' : 'sprat-walked');
  assert.ok(done.events.some(event => event.type === 'threadMissionUsedNight'));
  const arrival = frame(frame(frame(done, home), home), home);
  assert.equal(marked(arrival, 'sprat-walked-in'), !pickedUp);
}

const aboardFoot = position => ({onFoot: true, fighter: {position, deckPlate: WHITES_LADDER.to}});
const chart = p['whites-chart'], bridge = p['whites-bridge-wing'];
for (const [direction, make] of [['watch-salt-road', 'ships-salt-road'], ['watch-ridge-road', 'ships-ridge-road'], ['watch-the-salt', 'ships-salt-pan']]) {
  const atChart = frame(frame(bumped(hands), chart, .1, aboardFoot(chart)), chart, .1, aboardFoot(chart));
  assert.ok(isFound(atChart.open.world, 'bell-buoy'));
  const favoured = talkChoice(atChart, bridge, direction, aboardFoot(bridge));
  assert.equal(end(favoured), 'watch-kept');
  assert.ok(favoured.open.world.ledger.made.includes('watch/' + make));
  assert.equal(favoursOf(favoured.open.world, 'deck-folk'), 0);
}
const watchedWorld = applyEffects(world, {id: 'test/keep-salt-watch', effects: [
  {type: 'made', id: 'watch/ships-salt-road'},
]}).world;
const saltCheckpoint = OPEN_CHECKPOINTS.find(row => row.id === 'salt-road-3');
const ridgeCheckpoint = OPEN_CHECKPOINTS.find(row => row.id === 'ridge-spur-1');
assert.ok(arrivalChance(saltCheckpoint, watchedWorld, []) < arrivalChance(saltCheckpoint, world, []));
assert.equal(arrivalChance(ridgeCheckpoint, watchedWorld, []), arrivalChance(ridgeCheckpoint, world, []));
const ahead = {...saltCheckpoint.position, x: saltCheckpoint.position.x - saltCheckpoint.radius - 200};
const roadWatch = checkpointsPart.step({}, {world: watchedWorld, holds: [], view: {
  checkpointsEnabled: true, carPosition: ahead, carSpeedMph: 35, checkpointHeading: Math.PI / 2,
}}, 1);
assert.deepEqual(roadWatch.state.masthead, saltCheckpoint.position);
const climb = stepRoam(null, {}, {onFoot: true, interact: true, fighter: {position: WHITES_LADDER.foot}, open: {lightsLadder: true}});
assert.equal(climb.state.plate, WHITES_LADDER.to);
assert.equal(deckFloorHeightAt(climb.state.plate, WHITES_LADDER.top.x, WHITES_LADDER.top.z), 4);
assert.deepEqual(stepRoam(null, {}, {onFoot: true, interact: true, fighter: {position: WHITES_LADDER.foot}}).events, []);

const otherMission = {id: 'test/a-different-rescue', by: 'car', rule: {pickup: 'a', home: 'b', people: 1, seats: 2,
  foundWithinMetres: 6, success: 'brought-home', wrecked: 'lost'}};
const kind = MISSION_KINDS.rescue;
const otherRoute = kind.prepare(otherMission, key => ({a: crew, b: home})[key]);
let other = kind.begin(otherMission, otherRoute).state;
assert.equal(kind.step(otherMission, other, {carPosition: crew, onFoot: true}, 1).state.aboard, 0);
other = kind.step(otherMission, other, {carPosition: crew}, 1).state;
assert.equal(kind.step(otherMission, other, {carPosition: home}, 1).outcome, 'brought-home');
assert.equal(kind.step(otherMission, other, {combatWrecking: true}, 1).outcome, 'lost');

assert.ok(Number.isFinite(scablandsSurfaceHeightAt(road.x, road.z)));
for (const [start, target] of [[road, crew], [crew, home], [home, meeting]]) {
  let last = start;
  for (let i = 1; i <= 160; i++) {
    const point = {x: start.x + (target.x - start.x) * i / 160, z: start.z + (target.z - start.z) * i / 160};
    assert.equal(stepMover(last, point, {solids: false}).blocked, false, 'the laptop route is clear of terrain');
    last = point;
  }
}
const parseSource = source => new Function('return ' + source);
await run({navigate: () => {}, waitFor: parseSource, evaluate: parseSource, screenshot: () => {}});
console.log('Lights on the Whites passed: witness, silence, all mission outcomes, ledger, ladder, and laptop sources.');
