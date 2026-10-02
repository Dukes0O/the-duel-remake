// Small native Arsenal sample; no calibrated win-rate target is claimed.
// Usage: node tools/arsenal-balance.mjs
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';

const DIFFICULTIES = ['easy', 'medium', 'hard'];
const SEEDS = [1989, 7, 42];
const FRAME_SEC = 1 / 30;
const MAX_FRAMES = 30 * 600;
const round = value => Math.round(value * 100) / 100;
const increment = (counts, key) => { counts[key] = (counts[key] || 0) + 1; };

function memoryStorage() {
  const rows = new Map();
  return {
    get length() { return rows.size; },
    key: index => [...rows.keys()][index] ?? null,
    getItem: key => rows.get(String(key)) ?? null,
    setItem: (key, value) => rows.set(String(key), String(value)),
    removeItem: key => rows.delete(String(key)),
    clear: () => rows.clear(),
  };
}

async function main() {
  if (process.argv.length > 2) throw Error('Usage: node tools/arsenal-balance.mjs');
  const previous = new Map(['localStorage', 'cancelAnimationFrame'].map(key =>
    [key, Object.getOwnPropertyDescriptor(globalThis, key)]));
  const storage = memoryStorage();
  Object.defineProperty(globalThis, 'localStorage', {configurable: true, value: storage});
  Object.defineProperty(globalThis, 'cancelAnimationFrame', {configurable: true, value: () => {}});
  let app;
  try {
    const {createProfile, createPlayerRegistry, savePlayers} = await import('../src/progression.js');
    const {normalizeWasteland} = await import('../src/wasteland-progress.js');
    const profile = createProfile();
    profile.wasteland = normalizeWasteland({...profile.wasteland,
      xp: 3500, scrap: 3000, discoveredGate: true});
    assert.equal(profile.wasteland.rank, 6, 'The synthetic career must have earned rank six.');
    const registry = createPlayerRegistry(profile);
    registry.players[0].name = 'Arsenal Balance';
    const resetProfile = () => {
      storage.clear();
      assert.equal(savePlayers(registry, storage), true, 'The named memory-only career must save.');
    };
    // Save the disposable profile before App or its storage-reading imports run.
    resetProfile();
    const {App} = await import('../src/app.js');
    const {createFeatureFlags} = await import('../src/feature-flags.js');
    const {hazardsFor} = await import('../src/arsenal/hazards.js');
    const {carEffect} = await import('../src/arsenal/car-effects.js');
    const {shouldUseOil, oilThreat} = await import('../src/arsenal/oil.js');
    const {shouldUseSmoke} = await import('../src/arsenal/smoke.js');
    const flags = createFeatureFlags({storage: null, qa: true, search: '?flags=arsenal'});

    function play(cpuDifficulty, seed) {
      resetProfile();
      app = new App();
      try {
        app.duel.featureFlags = flags;
        for (const id of ['oil', 'smoke']) {
          assert.equal(app.purchaseArsenalWeapon(id).ok, true, 'The real Armory must purchase ' + id);
        }
        for (const [slot, id] of ['oil', 'smoke', 'crossbow', 'bomb'].entries()) {
          assert.equal(app.equipCarWeapon(slot, id).ok, true, 'The real Armory must equip ' + id);
        }
        assert.equal(app.startCampaign({mode: 'wasteland', car: 'falcone_f42',
          startStage: 0, seed, difficulty: 'casual', cpuDifficulty, opponentCount: 3}), true);
        app.autopilot = true;
        // Same clean scripted-driving policy as tools/combat-balance.mjs.
        app._scriptedCrashDone = true;
        const duel = app.duel, state = duel.state;
        const row = {cpuDifficulty, seed, cpuLoadouts: state.opponents.map(cpu => [...cpu.weaponLoadout]),
          weaponFireEvents: {}, playerShots: {}, cpuProjectiles: {}, cues: {},
          cpuDeployments: {oil: 0, smoke: 0}, playerDeployments: {oil: 0, smoke: 0},
          oilSlips: {player: 0, cpu: 0, other: 0}, peakHazards: 0,
          sampledCpuOpportunitySec: {oil: 0, smoke: 0}, sampledCpuOilThreatSec: 0,
          sampledSlickActorSec: {player: 0, cpu: 0}, cpuHitsOnPlayer: 0, wrecks: 0};
        const seenProjectiles = new Set();
        const actorRole = actor => actor === state ? 'player' : state.opponents.includes(actor) ? 'cpu' : 'other';
        duel.onChange((_state, event) => {
          if (event.weaponFired) {
            increment(row.weaponFireEvents, event.weaponFired);
            // The shared weaponFired event lacks an actor. Its real projectile
            // products carry enemy; count products, not inferred CPU shots.
            for (const projectile of state.combat?.projectiles || []) {
              if (seenProjectiles.has(projectile.id)) continue;
              seenProjectiles.add(projectile.id);
              if (projectile.enemy) increment(row.cpuProjectiles, projectile.kind);
            }
          }
          if (event.arsenalCue) {
            increment(row.cues, event.arsenalCue);
            const role = actorRole(event.actor);
            if (event.arsenalCue === 'weapon.oil.slip') row.oilSlips[role]++;
            for (const kind of ['oil', 'smoke']) {
              if (event.arsenalCue === 'weapon.' + kind + '.deploy') {
                if (role === 'cpu') row.cpuDeployments[kind]++;
                if (role === 'player') row.playerDeployments[kind]++;
              }
            }
          }
          if (event.combatHit && event.enemy && event.victim === 'player') row.cpuHitsOnPlayer++;
          if (event.combatWreck) row.wrecks++;
        });
        let frames = 0;
        while (!['stage_result', 'gameover', 'complete'].includes(state.status) && frames < MAX_FRAMES) {
          // These are ordinary legal driver requests. Native cooldowns, rank,
          // loadout, target selection and physical flight remain authoritative.
          if (state.status === 'racing') {
            if (duel.fireWeapon('crossbow')) increment(row.playerShots, 'crossbow');
            for (const [kind, eligible] of [['oil', shouldUseOil], ['smoke', shouldUseSmoke]]) {
              if (eligible(duel, state) && duel.fireWeapon(kind)) increment(row.playerShots, kind);
            }
            for (const cpu of state.opponents) {
              for (const [kind, eligible] of [['oil', shouldUseOil], ['smoke', shouldUseSmoke]]) {
                if (cpu.weaponLoadout.includes(kind) && eligible(duel, cpu))
                  row.sampledCpuOpportunitySec[kind] += FRAME_SEC;
              }
              if (oilThreat(duel, cpu, cpuDifficulty)) row.sampledCpuOilThreatSec += FRAME_SEC;
              if (carEffect(cpu, 'slick')) row.sampledSlickActorSec.cpu += FRAME_SEC;
            }
            if (carEffect(state, 'slick')) row.sampledSlickActorSec.player += FRAME_SEC;
          }
          app.advance(FRAME_SEC, FRAME_SEC);
          row.peakHazards = Math.max(row.peakHazards, hazardsFor(duel).length);
          frames++;
        }
        for (const counters of [row.sampledCpuOpportunitySec, row.sampledSlickActorSec]) {
          for (const key of Object.keys(counters)) counters[key] = round(counters[key]);
        }
        row.sampledCpuOilThreatSec = round(row.sampledCpuOilThreatSec);
        row.outcome = {status: state.status, completed: state.results?.completed === true,
          won: state.results?.won === true, timeSec: round(state.results?.timeSec ?? state.stageTimeSec),
          majorCrashes: state.stageCrashes, hitFrameLimit: frames === MAX_FRAMES};
        row.finalStateSha256 = createHash('sha256').update(JSON.stringify(state)).digest('hex');
        return row;
      } finally { app.dispose(); app = null; }
    }

    const rows = DIFFICULTIES.flatMap(difficulty => SEEDS.map(seed => play(difficulty, seed)));
    const repeat = play('medium', SEEDS[0]);
    assert.deepEqual(repeat, rows.find(row => row.cpuDifficulty === 'medium' && row.seed === SEEDS[0]),
      'The repeated native race must reproduce its complete state and counters.');
    const totals = Object.fromEntries(DIFFICULTIES.map(difficulty => {
      const cases = rows.filter(row => row.cpuDifficulty === difficulty);
      const sum = read => cases.reduce((total, row) => total + read(row), 0);
      return [difficulty, {races: cases.length, wins: sum(row => Number(row.outcome.won)),
        cpuOilDeployments: sum(row => row.cpuDeployments.oil),
        cpuSmokeDeployments: sum(row => row.cpuDeployments.smoke),
        playerOilSlips: sum(row => row.oilSlips.player), cpuOilSlips: sum(row => row.oilSlips.cpu),
        cpuHitsOnPlayer: sum(row => row.cpuHitsOnPlayer), wrecks: sum(row => row.wrecks)}];
    }));
    console.log(JSON.stringify({scope: 'Native rank-six Pacific Canyon races; three CPU cars; level-zero weapons.',
      playerPolicy: 'Production App scripted driving, legal Crossbow requests and qualified rear weapons.',
      sampleNote: 'Three seeds per difficulty; opportunity and effect seconds sampled at 30 Hz; no balance targets asserted.',
      exactRepeat: {cpuDifficulty: 'medium', seed: SEEDS[0], matched: true}, totals, rows}, null, 2));
  } finally {
    try { app?.dispose(); } finally {
      for (const [key, descriptor] of previous) {
        if (descriptor) Object.defineProperty(globalThis, key, descriptor); else delete globalThis[key];
      }
    }
  }
}

await main();
