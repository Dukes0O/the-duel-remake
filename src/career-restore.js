import {backupCareer, parseCareerExport} from './career-backup.js';
import {PLAYERS_KEY, loadPlayers, savePlayers} from './progression.js';
import {CAREER_RESTORE_2026_10_28} from './career-restore-2026-10-28.js';

// One-time restore of the two careers lost when the browser cleared its storage on
// 28 October 2026. Removed by the card CAREER-RESTORE-REMOVE once Kyle confirms.
export const RESTORE_MARKER_KEY = 'duel_career_restore_2026_10_28';
export const RESTORE_NOTICE = 'Spikey Ferns and Dukes00 are back.';

// Adds the two players next to whoever is already here, after saving a verified copy of the
// current career. Runs once: the marker is set whether the players were added or already
// existed. importCareer can only replace a whole career, so the players are added through
// the normal player list code instead.
export async function restoreLostCareers({storage, backupStore, restore = CAREER_RESTORE_2026_10_28} = {}) {
  if (storage.getItem(RESTORE_MARKER_KEY) !== null) return {restored: false, reason: 'done-before'};
  const lost = JSON.parse(parseCareerExport(JSON.stringify(restore)).entries[PLAYERS_KEY]);
  const current = loadPlayers(storage), names = new Set(lost.players.map(player => player.name.toLowerCase()));
  if (current.players.some(player => names.has(player.name.trim().toLowerCase()))) {
    storage.setItem(RESTORE_MARKER_KEY, 'already-here');
    return {restored: false, reason: 'name-exists'};
  }
  if (current.players.some(player => lost.players.some(other => other.id === player.id))) {
    throw new Error('A player here already uses an id from the restore.');
  }
  await backupCareer(storage, backupStore, 'before-career-restore');
  const merged = {version: 2, activePlayerId: lost.activePlayerId, players: [...lost.players, ...current.players]};
  if (!savePlayers(merged, storage)) throw new Error('The restored players could not be saved.');
  storage.setItem(RESTORE_MARKER_KEY, 'restored');
  await storage.flush?.();
  return {restored: true, reason: 'restored'};
}

export function showRestoreNotice(doc = document) {
  const note = doc.createElement('aside');
  note.id = 'career-restored';
  note.setAttribute('role', 'status');
  note.textContent = RESTORE_NOTICE;
  note.style.cssText = 'position:fixed;z-index:9999;inset:12px 12px auto;background:#17361d;color:white;padding:14px 18px;border:2px solid #9fd8a8;font:15px/1.4 system-ui;cursor:pointer';
  note.addEventListener('click', () => note.remove());
  setTimeout(() => note.remove(), 12000);
  doc.body.append(note);
}
