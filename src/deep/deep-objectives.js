// DEEP-EXPLORER: Ana's checklist reads the save, never pays or changes it.
import {normalizeDeep} from './deep-discovery.js';
import {DEEP_LOG_PAGES} from './deep-log.js';
import {SIRENA_FINDS} from './deep-sirena.js';
// FINISH-DEEP (Claude, 3 November 2026): each lifted piece with its name and where it lies
// (THE_DEEP 6.2), so the list can say where the parts still down there are.
export const SIRENA_PARTS = Object.freeze({
  'sirena-steering-wheel': {name: 'Steering wheel', at: 'in the Kelp Forest'},
  'sirena-wheel': {name: 'Front wheel', at: 'in the Kelp Forest'},
  'sirena-bonnet': {name: 'Bonnet', at: 'at the forest’s edge'},
  'sirena-door': {name: 'Door', at: 'on the Drop-off lip'},
  'sirena-car': {name: 'The Sirena', at: 'below the Drop-off lip'},
});
const words = list => list.length < 2 ? list.join('') : `${list.slice(0, -1).join(', ')} and ${list.at(-1)}`;
export function deepObjectives(save, percent = 0, restored = false) {
  const deep = normalizeDeep(save), raised = deep.raised || [], page = DEEP_LOG_PAGES[0];
  const count = (ids, list) => ids.filter(id => (list || []).includes(id)).length;
  const parts = count(SIRENA_FINDS.filter(id => id !== 'sirena-car'), raised);
  const life = count(page.creatures, deep.logged), pearls = count(page.pearls, deep.pearls);
  // The parts still down there, grouped by place: "steering wheel and front wheel in the Kelp Forest".
  const places = new Map();
  for (const id of Object.keys(SIRENA_PARTS)) if (id !== 'sirena-car' && !raised.includes(id))
    places.set(SIRENA_PARTS[id].at, [...(places.get(SIRENA_PARTS[id].at) || []), SIRENA_PARTS[id].name.toLowerCase()]);
  const left = [...places].map(([at, names]) => `${words(names)} ${at}`).join('; ');
  const row = (id, text, done, hint, tick) => ({id, text, done, hint, tick});
  return [
    row('badge', 'Find the Falcone badge', raised.includes('sirena-badge'),
      'Stop beside the glint near the ramp. The badge unlocks sonar.', 'Badge found'),
    row('parts', `Raise the Sirena’s parts: ${parts} of 5`, parts === 5,
      raised.includes('sirena-badge')
        ? `Still down there: ${left}. Press R to ping, stop beside a part, press F.`
        : 'Find the badge first: it gives you the sonar.', 'Five parts raised'),
    row('sirena', 'Raise the Sirena herself', raised.includes('sirena-car'),
      parts < 5 ? 'Raise all five parts first.' : 'Ping near the Drop-off. The Sirena needs four lift bags.', 'Sirena raised'),
    row('life', `Log the sea life: ${life} of 7`, life === 7,
      'Drive slowly and close to each creature for one second.', 'Sea-life log complete'),
    row('pearls', `Find the pearls: ${pearls} of 3`, pearls === 3,
      'Look for glints near the reef rocks. Drive close and slowly.', 'All pearls found'),
    row('chart', `Chart the Kelp Coast: ${percent}%`, percent === 100,
      'Explore the dark areas. Your chart reaches 25 m around your path.', 'Kelp Coast charted'),
    row('cup', 'Race the Coast Cup', deep.coastCup === true,
      restored ? 'Finish a Pacific Canyon race in the Sirena.'
        : raised.includes('sirena-car') ? 'Surface with U, then restore her at the Lab.' : 'Raise the Sirena, then restore her at the Lab.',
      'Coast Cup finished'),
  ];
}
// FINISH-DEEP: the one thing to do next, shown even with the map folded away. The story
// comes first (badge, parts, the Sirena, the Coast Cup), then the log, the pearls and the chart.
export function deepNextStep(rows) {
  const order = ['badge', 'parts', 'sirena', 'cup', 'life', 'pearls', 'chart'];
  const next = order.map(id => rows.find(row => row.id === id)).find(row => row && !row.done);
  return next ? {text: next.text, hint: next.hint}
    : {text: 'Ana’s list is done', hint: 'Drive where you like. The turtles are not going anywhere.'};
}
