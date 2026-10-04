import {arenaActor} from '../../combat-teams.js';

export const CONVOY_RULES = Object.freeze({
  timeLimitSec: 300, cruiseKph: 55, boardingKph: 35, boardingSeconds: 60,
  valveArmor: 150, valveCount: 3, ramReach: 3, loopOffset: -9,
  winScrap: 700, valveScrap: 40,
});

export const CONVOY_BODY = Object.freeze({
  mass: 12000, halfWidth: 1.5, halfLength: 5.5, height: 3.5,
});

export function convoyRig(duel) {
  const convoy = duel.state.arena?.convoy;
  return convoy ? arenaActor(duel, convoy.rigId) : null;
}

export function isConvoyRig(duel, actor) {
  return duel.state.arena?.mode === 'convoy-raid' &&
    !!actor && actor.arenaId === duel.state.arena.convoy?.rigId;
}

export function initializeConvoyRaid(duel) {
  const arena = duel.state.arena;
  if (arena?.mode !== 'convoy-raid') return;
  const computers = arena.participants.filter(p => p.kind === 'cpu');
  const rig = arenaActor(duel, computers[0].id);
  arena.convoy = {rigId: computers[0].id,
    valves: Array(CONVOY_RULES.valveCount).fill(CONVOY_RULES.valveArmor),
    playerValvesBroken: 0, playerBroken: Array(CONVOY_RULES.valveCount).fill(false),
    boardingLeftSec: 0, chargePlanted: false, finished: false, attackerId: null};
  computers.forEach((participant, index) => {
    participant.team = 'convoy';
    participant.brain = index === 0 ? 'convoy-rig' : 'guard';
    participant.name = index === 0 ? 'TANKER' : `ESCORT ${index}`;
    participant.targetId = null;
  });
  rig.arenaRole = 'convoy-rig';
  rig.s = rig.prevS = duel.course.length * .2;
  rig.lateral = rig.prevLateral = CONVOY_RULES.loopOffset;
  rig.headingError = 0;
  rig.speedMph = CONVOY_RULES.cruiseKph / 1.609344;
  computers.slice(1).forEach((participant, index) => {
    const actor = arenaActor(duel, participant.id);
    actor.s = actor.prevS = rig.s - 22 - index * 16;
    actor.lateral = actor.prevLateral = rig.lateral + (index ? -3 : 3);
    actor.headingError = 0;
    actor.speedMph = rig.speedMph;
  });
}

export function convoyBoardingOpen(duel, actor) {
  const convoy = duel.state.arena?.convoy;
  return isConvoyRig(duel, actor) && !convoy.finished &&
    !convoy.chargePlanted && convoy.boardingLeftSec > 0 &&
    convoy.valves.every(armor => armor === 0);
}

export function plantConvoyCharge(duel, actor) {
  const boarding = duel.state.boarding;
  if (!convoyBoardingOpen(duel, actor) || boarding?.phase !== 'charge' ||
      boarding.targetId !== actor.arenaId || boarding.chargesPlanted !== 1) return false;
  duel.state.arena.convoy.chargePlanted = true;
  return true;
}

export function convoyChargeReady(duel, actor) {
  const convoy = duel.state.arena?.convoy;
  const boarding = duel.state.boarding;
  return isConvoyRig(duel, actor) && convoy.chargePlanted && !convoy.finished &&
    boarding?.phase === 'charge' && boarding.targetId === actor.arenaId &&
    boarding.chargesPlanted === 1 && Number.isFinite(boarding.fuseSeconds) &&
    boarding.fuseSeconds <= 1e-9;
}

export function completeConvoyCharge(duel, actor) {
  if (!convoyChargeReady(duel, actor)) return false;
  const convoy = duel.state.arena.convoy;
  convoy.finished = true;
  convoy.boardingLeftSec = 0;
  return true;
}

export function stepConvoyRig(duel, actor, dt) {
  if (!isConvoyRig(duel, actor)) return false;
  const convoy = duel.state.arena.convoy;
  actor.prevS = actor.s; actor.prevLateral = actor.lateral;
  actor.speedMph = (convoy.valves.every(armor => armor === 0)
    ? CONVOY_RULES.boardingKph : CONVOY_RULES.cruiseKph) / 1.609344;
  // The -9 m loop clears both narrow ramps and the kept perimeter props.
  // Offset curves cover a different distance from their centreline.
  actor.lateral += (CONVOY_RULES.loopOffset - actor.lateral) * (1 - Math.exp(-dt));
  const frame = duel.course.at(actor.s);
  actor.s += actor.speedMph * .44704 * dt / Math.max(.3, 1 - frame.curvature * actor.lateral);
  actor.headingError = 0; actor.yawVelocity = 0;
  actor.boosting = false; actor.drifting = false; actor.steerVisual = 0;
  return true;
}

export function convoyEscortGoal(duel, participant) {
  const convoy = duel.state.arena?.convoy;
  if (!convoy || participant.brain !== 'guard' || convoy.attackerId) return null;
  const rig = convoyRig(duel);
  const index = duel.state.arena.participants.filter(p => p.brain === 'guard').indexOf(participant);
  const at = duel.course.worldAt(rig.s - 22 - index * 16,
    CONVOY_RULES.loopOffset + (index ? -3 : 3));
  return {x: at.x, z: at.z, heading: at.heading, speedMph: rig.speedMph, boost: false};
}

export function stepConvoyRaid(duel, dt) {
  const arena = duel.state.arena, convoy = arena?.convoy;
  if (!convoy || arena.result) return null;
  if (convoy.finished) return {reason: 'charge', winnerId: 'player'};
  if (convoy.chargePlanted) return null;
  if (convoy.boardingLeftSec > 0 && !convoy.chargePlanted) {
    convoy.boardingLeftSec = Math.max(0, convoy.boardingLeftSec - dt);
    if (convoy.boardingLeftSec < 1e-9) {
      convoy.boardingLeftSec = 0;
      convoy.valves.fill(CONVOY_RULES.valveArmor / 2);
      const rig = convoyRig(duel);
      rig.speedMph = CONVOY_RULES.cruiseKph / 1.609344;
      duel.emit({convoyWindow: {open: false, soundCue: 'interface.lose'}});
      duel._callout('TANKER VALVES RESET', 2);
    }
  }
  arena.phase = 'fight';
  arena.clockSec = Math.min(CONVOY_RULES.timeLimitSec, arena.clockSec + dt);
  return arena.clockSec >= CONVOY_RULES.timeLimitSec
    ? {reason: 'time', winnerId: convoy.rigId} : null;
}
