export const TOWN_POINTER_KEY = 'the-duel-town-pointer-v1';
const DB_NAME = 'the-duel-towns';
const STORE = 'towns';
const COPIES = 'copies';
const clone = value => typeof structuredClone === 'function'
  ? structuredClone(value) : JSON.parse(JSON.stringify(value));
const object = value => value !== null && typeof value === 'object' && !Array.isArray(value);

function requestResult(request) {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error('Town storage could not be read.'));
  });
}

// Pass memoryOnly:true in tests and previews. It never opens the browser's database.
export function createTownStore({ factory = globalThis.indexedDB, memoryOnly = false, memory = {}, now = () => new Date(), onInstallStep = () => {} } = {}) {
  const memoryTowns = memory.towns ?? new Map(), memoryCopies = memory.copies ?? new Map();
  let opened;
  function open() {
    if (memoryOnly) return Promise.resolve(null);
    if (!factory) return Promise.reject(new Error('Town storage is unavailable.'));
    if (!opened) opened = new Promise((resolve, reject) => {
      const request = factory.open(DB_NAME, 1);
      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE, { keyPath: 'id' });
        if (!db.objectStoreNames.contains(COPIES)) db.createObjectStore(COPIES, { keyPath: 'id' });
      };
      request.onsuccess = () => { request.result.onversionchange = () => request.result.close(); resolve(request.result); };
      request.onerror = () => reject(request.error ?? new Error('Town storage could not be opened.'));
      request.onblocked = () => reject(new Error('Town storage is busy in another tab.'));
    }).catch(error => { opened = null; throw error; });
    return opened;
  }
  async function read(storeName, id) {
    if (memoryOnly) return clone((storeName === STORE ? memoryTowns : memoryCopies).get(id));
    const db = await open();
    return requestResult(db.transaction(storeName, 'readonly').objectStore(storeName).get(id));
  }
  async function write(storeName, value) {
    if (memoryOnly) { (storeName === STORE ? memoryTowns : memoryCopies).set(value.id, clone(value)); return; }
    const db = await open();
    await new Promise((resolve, reject) => {
      const tx = db.transaction(storeName, 'readwrite');
      tx.objectStore(storeName).put(value);
      tx.oncomplete = resolve;
      tx.onabort = tx.onerror = () => reject(tx.error ?? new Error('Town storage could not be saved.'));
    });
  }
  async function writeTownAndCopy(record, copy) {
    if (memoryOnly) {
      const previousTown = memoryTowns.get(record.id), previousCopy = memoryCopies.get(copy.id);
      try { memoryTowns.set(record.id, clone(record)); memoryCopies.set(copy.id, clone(copy)); }
      catch (error) {
        if (previousTown === undefined) memoryTowns.delete(record.id); else memoryTowns.set(record.id, previousTown);
        if (previousCopy === undefined) memoryCopies.delete(copy.id); else memoryCopies.set(copy.id, previousCopy);
        throw error;
      }
      return;
    }
    const db = await open();
    await new Promise((resolve, reject) => {
      const tx = db.transaction([STORE, COPIES], 'readwrite');
      tx.objectStore(STORE).put(record); tx.objectStore(COPIES).put(copy);
      tx.oncomplete = resolve;
      tx.onabort = tx.onerror = () => reject(tx.error ?? new Error('Town storage could not be saved.'));
    });
  }
  async function installRecord(record, previous, copies) {
    const recoveryId = '@recovery:' + record.id;
    const recovery = { id: recoveryId, townId: record.id, recovery: true,
      previous: previous ? clone(previous) : null, copies: copies.map(clone) };
    if (memoryOnly) {
      memoryCopies.set(recoveryId, recovery);
      memoryTowns.set(record.id, clone(record));
      return recoveryId;
    }
    const db = await open();
    await new Promise((resolve, reject) => {
      const tx = db.transaction([STORE, COPIES], 'readwrite');
      tx.objectStore(COPIES).put(recovery);
      tx.objectStore(STORE).put(clone(record));
      tx.oncomplete = resolve;
      tx.onabort = tx.onerror = () => reject(tx.error ?? new Error('Town replacement could not be saved.'));
    });
    return recoveryId;
  }
  async function recoverInstall(id) {
    const recoveryId = '@recovery:' + id;
    const marker = await read(COPIES, recoveryId);
    if (!marker?.recovery) return '';
    if (memoryOnly) {
      if (marker.previous) memoryTowns.set(id, clone(marker.previous)); else memoryTowns.delete(id);
      for (const copy of marker.copies) memoryCopies.set(copy.id, clone(copy));
      memoryCopies.delete(recoveryId);
    } else {
      const db = await open();
      await new Promise((resolve, reject) => {
        const tx = db.transaction([STORE, COPIES], 'readwrite');
        const towns = tx.objectStore(STORE), copies = tx.objectStore(COPIES);
        if (marker.previous) towns.put(marker.previous); else towns.delete(id);
        for (const copy of marker.copies) copies.put(copy);
        copies.delete(recoveryId);
        tx.oncomplete = resolve;
        tx.onabort = tx.onerror = () => reject(tx.error ?? new Error('Town recovery could not be saved.'));
      });
    }
    return 'An unfinished town restore was found. The previous town has been put back.';
  }
  async function allCopies(townId) {
    if (memoryOnly) return [...memoryCopies.values()].filter(row => row.townId === townId && !row.recovery).map(clone);
    const db = await open();
    const rows = await requestResult(db.transaction(COPIES, 'readonly').objectStore(COPIES).getAll());
    return rows.filter(row => row.townId === townId && !row.recovery);
  }
  async function deleteCopies(ids) {
    if (memoryOnly) { ids.forEach(id => memoryCopies.delete(id)); return; }
    const db = await open();
    await new Promise((resolve, reject) => {
      const tx = db.transaction(COPIES, 'readwrite'), store = tx.objectStore(COPIES);
      ids.forEach(id => store.delete(id));
      tx.oncomplete = resolve;
      tx.onabort = tx.onerror = () => reject(tx.error ?? new Error('Old town copies could not be removed.'));
    });
  }
  return Object.freeze({
    async save(town, reason = 'save') {
      if (!object(town) || typeof town.id !== 'string' || !town.id.trim() || !Array.isArray(town.mayors)) {
        throw new Error('A town needs an id and a list of mayors.');
      }
      const savedAt = now().toISOString();
      const record = { id: town.id, version: Number.isSafeInteger(town.version) ? town.version : 1,
        mayors: [...new Set(town.mayors.filter(id => typeof id === 'string' && id.length))], savedAt, town: clone(town) };
      const copy = { id: town.id + ':' + savedAt + ':' + Math.random().toString(36).slice(2), townId: town.id,
        version: record.version, mayors: record.mayors, savedAt, reason, town: clone(town) };
      await writeTownAndCopy(record, copy);
      const copies = (await allCopies(town.id)).sort((a, b) => b.savedAt.localeCompare(a.savedAt));
      const weeks = new Set(), keep = new Set();
      for (const item of copies) {
        const age = Math.max(0, now().getTime() - Date.parse(item.savedAt));
        if (keep.size < 3) { keep.add(item.id); continue; }
        const week = Math.floor(Date.parse(item.savedAt) / 604800000);
        if (age <= 56 * 86400000 && !weeks.has(week)) { weeks.add(week); keep.add(item.id); }
      }
      await deleteCopies(copies.filter(item => !keep.has(item.id)).map(item => item.id));
      return clone(record);
    },
    async load(id) {
      const recoveryMessage = await recoverInstall(id);
      const record = await read(STORE, id);
      const copies = (await allCopies(id)).sort((a, b) => b.savedAt.localeCompare(a.savedAt));
      if (copies.length && !valid(copies[0])) {
        const goodCopy = copies.slice(1).find(valid);
        if (goodCopy) return { town: clone(goodCopy.town), message: [recoveryMessage, 'The latest town save was damaged. The last good copy has been opened.'].filter(Boolean).join(' ') };
      }
      if (!copies.length && valid(record)) return { town: clone(record.town), message: recoveryMessage };
      if (copies.length && valid(copies[0])) return { town: clone(copies[0].town), message: recoveryMessage };
      const good = copies.find(valid);
      return good ? { town: clone(good.town), message: 'The latest town save was damaged. The last good copy has been opened.' }
        : { town: null, message: 'This town save is damaged and no good copy is available.' };
    },
    async exportTown(id) {
      const loaded = await this.load(id);
      if (!loaded.town) throw new Error(loaded.message || 'Town was not found.');
      return JSON.stringify({ format: 'the-duel-town', version: 1, town: loaded.town });
    },
    async importTown(text) {
      let file; try { file = JSON.parse(text); } catch { throw new Error('This is not a valid town file.'); }
      if (file?.format !== 'the-duel-town' || file.version !== 1 || !object(file.town) || !valid({ town: file.town })) {
        throw new Error('This town file is invalid or from a newer game.');
      }
      return this.save(file.town, 'file restore');
    },
    async towns(ids) { return Promise.all(ids.map(id => read(STORE, id))); },
    async install(records, { retainRecovery = false } = {}) {
      if (!Array.isArray(records) || records.some(record => !valid(record))) throw new Error('The career file has invalid town data.');
      for (const record of records) {
        const previous = await read(STORE, record.id), copies = await allCopies(record.id);
        await installRecord(record, previous, copies);
        await onInstallStep('replacement-written', record.id);
        await deleteCopies(copies.map(copy => copy.id));
        await onInstallStep('copies-removed', record.id);
        if (!retainRecovery) await this.finishInstallRecovery(record.id);
      }
    },
    async finishInstallRecovery(id) {
        const recoveryId = '@recovery:' + id;
        if (memoryOnly) memoryCopies.delete(recoveryId);
        else {
          const db = await open();
          await new Promise((resolve, reject) => {
            const tx = db.transaction(COPIES, 'readwrite');
            tx.objectStore(COPIES).delete(recoveryId);
            tx.oncomplete = resolve;
            tx.onabort = tx.onerror = () => reject(tx.error ?? new Error('Town recovery record could not be cleared.'));
          });
        }
    },
  });
}

function valid(record) {
  return object(record) && object(record.town) && typeof record.town.id === 'string' &&
    Array.isArray(record.town.mayors) && record.town.id.length > 0;
}

export function readTownPointer(storage = globalThis.localStorage) {
  const raw = storage?.getItem(TOWN_POINTER_KEY);
  if (raw === null || raw === undefined) return [];
  try {
    const pointer = JSON.parse(raw);
    if (pointer?.version !== 1 || !Array.isArray(pointer.ids) || pointer.ids.some(id => typeof id !== 'string')) return [];
    return [...new Set(pointer.ids)];
  } catch { return []; }
}

let saveQueue = Promise.resolve();
export function withTownSaveLock(work) {
  const run = () => globalThis.navigator?.locks?.request
    ? globalThis.navigator.locks.request('the-duel-town-pointer', work)
    : work();
  const pending = saveQueue.then(run, run);
  saveQueue = pending.catch(() => {});
  return pending;
}

async function saveTownLocked(town, { storage = globalThis.localStorage, store = createTownStore(), reason = 'save' } = {}) {
  if (!object(town) || typeof town.id !== 'string' || !town.id.trim() || !Array.isArray(town.mayors)) {
    throw new Error('A town needs an id and a list of mayors.');
  }
  const save = async () => {
  const priorPointer = storage?.getItem(TOWN_POINTER_KEY) ?? null;
  const ids = new Set(readTownPointer(storage));
  const added = !ids.has(town?.id);
  if (added) {
    ids.add(town.id);
    // Reserve the career link first. If browser storage cannot write it, no town write begins.
    storage?.setItem(TOWN_POINTER_KEY, JSON.stringify({ version: 1, ids: [...ids] }));
  }
  try { return await store.save(town, reason); }
  catch (error) {
    if (added && storage) {
      try { if (priorPointer === null) storage.removeItem(TOWN_POINTER_KEY); else storage.setItem(TOWN_POINTER_KEY, priorPointer); }
      catch (rollbackError) {
        throw new Error('Town save failed and its career link could not be restored. The previous town save remains available. ' + rollbackError.message, { cause: error });
      }
    }
    throw error;
  }
  };
  return save();
}

export function saveTown(town, options = {}) { return withTownSaveLock(() => saveTownLocked(town, options)); }

export async function backupTownFile(id, { store = createTownStore(), picker = globalThis.showSaveFilePicker } = {}) {
  const text = await store.exportTown(id);
  if (typeof picker === 'function') {
    const handle = await picker({ suggestedName: 'town-' + id + '.json', types: [{ description: 'Town save', accept: { 'application/json': ['.json'] } }] });
    const writer = await handle.createWritable(); await writer.write(text); await writer.close();
    return 'The town backup was saved.';
  }
  const blob = new Blob([text], { type: 'application/json' });
  if (globalThis.document?.createElement && globalThis.URL?.createObjectURL) {
    const link = document.createElement('a'); link.href = URL.createObjectURL(blob);
    link.download = 'town-' + id + '.json'; link.click(); URL.revokeObjectURL(link.href);
  }
  return blob;
}
