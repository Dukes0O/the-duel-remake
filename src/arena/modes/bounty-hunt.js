import {makeRng} from '../../rng.js';

// Bounty Hunt rules (SCRAPDOME 10). Only native simulation writes this state.
export const BOUNTY_RULES = Object.freeze({
  timeLimitSec: 180, suddenDeathSec: 30, pointsPerSecond: 1, markedWreckPoints: 20,
});

const actorFor = (duel, id) => id === 'player' ? duel.state :
  duel.state.opponents.find(actor => actor.arenaId === id);
const running = (duel, participant) => {
  const actor = participant && actorFor(duel, participant.id);
  return !!actor && !actor.combatWrecking && !actor.finished && !actor.crushed;
};

export function initializeBountyHunt(duel) {
  const arena = duel.state.arena;
  if (arena?.mode !== 'bounty-hunt') return;
  // This mode has its own seeded order; initializing it cannot move another
  // system's random sequence. The retained order also settles distance ties.
  const rng = makeRng(duel.seed ^ 0x626f756e);
  const order = arena.participants.map(participant => participant.id);
  for (let index = order.length - 1; index > 0; index--) {
    const other = rng.int(0, index);
    [order[index], order[other]] = [order[other], order[index]];
  }
  const candidates = duel.state.cpuDifficulty === 'hard' ? order :
    order.filter(id => id !== 'player');
  for (const participant of arena.participants) participant.bountyPoints = 0;
  arena.bountyHunt = {markedId: candidates[0] || null, heldSec: 0, pendingVictimId: null, order};
}

// Bounty points decide regulation. Damage settles equal placings, while a
// points-only top tie still opens the shared next-wreck overtime.
export function bountyRanking(arena) {
  return [...arena.participants].sort((a, b) =>
    b.bountyPoints - a.bountyPoints || b.damageDealt - a.damageDealt);
}

export function bountyTopTied(arena) {
  const [first, second] = bountyRanking(arena);
  return !!second && first.bountyPoints === second.bountyPoints;
}

export function bountyDamageWinner(arena) {
  return [...arena.participants].sort((a, b) => b.damageDealt - a.damageDealt)[0]?.id || null;
}

function nearestRunning(duel, victim) {
  const arena = duel.state.arena, origin = actorFor(duel, victim.id);
  if (!origin) return null;
  const at = duel.course.worldAt(origin.s, origin.lateral);
  let nearest = null, nearestDistance = Infinity;
  for (const id of arena.bountyHunt.order) {
    const participant = arena.participants.find(candidate => candidate.id === id);
    if (!participant || participant === victim || !running(duel, participant)) continue;
    const actor = actorFor(duel, id), pose = duel.course.worldAt(actor.s, actor.lateral);
    const distance = Math.hypot(pose.x - at.x, pose.z - at.z);
    if (distance < nearestDistance) { nearest = participant; nearestDistance = distance; }
  }
  return nearest;
}

function transferMark(duel, participant, previousId) {
  const bounty = duel.state.arena.bountyHunt;
  if (!participant || participant.id === bounty.markedId) return;
  bounty.markedId = participant.id;
  bounty.heldSec = 0;
  bounty.pendingVictimId = null;
  duel.emit({bountyMark: {previousId, markedId: participant.id}});
}

// The shared wreck hook supplies its real five-second credit separately from
// the last hitter. Call this before that shared hook clears lastHitBy.
export function noteBountyWreck(duel, victim, credited, lastHitId = victim.lastHitBy) {
  const arena = duel.state.arena, bounty = arena?.bountyHunt;
  if (!bounty || arena.result) return null;
  if (victim.id === bounty.markedId && !bounty.pendingVictimId) {
    if (credited && credited.id !== victim.id) credited.bountyPoints += BOUNTY_RULES.markedWreckPoints;
    const hitter = arena.participants.find(participant => participant.id === lastHitId &&
      participant.id !== victim.id);
    const leader = bountyRanking(arena).find(participant => participant.id !== victim.id);
    const recipient = credited || hitter || leader;
    const next = running(duel, recipient) ? recipient : nearestRunning(duel, victim);
    if (next) transferMark(duel, next, victim.id);
    else {
      // The victim no longer owns a scoring mark, even if it recovers before
      // the others. Retain its id until another running car can take over.
      bounty.pendingVictimId = victim.id;
      bounty.heldSec = 0;
    }
  }
  if (arena.phase === 'sudden-death' && credited && credited.id !== victim.id)
    return {reason: 'sudden-death', winnerId: credited.id};
  return null;
}

export function stepBountyHunt(duel, dt) {
  const state = duel.state, arena = state.arena, bounty = arena?.bountyHunt;
  if (!bounty || arena.result || state.status !== 'racing' || state.paused ||
      !['fight', 'countdown', 'sudden-death'].includes(arena.phase)) return;
  let marked = arena.participants.find(participant => participant.id === bounty.markedId);
  if (!marked) return;
  if (!bounty.pendingVictimId && !running(duel, marked)) {
    bounty.pendingVictimId = marked.id;
    bounty.heldSec = 0;
  }
  if (bounty.pendingVictimId) {
    const victim = arena.participants.find(participant => participant.id === bounty.pendingVictimId);
    const next = victim && nearestRunning(duel, victim);
    if (!next) return;
    transferMark(duel, next, victim.id);
    marked = next;
  }
  // Handover still happens during overtime; passive scoring does not.
  if (arena.phase === 'sudden-death' || !running(duel, marked)) return;
  // Regulation alone earns passive points. Ignore overtime and time beyond
  // the whistle even when the enclosing fixed step crosses its boundary.
  const elapsed = Math.min(dt, Math.max(0, arena.timeLimitSec - arena.clockSec));
  bounty.heldSec += elapsed;
  const wholeSeconds = Math.floor(bounty.heldSec + 1e-9);
  if (wholeSeconds > 0) {
    marked.bountyPoints += wholeSeconds * BOUNTY_RULES.pointsPerSecond;
    bounty.heldSec = Math.max(0, bounty.heldSec - wholeSeconds);
  }
}
