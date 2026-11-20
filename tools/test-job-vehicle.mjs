// SHIPS-DECKS: the job-level `vehicle` field (docs/story/ships-in-the-sand.md section 6). A job picks one of the player's own
// cars, or lends one for the run when they have none, and a lent drive leaves the save exactly as it was.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {jobVehicleChoice, jobForRun} from '../src/world/jobs/job-vehicle.js';

const values = new Map();
globalThis.localStorage = {
  getItem: key => values.get(String(key)) ?? null,
  setItem: (key, value) => values.set(String(key), String(value)),
  removeItem: key => values.delete(String(key)),
};
globalThis.cancelAnimationFrame ??= () => {};
const {App} = await import('../src/app.js');
const {createFeatureFlags} = await import('../src/feature-flags.js');
const {finishArenaEvent, stepArenaEvent} = await import('../src/arena/arena-event.js');
const {isCarUnlocked} = await import('../src/progression.js');
// The Ships lines are word for word in src/story/ember-lines.js; SHIPS-JOBS registers them with its job file. Here, as it will.
const {SHIPS_CAPTIONS} = await import('../src/story/ember-lines.js');
const {registerStoryLines, unregisterStoryLines, captionRecord} = await import('../src/story/story-lines.js');
if (!captionRecord('story.ships.6.mo')) registerStoryLines('ships-decks-test', {captions: SHIPS_CAPTIONS});

// The Gatehouse's own field, as the story page writes it (section 5).
const page = readFileSync(new URL('../docs/story/ships-in-the-sand.md', import.meta.url), 'utf8');
const block = page.slice(page.indexOf('## 5. The job list, as data')).match(/```js\n([\s\S]*?)```/)[1];
const {SHIPS_JOBS} = new Function(`${block.replace(/^export /gm, '')}\nreturn {SHIPS_JOBS};`)();
const gatehouse = SHIPS_JOBS.find(job => job.id === 'ships-the-gatehouse'), underTow = SHIPS_JOBS.find(job => job.id === 'ships-under-tow');
const ridge = gatehouse.vehicle;
assert.deepEqual(ridge.oneOf, ['titan_monster', 'dusthawk_rally']);

// The choice, on its own.
{
  const owning = (...cars) => ({owns: id => cars.includes(id)});
  assert.equal(jobVehicleChoice(undefined), null, 'a job with no vehicle leaves the chosen car alone');
  assert.deepEqual(jobVehicleChoice(underTow.vehicle), {work: 'tow-rig', lent: false}, 'a work vehicle goes to TOWN-VEHICLES as before');
  assert.deepEqual(jobVehicleChoice(ridge, {chosenCar: 'dusthawk_rally', ...owning('titan_monster', 'dusthawk_rally')}),
    {car: 'dusthawk_rally', lent: false}, 'the chosen car, when it is one the job takes');
  assert.deepEqual(jobVehicleChoice(ridge, {chosenCar: 'falcone_f42', ...owning('dusthawk_rally')}),
    {car: 'dusthawk_rally', lent: false}, 'else the first of the list the player owns');
  assert.deepEqual(jobVehicleChoice(ridge, {chosenCar: 'titan_monster', ...owning()}),
    {car: 'titan_monster', lent: true, lineId: 'story.ships.6.mo'}, 'with none of them, Big Mo lends the show truck');
  assert.deepEqual(jobVehicleChoice({oneOf: ['flatbed'], lendIfNone: 'flatbed'}, owning()),
    {work: 'flatbed', lent: true, lineId: null}, 'a work vehicle can be lent in place of garage cars');
  assert.match(jobVehicleChoice({oneOf: ['titan_monster']}, owning()).message, /^This job needs a car you do not have yet\.$/,
    'a job that lends nothing says so in a whole sentence');
  const once = jobForRun(gatehouse, {chosenCar: 'falcone_f42', ...owning()});
  assert.equal(once.car, 'titan_monster');
  assert.equal(once.job.vehicleLent.lineId, 'story.ships.6.mo');
  assert.equal(gatehouse.vehicleLent, undefined, 'the job definition itself is not changed');
  const again = jobForRun(once.job, {chosenCar: 'falcone_f42', ...owning('dusthawk_rally')});
  assert.deepEqual([again.car, again.job.vehicleLent, again.job.vehicle], ['dusthawk_rally', undefined, ridge],
    'running the same job again chooses afresh from what was asked');
}

// A real lent drive through the App, with memory-only storage: the save is the same afterwards, but for the job's pay.
function startApp(unlockedCars) {
  values.clear();
  const app = new App(); app.audio.unlock = () => {};
  app.duel.featureFlags = createFeatureFlags({storage: null, overrides: {'hidden-road': true, 'story-everburn': true, 'wasteland-town': true}});
  app.profile = {...app.profile, unlockedCars, wasteland: {...app.profile.wasteland, version: 1, discoveredGate: true}};
  assert.equal(app._saveProfile(), true);
  const state = app.duel.state; state.status = 'exploring'; state.playerId = app.player.id;
  state.hiddenRoadJourney = {id: 'test-yard', phase: 'arrived', departed: true}; state.wastelandGateDiscovered = true;
  assert.equal(app.isYardHomeActive(), true, 'fixture is the real arrived yard');
  return app;
}
const job = {...gatehouse, steps: [gatehouse.steps[0]]};
const savedText = () => [...values.entries()].sort().map(([key, value]) => `${key}=${value}`).join('\n');
const withoutPay = text => JSON.parse(JSON.stringify(text), (key, value) => {
  if (value && typeof value === 'object' && !Array.isArray(value) && 'settledResults' in value) {
    const {scrap, territories, settledResults, ...rest} = value; return rest;
  }
  return value;
});
{
  const app = startApp([]);
  assert.equal(isCarUnlocked(app.profile, 'titan_monster') || isCarUnlocked(app.profile, 'dusthawk_rally'), false,
    'the player owns neither the Titan nor the rally car');
  const before = savedText(), profileBefore = structuredClone(app.profile), chosenBefore = app.menuCar;
  const said = [], callout = app.duel._storyCallout.bind(app.duel);
  app.duel._storyCallout = (text, ...rest) => { said.push(text); return callout(text, ...rest); };
  assert.equal(app._startArenaFight({venueId: 'scablands', mode: 'world-job', opponents: 0, job}), true, 'the Gatehouse starts');
  const state = app.duel.state;
  assert.equal(state.car, 'titan_monster', 'Big Mo\'s show truck is lent for the drive');
  assert.equal(state.arena.worldJob.definition.vehicleLent.car, 'titan_monster');
  assert(said.some(text => /^Big Mo: .*SHOW TRUCK IS OUT ON LOAN/.test(text)), `Big Mo says so (${said.join(' | ')})`);
  // Headless, the App waits for its picture, so the drive steps the Duel itself, as the other world-job suites do.
  for (let i = 0; i < 900 && state.status !== 'racing'; i++) app.duel.step(1 / 120);
  assert.equal(state.status, 'racing');
  const startS = state.s;
  for (let i = 0; i < 480; i++) { state.input.throttle = 1; stepArenaEvent(app.duel, 1 / 120); }
  state.input.throttle = 0;
  assert(Math.abs(state.s - startS) > 5, `the lent truck is driven (${(state.s - startS).toFixed(1)} m)`);
  assert.equal(savedText(), before, 'driving the lent truck writes nothing to the save');
  assert.equal(app.menuCar, chosenBefore, 'the chosen car is unchanged');
  const worldJob = state.arena.worldJob;
  worldJob.job.stepIndex = worldJob.job.steps.length; worldJob.job.done = true;
  finishArenaEvent(app.duel, 'job-complete', 'player');
  assert.equal(state.arena.result.settlementSaved, true, 'the job settles as any won job does');
  assert.deepEqual(withoutPay(app.profile), withoutPay(profileBefore), 'after the lent drive the save is unchanged but for the job\'s scrap');
  assert.equal(isCarUnlocked(app.profile, 'titan_monster'), false, 'the lent truck is not the player\'s');
  assert.deepEqual(app.profile.unlockedCars, profileBefore.unlockedCars);
}

// A player who owns the rally car drives it, and nothing is lent or said.
{
  const app = startApp(['dusthawk_rally']);
  assert.equal(app._startArenaFight({venueId: 'scablands', mode: 'world-job', opponents: 0, job}), true);
  assert.equal(app.duel.state.car, 'dusthawk_rally', 'their own rally car takes Hollis up the Ridge');
  assert.equal(app.duel.state.arena.worldJob.definition.vehicleLent, undefined, 'nothing is lent');
}

// With the town's switch off, the field is not read and the chosen car is driven, as before.
{
  const app = startApp([]);
  app.duel.featureFlags = createFeatureFlags({storage: null, overrides: {'hidden-road': true, 'story-everburn': true}});
  assert.equal(app._startArenaFight({venueId: 'scablands', mode: 'world-job', opponents: 0, job}), true);
  assert.equal(app.duel.state.car, app.menuCar, 'switch off: the chosen car');
  assert.equal(app.duel.state.arena.worldJob.definition.vehicleLent, undefined);
}

unregisterStoryLines('ships-decks-test');
console.log('job vehicle: own car, lent car, work vehicle and an unchanged save passed');
