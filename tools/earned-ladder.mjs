// Earned-car ladder pacing (docs/EARNED_CARS.md section 4.1, card EARN-FINISH).
// Plays whole memory-only careers through the game's own settleRace, so the
// credits, medal counting, car prices and earned-car grants are the real rules.
// Only the race itself is a seeded dice roll. Nothing is saved or read from disk.
//   node tools/earned-ladder.mjs            all rows, 300 careers each
//   node tools/earned-ladder.mjs 200        fewer careers, quicker
import { COURSE } from '../src/config.js';
import { MEDAL_CARS, medalTotals } from '../src/medals.js';
import { makeRng } from '../src/rng.js';
import { CAR_PRICES, UPGRADE_COSTS, createProfile, purchaseUpgrade, settleRace, unlockCar } from '../src/progression.js';

const CAREERS = Math.max(20, Number(process.argv[2]) || 300);
const MAX_RACES = 700;
const pacific = COURSE.findIndex(course => course.id === 'pacific-canyon');
const buyable = Object.keys(CAR_PRICES).sort((a, b) => CAR_PRICES[a] - CAR_PRICES[b]);

// Who plays. Chances are my own estimates, not measured from a real player.
// `start` is the chance to win the first race, `gain` the rise per race played,
// `cap` the ceiling. `gp` is the share of races that are a Grand Prix.
const PLAYERS = {
  child: { levels: { easy: 1 }, gp: 0.4, chance: { easy: { start: 0.33, gain: 0.012, cap: 0.8 } } },
  parent: { levels: { medium: 1, hard: 1 }, gp: 0.5, chance: {
    medium: { start: 0.55, gain: 0.01, cap: 0.85 }, hard: { start: 0.3, gain: 0.01, cap: 0.7 } } },
};
// cars: most cars bought. upgrades: most upgrades bought (one car at a time).
// Both spend on the cheapest thing affordable. pick: 'random' races any owned
// car; 'chase' races a car whose box for that race is still empty.
const ROWS = [
  ['child', { cars: 3, upgrades: 0, pick: 'random' }, 'Child, 3 cars bought, random car'],
  ['child', { cars: 3, upgrades: 4, pick: 'random' }, 'Child, 4 upgrades and 3 cars, random car'],
  ['child', { cars: 99, upgrades: 0, pick: 'random' }, 'Child, buys every car, random car'],
  ['child', { cars: 99, upgrades: 0, pick: 'chase' }, 'Child, buys every car, chases empty boxes'],
  ['parent', { cars: 0, upgrades: 0, pick: 'random' }, 'Parent, no purchase, random car'],
  ['parent', { cars: 3, upgrades: 4, pick: 'random' }, 'Parent, 4 upgrades and 3 cars, random car'],
  ['parent', { cars: 99, upgrades: 0, pick: 'random' }, 'Parent, buys every car, random car'],
  ['parent', { cars: 99, upgrades: 0, pick: 'chase' }, 'Parent, buys every car, chases empty boxes'],
];

function career(playerName, policy, seed) {
  const player = PLAYERS[playerName], rng = makeRng(seed);
  let profile = createProfile(), races = 0, wins = 0, carsBought = 0, upgradesBought = 0;
  const reached = {}, wonBoxes = new Set();
  const levels = Object.keys(player.levels);
  const finishedAt = () => MEDAL_CARS.every(car => reached[car]);
  while (races < MAX_RACES && !finishedAt()) {
    const level = levels.length === 1 ? levels[0] : rng.pick(levels);
    const mode = rng.chance(player.gp) ? 'grandprix' : 'duel', row = mode === 'grandprix' ? 'grandprix' : 'duel';
    const owned = profile.unlockedCars;
    const empty = owned.filter(car => !wonBoxes.has(`${car}/${row}/${level}`));
    const car = policy.pick === 'chase' && empty.length ? rng.pick(empty) : rng.pick(owned);
    const odds = player.chance[level];
    const won = rng.chance(Math.min(odds.cap, odds.start + odds.gain * races));
    races++;
    const base = { runId: `ladder-${seed}-${races}`, stageIndex: pacific, car, cpuDifficulty: level, mode,
      difficulty: 'casual', seed: 1989, completed: true, won, earnedCarsEnabled: true,
      grandPrixCareerEnabled: true, driverId: 'club' };
    const result = mode === 'grandprix'
      ? { ...base, laps: 3, timeSec: 300, fieldSize: 8, position: won ? 1 : rng.int(2, 6) }
      : { ...base, laps: 2, timeSec: 180, lapTimes: [90, 90] };
    const settled = settleRace(profile, result);
    profile = settled.profile;
    if (won) { wins++; wonBoxes.add(`${car}/${row}/${level}`); }
    for (const earned of settled.earnedCars ?? [])
      reached[earned] = { wins, races, carsBought, upgradesBought, ...medalTotals(profile) };
    // Spend winnings on the cheapest thing wanted and affordable.
    for (;;) {
      const wantCar = carsBought < policy.cars ? buyable.find(id => !profile.unlockedCars.includes(id)) : null;
      const upgrade = upgradesBought < policy.upgrades ? nextUpgrade(profile) : null;
      const options = [wantCar && { cost: CAR_PRICES[wantCar], buy: () => unlockCar(profile, wantCar), car: true },
        upgrade && { cost: UPGRADE_COSTS[upgrade.level], buy: () => purchaseUpgrade(profile, upgrade.car, upgrade.type) }]
        .filter(Boolean).sort((a, b) => a.cost - b.cost);
      const pick = options.find(option => option.cost <= profile.credits);
      if (!pick) break;
      const bought = pick.buy();
      if (!bought.ok) break;
      profile = bought.profile;
      if (pick.car) carsBought++; else upgradesBought++;
      for (const earned of bought.earnedCars ?? [])
        reached[earned] ??= { wins, races, carsBought, upgradesBought, ...medalTotals(profile) };
    }
  }
  return reached;
}

// The lowest upgrade on the first owned, bought car (the starter before any purchase).
function nextUpgrade(profile) {
  const car = profile.unlockedCars.find(id => !MEDAL_CARS.includes(id));
  const levels = profile.upgrades[car] ?? {};
  const types = ['engine', 'handling', 'tires', 'brakes', 'suspension'];
  const type = types.find(name => (levels[name] ?? 0) < 3);
  return type ? { car, type, level: levels[type] ?? 0 } : null;
}

const spread = values => {
  if (!values.length) return null;
  const sorted = [...values].sort((a, b) => a - b), at = share => sorted[Math.min(sorted.length - 1, Math.floor(share * sorted.length))];
  return { median: at(0.5), low: at(0.1), high: at(0.9) };
};
const show = (runs, car, field) => {
  const hit = runs.filter(run => run[car]).map(run => run[car][field]);
  if (hit.length < runs.length * 0.5) return `not reached (${runs.length - hit.length} of ${runs.length} never)`;
  const s = spread(hit);
  return `${s.median} (${s.low} to ${s.high})${hit.length < runs.length ? `, ${runs.length - hit.length} never` : ''}`;
};

console.log(`Won races to each earned car: middle of ${CAREERS} careers, then (10th to 90th percentile).`);
console.log('Medals needed:', MEDAL_CARS.join(', '));
for (const [name, policy, label] of ROWS) {
  const runs = Array.from({ length: CAREERS }, (_, i) => career(name, policy, 4000 + i));
  console.log(`\n${label}`);
  for (const car of MEDAL_CARS)
    console.log(`  ${car}: wins ${show(runs, car, 'wins')}; races ${show(runs, car, 'races')}; cars bought ${show(runs, car, 'carsBought')}; upgrades ${show(runs, car, 'upgradesBought')}`);
}
