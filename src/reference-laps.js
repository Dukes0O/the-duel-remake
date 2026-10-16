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

export const REFERENCE_POSE_LIMIT = 1800;
// Pose data is optional. Old bundled references stay useful without a ghost.
export function validReferencePoses(reference, context) {
  if (!reference || !context || reference.eventId !== context.eventId ||
      reference.route !== context.route || reference.courseFingerprint !== context.courseFingerprint ||
      !Number.isFinite(context.length) || context.length <= 0 ||
      !Number.isSafeInteger(reference.lapMs) || reference.lapMs <= 0) return false;
  const rows = reference.poseSamples;
  if (!Array.isArray(rows) || rows.length < 12 || rows.length > REFERENCE_POSE_LIMIT) return false;
  const finish = Math.round(context.length * 100);
  if (rows[0]?.[0] !== 0 || rows[0]?.[1] !== 0 ||
      rows.at(-1)?.[0] !== reference.lapMs || rows.at(-1)?.[1] !== finish) return false;
  return rows.every((row,index) => Array.isArray(row) && [7,11].includes(row.length) && row.every(Number.isSafeInteger) &&
    row[0] >= 0 && row[0] <= reference.lapMs && row[1] >= 0 && row[1] <= finish &&
    row[4] >= 0 && row[5] >= 0 && row[6] === 0 &&
    (row.length === 7 || row[10] >= 0 && row[10] <= 15) &&
    (!index || row[0] > rows[index-1][0] && row[1] >= rows[index-1][1]));
}
