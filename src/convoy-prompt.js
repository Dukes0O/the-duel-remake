import {CONVOY_RULES, convoyBoardingOpen, convoyBodyGap, convoyRig, convoyStopped}
  from './arena/modes/convoy-raid.js';
import {canLeaveCar} from './onfoot-transition.js';
import {BOARDING_RULES} from './crew-gear/boarding.js';
import {COMBAT_TUNING} from './wasteland-tuning.js';

const T = COMBAT_TUNING.foot;
const KPH_PER_MPH = 1.609344;

// The big on-screen prompt for the end of a Convoy Raid or Tollkeeper fight:
// get out, run, climb aboard, plant. Presentation only. It reads the same
// rules the game uses and never changes race state.
// Returns {title, sub, progress, angle, distance} or null.
export function convoyPrompt(duel) {
  const state = duel?.state, arena = state?.arena, convoy = arena?.convoy;
  if (!convoy || arena.result || state.paused || convoy.finished) return null;
  const rig = convoyRig(duel);
  if (!rig) return null;
  const boarding = state.boarding;
  if (convoy.chargePlanted) {
    const fuse = Number.isFinite(boarding?.fuseSeconds) ? Math.max(0, boarding.fuseSeconds) : 0;
    return {title: 'CHARGE PLANTED', sub: `GET CLEAR · BLAST IN ${Math.ceil(fuse)} s`,
      progress: 1, angle: null, distance: 0};
  }
  if (!convoyBoardingOpen(duel, rig)) return null;
  const left = `${Math.ceil(convoy.boardingLeftSec)} s LEFT`;
  if (state.onFoot && state.fighter && boarding?.phase === 'roof') {
    return {title: 'HOLD F OR LEFT MOUSE TO PLANT THE CHARGE',
      sub: `Gamepad: hold X or the right trigger · ${left}`,
      progress: Math.min(1, (boarding.fireSeconds || 0) / BOARDING_RULES.plantHoldSeconds),
      angle: null, distance: 0};
  }
  const onFoot = state.onFoot && !!state.fighter;
  const here = onFoot ? state.fighter : duel.course.worldAt(state.s, state.lateral || 0);
  const gap = convoyBodyGap(duel, rig, here);
  const distance = Math.round(gap);
  const stopped = convoyStopped(duel, rig);
  const heading = onFoot ? state.fighter.yaw || 0 :
    Number.isFinite(state.yaw) ? state.yaw : (here.heading || 0) + (state.headingError || 0);
  const at = duel.course.groundAt(rig.s, rig.lateral);
  const dx = at.x - here.x, dz = at.z - here.z;
  const angle = Math.round(Math.atan2(dx * Math.cos(heading) - dz * Math.sin(heading),
    dx * Math.sin(heading) + dz * Math.cos(heading)) * 180 / Math.PI);
  if (onFoot) {
    if (stopped && gap <= CONVOY_RULES.climbReach)
      return {title: 'PRESS F TO CLIMB ABOARD', sub: `Gamepad: X · ${left}`,
        progress: null, angle: null, distance};
    return {title: `RUN TO THE TANKER · ${distance} m`,
      sub: `Turn with A / D or the arrows · ${left}`, progress: null, angle, distance};
  }
  if (!canLeaveCar(duel)) return null;
  if (gap <= CONVOY_RULES.promptRange) {
    const fast = Math.abs(state.speedMph) * KPH_PER_MPH >= T.stepOutBelowKph;
    return {title: 'PRESS F TO GET OUT',
      sub: fast ? `Slow below ${T.stepOutBelowKph} km/h first, or you bail out · ${left}` :
        `Gamepad: X · ${left}`, progress: null, angle: null, distance};
  }
  return {title: `DRIVE TO THE TANKER · ${distance} m`,
    sub: `Park within ${CONVOY_RULES.promptRange} m, then get out · ${left}`,
    progress: null, angle, distance};
}
