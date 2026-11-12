import {CIRCUIT_MANIFESTS} from './circuit-manifests.js';

// Each new player feature starts here. Release Manager changes dev -> beta -> on
// only after the checks and play-test rules in SPEC.md section 4.4 are met.
export const FEATURE_STATES = Object.freeze({
  // GEAR-FIND: the yard's Things to try, every weapon listed in the Armory, locked modes shown with their rank (Kyle, 5 November 2026, for Gratian).
  'gear-find': 'on',
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
  // Engines that pull like real ones (docs/DRIVING_LESSONS.md 12.5): the pull follows revs and the gear. Off in the game.
  'engine-curve': 'dev',
  'nissan-skyline': 'on',
  'driving-lessons': 'on',
  'lap-choice': 'on', 'snowmen': 'on', yeti: 'on', 'rival-voices': 'dev',
  'grand-prix': 'on', 'cpu-racecraft': 'on', 'grand-prix-career': 'on', 'snow-world': 'dev',
  // Phase 4 circuits (docs/CIRCUITS.md): road layouts only until Codex finishes each.
  ...Object.fromEntries(CIRCUIT_MANIFESTS.map(manifest => [manifest.flag, manifest.state])),
  // The Deep (docs/THE_DEEP.md): the hidden underwater world. Released 25 October 2026.
  'the-deep': 'on',
  'deep-vasca': 'dev',
  // The helicopter (docs/HELICOPTER.md): Kestrel One, H1 First flight. Released 14 October 2026.
  helicopter: 'on',
  // H2 Fire (docs/HELI_FIRE.md): forest fires, the bucket and burnt courses. Works only with the helicopter on.
  // Released 15 October 2026.
  'forest-fire': 'on',
  // Earned cars and medal sheets (docs/EARNED_CARS.md). Released 3 November 2026.
  'earned-cars': 'on',
  'nissan-skyline': 'on',
  // H4 Rescue (docs/HELI_RESCUE.md): rescues in the mission engine. Released 26 October 2026; works only with the helicopter on.
  rescue: 'on',
  // H3 Wildlife (docs/HELI_WILDLIFE.md): animals beside the road, and the wildlife count when the helicopter is on. Released 3 November 2026.
  wildlife: 'on',
  // H3 Skins (docs/HELI_WILDLIFE.md): mission skins, gear, dirt and the wash. Released 3 November 2026; works only with the helicopter on.
  // Named heli-skins, not heliSkins as the packet says: switch names are lower case with hyphens.
  'heli-skins': 'on',
  // Pilot ranks, flight log and rank paints. Released 26 October 2026.
  'heli-logbook': 'on',
  // H5 Heli-skiing (docs/HELI_SKIING.md): the ski rules, runs and drops. Released 26 October 2026; works only with the helicopter on and Summit Run owned.
  'heli-skiing': 'on',
  // The Lab (docs/LAB.md): lessons, upgrades and their save field. Off in the game.
  lab: 'on',
  'lab-2': 'on',
  // Lab tuning (docs/LAB.md 5): the Tune page and its physics, a separate switch so the race feel is judged alone.
  'lab-tuning': 'on',
  // LAB-CLASSROOM: lessons rebuilt as a classroom with Brian as tutor (the pendulum first). On in the game (Kyle, 31 October 2026: no Preview step).
  'lab-classroom': 'on',
  // The pilot's map (docs/PILOT_MAP.md): the place table, regions, fuel pads and the new cruise legs. Released 28 October 2026; works only with the helicopter on.
  'pilot-map': 'on',
  // MENU-FRONT-DOOR: the main menu as a front door (Drive card, Next up, eight doors). Off in the game until Kyle has tried it.
  'menu-front-door': 'dev',
  // MENU-NEXT-UP: a Next up line under the masthead of the old menu and NEW tags on buttons that already exist. Moves nothing else on the menu. On in the game since 10 November 2026 (rule 18, no Preview step); the front door keeps its own line.
  'menu-next-up': 'on',
  // STORY-KOGANE-SCREENS: the Kogane Invitation story (docs/story/kogane-invitation.md). Off in the game; also needs Kogane Pass and its Night version, the Nissan Skyline, the helicopter, the pilot's map and driving lessons.
  'kogane-invitation': 'on',
  // WATER-FINISH: The Water Road, the Wasteland story (docs/story/wasteland-water-road.md). On in the game (1 November 2026, no Preview step); also needs the Hidden Road, the Scrapdome and the warlord cards.
  'water-road': 'on',
  // MACHINE-HAUL: Wasteland Town systems are built behind this switch, off for players.
  'wasteland-town': 'dev',
  // Everburn story screens and Scablands jobs, still in development.
  'story-everburn': 'dev',
  // RUN-GAS (docs/board/cards/RUN-GAS.md): the gas run on the story wall once Everburn job 6 is won, and the Ash Men's feud. Needs story-everburn.
  'scablands-runs': 'dev',
  // The Wasteland town and its shop finishes are still in development.
  'wasteland-town': 'dev',
  // The Bowl's air control and Show Night are built behind this switch.
  'titan-bowl': 'dev',
  // WARLORD-NINE: Magnus the Magnet, the ninth warlord (docs/SCRAPDOME.md), after Baron Blackiron; chapter 9 of the Water Road. On in the game (2 November 2026, no Preview step).
  'warlord-nine': 'on',
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
