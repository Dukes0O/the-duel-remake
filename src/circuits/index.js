// Registry of authored circuits (docs/CIRCUITS.md section 2, principle 6).
// Each circuit lives in its own file src/circuits/<id>.js and is registered
// with one line here. config.js appends the list to COURSE, so shared course,
// race and render files never name a circuit.
//
// A circuit is on COURSE only while its switch is on (all start as 'dev': the
// Preview turns them on with ?flags=). Where no switch is on, as in the tests,
// COURSE is exactly what it was, and a circuit's own test imports its file.
import { featureFlags } from '../feature-flags.js';
import { SUMMIT_RUN } from './summit-run.js';
import { PANORAMA_RIDGE } from './panorama-ridge.js';
import { HARBOUR_LIGHTS } from './harbour-lights.js';
import { TREMBLANT_WOODS } from './tremblant-woods.js';

export const ALL_CIRCUITS = Object.freeze([PANORAMA_RIDGE, HARBOUR_LIGHTS, TREMBLANT_WOODS, SUMMIT_RUN]);
export const circuitsEnabled = flags => Object.freeze(ALL_CIRCUITS.filter(circuit => flags.enabled(circuit.flag)));
export const CIRCUITS = circuitsEnabled(featureFlags);
