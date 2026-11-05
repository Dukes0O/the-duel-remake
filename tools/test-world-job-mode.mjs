import assert from 'node:assert/strict';
import {App} from '../src/app.js';
import {createFeatureFlags} from '../src/feature-flags.js';
import {canLeaveCar} from '../src/onfoot-transition.js';
import {finishArenaEvent} from '../src/arena/arena-event.js';
import {loadPlayers, PLAYERS_KEY} from '../src/progression.js';

const dt = 1 / 120;
const flags = {'hidden-road': true, arsenal: true, 'arsenal-wave3': true};
const values = new Map();
globalThis.localStorage = {
  getItem: key => values.get(String(key)) ?? null,
  setItem: (key, value) => values.set(String(key), String(value)),
  removeItem: key => values.delete(String(key)),
};
globalThis.cancelAnimationFrame ??= () => {};

function start({complete = false, seed = 1989, job: suppliedJob = null} = {}) {
  values.clear();
  const app = new App();
  app.audio.unlock = () => {};
  app.duel.featureFlags = createFeatureFlags({storage: null, overrides: flags});
  app.profile = {...app.profile, wasteland: {...app.profile.wasteland,
    discoveredGate: true, loadout: ['bomb', 'crossbow', 'ufo', 'star']}};
  assert.equal(app._saveProfile(), true, 'the baseline player profile is saved through the normal path');
  const savedLoadoutBytes = Buffer.from(JSON.stringify(app.profile.wasteland.loadout));
  const job = suppliedJob ?? {id: 'test-job', seed, lend: ['flamethrower'], captions: {start: 'GO TO THE YARD'},
    steps: [{kind: 'reach', lineId: 'start', place: {position: {x: 500, z: 500}}, radius: complete ? 5000 : 1}]};
  app.runId = `world-job-${seed}`;
  app._runPlayerId = app.player.id;
  app.duel.state.wastelandGateDiscovered = true;
  assert.equal(app.duel.startArenaEvent({venueId: 'scablands', mode: 'world-job', car: 'falcone_f42',
    playerId: app.player.id, seed, opponents: [], weaponLoadout: app.profile.wasteland.loadout, job}), true);
  assert.equal(app.duel.state.arena.mode, 'world-job');
  assert.equal(app.duel.state.objective, null, 'the world job leaves the race objective inactive');
  assert(app.duel.state.weaponLoadout.includes('flamethrower'), 'the run receives the loan');
  app.duel.state.countdown = 0;
  app.duel.step(dt);
  assert.equal(app.duel.state.status, 'racing');
  return {app, savedLoadoutBytes, job};
}

// The real mode refills only after a cleared wave, and a nearby raider can
// wear down the defend place until the current wave restarts.
{
  const place = {position: {x: 0, y: 0, z: 0}};
  const job = {id: 'test-defend', seed: 307, lend: ['flamethrower'], steps: [{kind: 'defend', place,
    placeId: 'test-well', health: .1, waveCount: 2, waves: [{count: 1}, {count: 1}],
    raiderEntry: place, refill: {place, crateId: 'hollis-test-crate',
      carWeapon: 'flamethrower', footAmmo: 'rpg'}}]};
  const {app} = start({job});
  const worldJob = app.duel.state.arena.worldJob;
  app.duel.state.combat.cooldowns.flamethrower = 7;
  app.duel.state.footWeapons = {ammo: 1};
  app.duel.state.footGear = {name: 'LONGHORN RPG', ammo: 1};
  for (let n = 0; n < 3; n++) app.duel.step(dt);
  assert(app.duel.state.combat.cooldowns.flamethrower > 0 &&
    app.duel.state.combat.cooldowns.flamethrower < 7,
  'car weapon cooldown continues naturally instead of being reset during a wave');
  assert.equal(app.duel.state.footWeapons.ammo, 1, 'RPG ammo stays unchanged during a wave');
  const raider = worldJob.actors.find(actor => Number.isFinite(actor.x) && Number.isFinite(actor.z));
  assert(raider, 'the real mode spawned the defend wave');
  const firstWave = worldJob.waveZones['0:0'];
  raider.x = place.position.x; raider.z = place.position.z;
  for (let n = 0; n < 180; n++) app.duel.step(dt);
  assert.notEqual(worldJob.waveZones['0:0'], firstWave,
    'the real mode replaces the current wave after nearby raiders wear down the well');
  assert(worldJob.places['test-well'].health > 0,
    'the real mode restores the well when it restarts the wave');
  assert.equal(worldJob.job.stepState.restarting, false, 'the real mode resumed the same wave');
  assert(app.duel.state.combat.cooldowns.flamethrower > 0,
    'a restart does not refill during the wave');
  app.duel.state.combat.cooldowns.flamethrower = 9;
  app.duel.state.footWeapons.ammo = 1;
  const currentRaider = worldJob.waveZones['0:0'].raiders[0];
  currentRaider.knockedDown = true;
  app.duel.step(dt);
  assert.equal(app.duel.state.combat.cooldowns.flamethrower, 0,
    'the cleared wave refills the car weapon at the crate');
  assert.equal(app.duel.state.footWeapons.ammo, 3,
    'the cleared wave refills RPG ammo at the crate');
  assert.equal(worldJob.refillCrate.id, 'hollis-test-crate');
  app.duel.state.combat.cooldowns.flamethrower = 6;
  app.duel.state.footWeapons.ammo = 2;
  app.duel.step(dt);
  assert(app.duel.state.combat.cooldowns.flamethrower > 0,
    'the next wave does not repeat the refill');
  assert.equal(app.duel.state.footWeapons.ammo, 2,
    'the next wave does not repeat the RPG refill');
  app.returnToMenu(); app.dispose?.();
}

function assertSavedLoadout(app, expectedBytes, exit) {
  const raw = values.get(PLAYERS_KEY);
  assert.equal(typeof raw, 'string', `${exit}: game wrote its player registry`);
  const saved = loadPlayers().players.find(player => player.id === app.player.id)?.profile;
  assert(saved, `${exit}: the saved player profile can be read back`);
  const afterBytes = Buffer.from(JSON.stringify(saved.wasteland.loadout));
  assert.deepEqual(afterBytes, expectedBytes, `${exit}: saved loadout bytes are identical`);
  assert(!saved.wasteland.loadout.includes('flamethrower'), `${exit}: the loan is absent from the saved profile`);
  assert.deepEqual(app.duel.state.weaponLoadout, saved.wasteland.loadout,
    `${exit}: run loadout is restored to the saved loadout`);
}

// The real arena mode accepts no CPU driver, and the combat action accepts the
// lent weapon. F steps out and back in through the normal fixed-step transition.
{
  const {app} = start();
  assert.equal(canLeaveCar(app.duel), true);
  assert.equal(app.duel.fireWeapon('flamethrower'), true);
  app.duel.setInput({interact: true});
  for (let n = 0; n < 75; n++) app.duel.step(dt);
  assert.equal(app.duel.state.onFoot, true, 'holding F steps out');
  app.duel.setInput({interact: false}); app.duel.step(dt);
  app.duel.setInput({interact: true});
  for (let n = 0; n < 75; n++) app.duel.step(dt);
  assert.equal(app.duel.state.onFoot, false, 'holding F beside the car gets back in');
  app.returnToMenu();
  app.dispose?.();
}

for (const exit of ['win', 'fail', 'quit to menu', 'leave during pause']) {
  const {app, savedLoadoutBytes} = start({complete: exit === 'win', seed: 1990 + exit.length});
  if (exit === 'win') {
    app.duel.step(dt);
    assert.equal(app.duel.state.status, 'arena_result', 'the job completes through the real job engine');
    assert.equal(app.duel.state.arena.result.reason, 'job-complete');
  } else if (exit === 'fail') {
    finishArenaEvent(app.duel, 'job-failed', 'cpu-1');
    assert.equal(app.duel.state.arena.result.winnerId, 'cpu-1', 'the arena uses its ordinary failure result path');
  } else {
    if (exit === 'leave during pause') app.togglePause();
    assert.equal(app.duel.state.paused, exit === 'leave during pause');
    app.returnToMenu();
    assert.equal(app.duel.state.status, 'menu');
  }
  assertSavedLoadout(app, savedLoadoutBytes, exit);
  app.dispose?.();
}

console.log('PASS world-job: real Duel inputs, fire, F out/in, and saved loadout cleanup on win, fail, menu quit, and paused exit');
