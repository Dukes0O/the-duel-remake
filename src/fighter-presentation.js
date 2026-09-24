const finite = (value, fallback = 0) => Number.isFinite(value) ? value : fallback;

// A read-only projection of a simulation snapshot. Repeated renders and replay
// rewinds select the same pose; input alone never proves that an action happened.
export function selectFighterPresentation(entry, {time = 0} = {}) {
  const fighter = entry?.fighter || entry || {};
  const input = entry?.input || {};
  const weapons = entry?.weapons || {};
  const event = entry?.presentation || fighter.presentation;
  const now = Math.max(0, finite(time));
  const pose = {x: finite(fighter.x), y: finite(fighter.y),
    z: finite(fighter.z), yaw: finite(fighter.yaw)};
  const result = {crewId: fighter.crewId || 'rook', clip: 'idle', clipTime: now, pose};
  if (fighter.knockedDown) {
    result.clip = 'knockdown';
    const duration = finite(entry?.knockdownDuration, finite(fighter.knockdownDuration));
    result.clipTime = event?.clip === 'knockdown' && Number.isFinite(event.startedAt)
      ? Math.max(0, now - event.startedAt)
      : duration > 0 && Number.isFinite(fighter.knockdownRemaining)
        ? Math.max(0, duration - fighter.knockdownRemaining) : now;
    return result;
  }
  if (event && ['get-up', 'enter', 'exit'].includes(event.clip) &&
      Number.isFinite(event.startedAt) && Number.isFinite(event.duration) &&
      now >= event.startedAt && now < event.startedAt + event.duration) {
    result.clip = event.clip;
    result.clipTime = now - event.startedAt;
    if (event.pose) result.pose = {...event.pose};
    return result;
  }
  if (fighter.airHeight > .001 || Math.abs(finite(fighter.verticalSpeed)) > .001) {
    result.clip = 'jump';
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
