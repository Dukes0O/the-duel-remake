// Laptop only. Start a memory-only outing at the trail, then drive the authored gully route.
import burned from '../../src/story/threads/content/burned-camp.js';
import {placeForThread} from '../../src/story/scenes/burned-camp.js';
import {RATS_NEST_LAYOUT} from '../../src/world/open/looks/rats-nest-look.js';
import {BURNED_SCOUT, scoutGullyRoute} from '../../src/world/open/content/burned-scout.js';
import {applyEffects} from '../../src/world/open/open-effects.js';
import {sampleWorld} from '../../src/world/open/samples.js';
import {sitePosition} from '../../src/world/open/site-rule.js';
import {pageFunctions as camp} from './open-burned-camp.mjs';

const cast = {camp: 'glasshouse', enemy: 'road-rats'};
const world = applyEffects(sampleWorld('after-the-smoke'), {id: 'qa/followed-tracks', effects: [
  {type: 'mark', id: 'burned-camp/followed-tracks'},
  {type: 'thread', id: 'burned-camp', to: 'scout', cast},
]}).world;

export const pageFunctions = {
  memoryMenu: () => window.__qaApp?.duel.state.status === 'menu' && !!window.__render,
  temporaryPlayerReady: () => [...document.querySelectorAll('details button')].some(button =>
    button.textContent === 'Create temporary player ready for Night 2' && !button.hidden && !button.disabled),
  temporaryPlayer: seed => {
    if (!window.name.startsWith('__duel_qa_tab_v2:') || !Object.getOwnPropertyDescriptor(window, 'localStorage')?.value)
      throw Error('Scouting requires the memory-only QA page.');
    const button = [...document.querySelectorAll('details button')].find(row =>
      row.textContent === 'Create temporary player ready for Night 2');
    if (!button || button.hidden || button.disabled) throw Error('The temporary player button is unavailable.');
    button.click();
    window.__qaApp.seed = seed;
  },
  actionReady: action => {
    const button = document.querySelector('[data-action="' + action + '"]');
    return !!button?.getClientRects().length && !button.disabled;
  },
  click: action => document.querySelector('[data-action="' + action + '"]').click(),
  roamReady: () => window.__qaApp?.visualReady && window.__qaApp.duel.state.status === 'racing' &&
    window.__qaApp.duel.state.arena?.worldJob?.definition.id === 'open-roam',
  loadWorld: world => { window.__qaApp.duel.state.arena.worldJob.open.world = world; },
  placeCar: (point, toward) => {
    const {duel} = window.__qaApp, {state} = duel;
    const {s, lateral} = duel.course.nearest(point.x, point.z);
    const at = duel.course.groundAt(s, lateral);
    const heading = Math.atan2(toward.x - point.x, toward.z - point.z);
    Object.assign(state, {s, lateral, prevS: s, prevLateral: lateral, groundHeight: at.y, prevGroundHeight: at.y,
      speedMph: 0, headingError: heading - duel.course.at(s).heading, onFoot: false});
  },
  advance: camp.advance,
  drive: camp.drive,
  scoutStarted: () => {
    const {open} = window.__qaApp.duel.state.arena.worldJob;
    if (open.parts.missions.active?.id !== 'burned-camp/scout' ||
        !open.holds.some(hold => hold.holder === 'thread:burned-camp/scout'))
      throw Error('The scouting drive did not take its hold.');
  },
  arrivedUnseen: () => {
    const {open} = window.__qaApp.duel.state.arena.worldJob;
    if (open.world.open.threads['burned-camp'].beat !== 'rim' ||
        open.world.ledger.marks.includes('burned-camp/seen') ||
        open.holds.some(hold => hold.holder === 'thread:burned-camp/scout'))
      throw Error('The gully drive did not reach the rim unseen and release its hold.');
  },
};

export function pageSource(name, ...values) {
  return '(' + pageFunctions[name] + ')(' + values.map(value => JSON.stringify(value)).join(', ') + ')';
}

export async function run(context) {
  const rule = burned.beats.scout.mission.rule;
  const layout = RATS_NEST_LAYOUT;
  const nest = sitePosition('rats-nest', world.open.landSeed);
  const sitePositions = {glasshouse: sitePosition('glasshouse', world.open.landSeed),
    'rats-nest': {position: nest, spots: {...layout.spots, ...BURNED_SCOUT.spots}}};
  const locate = place => placeForThread(place, cast, {sitePositions});
  if (rule.lookoutSpots.some(post => !locate(post))) throw Error('The scouting needs both lookout posts.');
  const gully = scoutGullyRoute;
  if (gully.length < 2 || gully.some(point => !point)) throw Error('The gully route must name at least two existing spots.');
  const start = locate(['@camp', 'tracks-away']), bridge = locate(rule.via), hollow = locate(rule.destination);
  const evaluate = (name, ...values) => context.evaluate(pageSource(name, ...values));
  const wait = (name, ...values) => context.waitFor(pageSource(name, ...values), name, 120000);
  await context.navigate('/tools/menu-check.html?flags=story-choices,crew-gear&seed=' + world.seed + '&harness=open-burned-scout');
  await wait('memoryMenu');
  await wait('temporaryPlayerReady');
  await evaluate('temporaryPlayer', world.seed);
  for (const action of ['wasteland-visit', 'yard-cards', 'story-open-roam']) {
    await wait('actionReady', action);
    await evaluate('click', action);
  }
  await wait('roamReady');
  await evaluate('loadWorld', world);
  await evaluate('placeCar', start, bridge);
  await evaluate('advance', .15);
  await evaluate('scoutStarted');
  await evaluate('placeCar', bridge, gully[1]);
  await evaluate('advance', .15);
  for (const point of gully.slice(1)) await evaluate('drive', point, 4, 60);
  await evaluate('drive', hollow, rule.within - 2, 60);
  await evaluate('advance', .15);
  await evaluate('arrivedUnseen');
  await context.screenshot('rats-nest-gully-arrival');
}
