import {arenaActor, arenaParticipant, outOfPlay, combatOwnerId} from '../combat-teams.js';
import {DRIVE} from '../config.js';
import {worldPose, floorLimit} from '../arena/arena-floor.js';
import {applyArmorDamage} from '../combat-armor.js';
import {startKnock} from '../vehicle-knock.js';

// The Kettle Kingpin (docs/SCRAPDOME.md section 5): the Titan on the rammer
// brain. Between drops the ordinary rammer drives him; this file adds the
// Kettle Drop, its stuck window and the phase-two double drop.
export const KETTLE_RULES = Object.freeze({
  minMetres: 12, maxMetres: 40, reachMetres: 40, tellScale: 1.4,
  cooldownSec: Object.freeze({easy: 12, medium: 10, hard: 8}),
  ringRadius: 4, squareMetres: 1.8, arcSec: 1.2, arcHeight: 7,
  shoveMps: 25 * .44704 * .6, ringArmor: 20, squareArmor: 40,
  windowSec: 2.5, edgeMargin: 2,
});
const EPSILON = 1e-9;
const MPS_TO_MPH = 1 / .44704;

export function resetKettle(duel, actor) {
  const old = actor.kettleDrop;
  if (old?.stage === 'leap') land(duel, actor, false);
  actor.kettleDrop = {stage: 'idle', nextDropSec: old?.nextDropSec ?? 0, dropsLeft: 0};
  clearRing(duel);
}

function clearRing(duel) {
  const arena = duel.state.arena;
  if (arena?.markers) arena.markers = arena.markers.filter(marker => marker.owner !== 'kettle');
}

function showRing(duel, at) {
  const arena = duel.state.arena;
  clearRing(duel);
  arena.markers = [...(arena.markers || []), {owner: 'kettle', kind: 'ring', color: 'danger',
    x: at.x, y: at.y, z: at.z, radius: KETTLE_RULES.ringRadius}];
}

function setStage(duel, participant, actor, stage) {
  actor.kettleDrop.stage = stage;
  actor.kettleDrop.sinceSec = duel.state.stageTimeSec;
  participant.goal = null;
  participant.reactionSec = 0;
  participant.tellLeft = 0;
  actor.arenaTellSec = 0;
}

// Where the player will be when he lands, kept on the floor and within reach.
function aimLanding(duel, actor, target, seconds) {
  const me = worldPose(duel, actor), them = worldPose(duel, target);
  const speed = (target.speedMph || 0) * DRIVE.mphToWorld;
  let x = them.x + Math.sin(them.heading) * speed * seconds;
  let z = them.z + Math.cos(them.heading) * speed * seconds;
  const dx = x - me.x, dz = z - me.z, distance = Math.hypot(dx, dz);
  if (distance > KETTLE_RULES.reachMetres) {
    x = me.x + dx / distance * KETTLE_RULES.reachMetres;
    z = me.z + dz / distance * KETTLE_RULES.reachMetres;
  }
  const near = duel.course.nearest(x, z, actor.s);
  const limit = floorLimit(duel) - KETTLE_RULES.edgeMargin;
  const lateral = Math.max(-limit, Math.min(limit, near.lateral));
  const point = duel.course.worldAt(near.s, lateral);
  return {s: near.s, lateral, x: point.x, z: point.z, y: duel.course.groundAt(near.s, lateral).y ?? 0};
}

function startTell(duel, participant, actor, target, difficulty) {
  setStage(duel, participant, actor, 'tell');
  const move = actor.kettleDrop, seconds = difficulty.tellSec * KETTLE_RULES.tellScale;
  move.untilSec = duel.state.stageTimeSec + seconds;
  move.nextDropSec = duel.state.stageTimeSec + cooldown(duel);
  move.landing = aimLanding(duel, actor, target, seconds + KETTLE_RULES.arcSec);
  move.dropsLeft = duel.state.arena.warlordPhase === 2 ? 2 : 1;
  actor.arenaTellSec = seconds;
  showRing(duel, move.landing);
  duel._callout('KETTLE DROP!', seconds + .4);
  const pose = worldPose(duel, actor);
  duel.emit({arenaTell: {id: actor.arenaId, targetId: 'player', seconds,
    position: {x: pose.x, y: move.landing.y, z: pose.z}}});
}

function cooldown(duel) {
  return KETTLE_RULES.cooldownSec[duel.state.cpuDifficulty] ?? KETTLE_RULES.cooldownSec.medium;
}

function startLeap(duel, actor) {
  const move = actor.kettleDrop;
  move.stage = 'leap';
  move.sinceSec = duel.state.stageTimeSec;
  move.from = {s: actor.s, lateral: actor.lateral};
  actor.arenaTellSec = 0;
  actor.airborne = true;
  actor.airHeight = 0;
  actor.contactExempt = true;
  duel.emit({kettleLeap: {id: actor.arenaId}});
}

// Every car in the ring is shoved outward and loses armor; one landed on
// squarely loses more. The Kingpin's own body takes nothing.
function land(duel, actor, effects = true) {
  const move = actor.kettleDrop, at = move.landing;
  actor.airborne = false; actor.airHeight = 0; actor.prevAirHeight = 0; actor._jumpY = null;
  actor.contactExempt = false;
  actor.speedMph = 0;
  clearRing(duel);
  if (!effects) return;
  const owner = combatOwnerId(duel, actor);
  for (const car of [duel.state, ...duel.state.opponents]) {
    if (car === actor || car.decoy || outOfPlay(duel, car)) continue;
    const pose = worldPose(duel, car), dx = pose.x - at.x, dz = pose.z - at.z;
    const distance = Math.hypot(dx, dz);
    if (distance > KETTLE_RULES.ringRadius) continue;
    const square = distance <= KETTLE_RULES.squareMetres;
    applyArmorDamage(duel, car, 'fixed', {owner,
      amount: square ? KETTLE_RULES.squareArmor : KETTLE_RULES.ringArmor});
    if (outOfPlay(duel, car)) continue;
    const away = distance > 1e-6 ? {x: dx / distance, z: dz / distance}
      : {x: Math.sin(pose.heading + Math.PI / 2), z: Math.cos(pose.heading + Math.PI / 2)};
    startKnock(car, {vx: away.x * KETTLE_RULES.shoveMps, vz: away.z * KETTLE_RULES.shoveMps,
      spin: 0, severity: 'knocked', heading: pose.heading, player: car === duel.state, arenaShove: true});
  }
  duel.emit({kettleLanding: {id: actor.arenaId, position: {x: at.x, y: at.y, z: at.z}}});
}

// The leap moves him itself; the pilot and jump physics sit out (motion hook).
export function moveKettle(duel, actor, dt) {
  const move = actor.kettleDrop;
  if (move?.stage !== 'leap') return false;
  const t = Math.min(1, (duel.state.stageTimeSec - move.sinceSec) / KETTLE_RULES.arcSec);
  const along = duel.relativeS(move.landing.s, move.from.s) - move.from.s;
  actor.prevS = actor.s; actor.prevLateral = actor.lateral;
  actor.prevAirHeight = actor.airHeight;
  actor.s = move.from.s + along * t;
  actor.lateral = move.from.lateral + (move.landing.lateral - move.from.lateral) * t;
  actor.airHeight = 4 * KETTLE_RULES.arcHeight * t * (1 - t);
  actor.speedMph = Math.hypot(along, move.landing.lateral - move.from.lateral) / KETTLE_RULES.arcSec * MPS_TO_MPH;
  if (t + EPSILON < 1) return true;
  land(duel, actor);
  const participant = arenaParticipant(duel, actor);
  move.dropsLeft -= 1;
  const target = arenaActor(duel, 'player');
  if (move.dropsLeft > 0 && target && !outOfPlay(duel, target)) {
    // Phase two: the second ring appears as he lands, aimed the same way.
    move.landing = aimLanding(duel, actor, target, KETTLE_RULES.arcSec);
    showRing(duel, move.landing);
    startLeap(duel, actor);
    return true;
  }
  setStage(duel, participant, actor, 'window');
  move.untilSec = duel.state.stageTimeSec + KETTLE_RULES.windowSec;
  duel._callout("HE'S STUCK. HIT HIM NOW!", KETTLE_RULES.windowSec);
  return true;
}

export function thinkKettle(duel, participant, actor, difficulty) {
  if (!actor.kettleDrop) resetKettle(duel, actor);
  const move = actor.kettleDrop, now = duel.state.stageTimeSec;
  const target = arenaActor(duel, 'player');
  if (move.stage === 'leap') return {x: 0, z: 0, speedMph: 0, boost: false};
  if (outOfPlay(duel, actor) || !target || outOfPlay(duel, target)) {
    if (move.stage !== 'idle') { setStage(duel, participant, actor, 'idle'); clearRing(duel); }
    return null;
  }
  const me = worldPose(duel, actor);
  if (move.stage === 'window') {
    if (now + EPSILON >= move.untilSec) { setStage(duel, participant, actor, 'idle'); return null; }
    // Stuck: wheels spinning, going nowhere.
    return {x: me.x, z: me.z, speedMph: 0, boost: false};
  }
  if (move.stage === 'tell') {
    actor.arenaTellSec = Math.max(0, move.untilSec - now);
    if (now + EPSILON < move.untilSec) return {x: me.x, z: me.z, speedMph: 0, boost: false};
    startLeap(duel, actor);
    return {x: me.x, z: me.z, speedMph: 0, boost: false};
  }
  const at = worldPose(duel, target), distance = Math.hypot(at.x - me.x, at.z - me.z);
  if (now + EPSILON >= move.nextDropSec && !target.airborne && !(target.airHeight > 0) &&
      distance >= KETTLE_RULES.minMetres && distance <= KETTLE_RULES.maxMetres) {
    startTell(duel, participant, actor, target, difficulty);
    return {x: me.x, z: me.z, speedMph: 0, boost: false};
  }
  return null;
}

export const KETTLE_FIGHT = Object.freeze({
  reset: resetKettle,
  think: thinkKettle,
  motion: moveKettle,
});
