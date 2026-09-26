// Whose side is a car on? (docs/SCRAPDOME.md section 7, decision 4)
// Outside an arena event the answer is exactly the established rule: the
// player against the computer cars, with owners reported as 'player' or 'cpu'.
// In an arena event every car carries its participant id and team.

export function arenaParticipant(duel, actor) {
  const arena = duel.state.arena;
  if (!arena || !actor) return null;
  const id = actor === duel.state ? 'player' : actor.arenaId;
  return id ? arena.participants.find(participant => participant.id === id) || null : null;
}

export function arenaActor(duel, id) {
  const state = duel.state;
  if (id === 'player') return state;
  return state.opponents.find(actor => actor.arenaId === id) || null;
}

// The owner string recorded with damage. Unchanged outside arena events.
export function combatOwnerId(duel, actor) {
  if (!actor) return undefined;
  if (duel.state.arena) return actor === duel.state ? 'player' : actor.arenaId;
  return actor === duel.state ? 'player' : 'cpu';
}

export function combatTeam(duel, actor) {
  const participant = arenaParticipant(duel, actor);
  if (participant) return participant.team;
  return actor === duel.state ? 'player' : 'cpu';
}

export function hostile(duel, a, b) {
  return !!a && !!b && a !== b && combatTeam(duel, a) !== combatTeam(duel, b);
}

// A car that cannot currently be fought: gone, wrecking or just respawned.
export function outOfPlay(duel, actor) {
  if (!actor || actor.finished || actor.crushed || actor.combatWrecking) return true;
  return (arenaParticipant(duel, actor)?.protectedSec || 0) > 0;
}

// The cars a projectile from this owner may strike, in a stable order.
export function arenaStrikeCandidates(duel, ownerId) {
  const state = duel.state, owner = arenaActor(duel, ownerId);
  return [state, ...state.opponents].filter(actor => actor !== owner &&
    (!owner || hostile(duel, owner, actor)));
}

// The computer car's chosen target (set by its brain), if still fightable.
export function arenaTargetOf(duel, actor) {
  const participant = arenaParticipant(duel, actor);
  const target = participant?.targetId ? arenaActor(duel, participant.targetId) : null;
  return target && !outOfPlay(duel, target) && hostile(duel, actor, target) ? target : null;
}

// Record armor removed by a hit, for wreck credit and damage totals.
export function noteArenaDamage(duel, victim, removed, ownerId) {
  const state = duel.state, target = arenaParticipant(duel, victim);
  if (!state.arena || !target || !(removed > 0)) return;
  if (ownerId && ownerId !== target.id) {
    target.lastHitBy = ownerId; target.lastHitAt = state.stageTimeSec;
    const owner = state.arena.participants.find(p => p.id === ownerId);
    if (owner) owner.damageDealt += removed;
  }
}

// A car that was just respawned can neither take nor deal damage.
export function arenaDamageBlocked(duel, victim, ownerId) {
  if (!duel.state.arena) return false;
  if ((arenaParticipant(duel, victim)?.protectedSec || 0) > 0) return true;
  const owner = ownerId ? duel.state.arena.participants.find(p => p.id === ownerId) : null;
  return (owner?.protectedSec || 0) > 0;
}
