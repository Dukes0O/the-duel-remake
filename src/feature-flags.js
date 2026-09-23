// Each new player feature starts here. Release Manager changes dev -> beta -> on
// only after the checks and play-test rules in SPEC.md section 4.4 are met.
export const FEATURE_STATES = Object.freeze({ 'career-backup': 'dev', 'roadside-destruction': 'beta' });
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
