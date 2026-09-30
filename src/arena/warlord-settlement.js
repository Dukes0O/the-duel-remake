import {CARS} from '../config.js';
import {isCarUnlocked} from '../progression.js';
import {hasEarnedSideSaws} from '../wasteland-progress.js';
import {WARLORDS} from '../warlords.js';

// Pure career transaction. App owns the starting player identity and the one
// registry write; a failed write can retry this same immutable result.
const record = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const bounded = (value, maximum) => Number.isSafeInteger(value)
  ? Math.max(0, Math.min(maximum, value)) : 0;
const noAward = (profile, key) => ({profile, key, awarded: false, scrapEarned: 0});
const COMPLETED_REASONS = new Set(['three-wrecks', 'sudden-death', 'damage']);
const DIFFICULTY_FACTORS = Object.freeze({easy: 1, medium: 1.2, hard: 1.4});
const WARLORD_LADDER = Object.freeze([
  'sal', 'dustmonger', 'mirage', 'gunn', 'kettle', 'vultures', 'tollkeeper', 'blackiron',
]);

// The public ladder policy is ready for later fights. Settlement below still
// accepts only the built Sal roster and its already-validated reward path.
export function warlordPay({warlordId, won, firstWin, wrecksOnWarlord, cpuDifficulty} = {}) {
  const position = WARLORD_LADDER.indexOf(warlordId);
  if (position < 0 || !Object.hasOwn(DIFFICULTY_FACTORS, cpuDifficulty) ||
      typeof won !== 'boolean' || typeof firstWin !== 'boolean' ||
      (firstWin && !won) || !Number.isSafeInteger(wrecksOnWarlord) || wrecksOnWarlord < 0)
    return null;
  const wrecks = won ? Math.min(3, wrecksOnWarlord) : wrecksOnWarlord;
  const base = firstWin ? 600 + 100 * position : (won ? 80 : 0) + 60 * wrecks;
  const total = Math.round(base * DIFFICULTY_FACTORS[cpuDifficulty]);
  return Number.isSafeInteger(total) && total >= 0 ? total : null;
}

function payExplanation({warlordId, won, firstWin, wrecksOnWarlord, cpuDifficulty}) {
  const factor = DIFFICULTY_FACTORS[cpuDifficulty];
  if (firstWin) return 'First win: ' + (600 + 100 * WARLORD_LADDER.indexOf(warlordId)) +
    ' scrap at ' + factor + '× difficulty.';
  const wrecks = won ? Math.min(3, wrecksOnWarlord) : wrecksOnWarlord;
  return (won ? 'Rematch: 80 scrap plus ' : 'Wreck pay: ') +
    '60 per warlord wreck (' + wrecks + ') at ' + factor + '× difficulty.';
}

function resultFacts(arena) {
  if (!record(arena) || arena.version !== 1 || arena.venueId !== 'scrapdome' ||
      arena.mode !== 'warlord' || arena.warlordId !== 'sal' ||
      !WARLORDS[arena.warlordId] || arena.warlordBossId !== 'cpu-1' ||
      arena.phase !== 'over' || !record(arena.result) ||
      !COMPLETED_REASONS.has(arena.result?.reason) ||
      !Array.isArray(arena.participants) || arena.participants.length !== 2 ||
      !arena.participants.every(record) ||
      !Array.isArray(arena.result?.placings)) return null;
  const player = arena.participants.find(item => item?.id === 'player' && item.kind === 'player');
  const boss = arena.participants.find(item => item?.id === arena.warlordBossId && item.kind === 'cpu');
  const placings = arena.result.placings;
  if (!player || !boss || player === boss || player.team === boss.team ||
      placings.length !== 2 || new Set(placings).size !== 2 ||
      placings.some(id => id !== player.id && id !== boss.id) ||
      arena.result.winnerId !== placings[0]) return null;
  if (arena.result.reason === 'three-wrecks' &&
      bounded(arena.participants.find(item => item.id === placings[0]).wrecks, 1_000_000) < 3)
    return null;
  return {won: arena.result.winnerId === player.id, wrecksOnWarlord: boss.wrecked};
}

export function settleWarlordResult(profile, {runId, ownerPlayerId, activePlayerId,
    arena, car, cpuDifficulty} = {}) {
  const key = typeof runId === 'string' && runId.length > 0 && runId.length <= 128
    ? `warlord:${runId}` : null;
  const career = profile?.wasteland, facts = resultFacts(arena);
  if (!record(profile) || ![1, 2].includes(profile.version) ||
      !Array.isArray(profile.unlockedCars) ||
      !profile.unlockedCars.every(id => typeof id === 'string' && Object.hasOwn(CARS, id)) ||
      !key || typeof ownerPlayerId !== 'string' || ownerPlayerId.length === 0 ||
      ownerPlayerId !== activePlayerId || career?.version !== 1 ||
      career.discoveredGate !== true || !facts || !Object.hasOwn(CARS, car) ||
      !isCarUnlocked(profile, car) || !Array.isArray(career.settledResults) ||
      career.settledResults.includes(key)) return noAward(profile, key);

  const previous = record(career.warlords?.sal) ? career.warlords.sal : {};
  const defeated = hasEarnedSideSaws(career);
  const firstWin = facts.won && !defeated;
  const payContext = {warlordId: arena.warlordId, won: facts.won, firstWin,
    wrecksOnWarlord: facts.wrecksOnWarlord, cpuDifficulty};
  const reward = warlordPay(payContext);
  if (reward === null) return noAward(profile, key);
  const oldScrap = bounded(career.scrap, 1_000_000_000);
  const scrap = Math.min(1_000_000_000, oldScrap + reward);
  const sal = {...previous, defeated: defeated || facts.won,
    wins: Math.min(1_000_000, bounded(previous.wins, 1_000_000) + (facts.won ? 1 : 0)),
    losses: Math.min(1_000_000, bounded(previous.losses, 1_000_000) + (facts.won ? 0 : 1))};
  let territories = career.territories, kits = career.kits;
  if (facts.won) {
    const territory = record(territories?.sal) ? territories.sal : {hold: 0};
    territories = {...territories, sal: {...territory, claimed: true}};
  }
  if (firstWin) {
    const installed = record(kits?.[car]) ? kits[car] : {};
    const owned = Array.isArray(installed.owned) ? installed.owned : [];
    kits = {...kits, [car]: {...installed,
      owned: [...new Set([...owned, 'side-saws'])], equipped: 'side-saws'}};
  }
  const wasteland = {...career, scrap, territories, kits,
    warlords: {...career.warlords, sal},
    settledResults: [...career.settledResults, key].slice(-1000)};
  return {profile: {...profile, wasteland}, key, awarded: true,
    scrapEarned: scrap - oldScrap, firstWin, rewardReason: payExplanation(payContext),
    kitEarned: firstWin ? 'side-saws' : null, territoryClaimed: facts.won};
}
