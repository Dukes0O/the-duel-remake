// Claude runs this on the laptop. The harness supplies memory-only storage.
import {newWorld} from '../../src/world/open/open-record.js';
import {applyEffects} from '../../src/world/open/open-effects.js';
import {FLAG_ID} from '../../src/world/open/content/somebody-elses-flag-places.js';
import {placeForThread} from '../../src/story/scenes/burned-camp.js';
import {scablandsSurfaceHeightAt} from '../../src/world/scablands-ground.js';
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
  drive: camp.drive,
  advance: camp.advance,
  walkAt: camp.walkAt,
  seen: () => window.__qaApp.duel.state.arena.worldJob.open.world.ledger.marks.includes('somebody-elses-flag/tower-seen'),
  choose: words => {
    const button = [...document.querySelectorAll('.story-options button')].find(row => row.textContent.includes(words));
    if (button && !button.disabled) { button.click(); return true; }
    document.querySelector('.story-talk:not([hidden]) .story-talk-controls button:first-child')?.click();
    return false;
  },
  roaming: () => window.__qaApp.duel.state.arena.worldJob.job.steps[
    window.__qaApp.duel.state.arena.worldJob.job.stepIndex]?.kind === 'roam',
  shared: () => {
    const {open} = window.__qaApp.duel.state.arena.worldJob;
    if (open.world.open.threads['somebody-elses-flag'].end !== 'shared' ||
        !open.world.ledger.marks.includes('somebody-elses-flag/signed') ||
        open.world.open.favours.glasshouse !== 1 || open.world.scrap !== 90)
      throw Error('The schedule did not keep the authored marks, favour and price.');
    return true;
  },
};

export const pageSource = (name, ...values) => '(' + pageFunctions[name] + ')(' + values.map(value => JSON.stringify(value)).join(', ') + ')';

export async function run(context) {
  const world = applyEffects(newWorld({seed: 1234, night: 6, scrap: 90, embers: 3}), {id: 'qa/flag', effects: [
    {type: 'find', site: 'sweet-seep'}, {type: 'find', site: 'glasshouse'},
    {type: 'word', person: 'glasshouse', set: 'Friendly'},
    {type: 'thread', id: FLAG_ID, to: 'sign', cast: {camp: 'glasshouse'}},
  ]}).world;
  const evaluate = (name, ...values) => context.evaluate(pageSource(name, ...values));
  const wait = (name, ...values) => context.waitFor(pageSource(name, ...values), name, 120000);
  const use = async () => {
    for (const type of ['keyDown', 'keyUp']) await context.command('Input.dispatchKeyEvent',
      {type, key: 'f', code: 'KeyF', windowsVirtualKeyCode: 70});
    await evaluate('advance', .2);
  };
  const well = placeForThread('sweet-seep', {}, {landSeed: world.open.landSeed});
  const floor = point => ({...point, y: scablandsSurfaceHeightAt(point.x, point.z)});
  const table = placeForThread(['sweet-seep', 'table'], {}, {landSeed: world.open.landSeed});
  const parking = {...well, z: well.z + 37};
  const start = {...well, z: well.z + 230};
  await context.navigate('/tools/menu-check.html?flags=story-choices,crew-gear&seed=1234&harness=open-somebody-elses-flag');
  await wait('memoryMenu');
  await wait('temporaryPlayerReady');
  await evaluate('temporaryPlayer', world.seed);
  for (const action of ['wasteland-visit', 'yard-cards', 'story-open-roam']) {
    await wait('actionReady', action);
    await evaluate('click', action);
  }
  await wait('roamReady');
  await evaluate('loadWorld', world);
  // Both endpoints are on the open western ground, clear of bridges and decks.
  await evaluate('placeCar', floor(start), parking);
  await evaluate('advance', 3.2);
  await wait('seen');
  await context.screenshot('sweet-seep-white-flag');
  await evaluate('drive', parking, 4, 60);
  await use();
  await evaluate('walkAt', floor(table));
  await use();
  await wait('choose', 'I will call again if I need you.');
  await wait('roaming');
  await use();
  await wait('choose', 'Ask Miss Pell what it would take to share the water');
  await wait('roaming');
  await evaluate('advance', .2);
  await use();
  await wait('choose', 'I will call again if I need you.');
  await wait('roaming');
  await use();
  await wait('choose', 'Sign the schedule, for Tin Town');
  await wait('roaming');
  await evaluate('advance', .2);
  await evaluate('shared');
  await context.screenshot('sweet-seep-signed-schedule');
}
