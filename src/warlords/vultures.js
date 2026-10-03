import {arenaActor, outOfPlay} from '../combat-teams.js';
import {predictedPoint} from '../combat-weapons.js';
import {worldPose, floorLimit} from '../arena/arena-floor.js';
import {arenaCarSpec} from '../arena/arena-pilot.js';
import {arenaFloorSpeed} from '../arena/venues.js';

// The Twin Vultures (docs/SCRAPDOME.md section 5): two raider buggies that
// fight as a pair. The first (cpu-1) harasses on the hunter brain; the second
// (cpu-2) shadows on the far side of the player and holds its fire until
// phase two. Every so often they pincer: both flash, then charge in from the
// left and right at once, aimed at where the player will be if he holds his
// speed. Braking (or turning away) during the tell leaves him short of that
// meeting point, so they meet each other instead.
// The pair's one move is kept on the first car; either car's think advances it.
export const VULTURE_RULES = Object.freeze({
  cooldownSec: Object.freeze({easy: 11, medium: 9, hard: 7}),
  triggerMetres: 80, flankMetres: 34, shadowMetres: 30, chargeMaxSec: 3, arrivalShare: .7,
  stunSec: 2.5, phaseTwoTellShare: .8, tellSpeedShare: .6, passedMetres: 12,
});
const EPSILON = 1e-9;

function pair(duel) {
  const ids = duel.state.arena.warlordTeamIds || [];
  return ids.map(id => arenaActor(duel, id));
}

function cooldown(duel) {
  return VULTURE_RULES.cooldownSec[duel.state.cpuDifficulty] ?? VULTURE_RULES.cooldownSec.medium;
}

function leaderOf(duel) { return pair(duel)[0]; }

function endMove(duel, move) {
  move.stage = 'idle';
  duel.state.arena.edgeCues = [];
  for (const car of pair(duel)) if (car) car.arenaTellSec = 0;
}

// Each car's start (the fight's opening, or a respawn). A respawn ends a
// move in progress: a pincer needs both cars.
export function resetVultures(duel) {
  const leader = leaderOf(duel);
  if (!leader) return;
  if (!leader.pincer) {
    // Their first pincer is not ready at the opening bell.
    leader.pincer = {stage: 'idle', nextSec: duel.state.stageTimeSec + cooldown(duel), untilSec: 0, tick: -1};
    return;
  }
  endMove(duel, leader.pincer);
}

function live(duel, car) { return !!car && !outOfPlay(duel, car) && !car.knock; }

function sideOf(player, pose) {
  // Positive: on the player's left.
  return Math.sign((pose.x - player.x) * -Math.cos(player.heading) + (pose.z - player.z) * Math.sin(player.heading)) || 1;
}

// A point on the floor `metres` from the player, to one side of its heading.
function flank(duel, player, sign, metres) {
  const x = player.x - Math.cos(player.heading) * metres * sign;
  const z = player.z + Math.sin(player.heading) * metres * sign;
  return onFloor(duel, x, z);
}

function onFloor(duel, x, z) {
  const near = duel.course.nearest(x, z, 0);
  const limit = floorLimit(duel) - 4;
  const lateral = Math.max(-limit, Math.min(limit, near.lateral));
  const at = duel.course.worldAt(near.s, lateral);
  return {x: at.x, z: at.z};
}

function startTell(duel, move, a, b, player, difficulty) {
  const seconds = difficulty.tellSec * (duel.state.arena.warlordPhase === 2 ? VULTURE_RULES.phaseTwoTellShare : 1);
  const at = [worldPose(duel, a), worldPose(duel, b)];
  const lead = sideOf(player, at[0]);
  // The meeting point: where the player will be when they arrive, if he holds
  // his speed and line. It is fixed now, so the player can outguess it.
  const topMps = arenaFloorSpeed(duel.course.def.scrapdome, arenaCarSpec(duel, a).topSpeed) *
    difficulty.pace * .44704;
  const arrival = seconds + VULTURE_RULES.flankMetres / (topMps * VULTURE_RULES.arrivalShare);
  const ahead = predictedPoint(duel, arenaActor(duel, 'player'), arrival);
  move.meet = onFloor(duel, ahead.x, ahead.z);
  move.stage = 'tell';
  move.untilSec = duel.state.stageTimeSec + seconds;
  move.nextSec = duel.state.stageTimeSec + cooldown(duel);
  move.sides = [lead, -lead];
  for (const [index, car] of [a, b].entries()) {
    car.arenaTellSec = seconds;
    duel.emit({arenaTell: {id: car.arenaId, targetId: 'player', seconds,
      position: {x: at[index].x, y: duel.course.groundAt(car.s, car.lateral).y ?? 0, z: at[index].z}}});
  }
  // Screen-edge cues for the HUD: which side each comes from.
  duel.state.arena.edgeCues = [{side: 'left', untilSec: move.untilSec}, {side: 'right', untilSec: move.untilSec}];
  duel._callout('PINCER!', seconds + .4);
  duel.emit({pincer: {seconds, sides: {[a.arenaId]: move.sides[0] > 0 ? 'left' : 'right',
    [b.arenaId]: move.sides[1] > 0 ? 'left' : 'right'}}});
}

// Advance the pair's move once a step, from whichever car thinks first.
function stepPincer(duel, difficulty) {
  const [a, b] = pair(duel), leader = a;
  if (!leader?.pincer) return null;
  const move = leader.pincer, now = duel.state.stageTimeSec;
  if (move.tick === now) return move;
  move.tick = now;
  const player = arenaActor(duel, 'player');
  if (!a || !b || !player || outOfPlay(duel, player) || outOfPlay(duel, a) || outOfPlay(duel, b)) {
    if (move.stage !== 'idle') endMove(duel, move);
    return move;
  }
  const them = worldPose(duel, player);
  if (move.stage === 'tell') {
    for (const car of [a, b]) car.arenaTellSec = Math.max(0, move.untilSec - now);
    if (now + EPSILON >= move.untilSec) {
      move.stage = 'charge';
      move.untilSec = now + VULTURE_RULES.chargeMaxSec;
      for (const car of [a, b]) car.arenaTellSec = 0;
    }
  } else if (move.stage === 'charge') {
    const passed = car => {
      const pose = worldPose(duel, car), dx = move.meet.x - pose.x, dz = move.meet.z - pose.z;
      return Math.hypot(dx, dz) < VULTURE_RULES.passedMetres &&
        dx * Math.sin(pose.heading) + dz * Math.cos(pose.heading) <= 0;
    };
    if (now + EPSILON >= move.untilSec || passed(a) && passed(b)) endMove(duel, move);
  } else if (move.stage === 'stun') {
    if (now + EPSILON >= move.untilSec) endMove(duel, move);
  } else if (now + EPSILON >= move.nextSec && live(duel, a) && live(duel, b)) {
    const near = car => Math.hypot(worldPose(duel, car).x - them.x, worldPose(duel, car).z - them.z);
    if (near(a) <= VULTURE_RULES.triggerMetres && near(b) <= VULTURE_RULES.triggerMetres)
      startTell(duel, move, a, b, them, difficulty);
  }
  return move;
}

export function thinkVultures(duel, participant, actor, difficulty) {
  const [a, b] = pair(duel);
  if (!a || !b) return null;
  // Both always hunt the player, whatever the hunter cap would choose.
  participant.targetId = 'player';
  const move = stepPincer(duel, difficulty);
  const player = arenaActor(duel, 'player');
  if (!move || !player || outOfPlay(duel, player) || outOfPlay(duel, actor)) return null;
  const me = worldPose(duel, actor), them = worldPose(duel, player);
  const index = actor === a ? 0 : 1, mate = actor === a ? b : a;
  const top = arenaFloorSpeed(duel.course.def.scrapdome, arenaCarSpec(duel, actor).topSpeed) * difficulty.pace;
  if (move.stage === 'stun') {
    participant.goal = null;
    return {x: me.x, z: me.z, speedMph: 0, boost: false};
  }
  if (move.stage === 'tell') {
    participant.goal = null;
    const spot = flank(duel, {...them, ...move.meet}, move.sides[index], VULTURE_RULES.flankMetres);
    return {...spot, speedMph: top * VULTURE_RULES.tellSpeedShare, boost: false};
  }
  if (move.stage === 'charge') {
    participant.goal = null;
    // The nearer car eases off so both arrive at the meeting point together.
    const reach = car => Math.hypot(move.meet.x - worldPose(duel, car).x, move.meet.z - worldPose(duel, car).z);
    const share = Math.max(.5, reach(actor) / Math.max(1, reach(a), reach(b)));
    return {x: move.meet.x, z: move.meet.z, speedMph: top * share, boost: share > .95 && difficulty.boost !== 'never'};
  }
  // Between pincers the first car harasses on the ordinary hunter brain; the
  // second shadows from the far side of the player.
  if (index === 0 || outOfPlay(duel, mate)) return null;
  const matePose = worldPose(duel, mate);
  const dx = them.x - matePose.x, dz = them.z - matePose.z, length = Math.max(1, Math.hypot(dx, dz));
  const across = onFloor(duel, them.x + dx / length * VULTURE_RULES.shadowMetres,
    them.z + dz / length * VULTURE_RULES.shadowMetres);
  return {...across, speedMph: top * .85, boost: false};
}

// The two buggies actually colliding during a charge (the crash contact calls
// this for the first impact of the pair): both are stunned.
function contactVultures(duel, a, b) {
  const [first, second] = pair(duel), move = first?.pincer;
  if (!move || move.stage !== 'charge' || ![first, second].includes(a) || ![first, second].includes(b)) return;
  move.stage = 'stun';
  move.untilSec = duel.state.stageTimeSec + VULTURE_RULES.stunSec;
  for (const car of [first, second]) car.arenaTellSec = 0;
  duel._callout('THEY HIT EACH OTHER. NOW!', VULTURE_RULES.stunSec);
  duel.emit({vulturesCollide: {seconds: VULTURE_RULES.stunSec}});
}

export const VULTURES_FIGHT = Object.freeze({
  reset: resetVultures,
  think: thinkVultures,
  contact: contactVultures,
  // The harasser always fires; the shadow only in phase two. Nobody fires
  // while stunned.
  mayFire(duel, actor) {
    const [first] = pair(duel);
    if (first?.pincer?.stage === 'stun') return false;
    return actor === first || duel.state.arena.warlordPhase === 2;
  },
});
