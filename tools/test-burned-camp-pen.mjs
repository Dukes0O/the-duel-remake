// OPEN-BURNED-PEN: the burned camp's Scene 4 for the Road Rats (docs/story/open-scablands.md, section 21) and the offer
// of section 23 after a ransom. Each way into the pen and out of it writes its ledger lines; the ransom takes the
// player's scrap, then the till, then embers, never below nothing; the price rises after a caught break-out.
import assert from 'node:assert/strict';
import burned from '../src/story/threads/content/burned-camp.js';
import {placeForThread} from '../src/story/scenes/burned-camp.js';
import {bankHearth} from '../src/story/ledger.js';
import {RATS_NEST_LAYOUT} from '../src/world/open/looks/rats-nest-look.js';
import {BURNED_SCOUT} from '../src/world/open/content/burned-scout.js';
import {BURNED_PEN, PEN_GUARD, penPeople} from '../src/world/open/content/burned-pen.js';
import {heistGuardPose, lookoutSees} from '../src/world/open/content/mission-kinds.js';
import {OPEN_CHECKPOINTS, drawCheckpoint} from '../src/world/open/checkpoint-rule.js';
import {DUSK_START} from '../src/world/open/day-rule.js';
import {applyEffects} from '../src/world/open/open-effects.js';
import {beginOpenLand, stepOpenLand} from '../src/world/open/open-land.js';
import {feudOf} from '../src/world/open/open-record.js';
import {checkpointsPart} from '../src/world/open/parts/checkpoints.js';
import {missionsPart} from '../src/world/open/parts/missions.js';
import {threadsPart} from '../src/world/open/parts/threads.js';
import {ransomEffects, ransomTerms} from '../src/world/open/ransom-rule.js';
import {GAS_ROUTINE} from '../src/world/open/content/routines.js';
import {mayOfferRoutine, routineFor, shortAfterLoss} from '../src/world/open/routine-run-rule.js';
import {sampleWorld} from '../src/world/open/samples.js';
import {sitePosition} from '../src/world/open/site-rule.js';
import {STORY_FIGURES} from '../src/world/jobs/story-people.js';
import {pageFunctions, pageSource} from './scenarios/open-burned-pen.mjs';

const ID = burned.id;
const cast = {camp: 'glasshouse', enemy: 'road-rats'};
const apply = (world, id, effects) => applyEffects(world, {id, effects}).world;
const base = apply(sampleWorld('after-the-smoke'), 'fixture/at-the-rim', [
  {type: 'thread', id: ID, to: 'rim', cast}, {type: 'mark', id: 'burned-camp/burned'},
  {type: 'mark', id: 'burned-camp/found/south-end'}, {type: 'mark', id: 'burned-camp/knows-drain'},
]);
const nest = sitePosition('rats-nest', base.open.landSeed);
const sitePositions = {'rats-nest': {position: nest,
  spots: {...RATS_NEST_LAYOUT.spots, ...BURNED_SCOUT.spots, ...BURNED_PEN.spots}}};
const at = spot => placeForThread(['rats-nest', spot], cast, {sitePositions});
const flat = () => 0;
const parts = [threadsPart, missionsPart];
const roam = world => beginOpenLand({id: 'open-roam', steps: [{kind: 'roam'}], open: {world, dayClock: true}});
const toBeat = (world, beat, effects = []) => apply(world, 'fixture/' + beat, [{type: 'thread', id: ID, to: beat}, ...effects]);
const step = (open, point, view = {}, dt = .25) => stepOpenLand(open, {
  player: {position: point}, fighter: {position: point}, carPosition: view.onFoot === false ? point : at('car-hollow'),
  onFoot: true, openRoam: true, checkpointsEnabled: true, sitePositions, missionHeightAt: flat, ...view,
}, dt, parts);
const beat = open => open.world.open.threads[ID].beat;
const marks = open => open.world.ledger.marks;
const said = out => out.requests.filter(row => row.type === 'say').map(row => row.text);
const outcome = out => out.events.find(event => event.type === 'threadMissionOutcome')?.outcome;
const talkOf = out => out.requests.find(row => row.type === 'talk');
const choose = (open, point, beatId, option) => step(open, point, {jobEvents: [{type: 'talkChoice',
  id: `${ID}/${beatId}/decision/${option}`}]});

// The guard's round is the same row for his figure and for his lamp, and it is a routine like anybody's.
const round = {...PEN_GUARD, round: {...PEN_GUARD.round, stops: PEN_GUARD.round.stops.map(stop => ({...stop, at: at(stop.at[1])}))}};
const guardAt = seconds => heistGuardPose(round, seconds);
// Where the guard is in his round: [0, 8) at the drain, then to the pen's gate, six seconds there (about 43 to 49), to
// the fire, twelve seconds warming his hands (about 75 to 87), and back to the drain.
const stops = round.round.stops;
const cycle = stops.reduce((sum, stop, index) => sum + stop.seconds + Math.hypot(stops[(index + 1) % stops.length].at.x - stop.at.x,
  stops[(index + 1) % stops.length].at.z - stop.at.z) / round.pace, 0);
const phase = seconds => seconds % cycle;
for (const id of ['pen-inside', 'pen-slip', 'held-car', 'hide-1', 'hide-2', 'hide-3', 'bay-front-1', 'bay-front-6']) {
  const spot = BURNED_PEN.spots[id];
  assert.ok(!RATS_NEST_LAYOUT.solids.some(solid => Math.hypot(spot.x - solid.x, spot.z - solid.z) <
    Math.hypot(solid.halfX, solid.halfZ) * (id.startsWith('bay-front') ? 1 : .5)), id + ' stands clear of the Nest\'s solids');
}
const guardFigure = penPeople(base).find(row => row.id === 'pen/guard');
assert.equal(guardFigure.figure, 'road-rat-lamp');
assert.ok(STORY_FIGURES[guardFigure.figure]);
assert.deepEqual(penPeople(base).map(row => row.figure), ['marigold', 'finch', 'grower-1', 'grower-2', 'grower-3', 'road-rat-lamp']);

// Moves a person on foot to a point at a walking pace, waiting wherever the next step would be in the guard's light.
// Returns the open land, every output on the way, and the seconds it took.
function creep(open, from, to, view = {}, pace = 1.5) {
  let here = from, out = null;
  const outs = [];
  for (let tick = 0; tick < 4000; tick++) {
    const gap = Math.hypot(to.x - here.x, to.z - here.z);
    if (gap < .2) break;
    const move = Math.min(gap, pace * .25);
    const next = {x: here.x + (to.x - here.x) / gap * move, z: here.z + (to.z - here.z) / gap * move};
    const later = [0, .5, 1, 1.5].some(ahead => lookoutSees(guardAt(open.seconds + ahead), next, flat));
    if (!later) here = next;
    out = step(open, here, view);
    outs.push(out);
    open = out.open;
    if (outcome(out)) break;
  }
  return {open, here, outs};
}
const waitFor = (open, point, ready, view = {}) => {
  for (let tick = 0; tick < 2000 && !ready(open.seconds); tick++) open = step(open, point, view).open;
  return open;
};

// 1. Driving in alone. Won: Sump's line, the Road Rats to Raiding, the mark, and the escort home.
{
  const world = toBeat(base, 'alone');
  let out = step(roam(world), at('road-top'), {onFoot: false});
  const start = out.events.find(event => event.type === 'threadMission');
  assert.equal(start?.mission.kind, 'fight', 'the fight begins at the top of the cutting\'s road, by car');
  assert.equal(start.route.starts.length, 6, 'six buggies come out of the row');
  const riders = step(out.open, at('road-top'), {onFoot: false});
  assert.equal(riders.requests.find(row => row.type === 'riders')?.vehicles.length, 6);
  const won = step(riders.open, at('road-foot'), {onFoot: false,
    jobEvents: [{type: 'riderFight', id: `${ID}/alone`, outcome: 'won', wrecks: 4}]});
  assert.equal(outcome(won), 'won');
  out = step(won.open, at('road-foot'), {onFoot: false});
  assert.match(said(out)[0], /^Sump: All right, all right, you can take them!/);
  assert.equal(beat(out.open), 'alone-home');
  assert.ok(marks(out.open).includes('burned-camp/took-them-alone'));
  assert.equal(feudOf(out.open.world, 'road-rats'), 'Raiding');
  assert.ok(won.events.some(event => event.type === 'threadMissionOutcome') && out.events.some(event => event.cue === 'open.pen.chain'));

  // Lost: boxed in for six seconds. Sump's two lines, and the player is taken to the pen at dusk, the car held.
  const lost = step(riders.open, at('road-foot'), {onFoot: false,
    jobEvents: [{type: 'riderFight', id: `${ID}/alone`, outcome: 'surrounded'}]});
  assert.equal(outcome(lost), 'lost');
  assert.ok(lost.events.some(event => event.type === 'threadMissionTaken'), 'the loss is not towed home');
  assert.ok(!lost.requests.some(row => row.action === 'mission-loss'), 'no recovery is charged for being taken');
  // The checkpoints do not tow a taken player home, and waive nothing for a later wreck.
  const towed = checkpointsPart.step({}, {world, holds: [], events: [{type: 'threadMissionTaken', id: `${ID}/alone`}],
    view: {checkpointsEnabled: true, combatWrecking: true, carPosition: at('road-foot'), player: at('road-foot')}}, 1 / 60);
  assert.equal(towed?.state.recovery, undefined);
  assert.notEqual(towed?.state.missionLossPaid, true);
  out = step(lost.open, at('road-foot'), {onFoot: false});
  assert.deepEqual(said(out).map(text => text.slice(0, 22)), ['Sump: Well, look at th', "Sump: There's no need "]);
  assert.equal(beat(out.open), 'pen');
  assert.ok(marks(out.open).includes('burned-camp/taken-to-nest'));
  out = step(out.open, at('road-foot'), {onFoot: false});
  const taken = out.requests.find(row => row.type === 'threadTaken');
  assert.deepEqual([taken.held, Math.round(taken.foot.x), Math.round(taken.car.z)],
    [true, Math.round(at('pen-inside').x), Math.round(at('held-car').z)]);
  assert.ok(out.open.daySeconds >= DUSK_START, 'it is dusk in the pen');
  assert.ok(said(out).some(text => text.startsWith('Sump: Good evening, Tin Town.')), 'Sump calls Tin Town on the radio');
  assert.ok(said(out).some(text => text.startsWith('Auntie Solder: You\'ll have your answer in the morning.')));
  assert.equal(step(out.open, at('pen-inside')).requests.filter(row => row.type === 'threadTaken').length, 0,
    'the player is taken once in a roam');
  assert.equal(step(roam(out.open.world), at('pen-inside')).requests.filter(row => row.type === 'threadTaken').length, 1,
    'and taken back to the pen in a roam that meets it again');
}

// 2. Going in by the drain, not seen: the wrench on the chain for eight seconds, Marigold's line, out by the drain.
let drainOut;
{
  const world = toBeat(base, 'drain');
  let out = step(roam(world), at('drain-out'));
  const start = out.events.find(event => event.type === 'threadMission');
  assert.equal(start?.mission.kind, 'heist');
  assert.equal(start.route.guards.length, 1);
  let open = out.open;
  // In through the drain while the guard walks to the fire, along the east side to a wreck by the pen, and there until
  // he has nearly finished at the pen's gate.
  open = waitFor(open, at('drain-out'), seconds => phase(seconds) > 60 && phase(seconds) < 61);
  let walk = creep(open, at('drain-out'), at('drain-in'));
  const ways = [walk];
  walk = creep(walk.open, walk.here, at('hide-2'));
  ways.push(walk);
  walk = creep(walk.open, walk.here, at('hide-1'));
  ways.push(walk);
  open = waitFor(walk.open, at('hide-1'), seconds => phase(seconds) > 41.8 && phase(seconds) < 42.3);
  walk = creep(open, at('hide-1'), at('pen-gate'));
  ways.push(walk);
  assert.equal(ways.some(way => way.outs.some(row => row.requests.some(request => request.type === 'searchCast' &&
    request.guards && request.lamps.length === 1))), true, 'the guard\'s lamp is drawn as a search lamp is');
  assert.ok(ways.every(way => way.outs.every(row => !outcome(row))), 'the way in is not seen');
  open = walk.open;
  let wrench = null;
  for (let tick = 0; tick < 40 && !wrench; tick++) {
    out = step(open, at('pen-gate'), {wrench: true});
    open = out.open;
    if (said(out).some(text => text.startsWith('Marigold: Take the boy and go.'))) wrench = tick;
  }
  assert.ok(wrench !== null && wrench >= 31, 'the chain takes eight seconds with the wrench');
  walk = creep(open, at('pen-gate'), at('drain-in'));
  walk = creep(walk.open, walk.here, at('drain-out'));
  out = walk.outs.at(-1);
  assert.equal(outcome(out), 'out');
  out = step(out.open, at('drain-out'));
  assert.equal(beat(out.open), 'home');
  assert.ok(marks(out.open).includes('burned-camp/drain-out'));
  assert.ok(out.events.some(event => event.cue === 'open.pen.chain'));
  assert.deepEqual(penPeople(out.open.world).map(row => row.figure), ['marigold', 'grower-3', 'road-rat-lamp'],
    'Finch and two growers are no longer in the pen');
  drainOut = out.open;

  // Two seconds in the guard's light is being taken: the guard shouts, and the player is put in the pen.
  let lit = step(roam(world), at('drain-out'));
  open = lit.open;
  open = waitFor(open, at('drain-out'), seconds => phase(seconds) < 2);
  const facing = guardAt(open.seconds);
  const inFront = {x: facing.x + Math.sin(facing.heading) * 5, z: facing.z + Math.cos(facing.heading) * 5};
  for (let tick = 0; tick < 12 && !outcome(lit); tick++) lit = step(lit.open ?? open, inFront);
  assert.equal(outcome(lit), 'taken');
  assert.ok(lit.events.some(event => event.cue === 'open.guard.shout'));
  const ejected = lit.requests.find(row => row.type === 'threadFootPosition')?.place;
  assert.deepEqual([ejected?.x, ejected?.z], [at('pen-inside').x, at('pen-inside').z], 'the player is put in the pen');
  lit = step(lit.open, at('pen-inside'));
  assert.equal(beat(lit.open), 'pen');
  assert.ok(marks(lit.open).includes('burned-camp/taken-to-nest'));
}

// 3. The pen: the questions, the two thoughts and the three choices in one talk.
const penWorld = toBeat(base, 'pen', [{type: 'mark', id: 'burned-camp/taken-to-nest'}]);
let pen = step(roam(penWorld), at('pen-inside')).open;
{
  const out = step(pen, at('pen-inside'), {interact: true});
  const talk = talkOf(out);
  assert.deepEqual(talk.scene.questions.map(row => row.id), ['night-watch', 'my-car', 'sump-wants']);
  assert.deepEqual(talk.scene.choices.map(row => row.id.split('/').at(-1)), ['wait', 'break-out', 'offer']);
  assert.deepEqual(talk.scene.thoughts, burned.beats.pen.thoughts);
  assert.equal(talk.scene.choices[0].detail, 'The price was said aloud: 150 scrap and one ember');
  const asked = step(pen, at('pen-inside'), {jobEvents: [{type: 'openTalkQuestion', scene: talk.id, id: 'night-watch'}]});
  assert.ok(marks(asked.open).includes('burned-camp/asked/night-watch'), 'asking costs nothing and is written down');
  assert.equal(asked.open.world.scrap, pen.world.scrap);
}

// 4. Waiting for morning: the hearth is banked without the player, and at first light the ransom is paid.
function ransomed(world, {roadWord, scrap, embers, till, caught = false, handRuns = 1}) {
  const fixture = apply(world, 'fixture/ransom-terms', [
    {type: 'roadWord', by: roadWord - world.ledger.roadWord},
    {type: 'scrap', by: scrap - world.scrap},
    {type: 'stock', stock: 'embers', by: embers - world.ledger.stocks.embers},
    {type: 'routine', id: GAS_ROUTINE.id, record: {...routineFor(world), handRuns}},
    ...(caught ? [{type: 'mark', id: 'burned-camp/caught-breaking-out'}] : []),
  ]);
  const withTill = till === undefined ? fixture : {...fixture, town: {till}};
  let out = choose(step(roam(withTill), at('pen-inside')).open, at('pen-inside'), 'pen', 'wait');
  assert.equal(beat(out.open), 'waiting');
  out = step(out.open, at('pen-inside'));
  assert.deepEqual(out.leave, {to: 'hearth-bank', night: withTill.ledger.night}, 'the night passes as a bank');
  assert.equal(beat(out.open), 'ransom');
  const banked = {...out.open.world, ledger: bankHearth(out.open.world.ledger).ledger};
  const morning = step(roam(banked), at('pen-inside'));
  return {before: banked, out: morning, after: morning.open.world};
}
{
  // Section 21's own example: 140 scrap carried, the till pays the last ten, one ember asked at Word 1. Three embers at
  // dusk, one burned in the night, one paid.
  const {before, out, after} = ransomed(pen.world, {roadWord: 1, scrap: 140, embers: 3, till: 500});
  assert.equal(before.ledger.stocks.embers, 2, 'one ember burned in the night');
  assert.equal(after.scrap, 0);
  assert.equal(after.ledger.stocks.embers, 1);
  const posting = after.open.journal.find(row => row.type === 'town');
  assert.deepEqual([posting?.key, posting?.posting.scrap], ['ransom', 10], 'the till pays the last ten');
  assert.ok(after.ledger.marks.includes('burned-camp/ransomed'));
  assert.equal(after.open.threads[ID].beat, 'home');
  assert.deepEqual(said(out).map(text => text.split(':')[0]), ['Moss', 'Sump', 'Marigold']);
  assert.ok(out.events.some(event => event.cue === 'open.ransom.paid'));
  const loss = after.ledger.history.findLast(change => change.type === 'stock' && change.key === 'embers');
  assert.equal(loss.choiceId, 'burned-camp/entered/ransom', 'the loss is named a ransom for the apprentice run');
  assert.ok(shortAfterLoss(after) && mayOfferRoutine(after), 'a store left at one ember brings the offer of section 23');
}
{
  // No till the land can read: the car's scrap, then an ember for each whole hundred still short, and the Word's ember.
  const terms = world => ransomTerms(burned.beats.ransom.ransom, world, when => !when);
  const at0 = apply(pen.world, 'fixture/poor', [{type: 'scrap', by: -pen.world.scrap},
    {type: 'roadWord', by: 1 - pen.world.ledger.roadWord}, {type: 'stock', stock: 'embers', by: 4 - pen.world.ledger.stocks.embers}]);
  assert.deepEqual(terms(at0), {scrap: 150, fromCar: 0, fromTill: 0, short: 150, forShort: 1, asked: 1, embers: 2, embersLeft: 2});
  assert.deepEqual(ransomEffects(terms(at0)), [{type: 'stock', stock: 'embers', by: -2}], 'nothing is taken from an empty car');
  const word3 = apply(at0, 'fixture/word-3', [{type: 'roadWord', by: 2}, {type: 'scrap', by: 400}]);
  assert.deepEqual([terms(word3).fromCar, terms(word3).asked, terms(word3).embers], [150, 2, 2], 'two embers at Word 3');
  const word0 = apply(word3, 'fixture/word-0', [{type: 'roadWord', by: -3}]);
  assert.equal(terms(word0).asked, 0, 'no ember is asked for before the enemy has heard of them');
  const low = apply(at0, 'fixture/one-ember', [{type: 'stock', stock: 'embers', by: -3}]);
  assert.deepEqual([terms(low).embers, terms(low).embersLeft], [1, 0], 'the store never goes below nothing');
  const {after} = ransomed(pen.world, {roadWord: 1, scrap: 40, embers: 2, handRuns: 0});
  assert.deepEqual([after.scrap, after.ledger.stocks.embers], [0, 0], '40 scrap, then one ember asked, from a store of one');
  assert.ok(after.scrap >= 0 && after.ledger.stocks.embers >= 0);
  assert.equal(after.open.journal.some(row => row.type === 'town'), false, 'no till is read, so none is posted');
}

// 5. Breaking out: the creep with Finch from just outside the pen, two growers waved along on the way, out by the drain.
{
  const world = toBeat(base, 'pen', [{type: 'mark', id: 'burned-camp/taken-to-nest'}]);
  let open = step(roam(world), at('pen-inside')).open;
  let out = choose(open, at('pen-inside'), 'pen', 'break-out');
  assert.equal(beat(out.open), 'break-out');
  out = step(out.open, at('pen-inside'));
  assert.equal(out.events.find(event => event.type === 'threadMission')?.mission.kind, 'heist');
  const slipped = out.requests.find(row => row.type === 'threadFootPosition')?.place;
  assert.deepEqual([slipped?.x, slipped?.z], [at('pen-slip').x, at('pen-slip').z], 'out between two wrecks with Finch');
  out = step(out.open, at('pen-slip'));
  const slip = at('pen-slip');
  // Off as soon as the guard has left the pen's gate for the fire.
  open = waitFor(out.open, slip, seconds => phase(seconds) > 49.5 && phase(seconds) < 50);
  let walk = creep(open, slip, at('hide-1'));
  walk = creep(walk.open, walk.here, at('hide-2'));
  walk = creep(walk.open, walk.here, at('drain-in'));
  walk = creep(walk.open, walk.here, at('drain-out'));
  out = walk.outs.at(-1);
  assert.equal(outcome(out), 'out');
  out = step(out.open, at('drain-out'));
  assert.match(said(out)[0], /^Finch: Gran said I had to go if I got the chance./);
  // The way to the drain passes all three hiding places, the last by the drain's mouth: three come, and no more.
  for (const id of ['broke-out', 'car-with-sump', 'waved-along-1', 'waved-along-2', 'waved-along-3'])
    assert.ok(marks(out.open).includes('burned-camp/' + id), id);
  assert.ok(!marks(out.open).some(id => id === 'burned-camp/waved-along-4'), 'three at most');
  assert.deepEqual(penPeople(out.open.world).map(row => row.figure), ['marigold', 'road-rat-lamp'],
    'Finch and the three waved along are out of the pen');
  assert.equal(beat(out.open), 'home');
  assert.equal(out.requests.some(row => row.type === 'threadTaken' && !row.held), false, 'the car stays with Sump');

  // Caught: Sump's line, the price is 220 and a second ember, and back to the pen with no second break-out.
  let caught = step(choose(step(roam(world), at('pen-inside')).open, at('pen-inside'), 'pen', 'break-out').open, at('pen-inside'));
  caught = step(caught.open, at('pen-inside'));
  open = waitFor(caught.open, slip, seconds => phase(seconds) < 2);
  const facing = guardAt(open.seconds);
  const inFront = {x: facing.x + Math.sin(facing.heading) * 5, z: facing.z + Math.cos(facing.heading) * 5};
  for (let tick = 0; tick < 12 && !outcome(caught); tick++) caught = step(tick ? caught.open : open, inFront);
  assert.equal(outcome(caught), 'caught');
  caught = step(caught.open, at('pen-inside'));
  assert.match(said(caught)[0], /^Sump: Now that was rude of you/);
  assert.equal(beat(caught.open), 'pen');
  assert.ok(marks(caught.open).includes('burned-camp/caught-breaking-out'));
  const again = talkOf(step(caught.open, at('pen-inside'), {interact: true}));
  assert.deepEqual(again.scene.choices.map(row => row.id.split('/').at(-1)), ['wait', 'offer']);
  const {after} = ransomed(caught.open.world, {roadWord: 1, scrap: 300, embers: 5, caught: true});
  assert.deepEqual([after.scrap, after.ledger.stocks.embers], [80, 2], '220 scrap, and one ember more than the Word asks');
}

// 6. Sump's offer: the promise on the page, and the car given back; or the refusal, and back to the pen.
{
  let out = choose(pen, at('pen-inside'), 'pen', 'offer');
  out = step(out.open, at('pen-inside'));
  assert.match(said(out)[0], /^Sump: Here's what I'd like. I'm putting a gate across the Mall Road next week./);
  const refused = choose(out.open, at('pen-inside'), 'offer', 'no-promise');
  assert.match(said(refused)[0], /^Sump: Then Tin Town can pay for you in the morning/);
  assert.equal(beat(refused.open), 'pen');
  assert.deepEqual(talkOf(step(refused.open, at('pen-inside'), {interact: true})).scene.choices.map(row => row.id.split('/').at(-1)),
    ['wait', 'break-out'], 'the choice goes back to waiting or breaking out');
  let promised = choose(out.open, at('pen-inside'), 'offer', 'promise-toll');
  const promise = promised.open.world.ledger.obligations.find(row => row.id === 'burned-camp/toll-promised');
  assert.equal(promise?.text, 'You promised the Road Rats that Tin Town would pay their toll five times.');
  assert.equal(promise.person, 'sump');
  assert.ok(marks(promised.open).includes('burned-camp/toll-promised'), 'A toll on the Mall Road reads the mark');
  promised = step(promised.open, at('pen-inside'));
  const freed = promised.requests.find(row => row.type === 'threadTaken');
  assert.equal(freed?.held, false, 'the car is given back');
  assert.ok(Math.hypot(freed.foot.x - at('held-car').x, freed.foot.z - at('held-car').z) < 4, 'beside the car');
  assert.equal(beat(step(promised.open, at('held-car')).open), 'home');
}

// 7. Tied back: the next time the Road Rats are met at a checkpoint, Sump's rider says it.
{
  const rats = OPEN_CHECKPOINTS.find(row => row.id === 'mall-road-2');
  const paid = apply(sampleWorld('first-night'), 'fixture/paid', [{type: 'mark', id: 'burned-camp/ransomed'}]);
  const seed = Array.from({length: 400}, (_, index) => index + 1).find(seed =>
    drawCheckpoint(rats, {...paid, seed, ledger: {...paid.ledger, seed}}, 1, {difficulty: 'easy'})?.group === 'road-rats');
  const world = {...paid, seed, ledger: {...paid.ledger, seed}};
  const met = stepOpenLand(beginOpenLand({id: 'open-roam', steps: [{kind: 'roam'}], open: {world}}),
    {player: rats.position, carPosition: rats.position, difficulty: 'easy', checkpointsEnabled: true}, 1 / 60, [checkpointsPart]);
  assert.ok(said(met).includes("Sump's rider: We know that car, don't we? That's the one from Tin Town, where they pay up. Sump says the price will be higher next time, because you've shown him that you can find the scrap."));
  assert.ok(marks(met.open).includes('burned-camp/said/rats-know-the-car'));
}

assert.ok(drainOut, 'the drain was run');
for (const name of Object.keys(pageFunctions)) assert.doesNotThrow(() => new Function('return ' + pageSource(name)), name);
console.log('test-burned-camp-pen: passed');
