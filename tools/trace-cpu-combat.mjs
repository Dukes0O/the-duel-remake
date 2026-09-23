import { App } from '../src/app.js';
import { DEFAULT_DRIVER } from '../src/drivers.js';

globalThis.cancelAnimationFrame ??= () => {};

function storage() {
  const rows = new Map();
  return {
    get length() { return rows.size; },
    key(index) { return [...rows.keys()][index] ?? null; },
    getItem(key) { return rows.get(key) ?? null; },
    setItem(key, value) { rows.set(key, String(value)); },
    removeItem(key) { rows.delete(key); },
  };
}

const round = value => Math.round(value * 10) / 10;
function run(cpuDifficulty, seed = 1989) {
  globalThis.localStorage = storage();
  const app = new App();
  app.startCampaign({ startStage: 0, seed, mode: 'wasteland', car: 'falcone_f42',
    difficulty: 'casual', cpuDifficulty, driverId: DEFAULT_DRIVER });
  app.autopilot = true;
  app._scriptedCrashDone = true;
  const duel = app.duel;
  const fires = [], hits = [], crashes = [], pickups = [], pickupUses = [], snapshots = [], bins = { aheadFar: 0, aheadNear: 0, behindNear: 0, behindFar: 0 };
  const opportunities = { far: 0, near: 0, close: 0 };
  duel.onChange((state, event) => {
    if (event.powerupCollected) pickups.push({ time: round(state.stageTimeSec), weapon: event.powerupCollected,
      collector: event.collector || 'player', playerS: round(state.s), rivalS: round(state.rival?.s ?? 0) });
    if (event.cpuPickupUsed) pickupUses.push({ time: round(state.stageTimeSec), weapon: event.cpuPickupUsed });
    if (!event.weaponFired && !event.combatHit && !event.crash) return;
    const row = { time: round(state.stageTimeSec), type: event.weaponFired ?? 'hit',
      victim: event.victim, playerS: round(state.s), rivalS: round(state.rival?.s ?? 0),
      gap: round((state.rival?.s ?? 0) - state.s),
      playerSpeed: round(state.speedMph), rivalSpeed: round(state.rival?.speedMph ?? 0) };
    if (event.weaponFired) fires.push(row);
    if (event.combatHit && event.enemy) hits.push(row);
    if (event.crash || event.impact || event.ticket) crashes.push({ ...row, event,
      playerLateral: round(state.lateral), playerHeading: round(state.headingError),
      traffic: state.traffic.filter(actor => Math.abs(actor.s - state.s) < 60)
        .map(actor => ({ s: round(actor.s), lateral: round(actor.lateral),
          dir: actor.dir, speed: round(actor.speedMph) })) });
  });
  let frames = 0;
  while (!['stage_result', 'gameover', 'complete'].includes(duel.state.status) && frames++ < 30 * 600) {
    const state = duel.state;
    if (state.status === 'racing' && state.rival) {
      const a = duel.course.groundAt(state.s, state.lateral);
      const b = duel.course.groundAt(state.rival.s, state.rival.lateral);
      const gap = Math.hypot(a.x - b.x, a.z - b.z);
      const signed = state.rival.s - state.s;
      const suffix = gap < 180 ? 'Near' : 'Far';
      bins[`${signed >= 0 ? 'ahead' : 'behind'}${suffix}`]++;
      if (state.combat?.aiTimer <= 1 / 30) opportunities[gap >= 180 ? 'far' : gap < 35 ? 'close' : 'near']++;
      if (frames % 150 === 0) snapshots.push({ time: round(state.stageTimeSec),
        gap: round(signed), playerSpeed: round(state.speedMph), rivalSpeed: round(state.rival.speedMph),
        playerS: round(state.s), rivalS: round(state.rival.s), crashes: state.stageCrashes });
    }
    app.advance(1 / 30, 1 / 30);
  }
  const state = duel.state;
  const result = { cpuDifficulty, seed, status: state.status, completed: state.results?.completed,
    won: state.results?.won, finishGap: round(state.s - (state.rival?.s ?? 0)),
    rivalFinishTime: state.rival?.finishTime, raceTime: state.results?.stageTimeSec,
    elapsed: round(state.stageTimeSec), bins, opportunities,
    fires: fires.filter(row => row.type !== 'star'), hits, crashes, pickups, pickupUses, snapshots };
  app.dispose();
  return result;
}

if (process.argv.includes('--baseline')) {
  const difficulties = process.argv.includes('--hard') ? ['hard'] :
    process.argv.includes('--easy') ? ['easy'] : ['easy', 'medium', 'hard'];
  const rows = difficulties.flatMap(difficulty =>
    Array.from({ length: 10 }, (_, index) => run(difficulty, 1989 + index)));
  console.log(JSON.stringify({ seed1989: rows.filter(row => row.seed === 1989)
    .map(({ cpuDifficulty, completed, won, opportunities, fires, hits, crashes, pickups, pickupUses }) =>
      ({ cpuDifficulty, completed, won, opportunities, fires: fires.length,
        playerHits: hits.filter(hit => hit.victim === 'player').length,
        rivalPickups: pickups.filter(pickup => pickup.collector === 'rival'), pickupUses, crashes })),
  baseline: Object.fromEntries(difficulties.map(difficulty => {
    const samples = rows.filter(row => row.cpuDifficulty === difficulty);
    return [difficulty, { completed: samples.filter(row => row.completed).length,
      wins: samples.filter(row => row.won).length,
      hits: samples.map(row => row.hits.filter(hit => hit.victim === 'player').length),
      rivalPickups: samples.map(row => row.pickups.filter(pickup => pickup.collector === 'rival').length),
      pickupUses: samples.map(row => row.pickupUses.length),
      finishGaps: samples.map(row => row.finishGap),
      rivalPeakSpeed: samples.map(row => Math.max(...row.snapshots.map(item => item.rivalSpeed))) }];
  })) }, null, 2));
} else console.log(JSON.stringify(['easy', 'medium', 'hard'].map(difficulty => run(difficulty)), null, 2));
