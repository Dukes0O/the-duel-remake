// Claude's finishing cards register existing-circuit intel here. Until a
// circuit has authored entries, the shared analysis supplies its real data.
const entries = Object.freeze({});

export function circuitIntel(eventId) {
  return entries[eventId] ?? null;
}
