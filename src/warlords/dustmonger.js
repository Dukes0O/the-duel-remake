import {arenaActor, outOfPlay} from '../combat-teams.js';
import {DRIVE} from '../config.js';
import {worldPose} from '../arena/arena-floor.js';
import {arenaCarSpec} from '../arena/arena-pilot.js';
import {arenaFloorSpeed} from '../arena/venues.js';
import {addHazard} from '../arsenal/hazards.js';
import {applyOilSlip} from '../arsenal/oil.js';

// The Dustmonger (docs/SCRAPDOME.md section 5): a gunner who hides in his own
// dust. Between veils the ordinary gunner brain drives him; this file only
// adds the Dust Veil, its window and the phase-two dust storm.
export const DUST_RULES = Object.freeze({
  behindMetres: 40, behindSideMetres: 15,
  cooldownSec: Object.freeze({easy: 10, medium: 8, hard: 6}),
  phaseTwoRate: 1.2, phaseTwoCloudScale: 1.3,
  cloudRadius: 7, cloudLifetime: 5,
  // Driving straight: yaw under 10 degrees a second for the last 0.5 s.
  straightYawRadians: 10 * Math.PI / 180, straightSec: .5,
  oilWidth: 4, oilLength: 8, oilLifetime: 6, oilFadeSec: 1, oilOwnerGraceSec: 1,
  windowSec: 2, windowSpeedShare: .7, windowRearMultiplier: 1.5,
  tellSpeedShare: .9,
});
const EPSILON = 1e-9;

function inFight(duel, actor) {
  return !!actor?.dustVeil;
}

export function resetDustmonger(duel, actor) {
  const old = actor.dustVeil;
  actor.dustVeil = {stage: 'idle', sinceSec: duel.state.stageTimeSec,
    nextVeilSec: old?.nextVeilSec ?? 0, straightSec: 0,
    lastHeading: null, lastSec: null};
}

function setStage(duel, participant, actor, stage) {
  const move = actor.dustVeil;
  move.stage = stage;
  move.sinceSec = duel.state.stageTimeSec;
  participant.goal = null;
  participant.reactionSec = 0;
  participant.tellLeft = 0;
  actor.arenaTellSec = 0;
}

function straightGoal(pose, speedMph) {
  return {x: pose.x + Math.sin(pose.heading) * 40, z: pose.z + Math.cos(pose.heading) * 40,
    speedMph, boost: false};
}

// Tracks how long he has driven straight, from his actual heading each step.
function trackStraight(duel, actor, pose) {
  const move = actor.dustVeil, now = duel.state.stageTimeSec;
  if (move.lastSec !== null && now > move.lastSec) {
    const dt = now - move.lastSec;
    const turn = Math.atan2(Math.sin(pose.heading - move.lastHeading), Math.cos(pose.heading - move.lastHeading));
    move.straightSec = Math.abs(turn) / dt < DUST_RULES.straightYawRadians ? move.straightSec + dt : 0;
  }
  move.lastHeading = pose.heading;
  move.lastSec = now;
}

function playerBehind(duel, pose, target) {
  const at = worldPose(duel, target), dx = at.x - pose.x, dz = at.z - pose.z;
  const along = dx * Math.sin(pose.heading) + dz * Math.cos(pose.heading);
  const sideways = dx * Math.cos(pose.heading) - dz * Math.sin(pose.heading);
  return along < 0 && Math.hypot(dx, dz) <= DUST_RULES.behindMetres &&
    Math.abs(sideways) <= DUST_RULES.behindSideMetres;
}

function cooldown(duel) {
  const base = DUST_RULES.cooldownSec[duel.state.cpuDifficulty] ?? DUST_RULES.cooldownSec.medium;
  return duel.state.arena.warlordPhase === 2 ? base / DUST_RULES.phaseTwoRate : base;
}

// The veil: a smoke cloud behind him and, if he drove straight, an oil strip
// on his line starting at the cloud's far edge. Both are ordinary hazards.
function releaseVeil(duel, actor, pose) {
  const scale = duel.state.arena.warlordPhase === 2 ? DUST_RULES.phaseTwoCloudScale : 1;
  const radius = DUST_RULES.cloudRadius * scale, back = radius + 1;
  const sin = Math.sin(pose.heading), cos = Math.cos(pose.heading);
  const drift = Math.max(0, actor.speedMph || 0) * DRIVE.mphToWorld * .3;
  const cloud = addHazard(duel, {kind: 'smoke', shape: 'circle', owner: actor,
    x: pose.x - sin * back, z: pose.z - cos * back, y: pose.y,
    radius, lifetime: DUST_RULES.cloudLifetime, driftSec: 1, driftX: -sin * drift, driftZ: -cos * drift});
  if (cloud) duel.emit({arsenalCue: 'weapon.smoke.deploy', warlordMove: true, actor, hazard: cloud,
    hitPosition: {x: cloud.x, y: cloud.y, z: cloud.z}});
  if (actor.dustVeil.straightSec + EPSILON < DUST_RULES.straightSec) return;
  const middle = back + radius + DUST_RULES.oilLength / 2;
  const oil = addHazard(duel, {kind: 'oil', shape: 'strip', owner: actor,
    x: pose.x - sin * middle, z: pose.z - cos * middle, y: pose.y, heading: pose.heading,
    width: DUST_RULES.oilWidth, length: DUST_RULES.oilLength,
    lifetime: DUST_RULES.oilLifetime, fadeSec: DUST_RULES.oilFadeSec,
    ownerGraceSec: DUST_RULES.oilOwnerGraceSec,
    onTouch: car => applyOilSlip(duel, oil, car)});
  if (oil) duel.emit({arsenalCue: 'weapon.oil.deploy', warlordMove: true, actor, hazard: oil,
    hitPosition: {x: oil.x, y: oil.y, z: oil.z}});
}

export function thinkDustmonger(duel, participant, actor, difficulty) {
  if (!actor.dustVeil) resetDustmonger(duel, actor);
  const move = actor.dustVeil, now = duel.state.stageTimeSec, arena = duel.state.arena;
  // Phase two raises the dust storm for the rest of the fight (drawn only).
  if (arena.warlordPhase === 2) arena.weather = 'dust-storm';
  const target = arenaActor(duel, 'player');
  const pose = {...worldPose(duel, actor), y: duel.course.groundAt(actor.s, actor.lateral).y ?? 0};
  trackStraight(duel, actor, pose);
  if (outOfPlay(duel, actor) || !target || outOfPlay(duel, target)) {
    if (move.stage !== 'idle') setStage(duel, participant, actor, 'idle');
    return null;
  }
  const pace = arenaFloorSpeed(duel.course.def.scrapdome, arenaCarSpec(duel, actor).topSpeed) * difficulty.pace;

  if (move.stage === 'window') {
    if (now + EPSILON >= move.untilSec) {
      setStage(duel, participant, actor, 'idle');
      return null;
    }
    return straightGoal({...pose, heading: move.runHeading}, pace * DUST_RULES.windowSpeedShare);
  }
  if (move.stage === 'tell') {
    actor.arenaTellSec = Math.max(0, move.untilSec - now);
    if (now + EPSILON < move.untilSec)
      return straightGoal({...pose, heading: move.runHeading}, pace * DUST_RULES.tellSpeedShare);
    releaseVeil(duel, actor, pose);
    setStage(duel, participant, actor, 'window');
    move.untilSec = now + DUST_RULES.windowSec;
    move.runHeading = pose.heading;
    duel._callout("HE'S CHOKING. HIT HIM NOW!", DUST_RULES.windowSec);
    return straightGoal(pose, pace * DUST_RULES.windowSpeedShare);
  }
  if (now + EPSILON >= move.nextVeilSec && playerBehind(duel, pose, target)) {
    setStage(duel, participant, actor, 'tell');
    const seconds = difficulty.tellSec;
    move.untilSec = now + seconds;
    move.nextVeilSec = now + cooldown(duel);
    move.runHeading = pose.heading;
    actor.arenaTellSec = seconds;
    duel._callout('DUST VEIL!', seconds + .4);
    duel.emit({arenaTell: {id: actor.arenaId, targetId: 'player', seconds,
      position: {x: pose.x, y: pose.y, z: pose.z}}});
    return straightGoal(pose, pace * DUST_RULES.tellSpeedShare);
  }
  return null;
}

export const DUSTMONGER_FIGHT = Object.freeze({
  reset: resetDustmonger,
  think: thinkDustmonger,
  // His coughing engine leaves his rear open.
  defense: (duel, victim, victimFace) => inFight(duel, victim) &&
    victim.dustVeil.stage === 'window' && victimFace === 'rear' ? DUST_RULES.windowRearMultiplier : 1,
});
