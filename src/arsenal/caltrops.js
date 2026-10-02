import {point} from '../combat-weapons.js';
import {applyArmorDamage, combatShielded} from '../combat-armor.js';
import {combatOwnerId, outOfPlay} from '../combat-teams.js';
import {addHazard, carBodyPoint} from './hazards.js';
import {setCarEffect} from './car-effects.js';
import {enemiesBehind} from './targeting.js';

export function deployCaltrops(duel, owner, level = 0) {
  if (!owner || outOfPlay(duel, owner)) return null;
  const at = point(duel, owner), heading = at.heading + (owner.headingError || 0);
  const strip = addHazard(duel, {kind: 'caltrops', shape: 'strip',
    x: at.x - Math.sin(heading) * 3, z: at.z - Math.cos(heading) * 3, y: at.y,
    heading, length: 8, width: 5, lifetime: 8, owner, ownerGraceSec: 1,
    onTouch(actor) {
      if (combatShielded(duel, actor)) return;
      const removed = applyArmorDamage(duel, actor, 'caltrops',
        {level, owner: combatOwnerId(duel, owner)});
      if (!(removed > 0)) return;
      if (!actor.combatWrecking) setCarEffect(actor, 'grip',
        {duration: 4, grip: .75, topSpeed: .9});
      const body = carBodyPoint(duel, actor);
      duel.emit({combatHit: true, strength: removed / 60, enemy: owner !== duel.state,
        victim: actor === duel.state ? 'player' : 'rival',
        hitPosition: {x: body.x, y: body.y, z: body.z}});
      duel.emit({arsenalCue: 'weapon.caltrops.hit', actor,
        hazard: strip, hitPosition: {x: body.x, y: body.y, z: body.z}});
    }});
  if (strip) duel.emit({arsenalCue: 'weapon.caltrops.deploy', actor: owner,
    hazard: strip, hitPosition: {x: strip.x, y: strip.y, z: strip.z}});
  return strip;
}

export function shouldUseCaltrops(duel, owner) {
  return enemiesBehind(duel, owner, 40).length > 0;
}
