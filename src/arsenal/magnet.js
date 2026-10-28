import {point} from '../combat-actors.js';
import {outOfPlay} from '../combat-teams.js';
import {actorForTarget, targetIdentity} from './targeting.js';

export const MAGNET_RULES = Object.freeze({
  duration: 6, range: 40, pullSpeed: 12,
});
const EPS = 1e-9;
function eligible(crate) {
  return crate && !crate.collected && !crate.expired &&
    ['armor', 'weapon', 'salvage'].includes(crate.kind) &&
    Number.isFinite(crate.s) && Number.isFinite(crate.lateral ?? 0);
}
function position(duel, crate) {
  return duel.course.groundAt(crate.s, crate.lateral ?? 0);
}
function distance(duel, owner, crate) {
  const at = point(duel, owner), target = position(duel, crate);
  return Math.hypot(target.x - at.x, target.z - at.z);
}
export function shouldUseScrapMagnet(duel, owner) {
  if (!owner || outOfPlay(duel, owner)) return false;
  let count = 0;
  for (const crate of duel.state.combat?.pickups || [])
    if (eligible(crate) && distance(duel, owner, crate) <= MAGNET_RULES.range + EPS &&
        ++count >= 2) return true;
  return false;
}
export function startScrapMagnet(duel, owner) {
  const combat = duel.state.combat;
  if (!combat || !owner || outOfPlay(duel, owner)) return null;
  combat.magnets ||= [];
  const ownerId = targetIdentity(duel, owner);
  if (combat.magnets.some(magnet => magnet.ownerId === ownerId)) return null;
  const magnet = {ownerId, age: 0};
  combat.magnets.push(magnet);
  const at = point(duel, owner);
  duel.emit({arsenalCue: 'weapon.magnet.hum', actor: owner, magnet,
    hitPosition: {x: at.x, y: at.y, z: at.z}});
  return magnet;
}
export function endScrapMagnet(duel, owner, reason = 'tesla') {
  const combat = duel.state.combat, ownerId = targetIdentity(duel, owner);
  if (!combat?.magnets?.length) return false;
  const before = combat.magnets.length;
  combat.magnets = combat.magnets.filter(magnet => magnet.ownerId !== ownerId);
  if (combat.magnets.length === before) return false;
  duel.emit({arsenalMagnetEnded: true, ownerId, reason});
  return true;
}
export function stepScrapMagnets(duel, dt) {
  const combat = duel.state.combat;
  if (!combat?.magnets?.length || !(dt > 0)) return;
  const active = [];
  for (const magnet of combat.magnets) {
    const owner = actorForTarget(duel, magnet.ownerId);
    if (!owner || outOfPlay(duel, owner)) continue;
    const live = Math.min(dt, Math.max(0, MAGNET_RULES.duration - magnet.age));
    if (live > 0) active.push({magnet, owner, live});
  }
  // Pick the nearest active magnet once per crate. This avoids double motion
  // when cars overlap; equal-distance ties retain actor order.
  for (const crate of combat.pickups || []) {
    if (!eligible(crate)) continue;
    let chosen = null, best = MAGNET_RULES.range + EPS;
    for (const candidate of active) {
      const d = distance(duel, candidate.owner, crate);
      if (d < best) {best = d; chosen = candidate;}
    }
    if (!chosen || best <= EPS) continue;
    const from = position(duel, crate), to = point(duel, chosen.owner);
    const portion = Math.min(1, MAGNET_RULES.pullSpeed * chosen.live / best);
    const nextX = from.x + (to.x - from.x) * portion;
    const nextZ = from.z + (to.z - from.z) * portion;
    const nearest = duel.course.nearest(nextX, nextZ, crate.s);
    crate.s = nearest.s;
    crate.lateral = nearest.lateral;
    // Native road and arena pickup steps remain the only reward path.
  }
  for (const magnet of combat.magnets) magnet.age += dt;
  combat.magnets = combat.magnets.filter(magnet =>
    magnet.age + EPS < MAGNET_RULES.duration &&
    !outOfPlay(duel, actorForTarget(duel, magnet.ownerId)));
}
