// The gas run (docs/board/cards/RUN-GAS.md): Big Bess drives from the Everburn well to Tin Town again and again, by the long
// road or by the Boneyard road. It is job 4's escort step with a road, a pay and raids that depend on the Ash Men's feud.
// World-job data only: the job engine and the job mode own every rule (raids: src/world/jobs/steps/escort.js).
import {makeRng} from '../../rng.js';
import {arenaReward} from '../../arena/arena-settlement.js';
import {ambushRaiders} from './steps/escort.js';

const place = (id, x, z, radius = 12) => Object.freeze({id, position: Object.freeze({x, y: 0, z}), radius});
const path = (...places) => Object.freeze(places);

const well = place('everburn', -424, 304, 18), tinTown = place('tin-town', 600, 0, 18);
const boneyard = place('boneyard', 424, 304, 18), safeRoad = place('safe-road', 230, 150, 16);

// The two roads. The long road is the card's table as it stands. The Boneyard road is the card's table with two bends added,
// because no move of a place by up to 25 m can make the card's straight pieces clear every solid by 8 m: one after the
// Boneyard, at (375, 325), takes the road round the south side of the planes' box (the piece from the Boneyard to the safe
// road crosses it); the other at Tin Town's gate, (575, 62), brings it in from the south of the town (the piece from the
// safe road to Tin Town brushes the town's box at its corner, 0.8 m).
export const GAS_RUN_PATHS = Object.freeze({
  long: path(well, place('long-road-1', -450, 40), place('long-road-2', -300, -230), place('long-road-3', -60, -380),
    place('long-road-4', 170, -340), place('long-road-5', 350, -200), place('long-road-6', 480, -90), tinTown),
  boneyard: path(well, place('boneyard-road-1', -200, 350), place('boneyard-road-2', 0, 370), place('boneyard-road-3', 250, 415),
    boneyard, place('boneyard-road-bend', 375, 325), safeRoad, place('tin-town-gate', 575, 62), tinTown),
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
  boneyard: Object.freeze([260, 480, 690, 895, 1060, 1260, 1430]),
  long: Object.freeze([Math.round(gasRunLength('long') - 110)]),
});

const ROAD_SALT = Object.freeze({long: 0x1f3a5c7d, boneyard: 0x6b8e2d41});
// `count` of the candidate places, drawn by the seeded generator from the run count, in the order along the road. The same run
// count always gives the same places. Each run is drawn after the run before it, and a draw that would repeat that run's
// places is drawn again, so two runs in a row with the same number of raids are never alike. The run count counts round
// every 4,096 runs, which keeps the work small.
const RUN_CYCLE = 4096;
function drawPlaces(road, count, runs) {
  const marks = GAS_RUN_AMBUSH_METRES[road];
  if (count <= 0) return [];
  const draw = seed => {
    const rng = makeRng(seed), order = marks.map((_, index) => index);
    for (let i = order.length - 1; i > 0; i--) { const j = rng.int(0, i); [order[i], order[j]] = [order[j], order[i]]; }
    return order.slice(0, count).sort((a, b) => a - b).map(index => marks[index]);
  };
  const seedOf = (n, attempt = 0) => (Math.imul(n + 1, 0x9e3779b1) ^ ROAD_SALT[road] ^ Math.imul(attempt, 0x85ebca6b)) >>> 0;
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
  hurt: 'story.ember.moss.9', warParty: 'story.ember.auntie-solder.9', hurtBelow: 70});

// The job definition of one run, from the road, the feud (1 to 4), the number of runs already arrived and the difficulty.
export function gasRunJob({road, feud = 2, runs = 0, difficulty = 'medium'} = {}) {
  if (!validRoad(road)) throw new RangeError(`There is no gas road called ${JSON.stringify(road)}.`);
  const route = GAS_RUN_PATHS[road], ambushes = Object.freeze(gasRunAmbushes(road, feud, runs));
  // Auntie Solder says her line once: when this arrival is the one that takes the feud to War party.
  const reachesWarParty = road === 'boneyard' && clampFeud(feud) === 3;
  const step = Object.freeze({kind: 'escort', what: `Keep Big Bess safe on the ${road === 'long' ? 'long road' : 'Boneyard road'} to Tin Town.`,
    actorId: 'big-bess',
    // No stand-in car: the Scablands scene draws Big Bess's own truck at this actor's spot, as in job 4.
    actor: Object.freeze({id: 'big-bess', renderCar: false, escort: true, health: 100, speed: 9, path: route}),
    path: route, destination: tinTown, speed: 9, health: 100, restLineId: 'story.ember.moss.3', restartFrom: 'last-marker', restSeconds: 3,
    ambushes, raidLineId: GAS_RUN_LINES.raid, startLineId: START_LINE[road],
    arrival: Object.freeze({wholeLineId: GAS_RUN_LINES.whole, hurtLineId: GAS_RUN_LINES.hurt, hurtBelow: GAS_RUN_LINES.hurtBelow,
      thenLineIds: reachesWarParty ? Object.freeze([GAS_RUN_LINES.warParty]) : Object.freeze([])})});
  return Object.freeze({id: `gas-run-${road}`, storyId: 'everburn', run: true, road, name: 'Gas Run', kind: 'escort',
    feud: clampFeud(feud), runs, difficulty, shares: GAS_RUN_SHARES[road],
    // What the child-pace Easy rule gives: the raids' raiders, one fewer on Easy (never fewer than one).
    raids: Object.freeze(ambushes.map(item => Object.freeze({id: item.id, count: ambushRaiders(item, difficulty)}))),
    easy: Object.freeze({truckHealth: 100, raiderPressure: 'low', breakdownRecovery: 'one-rest-then-restart'}),
    steps: [step]});
}

export const isGasRun = job => job?.run === true && job?.storyId === 'everburn' && validRoad(job.road);
