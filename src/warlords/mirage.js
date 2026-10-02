import {arenaActor, arenaParticipant, outOfPlay} from '../combat-teams.js';
import {burst} from '../combat-weapons.js';
import {worldPose, floorLimit} from '../arena/arena-floor.js';

// Mother Mirage (docs/SCRAPDOME.md section 5): an evasive gunner who splits
// into copies. Between splits the ordinary gunner brain drives her; this file
// adds the Mirage, the stun window and phase two's ramming copies.
export const MIRAGE_RULES = Object.freeze({
  triggerMetres: 40, spreadMetres: 8, splitSec: 6,
  cooldownSec: Object.freeze({easy: 12, medium: 10, hard: 8}),
  phaseTwoRate: 1.2, stunSec: 2, windowMultiplier: 1.5,
  // Copies never take armor; any damage bursts them into scrap.
  copyArmor: 1e6, phaseTwoRamScale: .5,
});
const EPSILON = 1e-9;

function cooldown(duel) {
  const base = MIRAGE_RULES.cooldownSec[duel.state.cpuDifficulty] ?? MIRAGE_RULES.cooldownSec.medium;
  return duel.state.arena.warlordPhase === 2 ? base / MIRAGE_RULES.phaseTwoRate : base;
}

export function resetMirage(duel, actor) {
  const old = actor.mirage;
  removeCopies(duel, actor, false);
  // Her cooldown runs from the start of the fight: no split at the start.
  actor.mirage = {stage: 'idle', sinceSec: duel.state.stageTimeSec,
    nextSplitSec: old?.nextSplitSec ?? duel.state.stageTimeSec + cooldown(duel),
    armorSeen: actor.armor};
}

function setStage(duel, participant, actor, stage) {
  actor.mirage.stage = stage;
  actor.mirage.sinceSec = duel.state.stageTimeSec;
  if (participant) { participant.goal = null; participant.reactionSec = 0; participant.tellLeft = 0; }
  actor.arenaTellSec = 0;
}

function copies(duel, actor) {
  return duel.state.opponents.filter(car => car.decoy && car.ownerId === actor.arenaId);
}

// Copies leave in a burst of scrap; the shimmer covers a clean expiry.
function removeCopies(duel, actor, scrap = true) {
  const gone = copies(duel, actor);
  if (!gone.length) return;
  for (const copy of gone) {
    const at = duel.course.worldAt(copy.s, copy.lateral);
    if (scrap && duel.state.combat) burst(duel.state.combat, {x: at.x, y: at.y ?? 0, z: at.z}, 'blast');
  }
  duel.state.opponents = duel.state.opponents.filter(car => !gone.includes(car));
  const ids = new Set(gone.map(copy => copy.arenaId));
  duel.state.arena.participants = duel.state.arena.participants.filter(p => !ids.has(p.id));
}

function makeCopy(duel, actor, participant, index, offset) {
  const limit = floorLimit(duel) - 2;
  const lateral = Math.max(-limit, Math.min(limit, actor.lateral + offset));
  const id = `${actor.arenaId}-copy-${index}`;
  const phaseTwo = duel.state.arena.warlordPhase === 2;
  const copy = {...actor, arenaId: id, id, decoy: true, active: true, ownerId: actor.arenaId,
    expiresAt: duel.state.stageTimeSec + MIRAGE_RULES.splitSec, lateral, prevLateral: lateral,
    armor: MIRAGE_RULES.copyArmor, maxArmor: MIRAGE_RULES.copyArmor, mirage: null, knock: null,
    damageZones: {...(actor.damageZones || {})}, ramDamageScale: phaseTwo ? MIRAGE_RULES.phaseTwoRamScale : 1,
    arenaShimmerSec: .6, arenaTellSec: 0};
  const twin = {...participant, id, decoy: true, active: true, ownerId: actor.arenaId,
    expiresAt: copy.expiresAt, brain: phaseTwo ? 'rammer' : participant.brain,
    wrecks: 0, wrecked: 0, damageDealt: 0, goal: null, reactionSec: 0, targetId: 'player',
    lastHitBy: null, lastHitAt: -Infinity, protectedSec: 0};
  duel.state.opponents.push(copy);
  duel.state.arena.participants.push(twin);
  return copy;
}

function split(duel, participant, actor) {
  setStage(duel, participant, actor, 'split');
  const move = actor.mirage;
  move.untilSec = duel.state.stageTimeSec + MIRAGE_RULES.splitSec;
  move.nextSplitSec = duel.state.stageTimeSec + cooldown(duel);
  move.armorSeen = actor.armor;
  actor.arenaShimmerSec = .6;
  makeCopy(duel, actor, participant, 1, -MIRAGE_RULES.spreadMetres);
  makeCopy(duel, actor, participant, 2, MIRAGE_RULES.spreadMetres);
  duel.emit({mirageSplit: {id: actor.arenaId}});
}

export function thinkMirage(duel, participant, actor, difficulty) {
  if (!actor.mirage) resetMirage(duel, actor);
  const move = actor.mirage, now = duel.state.stageTimeSec;
  // Any copy that took damage bursts into scrap.
  for (const copy of copies(duel, actor)) {
    if (copy.armor < MIRAGE_RULES.copyArmor || now + EPSILON >= copy.expiresAt) {
      const scrap = copy.armor < MIRAGE_RULES.copyArmor;
      const at = duel.course.worldAt(copy.s, copy.lateral);
      if (scrap && duel.state.combat) burst(duel.state.combat, {x: at.x, y: at.y ?? 0, z: at.z}, 'blast');
      duel.state.opponents = duel.state.opponents.filter(car => car !== copy);
      duel.state.arena.participants = duel.state.arena.participants.filter(p => p.id !== copy.arenaId);
    }
  }
  const target = arenaActor(duel, 'player');
  if (outOfPlay(duel, actor) || !target || outOfPlay(duel, target)) {
    if (move.stage !== 'idle') { removeCopies(duel, actor); setStage(duel, participant, actor, 'idle'); }
    move.armorSeen = actor.armor;
    return null;
  }
  const me = worldPose(duel, actor);
  if (move.stage === 'split') {
    if (actor.armor < move.armorSeen - EPSILON) {
      // The real one was hit: the copies burst and she is stunned.
      removeCopies(duel, actor);
      setStage(duel, participant, actor, 'stunned');
      move.untilSec = now + MIRAGE_RULES.stunSec;
      duel._callout('GOT HER. HIT HER NOW!', MIRAGE_RULES.stunSec);
      return {x: me.x, z: me.z, speedMph: 0, boost: false};
    }
    if (now + EPSILON >= move.untilSec || !copies(duel, actor).length) {
      removeCopies(duel, actor, false);
      setStage(duel, participant, actor, 'idle');
    }
    move.armorSeen = actor.armor;
    return null;
  }
  if (move.stage === 'stunned') {
    if (now + EPSILON >= move.untilSec) { setStage(duel, participant, actor, 'idle'); return null; }
    return {x: me.x, z: me.z, speedMph: 0, boost: false};
  }
  move.armorSeen = actor.armor;
  if (move.stage === 'tell') {
    actor.arenaShimmerSec = Math.max(actor.arenaShimmerSec || 0, move.untilSec - now);
    if (now + EPSILON < move.untilSec) return null;
    split(duel, participant, actor);
    return null;
  }
  const at = worldPose(duel, target);
  if (now + EPSILON >= move.nextSplitSec && Math.hypot(at.x - me.x, at.z - me.z) <= MIRAGE_RULES.triggerMetres) {
    setStage(duel, participant, actor, 'tell');
    const seconds = difficulty.tellSec;
    move.untilSec = now + seconds;
    actor.arenaShimmerSec = seconds;
    duel._callout('MIRAGE!', seconds + .4);
    duel.emit({arenaTell: {id: actor.arenaId, targetId: 'player', seconds,
      position: {x: me.x, y: duel.course.groundAt(actor.s, actor.lateral).y ?? 0, z: me.z}}});
  }
  return null;
}

export const MIRAGE_FIGHT = Object.freeze({
  reset: resetMirage,
  think: thinkMirage,
  // Stunned after a hit during the split, she takes 1.5 times damage.
  defense: (duel, victim) => victim.mirage?.stage === 'stunned' ? MIRAGE_RULES.windowMultiplier : 1,
});
