import {createProfile, normalizeProfile} from '../src/progression.js';
import {BUILT_WARLORD_IDS, WARLORDS} from '../src/warlords.js';

export function seedPreviewProfile(profile = createProfile()) {
  const original = normalizeProfile(profile);
  // Every built territory warlord's fight is open from the yard in the Preview (Magnus needs the Baron beaten).
  const full = Object.fromEntries(BUILT_WARLORD_IDS.filter(id => WARLORDS[id].territoryId).map(id =>
    [id, {...original.wasteland.territories[id], hold: 100}]));
  return normalizeProfile({
    ...original,
    unlockedCars: [...new Set([...original.unlockedCars, 'titan_monster'])],
    wasteland: {
      ...original.wasteland,
      discoveredGate: true,
      territories: {
        ...original.wasteland.territories,
        ...full,
      },
    },
  });
}
