import {CARS} from './config.js';

// History retains sixty settlements. This is an evidenced lower bound, not a
// reconstructed lifetime total. A valid saved counter always takes precedence.
export function normalizeGateDiscovery(value, history = []) {
  const source = value && typeof value === 'object' ? value : {};
  const keys = new Set();
  if (!Number.isSafeInteger(source.pacificFinishes)) {
    for (const row of (Array.isArray(history) ? history : []).slice(-60)) {
      if (row?.eventId === 'pacific-canyon' && row.completed === true &&
          row.abandoned !== true && row.timeout !== true && typeof row.won === 'boolean' &&
          Number.isFinite(row.timeSec) && row.timeSec > 0 && Number.isFinite(row.reward) &&
          Object.hasOwn(CARS, row.car) && typeof row.key === 'string' &&
          row.key.length > 0 && row.key.length <= 180) keys.add(row.key);
    }
  }
  return {discoveredGate: source.discoveredGate === true,
    pacificFinishes: Math.max(0, Math.min(10,
      Number.isSafeInteger(source.pacificFinishes) ? source.pacificFinishes : keys.size))};
}

export function hiddenRoadDiscoverySnapshot(profile, playerId, enabled) {
  const data = profile?.wasteland?.version === 1
    ? normalizeGateDiscovery(profile.wasteland) : {discoveredGate: false, pacificFinishes: 0};
  return Object.freeze({playerId, enabled: enabled === true, ...data});
}
