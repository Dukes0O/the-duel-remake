import {FIGHTER_RULES} from './onfoot.js';

const EMPTY = Object.freeze({});
const EVENT_CLIPS = new Set(['get-up', 'enter', 'exit']);
const JUMP_SPEED = Math.sqrt(2 * FIGHTER_RULES.gravity * FIGHTER_RULES.jumpMeters);
const JUMP_SECONDS = 2 * JUMP_SPEED / FIGHTER_RULES.gravity;
const finite = (value, fallback = 0) => Number.isFinite(value) ? value : fallback;

// A read-only projection of a simulation snapshot. Repeated renders and replay
// rewinds select the same pose; input alone never proves that an action happened.
export function selectFighterPresentation(entry, {time = 0} = EMPTY, output) {
  const fighter = entry?.fighter || entry || EMPTY;
  const input = entry?.input || EMPTY;
  const weapons = entry?.weapons || EMPTY;
  const event = entry?.presentation || fighter.presentation;
  const now = Math.max(0, finite(time));
  const result = output || {pose: {}};
  const pose = result.pose;
  pose.x = finite(fighter.x); pose.y = finite(fighter.y);
  pose.z = finite(fighter.z); pose.yaw = finite(fighter.yaw);
  result.crewId = fighter.crewId || 'rook';
  result.clip = 'idle'; result.clipTime = now; result.clipProgress = null;
  if (fighter.knockedDown) {
    result.clip = 'knockdown';
    const duration = finite(entry?.knockdownDuration, finite(fighter.knockdownDuration));
    result.clipTime = event?.clip === 'knockdown' && Number.isFinite(event.startedAt)
      ? Math.max(0, now - event.startedAt)
      : duration > 0 && Number.isFinite(fighter.knockdownRemaining)
        ? Math.max(0, duration - fighter.knockdownRemaining) : now;
    return result;
  }
  if (event && EVENT_CLIPS.has(event.clip) &&
      Number.isFinite(event.startedAt) && Number.isFinite(event.duration) &&
      now >= event.startedAt && now < event.startedAt + event.duration) {
    result.clip = event.clip;
    result.clipTime = now - event.startedAt;
    result.clipProgress = result.clipTime / event.duration;
    if (event.pose) {
      pose.x = finite(event.pose.x); pose.y = finite(event.pose.y);
      pose.z = finite(event.pose.z); pose.yaw = finite(event.pose.yaw);
    }
    return result;
  }
  if (fighter.airHeight > .001 || Math.abs(finite(fighter.verticalSpeed)) > .001) {
    result.clip = 'jump';
    // Vertical velocity is simulation-authored and identifies the flight phase
    // without a render clock or a second vertical displacement.
    result.clipTime = Math.max(0, Math.min(JUMP_SECONDS,
      (JUMP_SPEED - finite(fighter.verticalSpeed)) / FIGHTER_RULES.gravity));
    result.clipProgress = result.clipTime / JUMP_SECONDS;
  } else if (weapons.selected === 'wrench' && weapons.repairing) {
    result.clip = 'repair';
    result.clipTime = Math.max(0, finite(weapons.repairSeconds));
  } else if (weapons.selected === 'rpg' && weapons.serial > 0 &&
      Number.isFinite(weapons.lastFireAt) && now >= weapons.lastFireAt &&
      now < weapons.nextFireAt) {
    result.clipTime = now - weapons.lastFireAt;
    result.clip = result.clipTime < .22 ? 'fire' : 'reload';
    if (result.clip === 'reload') result.clipTime -= .22;
  } else if (fighter.speed > .01) {
    result.clip = fighter.locomotion === 'sprint' || input.sprint ? 'sprint' : 'walk';
  } else if (input.aim && weapons.selected === 'rpg') {
    result.clip = 'aim';
  }
  return result;
}
