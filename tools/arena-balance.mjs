// Scrapdome balance measurement (docs/SCRAPDOME.md section 8).
// Usage: node tools/arena-balance.mjs [--quick]
// Plays full Last Car Rolling rounds headless with a plain scripted player
// (chase the nearest car, crossbow every four seconds) and reports, per
// difficulty: wrecks per round, the player's placings, how close computer
// cars fight, hard wall hits and time spent reversing. Seeded and repeatable.
import {Duel} from '../src/game.js';
import {worldPose} from '../src/arena/arena-floor.js';
import {arenaActor} from '../src/combat-teams.js';

const quick = process.argv.includes('--quick');
const SEEDS = quick ? [1989, 7] : [1989, 7, 42, 2024];
const PLAYER_CARS = quick ? ['banshee_muscle'] : ['banshee_muscle', 'viper_proto', 'falcone_f42'];
const FIELDS = quick ? [3] : [1, 2, 3];
const OPPONENTS = ['dusthawk_rally', 'aurora_gt', 'stuttgart_959s'];
const FLAGS = {wasteland2: true, 'hidden-road': true, scrapdome: true};

function scriptedPlayer(duel, step) {
  const s = duel.state, me = worldPose(duel, s);
  let best = null, bestDistance = Infinity;
  for (const other of s.opponents) {
    if (other.combatWrecking) continue;
    const at = worldPose(duel, other), distance = Math.hypot(at.x - me.x, at.z - me.z);
    if (distance < bestDistance) { best = at; bestDistance = distance; }
  }
  let steer = 0;
  if (best) {
    const turn = Math.atan2(best.x - me.x, best.z - me.z) - me.heading;
    steer = Math.max(-1, Math.min(1, -Math.atan2(Math.sin(turn), Math.cos(turn)) * 2));
  }
  duel.setInput({throttle: 1, brake: 0, steer, boost: false});
  if (s.status === 'racing' && step % 480 === 0) duel.fireWeapon('crossbow');
}

export function playRound({difficulty, seed, car, field}) {
  const duel = new Duel({seed, featureFlags: FLAGS});
  if (!duel.startArenaEvent({car, cpuDifficulty: difficulty, seed,
    opponents: OPPONENTS.slice(0, field).map(car => ({car}))})) throw Error('arena refused');
  const s = duel.state, out = {wrecks: 0, cpuWallHits: 0, near: 0, samples: 0, reversing: 0};
  duel.onChange((_state, event) => {
    if (event.arenaWreck) out.wrecks++;
    if (event.arenaWallHit?.id?.startsWith('cpu')) out.cpuWallHits++;
  });
  for (let step = 0; s.status !== 'arena_result' && step < 120 * 200; step++) {
    scriptedPlayer(duel, step);
    duel.step(1 / 120);
    if (s.status !== 'racing' || step % 60) continue;
    for (const participant of s.arena.participants) {
      if (participant.kind !== 'cpu') continue;
      const actor = arenaActor(duel, participant.id), target = participant.targetId && arenaActor(duel, participant.targetId);
      if (!actor || actor.combatWrecking) continue;
      out.samples++;
      if ((actor._arenaReverseSec || 0) > 0) out.reversing++;
      if (target) {
        const a = worldPose(duel, actor), b = worldPose(duel, target);
        if (Math.hypot(a.x - b.x, a.z - b.z) < 40) out.near++;
      }
    }
  }
  out.place = s.arena.result.placings.indexOf('player') + 1;
  return out;
}

const report = {};
for (const difficulty of ['easy', 'medium', 'hard']) {
  const rows = [];
  for (const seed of SEEDS) for (const car of PLAYER_CARS) for (const field of FIELDS)
    rows.push({field, ...playRound({difficulty, seed, car, field})});
  const full = rows.filter(row => row.field === 3);
  const sum = (list, key) => list.reduce((total, row) => total + row[key], 0);
  report[difficulty] = {
    rounds: rows.length,
    wrecksPerRoundFullField: +(sum(full, 'wrecks') / full.length).toFixed(1),
    playerWins: rows.filter(row => row.place === 1).length,
    playerMeanPlace: +(sum(rows, 'place') / rows.length).toFixed(2),
    cpuNearShare: +(sum(rows, 'near') / sum(rows, 'samples')).toFixed(2),
    cpuWallHitsPerRound: +(sum(rows, 'cpuWallHits') / rows.length).toFixed(1),
    cpuReversingShare: +(sum(rows, 'reversing') / sum(rows, 'samples')).toFixed(3),
  };
}
console.log(JSON.stringify(report, null, 2));
