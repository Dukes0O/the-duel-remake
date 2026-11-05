const TICKS_PER_DAY = 24;
const DAYS_PER_MONTH = 30;
const MONTHS_PER_YEAR = 12;
const TICKS_PER_MONTH = TICKS_PER_DAY * DAYS_PER_MONTH;
const TICKS_PER_YEAR = TICKS_PER_MONTH * MONTHS_PER_YEAR;
const SEASONS = Object.freeze(['Spring', 'Summer', 'Autumn', 'Winter']);

export function townCalendarAt(tick) {
  if (!Number.isSafeInteger(tick) || tick < 0) throw new RangeError('Town time must be a whole number of hours from zero.');
  const year = Math.floor(tick / TICKS_PER_YEAR) + 1;
  const inYear = tick % TICKS_PER_YEAR;
  const month = Math.floor(inYear / TICKS_PER_MONTH) + 1;
  const day = Math.floor((inYear % TICKS_PER_MONTH) / TICKS_PER_DAY) + 1;
  const hour = inYear % TICKS_PER_DAY;
  return {hour, day, month, season:SEASONS[Math.floor((month - 1) / 3)], year};
}

export const TOWN_TIME = Object.freeze({ticksPerDay:TICKS_PER_DAY, daysPerMonth:DAYS_PER_MONTH, monthsPerYear:MONTHS_PER_YEAR});
