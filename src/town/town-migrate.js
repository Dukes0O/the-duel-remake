export const TOWN_SAVE_VERSION = 1;

// Keep every old step in this list. A town created by the first public build
// starts at version 1; version 0 is reserved for pre-release development data.
export const TOWN_MIGRATIONS = Object.freeze([
  Object.freeze({version:1, migrate(data) {
    if (!Number.isSafeInteger(data.tick) || data.tick < 0) data.tick = 0;
    if (!Number.isSafeInteger(data.rngState)) data.rngState = (data.seed >>> 0) || 1;
    if (!data.regions || typeof data.regions !== 'object') data.regions = {scablands:{chunks:{}}};
    if (!data.regions.scablands) data.regions.scablands = {chunks:{}};
    if (!data.regions.scablands.chunks || typeof data.regions.scablands.chunks !== 'object') data.regions.scablands.chunks = {};
    if (!Array.isArray(data.people)) data.people = [];
    if (!Array.isArray(data.buildings)) data.buildings = [];
    if (!Number.isSafeInteger(data.nextBuildingNumber) || data.nextBuildingNumber < 1) data.nextBuildingNumber = 1;
    data.version = 1;
    return data;
  }}),
]);

export function migrateTownData(input, {clone=true}={}) {
  const data = clone ? JSON.parse(JSON.stringify(input)) : input;
  const version = Number.isSafeInteger(data.version) ? data.version : 0;
  for (const migration of TOWN_MIGRATIONS) if (version < migration.version) migration.migrate(data);
  // Future fields and versions are kept intact. This build cannot know how to
  // change a future version, but it must not erase information it does not know.
  return data;
}
