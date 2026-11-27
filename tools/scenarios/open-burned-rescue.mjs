// Laptop only. One memory-only trip with the ledger's watch debt spent on Rell and Moss riding Bess.
import burnedCamp from '../../src/story/threads/content/burned-camp.js';
import {bankHearth} from '../../src/story/ledger.js';
import {placeForThread} from '../../src/story/scenes/burned-camp.js';
import {threadRule} from '../../src/story/threads/thread-rule.js';
import {applyEffects} from '../../src/world/open/open-effects.js';
import {availableRescueHelpers, commitParty} from '../../src/world/open/burned-rescue-rule.js';
import {BURNED_PEN} from '../../src/world/open/content/burned-pen.js';
import {BURNED_SCOUT} from '../../src/world/open/content/burned-scout.js';
import {RATS_NEST_LAYOUT} from '../../src/world/open/looks/rats-nest-look.js';
import {sampleWorld} from '../../src/world/open/samples.js';
import {sitePosition} from '../../src/world/open/site-rule.js';
import {pageFunctions as shared} from './open-dry-pump.mjs';

const id = burnedCamp.id;
const cast = {camp: 'glasshouse', enemy: 'road-rats'};
const base = sampleWorld('after-the-smoke');
const rule = threadRule(burnedCamp, {world: base}, base.open.threads[id]);
const party = commitParty(base, availableRescueHelpers(base, cast, rule.ask), ['rell', 'moss']);
const ready = applyEffects(base, {id: 'qa/ride-with-rell-and-moss', effects: [
  ...party, {type: 'mark', id: id + '/chose/raise-party'}, {type: 'mark', id: id + '/knows-drain'},
  {type: 'mark', id: id + '/counted-six'}, {type: 'find', site: 'rats-nest'},
  {type: 'thread', id, to: 'rescue', cast},
]}).world;
const {ledger} = bankHearth(ready.ledger);
const world = {...ready, ledger, open: {...ready.open, day: {night: ledger.night, seconds: 960}}};

export const pageFunctions = {
  memoryMenu: shared.memoryMenu,
  temporaryPlayerReady: shared.temporaryPlayerReady,
  temporaryPlayer: shared.temporaryPlayer,
  yardReady: shared.yardReady,
  arrivalLoaded: shared.arrivalLoaded,
  roamLoaded: shared.roamLoaded,
  roamReady: shared.roamReady,
  actionReady: shared.actionReady,
  click: shared.click,
  placeCar: shared.placeCar,
  advance: shared.advance,
  loadWorld: world => {
    const {open} = window.__qaApp.duel.state.arena.worldJob;
    open.world = world;
    open.daySeconds = world.open.day.seconds;
  },
  phase: phase => window.__qaApp.duel.state.arena.worldJob.open.parts.missions.active?.state.phase === phase,
  wreckPursuit: expected => {
    const {duel} = window.__qaApp, {state} = duel;
    const riders = state.opponents.filter(car => car.roadRider?.phase === 'fighting' && !car.combatWrecking);
    if (riders.length !== expected) throw Error('Expected ' + expected + ' live rescue buggies, saw ' + riders.length + '.');
    riders.forEach(car => Object.assign(car, {armor: 0, combatWrecking: true, combatWreckTimer: 1}));
  },
  rideBesideBess: seconds => {
    const app = window.__qaApp, {duel} = app, {state} = duel;
    for (let i = 0; i < seconds * 4; i++) {
      const {open} = state.arena.worldJob;
      const mission = open.parts.missions.active;
      if (!mission) return;
      if (mission.state.phase !== 'escort' || !mission.mission.rule.carries ||
          !open.holds.some(row => row.holder === 'thread:burned-camp/rescue' && row.systems.includes('checkpoints')))
        throw Error('The escort lost Bess or its checkpoint hold.');
      const {x, z, heading} = mission.state.convoy;
      const side = 7;
      const pose = duel.course.nearest(x + Math.cos(heading) * side, z - Math.sin(heading) * side, state.s);
      const at = duel.course.groundAt(pose.s, pose.lateral);
      Object.assign(state, {s: pose.s, prevS: pose.s, lateral: pose.lateral, prevLateral: pose.lateral,
        headingError: heading - duel.course.at(pose.s).heading, speedMph: 0, groundHeight: at.y, prevGroundHeight: at.y});
      app.advance(.25);
    }
  },
  allHome: () => {
    const {open} = window.__qaApp.duel.state.arena.worldJob;
    const ledger = open.world.ledger;
    if (open.world.open.threads['burned-camp'].beat !== 'gate' || ledger.words.glasshouse !== 'Sworn' ||
        !ledger.marks.includes('burned-camp/rode-out') || ledger.marks.includes('burned-camp/bess-holed') ||
        ledger.marks.filter(id => id.startsWith('burned-camp/home/')).length !== 9 ||
        open.holds.some(row => row.holder === 'thread:burned-camp/rescue')) throw Error('The nine are not home.');
  },
};

export function pageSource(name, ...values) {
  return '(' + pageFunctions[name] + ')(' + values.map(value => JSON.stringify(value)).join(', ') + ')';
}

export async function run(context) {
  const positions = {'rats-nest': {position: sitePosition('rats-nest', world.open.landSeed),
    spots: {...RATS_NEST_LAYOUT.spots, ...BURNED_PEN.spots, ...BURNED_SCOUT.spots}}};
  const at = place => placeForThread(place, cast, {sitePositions: positions, landSeed: world.open.landSeed});
  const gate = at(['tin-town', 'gate']), nest = at(['rats-nest', 'road-top']), turn = at('boneyard');
  const evaluate = (name, ...values) => context.evaluate(pageSource(name, ...values));
  const wait = (name, ...values) => context.waitFor(pageSource(name, ...values), name, 120000);
  await context.navigate('/tools/menu-check.html?flags=story-choices,crew-gear&seed=' + world.seed + '&harness=open-burned-rescue');
  await wait('memoryMenu');
  await wait('temporaryPlayerReady');
  await evaluate('temporaryPlayer', world.seed);
  for (const action of ['wasteland-visit', 'yard-cards', 'story-open-roam']) {
    if (action === 'yard-cards') await wait('yardReady');
    await wait('actionReady', action);
    await evaluate('click', action);
    if (action === 'wasteland-visit') {
      await wait('arrivalLoaded');
      await evaluate('advance', 6.2);
    }
  }
  await wait('roamLoaded');
  await evaluate('advance', 3.2);
  await wait('roamReady');
  await evaluate('loadWorld', world);
  await evaluate('placeCar', gate, nest);
  await evaluate('advance', .25);
  await wait('phase', 'approach');
  await evaluate('placeCar', nest, turn);
  await evaluate('advance', .25);
  await wait('phase', 'lookout');
  await evaluate('wreckPursuit', 1);
  await evaluate('advance', .25);
  await wait('phase', 'chase');
  await evaluate('wreckPursuit', 4);
  await evaluate('placeCar', turn, nest);
  for (let i = 0; i < 19; i++) await evaluate('advance', 10);
  await wait('phase', 'escort');
  for (let i = 0; i < 9; i++) await evaluate('rideBesideBess', 10);
  await evaluate('rideBesideBess', 3);
  await evaluate('wreckPursuit', 2);
  for (let i = 0; i < 9; i++) await evaluate('rideBesideBess', 10);
  await evaluate('advance', .2);
  await evaluate('allHome');
  await context.screenshot('all-nine-at-tin-town');
}
