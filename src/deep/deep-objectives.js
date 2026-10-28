// DEEP-EXPLORER: Ana's checklist reads the save, never pays or changes it.
import {normalizeDeep} from './deep-discovery.js';
import {DEEP_LOG_PAGES} from './deep-log.js';
import {SIRENA_FINDS} from './deep-sirena.js';
export function deepObjectives(save, percent = 0, restored = false) {
  const deep = normalizeDeep(save), raised = deep.raised || [], page = DEEP_LOG_PAGES[0];
  const count = (ids, list) => ids.filter(id => (list || []).includes(id)).length;
  const parts = count(SIRENA_FINDS.filter(id => id !== 'sirena-car'), raised);
  const life = count(page.creatures, deep.logged), pearls = count(page.pearls, deep.pearls);
  const row = (id, text, done, hint, tick) => ({id, text, done, hint, tick});
  return [
    row('badge', 'Find the Falcone badge', raised.includes('sirena-badge'),
      'Stop beside the glint near the ramp. The badge unlocks sonar.', 'Badge found'),
    row('parts', `Raise the Sirena’s parts: ${parts} of 5`, parts === 5,
      'R pings the sonar. Stop beside a part and press F.', 'Five parts raised'),
    row('sirena', 'Raise the Sirena herself', raised.includes('sirena-car'),
      parts < 5 ? 'Raise all five parts first.' : 'Ping near the Drop-off. The Sirena needs four lift bags.', 'Sirena raised'),
    row('life', `Log the sea life: ${life} of 7`, life === 7,
      'Drive slowly and close to each creature for one second.', 'Sea-life log complete'),
    row('pearls', `Find the pearls: ${pearls} of 3`, pearls === 3,
      'Look for glints near the reef rocks. Drive close and slowly.', 'All pearls found'),
    row('chart', `Chart the Kelp Coast: ${percent}%`, percent === 100,
      'Explore the dark areas. Your chart reaches 25 m around your path.', 'Kelp Coast charted'),
    row('cup', 'Race the Coast Cup', deep.coastCup === true,
      restored ? 'Finish a Pacific Canyon race in the Sirena.' : 'Raise the Sirena, then restore her at the Lab.', 'Coast Cup finished'),
  ];
}
