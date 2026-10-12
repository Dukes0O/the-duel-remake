// Authored files register themselves in stable release order.
import {featureFlags} from '../feature-flags.js';
import {circuitDefinitions} from '../circuit-manifests.js';

export const ALL_CIRCUITS = circuitDefinitions();
export const circuitsEnabled = flags => circuitDefinitions(flags);
export const CIRCUITS = circuitsEnabled(featureFlags);
