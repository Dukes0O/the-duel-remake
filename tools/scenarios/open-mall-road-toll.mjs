// Laptop only. The menu harness supplies memory-only storage.
import {newWorld} from '../../src/world/open/open-record.js';
import {applyEffects} from '../../src/world/open/open-effects.js';
import {TOLL_GATE, TOLL_ID, tollPlace, tollPosition} from '../../src/world/open/content/mall-road-toll-places.js';
import {scablandsFloorsAt, scablandsSurfaceHeightAt} from '../../src/world/scablands-ground.js';
import {pageFunctions as scout} from './open-burned-scout.mjs';
import {pageFunctions as camp} from './open-burned-camp.mjs';

export const pageFunctions = {
  memoryMenu: scout.memoryMenu,
  temporaryPlayerReady: scout.temporaryPlayerReady,
  temporaryPlayer: scout.temporaryPlayer,
  actionReady: scout.actionReady,
  click: scout.click,
  roamReady: scout.roamReady,
  loadWorld: scout.loadWorld,
  placeCar: scout.placeCar,
  advance: camp.advance,
  drive: camp.drive,
  walkAt: camp.walkAt,
  seen: () => window.__qaApp.duel.state.arena.worldJob.open.world.open.threads['mall-road-toll'].beat === 'gate',
  choose: words => {
    const talk = document.querySelector('.story-talk:not([hidden])');
    const button = [...(talk?.querySelectorAll('.story-options button') ?? [])].find(row => row.textContent.includes(words));
    if (button && !button.disabled) { button.click(); return true; }
    const advance = talk?.querySelector('.story-talk-controls button:first-child');
    if (advance && !advance.disabled && advance.getClientRects().length) advance.click();
    return false;
  },
  paid: (balance, ending) => {
    const {world} = window.__qaApp.duel.state.arena.worldJob.open;
    return world.scrap === balance && world.open.found.includes('sumps-gate') &&
      (ending ? world.open.threads['mall-road-toll'].end === 'paid' : world.open.threads['mall-road-toll'].beat === 'gate');
  },
};

export function pageSource(name, ...values) {
  return '(' + pageFunctions[name] + ')(' + values.map(value => JSON.stringify(value)).join(', ') + ')';
}

export async function run(context) {
  const seed = 1234;
  const world = applyEffects(newWorld({seed, night: 7, scrap: 60}), {id: 'qa/toll', effects: [
    {type: 'thread', id: TOLL_ID, to: 'sign', cast: {}},
  ]}).world;
  const evaluate = (name, ...values) => context.evaluate(pageSource(name, ...values));
  const wait = (name, ...values) => context.waitFor(pageSource(name, ...values), name, 120000);
  const use = async () => {
    for (const type of ['keyDown', 'keyUp']) await context.command('Input.dispatchKeyEvent',
      {type, key: 'f', code: 'KeyF', windowsVirtualKeyCode: 70});
    await evaluate('advance', .2);
  };
  await context.navigate('/tools/menu-check.html?flags=story-choices,crew-gear&seed=' + seed + '&harness=open-mall-road-toll');
  await wait('memoryMenu');
  await wait('temporaryPlayerReady');
  await evaluate('temporaryPlayer', seed);
  for (const action of ['wasteland-visit', 'yard-cards', 'story-open-roam']) {
    await wait('actionReady', action);
    await evaluate('click', action);
  }
  await wait('roamReady');
  await evaluate('loadWorld', world);
  const start = tollPosition(0, -240), parking = tollPosition(0, -13), through = tollPosition(0, 31);
  if (scablandsFloorsAt(start.x, start.z, []) !== 1) throw Error('The review car must start clear of bridges and decks.');
  const sump = tollPlace([TOLL_GATE, 'sump']);
  await evaluate('placeCar', start, parking);
  await evaluate('advance', 3.2);
  await wait('seen');
  await context.screenshot('mall-road-wreckage');
  let scrap = 60;
  for (const [index, price] of [8, 8, 8, 12, 12].entries()) {
    await evaluate('drive', parking, 3, 45);
    await use();
    await evaluate('walkAt', {...sump, y: scablandsSurfaceHeightAt(sump.x, sump.z)});
    await use();
    await wait('choose', 'Put eight scrap in the bucket');
    scrap -= price;
    await evaluate('advance', .25);
    await wait('paid', scrap, index === 4);
    await evaluate('placeCar', parking, through);
    await evaluate('drive', through, 4, 14);
    // Approach the same Sump side again for the next crossing.
    if (index < 4) await evaluate('placeCar', tollPosition(0, -75), parking);
  }
  await context.screenshot('mall-road-toll-paid-five-times');
}
