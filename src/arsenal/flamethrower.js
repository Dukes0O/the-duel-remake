import {point} from '../combat-actors.js';
import {applyArmorDamage, armorDamageFor, combatShielded} from '../combat-armor.js';
import {combatOwnerId, hostile, outOfPlay} from '../combat-teams.js';
import {targetFor, targetIdentity, actorForTarget} from './targeting.js';
import {setCarEffect} from './car-effects.js';

export const FLAME_RULES = Object.freeze({
  duration: 3, range: 9, halfConeRadians: 15 * Math.PI / 180,
  directArmorPerSecond: 8, burnDuration: 1.5,
  burnArmorPerSecond: 4,
});
const EPS = 1e-9;
function defaultDamage(duel, actor, amount, owner, {styleHit = true} = {}) {
  return applyArmorDamage(duel, actor, 'crossbow', {
    owner: combatOwnerId(duel, owner), level: 0,
    damageMultiplier: amount / armorDamageFor('crossbow'), styleHit,
  });
}
export function flameCpuAim(distance, angleRadians) {
  return Number.isFinite(distance) && Number.isFinite(angleRadians) &&
    distance <= FLAME_RULES.range + EPS && distance >= 0 &&
    Math.abs(angleRadians) <= FLAME_RULES.halfConeRadians + EPS;
}
function insideCone(duel, owner, actor) {
  const at = point(duel, owner), target = point(duel, actor);
  const dx = target.x - at.x, dz = target.z - at.z;
  const bearing = Math.atan2(dx, dz);
  const heading = at.heading + (owner.headingError || 0);
  const angle = Math.atan2(Math.sin(bearing - heading),
    Math.cos(bearing - heading));
  return flameCpuAim(Math.hypot(dx, dz), angle);
}
export function startFlamethrower(duel, owner, level = 0) {
  const combat = duel.state.combat;
  if (!combat || !owner || outOfPlay(duel, owner)) return null;
  combat.flameBursts ||= [];
  if (combat.flameBursts.some(burst => burst.ownerId === targetIdentity(duel, owner)))
    return null;
  const burst = {id: ++combat.serial, ownerId: targetIdentity(duel, owner),
    level, age: 0, styledTargets: []};
  combat.flameBursts.push(burst);
  const at = point(duel, owner);
  duel.emit({arsenalCue: 'weapon.flame.start', actor: owner,
    hitPosition: {x: at.x, y: at.y, z: at.z}});
  duel.emit({arsenalCue: 'weapon.flame.loop', actor: owner, burst,
    hitPosition: {x: at.x, y: at.y, z: at.z}});
  return burst;
}
export function shouldUseFlamethrower(duel, owner) {
  const at = point(duel, owner);
  const target = targetFor(duel, owner, {range: FLAME_RULES.range, origin: at});
  return !!target && insideCone(duel, owner, target);
}
export function stepFlamethrowers(duel, dt, {damageCar = defaultDamage,
  shielded = combatShielded} = {}) {
  const combat = duel.state.combat;
  if (!combat || !(dt > 0)) return;
  combat.flameBursts ||= [];
  combat.flameBurns ||= {};
  const inside = new Set();
  for (const burst of combat.flameBursts) {
    const owner = actorForTarget(duel, burst.ownerId);
    const live = !owner || outOfPlay(duel, owner) ? 0 :
      Math.min(dt, Math.max(0, FLAME_RULES.duration - burst.age));
    if (live > 0) for (const actor of [duel.state, ...duel.state.opponents]) {
      if (actor === owner || outOfPlay(duel, actor) ||
          !hostile(duel, owner, actor) || !insideCone(duel, owner, actor) ||
          shielded(duel, actor)) continue;
      const id = targetIdentity(duel, actor);
      inside.add(id);
      const removed = damageCar(duel, actor,
        FLAME_RULES.directArmorPerSecond * live, owner,
        {styleHit: !burst.styledTargets.includes(id)});
      if (removed > 0 && !burst.styledTargets.includes(id))
        burst.styledTargets.push(id);
      combat.flameBurns[id] = {remainingSec: FLAME_RULES.burnDuration,
        ownerId: burst.ownerId};
      setCarEffect(actor, 'burning', {duration: FLAME_RULES.burnDuration});
    }
    burst.age += dt;
    if (burst.age + EPS >= FLAME_RULES.duration || !live) {
      const at = owner && point(duel, owner);
      duel.emit({arsenalCue: 'weapon.flame.end', actor: owner, burst,
        ...(at ? {hitPosition: {x: at.x, y: at.y, z: at.z}} : {})});
    }
  }
  combat.flameBursts = combat.flameBursts.filter(burst =>
    burst.age + EPS < FLAME_RULES.duration &&
    !outOfPlay(duel, actorForTarget(duel, burst.ownerId)));
  for (const [id, burn] of Object.entries(combat.flameBurns)) {
    if (inside.has(id)) continue;
    const actor = actorForTarget(duel, id), owner = actorForTarget(duel, burn.ownerId);
    const live = Math.min(dt, burn.remainingSec);
    if (actor && !outOfPlay(duel, actor) && owner &&
        hostile(duel, owner, actor) && !shielded(duel, actor))
      damageCar(duel, actor, FLAME_RULES.burnArmorPerSecond * live, owner, {styleHit: false});
    burn.remainingSec -= dt;
    if (burn.remainingSec <= EPS) {
      delete combat.flameBurns[id];
      if (actor) setCarEffect(actor, 'burning', {duration: 0});
    }
  }
}
