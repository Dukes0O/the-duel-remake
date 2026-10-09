import {CONVOY_VALVE_CENTRES} from '../arena/convoy.js';
import {isConvoyRig, stepConvoyRig} from '../arena/modes/convoy-raid.js';
import {brainDifficulty} from '../arena/arena-brains.js';
import {worldPose} from '../arena/arena-floor.js';
import {deployCaltrops} from '../arsenal/caltrops.js';
import {makeRng} from '../rng.js';

const EPSILON = 1e-9;
export const TOLLKEEPER_RULES = Object.freeze({
  stripMetres: 12, gapMetres: 4, gapMinimum: 3, gapMaximum: 9,
  get coreValve() { return CONVOY_VALVE_CENTRES.reduce((best, at, index, list) =>
    at[2] < list[best][2] ? index : best, 0); },
  windowSec: 3, windowMultiplier: 2, phaseTwoCooldown: .8,
  cooldownSec: Object.freeze({easy: 14, medium: 11, hard: 9}),
});

function clearMarkers(duel, actor) {
  const arena = duel.state.arena;
  arena.markers = (arena.markers || []).filter(marker => marker.owner !== actor.arenaId);
}

export function resetTollkeeper(duel, actor) {
  if (!isConvoyRig(duel, actor)) return;
  actor.tollGate = {stage: 'idle', nextGateSec: actor.tollGate?.nextGateSec ?? 0,
    sequence: actor.tollGate?.sequence ?? 0};
  actor.convoyLampSignal = null;
  clearMarkers(duel, actor);
}

function cooldown(duel) {
  const rules = TOLLKEEPER_RULES, arena = duel.state.arena;
  return (rules.cooldownSec[duel.state.cpuDifficulty] ?? rules.cooldownSec.medium) *
    (arena.warlordPhase === 2 ? rules.phaseTwoCooldown : 1);
}

function tell(duel, actor) {
  const move = actor.tollGate, now = duel.state.stageTimeSec;
  const seconds = brainDifficulty(duel).tellSec;
  move.stage = 'tell'; move.sinceSec = now; move.untilSec = now + seconds;
  move.nextGateSec = now + cooldown(duel);
  const rng = makeRng(duel.seed ^ 0x746f6c6c ^ Math.imul(++move.sequence, 0x45d9f3b));
  move.gapCentre = rng.range(TOLLKEEPER_RULES.gapMinimum, TOLLKEEPER_RULES.gapMaximum);
  actor.convoyLampSignal = {untilSec: move.untilSec, kind: 'tell'};
  duel._callout('TOLL GATE!', seconds + .4);
  const at = worldPose(duel, actor);
  duel.emit({arenaTell: {id: actor.arenaId, targetId: 'player', seconds,
    cue: 'arena.toll-gate', position: {x: at.x, y: at.y, z: at.z}}});
}

function deployGate(duel, actor) {
  const move = actor.tollGate, rules = TOLLKEEPER_RULES;
  const at = worldPose(duel, actor), heading = at.heading;
  const x = at.x - Math.sin(heading) * 3, z = at.z - Math.cos(heading) * 3;
  const gapLeft = move.gapCentre - rules.gapMetres / 2;
  const gapRight = move.gapCentre + rules.gapMetres / 2;
  for (const [left, right] of [[0, gapLeft], [gapRight, rules.stripMetres]]) {
    const side = (left + right - rules.stripMetres) / 2;
    deployCaltrops(duel, actor, 0, {x: x + Math.cos(heading) * side,
      z: z - Math.sin(heading) * side, heading, width: right - left});
  }
  clearMarkers(duel, actor);
  move.markersUntilSec = duel.state.stageTimeSec + 8;
  for (const edge of [gapLeft, gapRight]) {
    const side = edge - rules.stripMetres / 2;
    const mx = x + Math.cos(heading) * side, mz = z - Math.sin(heading) * side;
    const near = duel.course.nearest(mx, mz, actor.s);
    duel.state.arena.markers.push({owner: actor.arenaId, kind: 'light', color: 'safe',
      x: mx, z: mz, y: duel.course.groundAt(near.s, near.lateral).y, radius: .45});
  }
  move.stage = 'window'; move.deployedSec = duel.state.stageTimeSec;
  move.untilSec = move.deployedSec + rules.windowSec;
  actor.convoyLampSignal = {untilSec: move.untilSec, kind: 'core'};
  duel._callout('CORE LIT. HIT THE REAR VALVE!', rules.windowSec);
  duel.emit({warlordWindow: {id: actor.arenaId, open: true, soundCue: 'interface.go'}});
}

export function moveTollkeeper(duel, actor, dt) {
  if (!isConvoyRig(duel, actor)) return false;
  if (!actor.tollGate) resetTollkeeper(duel, actor);
  const move = actor.tollGate, arena = duel.state.arena, now = duel.state.stageTimeSec;
  if (move.markersUntilSec && now + EPSILON >= move.markersUntilSec) clearMarkers(duel, actor);
  if (move.stage === 'tell' && now + EPSILON >= move.untilSec) deployGate(duel, actor);
  else if (move.stage === 'window' && now + EPSILON >= move.untilSec) {
    move.stage = 'idle'; actor.convoyLampSignal = null;
    duel.emit({warlordWindow: {id: actor.arenaId, open: false, soundCue: 'interface.go'}});
  }
  if (move.stage === 'idle' && !arena.convoy.chargePlanted && now + EPSILON >= move.nextGateSec)
    tell(duel, actor);
  return stepConvoyRig(duel, actor, dt);
}

export function tollkeeperValvesDamaged(duel, actor) {
  const arena = duel.state.arena;
  if (!isConvoyRig(duel, actor) || arena.warlordPhase !== 1 ||
      !arena.convoy.valves.some(armor => armor === 0)) return;
  arena.warlordPhase = 2;
  arena.respawnRequests = arena.participants.filter(participant => participant.wreckScorable === false)
    .map(participant => participant.id);
  duel.emit({warlordPhase: {warlordId: arena.warlordId, phase: 2}});
}

export function tollkeeperValveMultiplier(duel, actor, index) {
  return index === TOLLKEEPER_RULES.coreValve && actor.tollGate?.stage === 'window' &&
    duel.state.stageTimeSec + EPSILON < actor.tollGate.untilSec
    ? TOLLKEEPER_RULES.windowMultiplier : 1;
}

export const TOLLKEEPER_FIGHT = Object.freeze({
  featureFlag: 'tollkeeper',
  reset: resetTollkeeper, motion: moveTollkeeper, valveMultiplier: tollkeeperValveMultiplier,
  valvesDamaged: tollkeeperValvesDamaged,
});
