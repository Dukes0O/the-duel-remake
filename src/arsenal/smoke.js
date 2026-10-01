import {point} from '../combat-weapons.js';
import {DRIVE} from '../config.js';
import {arenaParticipant, outOfPlay} from '../combat-teams.js';
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

export function shouldUseSmoke(duel, owner) {
  const hit = arenaParticipant(duel, owner);
  const elapsed = duel.state.stageTimeSec - (hit?.lastHitAt ?? -Infinity);
  return !!hit?.lastHitBy && elapsed >= 0 && elapsed <= 5 &&
    enemiesBehind(duel, owner, 50).length > 0;
}
