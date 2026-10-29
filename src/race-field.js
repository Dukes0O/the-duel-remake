import {snowmanResult} from './snowmen.js';
import {yetiResult} from './yeti.js';
export {GRAND_PRIX_COURSES, grandPrixCourse} from './grand-prix-career.js';
// Racing a full field (docs/CIRCUITS.md 3.2, card P4-FIELD): who the computer
// racers are, how the grid is laid out, the five-light start, who is in front,
// the slipstream and the finishing order. Everything here is repeatable from
// the seed and the inputs and runs without graphics. The per-step driving of
// each racer lives in race-field-driver.js.
import {normalizeTyre} from './race-surfaces.js';
import { CARS, DRIVE } from './config.js';
import { applyDriverModifiers } from './drivers.js';
import { upgradedCar } from './progression.js';
import { makeRng } from './rng.js';
import { clamp, freshDamageZones } from './sim-common.js';
import { racingLineFor, buildSpeedProfile } from './race-lines.js';

const MPH = DRIVE.mphToWorld;

export const FIELD = Object.freeze({
  maxRacers: 7,        // computer racers; with you that is eight cars
  laps: 3,
  rowGap: 8,           // metres between rows on the grid
  stagger: 4,          // the right-hand car sits this far behind its row
  gridLateral: 2.6,    // metres either side of the road centre
  firstRow: -6,        // centre of the front row, behind the line
  lights: 5,           // red lights, one a second
  lightSec: 1,
  holdMin: .4,         // seconds the five lights stay on before they go out
  holdMax: 1.2,
  carWindow: .1,       // computer cars are within 10% of your performance index
  towRange: 30,        // metres behind another car
  towSide: 2.5,        // metres to the side
  towTopSpeed: .05,    // +5% top speed at full tow
  towAccel: .12,       // and a little more push
  carPaceShare: 1,      // how much of a car's edge over or under yours shows in its racer's pace
  towBuildSec: .8,     // seconds of following to build a full tow
  towFadeSec: .4,
  finalLapCall: 'FINAL LAP',
  coolDownMph: 55,
});

// What each difficulty asks of the field. `pace` is how close to the car's
// limit the racers drive; the spread is a small seeded difference per racer.
export const FIELD_TUNING = Object.freeze({
  easy:   Object.freeze({ pace: .842, spread: .02, form: .022, mistakes: .1, leaderMistakes: 2.5, catchUp: .04, playerSlot: 4,
    cars: 'slower', reaction: [.32, .6], aggression: .8 }),
  medium: Object.freeze({ pace: .893, spread: .015, form: .02, mistakes: .05, leaderMistakes: 1, catchUp: .02, playerSlot: 5,
    cars: 'all', reaction: [.22, .45], aggression: 1 }),
  hard:   Object.freeze({ pace: .882, spread: .012, form: .016, mistakes: 0, leaderMistakes: 1, catchUp: 0, playerSlot: 7,
    cars: 'faster', reaction: [.15, .32], aggression: 1.15 }),
});
export const CATCH_UP_GAP_SEC = 8;
// How much a racer eases off when it is `leadSec` seconds ahead of you: nothing
// within 8 s, then the difficulty's share (Hard none) over the next two seconds.
export function catchUpFactor(tuning, leadSec) {
  return 1 - tuning.catchUp * clamp((leadSec - CATCH_UP_GAP_SEC) / 2, 0, 1);
}

// The computer racers. Traits are numbers the driver reads; see the table in
// docs/CIRCUITS.md 3.2 for the character each one stands for.
const trait = (extra = {}) => ({ skill: 1, brake: .86, slowCorners: 0, topSpeed: 0, tow: 1, consistency: .75,
  aggression: .5, defend: .25, start: 0, firstLap: .15, looseGrip: 1, ...extra });
export const RACERS = Object.freeze([
  Object.freeze({ id: 'axel_storm', driverId: 'axel_storm', name: 'Axel Storm', hardOnly: true, paint: { color: 0x1d1d22, accent: 0xd1a93a },
    traits: trait({ skill: 1.02, brake: .95, consistency: 1, aggression: .7, defend: .55, start: .03 }) }),
  Object.freeze({ id: 'mara_vale', driverId: 'mara_vale', name: 'Mara Vale', paint: { color: 0x2f7d57, accent: 0xe8e2c8 },
    traits: trait({ skill: .99, brake: 1, slowCorners: .08, consistency: .8, aggression: .55, defend: .3 }) }),
  Object.freeze({ id: 'iko_ren', driverId: 'iko_ren', name: 'Iko Ren', paint: { color: 0x6f93b8, accent: 0x1b2a3a },
    traits: trait({ skill: .99, consistency: .97, aggression: .35, defend: .25 }) }),
  Object.freeze({ id: 'sana_marlow', driverId: 'sana_marlow', name: 'Sana Marlow', paint: { color: 0xd9741a, accent: 0x20242a },
    traits: trait({ skill: .985, topSpeed: .03, tow: 1.5, consistency: .8, aggression: .5, defend: .25 }) }),
  Object.freeze({ id: 'jules_reyes', driverId: 'jules_reyes', name: 'Jules Reyes', paint: { color: 0xe3c321, accent: 0x20242a },
    traits: trait({ skill: .985, consistency: .62, aggression: .95, defend: .3, start: .12, firstLap: .5 }) }),
  Object.freeze({ id: 'nia_frost', driverId: 'nia_frost', name: 'Nia Frost', paint: { color: 0x2fa6a0, accent: 0xf0f0e6 },
    traits: trait({ skill: .98, consistency: .85, aggression: .5, defend: .25, looseGrip: 1.06 }) }),
  Object.freeze({ id: 'boone_ward', driverId: 'boone_ward', name: 'Boone Ward', paint: { color: 0x6a45a0, accent: 0xd8d8cc },
    traits: trait({ skill: .98, consistency: .72, aggression: .45, defend: .95 }) }),
  Object.freeze({ id: 'club', driverId: 'club', name: 'Dex Calloway', paint: { color: 0x8c9096, accent: 0x2a2d31 },
    traits: trait({ skill: .975, brake: .82, consistency: .6, aggression: .4, defend: .2 }) }),
]);

// Road cars. The computer racers drive only the lighter models: the Falcone
// Heritage and the Aurora are more than three times as heavy to draw, and
// eight cars on screen must stay within the frame limit.
const ROAD_CLASS = Object.freeze(['falcone_f42', 'falcone_heritage', 'stuttgart_959s', 'aurora_gt',
  'dusthawk_rally', 'banshee_muscle', 'viper_proto', 'nissan_skyline_gtr_r34']);
const ROAD_CARS = Object.freeze(['falcone_f42', 'stuttgart_959s', 'dusthawk_rally', 'banshee_muscle', 'viper_proto']);
// What each racer would like to drive, then how to choose when that is out of range.
const CAR_WISH = Object.freeze({
  axel_storm: ['koenigsegg_jesko'],
  mara_vale: ['falcone_f42', 'falcone_heritage'],
  iko_ren: ['stuttgart_959s'],
  sana_marlow: ['aurora_gt', 'viper_proto'],
  jules_reyes: ['banshee_muscle'],
  nia_frost: ['dusthawk_rally'],
  boone_ward: ['titan_monster'],
  club: [],
});
const FALLBACK_TASTE = Object.freeze({
  axel_storm: spec => spec.grip + spec.braking,
  sana_marlow: spec => spec.topSpeed,
  boone_ward: spec => (spec.mass || 1450),
  jules_reyes: spec => spec.accel,
  nia_frost: spec => spec.offRoadGrip ?? 0,
  mara_vale: spec => spec.grip,
  iko_ren: spec => spec.grip + spec.braking,
});

// One number for how fast a car is round a circuit: its average speed (mph)
// on the racing line with the car at its limits. With no circuit given, a
// rough figure from its stats that counts top speed most.
const paceCache = new WeakMap();
export function performanceIndex(spec, course = null) {
  if (!course) {
    return 100 * Math.pow(spec.topSpeed / 220, .6) * Math.pow(spec.grip, .3) *
      Math.pow(spec.braking, .15) * Math.pow(spec.accel / 8, .15);
  }
  let known = paceCache.get(course);
  if (!known) paceCache.set(course, known = new Map());
  const key = [spec.name, spec.topSpeed, spec.accel, spec.grip, spec.braking].join('|');
  let pace = known.get(key);
  if (pace == null) {
    const profile = buildSpeedProfile(racingLineFor(course), spec);
    let seconds = 0;
    for (let i = 0; i < profile.count; i++) seconds += 1 / Math.max(1, profile.mph[i]);
    pace = profile.count / seconds;
    known.set(key, pace);
  }
  return pace;
}

const levelsFor = level => Object.fromEntries(['engine', 'nitro', 'handling', 'tires', 'brakes', 'suspension', 'tank']
  .map(key => [key, level]));

export function racerSpec(carKey, upgrades, driverId) {
  return applyDriverModifiers(upgradedCar(CARS[carKey], upgrades), driverId, carKey);
}

// Pick a car and upgrade level for each racer. Pure: same inputs, same field.
export function chooseCars({ playerSpec, playerCar, playerUpgrades, racers, cpuDifficulty, seed, course }) {
  const tuning = FIELD_TUNING[cpuDifficulty] || FIELD_TUNING.medium;
  const target = performanceIndex(playerSpec, course);
  const rng = makeRng((seed ^ 0xc4a7) >>> 0);
  const own = () => ({ car: playerCar, level: Math.round(Math.min(3, ...Object.values(playerUpgrades || {}).concat(3))) });
  const pool = ROAD_CLASS.includes(playerCar) ? ROAD_CARS : [];
  const candidates = [];
  for (const car of pool) for (let level = 0; level <= 3; level++) {
    const generic = racerSpec(car, levelsFor(level), 'club');
    candidates.push({ car, level, index: performanceIndex(generic, course) });
  }
  const inWindow = candidates.filter(c => Math.abs(c.index / target - 1) <= FIELD.carWindow);
  const sorted = [...inWindow].sort((a, b) => a.index - b.index);
  const middle = sorted.length ? sorted[Math.floor((sorted.length - 1) / 2)].index : target;
  const allowed = tuning.cars === 'slower' ? sorted.filter(c => c.index <= middle)
    : tuning.cars === 'faster' ? sorted.filter(c => c.index >= middle) : sorted;
  const aim = target * (tuning.cars === 'slower' ? .96 : tuning.cars === 'faster' ? 1.04 : 1);
  return racers.map(racer => {
    if (!allowed.length) {
      const fallback = own();
      return { car: fallback.car, level: fallback.level };
    }
    const wish = CAR_WISH[racer.id] || [];
    const within = list => list.map(c => ({ ...c, spec: racerSpec(c.car, levelsFor(c.level), racer.driverId) }))
      .filter(c => Math.abs(performanceIndex(c.spec, course) / target - 1) <= FIELD.carWindow);
    const wished = within(allowed.filter(c => wish.includes(c.car)));
    const options = wished.length ? wished : within(allowed);
    const taste = FALLBACK_TASTE[racer.id];
    let best = null, bestScore = Infinity;
    for (const option of options) {
      const gap = Math.abs(performanceIndex(option.spec, course) - aim) / aim;
      const score = (wished.length || !taste ? 0 : -taste(option.spec) * .01) + gap * 4 + rng.float() * .001;
      if (score < bestScore) { best = option; bestScore = score; }
    }
    return best ? { car: best.car, level: best.level } : { car: allowed[0].car, level: allowed[0].level };
  });
}

// Which racers line up for this difficulty and field size.
export function chooseRacers(cpuDifficulty, count) {
  const specialists = RACERS.filter(racer => !racer.hardOnly && racer.id !== 'club');
  const order = [...(cpuDifficulty === 'hard' ? RACERS.filter(racer => racer.hardOnly) : []), ...specialists,
    ...RACERS.filter(racer => racer.id === 'club')];
  return order.slice(0, clamp(Math.floor(count), 0, FIELD.maxRacers));
}

export function gridPose(slot) {
  const row = Math.floor(slot / 2), right = slot % 2 === 1;
  return { s: FIELD.firstRow - row * FIELD.rowGap - (right ? FIELD.stagger : 0),
    lateral: (right ? 1 : -1) * FIELD.gridLateral };
}

// GP-PASSING-2 step A: with `cpu-racecraft` every car's nitro stays locked until
// it has passed the apex of the first braking zone on lap 1 (F1 keeps its
// overtaking aid off at the start too). Station of that apex, from the front grid slot.
function firstApexStation(duel) {
  const s = duel.state, front = Math.max(s.s, ...s.opponents.map(r => r.s));
  const profile = buildSpeedProfile(racingLineFor(duel.course), duel.car);
  const phase = duel.course.phase(front), length = duel.course.length;
  const ahead = profile.corners.map(corner => ({corner, distance: (corner.entryS - phase + length) % length}))
    .filter(row => row.distance > 1).sort((a, b) => a.distance - b.distance)[0];
  return ahead ? front + ahead.distance + (ahead.corner.apexS - ahead.corner.entryS + length) % length : front;
}

export function nitroLocked(actor, field) {
  return field?.nitroArmS !== undefined && !actor.completedLaps && actor.s < field.nitroArmS;
}

// ---- building the field --------------------------------------------------

export function initializeField(duel) {
  const s = duel.state, course = duel.course;
  const racecraft = duel.featureFlags.enabled('cpu-racecraft');
  // GP staging leaves the timing origin and visible line at zero.
  const gridSetback = s.mode === 'grandprix'
    ? course.def.id === 'azure-riviera' ? -400 : course.def.id === 'panorama-ridge' ? -43 : 0
    : 0;
  const cpu = s.cpuDifficulty, tuning = FIELD_TUNING[cpu] || FIELD_TUNING.medium;
  const racers = chooseRacers(cpu, s.opponentCount);
  const fieldSeed = (s.fieldSeed ?? s.seed) >>> 0;
  const rng = makeRng((fieldSeed ^ 0x9d2c5680) >>> 0);
  const cars = chooseCars({ playerSpec: duel.car, playerCar: s.car, playerUpgrades: s.upgrades, racers,
    cpuDifficulty: cpu, seed: fieldSeed, course });
  const size = racers.length + 1;
  const playerSlot = Math.min(size - 1, tuning.playerSlot);
  // Seeded shuffle of the other grid slots; Axel Storm takes pole.
  const slots = [];
  for (let slot = 0; slot < size; slot++) if (slot !== playerSlot) slots.push(slot);
  const poleFirst = racers.findIndex(racer => racer.id === 'axel_storm');
  const rest = racers.map((_, index) => index).filter(index => index !== poleFirst);
  for (let i = rest.length - 1; i > 0; i--) { const j = Math.floor(rng.float() * (i + 1)); [rest[i], rest[j]] = [rest[j], rest[i]]; }
  const slotOf = new Array(racers.length);
  if (poleFirst >= 0) slotOf[poleFirst] = slots.shift();
  rest.forEach(index => { slotOf[index] = slots.shift(); });
  const gridStart = course.def.gridStartS ?? 0;
  const line = racingLineFor(course);
  const hold = FIELD.holdMin + rng.float() * (FIELD.holdMax - FIELD.holdMin);
  s.opponents = racers.map((racer, index) => {
    const upgrades = levelsFor(cars[index].level);
    const pose = gridPose(slotOf[index]);
    const jitter = (rng.float() * 2 - 1) * tuning.spread * (course.def.fieldSpread ?? 1);
    const [lo, hi] = tuning.reaction;
    const reaction = Math.max(.1, lo + rng.float() * (hi - lo) - racer.traits.start * 1);
    return {
      id: `gp-${index + 1}`, name: racer.name, racerId: racer.id, driverId: racer.driverId, paint: { ...racer.paint },
      car: cars[index].car, upgrades,
      ...(course.pitLane?{tyre:normalizeTyre(s.tyre)}:{}),
      s: pose.s + gridSetback + gridStart, lateral: pose.lateral, speedMph: 0, finished: false, finishTime: null,
      headingError: 0, yawVelocity: 0, pushVelocity: 0, offRoad: false, contactCooldown: 0, boost: 1, boosting: false,
      damageZones: freshDamageZones(), damageCooldown: 0,
      airborne: false, airHeight: 0, _jumpY: null, _verticalSpeed: 0, _jumpOrigin: null,
      completedLaps: 0, nextLapGate: 0, lapTimes: [], lapStartedAt: 0,
      field: {
        index, slot: slotOf[index], skillRoll: 1 + jitter, reaction, rng: (rng.float() * 4294967296) >>> 0,
        formAmp: tuning.form * (course.def.fieldForm ?? 1), formPeriod: 25 + rng.float() * 30, formPhase: rng.float() * Math.PI * 2,
        // GP-WIDE-START: formation state exists only with the development switch.
        traits: { ...racer.traits }, ...(racecraft ? {racecraft:true,
          gridStartS:pose.s+gridSetback+gridStart, startLateral:pose.lateral} : {}),
        bias: 0, intent: pose.lateral, pass: null, passCool: 0, passes: { start: 0, done: 0, timeout: 0, stalled: 0, edge: 0, dives: 0 }, diveKey: null, tow: 0, mistake: null,
        zoneKey: null, rolledKey: null, defendKey: null, defendSide: 0, lateBrake: 0, stuck: 0, offSec: 0,
        recoveries: 0, crashes: 0, knocked: false, cooldownSeen: 0, hits: 0, moveSpeed: 0,
      },
    };
  });
  const playerPose = gridPose(playerSlot);
  s.s = playerPose.s + gridSetback + gridStart; s.lateral = playerPose.lateral; s.prevS = s.s; s.prevLateral = s.lateral;
  s.opponentCount = racers.length;
  duel.rivalSpec = s.opponents.length ? racerSpec(s.opponents[0].car, s.opponents[0].upgrades, s.opponents[0].driverId) : null;
  s.field = {
    version: 1, laps: duel.course.def.laps || FIELD.laps, size, playerSlot, hold, cpuDifficulty: cpu, playerIndex: performanceIndex(duel.car, course), seed: fieldSeed,
    start: { elapsed: 0, lights: 0, out: false },
    tow: 0, towBehind: null,
    order: [], position: size, finalLap: false,
    stats: { passes: 0, passesAfterStart: 0, passTimes: [], crashes: [], playerCrashes: 0, recoveries: 0, finishTimes: {} },
    pairs: {}, lastPosition: size, pace: tuning.pace,
    deferFinish: false,
    ...(racecraft ? {nitroArmS: firstApexStation(duel)} : {}),
  };
  s.countdown = FIELD.lights * FIELD.lightSec + hold;
  s.lapsTotal = duel.course.def.laps || FIELD.laps;
  s.traffic = [];
  updateOrder(duel);
  s.field.lastPosition = s.field.position;
  return line;
}

// ---- the start ---------------------------------------------------------------

// Five red lights, one a second, then dark after a seeded wait. Throttle does
// nothing until the lights go out because the cars do not run until then.
export function stepStartSequence(duel, dt) {
  const s = duel.state, start = s.field.start;
  start.elapsed += dt;
  s.countdown = Math.max(0, FIELD.lights * FIELD.lightSec + s.field.hold - start.elapsed);
  const lit = Math.min(FIELD.lights, Math.floor(start.elapsed / FIELD.lightSec + 1e-9));
  while (start.lights < lit) { start.lights++; duel.emit({ startLight: start.lights, countdown: FIELD.lights - start.lights + 1 }); }
  if (start.elapsed + 1e-9 >= FIELD.lights * FIELD.lightSec + s.field.hold) {
    start.lights = 0; start.out = true;
    s.countdown = 0; s.status = 'racing';
    duel._callout('GO. MAKE IT COUNT.', 2);
    duel.emit({ go: true, lightsOut: true });
  }
  return true;
}

// ---- standings ---------------------------------------------------------------

// The actor behind every row of the running order: -1 is the player.
const actorAt = (state, index) => (index < 0 ? state : state.opponents[index]);

// When a racer crossed the finish line, interpolated to the step, or null.
function finishedAt(state, index) {
  const actor = actorAt(state, index);
  return actor.completedLaps >= state.lapsTotal ? actor.lapStartedAt : null;
}

// A racer who has finished stays ahead of everyone still racing, earliest first.
function progressOf(state, index) {
  const done = finishedAt(state, index);
  return done == null ? actorAt(state, index).s : 1e9 - done;
}

// Keep the sorted running order up to date. Reuses its rows to avoid garbage.
export function updateOrder(duel) {
  const s = duel.state, field = s.field;
  const rows = field.order;
  if (rows.length !== s.opponents.length + 1) {
    rows.length = 0;
    rows.push({ index: -1, id: 'player', name: 'YOU', you: true, car: s.car, position: 0, gapAheadSec: null, gapLeaderSec: null, progress: 0 });
    s.opponents.forEach((r, index) => rows.push({ index, id: r.id, name: r.name, you: false, car: r.car, position: 0,
      gapAheadSec: null, gapLeaderSec: null, progress: 0 }));
  }
  for (const row of rows) row.progress = progressOf(s, row.index);
  rows.sort((a, b) => b.progress - a.progress || a.index - b.index);
  let leader = null;
  rows.forEach((row, place) => {
    row.position = place + 1;
    const actor = actorAt(s, row.index);
    if (!leader) { leader = actor; row.gapAheadSec = null; row.gapLeaderSec = null; return; }
    const ahead = actorAt(s, rows[place - 1].index);
    row.gapAheadSec = timeGap(duel, ahead, actor);
    row.gapLeaderSec = timeGap(duel, leader, actor);
  });
  const you = rows.findIndex(row => row.you);
  field.position = you + 1;
  field.ahead = you > 0 ? rows[you - 1] : null;
  field.behind = you < rows.length - 1 ? rows[you + 1] : null;
}

// Seconds between two cars if the one behind keeps its speed.
export function timeGap(duel, ahead, behind) {
  if (ahead.finished || behind.finished) return null;
  const distance = Math.max(0, duel.relativeS(ahead.s, behind.s) - behind.s);
  return distance / Math.max(25, (behind.speedMph || 0) * MPH);
}

// Count passes between computer racers with a little hysteresis, so two cars
// running side by side do not count every flicker.
function countPasses(duel) {
  const s = duel.state, field = s.field, stats = field.stats;
  const cars = s.opponents;
  for (let a = 0; a < cars.length; a++) for (let b = a + 1; b < cars.length; b++) {
    if (cars[a].finished || cars[b].finished) continue;
    const d = duel.relativeS(cars[a].s, cars[b].s) - cars[b].s;
    const key = a * 16 + b;
    const before = field.pairs[key] || 0;
    const now = d > 4 ? 1 : d < -4 ? -1 : before;
    if (before !== 0 && now !== before) {
      stats.passes++;
      if (s.stageTimeSec > 15) stats.passesAfterStart++;
      if (stats.passTimes.length < 200) stats.passTimes.push(+s.stageTimeSec.toFixed(1));
    }
    field.pairs[key] = now;
  }
}

// ---- slipstream ----------------------------------------------------------------

// A car within 30 m behind another and within 2.5 m to the side is in its
// tow; the tow builds over a moment of following and fades quickly.
export function stepTow(duel, dt) {
  const s = duel.state, field = s.field;
  const actors = [s, ...s.opponents];
  let playerBehind = null;
  for (const actor of actors) {
    const mine = actor === s ? field : actor.field;
    let near = null;
    if (!(actor.finished || actor.knock || actor.speedMph < 40)) {
      for (const other of actors) {
        if (other === actor || other.finished || other.knock) continue;
        const ds = duel.relativeS(other.s, actor.s) - actor.s;
        if (ds <= 0 || ds > FIELD.towRange) continue;
        if (Math.abs(other.lateral - actor.lateral) > FIELD.towSide) continue;
        if (other.speedMph < actor.speedMph * .6) continue;
        near = other; break;
      }
    }
    const gain = (actor === s ? 1 : actor.field.traits.tow) / FIELD.towBuildSec;
    mine.tow = clamp(mine.tow + (near ? gain : -1 / FIELD.towFadeSec) * dt, 0, 1);
    if (actor === s) playerBehind = near;
  }
  field.towBehind = playerBehind ? (playerBehind === s ? -1 : s.opponents.indexOf(playerBehind)) : null;
}

// Per-step bookkeeping before anyone moves.
export function stepField(duel, dt) {
  const s = duel.state, field = s.field;
  stepTow(duel, dt);
  // Count the player's own crashes next to the computer racers'.
  if (s.stageCrashes > field.stats.playerCrashes) {
    for (let n = field.stats.playerCrashes; n < s.stageCrashes; n++) field.stats.crashes.push({ index: -1, t: +s.stageTimeSec.toFixed(2) });
    field.stats.playerCrashes = s.stageCrashes;
  }
  updateOrder(duel);
  countPasses(duel);
  if (field.position < field.lastPosition) duel.emit({ positionGain: { from: field.lastPosition, to: field.position } });
  field.lastPosition = field.position;
  if (!field.finalLap && s.completedLaps === s.lapsTotal - 1 && s.lapsTotal > 1) {
    field.finalLap = true;
    duel._callout(FIELD.finalLapCall, 2.6);
    duel.emit({ finalLap: true });
  }
}

// ---- the finish ----------------------------------------------------------------

// The finishing order when the player crosses the line. Racers who are still
// out on track get a projected time from where they are and how fast they go.
export function classify(duel) {
  const s = duel.state, rows = [];
  const total = duel.raceLength;
  const entry = (index, actor) => {
    const finish = finishedAt(s, index), done = finish != null;
    const laps = actor.lapTimes || [];
    let time;
    if (done) time = finish;
    else {
      const remaining = Math.max(0, total - actor.s);
      time = s.stageTimeSec + remaining / Math.max(35 * MPH, (actor.speedMph || 0) * MPH);
    }
    const car = CARS[index < 0 ? s.car : actor.car];
    return { index, id: index < 0 ? 'player' : actor.id, name: index < 0 ? 'YOU' : actor.name, you: index < 0,
      car: index < 0 ? s.car : actor.car, carName: car?.name || '', driverId: index < 0 ? s.driverId : actor.driverId,
      timeSec: +time.toFixed(3), projected: !done, laps: laps.length,
      bestLapSec: laps.length ? Math.min(...laps) : null, lapTimes: [...laps] };
  };
  rows.push(entry(-1, s));
  s.opponents.forEach((actor, index) => rows.push(entry(index, actor)));
  rows.sort((a, b) => (a.projected - b.projected) || (a.timeSec - b.timeSec) || (a.index - b.index));
  const winner = rows[0].timeSec;
  rows.forEach((row, place) => { row.position = place + 1; row.gapSec = +(row.timeSec - winner).toFixed(3); });
  return rows;
}

export function playerRow(rows) { return rows.find(row => row.you); }

// The player has crossed the line: close the race with the full classification.
// A tool that wants to keep racing the whole field sets `field.deferFinish`.
export function finishGrandPrix(duel) {
  const s = duel.state, field = s.field;
  if (field.deferFinish) {
    field.stats.playerFinish ??= +s.lapStartedAt.toFixed(3);
    return false;
  }
  const rows = classify(duel), you = playerRow(rows);
  const best = rows.filter(row => row.bestLapSec != null).sort((a, b) => a.bestLapSec - b.bestLapSec)[0] || null;
  s.boosting = false;
  s.results = {
    stageIndex: s.stageIndex, stageName: duel.stageDef.name, seed: s.seed, grandPrix: true,
    stageTimeSec: +s.stageTimeSec.toFixed(2), timeSec: +you.timeSec.toFixed(2), missedStation: false,
    completed: true, laps: s.completedLaps, lapTimes: [...s.lapTimes], assistedLaps: [...s.assistedLaps],
    jumpScore: s.jumpScore, jumps: s.jumps, bestJumpMeters: s.bestJumpMeters, crushCount: s.crushCount, crushScore: s.crushScore,
    cleanStage: s.stageCrashes === 0, stageCrashes: s.stageCrashes, majorCrashesBeforeRepair: s.majorCrashes,
    crashesRepaired: 0, livesRestored: 0, policeEscapes: 0, scoreMultiplier: duel.scoreMultiplier,
    lives: s.lives, timeBonus: 0, beatRival: you.position === 1, score: s.stageStyleScore, styleScore: s.stageStyleScore,
    won: you.position === 1, opponentCount: s.opponents.length, position: you.position,
    beatAllOpponents: you.position === 1, creditReward: 0,
    field: rows, fieldSize: rows.length,
    bestLapSec: you.bestLapSec, fastestLap: best ? { name: best.name, timeSec: best.bestLapSec, you: best.you } : null,
    passes: field.stats.passes,
    ...snowmanResult(duel),
    ...yetiResult(duel),
  };
  s.status = 'stage_result';
  duel.emit({ stageResult: s.results });
  return true;
}
export function raceStats(duel) {
  const s = duel.state, stats = s.field.stats;
  const first30 = new Set(stats.crashes.filter(crash => crash.t <= 30).map(crash => crash.index));
  return { passes: stats.passes, passesAfterStart: stats.passesAfterStart, crashes: stats.crashes.length,
    crashingCarsInFirst30: first30.size, recoveries: stats.recoveries };
}

// Read-only picture of the field for screens and tools.
export function fieldView(state) {
  const f = state.field;
  if (!f) return null;
  return { position: f.position, size: f.size, order: f.order, tow: f.tow, towBehind: f.towBehind,
    ahead: f.ahead, behind: f.behind, finalLap: f.finalLap, lights: f.start.lights, lightsOut: f.start.out };
}

const AZURE_GP_ENTRY_WIDTH = Object.freeze({start: 225, peak: 260, end: 295, halfWidth: 1});
const AZURE_GP_FIELD_FOLLOW = Object.freeze({wallRoom: 1,
  firstLap: Object.freeze({margin: 5, reaction: .5, closeIn: .8, wallRoom: 1.4})});
// EIFEL-CROWN-C3: the new road has real braking corners, so the field keeps more room to the car ahead.
const EIFEL_GP_FIELD_FOLLOW = Object.freeze({reaction: .4, margin: 3.5, comfort: .5, leadBraking: 1.6, wallRoom: 1,
  firstLap: Object.freeze({margin: 5, reaction: .5, closeIn: .8, wallRoom: 1.4})});
const EXISTING_GP_TUNING = Object.freeze({
  'cloudbreak-skyway': Object.freeze({
    fieldPace: Object.freeze({easy: .981, medium: .948, hard: .934}), fieldAggression: .85,
  }),
  'neon-docks': Object.freeze({
    fieldPace: Object.freeze({easy: .939, medium: .897, hard: .908}), fieldAggression: .6,
  }),
  'red-mesa': Object.freeze({
    fieldPace: Object.freeze({easy: .930, medium: .881, hard: .871}), fieldAggression: .6,
  }),
  'alpine-serpent': Object.freeze({
    fieldPace: Object.freeze({easy: .929, medium: .902, hard: .892}), fieldAggression: .6,
  }),
  'eifel-crown': Object.freeze({
    fieldPace: Object.freeze({easy: .934, medium: .903, hard: .881}), fieldAggression: 1.4,
  }),
  // The new Eifel road (layoutVersion 3, behind its switch) has its own row; the released road keeps the row above.
  'eifel-crown@3': Object.freeze({
    fieldPace: Object.freeze({easy: .94, medium: .858, hard: .86}), fieldAggression: 1.4,
    fieldFollow: EIFEL_GP_FIELD_FOLLOW,
  }),
  'harbor-highlands': Object.freeze({
    fieldPace: Object.freeze({easy: 1.085, medium: 1.043, hard: 1.035}), fieldAggression: 1.6,
  }),
  'high-country': Object.freeze({
    fieldPace: Object.freeze({easy: 1.10, medium: 1.065, hard: 1.050}),
  }),
  'azure-riviera': Object.freeze({
    fieldPace: Object.freeze({easy: .96, medium: .91, hard: .90}), fieldAggression: 1.8,
  }),
});
export function courseForGrandPrix(def) {
  // An authored circuit may set its own Grand Prix length (`grandPrixLaps`).
  return { ...def, laps: def.grandPrixLaps ?? FIELD.laps, hasRadar: false, grandPrix: true,
    ...(EXISTING_GP_TUNING[`${def.id}@${def.layoutVersion}`] ?? EXISTING_GP_TUNING[def.id]),
    ...(def.id === 'azure-riviera' ? {
      grandPrixEntryWidth: AZURE_GP_ENTRY_WIDTH,
      fieldFollow: AZURE_GP_FIELD_FOLLOW,
    } : {}) };
}
