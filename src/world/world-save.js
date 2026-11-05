// Optional Wasteland discovery progress. Loading is read only; found places
// and finds are stored as one additive list that never shrinks.
const object = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const ids = value => [...new Set((Array.isArray(value) ? value : [])
  .filter(id => typeof id === 'string' && /^[a-z0-9][a-z0-9-]{0,79}$/.test(id)))];

export function normalizeWorld(value) {
  if (!object(value)) return {};
  const world = {...value};
  if (Object.hasOwn(value, 'found')) world.found = ids(value.found);
  return world;
}

export const worldOf = profile => normalizeWorld(profile?.world);

export function rememberWorldFound(profile, id) {
  if (!object(profile) || ids([id]).length !== 1) return profile;
  const world = worldOf(profile), found = world.found ?? [];
  if (found.includes(id)) return profile;
  return {...profile, world: {...world, found: [...found, id]}};
}
