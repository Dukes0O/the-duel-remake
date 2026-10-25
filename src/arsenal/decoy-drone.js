import {point, burst} from '../combat-actors.js';
import {outOfPlay, hostile, arenaParticipant, arenaActor} from '../combat-teams.js';
import {actorForTarget, targetIdentity} from './targeting.js';

export const DRONE_RULES = Object.freeze({duration: 5, offset: 10, hitWindowSec: 6, hits: 2});
const hitHistory = new WeakMap();
const EPS = 1e-9;
export function clearDroneHistory(duel, actor) {
  if (actor) hitHistory.get(duel)?.delete(actor);
  else hitHistory.delete(duel);
}
export function noteDroneHit(duel, victim, removed, ownerId) {
  if (!(removed > 0) || !ownerId || victim.decoy) return;
  const owner = duel.state.arena ? arenaActor(duel, ownerId) :
    ownerId === 'player' ? duel.state : ownerId === 'cpu' ? duel.state.rival : actorForTarget(duel, ownerId);
  if (!hostile(duel, owner, victim)) return;
  let history = hitHistory.get(duel);
  if (!history) hitHistory.set(duel, history = new WeakMap());
  const now = duel.state.stageTimeSec;
  const hits = (history.get(victim) || []).filter(time => now - time <= DRONE_RULES.hitWindowSec + EPS);
  hits.push(now);
  history.set(victim, hits.slice(-DRONE_RULES.hits));
}
export function shouldUseDecoyDrone(duel, owner) {
  const now = duel.state.stageTimeSec, hits = hitHistory.get(duel)?.get(owner) || [];
  return hits.filter(time => now >= time && now - time <= DRONE_RULES.hitWindowSec + EPS).length >= DRONE_RULES.hits;
}
export function deployDecoyDrone(duel, owner) {
  const state = duel.state, combat = state.combat;
  if (!combat || outOfPlay(duel, owner)) return null;
  const ownerId = targetIdentity(duel, owner);
  if (state.opponents.some(actor => actor.drone && actor.ownerId === ownerId)) return null;
  const id = `drone-${++combat.serial}`;
  const donor = owner === state ? state.rival : owner;
  const copy = {...donor, id, arenaId: state.arena ? id : undefined,
    car: owner.car || state.car, decoy: true, drone: true, active: true, ownerId,
    expiresAt: state.stageTimeSec + DRONE_RULES.duration, finished: false, crushed: false,
    combatWrecking: false, armor: 1e6, maxArmor: 1e6, knock: null, mirage: null,
    damageZones: {...(owner.damageZones || {})}, combatShield: 0, ramDamageScale: 0,
    weaponLoadout: [], combatArmorKit: null};
  follow(duel, copy, owner);
  state.opponents.push(copy);
  if (state.arena) {
    const participant = arenaParticipant(duel, owner);
    state.arena.participants.push({...participant, id, kind: 'cpu', brain: 'gunner',
      decoy: true, active: true, ownerId, expiresAt: copy.expiresAt,
      wrecks: 0, wrecked: 0, damageDealt: 0, goal: null, targetId: null,
      protectedSec: 0, reactionSec: 0, lastHitBy: null, lastHitAt: -Infinity});
  }
  clearDroneHistory(duel, owner);
  const at = point(duel, copy);
  duel.emit({arsenalCue: 'weapon.decoy.deploy', actor: owner, drone: copy, hitPosition: at});
  return copy;
}
function follow(duel, copy, owner) {
  copy.prevS = copy.s ?? owner.s;
  copy.prevLateral = copy.lateral ?? owner.lateral + DRONE_RULES.offset;
  for (const key of ['s', 'speedMph', 'headingError', 'airHeight', 'airborne',
    'gear', 'revs', 'steerVisual', 'braking', 'dir']) copy[key] = owner[key];
  copy.lateral = owner.lateral + DRONE_RULES.offset;
  copy.prevAirHeight = owner.prevAirHeight ?? owner.airHeight ?? 0;
  copy.groundHeight = duel.course.groundAt(copy.s, copy.lateral).y;
}
export function burstDrone(duel, copy, scrap = true) {
  if (!copy?.drone || !duel.state.opponents.includes(copy)) return false;
  const at = point(duel, copy);
  copy.active = false;
  duel.state.opponents = duel.state.opponents.filter(actor => actor !== copy);
  if (duel.state.arena) duel.state.arena.participants =
    duel.state.arena.participants.filter(p => p.id !== copy.arenaId);
  if (scrap) {
    burst(duel.state.combat, at, 'blast');
    duel.emit({arsenalCue: 'weapon.decoy.burst', drone: copy, hitPosition: at});
  }
  return true;
}
export function stepDecoyDrones(duel) {
  for (const copy of [...duel.state.opponents]) {
    if (!copy.drone) continue;
    const owner = actorForTarget(duel, copy.ownerId);
    if (!owner || outOfPlay(duel, owner) || duel.state.stageTimeSec + EPS >= copy.expiresAt) {
      burstDrone(duel, copy, false);
      continue;
    }
    follow(duel, copy, owner);
  }
}
