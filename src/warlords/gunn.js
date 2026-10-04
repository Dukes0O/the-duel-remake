import {DRIVE} from '../config.js';
import {sweepObstacle} from '../collision.js';
import {arenaActor, outOfPlay} from '../combat-teams.js';
import {worldPose} from '../arena/arena-floor.js';
import {arenaCarSpec} from '../arena/arena-pilot.js';
import {arenaFloorSpeed} from '../arena/venues.js';
import {point, velocity} from '../combat-weapons.js';
import {launchAimedRocket, rocketArrivalSeconds} from '../arsenal/rockets.js';
import turretLayout from '../../tools/blender/gunn-turret.json' with {type: 'json'};

Object.freeze(turretLayout.headPivot);
turretLayout.mouths.forEach(Object.freeze); Object.freeze(turretLayout.mouths);
Object.values(turretLayout.mounts).forEach(Object.freeze); Object.freeze(turretLayout.mounts);
export const GUNN_TURRET_LAYOUT = Object.freeze(turretLayout);

export function gunnTurretMount(car) {
  return turretLayout.mounts[car] || null;
}

export function gunnTurretPose(duel, actor) {
  const at = worldPose(duel, actor), mount = gunnTurretMount(actor.car);
  if (!mount) return null;
  const c = Math.cos(at.heading), s = Math.sin(at.heading);
  return {x: at.x + mount[0] * c + mount[2] * s,
    y: duel.course.groundAt(actor.s, actor.lateral).y + (actor.airHeight || 0) + mount[1],
    z: at.z - mount[0] * s + mount[2] * c, heading: at.heading};
}

export function gunnTurretHeading(duel, actor) {
  const at = gunnTurretPose(duel, actor), aim = actor.gunnBarrage?.aim;
  return at && Number.isFinite(aim?.x) && Number.isFinite(aim?.z)
    ? Math.atan2(aim.x - at.x, aim.z - at.z) : at?.heading ?? 0;
}

export function gunnTurretPitch(duel, actor) {
  const at = gunnTurretPose(duel, actor), aim = actor.gunnBarrage?.aim;
  return at && Number.isFinite(aim?.y) ? -Math.atan2(aim.y - at.y - turretLayout.headPivot[1],
    Math.hypot(aim.x - at.x, aim.z - at.z)) : 0;
}

export function gunnTubeOrigin(duel, actor, slot = 0) {
  const at = gunnTurretPose(duel, actor);
  if (!at) return null;
  const mouth = turretLayout.mouths[slot % turretLayout.mouths.length];
  const head = turretLayout.headPivot, heading = gunnTurretHeading(duel, actor);
  const c = Math.cos(heading), s = Math.sin(heading), pitch = gunnTurretPitch(duel, actor);
  const y = mouth[1] * Math.cos(pitch) - mouth[2] * Math.sin(pitch);
  const z = mouth[1] * Math.sin(pitch) + mouth[2] * Math.cos(pitch);
  return {x: at.x + (head[0] + mouth[0]) * c + (head[2] + z) * s,
    y: at.y + head[1] + y,
    z: at.z - (head[0] + mouth[0]) * s + (head[2] + z) * c};
}

export const GUNN_RULES = Object.freeze({
  cooldownSec: Object.freeze({easy: 9, medium: 7, hard: 5}),
  barrageNear: 25, barrageFar: 90, singleNear: 40, singleFar: 80,
  singleSec: 3, spacingSec: .25, windowSec: 3, afterBarrageSec: 2,
  windowSpeedShare: .8, windowDamageShare: 1.5,
});
const EPS = 1e-9;

export function resetGunn(duel, actor) {
  const now = duel.state.stageTimeSec || 0;
  actor.gunnBarrage = {stage: 'idle', nextBarrageSec: now + cooldown(duel),
    nextSingleSec: now + GUNN_RULES.singleSec, sinceSec: now,
    aim: null, fired: 0, shots: 0, tubeSlot: 0};
  actor.arenaTellSec = 0;
}
function cooldown(duel) {
  return GUNN_RULES.cooldownSec[duel.state.cpuDifficulty] ?? GUNN_RULES.cooldownSec.medium;
}
function sight(duel, actor, target) {
  const from = worldPose(duel, actor), to = worldPose(duel, target);
  from.y = duel.course.groundAt(actor.s, actor.lateral).y + 1;
  to.y = duel.course.groundAt(target.s, target.lateral).y + 1;
  const a = duel.course.nearest(from.x, from.z), b = duel.course.nearest(to.x, to.z, a.s);
  return !(duel._obstacles?.(Math.min(a.s, b.s) - 100, Math.max(a.s, b.s) + 100) || [])
    .some(obstacle => sweepObstacle(from, to, obstacle, 0,
      {halfWidth: 0, halfLength: 0, height: 0}));
}
// Solve the first rocket's arrival against the player's current velocity.
function predict(duel, actor, target) {
  const from = gunnTubeOrigin(duel, actor) || worldPose(duel, actor), at = worldPose(duel, target);
  const speed = (target.speedMph || 0) * DRIVE.mphToWorld;
  const vx = Math.sin(at.heading) * speed, vz = Math.cos(at.heading) * speed;
  const dx = at.x - from.x, dz = at.z - from.z;
  const carry = velocity(actor, point(duel, actor));
  const seconds = rocketArrivalSeconds(dx, dz, vx - carry.x, vz - carry.z);
  return {x: at.x + vx * seconds, y: point(duel, target).y, z: at.z + vz * seconds};
}
function setStage(duel, participant, actor, stage) {
  actor.gunnBarrage.stage = stage;
  actor.gunnBarrage.sinceSec = duel.state.stageTimeSec;
  actor.arenaTellSec = 0;
  participant.tellLeft = 0; participant.goal = null; participant.reactionSec = 0;
}
function window(duel, participant, actor, now) {
  const move = actor.gunnBarrage;
  setStage(duel, participant, actor, 'window');
  move.untilSec = now + GUNN_RULES.windowSec;
  move.nextSingleSec = Math.max(move.nextSingleSec, now + GUNN_RULES.afterBarrageSec);
  duel._callout("HIS GUN'S COOKED. GET HIM!", GUNN_RULES.windowSec);
  duel.emit({gunnOverheat: {id: actor.arenaId, seconds: GUNN_RULES.windowSec}});
}
function goal(duel, actor, target, difficulty, share = 1) {
  const me = worldPose(duel, actor), at = worldPose(duel, target);
  const distance = Math.hypot(at.x - me.x, at.z - me.z);
  const top = arenaFloorSpeed(duel.course.def.scrapdome,
    arenaCarSpec(duel, actor).topSpeed) * difficulty.pace * share;
  const away = Math.atan2(me.x - at.x, me.z - at.z);
  if (distance < GUNN_RULES.singleNear) return {
    x: me.x + Math.sin(away) * 40, z: me.z + Math.cos(away) * 40,
    speedMph: top, boost: false};
  if (distance > GUNN_RULES.singleFar) return {x: at.x, z: at.z, speedMph: top * .78, boost: false};
  return {x: at.x + Math.sin(away + Math.PI / 2) * 60,
    z: at.z + Math.cos(away + Math.PI / 2) * 60, speedMph: top * .78, boost: false};
}
export function thinkGunn(duel, participant, actor, difficulty) {
  if (!actor.gunnBarrage) resetGunn(duel, actor);
  const move = actor.gunnBarrage, now = duel.state.stageTimeSec;
  const target = arenaActor(duel, 'player');
  if (outOfPlay(duel, actor) || !target || outOfPlay(duel, target)) {
    resetGunn(duel, actor); return null;
  }
  if (move.stage === 'window') {
    if (now + EPS < move.untilSec)
      return goal(duel, actor, target, difficulty, GUNN_RULES.windowSpeedShare);
    setStage(duel, participant, actor, 'idle');
  }
  if (move.stage === 'tell') {
    actor.arenaTellSec = Math.max(0, move.untilSec - now);
    move.aim = point(duel, target);
    if (now + EPS < move.untilSec) return goal(duel, actor, target, difficulty);
    if (!sight(duel, actor, target)) {
      window(duel, participant, actor, now); return goal(duel, actor, target, difficulty, .8);
    }
    move.aim = predict(duel, actor, target);
    move.firstShotSec = move.untilSec;
    setStage(duel, participant, actor, 'barrage');
  }
  if (move.stage === 'barrage') {
    while (move.fired < move.shots && now + EPS >= move.firstShotSec + move.fired * GUNN_RULES.spacingSec) {
      launchAimedRocket(duel, actor, move.aim,
        {launchedAt: move.firstShotSec + move.fired * GUNN_RULES.spacingSec,
          origin: gunnTubeOrigin(duel, actor, move.fired)});
      move.fired++;
    }
    if (move.fired >= move.shots) window(duel, participant, actor, now);
    return goal(duel, actor, target, difficulty, move.stage === 'window' ? .8 : 1);
  }
  const me = worldPose(duel, actor), at = worldPose(duel, target);
  const distance = Math.hypot(at.x - me.x, at.z - me.z), clear = sight(duel, actor, target);
  if (now + EPS >= move.nextBarrageSec && distance >= GUNN_RULES.barrageNear &&
      distance <= GUNN_RULES.barrageFar && clear) {
    setStage(duel, participant, actor, 'tell');
    const seconds = difficulty.tellSec * (duel.state.arena.warlordPhase === 2 ? .8 : 1);
    move.untilSec = now + seconds; move.nextBarrageSec = now + cooldown(duel);
    move.shots = duel.state.arena.warlordPhase === 2 ? 5 : 3; move.fired = 0;
    move.aim = point(duel, target); actor.arenaTellSec = seconds;
    duel._callout('BARRAGE!', seconds + .4);
    duel.emit({arenaTell: {id: actor.arenaId, targetId: 'player', seconds,
      position: {x: me.x, y: duel.course.groundAt(actor.s, actor.lateral).y, z: me.z}}});
  } else if (now + EPS >= move.nextSingleSec && distance >= GUNN_RULES.singleNear &&
      distance <= GUNN_RULES.singleFar && clear) {
    move.aim = point(duel, target);
    launchAimedRocket(duel, actor, move.aim, {launchedAt: now,
      origin: gunnTubeOrigin(duel, actor, move.tubeSlot++)});
    move.nextSingleSec = now + GUNN_RULES.singleSec;
  }
  return goal(duel, actor, target, difficulty);
}
export const GUNN_FIGHT = Object.freeze({featureFlag: 'gunn', reset: resetGunn, think: thinkGunn,
  mayFire: () => false,
  defense: (duel, actor) => actor.gunnBarrage?.stage === 'window' ? GUNN_RULES.windowDamageShare : 1});
