import {canLeaveCar, fighterDistanceToCar} from './onfoot-transition.js';
import {COMBAT_TUNING} from './wasteland-tuning.js';

const T = COMBAT_TUNING.foot;
const CONTROL = 'F (keyboard) / X (gamepad)';

// Presentation only: share availability and tuning with the real transition.
export function onFootHint(duel) {
  const state = duel?.state;
  if (!state?.footTransition || !canLeaveCar(duel) || state.combatWrecking)
    return null;

  if (state.onFoot) {
    const fighter = state.fighter;
    if (!fighter || fighter.knockedDown || fighter.bailTumbleSeconds > 0)
      return null;
    const instruction = state.footTransition.needsRelease
      ? 'Release ' + CONTROL + ', then hold for ' + T.reentryHoldSeconds + ' s'
      : 'Hold ' + CONTROL + ' for ' + T.reentryHoldSeconds + ' s';
    const range = T.reentryRangeMeters + ' m of your car';
    return fighterDistanceToCar(duel) > T.reentryRangeMeters
      ? 'Move closer. ' + instruction + ' within ' + range + ' to get in.'
      : instruction + ' within ' + range + ' to get in.';
  }

  if (state.impactTimer > 0) return null;
  const release = state.footTransition.needsRelease
    ? 'Release ' + CONTROL + ' first. ' : '';
  return release + 'Hold ' + CONTROL + ': below ' + T.stepOutBelowKph +
    ' km/h, hold ' + T.stepOutHoldSeconds + ' s to step out; at ' +
    T.stepOutBelowKph + ' km/h or above, hold ' + T.bailHoldSeconds +
    ' s to bail out (costs ' + T.bailHealthLoss + ' health).';
}
