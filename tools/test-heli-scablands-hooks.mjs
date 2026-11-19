// HELI-RUSTWALL slice 4: FLY from the town's Helipad in a real App (src/app.js startTownHeli). The Scablands is loaded as the
// town's drive loads it, the helicopter visit runs there, its events reach the town as they come, and the town is saved when
// the visit ends. With either switch off, or no pilot or no pad, nothing starts. Memory-only storage.
import assert from 'node:assert/strict';
import {App} from '../src/app.js';
import {createFeatureFlags} from '../src/feature-flags.js';
import {createTown} from '../src/town/index.js';
import {townHeliOf, townCommandsForHeliEvents} from '../src/town/town-heli.js';
import {townScreenModel, townScreenMarkup} from '../src/town/ui/town-screen.js';
import {heliOf} from '../src/heli/heli-save.js';
import {pageTownStore} from '../src/town/town-page-store.js';

// A QA page: towns are kept in memory only.
globalThis.__DUEL_QA__ = true;

let checks = 0;
const ok = (value, label) => { assert.ok(value, label); checks++; };
const values = new Map();
globalThis.localStorage = {getItem: key => values.get(String(key)) ?? null, setItem: (key, value) => values.set(String(key), String(value)),
  removeItem: key => values.delete(String(key)), key: i => [...values.keys()][i] ?? null, get length() { return values.size; }};
globalThis.cancelAnimationFrame ??= () => {};
const TRAINED = {liftoff: true, hover: true, landing: true, carry: true};

function yard({town = true, heli = true, trained = true} = {}) {
  values.clear();
  const app = new App(); app.audio.unlock = () => {};
  app.duel.featureFlags = createFeatureFlags({storage: null, overrides: {'hidden-road': true, 'wasteland-town': town, helicopter: heli, forestFire: true}});
  app.profile = {...app.profile, credits: 3000, wasteland: {...app.profile.wasteland, version: 1, discoveredGate: true},
    heli: {...heliOf(app.profile), fuelKg: 300, lessons: trained ? TRAINED : {...TRAINED, carry: false}, refuels: 2}};
  app._saveProfile();
  const state = app.duel.state; state.status = 'exploring'; state.playerId = app.player.id;
  state.hiddenRoadJourney = {id: 'test-yard', phase: 'arrived', departed: true}; state.wastelandGateDiscovered = true;
  return app;
}
function rustwall({pad = true} = {}) {
  const t = createTown(4242, 'Rustwall');
  t.id = 'town-qa-4242'; t.mayors = ['qa'];
  t.buildings = pad ? [{id: 'building-7', buildingId: 'helipad', regionId: 'scablands', x: 30, z: -12, width: 4, depth: 4, state: 'finished'}] : [];
  t.heli = {ridgeFire: {state: 'burning', raisedTick: 0n}, liftsDone: [], scouted: 0, flown: false};
  return t;
}

// The FLY button: only with a finished pad, and never while visiting.
ok(townScreenMarkup(townScreenModel(rustwall(), {canFly: true})).includes('data-town-action="fly">FLY'), 'FLY sits beside DRIVE with a pad');
ok(!townScreenMarkup(townScreenModel(rustwall(), {canFly: false})).includes('data-town-action="fly"'), 'no FLY without one');
ok(!townScreenMarkup(townScreenModel(rustwall(), {canFly: true, visiting: true})).includes('data-town-action="fly"'), 'no FLY in someone else\'s town');

for (const [label, options, townOptions] of [['the town switch off', {town: false}, {}], ['the helicopter switch off', {heli: false}, {}],
  ['a pilot still in lessons', {trained: false}, {}], ['no Helipad', {}, {pad: false}]]) {
  const app = yard(options), before = JSON.stringify(app.profile);
  ok(await app.startTownHeli(rustwall(townOptions)) === false && !app.heliSession && app.duel.state.status === 'exploring', `nothing starts with ${label}`);
  ok(JSON.stringify(app.profile) === before, `and the save is untouched with ${label}`);
}

{
  const app = yard(), town = rustwall();
  ok(await app.startTownHeli(town) === true, 'FLY starts a visit');
  ok(app.duel.state.status === 'heli' && app.heliSession?.courseId === 'scablands', 'Kestrel One stands on the town\'s Helipad');
  ok(app.duel.course.def.id === 'scablands' && !!app.duel.course.def.scablands, 'the game shows the Scablands');
  ok(app.activeInputContext() === 'heli', 'the helicopter keys are live');
  ok(townHeliOf(town).flown === true, 'the town hears of the first flight over at once');
  ok(app.heliLog.some(event => event.type === 'scablandsSaid' && event.id === 'heli.scablands.roger.first'), 'Roger is surprised by the wall');
  // Up 60 m and east for a while: the land below goes on the town's map, and the fire's clock runs.
  app.keys = {KeyW: true};
  for (let i = 0; i < 60 * 12; i++) app._simulate(1 / 60);
  app.keys = {ArrowUp: true};
  for (let i = 0; i < 60 * 25; i++) app._simulate(1 / 60);
  app.keys = {};
  const seen = (town.dispatch?.explored ?? []).filter(area => area.regionId === 'scablands').length;
  ok(seen > 0, `flying uncovered ${seen} chunks of the town's map`);
  app.returnToMenu();
  ok(!app.heliSession && app.duel.state.status === 'menu', 'leaving ends the visit');
  ok(townHeliOf(town).ridgeFire.state === 'burning' && townHeliOf(town).ridgeFire.fire?.courseId === 'scablands', 'the town keeps the fire still burning for next time');
  await new Promise(done => setTimeout(done, 50));
  const stored = await pageTownStore().load(town.id);
  ok(stored.town && townHeliOf(stored.town).flown === true && townHeliOf(stored.town).ridgeFire.fire?.courseId === 'scablands', 'the town was saved with the visit in it');
}
// The events the town listens for, one command each, and the fire's last word only.
assert.deepEqual(townCommandsForHeliEvents([{type: 'scablandsFlown'}, {type: 'scablandsFire', state: 'burning', fire: {a: 1}}, {type: 'scablandsFire', state: 'burning', fire: {a: 2}},
  {type: 'scablandsLift', liftId: 'tam-truck'}, {type: 'scablandsScouted', chunks: [{x: 1, z: 2}]}, {type: 'fuelBought'}]),
[{type: 'heliFlown'}, {type: 'heliLiftDone', liftId: 'tam-truck'}, {type: 'heliScout', chunks: [{x: 1, z: 2}]}, {type: 'heliRidgeFire', state: 'burning', fire: {a: 2}}]);
checks++;
assert.deepEqual(townCommandsForHeliEvents([{type: 'scablandsFire', state: 'burning', fire: {}}, {type: 'scablandsFire', state: 'out'}]), [{type: 'heliRidgeFire', state: 'out'}]);
checks++;

console.log(`test-heli-scablands-hooks: ${checks} checks passed`);
