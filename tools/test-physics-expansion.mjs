import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { Duel } from '../src/game.js';
import { App } from '../src/app.js';
import { CARS, COURSE, DRIVE, LIVES } from '../src/config.js';
import { DRIVERS, driverModifierSignature } from '../src/drivers.js';
import {bestKey} from '../src/progression.js';

let checks = 0;
const check = (condition, label) => { assert.ok(condition, label); checks++; };
const same = (actual, expected, label) => { assert.deepEqual(actual, expected, label); checks++; };
const memory = new Map(); globalThis.localStorage = { getItem: k => memory.get(k) ?? null, setItem: (k, v) => memory.set(k, String(v)) };
const dt = 1 / 120;
function fixture({ heading = 0, height = () => 0, airborne = false } = {}, d = new Duel({ seed: 1989 })) {
  const c = Math.cos(heading), sn = Math.sin(heading);
  const point = (s, lateral = 0) => ({ x: c * lateral + sn * s, z: -sn * lateral + c * s, y: height(s), heading, curvature: 0 });
  d.course = { def: { id: 'physics-fixture', kind: 'circuit', theme: 'desert', airborne }, closed: false, length: 1000, raceLength: 2000,
    features: { obstacles: [], flocks: [], shortcuts: [], radarTraps: [], ramps: [], crushables: [] },
    at: s => point(s), worldAt: point, groundAt: point, phase: s => s, themeAt: () => 'desert', roadHalfWidthAt: () => 7,
    surfaceAt: (_, lateral) => ({ road: Math.abs(lateral) <= 7, mainRoad: Math.abs(lateral) <= 7, roadHalfWidth: 7 }),
    nearest: (x, z) => ({ s: sn * x + c * z, lateral: c * x - sn * z }),
    obstaclesNear: () => d.course.features.obstacles, nearestRadar: () => null };
  d._lapGates = [250, 500, 750]; d._obstacleQueryCache = new Map(); d._obstacleArray = d.course.features.obstacles;
  Object.assign(d.state, { status: 'racing', s: 20, prevS: 20, lateral: 0, prevLateral: 0, lapsTotal: 2, rival: null, traffic: [] });
  return d;
}

function wallHit({ angle, heading = 0, flag = 'tunnelWall', speed = 150, side = 1, push = 0 }) {
  const d = fixture({ heading }), s = d.state, theta = angle * Math.PI / 180, p = d.course.worldAt(100, side * 10);
  const wall = { id: 'solid', kind: flag === 'barrier' ? 'prop' : 'building', shape: 'box', s: 100, off: side * 10,
    ...p, halfX: .2, halfZ: 100, height: 8 };
  if (flag) wall[flag] = true;
  if (flag === 'arenaWall') wall.barrier = true; // Production arena walls also carry the general barrier flag.
  d.course.features.obstacles.push(wall);
  Object.assign(s, { prevS: 100, s: 100 + (angle === 90 ? 0 : 8 / Math.tan(theta)), prevLateral: side * 4, lateral: side * 12,
    speedMph: speed, headingError: side * theta - (speed < 0 ? Math.PI : 0), pushVelocity: side * push });
  const before = s.speedMph; d._staticContacts(s, true);
  return { d, s, before };
}

for (const flag of ['tunnelWall', 'barrier']) for (const angle of [10, 20, 34.99, 35, 55, 90]) for (const heading of [0, .7]) for (const side of [-1, 1]) {
  const { s, before } = wallHit({ flag, angle, heading, side });
  check(Math.abs(s.speedMph) < before, 'every solid contact scrubs speed');
  check(Math.abs(s.lateral) < 10, 'the vehicle remains on the approach side of the wall');
  if (angle < 35) {
    same([s.lives, s.stageCrashes, s.majorCrashes, s.impactTimer, s.racePenaltySec], [LIVES.start, 0, 0, 0, 0], 'sub-35-degree wall incidence cannot create a crash or penalty');
    check(s.s > 100 && s.speedMph > 0, 'glancing contact retains forward tangent travel');
    check(Object.values(s.damageZones).some(value => value > 0), 'a glancing wall hit can still scrape a panel');
  } else {
    same(s.stageCrashes, 1, '35 degrees and sharper retain the speed-dependent crash rule');
    same(s.lives, LIVES.start - 1, 'a sharp high-speed hit consumes one crash slot');
  }
}
for (const flag of [null, 'signSupport', 'arenaWall']) {
  const { s } = wallHit({ flag, angle: 20 }); same(s.stageCrashes, 1, 'unmarked buildings/posts/arena solids do not inherit guardrail forgiveness');
}
for (const kind of ['rock', 'tree', 'prop']) {
  const d = fixture(), s = d.state;
  d.course.features.obstacles.push({ ...d.course.worldAt(110), id: kind, kind, theme: 'alpine', s: 110, halfX: 2, halfZ: 1, height: 8 });
  Object.assign(s, { prevS: 100, s: 115, speedMph: 100 }); d._staticContacts(s, true);
  same(s.stageCrashes, 1, `${kind} remains an ordinary high-speed solid impact`);
}
{
  const { s } = wallHit({ angle: 20, push: 40 }); same(s.stageCrashes, 1, 'a strong inward side shove cannot disguise a sharp impact as shallow body heading');
  const reverse = wallHit({ angle: 20, speed: -22 }).s;
  check(reverse.speedMph < 0 && reverse.speedMph > -22 && reverse.stageCrashes === 0, 'reverse glances retain signed speed and existing low-speed safety');
  const slow = wallHit({ angle: 60, speed: 20 }).s; same(slow.stageCrashes, 0, 'sharp low-speed contact remains a scrape, not an unconditional crash');
}
{
  const d = fixture(), s = d.state;
  d.course.features.obstacles.push({ ...d.course.worldAt(100), id: 'rail-end', kind: 'prop', barrier: true, s: 100, halfX: .2, halfZ: 4, height: 1.1 });
  Object.assign(s, { prevS: 90, s: 102, speedMph: 100 }); d._staticContacts(s, true);
  same(s.stageCrashes, 1, 'striking a rail end is measured against the end face and remains head-on');
}

// A smooth 12 m hill has at most a 24.5% grade. Gravity, not a ramp trigger or
// injected vertical impulse, determines whether the car leaves its crest.
const hill = s => 12 * Math.exp(-(((s - 120) / 42) ** 2));
function traceHill(speed, options = {}) {
  const d = fixture({ height: hill, airborne: true, ...options }), s = d.state;
  s.speedMph = speed; let peak = 0, launches = 0, landings = 0, wasAir = false;
  while (s.s < 300) {
    s.prevS = s.s; s.prevLateral = s.lateral; s.prevAirHeight = s.airHeight;
    s.s += speed * DRIVE.mphToWorld * dt; d._jump(s, dt);
    check([s.airHeight, s._jumpY ?? 0, s._verticalSpeed ?? 0].every(Number.isFinite), 'crest states stay finite');
    check(s.airHeight >= 0, 'flight height never penetrates below terrain');
    if (s.airborne && !wasAir) launches++; if (!s.airborne && wasAir) landings++;
    peak = Math.max(peak, s.airHeight); wasAir = s.airborne;
  }
  return { d, s, peak, launches, landings };
}
const slow = traceHill(30), fast = traceHill(150), disabled = traceHill(150, { airborne: false });
same([slow.peak, slow.launches], [0, 0], 'a slow car remains grounded over the same crest');
check(fast.peak > 1 && fast.launches === 1 && fast.landings === 1 && !fast.s.airborne, 'fast driving produces one natural launch and grounded landing');
same([fast.s.jumps, fast.s.jumpScore, fast.s.score, fast.s.collectedJumps], [0, 0, 0, []], 'natural road jumps never farm arena objectives or points');
same([disabled.peak, disabled.launches], [0, 0], 'unmarked legacy road courses keep their original grounded behavior');
for (const height of [() => 0, s => s * .24, s => -s * .24, s => .00006 * s * s]) {
  const run = traceHill(150, { height }); same(run.launches, 0, 'flat roads, constant grades and concave terrain do not falsely launch');
}
{
  const run = traceHill(150, { height: s => hill(s) - s * .25 });
  same([run.launches, run.landings, run.s.airborne], [1, 1, false], 'a descending convex crest can launch and rejoin the downhill tangent without a false second hop');
  check(run.peak > 1, 'natural downhill flight does not require a scripted upward impulse');
}

// Exercise the real shared height/ground model, not just the analytic fixture.
// Linear interpolation of its old 8 m samples produced 2–4 tiny false hops
// per crest at 30 mph. Expansion roads now evaluate their authored height.
const actualCrests = [];
for (const def of COURSE.filter(course => course.expansion && course.airborne === true)) {
  const d = new Duel({ seed: 1989 }); d.startCampaign({ startStage: COURSE.indexOf(def), mode: 'timetrial' });
  for (const [center, span] of def.expansion.crests) for (const speed of [30, 70, 150]) {
    const actor = { s: center * def.lengthU - span - 15, lateral: 0, speedMph: speed };
    let launches = 0, landings = 0, peak = 0, wasAir = false;
    while (actor.s < center * def.lengthU + span + 160) {
      actor.prevS = actor.s; actor.s += speed * DRIVE.mphToWorld * dt; d._jump(actor, dt);
      if (actor.airborne && !wasAir) launches++;
      if (!actor.airborne && wasAir) landings++;
      peak = Math.max(peak, actor.airHeight || 0); wasAir = actor.airborne;
    }
    const label = `${def.id} crest ${center} at ${speed} mph`;
    if (speed <= 70) same([launches, landings, peak], [0, 0, 0], `${label}: ordinary low-speed driving stays grounded`);
    else {
      same([launches, landings, actor.airborne], [1, 1, false], `${label}: exactly one natural launch and landing`);
      check(peak > 1 && peak < 10, `${label}: bounded visible flight height`);
      actualCrests.push({ course: def.id, center, peak: +peak.toFixed(3) });
    }
    same([d.state.jumps, d.state.jumpScore, d.state.score], [0, 0, 0], `${label}: no arena objectives or rewards`);
  }
}
same(actualCrests.length, 7, 'all seven authored crests across the six new circuits are covered');
{
  const d = fixture({ height: hill, airborne: true }), s = d.state;
  Object.assign(s, { s: 150, prevS: 149.5, speedMph: 100, airborne: true, airHeight: 3, prevAirHeight: 3,
    _jumpY: hill(150) + 3, _verticalSpeed: -2, _jumpOrigin: { s: 100, rampId: 'ramp-0', lap: 1, world: d.course.worldAt(100) } });
  s.paused = true; const frozen = JSON.stringify(s); d.step(.5); same(JSON.stringify(s), frozen, 'pause freezes an active road flight'); s.paused = false;
  d._safeReset(s); same([s.airborne, s.airHeight, s.prevAirHeight, s._jumpY, s._verticalSpeed, s._jumpOrigin], [false, 0, 0, null, 0, null], 'recovery clears every flight field and stale scoring origin');
  d._jump(s, dt); same([s.jumps, s.jumpScore, s.airHeight], [0, 0, 0], 'a reset cannot manufacture a flight or reward');
  Object.assign(s, { airborne: true, _jumpY: hill(s.s) - .1, _verticalSpeed: -1, _jumpOrigin: { s: s.s - 50, rampId: 'ramp-0', lap: 1, world: d.course.worldAt(s.s - 50) } });
  d._jump(s, dt); same(s.jumps, 0, 'even an old arena origin cannot reward a natural-course landing');
}
for (const kind of ['traffic', 'rival', 'police']) {
  const d = fixture({ height: hill, airborne: true }), s = d.state;
  Object.assign(s, { s: 950, prevS: 950, lateral: 3.4, prevLateral: 3.4 });
  const actor = { alive: true, active: true, dir: 1, s: 20, prevS: 20, lateral: -3.4, prevLateral: -3.4,
    speedMph: 150, headingError: 0, pushVelocity: 0, completedLaps: 0, nextLapGate: 0, lapTimes: [], lapStartedAt: 0, finished: false };
  if (kind === 'traffic') s.traffic = [actor]; if (kind === 'rival') s.rival = actor; if (kind === 'police') s.police.pursuit = actor;
  let peak = 0;
  for (let i = 0; i < 2000 && actor.s < 330; i++) {
    if (kind === 'traffic') d._traffic(dt); else if (kind === 'rival') d._rival(dt); else d._movePolice(actor, dt);
    peak = Math.max(peak, actor.airHeight || 0);
  }
  check(peak > .1 && !actor.airborne && actor.s >= 330, `${kind} uses natural flight and lands through its actual movement path`);
  same(s.jumps, 0, 'NPC flight awards no player jump objectives');
}

const runs = [];
for (const fps of [30, 144]) {
  const app = new App(), d = fixture({ height: hill, airborne: true }, app.duel), s = d.state;
  Object.assign(s, { speedMph: 150, gear: 4 }); app.keys.KeyW = true;
  const hash = createHash('sha256'), step = d.step; let peak = 0, steps = 0;
  d.step = function (slice) { const value = step.call(this, slice); peak = Math.max(peak, s.airHeight); steps++;
    hash.update(JSON.stringify([s.s, s.lateral, s.speedMph, s.airHeight, s.airborne, s._jumpY, s._verticalSpeed, s.stageTimeSec]) + '\n'); return value; };
  for (let i = 0; i < fps * 6; i++) app.advance(1 / fps, 1 / fps);
  check(peak > 1 && !s.airborne, 'ordinary App throttle input launches and lands without injected vertical motion');
  runs.push({ steps, peak, hash: hash.digest('hex') });
}
same(runs[0], runs[1], '30/144 FPS produce bit-identical fixed-step road flight');

{
  const d = fixture(), neutral = d.car;
  const comparison=()=>bestKey({stageIndex:0,seed:d.state.seed,laps:2,car:d.state.car,
    mode:d.state.mode,difficulty:d.state.difficulty,cpuDifficulty:d.state.cpuDifficulty,driverId:d.state.driverId});
  const neutralKey=comparison();
  check(d.car === neutral, 'same driver and upgrades reuse the car-stat cache');
  d.state.driverId = 'mara_vale'; const enhanced = d.car;
  same(enhanced.grip, neutral.grip * 1.05, 'matching specialist applies after the ordinary upgraded stats');
  check(comparison().endsWith(`|driver:${driverModifierSignature('mara_vale', d.state.car)}`), 'enhanced per-player bests use the actual modifier signature');
  same(d._vehicleSpec(d.state).halfWidth, 1.02, 'specialists never widen the collision shell');
  d.state.driverId = 'iko_ren'; same(d.car, neutral, 'off-class specialist stats remain exactly neutral');
  same(comparison(), neutralKey, 'off-class specialists share the neutral timing key');
  d.state.driverId = 'unknown'; same(d.car, neutral, 'unknown driver fails to neutral stats');
  same(comparison(), neutralKey, 'unknown driver cannot forge an enhanced record class');
  for (const driver of Object.values(DRIVERS).filter(driver => driver.cars.length)) {
    d.state.car = driver.cars[0]; d.state.driverId = 'club'; const base = d.car; d.state.driverId = driver.id;
    for (const [stat, multiplier] of Object.entries(driver.modifiers)) same(d.car[stat], base[stat] * multiplier, `${driver.id}: documented modifier applied once`);
    same(d.car.topSpeed, base.topSpeed, 'drivers preserve the neutral installed build top speed, including factory-max cars');
  }
}
console.log(`Physics expansion: ${checks} glancing-wall, solid-impact, natural-crest, NPC, reset, driver-cache and frame-rate checks passed; fixture peak ${fast.peak.toFixed(3)} m; real crest peaks ${actualCrests.map(crest => `${crest.course}:${crest.peak}`).join(', ')}.`);
