import {DRIVE} from './config.js';
import {strikeFighterWithCar} from './onfoot.js';

const KPH_PER_MPH = 1.609344;
const TRAFFIC_LOOKAHEAD_METERS = 42;
const OPPONENT_LOOKAHEAD_METERS = 55;
const FIGHTER_LANE_REACH = 2.5;

function fighterAhead(duel, actor) {
  const fighter = duel.state.onFoot && duel.state.fighter;
  if (!fighter || fighter.knockedDown) return null;
  const ahead = (duel.relativeS(fighter.s, actor.s) - actor.s) * (actor.dir || 1);
  return {fighter, ahead};
}

export function trafficSpeedNearFighter(duel, traffic, cruiseMph) {
  const nearby = fighterAhead(duel, traffic);
  if (!nearby || nearby.ahead < -5 || nearby.ahead > TRAFFIC_LOOKAHEAD_METERS ||
      Math.abs(nearby.fighter.lateral - traffic.lateral) > FIGHTER_LANE_REACH)
    return cruiseMph;
  // An ordinary traffic car brakes before a fighter in its lane. Its existing
  // acceleration limit makes the speed change smooth and deterministic.
  return Math.min(cruiseMph, nearby.ahead < 12 ? 12 : 20);
}

export function opponentFighterIntent(duel, actor, targetMph, lane) {
  const nearby = fighterAhead(duel, actor);
  if (!nearby || nearby.ahead < -5 || nearby.ahead > OPPONENT_LOOKAHEAD_METERS ||
      !duel._surface(nearby.fighter.s, nearby.fighter.lateral).road) return null;
  const difficulty = duel.state.cpuDifficulty;
  const index = Math.max(0, duel.state.opponents.indexOf(actor));
  const mediumAttack = difficulty === 'medium' &&
    ((Math.imul(duel.seed ^ (index + 1) * 0x45d9f3b, 0x27d4eb2d) >>> 0) % 3 === 0);
  if (difficulty === 'hard' || mediumAttack) {
    return {attack: true, lane: nearby.fighter.lateral,
      targetMph: Math.max(targetMph, 35)};
  }
  if (Math.abs(nearby.fighter.lateral - lane) > 4) return null;
  const escapeLane = nearby.fighter.lateral >= 0 ? -DRIVE.laneOffset : DRIVE.laneOffset;
  return {attack: false, lane: escapeLane,
    targetMph: Math.min(targetMph, nearby.ahead < 14 ? 18 : 38)};
}

function distanceToSweep(point, from, to) {
  const dx = to.x - from.x, dz = to.z - from.z;
  const lengthSquared = dx * dx + dz * dz;
  const t = lengthSquared ? Math.max(0, Math.min(1,
    ((point.x - from.x) * dx + (point.z - from.z) * dz) / lengthSquared)) : 0;
  return Math.hypot(point.x - (from.x + dx * t),
    point.z - (from.z + dz * t));
}

export function strikeFighterFromVehicles(duel) {
  const state = duel.state, fighter = state.onFoot && state.fighter;
  if (!fighter || fighter.knockedDown) return false;
  for (const actor of [...state.opponents, ...state.traffic]) {
    if (!actor || actor.alive === false || actor.finished || actor.crushed ||
        actor.combatWrecking || actor.roadsideMotion || actor.wrecked) continue;
    const speedKph = Math.abs(actor.speedMph || 0) * KPH_PER_MPH;
    if (speedKph <= 30) continue;
    const from = duel.course.groundAt(actor.prevS ?? actor.s,
      actor.prevLateral ?? actor.lateral);
    const to = duel.course.groundAt(actor.s, actor.lateral);
    const spec = duel._vehicleSpec(actor);
    if (fighter.y > Math.max(from.y, to.y) + spec.height + .25) continue;
    if (distanceToSweep(fighter, from, to) >
        Math.max(spec.halfWidth, spec.halfLength * .55) + .34) continue;
    if (!strikeFighterWithCar(fighter, speedKph)) continue;
    duel.emit({fighterKnockdown: true,
      source: state.opponents.includes(actor) ? 'opponent' : 'traffic',
      speedKph, hitPosition: {x: fighter.x, y: fighter.y, z: fighter.z}});
    duel._callout('FIGHTER HIT / RECOVERING', 2);
    return true;
  }
  return false;
}
