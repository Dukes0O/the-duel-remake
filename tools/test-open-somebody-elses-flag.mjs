import assert from 'node:assert/strict';
import {FEATURE_STATES, createFeatureFlags} from '../src/feature-flags.js';
import {checkThread} from '../src/world/open/check-tables.js';
import {newWorld} from '../src/world/open/open-record.js';
import {applyEffects} from '../src/world/open/open-effects.js';
import {beginOpenLand, stepOpenLand} from '../src/world/open/open-land.js';
import {threadsAtBankedHearth, threadsPart, OPEN_THREADS} from '../src/world/open/parts/threads.js';
import {missionsPart} from '../src/world/open/parts/missions.js';
import {MISSION_KINDS} from '../src/world/open/content/mission-kinds.js';
import {FLAG_ID, flagStory, stagedFlag, FLAG_SPOTS} from '../src/world/open/content/somebody-elses-flag-places.js';
import {witnessThing} from '../src/story/threads/signs.js';
import {placeForThread} from '../src/story/scenes/burned-camp.js';
import {walkThread} from './thread-crossings.mjs';
import {isHeld} from '../src/world/open/holds.js';
import {openMapMarks} from '../src/world/open/map-marks.js';
import {sitePosition} from '../src/world/open/site-rule.js';
import {sitesPart} from '../src/world/open/parts/sites.js';
import {flagPeople} from '../src/world/open/content/somebody-elses-flag-places.js';
import {createStoryPeople} from '../src/world/jobs/story-people.js';
import {peoplePart} from '../src/world/open/parts/people.js';
import {checkpointsPart} from '../src/world/open/parts/checkpoints.js';
import {createSignView} from '../src/world/open/sign-view.js';
import {feudOf} from '../src/world/open/open-record.js';
import {stepRecovery} from '../src/world/open/encounter-rule.js';
import {scablandsSurfaceHeightAt} from '../src/world/scablands-ground.js';
import {stepMover} from '../src/world/scablands-movers.js';
import {pageFunctions, pageSource} from './scenarios/open-somebody-elses-flag.mjs';
import {Duel} from '../src/game.js';
import {openRoamJob} from '../src/world/open/roam-job.js';
import {placeActor} from '../src/arena/arena-event.js';
import {LAND} from '../src/world/scablands-names.js';
import {flagSolids} from '../src/world/open/content/somebody-elses-flag-places.js';
import {actOnTalk, startTalk, talkScreen} from '../src/story/talk.js';

assert.equal(FEATURE_STATES['story-choices'], 'dev');
assert.equal(createFeatureFlags({qa: false, storage: null, search: ''}).enabled('story-choices'), false);
assert.ok(OPEN_THREADS.some(row => row.id === FLAG_ID));
assert.deepEqual(checkThread(flagStory), []);
assert.deepEqual(walkThread(flagStory).faults, []);
const initial = () => applyEffects(newWorld({seed: 1234, night: 6, scrap: 90, embers: 3}), {id: 'fixture', effects: [
  {type: 'find', site: 'sweet-seep'}, {type: 'find', site: 'glasshouse'},
  {type: 'word', person: 'glasshouse', set: 'Friendly'},
  {type: 'thread', id: FLAG_ID, to: 'sign', cast: {camp: 'glasshouse'}},
]}).world;
const begin = (world = initial()) => beginOpenLand({id: 'open-roam', steps: [{kind: 'roam'}], open: {world}});
const locate = (place, world = initial()) => placeForThread(place, {}, {landSeed: world.open.landSeed});
const well = locate('sweet-seep'), table = locate(['sweet-seep', 'table']);
const frame = (open, point = table, extra = {}, dt = .1) => stepOpenLand(open, {
  player: {position: point}, carPosition: point, fighter: {position: point}, openRoam: true,
  checkpointsEnabled: true, onFoot: true, signHeightAt: () => 0, ...extra,
}, dt, [threadsPart, missionsPart]);
const record = open => open.world.open.threads[FLAG_ID];
const marks = open => open.world.ledger.marks;
const choice = (open, beat, id, point = table) => frame(open, point, {
  jobEvents: [{type: 'talkChoice', id: `${FLAG_ID}/${beat}/decision/${id}`}],
});

assert.ok(well && table && Object.keys(FLAG_SPOTS).length >= 10);
const entry = {sign: flagStory.sign, at: well};
assert.equal(witnessThing(entry, {player: {position: {...well, x: well.x + 2501}}, signHeightAt: () => 0}, 3, 1).witnessed, false);
assert.equal(witnessThing(entry, {player: {position: table}, signHeightAt: () => 0}, 0, 2.99).witnessed, false);
assert.equal(witnessThing(entry, {player: {position: table}, signHeightAt: () => 0}, 2.99, .01).witnessed, true);
assert.equal(witnessThing(entry, {player: {position: {...well, z: well.z + 230}}, signHeightAt: scablandsSurfaceHeightAt}, 0, 3).witnessed, true);
assert.deepEqual(checkThread(stagedFlag(initial())), []);
assert.ok(MISSION_KINDS.fight, 'The reusable car fight rule exists.');

const sign = frame(begin(), table, {}, 3);
assert.equal(record(sign.open).beat, 'site');
assert.ok(sign.events.some(event => event.cue === 'open.flag.seen'));
assert.ok(marks(sign.open).includes(FLAG_ID + '/tower-seen'));
assert.equal(openMapMarks(sign.open.world, sitePosition).sites.find(row => row.id === 'sweet-seep').name,
  flagStory.notes.sign.mapName);
assert.deepEqual(frame(begin(), table, {checkpointsEnabled: false}, 10).open.world, initial());
const unstarted = initial();
delete unstarted.open.threads[FLAG_ID];
// Give the hearth director only this storyline, independent of other loaded storylines.
const fromHearth = threadsAtBankedHearth({world: unstarted, view: {}}, [flagStory]);
assert.equal(fromHearth.open.threads[FLAG_ID].beat, 'sign');
assert.deepEqual(fromHearth.open.threads[FLAG_ID].cast, {camp: 'glasshouse'});
assert.equal(frame(begin(unstarted), table, {checkpointsEnabled: false, groundRegion: 'west'}, 10).open.world.open.threads[FLAG_ID], undefined);
assert.equal(record(frame(sign.open, table, {onFoot: false}).open).beat, 'site');
const site = frame(sign.open);
assert.ok(marks(site.open).includes(FLAG_ID + '/entered/site'));
assert.ok(!marks(site.open).includes(FLAG_ID + '/peg-read'));
for (const id of ['peg', 'reeds', 'board', 'stakes']) {
  const found = frame(site.open, locate(['sweet-seep', id]));
  assert.ok(marks(found.open).includes(FLAG_ID + '/' + ({peg: 'peg-read', reeds: 'reeds-seen', board: 'board-read', stakes: 'stakes-seen'}[id])));
  assert.ok(found.events.some(event => event.cue === 'open.clue.found'));
}
const openTalk = open => frame(open, table, {interact: true});
const sceneOf = out => out.requests.find(row => row.type === 'talk').scene;
const selectTalk = (scene, talk, kind, words) => {
  const index = talkScreen(scene, talk).options.findIndex(option => option.kind === kind && option.words === words);
  assert.ok(index >= 0, `${words} is available in ${scene.id}`);
  return actOnTalk(scene, talk, {type: 'select', index});
};
const finishTalk = (out, scene, result) => {
  assert.equal(result.state.phase, 'done');
  return frame(out.open, table, {jobEvents: [{type: 'talkChoice', scene: scene.id, ...result.choice}]});
};

const siteTalk = openTalk(site.open), siteScene = sceneOf(siteTalk);
const siteStart = startTalk(siteScene);
assert.ok(talkScreen(siteScene, siteStart).options.some(option => option.kind === 'ask'));
const offerShare = flagStory.beats.site.choices.find(row => row.id === 'share').words + '.';
const share = selectTalk(siteScene, siteStart, 'say', offerShare);
assert.deepEqual(share.choice.asked, []);
let shared = finishTalk(siteTalk, siteScene, share);
assert.equal(record(shared.open).beat, 'schedule');
shared = openTalk(frame(shared.open).open);
const schedule = sceneOf(shared), scheduleStart = startTalk(schedule);
const [firstQuestion, secondQuestion] = flagStory.beats.schedule.questions;
const signWords = flagStory.beats.schedule.choices.find(row => row.id === 'sign').words + '.';
assert.ok(talkScreen(schedule, scheduleStart).options.some(option => option.kind === 'say' && option.words === signWords));
const answer = selectTalk(schedule, scheduleStart, 'ask', firstQuestion.words);
assert.equal(talkScreen(schedule, answer.state).line.words, firstQuestion.lines[0].words);
const afterAnswer = actOnTalk(schedule, answer.state, {type: 'advance'}).state;
assert.deepEqual(talkScreen(schedule, afterAnswer).options.filter(option => option.kind === 'ask').map(option => option.words),
  [secondQuestion.words]);
const signed = selectTalk(schedule, afterAnswer, 'say', signWords);
shared = finishTalk(shared, schedule, signed);
assert.equal(record(shared.open).end, 'shared');
assert.ok(marks(shared.open).includes(`${FLAG_ID}/asked/${firstQuestion.id}`));
assert.ok(!marks(shared.open).includes(`${FLAG_ID}/asked/${secondQuestion.id}`));
assert.equal(shared.open.world.open.favours.glasshouse, 1);
assert.equal(feudOf(shared.open.world, 'water-men'), 'Watching');
assert.equal(shared.open.world.scrap, 90);

const buy = ({fee = false, water = false, atOdds = false} = {}) => {
  let out = site;
  if (fee) out = choice(out.open, 'site', 'take-the-fee');
  const afterFee = out.open.world.scrap;
  if (fee) assert.equal(choice(out.open, 'site', 'take-the-fee').open.world.scrap, afterFee, 'The fee is paid once.');
  out = choice(out.open, 'site', 'buy');
  out = frame(out.open);
  assert.equal(record(out.open).beat, 'price');
  out = frame(out.open, table, {jobEvents: [{type: 'talkChoice', id: FLAG_ID + '/radio-done'}]});
  assert.equal(record(out.open).beat, 'hearth');
  assert.equal(frame(out.open).open.world.scrap, afterFee, 'The town loan requires a visit to the hearth.');
  const hearth = locate(['tin-town', 'hearth']);
  out = frame(out.open, hearth);
  assert.equal(out.open.world.scrap, afterFee + 60);
  assert.ok(out.open.world.ledger.obligations.some(row => row.id === FLAG_ID + '/town-tin'));
  out = frame(out.open, hearth);
  assert.equal(record(out.open).beat, 'carry');
  out = frame(out.open, hearth, {onFoot: false});
  assert.equal(out.events[0].type, 'threadMission');
  assert.equal(out.open.holds.length, 0, 'Carrying the price keeps checkpoints armed.');
  out = frame(out.open, well, {onFoot: false});
  assert.equal(out.events[0].outcome, 'unseen');
  out = frame(out.open);
  out = frame(out.open);
  assert.equal(record(out.open).beat, 'table');
  const effects = [
    ...(water ? [{type: 'mark', id: FLAG_ID + '/water-struck'}] : []),
    ...(atOdds ? [{type: 'feud', of: 'water-men', by: 1}, {type: 'scrap', by: 200}] : []),
  ];
  return effects.length ? {...out.open, world: applyEffects(out.open.world, {id: 'fixture/price', effects}).world} : out.open;
};
let bought = choice(buy({fee: true}), 'table', 'pay-scrap');
assert.equal(bought.open.world.scrap, 0);
bought = frame(frame(bought.open).open);
assert.equal(record(bought.open).end, 'bought');
assert.ok(marks(bought.open).includes(FLAG_ID + '/bought-out'));
assert.ok(bought.open.world.ledger.made.includes(FLAG_ID + '/hand-pump'));
assert.equal(bought.open.world.ledger.words.glasshouse, 'Sworn');
for (const water of [false, true]) {
  const carried = buy({water});
  const paid = choice(carried, 'table', 'pay-ember');
  assert.equal(paid.open.world.scrap, 150 - (water ? 140 : 60));
  assert.equal(paid.open.world.ledger.stocks.embers, 2);
  assert.ok(marks(paid.open).includes(FLAG_ID + '/ember-paid'));
}
const dearer = buy({atOdds: true});
assert.equal(choice(dearer, 'table', 'pay-ember').open.world.scrap, dearer.world.scrap - 100);
const short = buy();
assert.equal(choice(short, 'table', 'pay-scrap').open.world.scrap, 150, 'A short price cannot buy the site.');
const newMorning = buy({fee: true});
newMorning.world.ledger.night += 2;
assert.equal(choice(newMorning, 'table', 'pay-scrap').open.world.scrap, 160, 'The first tick after water is struck already needs the higher price.');
let back = choice(short, 'table', 'cannot-pay-it');
back = choice(back.open, 'site', 'buy');
assert.equal(record(back.open).beat, 'price', 'The price can be revisited after a refusal.');

const laterWorld = {...initial(), ledger: {...initial().ledger, night: 8}};
const struck = frame(begin(laterWorld));
assert.ok(marks(struck.open).includes(FLAG_ID + '/water-struck'));
const ignored = frame(begin({...initial(), ledger: {...initial().ledger, night: 9}}));
assert.equal(record(ignored.open).end, 'stays');
assert.ok(marks(ignored.open).includes(FLAG_ID + '/company-keeps-it'));
const droveAway = frame(site.open, {...well, z: well.z + 100}, {onFoot: false});
assert.equal(record(frame(droveAway.open).open).end, 'stays');
const noCamp = initial();
noCamp.open.threads[FLAG_ID].cast = {};
const lonely = frame(frame(frame(begin(noCamp), table, {}, 3).open).open, table, {interact: true});
assert.ok(!lonely.requests.flatMap(row => row.scene?.choices ?? []).some(row => row.id.endsWith('/share')));
assert.equal(record(choice(lonely.open, 'site', 'share').open).beat, 'site', 'A camp is required to offer the schedule.');

const startFight = () => {
  let out = choice(site.open, 'site', 'drive-at-the-rope');
  out = frame(out.open, table, {onFoot: false});
  assert.ok(isHeld(out.open.holds, 'checkpoints') && isHeld(out.open.holds, 'signs'));
  return frame(out.open, table, {onFoot: false});
};
const started = startFight();
const fightRequest = started.requests.find(row => row.type === 'riders');
assert.equal(fightRequest.vehicles.length, 2);
assert.ok(fightRequest.vehicles.every(row => Number.isFinite(row.start.heading)));
assert.equal(fightRequest.missionRule.shoot, false);
const fightId = flagStory.beats.fight.mission.id;
const fightCars = [
  {x: table.x - 3, z: table.z, y: 0}, {x: table.x + 3, z: table.z, y: 0},
];
for (const loss of ['wrecked', 'boxed']) {
  let out = started;
  if (loss === 'boxed') {
    out = frame(out.open, table, {onFoot: false, road: {id: fightId, cars: fightCars}, carSpeedMph: 0}, 5.99);
    assert.ok(!out.events.some(row => row.type === 'threadMissionOutcome'));
    const broken = frame(out.open, table, {onFoot: false, road: {id: fightId, cars: [fightCars[0]]}}, .01);
    assert.equal(broken.open.parts.missions.active.state.boxed, 0);
  }
  out = frame(out.open, table, {onFoot: false, combatWrecking: loss === 'wrecked',
    road: {id: fightId, cars: fightCars}, carSpeedMph: 0}, .01);
  assert.equal(out.events.at(-1).outcome, 'lost');
  assert.equal(out.open.world.scrap, 45);
  assert.equal(isHeld(out.open.holds, 'checkpoints'), false);
  assert.ok(out.requests.some(row => row.action === 'mission-loss'));
  out = frame(out.open);
  assert.equal(record(out.open).end, 'beaten');
  assert.equal(feudOf(out.open.world, 'water-men'), 'Raiding');
  assert.ok(marks(out.open).includes(FLAG_ID + '/towed-off'));
  const recovery = stepRecovery(null, {world: out.open.world, view: {combatWrecking: true, recoveryPaid: true, carPosition: well}}, [], 1);
  assert.ok(!recovery.choices[0].effects.some(row => row.type === 'scrap'), 'The ordinary recovery does not charge again.');
}
let won = frame(started.open, table, {onFoot: false, road: {id: fightId, cars: [{...fightCars[0], wrecked: true}, fightCars[1]]}});
assert.equal(won.events.at(-1).outcome, 'won');
won = frame(won.open);
assert.equal(record(won.open).end, 'driven-off');
assert.equal(won.open.world.scrap, 90);
assert.equal(feudOf(won.open.world, 'water-men'), 'Raiding');
assert.equal(won.open.world.ledger.words.glasshouse, 'Sworn');
const cancelled = frame(started.open, table, {missionLeaving: true});
assert.equal(cancelled.events.at(-1).type, 'threadMissionCancelled');
assert.equal(cancelled.open.world.scrap, 90);
assert.equal(cancelled.open.holds.length, 0);
const recoveryTick = stepOpenLand(started.open, {player: {position: table}, carPosition: table,
  onFoot: false, openRoam: true, checkpointsEnabled: true, combatWrecking: true,
  road: {id: fightId, cars: []}}, .1, [threadsPart, missionsPart, checkpointsPart]);
assert.equal(recoveryTick.open.world.scrap, 45, 'The same-tick recovery cannot take a second share of the price.');

const unknown = begin(newWorld({seed: 1234}));
const discovery = stepOpenLand(unknown, {checkpointsEnabled: true, player: {position: well}, carPosition: well}, .1, [sitesPart]);
assert.ok(discovery.open.world.open.found.includes('sweet-seep'));
const cast = stepOpenLand(begin(), {checkpointsEnabled: true, openRoam: true}, 0, [peoplePart]).open.parts.people.cast;
assert.equal(createStoryPeople(cast).filter(row => flagPeople(initial()).some(person => person.id === row.id)).length, 6);
// The one scripted approach is continuous ground, clear of bridges and decks.
let previous = {...well, z: well.z + 230};
for (let z = previous.z - 2; z >= well.z + 35; z -= 2) {
  const point = {...well, z};
  assert.equal(stepMover(previous, point, {solids: false}).blocked, false);
  previous = point;
}
const visual = createSignView(), beforeDraw = structuredClone(sign.open);
visual.update({open: sign.open}, table, 3);
const tower = visual.group.getObjectByName('The Sweet Seep');
assert.equal(tower.visible, true);
assert.ok(Math.hypot(tower.position.x - well.x, tower.position.z - well.z) < .01, 'The tower is drawn on the well.');
assert.ok(tower.getObjectByName('The white flag'));
assert.equal(tower.children[0].visible, true);
visual.update({open: {...sign.open, parts: {...sign.open.parts, threads: {...sign.open.parts.threads,
  places: {partOfDay: 'dark', checkpointsEnabled: true}}}}}, table, 4);
const lamps = []; tower.traverse(row => { if (row.name === 'Sweet Seep work lamp') lamps.push(row); });
assert.equal(lamps.filter(row => row.visible).length, 2);
assert.deepEqual(sign.open, beforeDraw, 'Drawing never changes the rule state.');
visual.update({open: {...sign.open, parts: {...sign.open.parts, threads: {places: {checkpointsEnabled: false}}}}}, table, 4);
assert.equal(tower.visible, false, 'The site scenery is also behind the switch.');
visual.dispose();

// The company, its people and its drill stand on the Sweet Seep itself. Until OPEN-T-FLAG-2 they stood 780 m away, where
// the site was before it moved, while its talks and clues were at the new place.
{
  const posts = Object.fromEntries(flagPeople(initial()).map(row => [row.id, LAND.at(...row.routine.day.at)]));
  const near = (a, b) => Math.hypot(a.x - b.x, a.z - b.z);
  for (const [id, spot] of [['miss-pell', 'pell'], ['flag-crew-1', 'pickup-left'], ['flag-crew-2', 'pickup-right'],
    ['flag-crew-3', 'stakes'], ['marigold', 'rope'], ['finch', 'finch']])
    assert.ok(near(posts[id], locate(['sweet-seep', spot])) < .01, id + ' stands at the Sweet Seep.');
  const drill = flagSolids(initial(), scablandsSurfaceHeightAt).find(row => row.id === 'flag-drill');
  assert.ok(near(drill, well) < .01, 'The drill stands on the well.');
}

// The native adapter receives the same reusable fight request as the pure runner.
const duel = new Duel({seed: 1234, featureFlags: {'hidden-road': true, 'story-choices': true, arsenal: true, 'scablands-realism': true}});
duel.state.wastelandGateDiscovered = true;
const fightWorld = applyEffects(initial(), {id: 'fixture/native-fight', effects: [
  {type: 'thread', id: FLAG_ID, to: 'fight'},
]}).world;
const job = {...openRoamJob({}, 1234), open: {world: fightWorld}};
assert.ok(duel.startArenaEvent({seed: 1234, venueId: 'scablands', mode: 'world-job', car: 'falcone_f42', opponents: [], cpuDifficulty: 'easy', job}));
while (duel.state.status === 'countdown') duel.step(1 / 60);
const native = duel.state.arena.worldJob;
duel.state.onFoot = false;
duel.state.fighter = null;
const near = duel.course.nearest(table.x, table.z);
placeActor(duel, duel.state, {...near, headingError: -duel.course.at(near.s).heading,
  height: scablandsSurfaceHeightAt(table.x, table.z)});
for (let tick = 0; tick < 4; tick++) duel.step(1 / 60);
assert.equal(native.open.parts.missions.active.id, fightId, 'The native roam runner starts the authored fight.');
assert.equal(duel.state.opponents.length, 2);
for (const car of duel.state.opponents) {
  assert.ok(Number.isFinite(car.headingError));
  assert.deepEqual(car.weaponLoadout, []);
  assert.equal(car.roadRider.mass, 3000);
  assert.equal(duel._vehicleSpec(car).mass, 3000);
  assert.ok(car.roadRider.missionPace < 52);
}
duel.state.opponents[0].combatWrecking = true;
for (let tick = 0; tick < 4; tick++) duel.step(1 / 60);
assert.equal(native.open.world.open.threads[FLAG_ID].end, 'driven-off', 'One native pickup wreck completes the authored fight.');
for (const name of Object.keys(pageFunctions)) new Function('return ' + pageSource(name, {}, 'test', 5));

console.log('test-open-somebody-elses-flag: passed');
