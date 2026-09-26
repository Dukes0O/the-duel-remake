import {worldPose} from './arena-floor.js';
import {arenaCarSpec, ringDistance} from './arena-pilot.js';
import {arenaActor, hostile, outOfPlay} from '../combat-teams.js';
import {predictedPoint} from '../combat-weapons.js';
import {arenaFloorSpeed} from './venues.js';
import {nearestRepairCrate} from './arena-pickups.js';

// What a computer car wants (docs/SCRAPDOME.md section 4). Difficulty changes
// decisions only: reaction, pace, boost use and the hunter cap.
export const BRAIN_DIFFICULTY = Object.freeze({
  easy: Object.freeze({reactionSec: .6, pace: .85, boost: 'never', tellSec: 1.2, huntersOnPlayer: 1}),
  medium: Object.freeze({reactionSec: .35, pace: .95, boost: 'charges', tellSec: .8, huntersOnPlayer: 2}),
  hard: Object.freeze({reactionSec: .2, pace: 1, boost: 'always', tellSec: .5, huntersOnPlayer: 3}),
});

export const TARGETING = Object.freeze({
  intervalSec: 1.5, distanceScale: 40, keepBonus: .8, revengeBonus: 1.2,
  revengeWindowSec: 5, leaderBonus: .5,
});

export const STYLES = Object.freeze({
  rammer: Object.freeze({leadMaxSec: 1.2, chargeRange: 60, chargeAlignRadians: .2,
    // Joust: a stalled shove does no damage, so back out and charge again.
    stallMetres: 10, stallMph: 20, backoffSec: 1.8, reverseSec: .7, retreatMetres: 30}),
  gunner: Object.freeze({near: 25, far: 45, orbit: 30, retreat: 40, cruiseShare: .78}),
  brawler: Object.freeze({switchArmorFraction: .5}),
  repair: Object.freeze({armorFraction: .35, reachMetres: 90}),
  intercept: Object.freeze({nearMetres: 70, minimumMph: 30, maxSeconds: 8}),
});

// Default style for the n-th computer car, so a field has variety.
export const STYLE_ORDER = Object.freeze(['rammer', 'gunner', 'brawler']);

export function brainDifficulty(duel) {
  return BRAIN_DIFFICULTY[duel.state.cpuDifficulty] || BRAIN_DIFFICULTY.medium;
}

function netScore(participant) {
  return participant.wrecks - participant.wrecked;
}

function leaderIds(arena) {
  const best = Math.max(...arena.participants.map(netScore));
  const leaders = arena.participants.filter(participant => netScore(participant) === best);
  // Nobody leads while everyone is level.
  return leaders.length === arena.participants.length ? new Set() : new Set(leaders.map(p => p.id));
}

// Choose a target for one computer participant. Stable order, no randomness.
export function chooseTarget(duel, participant) {
  const arena = duel.state.arena, self = arenaActor(duel, participant.id);
  if (!self) return null;
  const me = worldPose(duel, self), leaders = leaderIds(arena);
  const cap = brainDifficulty(duel).huntersOnPlayer;
  const huntersOnPlayer = arena.participants.filter(other =>
    other.kind === 'cpu' && other !== participant && other.targetId === 'player').length;
  let best = null, bestScore = -Infinity;
  for (const other of arena.participants) {
    if (other === participant) continue;
    const actor = arenaActor(duel, other.id);
    if (!actor || outOfPlay(duel, actor) || !hostile(duel, self, actor)) continue;
    if (other.id === 'player' && participant.targetId !== 'player' && huntersOnPlayer >= cap) continue;
    const at = worldPose(duel, actor);
    let score = -Math.hypot(at.x - me.x, at.z - me.z) / TARGETING.distanceScale;
    if (other.id === participant.targetId) score += TARGETING.keepBonus;
    if (participant.lastHitBy === other.id &&
        duel.state.stageTimeSec - participant.lastHitAt <= TARGETING.revengeWindowSec) score += TARGETING.revengeBonus;
    if (leaders.has(other.id)) score += TARGETING.leaderBonus;
    if (score > bestScore) { best = other.id; bestScore = score; }
  }
  return best;
}

export function styleOf(duel, participant, actor) {
  if (participant.brain !== 'brawler') return participant.brain;
  return (actor.armor ?? 1) >= (actor.maxArmor ?? 1) * STYLES.brawler.switchArmorFraction ? 'rammer' : 'gunner';
}

// Where to meet a target that is far round the ring: chase it from behind, or
// go the other way and meet it head-on, whichever is quicker. Returns a world
// point on the ring, or null when the target is close enough to steer at.
export function ringIntercept(duel, actor, target, mySpeedMph) {
  const course = duel.course, length = course.length;
  const gap = ringDistance(course, actor.s, target.s);
  if (Math.abs(gap) <= STYLES.intercept.nearMetres) return null;
  const mph = .44704, mine = Math.max(STYLES.intercept.minimumMph, mySpeedMph) * mph;
  const theirs = (target.speedMph || 0) * Math.cos(target.headingError || 0) * mph;
  const toward = Math.sign(gap), away = theirs * toward;
  const chase = mine > away ? Math.abs(gap) / (mine - away) : Infinity;
  const meet = (length - Math.abs(gap)) / Math.max(.1, mine + away);
  const seconds = Math.min(chase, meet, STYLES.intercept.maxSeconds);
  const s = target.s + theirs * seconds;
  return course.worldAt(s, target.lateral || 0);
}

// Decide a goal for the pilot: {x, z, speedMph, boost}.
export function decideGoal(duel, participant, actor) {
  const difficulty = brainDifficulty(duel), spec = arenaCarSpec(duel, actor);
  const top = arenaFloorSpeed(duel.course.def.scrapdome, spec.topSpeed) * difficulty.pace, me = worldPose(duel, actor);
  const target = participant.targetId ? arenaActor(duel, participant.targetId) : null;
  if (!target || outOfPlay(duel, target)) {
    // Nothing to fight: cruise along the ring.
    const frame = duel.course.at(actor.s + 40);
    const ahead = duel.course.worldAt(actor.s + 40, 0);
    return {x: ahead.x, z: ahead.z, speedMph: top * .6, boost: false, heading: frame.heading};
  }
  // A badly damaged car breaks off for a repair crate: the player's window.
  if ((actor.armor ?? 1) < (actor.maxArmor ?? 1) * STYLES.repair.armorFraction && duel.state.cpuDifficulty !== 'easy') {
    const crate = nearestRepairCrate(duel, actor);
    if (crate && crate.distance < STYLES.repair.reachMetres) return {x: crate.x, z: crate.z, speedMph: top, boost: false};
  }
  const at = worldPose(duel, target), distance = Math.hypot(at.x - me.x, at.z - me.z);
  const style = styleOf(duel, participant, actor);
  const intercept = ringIntercept(duel, actor, target, top);
  if (intercept) return {x: intercept.x, z: intercept.z, speedMph: top, boost: difficulty.boost === 'always'};
  if (style === 'rammer') {
    const R = STYLES.rammer;
    if ((participant.backoffSec || 0) > 0) {
      const away = Math.atan2(me.x - at.x, me.z - at.z);
      return {x: me.x + Math.sin(away) * R.retreatMetres, z: me.z + Math.cos(away) * R.retreatMetres,
        speedMph: top * .8, boost: false};
    }
    if (distance < R.stallMetres && Math.abs(actor.speedMph || 0) < R.stallMph) {
      participant.backoffSec = R.backoffSec;
      actor._arenaReverseSec = Math.max(actor._arenaReverseSec || 0, R.reverseSec);
      const away = Math.atan2(me.x - at.x, me.z - at.z);
      return {x: me.x + Math.sin(away) * R.retreatMetres, z: me.z + Math.cos(away) * R.retreatMetres,
        speedMph: top * .8, boost: false};
    }
    const closing = Math.max(8, Math.abs(actor.speedMph) * .44704);
    const lead = Math.min(STYLES.rammer.leadMaxSec, distance / closing);
    const future = predictedPoint(duel, target, lead);
    const aligned = Math.abs(Math.atan2(Math.sin(Math.atan2(future.x - me.x, future.z - me.z) - me.heading),
      Math.cos(Math.atan2(future.x - me.x, future.z - me.z) - me.heading))) < STYLES.rammer.chargeAlignRadians;
    const charge = distance < STYLES.rammer.chargeRange && aligned;
    const boost = difficulty.boost === 'always' || difficulty.boost === 'charges' && charge;
    return {x: future.x, z: future.z, speedMph: top, boost: boost && charge};
  }
  // Gunner: hold range, circle, back off when crowded.
  const G = STYLES.gunner;
  if (distance > G.far) return {x: at.x, z: at.z, speedMph: top * G.cruiseShare, boost: false};
  if (distance < G.near) {
    const away = Math.atan2(me.x - at.x, me.z - at.z);
    return {x: me.x + Math.sin(away) * G.retreat, z: me.z + Math.cos(away) * G.retreat,
      speedMph: top, boost: difficulty.boost === 'always'};
  }
  const around = Math.atan2(me.x - at.x, me.z - at.z) + Math.PI / 2;
  return {x: at.x + Math.sin(around) * G.orbit, z: at.z + Math.cos(around) * G.orbit,
    speedMph: top * G.cruiseShare, boost: false};
}

// Once per step for each computer participant: retarget on its interval, and
// re-plan its goal at its reaction time (Easy re-plans least often).
export function thinkBrain(duel, participant, actor, dt) {
  participant.targetHeldSec = (participant.targetHeldSec || 0) + dt;
  if ((participant.backoffSec || 0) > 0) {
    participant.backoffSec = Math.max(0, participant.backoffSec - dt);
    if (participant.backoffSec === 0) participant.reactionSec = 0;
  }
  participant.reactionSec = Math.max(0, (participant.reactionSec || 0) - dt);
  const current = participant.targetId ? arenaActor(duel, participant.targetId) : null;
  if (!participant.targetId || !current || outOfPlay(duel, current) ||
      participant.targetHeldSec >= TARGETING.intervalSec) {
    const next = chooseTarget(duel, participant);
    if (next !== participant.targetId) participant.reactionSec = 0;
    participant.targetId = next;
    participant.targetHeldSec = 0;
  }
  if (!participant.goal || participant.reactionSec === 0) {
    participant.goal = decideGoal(duel, participant, actor);
    participant.reactionSec = brainDifficulty(duel).reactionSec;
  }
  return participant.goal;
}
