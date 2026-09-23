// Deterministic, graphics-free races using the production App autopilot and Duel.
import { writeFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
import { resolve } from 'node:path';
import { App } from '../src/app.js';

const DIFFICULTIES = ['easy', 'medium', 'hard'];
const STEP = 1 / 30;
const MAX_RACE_SECONDS = 420;
const round = value => Number(value.toFixed(3));
const mean = values => values.length ? round(values.reduce((sum, value) => sum + value, 0) / values.length) : null;

export function parseFeelArgs(args) {
  let seeds = [1, 42, 1989, 2026, 90517, 17, 71, 911];
  let json = null;
  for (const arg of args) {
    if (/^--seeds=\d+$/.test(arg)) {
      const count = Number(arg.slice(8));
      if (count < 1 || count > 100) throw Error('--seeds must be 1–100.');
      seeds = Array.from({ length: count }, (_, index) => index < 8 ? [1, 42, 1989, 2026, 90517, 17, 71, 911][index] : 1009 + index * 7919);
    } else if (arg.startsWith('--json=')) json = resolve(arg.slice(7));
    else throw Error(`Unknown feel-lab argument: ${arg}`);
  }
  return { seeds, json };
}

export function runRace({ seed, difficulty, mode }) {
  const app = new App();
  app.autopilot = true;
  app._scriptedCrashDone = true; // Keep the same racing line in both modes.
  app.duel.startCampaign({ seed, cpuDifficulty: difficulty, mode, car: 'falcone_f42', difficulty: 'casual', startStage: 0 });
  const state = app.duel.state;
  const events = [];
  const leadChanges = [];
  const catches = { player: 0, rival: 0 };
  let previousLead = null;
  let weaponAttempts = 0;
  let weaponFired = 0;
  let offensiveShots = 0;
  let nextWeaponTime = 8;
  const detach = app.duel.onChange((s, event) => {
    for (const kind of Object.keys(event)) {
      if (!['weaponFired', 'combatExplosion', 'combatHit', 'crash', 'vehicleCrushed'].includes(kind)) continue;
      events.push({ timeSec: round(s.stageTimeSec), kind, ...(kind === 'combatHit' ? { victim: event.victim, enemy: event.enemy } : {}) });
    }
  });
  let frames = 0;
  try {
    while (['countdown', 'racing', 'ticket'].includes(state.status) && frames++ < MAX_RACE_SECONDS / STEP) {
      if (mode === 'wasteland' && state.status === 'racing' && state.stageTimeSec >= nextWeaponTime) {
        for (const weapon of ['star', 'bomb', 'crossbow', 'ufo']) {
          weaponAttempts++;
          if (app.duel.fireWeapon(weapon)) {
            weaponFired++;
            if (weapon === 'bomb' || weapon === 'crossbow') offensiveShots++;
          }
        }
        nextWeaponTime += 12;
      }
      app.advance(STEP, STEP);
      if (state.status !== 'racing' || !state.rival) continue;
      const lead = state.s >= state.rival.s ? 'player' : 'rival';
      if (previousLead && lead !== previousLead) {
        leadChanges.push(round(state.stageTimeSec));
        catches[lead]++;
      }
      previousLead = lead;
    }
    const explosions = events.filter(event => event.kind === 'combatExplosion').map(event => event.timeSec);
    const hits = events.filter(event => event.kind === 'combatHit');
    const wrecks = events.filter(event => event.kind === 'vehicleCrushed').length + (state.status === 'gameover' ? 1 : 0);
    const firstCombat = events.find(event => ['weaponFired', 'combatHit', 'combatExplosion'].includes(event.kind));
    return {
      seed, difficulty, mode, status: state.status, won: state.results?.won === true,
      raceTimeSec: state.results?.timeSec ?? round(state.stageTimeSec + state.racePenaltySec),
      firstCombatSec: firstCombat?.timeSec ?? null,
      explosionIntervalsSec: explosions.slice(1).map((time, index) => round(time - explosions[index])),
      explosions: explosions.length, weaponAttempts, weaponFired, offensiveShots,
      hitsOnPlayer: hits.filter(event => event.victim === 'player').length,
      hitsOnRival: hits.filter(event => event.victim === 'rival').length,
      hitEventsPerOffensiveShot: offensiveShots ? round(hits.filter(event => !event.enemy).length / offensiveShots) : null,
      wrecks, leadChanges: leadChanges.length, leadChangeTimesSec: leadChanges, catches,
      cpuCrewExits: null, cpuCrewExitsNote: 'No CPU crew-exit event or mechanic exists in this build.',
      events,
    };
  } finally {
    detach?.();
    // This lab never starts requestAnimationFrame or an AudioContext. App.dispose
    // expects a browser cancelAnimationFrame, which is absent in Node.
    if (typeof cancelAnimationFrame === 'function') app.dispose();
  }
}

export function summarizeFeel(races) {
  const byDifficulty = Object.fromEntries(DIFFICULTIES.map(difficulty => {
    const combat = races.filter(race => race.difficulty === difficulty && race.mode === 'wasteland');
    const ordinary = races.filter(race => race.difficulty === difficulty && race.mode === 'duel');
    const times = combat.map(race => race.raceTimeSec);
    const baseline = ordinary.map(race => race.raceTimeSec);
    return [difficulty, {
      races: combat.length, wins: combat.filter(race => race.won).length,
      winRate: combat.length ? round(combat.filter(race => race.won).length / combat.length) : null,
      ordinaryWinRate: ordinary.length ? round(ordinary.filter(race => race.won).length / ordinary.length) : null,
      firstCombatSec: mean(combat.map(race => race.firstCombatSec).filter(Number.isFinite)),
      explosionIntervalSec: mean(combat.flatMap(race => race.explosionIntervalsSec)),
      hitEventsPerOffensiveShot: mean(combat.map(race => race.hitEventsPerOffensiveShot).filter(Number.isFinite)),
      hitsOnPlayer: mean(combat.map(race => race.hitsOnPlayer)),
      hitsOnRival: mean(combat.map(race => race.hitsOnRival)),
      wrecksPerRace: mean(combat.map(race => race.wrecks)),
      leadChangesPerRace: mean(combat.map(race => race.leadChanges)),
      playerCatchesPerRace: mean(combat.map(race => race.catches.player)),
      rivalCatchesPerRace: mean(combat.map(race => race.catches.rival)),
      combatRaceTimeSec: mean(times), ordinaryRaceTimeSec: mean(baseline),
      raceTimeRatio: mean(baseline) ? round(mean(times) / mean(baseline)) : null,
      cpuCrewExits: null,
    }];
  }));
  return { schema: 1, autopilot: 'production App._driveAutopilot', car: 'falcone_f42', course: 'pacific-canyon',
    seedCount: new Set(races.map(race => race.seed)).size,
    targets: { easy: [0.8, 0.95], medium: [0.45, 0.65], hard: [0.2, 0.4] },
    byDifficulty, races };
}

export async function main(args = process.argv.slice(2)) {
  const options = parseFeelArgs(args);
  const races = [];
  for (const difficulty of DIFFICULTIES) for (const seed of options.seeds) {
    for (const mode of ['duel', 'wasteland']) races.push(runRace({ seed, difficulty, mode }));
  }
  const report = summarizeFeel(races);
  if (options.json) await writeFile(options.json, JSON.stringify(report, null, 2) + '\n');
  for (const [difficulty, row] of Object.entries(report.byDifficulty))
    console.log(`${difficulty}: ${row.wins}/${row.races} combat wins (${Math.round(row.winRate * 100)}%); first combat ${row.firstCombatSec ?? 'n/a'} s; hit events/offensive shot ${row.hitEventsPerOffensiveShot ?? 'n/a'}; lead changes ${row.leadChangesPerRace}; time ×${row.raceTimeRatio}`);
  console.log(`CPU crew exits: unavailable until the crew mechanic emits an event. ${options.json ? `JSON: ${options.json}` : ''}`);
  return report;
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href)
  main().catch(error => { console.error(error); process.exitCode = 1; });
