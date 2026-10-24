import {combatArmorEnabled, completeCombatRecovery} from './combat-armor.js';
import {createFighter, damageFighter, FIGHTER_STEP_SECONDS,
  stepFighter} from './onfoot.js';
import {COMBAT_TUNING} from './wasteland-tuning.js';
import {crewPerks} from './crew.js';
import {strikeFighterFromVehicles} from './onfoot-race.js';
import {resetFootWeaponUser, stepFootWeapons} from './onfoot-weapons.js';
import {crewGearEnabled, refillCrewGear, resetCrewGearUser, stepGearGrapple}
  from './crew-gear/signature.js';
import {actorForTarget} from './arsenal/targeting.js';
import {startBoarding, stepBoarding, releaseBoardingGrapple, climbAboard}
  from './crew-gear/boarding.js';

const T = COMBAT_TUNING.foot;

export function canLeaveCar(duel) {
  const state = duel.state, stage = duel.stageDef;
  return combatArmorEnabled(duel) && state.status === 'racing' &&
    (!state.arena || ['fuel-run', 'convoy-raid', 'ambush-alley'].includes(state.arena.mode) ||
      state.arena.format === 'convoy-raid') &&
    !state.paused && !state.objective && !stage?.practice &&
    !stage?.stuntTrial && !['chase', 'drift', 'checkpoint'].includes(stage?.kind);
}

export function initializeFootTransition(duel) {
  const state = duel.state;
  if (!combatArmorEnabled(duel)) {
    delete state.onFoot;
    delete state.fighter;
    delete state.fighterInput;
    delete state.footTransition;
    delete state.footPresentation;
    delete state.boarding;
    return;
  }
  state.onFoot = false; if (Object.hasOwn(state, 'tyreSlip')) state.tyreSlip = 0;
  state.fighter = null;
  state.footPresentation = null;
  if (crewGearEnabled(duel)) state.boarding = null;
  else delete state.boarding;
  state.fighterInput = {};
  state.input.interact = false;
  state.footTransition = {heldSeconds: 0, needsRelease: false,
    fighterStepRemainder: 0};
  if (crewGearEnabled(duel)) Object.assign(state.footTransition,
    {boardingStepRemainder: 0, boardingNeedsFireRelease: false});
}

export function fighterDistanceToCar(duel) {
  const {fighter} = duel.state;
  if (!fighter) return Infinity;
  const car = duel.course.groundAt(duel.state.s, duel.state.lateral);
  return Math.hypot(fighter.x - car.x, fighter.y - car.y,
    fighter.z - car.z);
}

function boardingMotion(duel, dt) {
  const boarding = duel.state.boarding;
  if (boarding?.phase !== 'roof' || !(dt > 0)) return {};
  const actor = actorForTarget(duel, boarding.targetId);
  if (!actor) return {};
  const at = duel.course.groundAt(actor.s, actor.lateral);
  const heading = at.heading + (actor.headingError || 0);
  const previous = boarding.lastHeading;
  boarding.lastHeading = heading;
  const change = Number.isFinite(previous)
    ? Math.atan2(Math.sin(heading - previous), Math.cos(heading - previous)) : 0;
  boarding.pendingTurnRadians = (boarding.pendingTurnRadians || 0) + Math.abs(change);
  boarding.pendingTurnSeconds = (boarding.pendingTurnSeconds || 0) + dt;
  return {sidewaysAcceleration: Math.abs(actor.speedMph || 0) * .44704 *
    boarding.pendingTurnRadians / boarding.pendingTurnSeconds,
    crashDeltaMph: boarding.pendingCrashDvMph || 0};
}

function stepFighterInFixedTime(duel, dt) {
  const state = duel.state, transition = state.footTransition;
  const boardingAtStart = state.boarding;
  const motion = boardingMotion(duel, dt);
  transition.fighterStepRemainder += dt;
  let steppedBoarding = false;
  while (transition.fighterStepRemainder + 1e-10 >= FIGHTER_STEP_SECONDS) {
    const fighter = state.fighter, wasOnRoof = state.boarding?.phase === 'roof';
    if (fighter.bailTumbleSeconds > 0) {
      fighter.bailTumbleSeconds = Math.max(0,
        fighter.bailTumbleSeconds - FIGHTER_STEP_SECONDS);
    }
    const previousRespawns = fighter.respawns, previousY = fighter.y;
    if (!wasOnRoof && !state.crewGear?.grapple) stepFighter(duel.course, state, fighter,
      fighter.bailTumbleSeconds > 0 ? {} : state.fighterInput, FIGHTER_STEP_SECONDS);
    if (fighter.respawns !== previousRespawns) {
      fighter.presentation = {clip: 'get-up', startedAt: Math.max(0, state.stageTimeSec -
        (transition.fighterStepRemainder - FIGHTER_STEP_SECONDS)), duration: .8};
      resetCrewGearUser(duel);
    }
    const pullBefore = state.crewGear?.grapple;
    if (!wasOnRoof) stepGearGrapple(duel, FIGHTER_STEP_SECONDS);
    const pull = state.crewGear?.grapple;
    if (!state.boarding && pull?.kind === 'car' && pull.arrived) {
      const target = actorForTarget(duel, pull.targetId);
      if (!target || !startBoarding(duel, target, {method: 'grapple'}))
        releaseBoardingGrapple(duel, target);
    } else if (!state.boarding && pullBefore?.kind === 'car' && !pull) {
      releaseBoardingGrapple(duel, actorForTarget(duel, pullBefore.targetId));
    }
    if (!state.boarding && !state.crewGear?.grapple) {
      for (const target of state.opponents || [])
        if (startBoarding(duel, target, {method: 'roof', previousY})) break;
    }
    const boardingBefore = state.boarding?.phase;
    if (state.boarding) {
      // A held F counts toward planting only after F was let go since the climb.
      state.boarding.interactReady = !!state.input.interact && !transition.needsRelease;
      stepBoarding(duel, FIGHTER_STEP_SECONDS, motion);
      steppedBoarding = true;
    }
    if (boardingBefore === 'roof' && state.boarding?.phase === 'charge') {
      transition.boardingNeedsFireRelease = true;
      transition.needsRelease = true;
    }
    if (!state.fighterInput.fire) transition.boardingNeedsFireRelease = false;
    if (boardingBefore !== 'roof' &&
        !(transition.boardingNeedsFireRelease && state.fighterInput.fire))
      stepFootWeapons(duel, FIGHTER_STEP_SECONDS);
    state.fighterInput.lookX = state.fighterInput.lookY = 0;
    transition.fighterStepRemainder = Math.max(0,
      transition.fighterStepRemainder - FIGHTER_STEP_SECONDS);
  }
  if (steppedBoarding && boardingAtStart) {
    boardingAtStart.pendingCrashDvMph = 0;
    boardingAtStart.pendingTurnRadians = 0;
    boardingAtStart.pendingTurnSeconds = 0;
  }
}

function stepChargeWhileDriving(duel, dt) {
  const transition = duel.state.footTransition;
  if (duel.state.boarding?.phase !== 'charge') return;
  transition.boardingStepRemainder += dt;
  while (transition.boardingStepRemainder + 1e-10 >= FIGHTER_STEP_SECONDS &&
         duel.state.boarding?.phase === 'charge') {
    stepBoarding(duel, FIGHTER_STEP_SECONDS);
    transition.boardingStepRemainder = Math.max(0,
      transition.boardingStepRemainder - FIGHTER_STEP_SECONDS);
  }
}

export function stepFootTransition(duel, dt) {
  const state = duel.state;
  const transition = state.footTransition;
  if (!transition) return false;
  if (!state.onFoot) stepChargeWhileDriving(duel, dt);
  if (!canLeaveCar(duel)) return false;
  const held = !!state.input.interact;
  if (!held) {
    transition.heldSeconds = 0;
    transition.needsRelease = false;
  }

  if (state.onFoot) {
    stepFighterInFixedTime(duel, dt);
    // One press of F climbs onto the stopped tanker; it wins over getting
    // back into a car parked beside it.
    if (!state.boarding && held && !transition.needsRelease && climbAboard(duel)) {
      transition.needsRelease = true;
      transition.heldSeconds = 0;
      return true;
    }
    if (state.boarding?.phase === 'roof') {transition.heldSeconds = 0; return true;}
    if (transition.needsRelease || !held || state.fighter.knockedDown ||
        state.fighter.bailTumbleSeconds > 0 ||
        state.combatWrecking || fighterDistanceToCar(duel) > T.reentryRangeMeters) {
      transition.heldSeconds = 0;
      return true;
    }
    transition.heldSeconds += dt;
    if (transition.heldSeconds + 1e-9 < T.reentryHoldSeconds) return true;
    const departing = state.fighter;
    refillCrewGear(duel);
    state.footPresentation = {fighter: {crewId: departing.crewId,
      x: departing.x, y: departing.y, z: departing.z, yaw: departing.yaw},
      presentation: {clip: 'enter', startedAt: state.stageTimeSec, duration: .65,
        pose: {x: departing.x, y: departing.y, z: departing.z, yaw: departing.yaw}}};
    state.onFoot = false; if (Object.hasOwn(state, 'tyreSlip')) state.tyreSlip = 0;
    state.fighter = null;
    state.fighterInput = {};
    transition.heldSeconds = 0;
    transition.needsRelease = true;
    duel.emit({fighterEntered: true});
    duel._callout('BACK IN THE CAR', 1.2);
    return false;
  }

  if (transition.needsRelease || !held || state.impactTimer > 0 ||
      state.combatWrecking) {
    transition.heldSeconds = 0;
    return false;
  }
  transition.heldSeconds += dt;
  const bailout = Math.abs(state.speedMph) *
    COMBAT_TUNING.armor.kphPerMph >= T.stepOutBelowKph;
  const hold = bailout ? T.bailHoldSeconds : T.stepOutHoldSeconds;
  if (transition.heldSeconds + 1e-9 < hold) return false;
  let fighter;
  try { fighter = createFighter(duel.course, state); }
  catch {
    transition.heldSeconds = 0;
    duel._callout('NO ROOM TO LEAVE THE CAR', 1.5);
    return false;
  }
  const perks=crewPerks(state.crewId);
  fighter.crewId=state.crewId||'rook';
  fighter.maxHealth=Math.round(fighter.health*(perks.healthMultiplier||1));
  fighter.health=fighter.maxHealth;
  fighter.sprintMultiplier=perks.sprintMultiplier||1;
  if (bailout) {
    damageFighter(fighter, T.bailHealthLoss);
    fighter.bailTumbleSeconds = T.bailTumbleSeconds;
  } else fighter.bailTumbleSeconds = 0;
  fighter.presentation = {clip: 'exit', startedAt: state.stageTimeSec,
    duration: bailout ? T.bailTumbleSeconds : .65, bailout};
  state.footPresentation = null;
  state.fighter = fighter;
  state.onFoot = true; if (Object.hasOwn(state, 'tyreSlip')) state.tyreSlip = 0;
  state.fighterInput = {};
  resetFootWeaponUser(duel);
  state.input.throttle = state.input.steer = 0;
  state.input.boost = false;
  state.boosting = false;
  transition.heldSeconds = 0;
  transition.needsRelease = true;
  transition.fighterStepRemainder = 0;
  duel.emit({fighterExited: true, bailout});
  duel._callout(bailout ? 'BAILED OUT / CAR COASTING' :
    'ON FOOT / CAR PARKED', 1.5);
  return true;
}

function recoverParkedWreck(duel, dt) {
  const state = duel.state;
  state.prevS = state.s;
  state.prevLateral = state.lateral;
  state.combatWreckTimer = state.combatWreckTimer <= dt + 1e-9 ? 0 :
    state.combatWreckTimer - dt;
  state.impactTimer = state.combatWreckTimer;
  if (state.combatWreckTimer > 0) return;
  completeCombatRecovery(duel, state, {alreadyReset: true});
  state.speedMph = 0;
  state.gear = 0;
  state.revs = 0;
  state.impactTimer = 0;
  duel._callout('PARKED CAR RECOVERED', 1.5);
}

export function stepParkedRace(duel, dt) {
  const state = duel.state;
  if (state.combatWrecking) recoverParkedWreck(duel, dt);
  else {
    // The occupied car uses brake to enter reverse after a hold. Once the
    // driver exits, oppose whichever way it is moving and never engage reverse.
    state.reverseHoldSec = 0;
    if (Math.abs(state.speedMph) <= .1) state.gear = 0;
    state.input.throttle = state.speedMph < -.1 ? 1 : 0;
    state.input.brake = state.speedMph > .1 ? 1 : 0;
    state.input.steer = 0;
    state.input.boost = false;
    state.input.shiftUp = state.input.shiftDown = false;
    duel._drive(dt);
    duel._jump(state, dt);
  }
  duel._traffic(dt);
  for (const opponent of state.opponents) {
    duel._rival(dt, opponent);
    const push=opponent.crewGearPush;
    if(push&&push.stageIndex===state.stageIndex&&state.stageTimeSec<=push.expiresAt){
      opponent.knock={vx:push.vx,vz:push.vz,spin:0,severity:'nudge',age:0,vy:0};
      opponent.speedMph=Math.hypot(push.vx,push.vz)*3.6/COMBAT_TUNING.armor.kphPerMph;
    }else if(push) delete opponent.crewGearPush;
  }
  duel._collisions();
  strikeFighterFromVehicles(duel);
  duel._crushProps(state);
  duel._police(dt);
  if (state.status !== 'racing') return;
  duel._advanceRushGates(dt);
  if (duel._deadline()) return;
  duel._advanceLaps(state, dt);
  if (state.completedLaps >= state.lapsTotal) duel._finishStage();
}
