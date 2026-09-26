// Last Car Rolling economy. This module is pure: App owns player identity and
// the atomic storage write after it receives an arenaResult event.

const DIFFICULTY_FACTORS = Object.freeze({easy: 1, medium: 1.2, hard: 1.4});
const bounded = (value, maximum) => Number.isSafeInteger(value) && value > 0
  ? Math.min(value, maximum) : 0;
const currentHold = profile => bounded(profile?.wasteland?.territories?.kettle?.hold, 100);
const noAward = (profile, key = null) => ({profile, key, awarded: false,
  scrapEarned: 0, holdAdded: 0, hold: currentHold(profile)});

function arenaFacts(arena) {
  if (arena?.version !== 1 || arena.venueId !== 'scrapdome' ||
      arena.mode !== 'last-car-rolling' || arena.phase !== 'over' ||
      !arena.result || !Array.isArray(arena.participants) ||
      !Array.isArray(arena.result.placings)) return null;
  const player = arena.participants.filter(item => item?.id === 'player' && item.kind === 'player');
  const computers = arena.participants.filter(item => item?.kind === 'cpu' &&
    typeof item.id === 'string' && item.id !== 'player');
  const ids = arena.participants.map(item => item?.id);
  const placings = arena.result.placings;
  if (player.length !== 1 || computers.length < 1 || computers.length > 3 ||
      ids.length !== computers.length + 1 || new Set(ids).size !== ids.length ||
      placings.length !== ids.length || new Set(placings).size !== placings.length ||
      placings.some(id => !ids.includes(id)) || !placings.includes('player') ||
      arena.result.winnerId !== placings[0]) return null;
  const placeIndex = placings.indexOf('player');
  return {player: player[0], computers: computers.length,
    behind: placings.slice(placeIndex + 1).filter(id => id !== 'player').length,
    won: placeIndex === 0};
}

export function arenaReward(arena, cpuDifficulty) {
  const facts = arenaFacts(arena), factor = DIFFICULTY_FACTORS[cpuDifficulty];
  if (!facts || !factor) return {base: 0, placing: 0, wrecks: 0, factor: 0, total: 0};
  const base = 80, placing = facts.behind * 40,
    wrecks = bounded(facts.player.wrecks, 4) * 60;
  return {base, placing, wrecks, factor, total: Math.round((base + placing + wrecks) * factor)};
}

export function settleArenaResult(profile, {runId, ownerPlayerId, activePlayerId,
    cpuDifficulty, arena} = {}) {
  const key = typeof runId === 'string' && runId.length > 0 && runId.length <= 128
    ? `arena:${runId}` : null;
  const career = profile?.wasteland, facts = arenaFacts(arena);
  if (!key || typeof ownerPlayerId !== 'string' || ownerPlayerId.length === 0 ||
      ownerPlayerId !== activePlayerId || career?.version !== 1 ||
      career.discoveredGate !== true || !facts || !DIFFICULTY_FACTORS[cpuDifficulty] ||
      !Array.isArray(career.settledResults) || career.settledResults.includes(key))
    return noAward(profile, key);

  const reward = arenaReward(arena, cpuDifficulty);
  const oldScrap = bounded(career.scrap, 1_000_000_000);
  const scrap = Math.min(1_000_000_000, oldScrap + reward.total);
  const previousTerritory = career.territories?.kettle || {hold: 0, claimed: false};
  const oldHold = bounded(previousTerritory.hold, 100);
  const holdAdded = facts.won && facts.computers >= 2 ? Math.min(25, 100 - oldHold) : 0;
  const hold = oldHold + holdAdded;
  const territories = {...career.territories,
    kettle: {...previousTerritory, hold}};
  const wasteland = {...career, scrap, territories,
    settledResults: [...career.settledResults, key].slice(-1000)};
  return {profile: {...profile, wasteland}, key, awarded: true,
    scrapEarned: scrap - oldScrap, holdAdded, hold, reward};
}
