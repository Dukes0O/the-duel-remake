import {backupCareer, parseCareerExport} from './career-backup.js';
import {PLAYERS_KEY, PROFILE_KEY, loadPlayers, savePlayers} from './progression.js';
import {CAREER_RESTORE_2026_10_28} from './career-restore-2026-10-28.js';

// One-time restore of the two careers lost when the browser cleared its storage on
// 28 October 2026. Removed by the card CAREER-RESTORE-REMOVE once Kyle confirms.
export const RESTORE_MARKER_KEY = 'duel_career_restore_2026_10_28';
export const RESTORE_NOTICE = 'Spikey Ferns and Dukes00 are back.';
export const RESTORE_FAILED = 'Spikey Ferns and Dukes00 could not be restored yet. The game will try again next time it starts. Your current players are unchanged.';

// Adds whichever of the two players is missing, after saving a verified copy of the current
// career. A name that already exists (any letter case) is left exactly as it is. Players already
// here stay beside the restored ones; on a fresh career there is no player to keep, so the
// default "Player 1" the game invents is not kept. Runs until both names are present: the marker
// is set once both are added or were already here. importCareer can only replace a whole career,
// so the players are added through the normal player list code instead.
export async function restoreLostCareers({storage, backupStore, restore = CAREER_RESTORE_2026_10_28} = {}) {
  if (storage.getItem(RESTORE_MARKER_KEY) !== null) return {restored: false, reason: 'done-before', added: [], skipped: []};
  const lost = JSON.parse(parseCareerExport(JSON.stringify(restore)).entries[PLAYERS_KEY]);
  const fresh = storage.getItem(PLAYERS_KEY) === null && storage.getItem(PROFILE_KEY) === null;
  const current = loadPlayers(storage), here = new Set(current.players.map(player => player.name.trim().toLowerCase()));
  const adding = lost.players.filter(player => !here.has(player.name.toLowerCase()));
  const skipped = lost.players.filter(player => here.has(player.name.toLowerCase())).map(player => player.name);
  if (!adding.length) {
    storage.setItem(RESTORE_MARKER_KEY, 'already-here');
    return {restored: false, reason: 'name-exists', added: [], skipped};
  }
  if (current.players.some(player => adding.some(other => other.id === player.id))) {
    throw new Error('A player here already uses an id from the restore.');
  }
  await backupCareer(storage, backupStore, 'before-career-restore');
  const kept = fresh ? [] : current.players;
  // Spikey Ferns becomes the active player when he is added; otherwise whoever was active stays.
  const activePlayerId = adding.some(player => player.id === lost.activePlayerId) ? lost.activePlayerId : current.activePlayerId;
  if (!savePlayers({version: 2, activePlayerId, players: [...adding, ...kept]}, storage)) {
    throw new Error('The restored players could not be saved.');
  }
  storage.setItem(RESTORE_MARKER_KEY, 'restored');
  await storage.flush?.();
  return {restored: true, reason: 'restored', added: adding.map(player => player.name), skipped};
}

export function restoreNoticeText({added = [], skipped = []} = {}) {
  if (added.length === 2) return RESTORE_NOTICE;
  return added[0] + ' is back.' + (skipped.length ? ' ' + skipped[0] + ' was already here, so it was left as it is.' : '');
}

function showNotice(doc, id, text, style, lifetime, role = 'status') {
  const note = doc.createElement('aside');
  note.id = id;
  note.setAttribute('role', role);
  note.textContent = text;
  note.style.cssText = style;
  note.addEventListener('click', () => note.remove());
  if (lifetime) setTimeout(() => note.remove(), lifetime);
  doc.body.append(note);
}
export function showRestoreNotice(text = RESTORE_NOTICE, doc = document) {
  showNotice(doc, 'career-restored', text,
    'position:fixed;z-index:9999;inset:12px 12px auto;background:#17361d;color:white;padding:14px 18px;border:2px solid #9fd8a8;font:15px/1.4 system-ui;cursor:pointer', 12000);
}
// Same look as the career save error notice. It stays until the player clicks it.
export function showRestoreFailure(doc = document) {
  showNotice(doc, 'career-restore-error', RESTORE_FAILED,
    'position:fixed;z-index:9999;inset:auto 12px 12px;background:#5a1515;color:white;padding:14px 18px;border:2px solid #ffc6a1;font:15px/1.4 system-ui;cursor:pointer', 0, 'alert');
}
