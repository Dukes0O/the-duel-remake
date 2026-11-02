import {arenaActor, outOfPlay, combatOwnerId} from '../combat-teams.js';
import {worldPose} from '../arena/arena-floor.js';
import {applyArmorDamage} from '../combat-armor.js';
import {startKnock} from '../vehicle-knock.js';
import {addCarSidewaysPush} from '../arsenal/car-effects.js';

// Magnus the Magnet (docs/SCRAPDOME.md, "Settled for build: Magnus the
// Magnet"): the Falcone Heritage on the gunner brain. Between pulls the
// ordinary gunner drives him; this file adds the Big Pull, the clang when a
// pulled car reaches his magnet, the red-hot window and the phase-two double
// pull. Everything is read from the fight's own state, no randomness.
export const MAGNUS_RULES = Object.freeze({
  minMetres: 10, maxMetres: 30, reachMetres: 30, tellScale: 1.5,
  cooldownSec: Object.freeze({easy: 14, medium: 11, hard: 8}),
  // The pull adds this much push a second; the car's own push decay (2.4 a
  // second) settles it near a fifth of this, about 4, 5.5 and 7 m/s.
  pullMps2: Object.freeze({easy: 9.6, medium: 13.2, hard: 16.8}),
  pullSec: 2.5, gapSec: 1, hotSec: 3, hotDefense: 1.5,
  // A pulled car that reaches the magnet is hit and thrown clear.
  clangMetres: 5, clangArmor: Object.freeze({easy: 10, medium: 15, hard: 20}), clangMps: 25 * .44704 * .5,
  // A warlord car's arena armor is halved, then scaled (src/arena/arena-event.js): the Heritage's 50 times 1.5.
  armor: Object.freeze({easy: 60, medium: 75, hard: 75}),
  // His rams on the player, as a share of an ordinary ram (his own Easy).
  ramShare: Object.freeze({easy: .5, medium: 1, hard: 1}),
});
const EPSILON = 1e-9;
const cooldown = duel => MAGNUS_RULES.cooldownSec[duel.state.cpuDifficulty] ?? MAGNUS_RULES.cooldownSec.medium;
const byDifficulty = (duel, table) => table[duel.state.cpuDifficulty] ?? table.medium;

export function resetMagnus(duel, actor) {
  const old = actor.magnusPull;
  if (old?.stage === 'pull') endHum(duel, actor);
  actor.magnusPull = {stage: 'idle', sinceSec: duel.state.stageTimeSec, untilSec: 0,
    nextPullSec: old?.nextPullSec ?? duel.state.stageTimeSec + cooldown(duel), pullsLeft: 0, lastSec: null};
  actor.maxArmor = byDifficulty(duel, MAGNUS_RULES.armor);
  actor.armor = actor.maxArmor;
  actor.arenaTellSec = 0;
  clearRing(duel);
}

function clearRing(duel) {
  const arena = duel.state.arena;
  if (arena?.markers) arena.markers = arena.markers.filter(marker => marker.owner !== 'magnus');
}

// The blue ring shows the magnet's reach and follows him while it is on.
function showRing(duel, actor) {
  const arena = duel.state.arena, at = worldPose(duel, actor);
  const y = duel.course.groundAt(actor.s, actor.lateral).y ?? 0;
  clearRing(duel);
  arena.markers = [...(arena.markers || []), {owner: 'magnus', kind: 'ring', color: 'magnet',
    x: at.x, y, z: at.z, radius: MAGNUS_RULES.reachMetres}];
}

function setStage(duel, participant, actor, stage, seconds = 0) {
  const move = actor.magnusPull;
  move.stage = stage;
  move.sinceSec = duel.state.stageTimeSec;
  move.untilSec = duel.state.stageTimeSec + seconds;
  move.lastSec = null;
  if (participant) { participant.goal = null; participant.reactionSec = 0; participant.tellLeft = 0; }
  actor.arenaTellSec = 0;
}

// The hum lasts while its field is listed in the fight's combat state (the audio keeps
// a field's voice only while the field is there); the pull's end removes it.
function startHum(duel, actor) {
  const combat = duel.state.combat, at = worldPose(duel, actor);
  if (!combat) return;
  const field = {ownerId: actor.arenaId, kind: 'magnus-pull'};
  combat.warlordFields = [...(combat.warlordFields || []).filter(item => item.ownerId !== actor.arenaId), field];
  duel.emit({arsenalCue: 'weapon.magnet.hum', warlordMove: true, actor, magnet: field,
    hitPosition: {x: at.x, y: duel.course.groundAt(actor.s, actor.lateral).y ?? 0, z: at.z}});
}
function endHum(duel, actor) {
  const combat = duel.state.combat;
  if (combat?.warlordFields) combat.warlordFields = combat.warlordFields.filter(item => item.ownerId !== actor.arenaId);
  duel.emit({arsenalMagnetEnded: true, ownerId: actor.arenaId, reason: 'warlord'});
}

function startTell(duel, participant, actor, difficulty) {
  const seconds = difficulty.tellSec * MAGNUS_RULES.tellScale;
  setStage(duel, participant, actor, 'tell', seconds);
  const move = actor.magnusPull;
  move.nextPullSec = duel.state.stageTimeSec + seconds + cooldown(duel);
  move.pullsLeft = duel.state.arena.warlordPhase === 2 ? 2 : 1;
  actor.arenaTellSec = seconds;
  showRing(duel, actor);
  duel._callout('MAGNET! DRIVE AWAY!', seconds + .4);
  const pose = worldPose(duel, actor);
  duel.emit({arenaTell: {id: actor.arenaId, targetId: 'player', seconds,
    position: {x: pose.x, y: duel.course.groundAt(actor.s, actor.lateral).y ?? 0, z: pose.z}}});
}

function startPull(duel, participant, actor) {
  setStage(duel, participant, actor, 'pull', MAGNUS_RULES.pullSec);
  actor.magnusPull.pullsLeft -= 1;
  showRing(duel, actor);
  startHum(duel, actor);
}

function startHot(duel, participant, actor) {
  setStage(duel, participant, actor, 'hot', MAGNUS_RULES.hotSec);
  clearRing(duel);
  duel._callout('HIS MAGNET IS RED HOT. HIT HIM NOW!', MAGNUS_RULES.hotSec);
}

function endPull(duel, participant, actor) {
  endHum(duel, actor);
  if (actor.magnusPull.pullsLeft > 0) {
    // Phase two: a short breath, the ring still showing, then the second pull.
    setStage(duel, participant, actor, 'gap', MAGNUS_RULES.gapSec);
    showRing(duel, actor);
  } else startHot(duel, participant, actor);
}

// Push a car towards a world point. The car's push follows the road normal and
// its along-push the road's forward line (src/sim-driving.js); this splits the
// pull into those two parts through the arsenal's one push helper.
function pullCar(duel, car, from, to, metresPerSecond) {
  const dx = to.x - from.x, dz = to.z - from.z, distance = Math.hypot(dx, dz);
  if (!(distance > EPSILON) || !(metresPerSecond > 0)) return;
  const road = duel.course.at(car.s).heading, wx = dx / distance, wz = dz / distance;
  const normal = wx * Math.cos(road) - wz * Math.sin(road), along = wx * Math.sin(road) + wz * Math.cos(road);
  addCarSidewaysPush(car, metresPerSecond, Math.atan2(-along, normal));
}

// The pulled car reached the magnet: armor off, thrown clear, and the pull ends.
function clang(duel, actor, car, me, at) {
  applyArmorDamage(duel, car, 'fixed', {owner: combatOwnerId(duel, actor), amount: byDifficulty(duel, MAGNUS_RULES.clangArmor)});
  duel._callout('CLANG!', 1.2);
  duel.emit({combatHit: true, strength: .4, enemy: true, victim: 'player', hitPosition: {x: at.x, y: 0, z: at.z}});
  if (outOfPlay(duel, car)) return;
  const dx = at.x - me.x, dz = at.z - me.z, distance = Math.hypot(dx, dz);
  const away = distance > 1e-6 ? {x: dx / distance, z: dz / distance} : {x: Math.sin(me.heading), z: Math.cos(me.heading)};
  startKnock(car, {vx: away.x * MAGNUS_RULES.clangMps, vz: away.z * MAGNUS_RULES.clangMps,
    spin: 0, severity: 'knocked', heading: at.heading, player: car === duel.state, arenaShove: true});
}

// The pull works on the player only (a warlord fights the player alone); it
// never moves Magnus himself, so the motion hook always hands back control.
export function moveMagnus(duel, actor, dt) {
  const move = actor.magnusPull;
  if (move?.stage !== 'pull' || !(dt > 0)) return false;
  const target = arenaActor(duel, 'player');
  if (!target || outOfPlay(duel, target) || outOfPlay(duel, actor) || target.knock) return false;
  showRing(duel, actor);
  const me = worldPose(duel, actor), at = worldPose(duel, target);
  const distance = Math.hypot(at.x - me.x, at.z - me.z);
  if (distance > MAGNUS_RULES.reachMetres) return false;
  if (distance <= MAGNUS_RULES.clangMetres) {
    clang(duel, actor, target, me, at);
    move.pullsLeft = 0;
    endPull(duel, null, actor);
    return false;
  }
  pullCar(duel, target, at, me, byDifficulty(duel, MAGNUS_RULES.pullMps2) * dt);
  return false;
}

const still = me => ({x: me.x, z: me.z, speedMph: 0, boost: false});

export function thinkMagnus(duel, participant, actor, difficulty) {
  if (!actor.magnusPull) resetMagnus(duel, actor);
  const move = actor.magnusPull, now = duel.state.stageTimeSec;
  const target = arenaActor(duel, 'player');
  if (outOfPlay(duel, actor) || !target || outOfPlay(duel, target)) {
    if (move.stage === 'pull') endHum(duel, actor);
    if (move.stage !== 'idle') { setStage(duel, participant, actor, 'idle'); clearRing(duel); }
    return null;
  }
  const me = worldPose(duel, actor);
  if (move.stage === 'tell') {
    actor.arenaTellSec = Math.max(0, move.untilSec - now);
    if (now + EPSILON >= move.untilSec) startPull(duel, participant, actor);
    return still(me);
  }
  if (move.stage === 'pull') {
    if (now + EPSILON >= move.untilSec) endPull(duel, participant, actor);
    return still(me);
  }
  if (move.stage === 'gap') {
    if (now + EPSILON >= move.untilSec) startPull(duel, participant, actor);
    return still(me);
  }
  if (move.stage === 'hot') {
    if (now + EPSILON >= move.untilSec) { setStage(duel, participant, actor, 'idle'); return null; }
    return still(me);
  }
  const at = worldPose(duel, target), distance = Math.hypot(at.x - me.x, at.z - me.z);
  if (now + EPSILON >= move.nextPullSec && !target.airborne && !(target.airHeight > 0) &&
      distance >= MAGNUS_RULES.minMetres && distance <= MAGNUS_RULES.maxMetres) {
    startTell(duel, participant, actor, difficulty);
    return still(me);
  }
  return null;
}

// The hooks the shared arena files call (docs/SCRAPDOME.md section 7).
export const MAGNUS_FIGHT = Object.freeze({
  featureFlag: 'warlord-nine',
  reset: resetMagnus,
  think: thinkMagnus,
  motion: moveMagnus,
  attack: (duel, attacker, victim) => victim === duel.state
    ? {multiplier: byDifficulty(duel, MAGNUS_RULES.ramShare), move: false} : null,
  // Any hit hurts him more while his magnet cools.
  defense: (duel, victim) => victim.magnusPull?.stage === 'hot' ? MAGNUS_RULES.hotDefense : 1,
  // No shots while the magnet is on: he is holding the crane. On Easy he never
  // shoots: his magnet and his rams are the whole fight.
  mayFire: (duel, actor) => duel.state.cpuDifficulty !== 'easy' && !['tell', 'pull', 'gap'].includes(actor.magnusPull?.stage),
});
