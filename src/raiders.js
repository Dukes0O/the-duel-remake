import {makeRng} from './rng.js';
import {point, predictedPoint} from './combat-weapons.js';
import {COMBAT_TUNING} from './wasteland-tuning.js';
import {crewPerks} from './crew.js';

// Course geometry is untouched. These three small camps exist only in flagged
// Wasteland simulation state, so ordinary races retain their original route.
const ZONE_FRACTIONS = [.29, .55, .81];
const WARNING_METERS = 190;
const FIRE_METERS = 82;
const SHOT_GAP_SECONDS = {easy: 1.6, medium: .8, hard: .8};
const RAID_SALT = 0x7a1d0b5e;
const T = COMBAT_TUNING.raider;

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

function salvageForZone(course, s, side, raiders, zoneIndex) {
  for (const shift of [19, 24, 29, 34, -19, -24, -29]) {
    const atS = course.phase(s + shift);
    const lateral = side * (course.roadHalfWidthAt(atS) +
      (course.def.arena ? 6 : 18));
    const at = course.groundAt(atS, lateral);
    if (at.y <= -12 || course.surfaceAt(atS, lateral).road ||
        !clearRaiderSpot(course, at) ||
        raiders.some(raider => Math.hypot(raider.x - at.x,
          raider.z - at.z) < 5)) continue;
    return {id: `salvage-${zoneIndex}`, s: atS, lateral,
      x: at.x, y: at.y, z: at.z, collected: false};
  }
  return null;
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
        groundY: at.y, crewId: 'tusk', health: T.health, maxHealth: T.health,
        knockedDown: false, knockdownRemaining: 0, knockdownAwarded: false,
        firedLap: 0};
    });
    const warningS = course.phase(s - 125);
    const warningOff = side * (course.roadHalfWidthAt(warningS) + 2.4);
    return {id: zoneIndex, s, side, raiders,
      salvage: salvageForZone(course, s, side, raiders, zoneIndex),
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
  // The low rock ledges are solid for cars and fighters in this flagged stage.
  // They live in this course instance's collision index, not in saved course
  // geometry, so the ordinary route and its signatures remain unchanged.
  const course = duel.course;
  course.raidLedges = state.raids.zones.flatMap(zone => {
    const crate = zone.salvage;
    return crate ? [{id: `ledge-${crate.id}`, kind: 'salvageLedge',
      s: crate.s, off: crate.lateral, x: crate.x, y: crate.y, z: crate.z,
      heading: course.at(crate.s).heading, halfX: 1.4, halfZ: 1.4,
      height: 1.35, shape: 'box'}] : [];
  });
  const buckets = course.bucketCount;
  for (const ledge of course.raidLedges) {
    const reach = Math.hypot(ledge.halfX, ledge.halfZ) * 1.5 + 20;
    for (let bucket = Math.floor((ledge.s - reach) / 64);
         bucket <= Math.floor((ledge.s + reach) / 64); bucket++) {
      const key = ((bucket % buckets) + buckets) % buckets;
      if (!course.obstacleBuckets.has(key)) course.obstacleBuckets.set(key, []);
      course.obstacleBuckets.get(key).push(ledge);
    }
  }
}

export function damageRaider(duel, raider, amount) {
  const raids = duel.state.raids;
  if (!raids || !Number.isFinite(amount) || amount <= 0 ||
      raider.knockedDown || !raids.zones.some(zone =>
        zone.raiders.includes(raider))) return false;
  raider.health = Math.max(0, raider.health - amount);
  duel.emit({raiderHit: true, raider: raider.id,
    hitPosition: {x: raider.x, y: raider.y + 1, z: raider.z}});
  if (raider.health > 0) return true;
  raider.knockedDown = true;
  raider.knockdownRemaining = T.knockdownSeconds;
  if (!raider.knockdownAwarded) {
    raider.knockdownAwarded = true;
    const combat = duel.state.combat;
    combat.scoring.knockdowns++;
    combat.notorietyEvents ??= [];
    if (combat.notorietyEvents.length < 256) combat.notorietyEvents.push({
      id: `raider-${raider.id}`, type: 'raiderKnockdown',
      owner: 'player', source: 'onFoot',
    });
    duel._callout('RAIDER DOWN / +25 NOTORIETY', 1.6);
  } else duel._callout('RAIDER DOWN', 1.2);
  duel.emit({raiderKnockdown: true, owner: 'player', raider: raider.id,
    hitPosition: {x: raider.x, y: raider.y + 1, z: raider.z}});
  return true;
}

function collectSalvage(duel, zone) {
  const state = duel.state, crate = zone.salvage, fighter = state.fighter;
  if (!crate || crate.collected || !state.onFoot || !fighter ||
      fighter.knockedDown) return;
  const reach = crewPerks(fighter.crewId).crateReachMeters ||
    T.salvageReachMeters;
  if (Math.hypot(fighter.x - crate.x, fighter.z - crate.z) > reach ||
      Math.abs(fighter.y - crate.y) > 1.7) return;
  const weapons = state.footWeapons;
  const rockets = weapons ? Math.min(T.salvageRockets,
    Math.max(0, COMBAT_TUNING.foot.rpgAmmo - weapons.ammo)) : 0;
  const armor = Math.min(T.salvageArmor,
    Math.max(0, state.maxArmor - state.armor));
  if (!rockets && !armor) return;
  crate.collected = true;
  if (weapons && rockets) {
    weapons.ammo += rockets;
    if (state.footGear?.name === 'LONGHORN RPG') state.footGear.ammo = weapons.ammo;
  }
  state.armor += armor;
  duel._callout(`LEDGE SALVAGE / +${rockets} ROCKET +${Math.round(armor)} ARMOR`, 2);
  duel.emit({salvageCollected: true, zone: zone.id, rockets, armor,
    hitPosition: {x: crate.x, y: crate.y + 1, z: crate.z}});
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
  // Each member gets its own sample per lap. Hash the complete identity so
  // camp iteration and other actors' shots cannot consume this aim sequence.
  const state = duel.state;
  const identity = JSON.stringify([duel.course.seed ?? duel.seed,
    state.stageIndex, state.currentLap, raider.id]);
  let aimSeed = RAID_SALT;
  for (let index = 0; index < identity.length; index++) {
    aimSeed = Math.imul(aimSeed ^ identity.charCodeAt(index), 16777619);
  }
  const spread = T.aimError[state.cpuDifficulty] ?? T.aimError.medium;
  const aimBias = makeRng(aimSeed >>> 0).range(-spread, spread);
  const bearing = Math.atan2(dx, dz) + aimBias;
  const originY = raider.y + 1.48;
  combat.projectiles.push({id: ++combat.serial, kind: 'crossbow', enemy: true,
    raid: true, raidZone: zone.id, targetIndex: target.targetIndex,
    launchBearing: bearing, aimBias, level: 0, age: 0,
    x: raider.x + Math.sin(bearing), y: originY,
    z: raider.z + Math.cos(bearing),
    vx: Math.sin(bearing) * speed, vz: Math.cos(bearing) * speed,
    vy: (at.y - originY) / Math.max(1, Math.hypot(dx, dz)) * speed});
  raider.firedLap = duel.state.currentLap;
  zone.nextShotAt = duel.state.stageTimeSec +
    (SHOT_GAP_SECONDS[state.cpuDifficulty] ?? SHOT_GAP_SECONDS.medium);
  zone.shotCount++;
  duel.state.raids.shots++;
  duel.emit({raiderShot: true, zone: zone.id,
    target: target.targetIndex < 0 ? 'player' : 'opponent',
    hitPosition: {x: raider.x, y: originY, z: raider.z}});
  return true;
}

export function stepRaiders(duel, dt = 0) {
  const state = duel.state, raids = state.raids;
  if (!raids || state.status !== 'racing' || state.paused) return;
  for (const zone of raids.zones) {
    for (const raider of zone.raiders) {
      if (!raider.knockedDown || !(dt > 0)) continue;
      raider.knockdownRemaining = Math.max(0,
        raider.knockdownRemaining - dt);
      if (raider.knockdownRemaining <= 1e-8) {
        raider.knockedDown = false;
        raider.health = T.health;
        raider.knockdownRemaining = 0;
      }
    }
    collectSalvage(duel, zone);
    const ahead = duel.relativeS(zone.s, state.s) - state.s;
    if (ahead > 0 && ahead < WARNING_METERS && zone.warnedLap !== state.currentLap) {
      zone.warnedLap = state.currentLap;
      duel._callout('ROADSIDE AMBUSH AHEAD', 2.2);
      duel.emit({raiderWarning: true, zone: zone.id});
    }
    if (state.stageTimeSec < zone.nextShotAt) continue;
    const target = targetFor(duel, zone);
    if (!target) continue;
    const raider = zone.raiders.find(member =>
      !member.knockedDown && member.firedLap !== state.currentLap);
    if (raider) fire(duel, zone, raider, target);
  }
}
