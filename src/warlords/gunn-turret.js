import turretLayout from '../../tools/blender/gunn-turret.json' with {type: 'json'};
import {vehicleGroundPoint, TIRE_CLEARANCE} from '../vehicle-surface.js';

Object.freeze(turretLayout.headPivot);
turretLayout.mouths.forEach(Object.freeze); Object.freeze(turretLayout.mouths);
Object.values(turretLayout.mounts).forEach(Object.freeze); Object.freeze(turretLayout.mounts);
export const GUNN_TURRET_LAYOUT = Object.freeze(turretLayout);

export function gunnTurretMount(car) {
  return turretLayout.mounts[car] || null;
}

export function gunnTurretPose(duel, actor) {
  const frame = duel.course.at(actor.s), at = duel.course.worldAt(actor.s, actor.lateral);
  const mount = gunnTurretMount(actor.car);
  if (!mount) return null;
  const heading = frame.heading + (actor.headingError || 0);
  const c = Math.cos(heading), s = Math.sin(heading);
  return {x: at.x + mount[0] * c + mount[2] * s,
    y: vehicleGroundPoint(duel.course, actor.s, actor.lateral).y + TIRE_CLEARANCE + (actor.airHeight || 0) + mount[1],
    z: at.z - mount[0] * s + mount[2] * c, heading};
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
