import {combatArmorEnabled, completeCombatRecovery} from './combat-armor.js';
import {createFighter, damageFighter, FIGHTER_STEP_SECONDS,
  stepFighter} from './onfoot.js';
import {COMBAT_TUNING} from './wasteland-tuning.js';
import {strikeFighterFromVehicles} from './onfoot-race.js';
import {resetFootWeaponUser, stepFootWeapons} from './onfoot-weapons.js';

const T = COMBAT_TUNING.foot;

export function canLeaveCar(duel) {
  const state = duel.state, stage = duel.stageDef;
  return combatArmorEnabled(duel) && state.status === 'racing' &&
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
    return;
  }
  state.onFoot = false;
  state.fighter = null;
  state.fighterInput = {};
  state.input.interact = false;
  state.footTransition = {heldSeconds: 0, needsRelease: false,
    fighterStepRemainder: 0};
}

export function fighterDistanceToCar(duel) {
  const {fighter} = duel.state;
  if (!fighter) return Infinity;
  const car = duel.course.groundAt(duel.state.s, duel.state.lateral);
  return Math.hypot(fighter.x - car.x, fighter.y - car.y,
    fighter.z - car.z);
}

function stepFighterInFixedTime(duel, dt) {
  const state = duel.state, transition = state.footTransition;
  transition.fighterStepRemainder += dt;
  while (transition.fighterStepRemainder + 1e-10 >= FIGHTER_STEP_SECONDS) {
    const fighter = state.fighter;
    if (fighter.bailTumbleSeconds > 0) {
      fighter.bailTumbleSeconds = Math.max(0,
        fighter.bailTumbleSeconds - FIGHTER_STEP_SECONDS);
    }
    stepFighter(duel.course, state, fighter,
      fighter.bailTumbleSeconds > 0 ? {} : state.fighterInput,
      FIGHTER_STEP_SECONDS);
    stepFootWeapons(duel, FIGHTER_STEP_SECONDS);
    state.fighterInput.lookX = state.fighterInput.lookY = 0;
    transition.fighterStepRemainder = Math.max(0,
      transition.fighterStepRemainder - FIGHTER_STEP_SECONDS);
  }
}

export function stepFootTransition(duel, dt) {
  const state = duel.state;
  if (!canLeaveCar(duel)) return false;
  const transition = state.footTransition;
  if (!transition) return false;
  const held = !!state.input.interact;
  if (!held) {
    transition.heldSeconds = 0;
    transition.needsRelease = false;
  }

  if (state.onFoot) {
    stepFighterInFixedTime(duel, dt);
    if (transition.needsRelease || !held || state.fighter.knockedDown ||
        state.fighter.bailTumbleSeconds > 0 ||
        state.combatWrecking || fighterDistanceToCar(duel) > T.reentryRangeMeters) {
      transition.heldSeconds = 0;
      return true;
    }
    transition.heldSeconds += dt;
    if (transition.heldSeconds + 1e-9 < T.reentryHoldSeconds) return true;
    state.onFoot = false;
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
  if (bailout) {
    damageFighter(fighter, T.bailHealthLoss);
    fighter.bailTumbleSeconds = T.bailTumbleSeconds;
  } else fighter.bailTumbleSeconds = 0;
  state.fighter = fighter;
  state.onFoot = true;
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
  for (const opponent of state.opponents) duel._rival(dt, opponent);
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
