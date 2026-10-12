async function recordsFromFiles() {
  let files;
  if (import.meta.env) {
    files = Object.values(import.meta.glob('./generated/reference-laps/*.json', {eager: true, import: 'default'}));
  } else {
    const {readdir, readFile} = await import(/* @vite-ignore */ 'node:fs/promises');
    const directory = new URL(/* @vite-ignore */ './generated/reference-laps/', import.meta.url);
    const names = (await readdir(directory)).filter(name => /^[a-z][a-z0-9-]*\.json$/.test(name)).sort();
    files = await Promise.all(names.map(async name => JSON.parse(await readFile(new URL(name, directory), 'utf8'))));
  }
  const records = {};
  for (const file of files) for (const [key, record] of Object.entries(file)) {
    if (Object.hasOwn(records, key)) throw Error('Duplicate bundled reference lap: ' + key);
    records[key] = record;
  }
  return records;
}
const records = await recordsFromFiles();

function freeze(value) {
  if (value && typeof value === 'object' && !Object.isFrozen(value)) {
    for (const child of Object.values(value)) freeze(child);
    Object.freeze(value);
  }
  return value;
}

// Bundled build data: no runtime generation, storage access or network fetch.
export const REFERENCE_LAPS = freeze(records);
export const referenceKey = (eventId, route = 'fixed') => `${eventId}|${route}`;
export function referenceLap(eventId, route = 'fixed') {
  const key = referenceKey(eventId, route);
  return Object.hasOwn(REFERENCE_LAPS, key) ? REFERENCE_LAPS[key] : null;
}
