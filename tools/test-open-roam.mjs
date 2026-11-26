import assert from 'node:assert/strict';
import {App} from '../src/app.js';
import {yardHomeScreen} from '../src/screen-yard-home.js';
import {createResultsScreen} from '../src/screen-results.js';
import {footActionPresentation} from '../src/combat-hud.js';
import {selectFirstPersonPresentation} from '../src/first-person-presentation.js';
import {stepFootWeapons} from '../src/onfoot-weapons.js';
import {captionSeconds} from '../src/story/caption-queue.js';
import {savedLedger} from '../src/story/ledger-save.js';
import {createJob, stepJob} from '../src/world/jobs/job-engine.js';
import {applyEffects} from '../src/world/open/open-effects.js';
import {beginOpenLand, stepOpenLand} from '../src/world/open/open-land.js';
import {peoplePart, talkFor} from '../src/world/open/parts/people.js';
import {TOWN_PEOPLE} from '../src/world/open/content/people-town.js';
import {forgePosts} from '../src/world/open/content/people-forge.js';
import {sitePosition} from '../src/world/open/site-rule.js';
import {sampleWorld} from '../src/world/open/samples.js';
import {landMarks} from '../src/world/scablands-picture.js';
import {worldHudModel} from '../src/world/world-hud.js';
import {NIGHT_2_SITES} from '../src/world/jobs/night-2-sites.js';
import {stepMover} from '../src/world/scablands-movers.js';
import {scablandsSurfaceHeightAt} from '../src/world/scablands-ground.js';
import {pageFunctions, run} from './scenarios/open-roam.mjs';

// The cloud does not start a browser. Capture and parse the actual strings
// sent by the scenario, including its arguments.
const parsePage = source => { new Function(source); return true; };
await run({navigate: () => {}, command: () => {}, waitFor: parsePage, evaluate: parsePage, screenshot: () => {}});

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
assert.deepEqual(open.parts.people.cast.map(person => person.id), ['auntie-solder', 'cinder', 'tin-cook', 'tin-porter', 'tin-child']);

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
assert.equal(worldHudModel({worldJob}).line, '');
assert.equal(worldHudModel({worldJob}).target, null);
app.togglePause();
const paused = createResultsScreen({app, profile: () => app.profile, escapeHTML: String, credits: String, time: String})(state);
assert.match(paused, /<h2 id="result-title">Out in the open<\/h2>/);
assert.match(paused, /data-action="resume"><span>Back out<\/span>/);
assert.match(paused, /data-action="arena-yard"><span>Home to the yard<\/span>/);
assert.doesNotMatch(paused, /TIME ON THE JOB|START AGAIN|forfeits/i);
app.togglePause();

const weapons = state.footWeapons;
const lower = () => stepFootWeapons(app.duel, 1 / 120);
const viewPose = () => selectFirstPersonPresentation({fighter: state.fighter, weapons, input: {aim: true}});
assert.equal(weapons.lowered, true);
assert.equal(footActionPresentation(state).text, '');
assert.equal(viewPose().lowered, true);
assert.equal(viewPose().aim, false);
app.duel.featureFlags = flags(false);
lower();
assert.equal(viewPose().lowered, false);
assert.match(footActionPresentation(state).text, /HOLD AIM/);
app.duel.featureFlags = flags(true);
const opponents = state.opponents;
state.opponents = [app.duel.course.nearest(state.fighter.x + 35, state.fighter.z)];
lower();
assert.equal(viewPose().aim, true, 'a car in reach raises the weapon');
state.opponents = opponents;
const raids = state.raids;
state.raids = {zones: [{raiders: [{x: state.fighter.x + 20, z: state.fighter.z}]}]};
lower();
assert.equal(viewPose().aim, true, 'an enemy on foot in reach raises the weapon');
state.raids = raids;
const townFeet = {...state.fighter}, townWorld = worldJob.open.world;
const camp = sitePosition('glasshouse', townWorld.open.landSeed);
Object.assign(state.fighter, {x: camp.x + 59, z: camp.z});
lower();
assert.equal(viewPose().lowered, false, 'an unfound camp leaves the weapon ready');
worldJob.open.world = applyEffects(townWorld, {id: 'test/glasshouse', effects: [{type: 'find', site: 'glasshouse'}]}).world;
lower();
assert.equal(viewPose().lowered, true, 'within 60 m of a found non-hostile camp');
state.fighter.x = camp.x + 61;
lower();
assert.equal(viewPose().lowered, false);
state.fighter.x = camp.x + 59;
worldJob.open.world = applyEffects(worldJob.open.world, {id: 'test/cold-camp', effects: [
  {type: 'word', person: 'glasshouse', set: 'Cold'},
]}).world;
lower();
assert.equal(viewPose().lowered, false, 'a hostile camp leaves the weapon ready');
Object.assign(state.fighter, townFeet);
worldJob.open.world = townWorld;
const serial = weapons.serial;
app.duel.setFighterInput({fire: true});
lower();
assert.equal(viewPose().aim, true, 'pressing fire raises the weapon');
assert.equal(weapons.serial, serial + 1, 'the same press can fire');
app.duel.setFighterInput({fire: false});
lower();
assert.equal(viewPose().lowered, true);
state.combat.projectiles.length = 0;

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
assert.equal(worldHudModel({worldJob}).line, '');
const firstLine = worldJob.job.stepState.screen;
const firstSeconds = captionSeconds(firstLine.line.words);
app.advance(firstSeconds - .1);
assert.equal(worldJob.job.stepState.screen.line.words, firstLine.line.words, 'the greeting stays up for reading');
assert.deepEqual(worldJob.job.stepState.screen.options, []);
app.advance(.2);
const secondLine = worldJob.job.stepState.screen;
assert.notEqual(secondLine.line.words, firstLine.line.words);
assert.deepEqual(secondLine.options, []);
app.advance(captionSeconds(secondLine.line.words) + .15);
assert.equal(active().kind, 'roam');
assert.equal(worldJob.job.steps.length, 1);
assert.deepEqual(worldJob.open.world, before);

const cinderRow = TOWN_PEOPLE.find(person => person.id === 'cinder');
const refused = applyEffects(sample, {id: 'refuse', effects: [{type: 'word', person: 'walkers', set: 'Cold'}]}).world;
assert.match(talkFor(cinderRow, refused).scene.lines[0].words, /camp is dark/);
const cold = applyEffects(sample, {id: 'test/cold', effects: [{type: 'word', person: 'walkers', set: 'Cold'}]}).world;
assert.doesNotMatch(talkFor(cinderRow, cold).scene.lines[0].words, /camp is dark/);

let land = beginOpenLand(definition);
const person = {position: {x: 6032, y: cinder.position.y, z: 7}};
const talkTick = (interact, jobEvents = []) => {
  const result = stepOpenLand(land, {openRoam: true, onFoot: true, fighter: person, interact, jobEvents}, 0, [peoplePart]);
  land = result.open;
  return result.requests[0];
};
const first = talkTick(true);
assert.equal(first.person, 'cinder');
talkTick(false, [{type: 'openTalkSkipped', scene: first.id, finished: true}]);
assert.equal(land.parts.people.active, null, 'a town talk skipped for a storyline releases its speaker');
assert.deepEqual(land.parts.people.heard, [], 'a skipped talk was never heard, even if marked finished');
assert.deepEqual(land.world, sample);
assert.equal(talkTick(true).id, first.id, 'the skipped town talk can be requested again');
talkTick(false, [
  {type: 'openTalkQuestion', scene: first.id, id: 'pump', effects: [{type: 'mark', id: 'test/pump-asked'}]},
  {type: 'openTalkClosed', scene: first.id},
]);
assert.deepEqual(talkTick(true).asked, ['pump']);
talkTick(false, [{type: 'openTalkClosed', scene: first.id}]);
assert(land.world.ledger.marks.includes('test/pump-asked'));
talkTick(true);
talkTick(false, [{type: 'talkChoice', scene: first.id, id: 'answer', effects: [{type: 'mark', id: 'test/answer-made'}]},
  {type: 'openTalkClosed', scene: first.id, finished: true}]);
assert(land.world.ledger.marks.includes('test/answer-made'));

assert(pageFunctions.frameTown(NIGHT_2_SITES.hearth.position).length >= 3, 'the day picture is framed on at least three moving people');
assert(pageFunctions.boardForGate(NIGHT_2_SITES.car), 'F boards the parked car');
for (const inside of [true, false, true])
  assert(pageFunctions.driveAcross(gate, inside), 'the simulated car crosses the open gate');

const markedServices = (serviceSheds = true) => landMarks({world: worldJob.open.world, serviceSheds}).services;
assert.deepEqual(markedServices(), []);
app.keys.KeyF = true;
app.advance(.8);
app.keys.KeyF = false;
assert(state.onFoot && state.fighter);
for (const post of forgePosts('day', scablandsSurfaceHeightAt)) {
  app.advance(.05);
  const {x, y, z} = post.position, {s, lateral} = app.duel.course.nearest(x, z);
  Object.assign(state.fighter, {x, y, z, groundY: y, s, lateral});
  use();
  assert.equal(active().openPerson, post.id);
  assert(worldJob.open.world.ledger.encounters[post.id], 'the service introduction records meeting the worker');
  if (post.id === 'odessa') assert.deepEqual(markedServices().map(({id}) => id), ['forge-shed']);
  assert(app.duel.talkInput({type: 'advance'}, worldJob.job.stepState.screen));
  app.advance(.05);
}
assert.deepEqual(markedServices().map(({id, icon}) => [id, icon]), [['forge-shed', 'spanner'], ['bess-shed', 'bucket']]);
assert.deepEqual(markedServices(false), []);
assert(app.leaveWorldJob());
assert.deepEqual(savedLedger(app.profile).encounters, worldJob.open.world.ledger.encounters);
assert(app.returnToYard());
app.advance(8);
assert(app.isYardHomeActive());
delete globalThis.window;
console.log('test-open-roam: ok');
