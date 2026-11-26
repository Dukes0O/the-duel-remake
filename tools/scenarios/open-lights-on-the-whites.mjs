// Laptop only. The guided rescue across the salt, in a temporary QA tab, bring all four hands in.
import {pageFunctions as scout} from './open-burned-scout.mjs';
import {applyEffects} from '../../src/world/open/open-effects.js';
import {newWorld} from '../../src/world/open/open-record.js';
import {lightsPlaces, LIGHTS_ID} from '../../src/world/open/content/lights-on-the-whites-places.js';
import {sitePosition} from '../../src/world/open/site-rule.js';

export function scenarioWorld() {
  let landSeed = 1;
  while (sitePosition('bell-buoy', landSeed).x !== 2600) landSeed++;
  const world = newWorld({seed: landSeed, night: 3, embers: 2});
  return applyEffects(world, {id: 'qa/lights-out', effects: [{type: 'thread', id: LIGHTS_ID, to: 'sign'}]}).world;
}

export const pageFunctions = {
  memoryMenu: scout.memoryMenu,
  temporaryPlayerReady: scout.temporaryPlayerReady,
  temporaryPlayer: scout.temporaryPlayer,
  actionReady: scout.actionReady,
  click: scout.click,
  yardReady: () => window.__qaApp?.isYardHomeActive?.() === true,
  roamReady: () => {
    const app = window.__qaApp, state = app?.duel.state, job = state?.arena?.worldJob;
    return app?.visualReady && state.status === 'racing' && job?.definition.id === 'open-roam' && job.open.seconds > 0;
  },
  loadWorld: world => {
    const {worldJob} = window.__qaApp.duel.state.arena;
    worldJob.open.world = world;
    worldJob.definition.open = {...worldJob.definition.open, partOfDay: 'dark'};
    // Once the shared day clock is present, start at its published dark threshold in this isolated outing.
    if (worldJob.open.daySeconds !== undefined) worldJob.open.daySeconds = 20 * 60;
  },
  placeCar: scout.placeCar,
  advance: scout.advance,
  drive: (target, within, limit) => {
    const {duel} = window.__qaApp;
    const state = duel.state;
    for (let frame = 0; frame < limit * 60; frame++) {
      const at = duel.course.worldAt(state.s, state.lateral);
      const dx = target.x - at.x, dz = target.z - at.z;
      if (Math.hypot(dx, dz) <= within) {
        duel.setInput({throttle: 0, steer: 0, brake: 1});
        for (let tick = 0; tick < 90; tick++) duel.step(1 / 60);
        duel.setInput({brake: 0});
        return true;
      }
      const angle = Math.atan2(dx, dz) - duel.course.at(state.s).heading - state.headingError;
      const error = Math.atan2(Math.sin(angle), Math.cos(angle));
      const speed = Math.abs(state.speedMph);
      const turning = Math.abs(error) > .65;
      duel.setInput({throttle: speed < (turning ? 16 : 50) ? .85 : 0,
        brake: turning && speed > 20 ? .55 : 0, steer: Math.max(-1, Math.min(1, -error * 2))});
      duel.step(1 / 60);
    }
    throw Error('The car did not reach the salt waypoint.');
  },
  mark: id => window.__qaApp.duel.state.arena.worldJob.open.world.ledger.marks.includes('lights-on-the-whites/' + id),
  interact: () => {
    const {duel} = window.__qaApp;
    duel.setInput({interact: true});
    duel.step(1 / 60);
    duel.setInput({interact: false});
  },
  talkButton: (selector, text, click) => {
    const panel = document.querySelector('.story-talk:not([hidden])');
    const button = [...(panel?.querySelectorAll(selector) ?? [])].find(row =>
      (!text || row.textContent.includes(text)) && !row.disabled && row.getClientRects().length);
    if (button && click) button.click();
    return !!button;
  },
  arrived: () => {
    const {open} = window.__qaApp.duel.state.arena.worldJob;
    const record = open.world.open.threads['lights-on-the-whites'];
    if (record.beat !== 'aboard' || open.world.ledger.words['deck-folk'] !== 'Friendly' ||
        !open.world.ledger.made.includes('way/patience-ladder') ||
        !open.world.ledger.marks.includes('lights-on-the-whites/sprat-led') ||
        open.holds.some(hold => hold.holder.startsWith('thread:lights-on-the-whites/')))
      throw Error('The guided rescue did not bring in all four and put down the ladder.');
  },
};

export function pageSource(name, ...values) {
  return '(' + pageFunctions[name] + ')(' + values.map(value => JSON.stringify(value)).join(', ') + ')';
}

export async function run(context) {
  const world = scenarioWorld();
  const places = lightsPlaces(world.open.landSeed);
  const evaluate = (name, ...values) => context.evaluate(pageSource(name, ...values));
  const wait = (name, ...values) => context.waitFor(pageSource(name, ...values), name, 120000);
  async function talkClick(selector, text) {
    await wait('talkButton', selector, text, false);
    await evaluate('talkButton', selector, text, true);
  }

  await context.navigate('/tools/menu-check.html?flags=story-choices,crew-gear&seed=' + world.seed + '&harness=open-lights-on-the-whites');
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
  const start = places['whites-road-start'], crew = places['whites-crew'];
  const home = places['whites-ship-side'], meeting = places['whites-meeting'];
  // This Salt Road start is more than a kilometre east of the ship decks and clear of the Pipe.
  await evaluate('placeCar', start, crew);
  await evaluate('advance', 3.3);
  await wait('mark', 'entered/sign');
  await context.screenshot('four-lamps-on-the-whites');
  await evaluate('drive', crew, 50, 130);
  await wait('mark', 'entered/crew');
  await evaluate('interact');
  await talkClick('.story-options button', 'Sprat, do you know the way back?');
  await talkClick('.story-talk-controls button:first-child', '');
  await talkClick('.story-options button', 'I will call again if I need you.');
  await evaluate('advance', .15);
  await evaluate('interact');
  await talkClick('.story-options button', 'Kedge and Wick, get in.');
  await evaluate('advance', .15);
  await evaluate('drive', home, 32, 180);
  await evaluate('drive', meeting, 47, 125);
  await evaluate('drive', home, 32, 125);
  await evaluate('advance', .2);
  await evaluate('arrived');
  await context.screenshot('all-hands-at-the-patience');
}
