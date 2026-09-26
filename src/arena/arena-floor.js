import {DRIVE} from '../config.js';
import {wrapHeading} from '../offroad-physics.js';
import {applySceneryArmorDamage} from '../combat-armor.js';

// Floor rules shared by every car in an arena event (docs/SCRAPDOME.md 2).
// The walls are a smooth solid boundary: a glancing touch slides along the
// wall, a steep hit stops the car, and only a hard hit costs armor.
export const FLOOR_RULES = Object.freeze({
  steepSine: .7, steepSpeedKeep: .2, damageNormalMph: 30, damageCooldownSec: .6,
});

export function worldPose(duel, actor) {
  const frame = duel.course.at(actor.s), at = duel.course.worldAt(actor.s, actor.lateral);
  return {x: at.x, z: at.z, heading: frame.heading + (actor.headingError || 0)};
}

export function floorLimit(duel) {
  return duel.course.def.scrapdome?.floorHalfWidth ?? duel.course.roadHalfWidthAt(0);
}

// Returns the speed into the wall in mph, or 0 when the car stayed on the floor.
export function containInArena(duel, actor, dt) {
  actor._arenaWallCooldown = Math.max(0, (actor._arenaWallCooldown || 0) - (dt || 0));
  const limit = floorLimit(duel);
  if (!(Math.abs(actor.lateral) > limit)) return 0;
  const outward = Math.sign(actor.lateral);
  const heading = actor.headingError || 0, speed = actor.speedMph || 0;
  const normalMph = Math.max(0, outward * (Math.sin(heading) * speed +
    (actor.pushVelocity || 0) / DRIVE.mphToWorld));
  actor.lateral = outward * limit;
  if (outward * (actor.pushVelocity || 0) > 0) actor.pushVelocity = 0;
  if (Math.abs(Math.sin(heading)) > FLOOR_RULES.steepSine) {
    actor.speedMph = speed * FLOOR_RULES.steepSpeedKeep;
  } else if (outward * Math.sin(heading) * Math.sign(speed || 1) > 0) {
    // Slide: keep the along-wall part of the motion and line up with the wall.
    actor.speedMph = speed * Math.abs(Math.cos(heading));
    actor.headingError = wrapHeading(Math.cos(heading) >= 0 ? 0 : Math.PI);
    actor.yawVelocity = 0;
  }
  if (normalMph > FLOOR_RULES.damageNormalMph && actor._arenaWallCooldown === 0) {
    actor._arenaWallCooldown = FLOOR_RULES.damageCooldownSec;
    applySceneryArmorDamage(duel, actor);
    duel.emit({arenaWallHit: {id: actor === duel.state ? 'player' : actor.arenaId,
      normalMph: Math.round(normalMph)}});
  }
  return normalMph;
}
