import {normalizeWeapons} from './weapon-upgrades.js';
import {sweepObstacle} from './collision.js';
import {DRIVE} from './config.js';
import {makeRng} from './rng.js';
import {WEAPONS, CPU_COMBAT, COMBAT_TUNING} from './wasteland-tuning.js';

export {WEAPONS};
const T = COMBAT_TUNING;

export const supportsCombat = stage => !!stage?.hasRival && !stage.practice && !stage.stuntTrial;

export function createCombat(levels) {
  return {
    levels: normalizeWeapons({levels}).levels,
    cooldowns: {ufo: 0, bomb: 0, crossbow: 0, star: 0},
    ufoUsedLaps: [],
    shield: 0,
    rivalShield: 0,
    projectiles: [],
    bursts: [],
    pickups: [],
    pickupTimer: T.pickup.initialDelay,
    pickupCount: 0,
    serial: 0,
    aiTimer: null,
    aiShot: 0,
    aiShieldCooldown: 0,
    cpuPickupCharges: {bomb: 0, crossbow: 0, star: 0},
    hits: 0,
    lastUfo: null,
  };
}

export function point(duel, actor) {
  const at = duel.course.groundAt(actor.s, actor.lateral);
  return {...at, y: at.y + T.pointHeight + (actor.airHeight || 0)};
}

export function velocity(actor, at) {
  const heading = at.heading + (actor.headingError || 0);
  const speed = (actor.speedMph || 0) * (actor.dir || 1) * DRIVE.mphToWorld;
  return {
    x: Math.sin(heading) * speed + Math.cos(at.heading) * (actor.pushVelocity || 0),
    z: Math.cos(heading) * speed - Math.sin(at.heading) * (actor.pushVelocity || 0),
  };
}

function predictedPoint(duel, actor, seconds) {
  const frame = duel.course.at(actor.s);
  const speed = (actor.speedMph || 0) * (actor.dir || 1) * DRIVE.mphToWorld;
  const headingError = actor.headingError || 0;
  const along = Math.cos(headingError) * speed /
    Math.max(T.predictionCurveFloor, 1 - frame.curvature * actor.lateral);
  const lateral = Math.sin(headingError) * speed + (actor.pushVelocity || 0);
  return duel.course.groundAt(actor.s + along * seconds, actor.lateral + lateral * seconds);
}

export function burst(combat, at, kind = 'blast') {
  combat.bursts.push({...at, kind, id: ++combat.serial, age: 0});
  if (combat.bursts.length > T.burstLimit) combat.bursts.shift();
}

function relocate(actor, pose) {
  Object.assign(actor, pose);
  actor.prevS = actor.s;
  actor.prevLateral = actor.lateral;
  actor.headingError = pose.headingError || 0;
  actor.yawVelocity = 0;
  actor.pushVelocity = 0;
  actor.slipAngle = 0;
  actor.airborne = false;
  actor.airHeight = 0;
  actor._jumpY = null;
  actor._verticalSpeed = 0;
  actor._airOrigin = null;
  actor._jumpOrigin = null;
  actor.groundHeight = null;
  actor.terrainPitch = null;
  actor.terrainRoll = null;
  actor.tumble = null;
}

export function ufoDestination(duel) {
  const state = duel.state;
  const combat = state.combat;
  const level = combat?.levels.ufo || 0;
  const fromS = state.s;
  const blocked = reason => ({kind: 'blocked', reason, fromS, toS: fromS, gainMeters: 0});
  if (combat?.ufoUsedLaps?.[state.completedLaps]) return blocked('lap-used');
  if (state.nextLapGate === 0) return blocked('charging');

  // A jump cannot bypass an unearned checkpoint or the finish line.
  const next = state.completedLaps * duel.course.length +
    (duel._lapGates[state.nextLapGate] ?? duel.course.length);
  const requested = T.ufo.baseDistance + T.ufo.distancePerLevel * level;
  const upper = Math.min(fromS + requested, next - T.ufo.gateMargin,
    duel.raceLength - T.ufo.gateMargin);
  const spec = duel._vehicleSpec(state);
  const others = [...state.opponents, ...state.traffic, state.police?.pursuit]
    .filter(actor => actor && actor !== state && actor.alive !== false &&
      !actor.crushed && !actor.finished);
  const source = duel._surface(fromS, state.lateral);
  const shortcut = duel.course.features.shortcuts?.find(cut => cut.id === source.shortcutId);

  for (let toS = upper; toS >= fromS + T.ufo.scanStep; toS -= T.ufo.scanStep) {
    const phase = duel.course.phase?.(toS) ?? toS;
    const branch = shortcut && phase >= shortcut.start && phase <= shortcut.end;
    const preferred = branch ? duel.course.shortcutOffset(shortcut, toS) : state.lateral;
    const lanes = [preferred, -DRIVE.laneOffset, DRIVE.laneOffset, 0];
    for (const lateral of [...new Set(lanes)]) {
      if (!duel._surface(toS, lateral).road) continue;
      if (others.some(actor =>
        Math.abs(duel.relativeS(actor.s, toS) - toS) < T.ufo.landingRadius &&
        Math.abs(actor.lateral - lateral) < T.ufo.lateralClearance)) continue;
      const at = duel.course.worldAt(toS, lateral);
      if (duel._obstacles(toS - T.ufo.obstacleReach, toS + T.ufo.obstacleReach)
        .some(obstacle => sweepObstacle(at, at, obstacle, at.heading, spec))) continue;
      return {
        kind: 'jump', fromS, toS, lateral, gainMeters: toS - fromS,
        gateLimited: upper < fromS + requested,
      };
    }
  }
  return blocked(upper < fromS + T.ufo.scanStep ? 'checkpoint' : 'landing');
}

export function fireWeapon(duel, weapon, enemy = false, cpuActor = duel.state.rival) {
  const state = duel.state;
  const combat = state.combat;
  const actor = enemy ? cpuActor : state;
  const target = enemy ? state : state.opponents.length > 1
    ? state.opponents.filter(opponent => !opponent.finished && !opponent.crushed &&
        !opponent.combatWrecking)
      .reduce((closest, opponent) =>
        !closest || Math.abs(duel.relativeS(opponent.s, state.s) - state.s) <
          Math.abs(duel.relativeS(closest.s, state.s) - state.s) ? opponent : closest, null)
    : state.rival;
  if (!combat || state.mode !== 'wasteland' || state.status !== 'racing' ||
      state.paused || !actor || actor.finished || actor.crushed || actor.combatWrecking ||
      actor.impactTimer > 0 || !WEAPONS[weapon]) return false;
  if (!enemy && combat.cooldowns[weapon] > 0) return false;

  const at = point(duel, actor);
  const level = enemy ? 0 : combat.levels[weapon];
  if (weapon === 'ufo') {
    if (enemy) return false;
    const destination = ufoDestination(duel);
    if (destination.kind === 'blocked') {
      duel._callout(destination.reason === 'lap-used' ? 'UFO / ONE JUMP PER LAP' :
        destination.reason === 'charging' ? 'UFO / CHARGES AT FIRST GATE' :
        destination.reason === 'checkpoint' ? 'UFO / CHECKPOINT AHEAD' :
        'UFO / NO SAFE LANDING', T.ufo.calloutSeconds);
      return false;
    }
    combat.ufoUsedLaps[state.completedLaps] = true;
    relocate(state, {s: destination.toS, lateral: destination.lateral});
    const surface = duel._drivingSurface(state.s, state.lateral, duel.car);
    state.speedMph = Math.sign(state.speedMph) *
      Math.min(Math.abs(state.speedMph), surface.speedLimit);
    state.routeId = duel._surface(state.s, state.lateral).shortcutId || null;
    state.routeLap = state.routeId ? state.completedLaps + 1 : null;
    state.assistedLaps ??= (state.lapTimes || []).map(() => false);
    state.assistedLap = true;
    duel._callout(`UFO / JUMP +${Math.round(destination.gainMeters)} m TO ${Math.round(destination.toS)} m`,
      T.ufo.calloutSeconds);
    combat.lastUfo = {...destination};
    combat.shield = Math.max(combat.shield, T.ufo.invulnerability);
    state.invulnerableSec = Math.max(state.invulnerableSec, T.ufo.invulnerability);
    burst(combat, at, 'ufo');
    burst(combat, point(duel, state), 'ufo');
  } else if (weapon === 'star') {
    if (enemy) {
      if (actor === state.rival) combat.rivalShield = T.shieldDuration;
      else actor.combatShield = T.shieldDuration;
    } else {
      combat.shield = T.shieldDuration;
      state.invulnerableSec = Math.max(state.invulnerableSec, T.shieldDuration);
    }
    burst(combat, at, 'star');
  } else {
    if (weapon === 'crossbow' && (!target || target.finished || target.crushed ||
        target.combatWrecking)) return false;
    const count = weapon === 'bomb' ? T.bomb.baseCount + T.bomb.countPerLevel * level : 1;
    if (combat.projectiles.length + count > T.projectileLimit) return false;
    // A moving car throws the bomb ring with its own velocity.
    const travelHeading = at.heading + (actor.headingError || 0);
    const travelSpeed = (actor.speedMph || 0) * (actor.dir || 1) * DRIVE.mphToWorld;
    const carryX = weapon === 'bomb'
      ? Math.sin(travelHeading) * travelSpeed + Math.cos(at.heading) * (actor.pushVelocity || 0)
      : 0;
    const carryZ = weapon === 'bomb'
      ? Math.cos(travelHeading) * travelSpeed - Math.sin(at.heading) * (actor.pushVelocity || 0)
      : 0;

    for (let index = 0; index < count; index++) {
      let dx, dz, speed;
      let vy = T.projectileInitialVerticalSpeed;
      if (weapon === 'bomb') {
        const angle = at.heading + index * Math.PI * 2 / count;
        dx = Math.sin(angle);
        dz = Math.cos(angle);
        speed = T.bomb.launchSpeed;
      } else {
        const goal = point(duel, target);
        speed = T.crossbow.baseSpeed + T.crossbow.speedPerLevel * level;
        let aimX = goal.x;
        let aimZ = goal.z;
        if (enemy) {
          const travel = Math.min(T.crossbow.leadTime,
            Math.hypot(goal.x - at.x, goal.z - at.z) / speed);
          const predicted = predictedPoint(duel, target, travel);
          aimX = predicted.x;
          aimZ = predicted.z;
        }
        dx = aimX - at.x;
        dz = aimZ - at.z;
        const length = Math.hypot(dx, dz) || 1;
        dx /= length;
        dz /= length;
        if (enemy) {
          const spread = CPU_COMBAT[state.cpuDifficulty]?.aimError ?? CPU_COMBAT.medium.aimError;
          const error = makeRng((duel.seed ^
            (state.stageIndex * T.cpu.aimSeedStageSalt) ^
            (combat.aiShot * T.cpu.aimSeedShotSalt)) >>> 0).range(-spread, spread);
          const x = dx * Math.cos(error) + dz * Math.sin(error);
          dz = dz * Math.cos(error) - dx * Math.sin(error);
          dx = x;
        }
        vy = (goal.y - at.y - T.crossbow.aimHeightOffset) / length * speed;
      }
      combat.projectiles.push({
        id: ++combat.serial, kind: weapon, enemy, level,
        x: at.x + dx * T.projectileSpawnOffset,
        y: at.y + T.projectileSpawnHeight,
        z: at.z + dz * T.projectileSpawnOffset,
        vx: dx * speed + carryX,
        vz: dz * speed + carryZ,
        vy, age: 0,
        ...(enemy && actor !== state.rival ? {sourceIndex: state.opponents.indexOf(actor)} : {}),
      });
    }
  }
  if (!enemy) combat.cooldowns[weapon] = WEAPONS[weapon].cooldown *
    (1 - level * T.cooldownUpgradeDiscount);
  duel.emit({weaponFired: weapon});
  return true;
}
