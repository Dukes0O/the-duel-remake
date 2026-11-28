// WATER-EASY: every Water Road chapter must be winnable on Easy by a young driver
// (docs/story/wasteland-water-road.md section 4). Memory-only saves; no game file is changed.
//   node tools/test-water-easy.mjs                     the child's definition and three short games (lane tier)
//   node tools/test-water-easy.mjs --rates [case]      10 seeded games per case, all 16 or one (a heavy job)
//   add --seeds N for another count, --clock easy to press fire only on the Easy computer car's 10 s clock,
//   --player assisted for a comparison player that is NOT child pace: the game's own player aim (bolt lock and homing),
//   full arena and road pace, still 0.3 s late (how far the child is from winning)
//
// CHILD PACE (tools/water-easy-driver.mjs, CHILD): never quicker or sharper than an Easy computer car.
// - sees 0.3 to 0.6 s late and re-plans every 0.6 s (an Easy car re-plans every 0.6 s, seeing the present);
// - drives at 80 to 85% of the car's arena top speed (Easy cars: 85%) and 85 to 90% of the autopilot's corner
//   speed on a road; never boosts;
// - fire is pressed when the weapon is ready again, seen late (about every 5 s for the crossbow); every bolt leaves
//   with the Easy car's aim error (up to 10 degrees) and no homing; bombs only inside the Easy bomb range;
// - drives at where a car was seen, never where it will be; brakes, late, when a car's tell points at it;
// - on foot walks and turns with the keys, each rocket with the same 10-degree error, fired inside 40 m;
// - no boost, shield, UFO hop, arsenal specials, pickups chased or shortcuts.
// EASY-YOUNG-DRIVER: the settled card targets 5?7 assisted wins in 10 (never below 4),
// with at least 2 child wins. The driver remains unchanged; only story Easy rules are tuned.
import assert from 'node:assert/strict';
import {CHILD, STARTER_CAR, childFor, playArena, playRace} from './water-easy-driver.mjs';
import {BRAIN_DIFFICULTY} from '../src/arena/arena-brains.js';
import {CPU_COMBAT} from '../src/wasteland-tuning.js';
import {WATER_CHAPTERS} from '../src/story/water-save.js';
import {Duel} from '../src/game.js';
import {waterEasy} from '../src/story/water-easy.js';
import {startWarlordEvent} from '../src/arena/warlord-event.js';
import {COURSE} from '../src/config.js';
import {resetDustmonger} from '../src/warlords/dustmonger.js';
import {resetMirage} from '../src/warlords/mirage.js';

let checks = 0;
const ok = (condition, label) => { assert.ok(condition, label); checks++; };

// ---- The 16 cases: each chapter's job, then its warlord's fight (chapter 9, Magnus, from WARLORD-NINE) ---------------------------------------------------
// The rank a player has when the chapter opens: the job's own rank, and at least the rank of the chapter before.
const RANKS = [1, 6, 9, 12, 12, 12, 12, 12, 12];
export const CASES = [];
for (const chapter of WATER_CHAPTERS.slice(1)) {
  const rank = RANKS[chapter.n - 1], job = chapter.job;
  if (job?.kind === 'race') {
    const courseId = job.courses[0];
    CASES.push({id: `job${chapter.n}`, label: `ch${chapter.n} job: Mad Max Duel on ${courseId}`,
      play: (seed, rules) => playRace({courseId, seed, rules, waterRoad: chapter.id})});
  } else if (job) {
    CASES.push({id: `job${chapter.n}`, label: `ch${chapter.n} job: ${job.mode} (${job.venueId})`,
      play: (seed, rules) => playArena({mode: job.mode, venueId: job.venueId, seed, arsenalRank: rank, rules, waterRoad: chapter.id,
        ...(job.mode === 'ambush-alley' ? {maxSec: 900} : {})})});
  }
}
for (const chapter of WATER_CHAPTERS.slice(1)) {
  const rank = RANKS[chapter.n - 1];
  CASES.push({id: chapter.warlordId, label: `ch${chapter.n} fight: ${chapter.warlordId}`,
    play: (seed, rules) => playArena({warlordId: chapter.warlordId, seed, arsenalRank: rank, rules,
      featureFlags: {'warlord-nine': true}, waterRoad: chapter.id})});
}

// ---- The child is never better than an Easy computer car ----------------------------------------------------------
const easy = BRAIN_DIFFICULTY.easy;
ok(CHILD.replanSec >= easy.reactionSec && CHILD.seeLateSec[0] >= .3 && CHILD.seeLateSec[1] <= .6,
  'the child re-plans no faster than an Easy car and sees 0.3 to 0.6 s late');
ok(CHILD.arenaPace[1] <= easy.pace, 'the child drives no faster than an Easy car on an arena floor');
ok(CHILD.roadPace[1] <= .9, 'the child drives at most 90% of the autopilot\'s corner speed');
ok(CHILD.aimErrorRadians >= CPU_COMBAT.easy.aimError, 'the child aims no better than an Easy car');
ok(easy.boost === 'never', 'Easy cars never boost, and neither does the child');
ok(CASES.length === 16 && new Set(CASES.map(item => item.id)).size === 16, 'seven jobs and nine fights');
ok(STARTER_CAR === 'falcone_f42', 'the child drives the starter car');
{
  const a = childFor(7), b = childFor(7), c = childFor(8);
  ok(a.seeLateSec === b.seeLateSec && a.arenaPace === b.arenaPace && a.seeLateSec !== c.seeLateSec, 'one seed, one child');
}

const flag = name => process.argv.includes(name);
const value = name => flag(name) ? process.argv[process.argv.indexOf(name) + 1] : undefined;
const rules = {...(value('--clock') === 'easy' ? {attackClock: 'easy'} : {}),
  ...(value('--player') === 'assisted' ? {homing: true, arenaPace: [1, 1], roadPace: [1, 1], seeLateSec: [.3, .3]} : {})};

if (!flag('--rates')) {
  // A story marker must never change Medium, Hard, flag-off or ordinary runs.
  const setup = (chapter, fight, cpuDifficulty, waterRoad, enabled = true) => {
    const duel = new Duel({seed: 1, featureFlags: {'hidden-road': true, 'water-road': enabled, 'warlord-nine': true}});
    const options = {car: STARTER_CAR, seed: 1, cpuDifficulty, difficulty: 'casual', waterRoad};
    if (!fight && chapter.job.kind === 'race') {
      duel.startCampaign({...options, mode: 'wasteland', discoveredGate: true,
        startStage: COURSE.findIndex(course => course.id === chapter.job.courses[0])});
    } else {
      duel.state.wastelandGateDiscovered = true;
      const started = fight ? startWarlordEvent(duel, {...options, warlordId: chapter.id}) :
        duel.startArenaEvent({...options, mode: chapter.job.mode, venueId: chapter.job.venueId, arsenalRank: 12,
          opponents: chapter.job.mode === 'ambush-alley' ? [] :
            ['dusthawk_rally', 'aurora_gt', 'stuttgart_959s'].map(car => ({car, upgradeLevel: 0}))});
      assert.ok(started, 'story isolation setup starts');
    }
    return duel;
  };
  for (const chapter of WATER_CHAPTERS.slice(1)) for (const fight of chapter.job ? [false, true] : [true]) {
    for (const difficulty of ['medium', 'hard']) {
      const marked = setup(chapter, fight, difficulty, chapter.id);
      const ordinary = setup(chapter, fight, difficulty, null);
      ok(JSON.stringify(marked.state) === JSON.stringify(ordinary.state), `${chapter.id} ${fight ? 'fight' : 'job'}: ${difficulty} stays exact`);
    }
    const off = setup(chapter, fight, 'easy', chapter.id, false);
    const ordinary = setup(chapter, fight, 'easy', null, false);
    ok(JSON.stringify(off.state) === JSON.stringify(ordinary.state), `${chapter.id}: flag off stays exact`);
    const marked = setup(chapter, fight, 'easy', chapter.id);
    ok(waterEasy(marked), `${chapter.id}: the matching story run has Easy tuning`);
    marked.waterRoadJob = 'well';
    ok(!waterEasy(marked), `${chapter.id}: another chapter cannot borrow the tuning`);
  }
  {
    const duel = setup(WATER_CHAPTERS.find(chapter => chapter.id === 'blackiron'), true, 'easy', 'blackiron');
    const actor = duel.state.opponents[0], armor = actor.maxArmor;
    actor.armor = 7;
    resetDustmonger(duel, actor);
    resetMirage(duel, actor);
    ok(actor.armor === 7 && actor.maxArmor === armor, 'the Baron borrowing another move never heals or changes his armor');
  }
  // ---- Short games (lane tier): each kind of play reaches an end, the same way twice ----------------------------
  const round = playArena({seed: 1});
  ok(['time', 'sudden-death', 'damage', 'three-wrecks'].includes(round.reason) && round.attacks > 10,
    `Last Car Rolling ends (${round.reason}) and the child kept attacking (${round.attacks})`);
  ok(JSON.stringify(playArena({seed: 1})) === JSON.stringify(round), 'a seeded game is the same game');
  const sal = playArena({warlordId: 'sal', seed: 1});
  ok(sal.reason !== 'unfinished' && sal.tells > 0, `Sal's fight ends (${sal.reason}) and the child saw her tells`);
  const fuel = playArena({mode: 'fuel-run', seed: 1, arsenalRank: 6});
  ok(fuel.reason !== 'unfinished' && fuel.fuel[0] > 0, `Fuel Run ends (${fuel.reason}) with the child delivering fuel (${fuel.fuel[0]})`);
} else {
  // ---- The rates: 10 seeded games per case -------------------------------------------------------------------------
  const only = value('--rates') && !value('--rates').startsWith('--') ? value('--rates') : null;
  const count = Number(value('--seeds') ?? 10), started = Date.now(), rows = [];
  const minimum = rules.homing ? .4 : .2;
  const cases = CASES.filter(item => !only || item.id === only);
  assert.ok(cases.length, 'Choose a case: ' + CASES.map(item => item.id).join(', '));
  for (const item of cases) {
    const games = [];
    for (let seed = 1; seed <= count; seed++) games.push(await item.play(seed, rules));
    const wins = games.filter(game => game.won).length;
    rows.push({item, wins, games});
    const why = [...new Set(games.filter(game => !game.won).map(game => game.reason ?? game.status))].join(', ');
    console.log(`${item.label.padEnd(44)} ${String(wins).padStart(2)}/${count}${wins < count * minimum ? '  BELOW FLOOR' : rules.homing && wins > count * .7 ? '  ABOVE TARGET' : ''}` +
      (why ? `  (lost: ${why})` : ''));
    if (flag('--verbose')) for (const game of games) console.log('   ', JSON.stringify(game));
  }
  console.log(`${rows.length} cases, ${rows.length * count} games, ${Math.round((Date.now() - started) / 1000)} s` +
    (rules.attackClock ? ', fire on the Easy clock' : '') + (rules.homing ? ', the assisted comparison player' : ''));
  const below = rows.filter(row => row.wins < count * minimum || rules.homing && row.wins > count * .7);
  if (below.length) {
    console.log('Outside the card target: ' + below.map(row => row.item.id).join(', ') + '.');
    process.exitCode = 1;
  } else checks++;
}
console.log(`water-easy: ${checks} checks passed`);
