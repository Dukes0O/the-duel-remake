import records from './generated/reference-laps.json' with {type: 'json'};

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
