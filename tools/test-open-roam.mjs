import assert from 'node:assert/strict';
import {App} from '../src/app.js';
import {yardHomeScreen} from '../src/screen-yard-home.js';
import {createJob, stepJob} from '../src/world/jobs/job-engine.js';
import {applyEffects} from '../src/world/open/open-effects.js';
import {beginOpenLand, stepOpenLand} from '../src/world/open/open-land.js';
import {peoplePart, talkFor} from '../src/world/open/parts/people.js';
import {TOWN_PEOPLE} from '../src/world/open/content/people-town.js';
import {WALK_AWAY} from '../src/world/open/content/talk-town.js';
import {sampleWorld} from '../src/world/open/samples.js';
import {NIGHT_2_SITES} from '../src/world/jobs/night-2-sites.js';
import {stepMover} from '../src/world/scablands-movers.js';
import {pageFunctions, pageSource, run} from './scenarios/open-roam.mjs';

// The cloud does not start a browser. Capture and parse the actual strings
// sent by the scenario, including its arguments.
const parsePage = source => { new Function(source); return true; };
await run({navigate: () => {}, command: () => {}, waitFor: parsePage, evaluate: parsePage});

const sample = sampleWorld('first-night');
const definition = {id: 'open-roam', open: {world: sample}, steps: [{kind: 'roam'}]};
let job = createJob(definition, sample.seed);
let open = beginOpenLand(definition);
for (let i = 0; i < 3600; i++) {
  open = stepOpenLand(open, {openRoam: true}, 1, [peoplePart]).open;
  job = stepJob(job, {open: {leave: null}}, 1);
}
assert.equal(job.done, false);
assert.deepEqual(open.holds, []);
assert.deepEqual(open.world, sample);
assert.deepEqual(open.parts.people.cast.map(person => person.id), ['auntie-solder', 'cinder']);

const memory = new Map();
globalThis.localStorage = {getItem: key => memory.get(key) ?? null, setItem: (key, value) => memory.set(key, String(value)),
  removeItem: key => memory.delete(key)};
globalThis.cancelAnimationFrame = () => {};
const app = new App();
app.audio.unlock = () => {};
app.profile = {...app.profile, wasteland: {...app.profile.wasteland, discoveredGate: true}};
assert(app._saveProfile());
const flags = on => ({enabled: id => ['hidden-road', 'crew-gear', 'warlord-cards'].includes(id) || on && id === 'story-choices'});
const storyWall = () => yardHomeScreen({profile: app.profile, playerName: app.player.name, escapeHTML: String,
  panel: 'cards', featureFlags: app.duel.featureFlags});
app.duel.featureFlags = flags(true);
assert(app.visitWasteland());
app.advance(8);
app.duel.featureFlags = flags(false);
assert.doesNotMatch(storyWall(), /story-open-roam/);
assert.equal(app.startOpenRoam(), false);
app.duel.featureFlags = flags(true);
assert.match(storyWall(), /story-open-roam/);
assert(app.startOpenRoam());
app.advance(4);
const state = app.duel.state, worldJob = state.arena.worldJob;
const cast = worldJob.storyPeople;
globalThis.window = {__qaApp: app};
assert(pageFunctions.walkToCinder());
const cinder = cast.find(person => person.id === 'cinder');
const gate = NIGHT_2_SITES.gate;
assert.equal(worldJob.tinTownGateProgress, 1);
for (let dz = -4; dz <= 4; dz += .25) {
  const from = {x: gate.x, z: gate.z + dz};
  const to = {x: from.x, z: from.z + .25};
  assert.equal(stepMover(from, to, {radius: 1, grid: worldJob.solidGrid}).blocked, false);
}

function at(offset) {
  const {x, y, z} = cinder.position;
  const {s, lateral} = app.duel.course.nearest(x + offset, z);
  Object.assign(state.fighter, {x: x + offset, y, z, groundY: y, s, lateral});
}
function use() {
  app.keys.KeyF = true;
  app.advance(.05);
  app.keys.KeyF = false;
}
const active = () => worldJob.job.steps[worldJob.job.stepIndex];
at(2.51);
use();
assert.equal(active().kind, 'roam');
app.advance(.05);
at(2.49);
use();
assert.equal(active().openPerson, 'cinder');
assert.match(worldJob.job.stepState.screen.line.words, /kiln/);
assert(Math.abs(cinder.yaw - Math.PI / 2) < .001, 'the speaker faces the player');
assert.equal(worldJob.storyPeople, cast, 'updates reuse the loaded figures');

const before = structuredClone(worldJob.open.world);
at(2.6);
app.advance(.1);
assert.equal(active().kind, 'roam');
assert.deepEqual(worldJob.open.world, before, 'leaving range does not make a choice');
assert.equal(worldJob.open.parts.people.active, null);
assert.equal(worldJob.job.steps.length, 1, 'the temporary talk step is removed');
at(2);
use();
assert.equal(active().openPerson, 'cinder');
const act = (type, index) => {
  assert(app.duel.talkInput({type, index}, worldJob.job.stepState.screen));
  app.advance(.05);
};
act('advance');
act('advance');
assert.equal(worldJob.job.stepState.screen.options[0].words, 'Walk away.');
act('select', 0);
assert.equal(active().kind, 'roam');
assert.deepEqual(worldJob.open.world, before);

const cinderRow = TOWN_PEOPLE.find(person => person.id === 'cinder');
const refused = applyEffects(sample, {id: 'refuse', effects: [{type: 'word', person: 'walkers', set: 'Cold'}]}).world;
assert.match(talkFor(cinderRow, refused).scene.lines[0].words, /camp is dark/);
const cold = applyEffects(sample, {id: 'test/cold', effects: [{type: 'word', person: 'walkers', set: 'Cold'}]}).world;
assert.doesNotMatch(talkFor(cinderRow, cold).scene.lines[0].words, /camp is dark/);

let land = beginOpenLand(definition);
const person = {position: {...cinder.position, x: cinder.position.x + 1}};
const talkTick = (interact, jobEvents = []) => {
  const result = stepOpenLand(land, {openRoam: true, onFoot: true, fighter: person, interact, jobEvents}, 0, [peoplePart]);
  land = result.open;
  return result.requests[0];
};
const first = talkTick(true);
assert.equal(first.person, 'cinder');
talkTick(false, [
  {type: 'openTalkQuestion', scene: first.id, id: 'pump', effects: [{type: 'mark', id: 'test/pump-asked'}]},
  {type: 'openTalkClosed', scene: first.id},
]);
assert.deepEqual(talkTick(true).asked, ['pump']);
talkTick(false, [{type: 'talkChoice', scene: first.id, id: WALK_AWAY, effects: [{type: 'mark', id: 'test/unmade'}]},
  {type: 'openTalkClosed', scene: first.id}]);
assert(land.world.ledger.marks.includes('test/pump-asked'));
assert(!land.world.ledger.marks.includes('test/unmade'));
talkTick(true);
talkTick(false, [{type: 'talkChoice', scene: first.id, id: 'answer', effects: [{type: 'mark', id: 'test/answer-made'}]},
  {type: 'openTalkClosed', scene: first.id, finished: true}]);
assert(land.world.ledger.marks.includes('test/answer-made'));

assert(pageFunctions.boardForGate(NIGHT_2_SITES.car), 'F boards the parked car');
for (const inside of [true, false, true])
  assert(pageFunctions.driveAcross(gate, inside), 'the simulated car crosses the open gate');
delete globalThis.window;
console.log('test-open-roam: ok');
