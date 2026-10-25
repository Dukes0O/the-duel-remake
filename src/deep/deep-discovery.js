// Optional additive progress: loading a profile never creates Deep fields.
// `raised` (the Sirena's finds) and `sonar`, `coastCup` are DEEP-SIRENA's story fields: optional, never added to a save that lacks them.
const fields = ['found', 'places', 'logged', 'pearls', 'hintsShown', 'raised'];
const idList = value => [...new Set((Array.isArray(value) ? value : [])
  .filter(id => typeof id === 'string' && /^[a-z0-9][a-z0-9-]{0,79}$/.test(id)))].slice(0, 128);
export function normalizeDeep(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
  const deep = {...value};
  for (const field of fields) if (Object.hasOwn(value, field)) deep[field] = idList(value[field]);
  if (Object.hasOwn(value, 'kit')) deep.kit = value.kit === true;
  if (Object.hasOwn(value, 'sonar')) deep.sonar = value.sonar === true;
  if (Object.hasOwn(value, 'coastCup')) deep.coastCup = value.coastCup === true;
  if (Object.hasOwn(value, 'pacificFinishes')) deep.pacificFinishes =
    Number.isSafeInteger(value.pacificFinishes) ? Math.max(0, Math.min(10, value.pacificFinishes)) : 0;
  return deep;
}
export function deepDiscoverySnapshot(profile, playerId, enabled) {
  return Object.freeze({...normalizeDeep(profile?.deep), playerId, enabled: enabled === true});
}
// Called only after the ordinary settlement accepted a complete race once.
export function countDeepFinish(profile, {enabled = false, eventId, mode} = {}) {
  if (enabled !== true || eventId !== 'pacific-canyon' || !['duel', 'timetrial'].includes(mode)) return profile;
  const deep = normalizeDeep(profile.deep), count = deep.pacificFinishes || 0;
  if (count >= 10) return profile;
  return {...profile, deep: {...deep, pacificFinishes: count + 1}};
}
// World owners pass only their authored ids. Sets make repeat visits harmless.
export function rememberDeep(profile, field, id, {enabled = false} = {}) {
  if (enabled !== true || !['found', 'places', 'logged', 'pearls'].includes(field) || idList([id]).length !== 1) return profile;
  const deep = normalizeDeep(profile.deep), list = deep[field] || [];
  if (list.includes(id) || list.length >= 128) return profile;
  return {...profile, deep: {...deep, [field]: [...list, id]}};
}
