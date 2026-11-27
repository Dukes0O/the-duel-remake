// Laptop only. Load the accepted invitation into a temporary outing and take Dace there and back.
import {DACE_ID, DACE_PLACES} from '../../src/world/open/content/dace-goes-looking-places.js';
import {daceDriveMission} from '../../src/world/open/content/dace-goes-looking-rule.js';
import {applyEffects} from '../../src/world/open/open-effects.js';
import {newWorld} from '../../src/world/open/open-record.js';
import {sitePosition} from '../../src/world/open/site-rule.js';
import {pageFunctions as scout} from './open-burned-scout.mjs';
import {pageFunctions as rescue} from './open-lights-on-the-whites.mjs';

export function scenarioWorld() {
  return applyEffects(newWorld({seed: 7, night: 3, scrap: 18, embers: 3}), {
    id: 'qa/dace-together', effects: [
      {type: 'word', person: 'walkers', set: 'Friendly'},
      {type: 'mark', id: 'walkers-inside'},
      {type: 'mark', id: DACE_ID + '/entered/asking'},
      {type: 'mark', id: DACE_ID + '/went-together', text: 'You and Dace went looking together, in your car.'},
      {type: 'thread', id: DACE_ID, to: 'together', cast: {site: 'glasshouse'}},
    ],
  }).world;
}

export const pageFunctions = {
  memoryMenu: scout.memoryMenu,
  temporaryPlayerReady: scout.temporaryPlayerReady,
  temporaryPlayer: scout.temporaryPlayer,
  actionReady: scout.actionReady,
  click: scout.click,
  yardReady: rescue.yardReady,
  roamReady: rescue.roamReady,
  loadWorld: scout.loadWorld,
  placeCar: scout.placeCar,
  advance: scout.advance,
  drive: rescue.drive,
  started: () => {
    const {open} = window.__qaApp.duel.state.arena.worldJob;
    return open.parts.missions.active?.id === 'dace-goes-looking/together' &&
      open.holds.some(hold => hold.holder === 'thread:dace-goes-looking/together' &&
        ['checkpoints', 'signs'].every(system => hold.systems.includes(system)));
  },
  arrived: () => {
    const {open} = window.__qaApp.duel.state.arena.worldJob;
    const record = open.world.open.threads['dace-goes-looking'];
    if (record.end !== 'found-together' || !open.world.open.found.includes(record.cast.site) ||
        open.world.ledger.marks.includes('dace-goes-looking/square') ||
        open.holds.some(hold => hold.holder.startsWith('thread:dace-goes-looking/')))
      throw Error('Dace and the driver did not return with a found site and his debt still open.');
  },
};

export function pageSource(name, ...values) {
  return '(' + pageFunctions[name] + ')(' + values.map(value => JSON.stringify(value)).join(', ') + ')';
}

export async function run(context) {
  const world = scenarioWorld();
  const site = sitePosition(world.open.threads[DACE_ID].cast.site, world.open.landSeed);
  const stops = daceDriveMission().rule.moments;
  const evaluate = (name, ...values) => context.evaluate(pageSource(name, ...values));
  const wait = (name, ...values) => context.waitFor(pageSource(name, ...values), name, 120000);
  await context.navigate('/tools/menu-check.html?flags=story-choices,crew-gear&seed=' + world.seed + '&harness=open-dace-goes-looking');
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
  // The flat stretch of East Road outside Tin Town's gate is clear of bridge and ship decks.
  await evaluate('placeCar', DACE_PLACES.start, stops[0].at);
  await evaluate('advance', .15);
  await wait('started');
  for (const {at, within} of stops) await evaluate('drive', at === '@site' ? site : at, within - 6, 200);
  await evaluate('advance', .2);
  await evaluate('arrived');
  await context.screenshot('dace-back-at-the-gate');
}
