import {makeRng} from './rng.js';
import {point, predictedPoint} from './combat-weapons.js';
import {COMBAT_TUNING} from './wasteland-tuning.js';

// Course geometry is untouched. These three small camps exist only in flagged
// Wasteland simulation state, so ordinary races retain their original route.
const ZONE_FRACTIONS = [.29, .55, .81];
const WARNING_METERS = 190;
const FIRE_METERS = 82;
const SHOT_GAP_SECONDS = .8;
const RAID_SALT = 0x7a1d0b5e;

function clearRoadside(course, s, lateral) {
  if (course.tunnelAt(s)) return false;
  return !course.features.stations.some(station =>
    Math.abs(course.phase(station.s - s + course.length / 2) - course.length / 2) < 36 &&
    Math.abs(station.off - lateral) < 22);
}

function clearRaiderSpot(course, at) {
  return !course.features.obstacles.some(obstacle =>
    Number.isFinite(obstacle.x) && Number.isFinite(obstacle.z) &&
    Math.hypot(obstacle.x - at.x, obstacle.z - at.z) < 2.8);
}

export function createRaidZones(course, seed) {
  const rng = makeRng((seed ^ Math.imul(course.def.stage + 1, RAID_SALT)) >>> 0);
  return ZONE_FRACTIONS.map((fraction, zoneIndex) => {
    const side = rng.chance(.5) ? 1 : -1;
    let s = course.length * (fraction + rng.range(-.014, .014));
    let lateral = side * (course.roadHalfWidthAt(s) + 12);
    for (let attempt = 0; attempt < 10 && !clearRoadside(course, s, lateral); attempt++) {
      s = course.phase(s + 43);
      lateral = side * (course.roadHalfWidthAt(s) + 12);
    }
    const raiders = Array.from({length: 3}, (_, index) => {
      const intendedS = s + (index - 1) * 7;
      let atS, off, at;
      for (const shift of [0, 4, -4, 8, -8, 12, -12]) {
        atS = course.phase(intendedS + shift);
        off = side * (course.roadHalfWidthAt(atS) +
          (course.def.arena ? 5 : 10 + (index % 2) * 3));
        at = course.groundAt(atS, off);
        if (clearRaiderSpot(course, at)) break;
      }
      const road = course.groundAt(atS, 0);
      return {id: `${zoneIndex}-${index}`, s: atS, lateral: off,
        x: at.x, y: at.y, z: at.z, yaw: Math.atan2(road.x - at.x, road.z - at.z),
        firedLap: 0};
    });
    const warningS = course.phase(s - 125);
    const warningOff = side * (course.roadHalfWidthAt(warningS) + 2.4);
    return {id: zoneIndex, s, side, raiders,
      warning: course.groundAt(warningS, warningOff),
      warnedLap: 0, nextShotAt: 0, shotCount: 0};
  });
}

export function initializeRaiders(duel) {
  const state = duel.state;
  if (state.mode !== 'wasteland' || !state.combat ||
      duel.featureFlags?.enabled('wasteland2') !== true) {
    delete state.raids;
    return;
  }
  state.raids = {zones: createRaidZones(duel.course, duel.seed), shots: 0};
}

function targetFor(duel, zone) {
  const state = duel.state;
  const available = [state, ...state.opponents];
  let best = null, distance = Infinity;
  for (let index = 0; index < available.length; index++) {
    const actor = available[index];
    if (!actor || actor.finished || actor.crushed || actor.combatWrecking ||
        Math.abs(actor.speedMph || 0) < 8) continue;
    const gap = Math.abs(duel.relativeS(zone.s, actor.s) - actor.s);
    if (gap > FIRE_METERS) continue;
    if (gap < distance) {best = {actor, targetIndex: index - 1}; distance = gap;}
  }
  return best;
}

function fire(duel, zone, raider, target) {
  const combat = duel.state.combat;
  if (combat.projectiles.length >= COMBAT_TUNING.projectileLimit) return false;
  const at = point(duel, target.actor);
  const speed = COMBAT_TUNING.crossbow.baseSpeed * .72;
  const flight = Math.min(COMBAT_TUNING.crossbow.leadTime,
    Math.hypot(at.x - raider.x, at.z - raider.z) / speed);
  const future = predictedPoint(duel, target.actor, flight);
  const dx = future.x - raider.x, dz = future.z - raider.z;
  const bearing = Math.atan2(dx, dz);
  const originY = raider.y + 1.48;
  combat.projectiles.push({id: ++combat.serial, kind: 'crossbow', enemy: true,
    raid: true, raidZone: zone.id, targetIndex: target.targetIndex,
    launchBearing: bearing, level: 0, age: 0,
    x: raider.x + Math.sin(bearing), y: originY,
    z: raider.z + Math.cos(bearing),
    vx: Math.sin(bearing) * speed, vz: Math.cos(bearing) * speed,
    vy: (at.y - originY) / Math.max(1, Math.hypot(dx, dz)) * speed});
  raider.firedLap = duel.state.currentLap;
  zone.nextShotAt = duel.state.stageTimeSec + SHOT_GAP_SECONDS;
  zone.shotCount++;
  duel.state.raids.shots++;
  duel.emit({raiderShot: true, zone: zone.id,
    target: target.targetIndex < 0 ? 'player' : 'opponent'});
  return true;
}

export function stepRaiders(duel) {
  const state = duel.state, raids = state.raids;
  if (!raids || state.status !== 'racing' || state.paused) return;
  for (const zone of raids.zones) {
    const ahead = duel.relativeS(zone.s, state.s) - state.s;
    if (ahead > 0 && ahead < WARNING_METERS && zone.warnedLap !== state.currentLap) {
      zone.warnedLap = state.currentLap;
      duel._callout('ROADSIDE AMBUSH AHEAD', 2.2);
      duel.emit({raiderWarning: true, zone: zone.id});
    }
    if (state.stageTimeSec < zone.nextShotAt) continue;
    const target = targetFor(duel, zone);
    if (!target) continue;
    const raider = zone.raiders.find(member => member.firedLap !== state.currentLap);
    if (raider) fire(duel, zone, raider, target);
  }
}
