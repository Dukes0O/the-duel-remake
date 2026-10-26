// The five Summit Run ski zones (docs/HELI_SKIING.md section 5), as recipes.
// A zone is data and a snow function: no height file is stored.
//
//   {id, kind, name, pad, drop: {x, z, y}, pickup: {x, z, y, radius},
//    ground(x, z), gates, start, finish, line, stashes, bounds, world,
//    extraFriction?, safePathAngle?, scoring}
//
// The zone's own frame: the drop pad is the origin (x 0, z 0), the run falls
// toward +z, +x is the skier's left. drop.y and every height are metres above
// the sea. Drop pads use SKI_ALTITUDES; run finishes retain their authored
// altitude independently of the helicopter pickup. `world` is where the helicopter lands for it in the Summit Run
// world: the clear, level 12 m circle (SUMMIT_PADS), with its ground height
// there; the zone's top meets it, and a zone is drawn at the pad's x and z.
// The zone's `ground`, `gates`, `line`, `stashes` and the rest are in the zone
// frame; add world.x and world.z to place them in the world.
//
// How long and how far: slalom 450 m long, 180 m drop, 33 gates; giant
// slalom 1,100 m, 350 m, 40 gates; moguls 250 m at 28 degrees; aerials one
// kicker (a 64 degree face, taking off at about 50 degrees) onto a 37 degree hill; powder the north bowl from
// the summit, down to the pickup altitude. "Long" is measured along z (horizontally).
import {SKI} from '../ski-physics.js';
import {fallLine, fitDrop, bump, distanceToLine, gateAt, freezeDeep} from './recipe.js';
import {guideRun} from '../ski-guide.js';
import {medalTimes, SCORE} from '../ski-score.js';

const DEG = Math.PI / 180;
const smooth = t => { const k = Math.min(1, Math.max(0, t)); return k * k * (3 - 2 * k); };

// One world (SKI-RUNS question 2, answered 24 October 2026): the pads sit at
// the Summit Run world's real heights, and a flight there reads its altitude
// the way every Summit flight does, the course's 2,860 m base plus the height
// above the start (heli-jobs SUMMIT_RUN.baseAltitude; heli-session
// altitudeOffset), so the air the skier meets is the air the helicopter flew.
export const SUMMIT_BASE_ALTITUDE = 2860;
export const SUMMIT_START_Y = 14;
export const altitudeOf = worldY => SUMMIT_BASE_ALTITUDE + worldY - SUMMIT_START_Y;

// Three landing circles in the Summit Run world (course frame, seed 1989):
// the highest clear level 12 m circle (the summit hut yard), one 348 m lower
// (the packet's 342 m between the pads, as near as the world has), and the
// first clear snowy circle below Devils Playground (s 7,320 m, lateral 30 m).
// tools/test-ski-runs.mjs checks that each is clear, level within 1.5 m and at
// its ground height.
export const SUMMIT_PADS = Object.freeze({
  summit: Object.freeze({x: 3104.9, z: 6904, y: 739.7}),
  devils: Object.freeze({x: 2325.3, z: 3256.8, y: 391.5}),
  pickup: Object.freeze({x: 2209.730919995219, z: 3298.7784077971646, y: 387.1064288481216}),
});

// The altitudes of the three pads, metres above the sea.
export const SKI_ALTITUDES = Object.freeze({
  summit: altitudeOf(SUMMIT_PADS.summit.y), devils: altitudeOf(SUMMIT_PADS.devils.y), pickup: altitudeOf(SUMMIT_PADS.pickup.y),
});

// Moving the helicopter pickup must not reshape runs or change medal times.
// The zones have their own snow frame; retain their original finish altitude.
export const SKI_RUN_PICKUP_ALTITUDE = 2886;

const PICKUP_RADIUS = 12;
const worldPad = name => Object.freeze({pad: name, ...SUMMIT_PADS[name]});

// A fall line from keyframes; the part inside `length` is fitted to `drop`
// and the run-out after it is added unfitted.
function slope(keys, length, drop, runOut, end) {
  const fitted = fitDrop(keys, length, drop);
  return fallLine([...fitted, ...runOut], {length: end});
}

function finish(zone) {
  zone.drop = {x: 0, z: 0, y: zone.ground(0, 0)};
  zone.pickup = {...zone.pickup, y: zone.ground(zone.pickup.x, zone.pickup.z), radius: PICKUP_RADIUS};
  zone.world = worldPad(zone.pad);
  return freezeDeep(zone);
}

// ---- Slalom: 450 m, 180 m drop, 33 gates of red and blue poles ----------------
function slalom() {
  const top = SKI_ALTITUDES.devils;
  const fall = slope([{z: 0, angle: 14}, {z: 30, angle: 14}, {z: 60, angle: 25}, {z: 420, angle: 25}, {z: 450, angle: 18}],
    450, 180, [{z: 480, angle: 6}, {z: 520, angle: 6}], 520);
  const gates = [];
  for (let i = 0; i < 33; i++) gates.push(gateAt(30 + i * 13, i % 2 ? 1.2 : -1.2, 5, i % 2 ? 'blue' : 'red'));
  const start = gateAt(12, 0, 12, 'start'), end = gateAt(450, 0, 20, 'finish');
  return finish({
    id: 'slalom', kind: 'slalom', name: 'Slalom', pad: 'devils',
    ground: (x, z) => top - fall(z),
    start, finish: end, gates,
    line: [{x: 0, z: 0}, {x: 0, z: 12}, ...gates.map(g => ({x: g.centre, z: g.left.z})), {x: 0, z: 462}],
    stashes: [], bounds: {minX: -40, maxX: 40, minZ: -20, maxZ: 520},
    pickup: {x: 0, z: 485}, scoring: {kind: 'timed'},
  });
}

// ---- Giant slalom: 1,100 m, 350 m drop, 40 wider gates with panels ---------------
function giantSlalom() {
  const top = SKI_ALTITUDES.devils;
  const fall = slope([{z: 0, angle: 12}, {z: 40, angle: 12}, {z: 120, angle: 22}, {z: 520, angle: 19}, {z: 900, angle: 18}, {z: 1100, angle: 14}],
    1100, 350, [{z: 1130, angle: 6}, {z: 1170, angle: 6}], 1170);
  const gates = [];
  for (let i = 0; i < 40; i++) gates.push(gateAt(50 + i * 26, i % 2 ? 6 : -6, 8, i % 2 ? 'blue' : 'red'));
  const start = gateAt(15, 0, 16, 'start'), end = gateAt(1100, 0, 16, 'finish');
  return finish({
    id: 'gs', kind: 'gs', name: 'Giant slalom', pad: 'devils',
    ground: (x, z) => top - fall(z),
    start, finish: end, gates,
    line: [{x: 0, z: 0}, {x: 0, z: 15}, ...gates.map(g => ({x: g.centre, z: g.left.z})), {x: 0, z: 1112}],
    stashes: [], bounds: {minX: -60, maxX: 60, minZ: -20, maxZ: 1170},
    pickup: {x: 0, z: 1140}, scoring: {kind: 'timed', bronzeSlower: 0.25},
  });
}

// ---- Moguls: 250 m at 28 degrees, bumps every 3.5 to 4 m in two lines, two kickers
const MOGUL_LINES = Object.freeze({x: 2.8, from: 25, to: 240, gaps: [3.5, 4], radius: 1.6, height: 0.4});
const MOGUL_KICKERS = Object.freeze([96, 180]);
const MOGUL_WEAVE = Object.freeze({amplitude: 1, wavelength: 24});
function moguls() {
  const top = SKI_ALTITUDES.devils;
  const fall = fallLine([{z: 0, angle: 14}, {z: 20, angle: 28}, {z: 250, angle: 28}, {z: 285, angle: 6}, {z: 320, angle: 6}], {length: 320});
  // Bump centres: two staggered lines, spacing alternating 3.5 and 4 m.
  const bumps = [];
  for (const [side, offset] of [[1, 0], [-1, 1.9]]) {
    for (let z = MOGUL_LINES.from + offset, i = 0; z <= MOGUL_LINES.to; i++) {
      if (MOGUL_KICKERS.every(k => Math.abs(z - k) > 5)) bumps.push({x: side * MOGUL_LINES.x, z});
      z += MOGUL_LINES.gaps[i % 2];
    }
  }
  // A kicker: a 0.8 m rise over 3.5 m, then the snow falls away at once.
  const kicker = (x, z) => {
    let h = 0;
    for (const k of MOGUL_KICKERS) {
      const across = smooth(1 - Math.abs(x) / 2.4);
      const along = z < k - 3.5 ? 0 : z <= k ? smooth((z - (k - 3.5)) / 3.5) : 1 - smooth((z - k) / 1.2);
      h += 0.8 * across * along;
    }
    return h;
  };
  const line = [];
  for (let z = 0; z <= 250; z += 5) {
    const ease = smooth((z - 20) / 20) * smooth((250 - z) / 20);
    line.push({x: MOGUL_WEAVE.amplitude * ease * Math.sin(2 * Math.PI * z / MOGUL_WEAVE.wavelength), z});
  }
  return finish({
    id: 'moguls', kind: 'moguls', name: 'Moguls', pad: 'devils',
    ground: (x, z) => {
      let h = top - fall(z) + kicker(x, z);
      for (const b of bumps) if (Math.abs(b.z - z) < MOGUL_LINES.radius && Math.abs(b.x - x) < MOGUL_LINES.radius) h += bump(x, z, b.x, b.z, MOGUL_LINES.radius, MOGUL_LINES.height);
      return h;
    },
    start: gateAt(8, 0, 18, 'start'), finish: gateAt(250, 0, 18, 'finish'), gates: [],
    line, bumps, kickers: MOGUL_KICKERS.map(z => ({x: 0, z})), stashes: [],
    bounds: {minX: -45, maxX: 45, minZ: -10, maxZ: 320},
    pickup: {x: 0, z: 295},
    // The guide reaches further ahead at the speed of the bumps.
    guide: {lookAheadMin: 5, lookAheadPerSpeed: 0.2, lookAheadMax: 12},
    scoring: {kind: 'judged', turnsPlanned: 17, jumps: 2, medals: {bronze: 30, silver: 50, gold: 70}},
  });
}

// ---- Aerials: one kicker (a 64 degree face, taking off at about 50) onto a 37 degree landing hill ------------
// Above the pickup: the helicopter lands at the pickup circle's world pad.
// The landing hill is judged against a 40 degree window (approved by Claude,
// 24 October 2026; every other zone keeps the ski rules' 20).
const AERIALS = Object.freeze({inrun: 40, inrunAngle: 22, ramp: 14, face: -64, ease: 2, hill: 37, hillLength: 70, runOut: 30});
function aerials() {
  const a = AERIALS;
  const lip = a.inrun + a.ramp + a.ease, hillEnd = lip + a.hillLength;
  const fall = fallLine([{z: 0, angle: a.inrunAngle}, {z: a.inrun, angle: a.inrunAngle}, {z: a.inrun + a.ramp, angle: a.face},
    {z: lip, angle: a.hill}, {z: hillEnd, angle: a.hill}, {z: hillEnd + a.runOut, angle: 6}, {z: hillEnd + a.runOut + 30, angle: 6}],
  {length: hillEnd + a.runOut + 30});
  const total = fall(hillEnd + a.runOut);
  const top = SKI_RUN_PICKUP_ALTITUDE + total;
  return finish({
    id: 'aerials', kind: 'aerials', name: 'Aerials', pad: 'pickup',
    ground: (x, z) => top - fall(z),
    start: gateAt(6, 0, 12, 'start'), finish: gateAt(hillEnd, 0, 16, 'finish'), gates: [],
    line: [{x: 0, z: 0}, {x: 0, z: hillEnd + 10}], kickers: [{x: 0, z: lip}],
    stashes: [], bounds: {minX: -30, maxX: 30, minZ: -10, maxZ: hillEnd + a.runOut + 30},
    pickup: {x: 0, z: hillEnd + a.runOut},
    safePathAngle: 40,
    scoring: {kind: 'judged', height: 6, distance: 14, rotations: 1, axis: 'spin'},
  });
}

// ---- Powder: the north bowl, no course ------------------------------------------------
const POWDER = Object.freeze({length: 1300, drop: SKI_ALTITUDES.summit - SKI_RUN_PICKUP_ALTITUDE, bowl: 0.004, bowlLimit: 140, packedFriction: 0.12,
  stashRadius: 9, packedWidth: 3, packedBlend: 2});
function powder() {
  const top = SKI_ALTITUDES.summit;
  const p = POWDER;
  const fall = slope([{z: 0, angle: 34}, {z: 150, angle: 34}, {z: 300, angle: 26}, {z: 900, angle: 26}, {z: 1100, angle: 13}, {z: 1300, angle: 13}],
    p.length, p.drop, [{z: 1340, angle: 8}, {z: 1440, angle: 8}], 1440);
  const line = [{x: 0, z: 0}, {x: -10, z: 200}, {x: 12, z: 420}, {x: -16, z: 650}, {x: 8, z: 880}, {x: 0, z: 1100}, {x: 0, z: 1380}];
  // Deep snow off the packed line: the total friction there is 0.12.
  const deep = p.packedFriction - SKI.snowFriction;
  return finish({
    id: 'powder', kind: 'powder', name: 'Powder', pad: 'summit',
    ground: (x, z) => top - fall(z) + p.bowl * Math.min(Math.abs(x), p.bowlLimit) ** 2,
    extraFriction: (x, z) => deep * smooth((distanceToLine(line, x, z) - p.packedWidth) / p.packedBlend),
    start: null, finish: null, gates: [], line, packed: [line],
    stashes: [{id: 'north-shelf', x: 58, z: 420, radius: p.stashRadius}, {id: 'ridge-pocket', x: -66, z: 830, radius: p.stashRadius},
      {id: 'lower-meadow', x: 52, z: 1130, radius: p.stashRadius}],
    bounds: {minX: -160, maxX: 160, minZ: -20, maxZ: 1440},
    pickup: {x: 0, z: 1380},
    scoring: {kind: 'free'},
  });
}

const builders = {slalom, gs: giantSlalom, moguls, aerials, powder};
const cache = new Map();

// A zone by id (slalom, gs, moguls, aerials, powder). Built once; the same
// object every time.
export function skiZone(id) {
  if (!Object.hasOwn(builders, id)) throw new Error(`Unknown ski run: ${id}`);
  if (!cache.has(id)) cache.set(id, builders[id]());
  return cache.get(id);
}

export const SKI_RUN_IDS = Object.freeze(Object.keys(builders));
export const MOGUL_SHAPE = Object.freeze({lines: MOGUL_LINES, kickers: MOGUL_KICKERS, weave: MOGUL_WEAVE});
export const AERIALS_SHAPE = AERIALS;
export const POWDER_SHAPE = POWDER;

// The guide's run on a zone's planned line (built once, cached): its time sets
// the medal times and its ghost is the player's rival. Powder has no guide.
const guides = new Map();
export function zoneGuide(id) {
  const zone = skiZone(id);
  if (zone.scoring.kind === 'free') return null;
  if (!guides.has(id)) guides.set(id, guideRun({line: zone.line, world: zone, ...(zone.guide ? {lookAhead: zone.guide} : {})}));
  return guides.get(id);
}

// SKI-FINISH: measured keyboard times, including the unchanged missed-gate penalties.
// Casual bronze is steady +10%, gold practice -1%; Pro uses its practised baseline.
const SLALOM_MEDALS = freezeDeep({
  casual: {gold: 19.54, silver: 28.71, bronze: 37.88},
  pro: {gold: 30.29, silver: 31.97, bronze: 33.65},
});

// What earns a medal on a zone: times for the timed runs, points for the
// judged ones, nothing for powder.
export function medalLimits(id, difficulty = 'pro') {
  const zone = skiZone(id);
  if (id === 'slalom') return {kind: 'time', ...SLALOM_MEDALS[difficulty === 'casual' ? 'casual' : 'pro']};
  if (zone.scoring.kind === 'timed') {
    const times = medalTimes(zoneGuide(id).time);
    if (zone.scoring.bronzeSlower !== undefined) times.bronze = times.gold * (1 + zone.scoring.bronzeSlower);
    return {kind: 'time', ...times};
  }
  if (zone.scoring.kind === 'judged') return {kind: 'points', ...(zone.scoring.medals ?? SCORE.judgedMedals)};
  return null;
}

// The config createJudgedRun wants for a judged zone (moguls take the guide's
// time for the speed share).
export function judgedConfig(id) {
  const zone = skiZone(id);
  if (zone.scoring.kind !== 'judged') throw new Error(`Not a judged run: ${id}`);
  const {kind, ...config} = zone.scoring;
  return id === 'moguls' ? {...config, guideTime: zoneGuide(id).time} : {...config};
}

// The powder stash the skier is in, or null.
export function stashAt(id, x, z) {
  return skiZone(id).stashes.find(stash => Math.hypot(x - stash.x, z - stash.z) <= stash.radius)?.id ?? null;
}

// Is the skier inside the pickup circle?
export function atPickup(id, x, z) {
  const {pickup} = skiZone(id);
  return Math.hypot(x - pickup.x, z - pickup.z) <= pickup.radius;
}
