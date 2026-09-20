import { DRIVE } from './config.js';

// Match the road-aligned swept-contact shell, including a turned/sliding car.
// Planning and the final contact guard must agree about what blocks a lane.
export function vehicleContactEnvelope(a, b, specA, specB) {
  const angleA = (a.headingError || 0) + (a.slipAngle || 0), angleB = (b.headingError || 0) + (b.slipAngle || 0);
  return {
    width: specA.halfWidth * Math.abs(Math.cos(angleA)) + specB.halfWidth * Math.abs(Math.cos(angleB))
      + specA.halfLength * Math.abs(Math.sin(angleA)) + specB.halfLength * Math.abs(Math.sin(angleB)) + .2,
    length: specA.halfLength * Math.abs(Math.cos(angleA)) + specB.halfLength * Math.abs(Math.cos(angleB))
      + specA.halfWidth * Math.abs(Math.sin(angleA)) + specB.halfWidth * Math.abs(Math.sin(angleB)) + .3,
  };
}

function velocity(actor) {
  const speed = actor.speedMph * (actor.dir || 1);
  return { x: Math.sin(actor.headingError || 0) * speed * DRIVE.mphToWorld + (actor.pushVelocity || 0),
    z: Math.cos(actor.headingError || 0) * speed * DRIVE.mphToWorld };
}

// Pure local safety plan. lead is the player's lap-relative S minus NPC S;
// direction converts it to the NPC's travel frame, including oncoming traffic.
export function planNpcYield({ player, npc, lead, envelope, targetMph, plannedHeading = npc.headingError || 0 }) {
  const direction = npc.dir || 1, ahead = lead * direction;
  if (!Number.isFinite(ahead) || ahead < -envelope.length || ahead > 260) return { yielding: false, targetMph, braking: 110 };
  const pv = velocity(player), nv = velocity(npc), lateral = player.lateral - npc.lateral, horizon = .7;
  const future = lateral + (pv.x - nv.x) * horizon;
  const planned = lateral + (pv.x - Math.sin(plannedHeading) * npc.speedMph * direction * DRIVE.mphToWorld - (npc.pushVelocity || 0)) * horizon;
  const width = envelope.width + .3;
  const crosses = Math.abs(lateral) < width || Math.abs(future) < width || lateral * future < 0 || Math.abs(planned) < width || lateral * planned < 0;
  if (!crosses) return { yielding: false, targetMph, braking: 110 };
  const playerAlong = pv.z * direction / DRIVE.mphToWorld;
  // Reserve body clearance and reaction time. Approaching traffic stops early
  // for an oncoming player; a player who then drives into it still collides.
  const gap = Math.max(0, ahead - envelope.length - .8 - Math.max(0, -playerAlong) * DRIVE.mphToWorld * .45);
  const deceleration = 110 * DRIVE.mphToWorld, reaction = deceleration * .3;
  const closingLimit = (Math.sqrt(reaction * reaction + 2 * deceleration * gap) - reaction) / DRIVE.mphToWorld;
  const limit = gap < .03 ? 0 : Math.max(0, playerAlong) + closingLimit;
  const target = Math.min(targetMph, limit);
  return { yielding: target < targetMph, targetMph: target, braking: gap < 12 ? 190 : 110 };
}

// Attribute an unavoidable contact before any damage, drift break or push.
// A rear cut-in should make the approaching NPC yield, even when the swept
// normal is lateral. Driving/reversing into an NPC remains a player impact.
export function npcYieldContactNormal(player, npc, hit, previousLead) {
  const pv = velocity(player), nv = velocity(npc), direction = npc.dir || 1;
  // A rear cut-in retreats along the lane, not sideways into roadside walls.
  if (previousLead * direction >= 0 && pv.z * direction >= -1e-7 && nv.z * direction > Math.max(0, pv.z * direction) + 1e-7) return { nx: 0, nz: direction };
  const playerMotion = ((player.lateral - (player.prevLateral ?? player.lateral)) * hit.nx
    + (player.s - (player.prevS ?? player.s)) * hit.nz);
  const playerInto = -(pv.x * hit.nx + pv.z * hit.nz);
  // The extra displacement check covers externally scripted cut-ins or a
  // recovery shove even if instantaneous heading/speed no longer explains it.
  return playerInto <= 1e-7 && playerMotion >= -1e-7 ? hit : null;
}
