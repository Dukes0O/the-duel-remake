// Claude's finishing cards register existing-circuit intel here, one file per event. The reverse variants are
// listed too, because they carry no inline intel; the dusk and night variants inherit their parent's inline
// intel. Until a circuit has authored entries, the shared analysis supplies its real data. The newer scripted circuits carry their own
// `intel` block in src/circuits/ instead.
import {ALPINE_SERPENT_INTEL} from './alpine-serpent.js';
import {AZURE_RIVIERA_INTEL} from './azure-riviera.js';
import {CLOUDBREAK_SKYWAY_INTEL} from './cloudbreak-skyway.js';
import {EIFEL_CROWN_INTEL} from './eifel-crown.js';
import {HARBOR_HIGHLANDS_INTEL} from './harbor-highlands.js';
import {HARBOUR_LIGHTS_REVERSE_INTEL} from './harbour-lights-reverse.js';
import {HIGH_COUNTRY_INTEL} from './high-country.js';
import {MIDNIGHT_CHASE_INTEL} from './midnight-chase.js';
import {NEON_DOCKS_INTEL} from './neon-docks.js';
import {NEON_DRIFT_TRIAL_INTEL} from './neon-drift-trial.js';
import {PACIFIC_CANYON_INTEL} from './pacific-canyon.js';
import {PANORAMA_RIDGE_REVERSE_INTEL} from './panorama-ridge-reverse.js';
import {RED_MESA_INTEL} from './red-mesa.js';
import {RIDGE_RALLY_INTEL} from './ridge-rally.js';
import {TIMBERLINE_RUSH_INTEL} from './timberline-rush.js';
import {TITAN_ARENA_INTEL} from './titan-arena.js';
import {TITAN_FREESTYLE_INTEL} from './titan-freestyle.js';
import {TITAN_STUNT_TRIAL_INTEL} from './titan-stunt-trial.js';
import {TREMBLANT_WOODS_REVERSE_INTEL} from './tremblant-woods-reverse.js';

const entries = Object.freeze({
  'alpine-serpent': ALPINE_SERPENT_INTEL,
  'azure-riviera': AZURE_RIVIERA_INTEL,
  'cloudbreak-skyway': CLOUDBREAK_SKYWAY_INTEL,
  'eifel-crown': EIFEL_CROWN_INTEL,
  'harbor-highlands': HARBOR_HIGHLANDS_INTEL,
  'harbour-lights-reverse': HARBOUR_LIGHTS_REVERSE_INTEL,
  'high-country': HIGH_COUNTRY_INTEL,
  'midnight-chase': MIDNIGHT_CHASE_INTEL,
  'neon-docks': NEON_DOCKS_INTEL,
  'neon-drift-trial': NEON_DRIFT_TRIAL_INTEL,
  'pacific-canyon': PACIFIC_CANYON_INTEL,
  'panorama-ridge-reverse': PANORAMA_RIDGE_REVERSE_INTEL,
  'red-mesa': RED_MESA_INTEL,
  'ridge-rally': RIDGE_RALLY_INTEL,
  'timberline-rush': TIMBERLINE_RUSH_INTEL,
  'titan-arena': TITAN_ARENA_INTEL,
  'titan-freestyle': TITAN_FREESTYLE_INTEL,
  'titan-stunt-trial': TITAN_STUNT_TRIAL_INTEL,
  'tremblant-woods-reverse': TREMBLANT_WOODS_REVERSE_INTEL,
});

export function circuitIntel(eventId) {
  return entries[eventId] ?? null;
}
