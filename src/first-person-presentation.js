import {crewMember} from './crew.js';
import {COMBAT_TUNING} from './wasteland-tuning.js';

const EMPTY = Object.freeze({});
const RECOIL_SECONDS = .22;
const finite = value => Number.isFinite(value) ? value : 0;
const fraction = value => Math.max(0, Math.min(1, value));

// Weapon actions and locomotion are separate projections of the same snapshot.
// No input can manufacture a successful shot or restart its simulation clock.
export function selectFirstPersonPresentation(entry, {time = 0} = EMPTY, out = {}) {
  const fighter = entry?.fighter || EMPTY;
  const input = entry?.input || EMPTY;
  const weapons = entry?.weapons || EMPTY;
  const now = Math.max(0, finite(time));
  out.crewId = crewMember(fighter.crewId) ? fighter.crewId : 'rook';
  out.weapon = weapons.selected === 'shock-charge' ? 'shock-charge' : weapons.selected === 'wrench' ? 'wrench' : 'rpg';
  out.lowered = weapons.lowered === true;
  // HOME-GROUND-2: while he builds on his own ground he holds a hammer, or a wrench for the gate's hinges, and `strike` is
  // how far through a blow he is (src/world/open/parts/home.js). The launcher is on his back meanwhile.
  const homeTool = entry?.homeTool === 'hammer' || entry?.homeTool === 'wrench' ? entry.homeTool : null;
  out.homeTool = homeTool;
  out.strike = homeTool && Number.isFinite(entry.homeStrike) ? fraction(entry.homeStrike) : null;
  if (homeTool) { out.weapon = homeTool; out.lowered = false; }
  out.aim = !out.lowered && out.weapon === 'rpg' && input.aim === true;
  out.loaded = out.weapon === 'rpg' && weapons.ammo > 0;
  out.action = 'idle';
  out.actionTime = 0;
  out.actionProgress = 0;
  out.motionTime = now;
  out.locomotion = fighter.airHeight > .001 || Math.abs(finite(fighter.verticalSpeed)) > .001
    ? 'jump' : fighter.speed > .01
      ? fighter.locomotion === 'sprint' || input.sprint ? 'sprint' : 'walk'
      : 'idle';
  if (homeTool) {
    if (homeTool === 'wrench' && out.strike !== null) { out.action = 'repair'; out.actionProgress = out.strike; }
  } else if (out.weapon === 'wrench' && weapons.repairing) {
    out.action = 'repair';
    out.actionTime = Math.max(0, finite(weapons.repairSeconds));
    out.actionProgress = fraction(finite(weapons.repairAmount) /
      COMBAT_TUNING.foot.wrenchRepairAmount);
  } else if (out.weapon === 'rpg' && weapons.serial > 0 &&
      Number.isFinite(weapons.lastFireAt) && now >= weapons.lastFireAt) {
    const age = now - weapons.lastFireAt;
    if (age < RECOIL_SECONDS) {
      out.action = 'fire';
      out.actionTime = age;
      out.actionProgress = fraction(age / RECOIL_SECONDS);
    } else if (out.loaded && now < weapons.nextFireAt) {
      out.action = 'reload';
      out.actionTime = age - RECOIL_SECONDS;
      out.actionProgress = fraction(out.actionTime /
        Math.max(.001, weapons.nextFireAt - weapons.lastFireAt - RECOIL_SECONDS));
    }
  }
  return out;
}
