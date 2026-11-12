// Old Smoke's furnace chase (docs/board/cards/WW-BOSS.md, "Settled design").
// The furnace drives one fixed path with three legs, and each leg has one door:
// left on the open flats, right in the Boneyard, rear on the run back to the
// well. The path runs through Tin Town's gate on the way home (EVERBURN-RUN-AT-TOWN):
// the furnace records once that it reached the gate, and that the gate burnt if its right
// door was still unbroken. A door runs one rhythm, stoke then glow then slam, and a hit while the
// door glows ends the leg. Everything here is plain numbers read from the job
// clock's steps, so the same inputs always give the same chase. There is no
// randomness, no drawing and no audio in this file; the world-job mode asks it
// for events and effects and turns those into cues, callouts and armour.

export const OLD_SMOKE = Object.freeze({
  hitsToWin: 3,
  // Metres a second on every difficulty before a speed-up. The slowest car the
  // story allows (the Titan Monster, 116 mph) is more than three times faster.
  baseSpeed: 14,
  speedUp: Object.freeze({easy: 1, medium: 1.1, hard: 1.1}),
  // After a door breaks the furnace runs for the next leg's ground at this pace, so the
  // player chases it there instead of trailing it for a minute or two with no door to hit
  // (seen in Claude's play of 10 November: 113 s and 85 s of plain following). Still slower
  // than the Titan Monster's 52 m/s.
  boltSpeed: Object.freeze({easy: 36, medium: 45, hard: 45}),
  // The three opening lines (2.2 seconds each) play before the first stoke begins.
  introSec: 6.7,
  stokeSec: 4,
  glowSec: Object.freeze({easy: 6, medium: 4.5, hard: 3.5}),
  shutSec: 3,
  staggerSec: 2,
  staggerSpeedShare: .25,
  doorRadius: Object.freeze({easy: 2, medium: 1.2, hard: 1.2}),
  // Where each door sits on the furnace: metres to the right of its centre
  // (negative is left) and along its heading (negative is behind).
  doors: Object.freeze({
    left: Object.freeze({lateral: -2.4, along: -1}),
    right: Object.freeze({lateral: 2.4, along: -1}),
    rear: Object.freeze({lateral: 0, along: -4.2}),
  }),
  doorHeight: 1,
  // A car whose centre comes this close to an open door's edge is ramming it.
  ramReachMetres: 1.6,
  ramSideMetres: 1.6,
  ramRearMetres: 2.5,
  cinder: Object.freeze({
    spacingMetres: 6, behindMetres: 5, lifeSec: 5, radius: 2.5, carReach: 1.2,
    // Armour a second. On Easy cinders do not cost armour, they only slow.
    armorPerSec: Object.freeze({easy: 0, medium: 5, hard: 8}),
    chunkArmor: 2,
    // On Easy a car in cinders cannot go faster than the furnace by more than this.
    easyOvertakeMph: 14, easySlowMphPerSec: 40,
  }),
  shoulder: Object.freeze({
    // "Beside" is within this far along the furnace and between these metres
    // out from its centre.
    alongMetres: 5, minSideMetres: 2.5, maxSideMetres: 9,
    sitSec: 3, warnSec: 1.2, cooldownSec: 3, shoveMps: 5.6,
    armor: Object.freeze({easy: 10, medium: 20, hard: 20}),
  }),
  rollInSec: 5,
  wellReachMetres: 30,
  wellArmor: Object.freeze({easy: 0, medium: 15, hard: 20}),
  mphPerMps: 2.236936,
});

const DIFFICULTIES = ['easy', 'medium', 'hard'];
const byDifficulty = (table, difficulty) => table[difficulty] ?? table.medium;
const at = place => place?.position ?? place;
const headingOf = (dx, dz) => Math.atan2(dx, dz);

function buildPath(places) {
  const points = places.map(place => ({x: at(place).x, z: at(place).z}));
  const cumulative = [0];
  for (let i = 1; i < points.length; i++)
    cumulative.push(cumulative[i - 1] + Math.hypot(points[i].x - points[i - 1].x, points[i].z - points[i - 1].z));
  return {points, cumulative, total: cumulative[cumulative.length - 1]};
}

function pointAt(path, metres) {
  const {points, cumulative} = path;
  let index = 0;
  while (index < points.length - 2 && metres >= cumulative[index + 1]) index++;
  const a = points[index], b = points[index + 1];
  const length = cumulative[index + 1] - cumulative[index] || 1;
  const t = Math.max(0, Math.min(1, (metres - cumulative[index]) / length));
  return {x: a.x + (b.x - a.x) * t, z: a.z + (b.z - a.z) * t,
    heading: headingOf(b.x - a.x, b.z - a.z), index};
}

// def is the chase actor from src/world/jobs/everburn.js: its path and its legs
// (door and the waypoint where the leg's ground begins) and, optionally, gateWaypoint,
// the place on the path that is Tin Town's gate. Without it there are no gate facts.
export function createFurnace(def, difficulty = 'medium') {
  const level = DIFFICULTIES.includes(difficulty) ? difficulty : 'medium';
  const path = buildPath(def.path);
  const gateMetres = Number.isInteger(def.gateWaypoint) ? path.cumulative[def.gateWaypoint] ?? null : null;
  const legs = def.legs.map(leg => ({id: leg.id, door: leg.door,
    fromMetres: path.cumulative[leg.fromWaypoint]}));
  const start = pointAt(path, 0);
  return {difficulty: level, path, legs, timeSec: 0,
    metres: 0, run: null, x: start.x, z: start.z, heading: start.heading, pathIndex: 0,
    legIndex: 0, hits: 0, broken: [false, false, false],
    gateMetres, townReached: false, gateBurnt: false,
    phase: 'idle', phaseSec: 0, door: null, staggerLeft: 0,
    cinders: [], dropMetres: 0, burnDebt: 0,
    shoulder: {sitSec: 0, warnSec: 0, side: 0, cooldownSec: 0},
    rollIn: null, boltedFor: 0, won: false, fallen: false, escaped: false, holding: false, laps: 0, pending: []};
}

export function furnaceSpeed(difficulty, hits) {
  return OLD_SMOKE.baseSpeed * Math.pow(byDifficulty(OLD_SMOKE.speedUp, difficulty),
    Math.min(Math.max(0, hits), OLD_SMOKE.hitsToWin - 1));
}

// The health the job engine sees: three doors, and it stays above zero until the
// furnace has actually rolled into the well, so the job ends at the fall.
// True while the furnace, after a hit, has not yet reached the ground of the leg whose door is next.
export const furnaceBolting = f => f.hits > 0 && !f.won && f.run === null && f.staggerLeft <= 0 && f.legIndex >= 0 && f.legIndex < f.hits;
// The pace the furnace wants right now, before the stagger's share is taken.
export const furnacePace = f => furnaceBolting(f) ? byDifficulty(OLD_SMOKE.boltSpeed, f.difficulty) : furnaceSpeed(f.difficulty, f.hits);

export const furnaceHealth = f => f.fallen ? 0 : Math.max(1, OLD_SMOKE.hitsToWin - f.hits);
// The door of the leg the furnace is working on, for the Easy arrow.
export const furnaceNextDoor = f => f.won ? null : f.legs[f.hits]?.door ?? null;
export const furnaceGlowingDoor = f => f.phase === 'glow' ? f.door : null;

const forwardOf = f => ({x: Math.sin(f.heading), z: Math.cos(f.heading)});
const rightOf = f => ({x: -Math.cos(f.heading), z: Math.sin(f.heading)});

export function furnaceDoorSpot(f, door) {
  const place = OLD_SMOKE.doors[door];
  if (!place) return null;
  const forward = forwardOf(f), right = rightOf(f);
  return {x: f.x + forward.x * place.along + right.x * place.lateral,
    z: f.z + forward.z * place.along + right.z * place.lateral};
}

// Hit targets for the weapons. Only the open door is a target; a shut door has
// nothing to hit. The y is filled in by the caller from the ground.
export function oldSmokeVentTargets(actor) {
  const f = actor?.furnace;
  const door = f && furnaceGlowingDoor(f);
  if (!door) return [];
  const spot = furnaceDoorSpot(f, door);
  return [{id: `${actor.id}:door-${door}`, actorId: actor.id, kind: 'furnace-vent', door,
    leg: f.legIndex, glowing: true, damage: 1,
    position: {x: spot.x, y: (actor.position?.y ?? 0) + OLD_SMOKE.doorHeight, z: spot.z},
    radius: byDifficulty(OLD_SMOKE.doorRadius, f.difficulty)}];
}

// A weapon or a ram reached a door. It counts only while that door glows; the
// wrong side and a shut door count for nothing. Returns true when it counted.
export function furnaceHit(f, door, source = 'weapon') {
  if (f.won || f.fallen || f.escaped || f.phase !== 'glow' || f.door !== door) return false;
  const leg = f.hits;
  f.broken[leg] = true;
  f.hits++;
  f.pending.push({type: 'hit', hit: f.hits, door, leg, source});
  f.pending.push({type: 'plateFall', hit: f.hits, door});
  f.door = null;
  f.phaseSec = 0;
  if (f.hits >= OLD_SMOKE.hitsToWin) {
    f.won = true;
    f.phase = 'rollin';
    f.staggerLeft = 0;
    f.rollIn = {fromX: f.x, fromZ: f.z, sec: 0};
    f.pending.push({type: 'rollIn', seconds: OLD_SMOKE.rollInSec});
  } else {
    f.phase = 'stagger';
    f.staggerLeft = OLD_SMOKE.staggerSec;
  }
  return true;
}

function ageCinders(f, dt) {
  for (const cinder of f.cinders) cinder.age += dt;
  f.cinders = f.cinders.filter(cinder => cinder.age < OLD_SMOKE.cinder.lifeSec);
}

function dropCinders(f, advance) {
  f.dropMetres += advance;
  const forward = forwardOf(f);
  while (f.dropMetres >= OLD_SMOKE.cinder.spacingMetres) {
    f.dropMetres -= OLD_SMOKE.cinder.spacingMetres;
    f.cinders.push({x: f.x - forward.x * OLD_SMOKE.cinder.behindMetres,
      z: f.z - forward.z * OLD_SMOKE.cinder.behindMetres, age: 0});
  }
}

// Drive along the path (or along a straight run back to the start of a leg).
function move(f, dt, out) {
  const share = f.staggerLeft > 0 ? OLD_SMOKE.staggerSpeedShare : 1;
  const bolting = furnaceBolting(f);
  if (bolting && f.boltedFor !== f.hits) {
    f.boltedFor = f.hits;
    out.events.push({type: 'bolt', toLeg: f.legs[f.hits].id, door: f.legs[f.hits].door});
  }
  const advance = furnacePace(f) * share * dt;
  if (f.run) {
    const run = f.run, remaining = run.length - run.done;
    const step = Math.min(advance, remaining);
    run.done += step;
    const t = run.length > 0 ? run.done / run.length : 1;
    f.x = run.fromX + (run.toX - run.fromX) * t;
    f.z = run.fromZ + (run.toZ - run.fromZ) * t;
    f.heading = headingOf(run.toX - run.fromX, run.toZ - run.fromZ);
    dropCinders(f, step);
    if (run.done >= run.length) { f.metres = run.toMetres; f.run = null; f.legIndex = legAt(f, f.metres); }
    return;
  }
  f.metres += advance;
  passTheGate(f, out);
  if (f.metres >= f.path.total) {
    const unbroken = f.hits < OLD_SMOKE.hitsToWin;
    if (unbroken && f.difficulty === 'hard') {
      f.escaped = true;
      f.pending.push({type: 'escaped'});
      out.events.push(...f.pending.splice(0));
      return;
    }
    f.laps++;
    out.events.push({type: 'turnAround', lap: f.laps, leg: f.hits});
    const toMetres = f.legs[Math.min(f.hits, f.legs.length - 1)].fromMetres;
    const end = pointAt(f.path, f.path.total), target = pointAt(f.path, toMetres);
    const length = Math.hypot(target.x - end.x, target.z - end.z);
    f.x = end.x; f.z = end.z;
    if (length > 1e-6) {
      f.run = {fromX: end.x, fromZ: end.z, toX: target.x, toZ: target.z, length, done: 0, toMetres};
      f.heading = headingOf(target.x - end.x, target.z - end.z);
      f.metres = f.path.total;
      f.legIndex = -1;
    } else {
      f.metres = toMetres; f.legIndex = legAt(f, toMetres);
    }
    return;
  }
  const point = pointAt(f.path, f.metres);
  f.x = point.x; f.z = point.z; f.heading = point.heading; f.pathIndex = point.index;
  f.legIndex = legAt(f, f.metres);
  dropCinders(f, advance);
}

// The first time the furnace's run along the path reaches the gate, at any pace, it has reached Tin Town. The gate
// burns only when the right door (the second leg's) is still whole at that moment. Two plain facts, set once.
function passTheGate(f, out) {
  if (f.gateMetres === null || f.townReached || f.metres < f.gateMetres) return;
  f.townReached = true;
  f.gateBurnt = !f.broken[1];
  out.events.push({type: 'townReached', burnt: f.gateBurnt});
  if (f.gateBurnt) out.events.push({type: 'gateBurnt'});
}

function legAt(f, metres) {
  let leg = 0;
  for (let i = 0; i < f.legs.length; i++) if (metres >= f.legs[i].fromMetres) leg = i;
  return leg;
}

// Stoke, glow, slam, and the 3 seconds shut before the next stoke. The rhythm
// runs only for the leg the furnace is on while that leg's door is the next one.
function rhythm(f, dt, out) {
  if (f.staggerLeft > 0) {
    f.staggerLeft = Math.max(0, f.staggerLeft - dt);
    f.phase = 'stagger'; f.door = null;
    if (f.staggerLeft === 0) { f.phase = 'idle'; f.phaseSec = 0; }
    return;
  }
  const wanted = f.run === null && f.legIndex === f.hits && f.timeSec >= OLD_SMOKE.introSec ?
    f.legs[f.hits].door : null;
  if (wanted === null) {
    if (f.phase === 'glow') out.events.push({type: 'doorSlam', door: f.door, reason: 'left-ground'});
    f.phase = 'idle'; f.door = null; f.phaseSec = 0;
    return;
  }
  if (f.phase === 'idle') {
    f.phase = 'stoke'; f.door = wanted; f.phaseSec = 0;
    out.events.push({type: 'stoke', door: wanted, seconds: OLD_SMOKE.stokeSec});
  }
  f.phaseSec += dt;
  const glowSec = byDifficulty(OLD_SMOKE.glowSec, f.difficulty);
  for (let guard = 0; guard < 4; guard++) {
    if (f.phase === 'stoke' && f.phaseSec >= OLD_SMOKE.stokeSec) {
      f.phaseSec -= OLD_SMOKE.stokeSec; f.phase = 'glow';
      out.events.push({type: 'doorOpen', door: f.door, seconds: glowSec});
    } else if (f.phase === 'glow' && f.phaseSec >= glowSec) {
      f.phaseSec -= glowSec; f.phase = 'shut';
      out.events.push({type: 'doorSlam', door: f.door, reason: 'missed'});
    } else if (f.phase === 'shut' && f.phaseSec >= OLD_SMOKE.shutSec) {
      f.phaseSec -= OLD_SMOKE.shutSec; f.phase = 'stoke';
      out.events.push({type: 'stoke', door: f.door, seconds: OLD_SMOKE.stokeSec});
    } else break;
  }
}

function rollIn(f, dt, out, ctx) {
  const roll = f.rollIn, well = f.path.points[f.path.points.length - 1];
  roll.sec += dt;
  const t = Math.min(1, roll.sec / OLD_SMOKE.rollInSec);
  f.x = roll.fromX + (well.x - roll.fromX) * t;
  f.z = roll.fromZ + (well.z - roll.fromZ) * t;
  if (Math.hypot(well.x - roll.fromX, well.z - roll.fromZ) > 1e-6)
    f.heading = headingOf(well.x - roll.fromX, well.z - roll.fromZ);
  if (t < 1) return;
  f.fallen = true; f.phase = 'fallen';
  out.events.push({type: 'fell', x: f.x, z: f.z});
  const car = ctx.car;
  if (car && Math.hypot(car.x - well.x, car.z - well.z) <= OLD_SMOKE.wellReachMetres)
    out.armor += byDifficulty(OLD_SMOKE.wellArmor, f.difficulty);
}

function carRelative(f, car) {
  const forward = forwardOf(f), right = rightOf(f), dx = car.x - f.x, dz = car.z - f.z;
  return {along: dx * forward.x + dz * forward.z, lateral: dx * right.x + dz * right.z};
}

function ramsOpenDoor(f, car) {
  const door = furnaceGlowingDoor(f);
  if (!door) return null;
  const spot = furnaceDoorSpot(f, door), rel = carRelative(f, car);
  const reach = byDifficulty(OLD_SMOKE.doorRadius, f.difficulty) + OLD_SMOKE.ramReachMetres;
  if (Math.hypot(car.x - spot.x, car.z - spot.z) > reach) return null;
  const onSide = door === 'left' ? rel.lateral <= -OLD_SMOKE.ramSideMetres :
    door === 'right' ? rel.lateral >= OLD_SMOKE.ramSideMetres : rel.along <= -OLD_SMOKE.ramRearMetres;
  return onSide ? door : null;
}

function cinderContact(f, car) {
  const reach = OLD_SMOKE.cinder.radius + OLD_SMOKE.cinder.carReach;
  return f.cinders.some(cinder => Math.hypot(car.x - cinder.x, car.z - cinder.z) <= reach);
}

function shoulder(f, dt, car, out) {
  const rule = OLD_SMOKE.shoulder, sh = f.shoulder;
  if (!car) { sh.sitSec = 0; sh.warnSec = 0; sh.side = 0; return; }
  const rel = carRelative(f, car), outward = Math.abs(rel.lateral), side = Math.sign(rel.lateral);
  const beside = Math.abs(rel.along) <= rule.alongMetres && outward >= rule.minSideMetres &&
    outward <= rule.maxSideMetres;
  if (sh.cooldownSec > 0) {
    sh.cooldownSec = Math.max(0, sh.cooldownSec - dt);
    sh.sitSec = 0; sh.side = 0;
    return;
  }
  if (sh.warnSec > 0) {
    // Dropping back, crossing over or a door opening cancels the swerve.
    if (!beside || side !== sh.side || f.phase === 'glow') {
      sh.warnSec = 0; sh.sitSec = 0; sh.side = 0;
      return;
    }
    sh.warnSec = Math.max(0, sh.warnSec - dt);
    if (sh.warnSec === 0) {
      const right = rightOf(f);
      out.shove = {side, x: right.x * side, z: right.z * side,
        armor: byDifficulty(rule.armor, f.difficulty), metresPerSecond: rule.shoveMps};
      out.events.push({type: 'shove', side, armor: out.shove.armor});
      sh.sitSec = 0; sh.side = 0; sh.cooldownSec = rule.cooldownSec;
    }
    return;
  }
  if (!beside || f.phase === 'glow') { sh.sitSec = 0; sh.side = 0; return; }
  if (sh.side !== side) { sh.side = side; sh.sitSec = 0; }
  sh.sitSec += dt;
  if (sh.sitSec >= rule.sitSec) {
    sh.warnSec = rule.warnSec;
    out.events.push({type: 'shoveWarning', side, seconds: rule.warnSec});
  }
}

// One step. ctx.car is {x, y, z} of the player's car while it is in play, or
// null (on foot, wrecked). Returns what the furnace did this step: events for
// cues and lines, armour the player loses, a cap on the car's speed (Easy), and
// a shove for the car.
export function stepFurnace(f, dt, ctx = {}) {
  const out = {events: f.pending.splice(0), armor: 0, speedCapMph: null, shove: null};
  if (!(dt > 0) || f.fallen || f.escaped) return out;
  f.timeSec += dt;
  ageCinders(f, dt);
  if (f.won) { rollIn(f, dt, out, ctx); return out; }
  move(f, dt, out);
  if (f.escaped) return out;
  rhythm(f, dt, out);
  const car = ctx.car ?? null;
  if (car) {
    const door = ramsOpenDoor(f, car);
    if (door) furnaceHit(f, door, 'ram');
  }
  if (f.won) { out.events.push(...f.pending.splice(0)); return out; }
  out.events.push(...f.pending.splice(0));
  if (car && cinderContact(f, car)) {
    const rule = OLD_SMOKE.cinder, burn = byDifficulty(rule.armorPerSec, f.difficulty);
    if (burn > 0) {
      f.burnDebt += burn * dt;
      if (f.burnDebt >= rule.chunkArmor) { out.armor += f.burnDebt; f.burnDebt = 0; }
    } else {
      out.speedCapMph = furnacePace(f) * OLD_SMOKE.mphPerMps + rule.easyOvertakeMph;
    }
  }
  shoulder(f, dt, car, out);
  return out;
}
