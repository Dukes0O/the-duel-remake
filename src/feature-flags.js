import {CIRCUIT_MANIFESTS} from './circuit-manifests.js';

// Each new player feature starts here. Release Manager changes dev -> beta -> on
// only after the checks and play-test rules in SPEC.md section 4.4 are met.
export const FEATURE_STATES = Object.freeze({
  'seeker-rockets': 'on',
  'convoy-raid': 'on',
  tollkeeper: 'on',
  blackiron: 'on',
  'warlord-cards': 'on',
  'arsenal-wave3': 'on',
  'career-backup': 'dev', 'hidden-road': 'on',
  'fuel-run': 'on', 'bounty-hunt': 'on', arsenal: 'on', 'salt-flats': 'on',
  'crew-gear': 'on', 'fight-voices': 'on', 'cpu-crews': 'on', 'ambush-alley': 'on', gunn: 'on',
  // Phase 4 (docs/CIRCUITS.md): racing a full field in a Grand Prix.
  'tyre-slip': 'dev',
  'driving-lessons': 'dev',
  'lap-choice': 'on', 'snowmen': 'on', yeti: 'on', 'rival-voices': 'dev',
  'grand-prix': 'on', 'cpu-racecraft': 'dev', 'grand-prix-career': 'dev', 'snow-world': 'dev',
  // Phase 4 circuits (docs/CIRCUITS.md): road layouts only until Codex finishes each.
  ...Object.fromEntries(CIRCUIT_MANIFESTS.map(manifest => [manifest.flag, manifest.state])),
  // The Deep (docs/THE_DEEP.md): the hidden underwater world. Off; nothing reaches it yet.
  'the-deep': 'dev',
  // The helicopter (docs/HELICOPTER.md): Kestrel One, H1 First flight. Released 14 October 2026.
  helicopter: 'on',
  // H2 Fire (docs/HELI_FIRE.md): forest fires, the bucket and burnt courses. Works only with the helicopter on.
  // Released 15 October 2026.
  'forest-fire': 'on',
  // Earned cars and medal sheets (docs/EARNED_CARS.md). Off in the game.
  'earned-cars': 'dev',
  // H4 Rescue (docs/HELI_RESCUE.md): rescues in the mission engine. Off in the game; works only with the helicopter on.
  rescue: 'dev',
  // H3 Wildlife (docs/HELI_WILDLIFE.md): animals beside the road, and the wildlife count when the helicopter is on. Off in the game.
  wildlife: 'dev',
  // H3 Skins (docs/HELI_WILDLIFE.md): mission skins, gear, dirt and the wash. Off in the game; works only with the helicopter on.
  // Named heli-skins, not heliSkins as the packet says: switch names are lower case with hyphens.
  'heli-skins': 'dev',
  // H5 Heli-skiing (docs/HELI_SKIING.md): the ski rules, runs and drops. Off in the game; works only with the helicopter on and Summit Run owned.
  'heli-skiing': 'dev',
  // The Lab (docs/LAB.md): lessons, upgrades and their save field. Off in the game.
  lab: 'dev',
  // Lab tuning (docs/LAB.md 5): the Tune page and its physics, a separate switch so the race feel is judged alone.
  'lab-tuning': 'dev',
});
export const EXPERIMENTAL_KEY = 'duel_experimental_v1';

const states = new Set(['dev', 'beta', 'on']);
const validName = name => /^[a-z][a-z0-9-]*$/.test(name);
const browserStorage = () => {
  try { return globalThis.localStorage ?? null; } catch { return null; }
};
const browserSearch = () => {
  try { return globalThis.location?.search ?? ''; } catch { return ''; }
};
const qaBuild = () => Boolean(import.meta.env?.DEV ||
  (typeof __DUEL_QA__ !== 'undefined' && __DUEL_QA__));

export function createFeatureFlags({
  catalog = FEATURE_STATES,
  storage = browserStorage(),
  search = browserSearch(),
  qa = qaBuild(),
  overrides = {},
} = {}) {
  for (const [name, state] of Object.entries(catalog)) {
    if (!validName(name) || !states.has(state)) throw new Error(`Invalid feature switch: ${name}`);
  }
  const names = Object.keys(catalog);
  const requested = new Set();
  if (qa) {
    for (const value of new URLSearchParams(search).getAll('flags')) {
      for (const name of value.split(',')) if (Object.hasOwn(catalog, name.trim())) requested.add(name.trim());
    }
  }
  let experimental = false,initialized=false;
  function readExperimental(){
    if(!initialized){initialized=true;try { experimental = storage?.getItem(EXPERIMENTAL_KEY) === 'true'; } catch {}}
    return experimental;
  }

  return {
    state(name) { return Object.hasOwn(catalog, name) ? catalog[name] : null; },
    enabled(name) {
      if (!Object.hasOwn(catalog, name)) return false;
      if (Object.hasOwn(overrides, name)) return overrides[name] === true;
      const state = catalog[name];
      if (state === 'on') return true;
      if (state === 'beta') return readExperimental() || qa && requested.has(name);
      return qa && requested.has(name);
    },
    experimental() { return readExperimental(); },
    setExperimental(enabled) {
      initialized=true;experimental = enabled === true;
      let saved = false;
      try { storage?.setItem(EXPERIMENTAL_KEY, String(experimental)); saved = !!storage; } catch {}
      return { enabled: experimental, saved };
    },
    betaFeatures() { return names.filter(name => catalog[name] === 'beta'); },
  };
}

// The singleton follows the storage facade installed after migration.
export const featureFlags = createFeatureFlags({storage:{
  getItem:key=>browserStorage()?.getItem(key),
  setItem:(key,value)=>browserStorage()?.setItem(key,value),
}});
