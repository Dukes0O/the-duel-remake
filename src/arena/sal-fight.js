import {arenaActor, outOfPlay} from '../combat-teams.js';
import {worldPose} from './arena-floor.js';
import {arenaCarSpec} from './arena-pilot.js';
import {arenaFloorSpeed} from './venues.js';

// Sawtooth Sal's intentions, not extra car physics (SCRAPDOME section 5).
// The pilot drives every goal with the existing car, boost and steering limits.
export const SAL_RULES = Object.freeze({
  sidewaysMetres: 12, alongMetres: 6, cooldownSec: Object.freeze({easy: 9, medium: 7, hard: 5}),
  windowSec: 2, windowSpeedShare: .6, windowSteeringScale: .5, phaseTwoTellShare: .8,
  // A sweep is one committed swerve; a charge that makes no ground gives up.
  sweepMaxSec: 1.5, chargeMaxSec: 3,
});
const EPSILON = 1e-9;
const SIDE_PHASES = Object.freeze({idle: 'idle', tell: 'spin-up', sweep: 'sweeping',
  window: 'sparking', 'charge-tell': 'idle', charge: 'idle'});

export function isSalFight(duel, actor) {
  const arena = duel.state.arena;
  return arena?.mode === 'warlord' && arena.warlordId === 'sal' &&
    actor?.warlordId === 'sal' && actor.arenaId === arena.warlordBossId &&
    duel.featureFlags?.enabled('warlords') === true;
}

export function resetSalFight(duel, actor) {
  if (!isSalFight(duel, actor)) return;
  const old = actor.salSaw;
  actor.salSaw = {stage: 'idle', phase: 'idle', sinceSec: duel.state.stageTimeSec,
    nextSweepSec: old?.nextSweepSec ?? 0, chargeSpent: false, hit: false};
  // This is the existing renderer's tier alias. It adds no armor or mass.
  actor.armorKit = 'warlord';
}

function setStage(duel, participant, actor, stage) {
  const move = actor.salSaw;
  move.stage = stage;
  move.phase = SIDE_PHASES[stage];
  move.sinceSec = duel.state.stageTimeSec;
  participant.goal = null;
  participant.reactionSec = 0;
  participant.tellLeft = 0;
  actor.arenaTellSec = 0;
}

function relativeTarget(duel, actor, target) {
  const me = worldPose(duel, actor), at = worldPose(duel, target);
  const dx = at.x - me.x, dz = at.z - me.z;
  return {me, at, sideways: dx * Math.cos(me.heading) - dz * Math.sin(me.heading),
    along: dx * Math.sin(me.heading) + dz * Math.cos(me.heading), distance: Math.hypot(dx, dz)};
}

function alongside(relative) {
  return Math.abs(relative.sideways) <= SAL_RULES.sidewaysMetres &&
    Math.abs(relative.along) <= SAL_RULES.alongMetres;
}

function straightGoal(pose, speedMph, boost = false, steeringScale = 1) {
  return {x: pose.x + Math.sin(pose.heading) * 40,
    z: pose.z + Math.cos(pose.heading) * 40, speedMph, boost, steeringScale};
}

function openWindow(duel, participant, actor) {
  setStage(duel, participant, actor, 'window');
  actor.salSaw.untilSec = duel.state.stageTimeSec + SAL_RULES.windowSec;
  actor.salSaw.runHeading = worldPose(duel, actor).heading;
  duel._callout('SHE MISSED. HIT HER NOW!', SAL_RULES.windowSec);
}

function tellDuration(duel, difficulty) {
  return difficulty.tellSec * (duel.state.arena.warlordPhase === 2 ? SAL_RULES.phaseTwoTellShare : 1);
}

function startSweepTell(duel, participant, actor, relative, difficulty) {
  setStage(duel, participant, actor, 'tell');
  const move = actor.salSaw, seconds = tellDuration(duel, difficulty);
  move.untilSec = move.sinceSec + seconds;
  move.nextSweepSec = move.sinceSec + (SAL_RULES.cooldownSec[duel.state.cpuDifficulty] ?? SAL_RULES.cooldownSec.medium);
  move.targetId = 'player';
  move.countered = false;
  move.hit = false;
  move.runHeading = relative.me.heading;
  participant.chargeReady = false;
  const point = duel.course.groundAt(actor.s, actor.lateral);
  duel.emit({salSaw: {id: actor.arenaId, targetId: 'player', seconds,
    position: {x: relative.me.x, y: point.y ?? 0, z: relative.me.z}}});
}

function startChargeTell(duel, participant, actor, relative, difficulty) {
  setStage(duel, participant, actor, 'charge-tell');
  const move = actor.salSaw, seconds = tellDuration(duel, difficulty);
  move.untilSec = move.sinceSec + seconds;
  move.runHeading = Math.atan2(relative.at.x - relative.me.x, relative.at.z - relative.me.z);
  move.chargeStart = {x: relative.me.x, z: relative.me.z};
  move.chargeLength = relative.distance + SAL_RULES.sidewaysMetres;
  move.chargeSpent = true;
  actor.arenaTellSec = seconds;
  participant.chargeReady = false;
  const point = duel.course.groundAt(actor.s, actor.lateral);
  duel.emit({arenaTell: {id: actor.arenaId, targetId: 'player', seconds,
    position: {x: relative.me.x, y: point.y ?? 0, z: relative.me.z}}});
}

// Called on every fixed-step brain invocation, even between reaction updates.
// null hands control back to the unchanged ordinary rammer brain.
export function thinkSalFight(duel, participant, actor, difficulty) {
  if (!isSalFight(duel, actor)) return null;
  if (!actor.salSaw) resetSalFight(duel, actor);
  const move = actor.salSaw, now = duel.state.stageTimeSec;
  const target = arenaActor(duel, 'player');
  if (outOfPlay(duel, actor) || !target || outOfPlay(duel, target)) {
    if (move.stage !== 'idle') setStage(duel, participant, actor, 'idle');
    return null;
  }
  const relative = relativeTarget(duel, actor, target);
  const pace = arenaFloorSpeed(duel.course.def.scrapdome,
    arenaCarSpec(duel, actor).topSpeed) * difficulty.pace;

  if (move.stage === 'window') {
    if (now + EPSILON >= move.untilSec) {
      setStage(duel, participant, actor, 'idle');
      return null;
    }
    return straightGoal({...relative.me, heading: move.runHeading},
      pace * SAL_RULES.windowSpeedShare, false, SAL_RULES.windowSteeringScale);
  }
  if (move.stage === 'tell') {
    const escaping = target.input?.brake >= .8 || target.input?.boost === true || target.boosting === true;
    if (escaping && !alongside(relative)) move.countered = true;
    if (now + EPSILON < move.untilSec)
      return straightGoal({...relative.me, heading: move.runHeading}, pace * .6);
    if (move.countered || !alongside(relative)) {
      openWindow(duel, participant, actor);
      return straightGoal({...relative.me, heading: move.runHeading}, pace * .6, false, .5);
    }
    setStage(duel, participant, actor, 'sweep');
    // Commit across the player's line. The counter moves clear before release;
    // the sweep does not chase someone who has already escaped its tell.
    move.sweepGoal = {x: relative.at.x, z: relative.at.z};
    move.untilSec = now + SAL_RULES.sweepMaxSec;
  }
  if (move.stage === 'sweep') {
    if (move.hit === true) {
      setStage(duel, participant, actor, 'idle');
      return null;
    }
    if (!alongside(relative) || now + EPSILON >= move.untilSec) {
      openWindow(duel, participant, actor);
      return straightGoal({...relative.me, heading: move.runHeading}, pace * .6, false, .5);
    }
    return {...move.sweepGoal, speedMph: pace, boost: false};
  }
  if (move.stage === 'charge-tell') {
    actor.arenaTellSec = Math.max(0, move.untilSec - now);
    if (now + EPSILON < move.untilSec)
      return straightGoal({...relative.me, heading: move.runHeading}, pace * .6);
    setStage(duel, participant, actor, 'charge');
    move.untilSec = now + SAL_RULES.chargeMaxSec;
    participant.chargeReady = true;
  }
  if (move.stage === 'charge') {
    const travel = (relative.me.x - move.chargeStart.x) * Math.sin(move.runHeading) +
      (relative.me.z - move.chargeStart.z) * Math.cos(move.runHeading);
    const turnedAway = Math.cos(relative.me.heading - move.runHeading) <= 0;
    if (travel >= move.chargeLength || turnedAway || now + EPSILON >= move.untilSec) {
      setStage(duel, participant, actor, 'idle');
      return null;
    }
    return straightGoal({...relative.me, heading: move.runHeading}, pace, true);
  }

  if (alongside(relative) && now + EPSILON >= move.nextSweepSec) {
    startSweepTell(duel, participant, actor, relative, difficulty);
    return straightGoal(relative.me, pace * .6);
  }
  // Line up a straight run at a player ahead in the same side corridor.
  // The rammer's 60-metre approach range still bounds the extra move.
  const aligned = relative.along > 0 && Math.abs(relative.sideways) <= SAL_RULES.sidewaysMetres;
  if (!aligned || relative.distance >= 60) move.chargeSpent = false;
  if (duel.state.arena.warlordPhase === 2 && aligned && relative.distance < 60 && !move.chargeSpent) {
    startChargeTell(duel, participant, actor, relative, difficulty);
    return straightGoal({...relative.me, heading: move.runHeading}, pace * .6);
  }
  return null;
}
