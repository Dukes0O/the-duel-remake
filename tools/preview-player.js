import {createProfile, normalizeProfile} from '../src/progression.js';

export function seedPreviewProfile(profile = createProfile()) {
  const original = normalizeProfile(profile);
  const sal = original.wasteland.territories.sal;
  return normalizeProfile({
    ...original,
    unlockedCars: [...new Set([...original.unlockedCars, 'titan_monster'])],
    wasteland: {
      ...original.wasteland,
      discoveredGate: true,
      territories: {
        ...original.wasteland.territories,
        sal: {...sal, hold: 100},
      },
    },
  });
}
