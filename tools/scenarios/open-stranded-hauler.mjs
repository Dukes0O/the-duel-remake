// One memory-only drive: read Tally's truck, drive past, and leave her to remember the car.
import {sampleWorld} from '../../src/world/open/samples.js';
import {applyEffects} from '../../src/world/open/open-effects.js';
import {haulerStop, haulerIsTrap} from '../../src/world/open/content/stranded-hauler-places.js';
import {pageFunctions as scout} from './open-burned-scout.mjs';

export function scenarioWorld() {
  for (let seed = 1; seed <= 100; seed++) {
    const world = applyEffects({...sampleWorld('after-the-smoke'), seed}, {id: 'qa/hauler', effects: [
      {type: 'thread', id: 'stranded-hauler', to: 'sign', cast: {}},
    ]}).world;
    if (!haulerIsTrap(world) && haulerStop(world).road === 'boneyard-road') return world;
  }
  throw Error('The Hauler scenario needs a real truck on the Boneyard road.');
}

export const pageFunctions = {
  memoryMenu: scout.memoryMenu,
  temporaryPlayerReady: scout.temporaryPlayerReady,
  temporaryPlayer: scout.temporaryPlayer,
  actionReady: scout.actionReady,
  click: scout.click,
  yardReady: () => window.__qaApp?.isYardHomeActive?.() === true,
  roamReady: scout.roamReady,
  loadWorld: scout.loadWorld,
  placeCar: scout.placeCar,
  advance: scout.advance,
  drive: scout.drive,
  seen: () => {
    const {open} = window.__qaApp.duel.state.arena.worldJob;
    if (open.world.open.threads['stranded-hauler'].beat !== 'hauler-road')
      throw Error('The real truck was not seen after three seconds.');
  },
  passed: () => {
    const {open} = window.__qaApp.duel.state.arena.worldJob;
    if (open.world.open.threads['stranded-hauler'].end !== 'left-on-the-road' ||
        !open.world.ledger.marks.includes('stranded-hauler/drove-past-her') || open.world.ledger.words.tally !== 'Wary')
      throw Error('Tally did not remember the car that drove past.');
    if (open.holds.some(row => row.holder.startsWith('thread:stranded-hauler')))
      throw Error('Driving past left a mission hold.');
  },
};
export function pageSource(name, ...values) {
  return '(' + pageFunctions[name] + ')(' + values.map(value => JSON.stringify(value)).join(', ') + ')';
}
export async function run(context) {
  const world = scenarioWorld(), stop = haulerStop(world);
  const evaluate = (name, ...values) => context.evaluate(pageSource(name, ...values));
  const wait = (name, ...values) => context.waitFor(pageSource(name, ...values), name, 120000);
  await context.navigate('/tools/menu-check.html?flags=story-choices,crew-gear&seed=' + world.seed + '&harness=open-stranded-hauler');
  await wait('memoryMenu');
  await wait('temporaryPlayerReady');
  await evaluate('temporaryPlayer', world.seed);
  for (const action of ['wasteland-visit', 'yard-cards', 'story-open-roam']) {
    await wait('actionReady', action);
    await evaluate('click', action);
    if (action === 'wasteland-visit') await wait('yardReady');
  }
  await wait('roamReady');
  await evaluate('loadWorld', world);
  // This trader stop is on the Boneyard road, clear of the river's bridges and decks.
  await evaluate('placeCar', stop.spots.crest, stop.spots.passed);
  await evaluate('advance', 3.3);
  await evaluate('seen');
  await evaluate('drive', stop.spots.passed, 20, 90);
  await evaluate('advance', .2);
  await evaluate('passed');
  await context.screenshot('tally-remembers-the-car');
}
