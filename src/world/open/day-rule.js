// Play time in an open roam. Dark lasts until a hearth is banked.
const DAY_START = 2 * 60;
export const DUSK_START = DAY_START + 14 * 60;
export const DARK_START = DUSK_START + 4 * 60;

export function partOfDay(seconds) {
  if (seconds < DAY_START) return 'dawn';
  if (seconds < DUSK_START) return 'day';
  if (seconds < DARK_START) return 'dusk';
  return 'dark';
}

export function advanceDay(seconds, playSeconds) {
  return Math.min(DARK_START, seconds + Math.max(0, playSeconds));
}

export function daySecondsOf(world) {
  const day = world.open.day;
  return day?.night === world.ledger.night ? day.seconds : 0;
}

export function reserveOuting(world) {
  return {...world, open: {...world.open, outingNight: world.ledger.night}};
}

export function outingAvailable(world) {
  return world.open.outingNight !== world.ledger.night;
}
