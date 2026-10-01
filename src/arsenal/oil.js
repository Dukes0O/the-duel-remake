import {point} from '../combat-weapons.js';
import {combatShielded} from '../combat-armor.js';
import {outOfPlay} from '../combat-teams.js';
import {addHazard, hazardsFor} from './hazards.js';
import {setCarEffect} from './car-effects.js';
import {enemiesBehind} from './targeting.js';

export function deployOil(duel, owner) {
  if (!owner || outOfPlay(duel, owner)) return null;
  const at = point(duel, owner), heading = at.heading + (owner.headingError || 0);
  const oil = addHazard(duel, {kind: 'oil', shape: 'circle',
    x: at.x - Math.sin(heading) * 4, z: at.z - Math.cos(heading) * 4, y: at.y,
    radius: 3.5, lifetime: 6, fadeSec: 1, owner, ownerGraceSec: 1,
    onTouch(actor) {
      if (combatShielded(duel, actor)) return;
      const body = point(duel, actor), facing = body.heading + (actor.headingError || 0);
      const side = (body.x - oil.x) * Math.cos(facing) - (body.z - oil.z) * Math.sin(facing);
      setCarEffect(actor, 'slick', {duration: .7, grip: .35});
      setCarEffect(actor, 'nitro', {duration: 0});
      actor.yawVelocity = (actor.yawVelocity || 0) + (Math.sign(side) || 1) * 2.2;
      actor.speedMph *= .85;
      duel.emit({arsenalCue: 'weapon.oil.slip', actor, hazard: oil,
        hitPosition: {x: body.x, y: body.y, z: body.z}});
    }});
  if (oil) duel.emit({arsenalCue: 'weapon.oil.deploy', actor: owner, hazard: oil,
    hitPosition: {x: oil.x, y: oil.y, z: oil.z}});
  return oil;
}

export function shouldUseOil(duel, owner) {
  return enemiesBehind(duel, owner, 30, true).length > 0;
}

export function oilThreat(duel, car, difficulty) {
  if (!['medium', 'hard'].includes(difficulty) || !car || outOfPlay(duel, car)) return null;
  const at = point(duel, car), heading = at.heading + (car.headingError || 0);
  let nearest = null, nearestDistance = Infinity;
  for (const hazard of hazardsFor(duel)) {
    if (hazard.kind !== 'oil' || hazard.opacity <= 0 || hazard.age >= hazard.lifetime) continue;
    const dx = hazard.x - at.x, dz = hazard.z - at.z, distance = Math.hypot(dx, dz);
    if (distance > 60 || distance >= nearestDistance ||
        dx * Math.sin(heading) + dz * Math.cos(heading) <= 0) continue;
    nearest = hazard;
    nearestDistance = distance;
  }
  return nearest;
}
