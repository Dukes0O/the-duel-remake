import {TOWN_SAVE_VERSION, migrateTownData} from './town-migrate.js';
import {townCalendarAt} from './town-calendar.js';
import {TOWN_REGIONS} from './town-world-data.js';

export function createTownRegions() {
  return Object.fromEntries([...TOWN_REGIONS.keys()].map(id=>[id,{chunks:{}}]));
}
function encodeTownValue(_key,value) { return typeof value==='bigint'?{$townBigInt:String(value)}:value; }
function decodeTownValue(_key,value) {
  return value&&typeof value==='object'&&Object.keys(value).length===1&&typeof value.$townBigInt==='string'?BigInt(value.$townBigInt):value;
}

export function createTown(seed, name, founders=[]) {
  if (!Number.isSafeInteger(seed)) throw new TypeError('The town needs a whole-number seed.');
  if (typeof name !== 'string' || !name.trim()) throw new TypeError('Give the town a name.');
  if (!Array.isArray(founders)) throw new TypeError('The founders must be a list.');
  const normalizedSeed = seed >>> 0 || 1;
  return {
    version:TOWN_SAVE_VERSION, id:`town-${normalizedSeed}`, name:name.trim(), seed:normalizedSeed,
    rngState:normalizedSeed, tick:0n, calendar:townCalendarAt(0),
    founders:JSON.parse(JSON.stringify(founders)), people:[], buildings:[], nextBuildingNumber:1,
    regions:createTownRegions(),
  };
}

export function serializeTown(town) {
  if (!town || typeof town !== 'object' || !Number.isSafeInteger(town.version)) throw new TypeError('This town cannot be saved.');
  return JSON.stringify(town,encodeTownValue);
}

export function deserializeTown(serialized) {
  let source;
  try { source = typeof serialized === 'string' ? JSON.parse(serialized,decodeTownValue) : JSON.parse(JSON.stringify(serialized,encodeTownValue),decodeTownValue); }
  catch { throw new TypeError('This town save is not readable.'); }
  if (!source || typeof source !== 'object' || Array.isArray(source)) throw new TypeError('This town save is not readable.');
  // Parsing the string already creates a private object, so migrations can
  // update it directly without a second full copy of a large town.
  const town = migrateTownData(source,{clone:false});
  if (typeof town.name !== 'string' || !town.name || !(typeof town.tick==='bigint'&&town.tick>=0n) && (!Number.isSafeInteger(town.tick) || town.tick < 0))
    throw new TypeError('This town save is missing its name or date.');
  town.tick=BigInt(town.tick);
  town.calendar = townCalendarAt(town.tick);
  return town;
}
