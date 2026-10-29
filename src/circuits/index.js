// Authored files register themselves in stable release order.
import {featureFlags} from '../feature-flags.js';
import {circuitDefinitions, CIRCUIT_ENTRIES} from '../circuit-manifests.js';

export const ALL_CIRCUITS = circuitDefinitions();
export const circuitsEnabled = flags => circuitDefinitions(flags);
export const CIRCUITS = circuitsEnabled(featureFlags);

// A slotted circuit replaces the same id in the base list only while enabled.
// Appended circuits retain their release order and their saved positions.
export function applyCircuits(base, flags = featureFlags, entries = CIRCUIT_ENTRIES) {
  const courses = [...base];
  for (const {manifest, definition} of entries) {
    if (!flags.enabled(manifest.flag)) continue;
    if (manifest.slot === undefined) courses.push(definition);
    else {
      if (base[manifest.slot]?.id !== manifest.id)
        throw Error('Circuit slot must replace the same course id.');
      courses[manifest.slot] = definition;
    }
  }
  return courses;
}
