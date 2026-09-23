import { PROFILE_KEY, PLAYERS_KEY, loadPlayers, normalizeProfile } from './progression.js';
import { LEADERBOARD_KEY, loadLeaderboard } from './leaderboard.js';
import { GHOST_KEY, GHOST_ENABLED_KEY, loadGhosts } from './ghost.js';
import { ARCHIVE_POINTER_KEY, readCareerArchivePointer, installCareerArchive } from './career-archives.js';

export const CAREER_FORMAT = 'the-duel-career';
export const CAREER_KEYS = Object.freeze([
  PROFILE_KEY, PLAYERS_KEY, LEADERBOARD_KEY, GHOST_KEY, GHOST_ENABLED_KEY,
  ARCHIVE_POINTER_KEY,
  'duel_route_variant', 'duel_graphics_quality', 'duel_lighting_mood',
  'duel_audio_muted', 'duel_redline_best_v4', 'duel_experimental_v1',
]);
const JSON_KEYS = new Set([PROFILE_KEY, PLAYERS_KEY, LEADERBOARD_KEY, GHOST_KEY, 'duel_redline_best_v4']);
const isObject = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const has = (value, key) => Object.prototype.hasOwnProperty.call(value, key);
function sameEntries(left, right) {
  const keys = Object.keys(left);
  return keys.length === Object.keys(right).length && keys.every(key => has(right, key) && left[key] === right[key]);
}
function preserved(raw, loaded) {
  if (Array.isArray(raw)) return Array.isArray(loaded) && raw.every(item => loaded.some(saved => preserved(item, saved)));
  if (isObject(raw)) return isObject(loaded) && Object.entries(raw).every(([key, value]) => has(loaded, key) && preserved(value, loaded[key]));
  return Object.is(raw, loaded);
}
function validateProfile(profile) {
  if (!isObject(profile) || ![1, 2].includes(profile.version)) return false;
  const normalized = normalizeProfile(profile);
  if (profile.awardedWins && (!Array.isArray(profile.awardedWins) || !profile.awardedWins.every(key => normalized.settledResults.includes(key)))) return false;
  return Object.entries(profile).every(([key, value]) => key === 'version' || key === 'awardedWins' || has(normalized, key) && preserved(value, normalized[key]));
}
const isCareerKey = key => CAREER_KEYS.includes(key) || /^(?:the-duel-|duel_)[\w-]+$/.test(key);
function allCareerKeys(storage) {
  const keys = new Set(CAREER_KEYS);
  if (typeof storage.length === 'number' && typeof storage.key === 'function') {
    for (let index = 0; index < storage.length; index++) {
      const key = storage.key(index);
      if (typeof key === 'string' && isCareerKey(key)) keys.add(key);
    }
  }
  return [...keys];
}
function storageOrThrow(storage) {
  const target = storage ?? globalThis.localStorage;
  if (!target || !['getItem', 'setItem', 'removeItem'].every(method => typeof target[method] === 'function')) {
    throw new Error('Browser save storage is unavailable.');
  }
  return target;
}
export function captureCareer(storage) {
  const source = storageOrThrow(storage), entries = {};
  for (const key of allCareerKeys(source)) {
    const value = source.getItem(key);
    if (value !== null) entries[key] = value;
  }
  return entries;
}
export function needsCareerMigration(storage) {
  const source = storageOrThrow(storage), raw = source.getItem(PLAYERS_KEY);
  if (raw === null) return [PROFILE_KEY, LEADERBOARD_KEY, GHOST_KEY].some(key => source.getItem(key) !== null);
  try {
    const registry = JSON.parse(raw);
    return registry?.version !== 2 || !Array.isArray(registry.players) || !registry.players.length ||
      registry.players.some(player => !player?.profile?.raceSettings) ||
      loadPlayers(source).players.some(player => !player.profile.raceSettings);
  } catch { return true; }
}
function validateEntries(entries) {
  if (!isObject(entries)) throw new Error('The career file has no save entries.');
  const keys = Object.keys(entries);
  if (!keys.length || keys.some(key => !isCareerKey(key))) throw new Error('The career file contains unknown or missing save keys.');
  if (![PLAYERS_KEY, PROFILE_KEY, LEADERBOARD_KEY, GHOST_KEY].some(key => has(entries, key))) {
    throw new Error('The career file has no player, record, or ghost data.');
  }
  for (const key of keys) {
    const raw = entries[key];
    if (typeof raw !== 'string') throw new Error('The career file has an invalid value for ' + key + '.');
    if (!JSON_KEYS.has(key)) continue;
    let value;
    try { value = JSON.parse(raw); } catch { throw new Error('The career file has invalid JSON in ' + key + '.'); }
    if (key === PROFILE_KEY && !validateProfile(value)) throw new Error('The legacy profile has invalid or unsupported values.');
    if (key === PLAYERS_KEY) {
      if (!isObject(value) || value.version !== 2 || !Array.isArray(value.players) || !value.players.length ||
        !value.players.every(player => isObject(player) && /^[\w-]{1,80}$/.test(player.id) &&
          typeof player.name === 'string' && !!player.name.trim() &&
          validateProfile(player.profile)) ||
        !value.players.some(player => player.id === value.activePlayerId) ||
        new Set(value.players.map(player => player.id)).size !== value.players.length ||
        new Set(value.players.map(player => player.name.trim().toLowerCase())).size !== value.players.length) {
        throw new Error('The player list is invalid or uses an unsupported version.');
      }
    }
    if (key === LEADERBOARD_KEY && (!isObject(value) || value.version !== 1 ||
      !Array.isArray(value.entries) || !Array.isArray(value.archivedEntries ?? []) ||
      ![...value.entries, ...(value.archivedEntries ?? [])].every(row => isObject(row) &&
        typeof row.playerId === 'string' && typeof row.eventKey === 'string' &&
        typeof row.car === 'string' && Number.isFinite(row.timeSec) && row.timeSec > 0))) {
      throw new Error('The leaderboard format is unsupported.');
    }
    if (key === LEADERBOARD_KEY) {
      const loaded=loadLeaderboard({getItem:requested=>requested===key?raw:null});
      if(loaded.entries.length+loaded.archivedEntries.length!==value.entries.length+(value.archivedEntries?.length??0)){
        throw new Error('The leaderboard contains records this game would discard.');
      }
    }
    if (key === GHOST_KEY && (!isObject(value) || value.version !== 1 ||
      !Array.isArray(value.records) || !Array.isArray(value.archivedRecords ?? []) ||
      ![...value.records, ...(value.archivedRecords ?? [])].every(row => isObject(row) &&
        typeof row.key === 'string' && typeof row.playerId === 'string' &&
        Array.isArray(row.samples) && row.samples.every(sample => Array.isArray(sample) && sample.every(Number.isSafeInteger))))) {
      throw new Error('The ghost format is unsupported.');
    }
    if (key === GHOST_KEY) {
      const loaded=loadGhosts({getItem:requested=>requested===key?raw:null});
      if(loaded.records.length+loaded.archivedRecords.length!==value.records.length+(value.archivedRecords?.length??0)){
        throw new Error('The ghost file contains recordings this game would discard.');
      }
    }
    if (key === 'duel_redline_best_v4' && !isObject(value)) throw new Error('The legacy best-time format is invalid.');
  }
  return entries;
}
export function createCareerExport(storage, now = () => new Date()) {
  const entries=captureCareer(storage);
  if(has(entries,ARCHIVE_POINTER_KEY))throw new Error('This career has IndexedDB archives. Use the complete career export.');
  return JSON.stringify({ format: CAREER_FORMAT, version: 1, exportedAt: now().toISOString(), entries }, null, 2);
}
export async function createCompleteCareerExport(storage, store=createIndexedDbBackupStore(), now=()=>new Date()){
  const source=storageOrThrow(storage),entries=captureCareer(source),pointer=readCareerArchivePointer(source);
  if(!pointer)return createCareerExport(source,now);
  const archives=await store.load(pointer.id);
  if(!archives||archives.id!==pointer.id||!Array.isArray(archives.leaderboardRows)||!Array.isArray(archives.ghostRows)){
    throw new Error('The IndexedDB career archives could not be read. No partial export was made.');
  }
  if(!sameEntries(captureCareer(source),entries))throw new Error('The career changed during export. Retry.');
  return JSON.stringify({format:CAREER_FORMAT,version:2,exportedAt:now().toISOString(),entries,archives},null,2);
}
export function parseCareerExport(text) {
  let archive;
  try { archive = JSON.parse(text); } catch { throw new Error('This is not a valid JSON career file.'); }
  if (!isObject(archive) || archive.format !== CAREER_FORMAT || ![1,2].includes(archive.version) ||
    typeof archive.exportedAt !== 'string' || !Number.isFinite(Date.parse(archive.exportedAt))) {
    throw new Error('This career file format is unsupported.');
  }
  validateEntries(archive.entries);
  const pointer=archive.entries[ARCHIVE_POINTER_KEY];
  if(archive.version===1&&pointer)throw new Error('The career file omits its IndexedDB archives.');
  if(archive.version===2){
    let expected;try{expected=JSON.parse(pointer);}catch{throw new Error('The career archive pointer is invalid.');}
    if(expected?.version!==1||expected.id!==archive.archives?.id||
      archive.archives?.version!==1||!Array.isArray(archive.archives.leaderboardRows)||!Array.isArray(archive.archives.ghostRows)){
      throw new Error('The career file has missing or invalid IndexedDB archives.');
    }
    const probe={getItem:key=>archive.entries[key]??null};
    try{installCareerArchive(probe,archive.archives);}
    catch{throw new Error('The IndexedDB career archives contain records this game would discard.');}
    const board=JSON.parse(archive.entries[LEADERBOARD_KEY]??'{"version":1,"entries":[]}');
    const ghosts=JSON.parse(archive.entries[GHOST_KEY]??'{"version":1,"records":[]}');
    const loadedBoard=loadLeaderboard(probe),loadedGhosts=loadGhosts(probe);
    if(loadedBoard.entries.length+loadedBoard.archivedEntries.length!==
      (board.entries?.length??0)+(board.archivedEntries?.length??0)+archive.archives.leaderboardRows.length||
      loadedGhosts.records.length+loadedGhosts.archivedRecords.length!==
      (ghosts.records?.length??0)+(ghosts.archivedRecords?.length??0)+archive.archives.ghostRows.length){
      throw new Error('The complete career contains duplicate or discarded archive records.');
    }
  }
  return archive;
}
function requestResult(request) {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error('IndexedDB request failed.'));
  });
}
export function createIndexedDbBackupStore(factory = globalThis.indexedDB) {
  let opened;
  function open() {
    if (!factory) return Promise.reject(new Error('IndexedDB backup storage is unavailable.'));
    if (!opened) opened = new Promise((resolve, reject) => {
      const request = factory.open('the-duel-career-backups', 1);
      request.onupgradeneeded = () => {
        if (!request.result.objectStoreNames.contains('snapshots')) request.result.createObjectStore('snapshots', { keyPath: 'id' });
      };
      request.onsuccess = () => { const db = request.result; db.onversionchange = () => db.close(); resolve(db); };
      request.onerror = () => reject(request.error ?? new Error('Could not open IndexedDB backups.'));
      request.onblocked = () => reject(new Error('IndexedDB backup is blocked by another game tab.'));
    }).catch(error => { opened = null; throw error; });
    return opened;
  }
  return {
    async save(record) {
      const db = await open();
      await new Promise((resolve, reject) => {
        const tx = db.transaction('snapshots', 'readwrite');
        tx.objectStore('snapshots').put(record);
        tx.oncomplete = resolve;
        tx.onabort = () => reject(tx.error ?? new Error('IndexedDB backup write failed.'));
        tx.onerror = () => reject(tx.error ?? new Error('IndexedDB backup write failed.'));
      });
    },
    async load(id) {
      const db = await open();
      return requestResult(db.transaction('snapshots', 'readonly').objectStore('snapshots').get(id));
    },
  };
}
export async function backupCareer(storage, backupStore = createIndexedDbBackupStore(), reason = 'migration', now = () => new Date()) {
  const source=storageOrThrow(storage),entries = captureCareer(source),pointer=readCareerArchivePointer(source);
  const archives=pointer?await backupStore.load(pointer.id):null;
  if(pointer&&(!archives||archives.id!==pointer.id||!Array.isArray(archives.leaderboardRows)||!Array.isArray(archives.ghostRows))){
    throw new Error('The current IndexedDB career archive cannot be backed up.');
  }
  const id = 'career-' + now().getTime() + '-' + (globalThis.crypto?.randomUUID?.() ?? Math.random().toString(36).slice(2));
  const record = { id, reason, createdAt: now().toISOString(), entries, archives };
  await backupStore.save(record);
  const saved = await backupStore.load(id);
  if (!saved || !isObject(saved.entries) || !sameEntries(saved.entries, entries) || JSON.stringify(saved.archives)!==JSON.stringify(archives)) throw new Error('The career backup could not be verified.');
  return record;
}
export async function backupBeforeMigration(storage, backupStore) {
  if (!needsCareerMigration(storage)) return null;
  const backup = await backupCareer(storage, backupStore, 'migration');
  if (!sameEntries(captureCareer(storage), backup.entries)) {
    throw new Error('The career changed while the migration backup was being made. Reload and try again.');
  }
  return backup;
}
function applyEntries(storage, entries) {
  for (const key of allCareerKeys(storage)) storage.removeItem(key);
  for (const [key, value] of Object.entries(entries)) storage.setItem(key, value);
  if (!sameEntries(captureCareer(storage), entries)) throw new Error('Career storage verification failed.');
}
export async function importCareer(text, { storage, backupStore = createIndexedDbBackupStore() } = {}) {
  const archive = parseCareerExport(text), source = storageOrThrow(storage), prior = captureCareer(source);
  const backup = await backupCareer(source, backupStore, 'before-import');
  if (!sameEntries(captureCareer(source), prior)) {
    throw new Error('The current career changed while its backup was being made. Retry the import.');
  }
  try {
    const entries={...archive.entries};
    let importedArchives=null;
    if(archive.version===2){
      importedArchives={...archive.archives,id:'archive-'+Date.now()+'-'+(globalThis.crypto?.randomUUID?.()??Math.random().toString(36).slice(2))};
      await backupStore.save(importedArchives);
      const saved=await backupStore.load(importedArchives.id);
      if(JSON.stringify(saved)!==JSON.stringify(importedArchives))throw new Error('The imported IndexedDB archives could not be verified.');
      entries[ARCHIVE_POINTER_KEY]=JSON.stringify({version:1,id:importedArchives.id});
    }
    applyEntries(source,entries);
    installCareerArchive(source,importedArchives);
  }
  catch (error) {
    try { applyEntries(source, prior);installCareerArchive(source,backup.archives); }
    catch (rollbackError) {
      throw new Error('Import failed and browser storage could not be restored. IndexedDB backup ' + backup.id + ' is available. ' + rollbackError.message, { cause: error });
    }
    throw new Error('Import failed; the previous career was restored. ' + error.message, { cause: error });
  }
  return { backupId: backup.id, playerCount: has(archive.entries, PLAYERS_KEY) ? JSON.parse(archive.entries[PLAYERS_KEY]).players.length : 1 };
}
export async function restoreCareerBackup(id, { storage, backupStore = createIndexedDbBackupStore() } = {}) {
  const record = await backupStore.load(id);
  if (!record || !isObject(record.entries)) throw new Error('Career backup was not found.');
  const source=storageOrThrow(storage);
  if(record.archives){
    await backupStore.save(record.archives);
    const saved=await backupStore.load(record.archives.id);
    if(JSON.stringify(saved)!==JSON.stringify(record.archives))throw new Error('Recovery archive verification failed.');
  }
  applyEntries(source, record.entries);
  installCareerArchive(source,record.archives);
  return record;
}
