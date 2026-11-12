// The gas run (docs/board/cards/RUN-GAS.md): Big Bess drives from the Everburn well to Tin Town again and again, by the long
// road or by the Boneyard road. It is job 4's escort step with a road, a pay and raids that depend on the Ash Men's feud.
// World-job data only: the job engine and the job mode own every rule (raids: src/world/jobs/steps/escort.js).
import {makeRng} from '../../rng.js';
import {arenaReward} from '../../arena/arena-settlement.js';
import {ambushRaiders} from './steps/escort.js';

const place = (id, x, z, radius = 12) => Object.freeze({id, position: Object.freeze({x, y: 0, z}), radius});
const path = (...places) => Object.freeze(places);

const well = place('everburn', -424, 304, 18), tinTown = place('tin-town', 600, 0, 18);

// The two roads. The long road is the card's table as it stands. The Boneyard road goes straight on from the Boneyard to
// Tin Town's gate and the town (by a place 50 m south of the gate, so that it passes squarely through the gate's opening);
// it no longer doubles back to the safe road. The planes' box lies just north-west of the
// Boneyard's place (424, 304), so that place is moved 23 m east and south, to (447, 308), the one move that keeps the road
// 8 m from every solid; Tin Town's gate, (575, 62), brings the road in from the south of the town's box.
export const GAS_RUN_PATHS = Object.freeze({
  long: path(well, place('long-road-1', -450, 40), place('long-road-2', -300, -230), place('long-road-3', -60, -380),
    place('long-road-4', 170, -340), place('long-road-5', 350, -200), place('long-road-6', 480, -90), tinTown),
  boneyard: path(well, place('boneyard-road-1', -200, 350), place('boneyard-road-2', 0, 370), place('boneyard-road-3', 250, 415),
    place('boneyard-road-4', 447, 308), place('tin-town-gate-approach', 575, 112), place('tin-town-gate', 575, 62), tinTown),
});
export const GAS_RUN_ROADS = Object.freeze(Object.keys(GAS_RUN_PATHS));
// One share, two on the Boneyard road. A share is the one amount every world job pays (src/arena/arena-settlement.js).
export const GAS_RUN_SHARES = Object.freeze({long: 1, boneyard: 2});
export const GAS_RUN_NAMES = Object.freeze({long: 'Long road', boneyard: 'Boneyard road'});

// The Ash Men's raids by feud (1 Watching to 4 War party): the raiders in each raid, in the order along the road.
export const GAS_RUN_RAIDS = Object.freeze({
  boneyard: Object.freeze([Object.freeze([2]), Object.freeze([2, 2]), Object.freeze([2, 3, 2]), Object.freeze([3, 3, 4])]),
  long: Object.freeze([Object.freeze([]), Object.freeze([]), Object.freeze([2]), Object.freeze([3])]),
});

const lengthOf = places => places.slice(1).reduce((sum, item, index) =>
  sum + Math.hypot(item.position.x - places[index].position.x, item.position.z - places[index].position.z), 0);
export const gasRunLength = road => lengthOf(GAS_RUN_PATHS[road]);

// The point `metres` along a road.
export function pointAlongRoad(road, metres) {
  const places = GAS_RUN_PATHS[road];
  let left = metres;
  for (let i = 1; i < places.length; i++) {
    const a = places[i - 1].position, b = places[i].position, length = Math.hypot(b.x - a.x, b.z - a.z);
    if (left <= length || i === places.length - 1) {
      const t = Math.min(1, left / length);
      return {x: a.x + (b.x - a.x) * t, z: a.z + (b.z - a.z) * t};
    }
    left -= length;
  }
  return {x: places[0].position.x, z: places[0].position.z};
}

// Where the Ash Men may wait: a fixed list of places along each road, by metres from the well. The raid on the long road is
// the one place where that road comes nearest the Boneyard (110 m before Tin Town; the road's far end is its nearest approach).
export const GAS_RUN_AMBUSH_METRES = Object.freeze({
  boneyard: Object.freeze([260, 400, 540, 690, 830, 977, 1107]),
  long: Object.freeze([Math.round(gasRunLength('long') - 110)]),
});

const ROAD_SALT = Object.freeze({long: 0x1f3a5c7d, boneyard: 0x6b8e2d41});
const BATTLE_SALT = 0x3c91f7a5;
// `count` of the candidate places, drawn by the seeded generator from the run count, in the order along the road. The same run
// count always gives the same places. Each run is drawn after the run before it, and a draw that would repeat that run's
// places is drawn again, so two runs in a row with the same number of raids are never alike. The run count counts round
// every 4,096 runs, which keeps the work small.
const RUN_CYCLE = 4096;
function drawPlaces(road, count, runs, marks = GAS_RUN_AMBUSH_METRES[road], salt = ROAD_SALT[road]) {
  if (count <= 0) return [];
  const draw = seed => {
    const rng = makeRng(seed), order = marks.map((_, index) => index);
    for (let i = order.length - 1; i > 0; i--) { const j = rng.int(0, i); [order[i], order[j]] = [order[j], order[i]]; }
    return order.slice(0, count).sort((a, b) => a - b).map(index => marks[index]);
  };
  const seedOf = (n, attempt = 0) => (Math.imul(n + 1, 0x9e3779b1) ^ salt ^ Math.imul(attempt, 0x85ebca6b)) >>> 0;
  let chosen = null;
  for (let n = 0; n <= runs % RUN_CYCLE; n++) {
    const before = chosen?.join() ?? null;
    chosen = draw(seedOf(n));
    for (let attempt = 1; chosen.join() === before && attempt < 32; attempt++) chosen = draw(seedOf(n, attempt));
  }
  return chosen;
}

const validRoad = road => Object.hasOwn(GAS_RUN_PATHS, road);
const clampFeud = feud => Number.isSafeInteger(feud) ? Math.max(1, Math.min(4, feud)) : 2;

// The raids of a run: [{id, place, count}] in the order along the road, `count` being the card's number of raiders (Easy's one
// fewer is taken by the escort step itself).
export function gasRunAmbushes(road, feud, runs) {
  const counts = GAS_RUN_RAIDS[road][clampFeud(feud) - 1];
  return drawPlaces(road, counts.length, Number.isSafeInteger(runs) && runs >= 0 ? runs : 0).map((metres, index) => {
    const at = pointAlongRoad(road, metres);
    return Object.freeze({id: `gas-run-raid-${index + 1}`, place: place(`gas-run-raid-${index + 1}`, Math.round(at.x * 10) / 10, Math.round(at.z * 10) / 10),
      count: counts[index], metres});
  });
}

// What a run pays at a difficulty: shares times the one world-job amount, read from the game's own settlement.
export function gasRunPay(road, difficulty) {
  const arena = {version: 1, venueId: 'scablands', mode: 'world-job', phase: 'over', participants: [{id: 'player'}],
    result: {placings: ['player'], winnerId: 'player', reason: 'job-complete'},
    worldJob: {definition: {shares: GAS_RUN_SHARES[road]}, job: {stepIndex: 1, steps: [{}]}}};
  return arenaReward(arena, difficulty).total;
}

const START_LINE = Object.freeze({long: 'story.ember.moss.5', boneyard: 'story.ember.moss.6'});
export const GAS_RUN_LINES = Object.freeze({start: START_LINE, raid: 'story.ember.moss.7', whole: 'story.ember.moss.8',
  hurt: 'story.ember.moss.9', giveUp: 'story.ember.moss.10', warParty: 'story.ember.auntie-solder.9', hurtBelow: 70});

// The job definition of one run, from the road, the feud (1 to 4), the number of runs already arrived and the difficulty.
// `furnaceDead` (the battle has been won): a Boneyard run carries `wreck`, where the scene draws the dead furnace.
export function gasRunJob({road, feud = 2, runs = 0, difficulty = 'medium', furnaceDead = false} = {}) {
  if (!validRoad(road)) throw new RangeError(`There is no gas road called ${JSON.stringify(road)}.`);
  const route = GAS_RUN_PATHS[road], ambushes = Object.freeze(gasRunAmbushes(road, feud, runs));
  // Auntie Solder says her line once: when this arrival is the one that takes the feud to War party.
  const reachesWarParty = road === 'boneyard' && clampFeud(feud) === 3;
  const step = Object.freeze({kind: 'escort', what: `Keep Big Bess safe on the ${road === 'long' ? 'long road' : 'Boneyard road'} to Tin Town.`,
    actorId: 'big-bess',
    // No stand-in car: the Scablands scene draws Big Bess's own truck at this actor's spot, as in job 4.
    actor: Object.freeze({id: 'big-bess', renderCar: false, escort: true, health: 100, speed: 9, path: route}),
    path: route, destination: tinTown, speed: 9, health: 100, restLineId: 'story.ember.moss.3', restartFrom: 'last-marker', restSeconds: 3, lentWeapon: 'flamethrower', giveUpLineId: GAS_RUN_LINES.giveUp,
    ambushes, raidLineId: GAS_RUN_LINES.raid, startLineId: START_LINE[road],
    arrival: Object.freeze({wholeLineId: GAS_RUN_LINES.whole, hurtLineId: GAS_RUN_LINES.hurt, hurtBelow: GAS_RUN_LINES.hurtBelow,
      thenLineIds: reachesWarParty ? Object.freeze([GAS_RUN_LINES.warParty]) : Object.freeze([])})});
  return Object.freeze({id: `gas-run-${road}`, storyId: 'everburn', run: true, road, name: 'Gas Run', kind: 'escort',
    feud: clampFeud(feud), runs, difficulty, shares: GAS_RUN_SHARES[road],
    // What the child-pace Easy rule gives: the raids' raiders, one fewer on Easy (never fewer than one).
    raids: Object.freeze(ambushes.map(item => Object.freeze({id: item.id, count: ambushRaiders(item, difficulty)}))),
    easy: Object.freeze({truckHealth: 100, raiderPressure: 'low', breakdownRecovery: 'one-rest-then-restart'}),
    ...(furnaceDead === true && road === 'boneyard' ? {wreck: FIELD_BATTLE.wreck} : {}),
    steps: [step]});
}

export const isGasRun = job => job?.run === true && job?.storyId === 'everburn' && validRoad(job.road);

// ---- The battle on the Boneyard road (docs/board/cards/FIELD-BATTLE-ASH.md) ----------------------------------------------------
// At War party, while the furnace is alive, the next Boneyard run is not a run but a battle: Big Bess drives the same road with two
// ambushes of 3 (2 on Easy) ahead of her, and the Ash Men's patched furnace comes out behind her 560 m along the road (past (0, 370)) and hunts her.
// The furnace is Old Smoke's, with the same doors and the same rules (src/world/jobs/old-smoke.js), switched for the battle by the
// `battle` rules on its definition. World-job data only: the job mode owns every rule (src/arena/modes/world-job.js).
const FURNACE_ID = 'old-smoke-furnace';
// How far into the road Big Bess is when the furnace comes out: 130 m past (0, 370), which is 430 m in. It was 430 in the first build; with
// 430 the three doors were broken long before the gate and the furnace never caught up. At 560 there is about 700 m of road, 78 s, left for
// three doors (chosen from 30 tries of each driver, docs/board/cards/FIELD-BATTLE-ASH.md "Tuning result").
const comesOutAtMetres = 560;
// Where it comes out, this far behind Big Bess on her road. The card puts its start at (250, 415) and has it drive "her road
// behind her", but (250, 415) is 254 m ahead of (0, 370): the furnace comes out on the road behind her instead.
export const FIELD_BATTLE_GAP_METRES = 80;
export const FIELD_BATTLE = Object.freeze({
  shares: 4,
  // Big Bess arrives with the furnace still rolling: the gas is home and the run counts, at the Boneyard road's own pay.
  arrivedShares: GAS_RUN_SHARES.boneyard,
  ambushCounts: Object.freeze([3, 3]),
  // Fixed places along the road, ahead of (0, 370), where the two ambushes may stand; the seeded generator draws two.
  ambushMetres: Object.freeze([540, 690, 830, 977, 1107]),
  comesOutAt: Object.freeze(pointAlongRoad('boneyard', comesOutAtMetres)),
  comesOutAtMetres,
  furnace: Object.freeze({
    speed: Object.freeze({easy: 10, medium: 11, hard: 11}),
    // More than catchUpBeyondMetres behind her along the road the furnace drives at this pace; within it, at `speed`.
    catchUpSpeed: Object.freeze({easy: 12, medium: 15, hard: 15}),
    catchUpBeyondMetres: 40,
    burnPerSecond: Object.freeze({easy: 2, medium: 4, hard: 6}),
    burnRangeMetres: 25,
    // Never nearer than this to Big Bess, so it never rams her.
    holdBehindMetres: 12,
    stopSec: Object.freeze({easy: 8, medium: 8, hard: 8}),
    // A door begins to stoke only while the furnace is within burnRangeMetres of Big Bess. The glow is the story's own; the stoke is 6 s on
    // Medium and Hard (the story's is 4 s), so that the fire is seen landing before each door.
    stokeSec: Object.freeze({easy: 4, medium: 6, hard: 6}),
    glowSec: Object.freeze({easy: 6, medium: 4.5, hard: 3.5}),
    doorsToStop: Object.freeze({easy: 1, medium: 3, hard: 3}),
    comesOutAtMetres,
    startMetres: comesOutAtMetres - FIELD_BATTLE_GAP_METRES,
    // Drawn only: two of the six shields gone and one door scorched, at the rear (so the left door is the first to break).
    hurtAtStart: Object.freeze(['rear']),
  }),
  lines: Object.freeze({start: 'story.ember.moss.11', comesOut: 'story.ember.clinker.1', door: 'story.ember.clinker.2',
    cinders: 'story.ember.moss.12', dead: 'story.ember.cinder.25', arrived: 'story.ember.auntie-solder.10', won: 'story.ember.auntie-solder.11'}),
  // The dead furnace as a wreck on later Boneyard runs: 8 m north of the road at (250, 415), lying along it.
  wreck: Object.freeze({x: 250, z: 407, heading: Math.atan2(250, 45)}),
});

// The ambushes of a battle: two of 3 raiders (the escort step takes Easy's one fewer), from the run count.
export function fieldBattleAmbushes(runs) {
  const counts = FIELD_BATTLE.ambushCounts;
  return drawPlaces('boneyard', counts.length, Number.isSafeInteger(runs) && runs >= 0 ? runs : 0, FIELD_BATTLE.ambushMetres, BATTLE_SALT).map((metres, index) => {
    const at = pointAlongRoad('boneyard', metres), id = `field-battle-raid-${index + 1}`;
    return Object.freeze({id, place: place(id, Math.round(at.x * 10) / 10, Math.round(at.z * 10) / 10), count: counts[index], metres});
  });
}

// What a battle pays at a difficulty: four shares for a won battle, or `shares` of the one world-job amount.
export function fieldBattlePay(difficulty, shares = FIELD_BATTLE.shares) {
  const arena = {version: 1, venueId: 'scablands', mode: 'world-job', phase: 'over', participants: [{id: 'player'}],
    result: {placings: ['player'], winnerId: 'player', reason: 'job-complete'},
    worldJob: {definition: {shares}, job: {stepIndex: 1, steps: [{}]}}};
  return arenaReward(arena, difficulty).total;
}

// The job definition of the battle, from the number of runs already arrived and the difficulty.
export function fieldBattleJob({runs = 0, difficulty = 'medium'} = {}) {
  const route = GAS_RUN_PATHS.boneyard, ambushes = Object.freeze(fieldBattleAmbushes(runs)), lines = FIELD_BATTLE.lines;
  const leg = (id, door) => Object.freeze({id, door, fromWaypoint: 0});
  // One long leg: the three doors come in turn, left, right, rear.
  const furnace = Object.freeze({id: FURNACE_ID, health: 3, speed: FIELD_BATTLE.furnace.speed.medium, path: route,
    legs: Object.freeze([leg('road-left', 'left'), leg('road-right', 'right'), leg('road-rear', 'rear')]), battle: FIELD_BATTLE.furnace});
  const step = Object.freeze({kind: 'escort', what: 'Get Big Bess to Tin Town on the Boneyard road, and break the furnace’s doors while they glow.',
    actorId: 'big-bess',
    actor: Object.freeze({id: 'big-bess', renderCar: false, escort: true, health: 100, speed: 9, path: route}),
    furnaceActor: furnace,
    path: route, destination: tinTown, speed: 9, health: 100, restLineId: 'story.ember.moss.3', restartFrom: 'last-marker', restSeconds: 3,
    lentWeapon: 'flamethrower', giveUpLineId: GAS_RUN_LINES.giveUp, ambushes, raidLineId: GAS_RUN_LINES.raid, startLineId: lines.start,
    // How it ends decides the closing line: the furnace dead (the battle is won), or still rolling when she arrives.
    arrival: Object.freeze({battle: Object.freeze({furnaceId: FURNACE_ID, wonLineIds: Object.freeze([lines.won]), arrivedLineIds: Object.freeze([lines.arrived])})})});
  return Object.freeze({id: 'gas-run-boneyard-battle', storyId: 'everburn', run: true, battle: true, road: 'boneyard', name: 'Gas Run: The Battle', kind: 'escort',
    feud: 4, runs, difficulty, shares: FIELD_BATTLE.shares, arrivedShares: FIELD_BATTLE.arrivedShares,
    raids: Object.freeze(ambushes.map(item => Object.freeze({id: item.id, count: ambushRaiders(item, difficulty)}))),
    easy: Object.freeze({truckHealth: 100, raiderPressure: 'low', breakdownRecovery: 'one-rest-then-restart'}),
    steps: [step]});
}

export const isFieldBattle = job => isGasRun(job) && job.battle === true;
