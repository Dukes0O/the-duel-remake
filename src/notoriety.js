// Progression is calculated only from settled combat results. The simulation
// supplies owned hits and wrecks today; later on-foot systems may add explicit
// event records for the more specific actions below.
export const NOTORIETY_XP = Object.freeze({
  hit: 10,
  wreck: 150,
  onFootKnockdown: 60,
  rpgDirectHit: 40,
  footAmbushHit: 75,
  raiderKnockdown: 25,
  finish: 100,
  win: 300,
});
export const MAX_NOTORIETY_RANK = 30;
export const MAX_NOTORIETY_XP = 1_000_000_000;

const count = value => Number.isSafeInteger(value) && value > 0
  ? Math.min(value, 10_000) : 0;

export function rankForXp(value) {
  let remaining = Number.isSafeInteger(value) && value > 0
    ? Math.min(value, MAX_NOTORIETY_XP) : 0;
  let rank = 1;
  while (rank < MAX_NOTORIETY_RANK) {
    const needed = 400 + 150 * (rank - 1);
    if (remaining < needed) break;
    remaining -= needed;
    rank++;
  }
  return rank;
}

function extraEventXp(events) {
  const breakdown = {
    onFootKnockdown: 0, rpgDirectHit: 0,
    footAmbushHit: 0, raiderKnockdown: 0,
  };
  if (!Array.isArray(events)) return breakdown;
  const seen = new Set();
  for (const event of events.slice(0, 256)) {
    if (!event || typeof event !== 'object' || event.owner !== 'player' ||
      event.source !== 'onFoot' ||
      typeof event.id !== 'string' || !event.id || event.id.length > 128 ||
      !Object.hasOwn(breakdown, event.type)) continue;
    const key = event.type + ':' + event.id;
    if (seen.has(key)) continue;
    seen.add(key);
    breakdown[event.type] += NOTORIETY_XP[event.type];
  }
  return breakdown;
}

export function combatNotoriety(result, {finished = false, won = false} = {}) {
  if (!finished || result?.mode !== 'wasteland' ||
    result.combatRewardsEnabled !== true) return null;
  const events = extraEventXp(result.notorietyEvents);
  const breakdown = {
    hit: count(result.hitsLanded) * NOTORIETY_XP.hit,
    wreck: count(result.wrecksCaused) * NOTORIETY_XP.wreck,
    ...events,
    finish: NOTORIETY_XP.finish,
    win: won ? NOTORIETY_XP.win : 0,
  };
  return {breakdown, total: Object.values(breakdown).reduce((sum, xp) => sum + xp, 0)};
}
