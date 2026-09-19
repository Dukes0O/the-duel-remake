import { SHORTCUT_PRESET_DATA } from './generated-shortcut-presets.js';

// Bump when changing shortcut search/scoring, interpolation, terrain sampling,
// or constants used by the solver. The generator's optional --check also
// checks source hashes and every freshly solved path, without slowing normal
// gameplay or requiring a filesystem/network API in the browser.
export const SHORTCUT_GENERATION_VERSION = 2;
export function cloneShortcuts(cuts){return cuts.map(cut=>({...cut,offsets:[...cut.offsets]}));}

// Two independent 32-bit accumulators keep the numeric-route digest compact.
// The full event definition and seed remain in the key, rather than relying on
// event names; changed geometry or tunnels also invalidate a saved solution.
function digest(text){let a=2166136261,b=0x9e3779b9;
  for(let i=0;i<text.length;i++){const c=text.charCodeAt(i);a=Math.imul(a^c,16777619);b=Math.imul(b^c,2246822519);b^=b>>>13;}
  return(a>>>0).toString(16).padStart(8,'0')+(b>>>0).toString(16).padStart(8,'0');}
export function shortcutPresetFingerprint(course){
  const geometry=JSON.stringify(course.samples.map(p=>[p.s,p.x,p.y,p.z,p.heading,p.curvature]));
  return[SHORTCUT_GENERATION_VERSION,course.seed,JSON.stringify(course.def),digest(geometry),JSON.stringify(course.features.tunnels)].join('|');
}
const presets=new Map(SHORTCUT_PRESET_DATA.version===SHORTCUT_GENERATION_VERSION?SHORTCUT_PRESET_DATA.entries.map(entry=>[entry.fingerprint,entry.shortcuts]):[]);
export function findShortcutPreset(fingerprint){const cuts=presets.get(fingerprint);return cuts?cloneShortcuts(cuts):null;}
