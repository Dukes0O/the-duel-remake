import {backupCareer} from './career-backup.js';
import {PLAYERS_KEY, loadPlayers, savePlayers} from './progression.js';
import {rankForXp} from './notoriety.js';

// One-time grant for Gratian's player, Spikey Ferns (Kyle, 16 November 2026: "he also should have his wasteland
// account notoriety rank placed at 9 and have another 20,000 in scrap credits"). Removed by the card
// CAREER-GRANT-REMOVE once it has run on the laptop.
export const GRANT_MARKER_KEY = 'duel_career_grant_2026_11_16';
export const GRANT = Object.freeze({playerId: 'player-spikey-ferns', playerName: 'Spikey Ferns', rank: 9, scrap: 20000});

// The notoriety a rank starts at: rank 9 is 7,400.
export function xpForRank(rank) {
  let xp = 0;
  for (let r = 1; r < rank; r++) xp += 400 + 150 * (r - 1);
  return xp;
}

// Adds the scrap and lifts the notoriety to rank 9 (never lowers a higher rank), after saving a verified copy of
// the career. Runs once: the marker is set when the grant is saved, or when Spikey Ferns is not on this laptop's
// career at all (nothing to grant). Every other player is left exactly as it was.
export async function grantCareer({storage, backupStore, grant = GRANT} = {}) {
  if (storage.getItem(GRANT_MARKER_KEY) !== null) return {granted: false, reason: 'done-before'};
  const players = loadPlayers(storage);
  const index = players.players.findIndex(player => player.id === grant.playerId ||
    player.name.trim().toLowerCase() === grant.playerName.toLowerCase());
  if (index < 0) {
    // Only a players list that was really read can say Spikey Ferns is not here; otherwise try again next start.
    if (storage.getItem(PLAYERS_KEY) !== null) storage.setItem(GRANT_MARKER_KEY, 'no-player');
    return {granted: false, reason: 'no-player'};
  }
  await backupCareer(storage, backupStore, 'before-career-grant');
  const player = players.players[index], profile = player.profile ?? {}, wasteland = profile.wasteland ?? {};
  const xp = Math.max(Number.isSafeInteger(wasteland.xp) ? wasteland.xp : 0, xpForRank(grant.rank));
  const scrap = (Number.isSafeInteger(wasteland.scrap) ? wasteland.scrap : 0) + grant.scrap;
  const next = {...player, profile: {...profile, wasteland: {...wasteland, xp, rank: rankForXp(xp), scrap}}};
  const list = players.players.map((item, i) => i === index ? next : item);
  if (!savePlayers({...players, players: list}, storage)) throw new Error('The grant could not be saved.');
  storage.setItem(GRANT_MARKER_KEY, 'granted');
  await storage.flush?.();
  return {granted: true, reason: 'granted', name: player.name, rank: rankForXp(xp), scrap, added: grant.scrap};
}

export function grantNoticeText(result) {
  return `${result.name}: notoriety rank ${result.rank}, and ${result.added.toLocaleString('en-US')} scrap added (${result.scrap.toLocaleString('en-US')} now).`;
}
