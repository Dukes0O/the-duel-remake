// WEAPON-WATER-CANNON: what a town gives the player's car: town gear in the Armory (src/weapon-upgrades.js), offered once the
// player's own town has finished the building it comes from (the water cannon: a Fire Station). This file only reads a
// town: it never writes one, and it never writes the career. Pure apart from the one read of the town store.
import {createTownStore, readTownPointer} from './town-store.js';

/** The ids of the buildings a town has finished, each once. */
export function finishedTownBuildings(town) {
  return [...new Set((Array.isArray(town?.buildings) ? town.buildings : [])
    .filter(building => building?.state === 'finished' && typeof building.buildingId === 'string')
    .map(building => building.buildingId))];
}

/** The player's own town (the one whose mayors include them) among the saved town records, or null. */
export function ownTownRecord(records, playerId) {
  if (!playerId) return null;
  return (records ?? []).find(record => record && !/^town-\d+$/.test(record.id) &&
    Array.isArray(record.town?.mayors) && record.town.mayors.includes(playerId)) ?? null;
}

/** Reads the finished buildings of the player's own town. Pass `memoryOnly: true` in tests and QA: no browser database. */
export async function readOwnTownBuildings({playerId, memoryOnly = false, store = createTownStore({memoryOnly}),
  pointers = readTownPointer()} = {}) {
  try {
    return finishedTownBuildings(ownTownRecord(await store.towns(pointers), playerId)?.town);
  } catch {
    return [];
  }
}
