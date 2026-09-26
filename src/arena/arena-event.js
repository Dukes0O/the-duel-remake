import {stepCombat} from '../combat.js';
import {arenaActor, arenaParticipant} from '../combat-teams.js';
import {containInArena, worldPose} from './arena-floor.js';
import {pilotStep} from './arena-pilot.js';
import {thinkBrain, STYLE_ORDER} from './arena-brains.js';
import {spawnSlots} from './venues.js';

// Arena event rules (docs/SCRAPDOME.md sections 3 and 7). `state.arena` is the
// whole event; its presence replaces laps, finish, traffic, police and raiders.

export const ARENA_MODES = Object.freeze({
  'last-car-rolling': Object.freeze({timeLimitSec: 150, suddenDeathSec: 30, maxOpponents: 3}),
});

// Computer drivers are named, so callouts read "YOU WRECKED GASKET", and the
// default field is varied. The Titan is saved for Kettle Kingpin.
export const ARENA_DRIVER_NAMES = Object.freeze(['GASKET', 'RIVET', 'SPROCKET']);
export const ARENA_FIELD = Object.freeze(['dusthawk_rally', 'aurora_gt', 'stuttgart_959s', 'banshee_muscle', 'falcone_f42', 'viper_proto']);

export const ARENA_RULES = Object.freeze({
  creditWindowSec: 5, protectedSec: 2, respawnSpeedMph: 12, spawnClearMetres: 12,
  // Lighter than race armor: every wreck is a point and a car is back in
  // four seconds, so wrecks should come every half a minute or so.
  armorScale: .5,
});

export function createArenaEvent({mode, venueId, opponentBrains, course}) {
  const rules = ARENA_MODES[mode];
  const participants = [{id: 'player', team: 'player', kind: 'player', brain: null, name: 'YOU'}];
  opponentBrains.forEach((brain, index) => participants.push({id: `cpu-${index + 1}`,
    team: `cpu-${index + 1}`, kind: 'cpu', brain: brain || STYLE_ORDER[index % STYLE_ORDER.length],
    name: ARENA_DRIVER_NAMES[index % ARENA_DRIVER_NAMES.length]}));
  return {
    version: 1, venueId, mode, phase: 'countdown',
    clockSec: 0, timeLimitSec: rules.timeLimitSec, suddenDeathSec: 0, suddenDeathLimitSec: rules.suddenDeathSec,
    participants: participants.map(p => ({...p, wrecks: 0, wrecked: 0, damageDealt: 0,
      lastHitBy: null, lastHitAt: -Infinity, protectedSec: 0, targetId: null, targetHeldSec: 0,
      reactionSec: 0, goal: null, wreckCounted: false, spawnSlot: null})),
    spawnSlots: spawnSlots(course),
    result: null,
  };
}

// Evenly spread starting slots: the player first, then around the ring.
export function startingSlots(slotCount, carCount) {
  return Array.from({length: carCount}, (_, index) => Math.round(index * slotCount / carCount) % slotCount);
}

// Every car in an arena event carries the same share of its race armor.
export function applyArenaArmor(duel) {
  for (const actor of [duel.state, ...duel.state.opponents]) {
    if (!Number.isFinite(actor.maxArmor)) continue;
    actor.maxArmor *= ARENA_RULES.armorScale;
    actor.armor = actor.maxArmor;
  }
}

// Put a car at a pose with the kinematic state of a fresh start.
export function placeActor(duel, actor, pose, speedMph = 0) {
  actor.s = actor.prevS = pose.s; actor.lateral = actor.prevLateral = pose.lateral;
  actor.headingError = pose.headingError || 0;
  actor.speedMph = speedMph; actor.yawVelocity = 0; actor.pushVelocity = 0; actor.slipAngle = 0;
  actor.steerVisual = 0; actor.drifting = false; actor.boosting = false;
  actor.airborne = false; actor.airHeight = 0; actor.prevAirHeight = 0; actor._jumpY = null;
  actor._verticalSpeed = 0; actor._jumpOrigin = null; actor._ramVerticalSpeed = 0;
  actor.groundHeight = null; actor.prevGroundHeight = null; actor.terrainPitch = null;
  actor.terrainRoll = null; actor.tumble = null; actor.impactTimer = 0;
  actor._arenaWatch = null; actor._arenaReverseSec = 0; actor._arenaGraceSec = 0; actor._arenaUTurn = 0;
  if (actor === duel.state) {
    actor.gear = 0; actor.revs = 0; actor.overrevSec = 0; actor.reverseHoldSec = 0;
    actor.crashSpin = 0; actor.impactDuration = 0; actor.offRoad = false;
  }
}

function enemiesOf(duel, participant) {
  return duel.state.arena.participants.filter(other => other !== participant && other.team !== participant.team)
    .map(other => arenaActor(duel, other.id)).filter(actor => actor && !actor.combatWrecking);
}

// The free slot farthest from enemies (docs/SCRAPDOME.md 3, Respawn).
export function chooseRespawnSlot(duel, participant) {
  const state = duel.state, arena = state.arena, self = arenaActor(duel, participant.id);
  const others = [state, ...state.opponents].filter(actor => actor !== self && !actor.combatWrecking);
  const enemies = enemiesOf(duel, participant);
  let best = null, bestScore = -Infinity;
  for (const slot of arena.spawnSlots) {
    const at = duel.course.worldAt(slot.s, slot.lateral);
    const clear = others.every(actor => {
      const pose = worldPose(duel, actor);
      return Math.hypot(pose.x - at.x, pose.z - at.z) >= ARENA_RULES.spawnClearMetres;
    });
    if (!clear) continue;
    const score = enemies.length ? Math.min(...enemies.map(actor => {
      const pose = worldPose(duel, actor);
      return Math.hypot(pose.x - at.x, pose.z - at.z);
    })) : 0;
    if (score > bestScore) { best = slot; bestScore = score; }
  }
  return best || arena.spawnSlots[0];
}

function respawn(duel, participant, actor) {
  const slot = chooseRespawnSlot(duel, participant);
  placeActor(duel, actor, slot, ARENA_RULES.respawnSpeedMph);
  participant.spawnSlot = slot.index;
  actor.armor = actor.maxArmor;
  actor.combatWrecking = false; actor.combatWreckTimer = 0; actor.combatWreckSite = null;
  actor.combatTerrainIncident = null;
  participant.protectedSec = ARENA_RULES.protectedSec;
  participant.wreckCounted = false;
  participant.goal = null; participant.reactionSec = 0;
  if (actor === duel.state) {
    duel.state.invulnerableSec = Math.max(duel.state.invulnerableSec, ARENA_RULES.protectedSec);
    duel.state.impactTimer = 0; duel.state.crashFlash = 0;
  }
  duel.emit({arenaRespawn: {id: participant.id, slot: slot.index}});
}

// Wrecks become points exactly once, credited to the last recent attacker.
function creditWrecks(duel) {
  const state = duel.state, arena = state.arena;
  for (const participant of arena.participants) {
    const actor = arenaActor(duel, participant.id);
    if (!actor?.combatWrecking || participant.wreckCounted) continue;
    participant.wreckCounted = true;
    participant.wrecked++;
    const recent = participant.lastHitBy &&
      state.stageTimeSec - participant.lastHitAt <= ARENA_RULES.creditWindowSec;
    const credited = recent ? arena.participants.find(p => p.id === participant.lastHitBy) : null;
    if (credited) credited.wrecks++;
    participant.lastHitBy = null; participant.lastHitAt = -Infinity;
    duel.emit({arenaWreck: {victimId: participant.id, creditedId: credited?.id || null}});
    if (credited?.id === 'player') duel._callout(`YOU WRECKED ${participant.name}`, 2);
    else if (participant.id === 'player' && credited) duel._callout(`WRECKED BY ${credited.name}`, 2);
  }
}

export function arenaRanking(arena) {
  return arena.participants.map((participant, order) => ({participant, order})).sort((a, b) =>
    (b.participant.wrecks - b.participant.wrecked) - (a.participant.wrecks - a.participant.wrecked) ||
    b.participant.wrecks - a.participant.wrecks ||
    b.participant.damageDealt - a.participant.damageDealt || a.order - b.order).map(entry => entry.participant);
}

function topTied(arena) {
  const [first, second] = arenaRanking(arena);
  return !!second && first.wrecks - first.wrecked === second.wrecks - second.wrecked &&
    first.wrecks === second.wrecks;
}

function finish(duel, reason) {
  const state = duel.state, arena = state.arena;
  const placings = arenaRanking(arena).map(participant => participant.id);
  arena.phase = 'over';
  arena.result = {placings, winnerId: placings[0], reason};
  state.status = 'arena_result';
  state.results = {arena: arena.result};
  const winner = arena.participants.find(p => p.id === placings[0]);
  duel._callout(winner.id === 'player' ? 'LAST CAR ROLLING / YOU WIN' : `${winner.name} WINS`, 3);
  duel.emit({arenaPhase: {phase: 'over'}, arenaResult: {result: arena.result}});
}

function stepClock(duel, dt) {
  const arena = duel.state.arena;
  if (arena.phase === 'countdown') {
    arena.phase = 'fight';
    duel.emit({arenaPhase: {phase: 'fight'}});
  }
  if (arena.phase === 'fight') {
    arena.clockSec = Math.min(arena.timeLimitSec, arena.clockSec + dt);
    if (arena.clockSec < arena.timeLimitSec) return;
    if (!topTied(arena)) return finish(duel, 'time');
    arena.phase = 'sudden-death';
    duel._callout('SUDDEN DEATH / NEXT WRECK WINS', 3);
    duel.emit({arenaPhase: {phase: 'sudden-death'}});
    return;
  }
  if (arena.phase === 'sudden-death') {
    arena.suddenDeathSec = Math.min(arena.suddenDeathLimitSec, arena.suddenDeathSec + dt);
    if (!topTied(arena)) return finish(duel, 'sudden-death');
    if (arena.suddenDeathSec >= arena.suddenDeathLimitSec) finish(duel, 'damage');
  }
}

function stepWreckedActor(duel, actor, dt) {
  actor.combatWreckTimer = Math.max(0, (actor.combatWreckTimer || 0) - dt);
  actor.impactTimer = actor.combatWreckTimer;
  actor.speedMph *= Math.exp(-3.2 * dt);
  if (actor === duel.state) duel.state.impactTimer = actor.combatWreckTimer;
  return actor.combatWreckTimer === 0;
}

// One fixed step of an arena event while status is 'racing'.
export function stepArenaEvent(duel, dt) {
  const state = duel.state, arena = state.arena;
  state.stageTimeSec += dt; state.totalTimeSec += dt;
  if (state.crashFlash > 0) state.crashFlash = Math.max(0, state.crashFlash - dt);
  state.invulnerableSec = Math.max(0, state.invulnerableSec - dt);
  state.damageCooldown = Math.max(0, state.damageCooldown - dt);
  state.calloutTimer = Math.max(0, state.calloutTimer - dt);
  for (const participant of arena.participants)
    participant.protectedSec = Math.max(0, participant.protectedSec - dt);
  for (const actor of state.opponents)
    if (actor.damageCooldown > 0) actor.damageCooldown = Math.max(0, actor.damageCooldown - dt);

  stepCombat(duel, dt);

  const respawns = [];
  if (state.combatWrecking) { if (stepWreckedActor(duel, state, dt)) respawns.push(state); }
  else {
    duel._drive(dt);
    duel._jump(state, dt);
    containInArena(duel, state, dt);
  }
  for (const actor of state.opponents) {
    if (actor.combatWrecking) { if (stepWreckedActor(duel, actor, dt)) respawns.push(actor); continue; }
    const participant = arenaParticipant(duel, actor);
    pilotStep(duel, actor, thinkBrain(duel, participant, actor, dt), dt);
    if (!duel._ramFlight(actor, dt)) duel._jump(actor, dt);
    containInArena(duel, actor, dt);
  }
  duel._collisions();
  for (const actor of [state, ...state.opponents]) if (!actor.combatWrecking) containInArena(duel, actor, 0);
  duel._crushProps(state);
  for (const actor of state.opponents) duel._crushProps(actor);

  creditWrecks(duel);
  for (const actor of respawns) respawn(duel, arenaParticipant(duel, actor), actor);
  stepClock(duel, dt);
}
