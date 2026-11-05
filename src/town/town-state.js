import {TOWN_SAVE_VERSION, migrateTownData} from './town-migrate.js';
import {townCalendarAt} from './town-calendar.js';

export function createTown(seed, name, founders=[]) {
  if (!Number.isSafeInteger(seed)) throw new TypeError('The town needs a whole-number seed.');
  if (typeof name !== 'string' || !name.trim()) throw new TypeError('Give the town a name.');
  if (!Array.isArray(founders)) throw new TypeError('The founders must be a list.');
  const normalizedSeed = seed >>> 0 || 1;
  return {
    version:TOWN_SAVE_VERSION, id:`town-${normalizedSeed}`, name:name.trim(), seed:normalizedSeed,
    rngState:normalizedSeed, tick:0, calendar:townCalendarAt(0),
    founders:JSON.parse(JSON.stringify(founders)), people:[], buildings:[], nextBuildingNumber:1,
    regions:{scablands:{chunks:{}}},
  };
}

export function serializeTown(town) {
  if (!town || typeof town !== 'object' || !Number.isSafeInteger(town.version)) throw new TypeError('This town cannot be saved.');
  return JSON.stringify(town);
}

export function deserializeTown(serialized) {
  let source;
  try { source = typeof serialized === 'string' ? JSON.parse(serialized) : JSON.parse(JSON.stringify(serialized)); }
  catch { throw new TypeError('This town save is not readable.'); }
  if (!source || typeof source !== 'object' || Array.isArray(source)) throw new TypeError('This town save is not readable.');
  // Parsing the string already creates a private object, so migrations can
  // update it directly without a second full copy of a large town.
  const town = migrateTownData(source,{clone:false});
  if (typeof town.name !== 'string' || !town.name || !Number.isSafeInteger(town.tick) || town.tick < 0)
    throw new TypeError('This town save is missing its name or date.');
  town.calendar = townCalendarAt(town.tick);
  return town;
}
