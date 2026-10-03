import {sweepObstacle} from '../collision.js';
import {outOfPlay} from '../combat-teams.js';
import {actorForTarget, targetIdentity} from '../arsenal/targeting.js';
import {damageGearCar} from './contacts.js';

// All durations are accumulated by the fixed fighter step, never by rendering.
export const BOARDING_RULES = Object.freeze({
  roofMaximumKph: 50, grappleMaximumKph: 90, grappleReach: 25,
  shakeAcceleration: 9, shakeSeconds: .3, crashDeltaMph: 10,
  roofLimitSeconds: 6, plantHoldSeconds: 1, fuseSeconds: 2,
  armorDamage: 35, weaponDisableSeconds: .8,
});
const EPS = 1e-9;
const FIGHTER_BODY = {halfWidth: .34, halfLength: .34, height: 1.7};

function active(duel) {
  const state = duel.state;
  return state.mode === 'wasteland' && state.status === 'racing' &&
    !state.paused && state.onFoot && !!state.fighter &&
    state.wastelandGateDiscovered === true &&
    duel.featureFlags?.enabled('crew-gear') === true;
}
function body(duel, actor) {
  const ground = duel.course.groundAt(actor.s, actor.lateral);
  const spec = duel._vehicleSpec(actor);
  return {...ground, y: ground.y + (actor.airHeight || 0),
    roofY: ground.y + (actor.airHeight || 0) + spec.height,
    heading: ground.heading + (actor.headingError || 0),
    halfWidth: spec.halfWidth, halfLength: spec.halfLength};
}
function onRoof(duel, actor, previousY) {
  const fighter = duel.state.fighter, car = body(duel, actor);
  if (!Number.isFinite(previousY) || previousY <= car.roofY + EPS ||
      fighter.y > car.roofY + EPS || !(fighter.verticalSpeed < 0)) return false;
  const dx = fighter.x - car.x, dz = fighter.z - car.z;
  const across = dx * Math.cos(car.heading) - dz * Math.sin(car.heading);
  const along = dx * Math.sin(car.heading) + dz * Math.cos(car.heading);
  return Math.abs(across) <= car.halfWidth + EPS &&
    Math.abs(along) <= car.halfLength + EPS;
}
function grappleArrived(duel, actor) {
  const pull = duel.state.crewGear?.grapple;
  return duel.state.crewId === 'jax' && pull?.kind === 'car' &&
    pull.arrived === true && pull.targetId === targetIdentity(duel, actor) &&
    (!Number.isFinite(pull.launchDistance) ||
      pull.launchDistance <= BOARDING_RULES.grappleReach + EPS);
}
export function canBoardTarget(duel, actor, method = 'roof') {
  if (!active(duel) || !actor || actor === duel.state ||
      !duel.state.opponents?.includes(actor) ||
      duel.state.traffic?.includes(actor) || outOfPlay(duel, actor) ||
      !Number.isFinite(actor.speedMph) || duel.state.boarding) return false;
  const kph = Math.abs(actor.speedMph) * 1.609344;
  return method === 'roof' ? kph < BOARDING_RULES.roofMaximumKph :
    method === 'grapple' && kph < BOARDING_RULES.grappleMaximumKph;
}
function safeLanding(duel, actor) {
  const course = duel.course, road = course.roadHalfWidthAt(actor.s);
  if (!Number.isFinite(road)) return null;
  // Search both shoulders and several longitudinal gaps. Candidate order is
  // fixed, so collisions and replay results do not depend on frame rate.
  for (const ds of [0, -3, 3, -6, 6, -10, 10, -16, 16])
    for (const side of [1, -1])
      for (const distance of [1.8, 2.8, 4.2]) {
        const s = actor.s + ds, lateral = side * (course.roadHalfWidthAt(s) + distance);
        const ground = course.groundAt(s, lateral);
        if (!(ground.y > -15) || !Number.isFinite(ground.x) ||
            !Number.isFinite(ground.z)) continue;
        const nearest = course.nearest(ground.x, ground.z, s);
        if (Math.abs(nearest.lateral - lateral) > .5 ||
            Math.abs(nearest.s - s) > 2) continue;
        if (course.def?.arena) {
          const limit = course.def.venue === true
            ? course.def.scrapdome.wallOffset - FIGHTER_BODY.halfWidth : 21.15;
          if (Math.abs(lateral) > limit) continue;
        }
        if (course.obstaclesNear(s - 2, s + 2).some(obstacle =>
          sweepObstacle(ground, ground, obstacle, 0, FIGHTER_BODY))) continue;
        return {...ground, s, lateral};
      }
  return null;
}
function mountFighter(duel, actor) {
  const fighter = duel.state.fighter, car = body(duel, actor);
  const nearest = duel.course.nearest(car.x, car.z, actor.s);
  Object.assign(fighter, {x: car.x, y: car.roofY, z: car.z,
    s: nearest.s, lateral: nearest.lateral, groundY: car.y,
    airHeight: car.roofY - car.y, verticalSpeed: 0,
    yaw: car.heading, speed: 0});
}
function landFighter(duel, landing) {
  const fighter = duel.state.fighter;
  Object.assign(fighter, {x: landing.x, y: landing.y, z: landing.z,
    s: landing.s, lateral: landing.lateral, groundY: landing.y,
    airHeight: 0, verticalSpeed: 0, yaw: landing.heading,
    speed: 0, jumpHeld: false,
    boardingAnchor: {x: landing.x, z: landing.z}});
}
export function startBoarding(duel, actor, {method = 'roof', previousY} = {}) {
  if (!canBoardTarget(duel, actor, method)) return false;
  if (method === 'roof' ? !onRoof(duel, actor, previousY) :
      !grappleArrived(duel, actor)) return false;
  const landing = safeLanding(duel, actor);
  if (!landing) return false;
  duel.state.boarding = {phase: 'roof', targetId: targetIdentity(duel, actor),
    method, roofSeconds: 0, shakeSeconds: 0, fireSeconds: 0,
    chargesPlanted: 0, landing};
  if (method === 'grapple') duel.state.crewGear.grapple = null;
  mountFighter(duel, actor);
  duel.emit({crewBoardingCue: 'crew.boarding.mount', targetId: duel.state.boarding.targetId});
  return true;
}
function leaveRoof(duel, boarding, reason) {
  const actor = actorForTarget(duel, boarding.targetId);
  const landing = actor && safeLanding(duel, actor) || boarding.landing;
  landFighter(duel, landing);
  if (reason !== 'plant') duel.state.boarding = null;
  duel.emit({crewBoardingCue: reason === 'plant' ? 'crew.boarding.plant' :
    'crew.boarding.throw', targetId: boarding.targetId, reason,
    hitPosition: {x: landing.x, y: landing.y, z: landing.z}});
}
export function stepBoarding(duel, dt, {sidewaysAcceleration = 0,
  crashDeltaMph = 0, damageCar = damageGearCar} = {}) {
  const state = duel.state, boarding = state.boarding;
  if (!boarding || !(dt > 0) || !Number.isFinite(dt)) return false;
  const actor = actorForTarget(duel, boarding.targetId);
  if (boarding.phase === 'roof') {
    if (!actor || outOfPlay(duel, actor) || !state.fighter ||
        state.fighter.knockedDown) {
      leaveRoof(duel, boarding, 'target-lost'); return true;
    }
    const landing = safeLanding(duel, actor);
    if (landing) boarding.landing = landing;
    mountFighter(duel, actor);
    boarding.roofSeconds += dt;
    boarding.shakeSeconds = sidewaysAcceleration > BOARDING_RULES.shakeAcceleration
      ? boarding.shakeSeconds + dt : 0;
    if (crashDeltaMph > BOARDING_RULES.crashDeltaMph ||
        boarding.shakeSeconds + EPS >= BOARDING_RULES.shakeSeconds ||
        boarding.roofSeconds + EPS >= BOARDING_RULES.roofLimitSeconds) {
      leaveRoof(duel, boarding, 'throw'); return true;
    }
    boarding.fireSeconds = state.fighterInput?.fire
      ? boarding.fireSeconds + dt : 0;
    if (boarding.fireSeconds + EPS >= BOARDING_RULES.plantHoldSeconds) {
      boarding.phase = 'charge'; boarding.chargesPlanted = 1;
      boarding.fuseSeconds = BOARDING_RULES.fuseSeconds;
      leaveRoof(duel, boarding, 'plant');
    }
    return true;
  }
  if (boarding.phase !== 'charge') return false;
  boarding.fuseSeconds -= dt;
  if (boarding.fuseSeconds > EPS) return true;
  if (actor && !outOfPlay(duel, actor)) {
    damageCar(duel, actor, BOARDING_RULES.armorDamage, state);
    actor.weaponsDisabledUntil = Math.max(actor.weaponsDisabledUntil || 0,
      state.stageTimeSec + BOARDING_RULES.weaponDisableSeconds);
    duel.emit({crewBoardingCue: 'crew.boarding.blast', targetId: boarding.targetId,
      hitPosition: body(duel, actor)});
  }
  state.boarding = null;
  return true;
}
export function computerBoardingAllowed(difficulty, event) {
  return difficulty === 'hard' &&
    (event === 'ambush-alley' || event === 'convoy-raid');
}
