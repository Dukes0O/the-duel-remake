import {point} from '../combat-weapons.js';
import {DRIVE} from '../config.js';
import {arenaActor, hostile, outOfPlay} from '../combat-teams.js';
import {addHazard} from './hazards.js';
import {enemiesBehind} from './targeting.js';

export function deploySmoke(duel, owner) {
  if (!owner || outOfPlay(duel, owner)) return null;
  const at = point(duel, owner), heading = at.heading + (owner.headingError || 0);
  const drift = Math.max(0, owner.speedMph || 0) * DRIVE.mphToWorld * .3;
  const smoke = addHazard(duel, {kind: 'smoke', shape: 'circle',
    x: at.x - Math.sin(heading) * 4, z: at.z - Math.cos(heading) * 4, y: at.y,
    radius: 6, lifetime: 5, owner, driftSec: 1,
    driftX: -Math.sin(heading) * drift, driftZ: -Math.cos(heading) * drift});
  if (smoke) duel.emit({arsenalCue: 'weapon.smoke.deploy', actor: owner, hazard: smoke,
    hitPosition: {x: smoke.x, y: smoke.y, z: smoke.z}});
  return smoke;
}

const recentHits = new WeakMap();

export function clearSmokeHistory(duel, actor) {
  if (actor) recentHits.get(duel)?.delete(actor);
  else recentHits.delete(duel);
}

export function noteSmokeHit(duel, victim, removed, ownerId) {
  if (!(removed > 0) || !ownerId) return;
  const owner = duel.state.arena ? arenaActor(duel, ownerId) :
    ownerId === 'player' ? duel.state :
    ownerId === 'cpu' && victim === duel.state ? duel.state.rival : null;
  if (!owner || !hostile(duel, owner, victim)) return;
  let hits = recentHits.get(duel);
  if (!hits) recentHits.set(duel, hits = new WeakMap());
  hits.set(victim, duel.state.stageTimeSec);
}

export function shouldUseSmoke(duel, owner) {
  const elapsed = duel.state.stageTimeSec - (recentHits.get(duel)?.get(owner) ?? -Infinity);
  return elapsed >= 0 && elapsed <= 5 &&
    enemiesBehind(duel, owner, 50).length > 0;
}
