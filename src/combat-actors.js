// The pieces of the combat rules that name where a car is, where it is going and where a blast shows. They live
// apart from combat-weapons.js because every arsenal weapon needs them and combat-weapons.js imports every
// arsenal weapon: held in one file, the two would import each other (a bundle with such a cycle and an
// awaiting module never finished loading, FIX-MANIFEST-AWAIT). combat-weapons.js re-exports them, so every
// other importer is unchanged.
import {DRIVE} from './config.js';
import {COMBAT_TUNING} from './wasteland-tuning.js';
import {footMoveDirection} from './onfoot.js';
import {carAlongPush} from './arsenal/car-effects.js';

const T = COMBAT_TUNING;

export function point(duel, actor) {
  const at = duel.course.groundAt(actor.s, actor.lateral);
  return {...at, y: at.y + T.pointHeight + (actor.airHeight || 0)};
}

// A carrier's aim follows the fighter; point() remains the physical car hitbox.
function fuelCarrierFighter(duel, actor) {
  const state = duel.state;
  return actor === state && state.arena?.mode === 'fuel-run' && state.onFoot &&
    state.arena.participants.find(p => p.id === 'player')?.fuelCanisterId
    ? state.fighter : null;
}

export function aimPoint(duel, actor) {
  const fighter = fuelCarrierFighter(duel, actor);
  return fighter ? {x: fighter.x, y: fighter.y + T.pointHeight, z: fighter.z,
    heading: fighter.yaw} : point(duel, actor);
}

export function velocity(actor, at) {
  const heading = at.heading + (actor.headingError || 0);
  const speed = (actor.speedMph || 0) * (actor.dir || 1) * DRIVE.mphToWorld;
  const alongPush = carAlongPush(actor);
  return {
    x: Math.sin(heading) * speed + Math.cos(at.heading) * (actor.pushVelocity || 0) + Math.sin(at.heading) * alongPush,
    z: Math.cos(heading) * speed - Math.sin(at.heading) * (actor.pushVelocity || 0) + Math.cos(at.heading) * alongPush,
  };
}

export function predictedPoint(duel, actor, seconds) {
  const fighter = fuelCarrierFighter(duel, actor);
  if (fighter) {
    const move = footMoveDirection(fighter.yaw, duel.state.fighterInput || {});
    const speed = fighter.knockedDown ? 0 : fighter.speed;
    return {x: fighter.x + move.x * speed * seconds, y: fighter.y,
      z: fighter.z + move.z * speed * seconds};
  }
  const frame = duel.course.at(actor.s);
  const speed = (actor.speedMph || 0) * (actor.dir || 1) * DRIVE.mphToWorld;
  const headingError = actor.headingError || 0;
  const along = (Math.cos(headingError) * speed + carAlongPush(actor)) /
    Math.max(T.predictionCurveFloor, 1 - frame.curvature * actor.lateral);
  const lateral = Math.sin(headingError) * speed + (actor.pushVelocity || 0);
  return duel.course.groundAt(actor.s + along * seconds, actor.lateral + lateral * seconds);
}

export function burst(combat, at, kind = 'blast') {
  combat.bursts.push({...at, kind, id: ++combat.serial, age: 0});
  if (combat.bursts.length > T.burstLimit) combat.bursts.shift();
}
