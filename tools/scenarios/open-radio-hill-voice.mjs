// Laptop only. One drive up the Radio Hill ramp with a memory-only player.
import {newWorld} from '../../src/world/open/open-record.js';
import {applyEffects} from '../../src/world/open/open-effects.js';
import {sitePosition} from '../../src/world/open/site-rule.js';
import {radioRamp, RADIO_ID} from '../../src/world/open/content/radio-hill-voice-places.js';
import {LAND} from '../../src/world/scablands-names.js';
import {pageFunctions as scout} from './open-burned-scout.mjs';
import voice from '../../src/story/threads/content/radio-hill-voice.js';

export const start = LAND.at('tin-town', -796, 1493);
const seed = 4;
const world = applyEffects(newWorld({seed, night: 2, embers: 4, scrap: 90}), {
  id: 'qa/radio-call', effects: [{type: 'thread', id: RADIO_ID, to: 'first-call'}],
}).world;

export const pageFunctions = {
  memoryMenu: scout.memoryMenu,
  temporaryPlayerReady: scout.temporaryPlayerReady,
  temporaryPlayer: scout.temporaryPlayer,
  actionReady: scout.actionReady,
  click: scout.click,
  yardReady: () => window.__qaApp?.isYardHomeActive?.() === true,
  roamReady: scout.roamReady,
  placeCar: scout.placeCar,
  advance: scout.advance,
  drive: scout.drive,
  loadNight: world => {
    const job = window.__qaApp.duel.state.arena.worldJob;
    job.open.world = world;
    job.definition.open.partOfDay = 'dark';
  },
  use: () => {
    const {duel} = window.__qaApp;
    duel.setInput({interact: true, throttle: 0, brake: 1});
    duel.step(1 / 60);
    duel.setInput({interact: false});
    duel.step(1 / 60);
  },
  choiceReady: words => [...document.querySelectorAll('.story-options button')].some(button =>
    button.textContent.includes(words) && !!button.getClientRects().length && !button.disabled),
  choose: words => [...document.querySelectorAll('.story-options button')].find(button =>
    button.textContent.includes(words) && !!button.getClientRects().length && !button.disabled).click(),
  atBeat: (beat, mark) => {
    const {open} = window.__qaApp.duel.state.arena.worldJob;
    return open.world.open.threads['radio-hill-voice'].beat === beat &&
      (!mark || open.world.ledger.marks.includes('radio-hill-voice/' + mark));
  },
  climbed: () => {
    const {open} = window.__qaApp.duel.state.arena.worldJob;
    return open.world.open.threads['radio-hill-voice'].beat === 'other-voice' &&
      open.world.open.found.includes('radio-hill') && open.world.ledger.words['radio-hill'] === 'Friendly' &&
      open.world.ledger.marks.includes('radio-hill-voice/talked-up') &&
      !open.holds.some(hold => hold.holder.startsWith('thread:radio-hill-voice/'));
  },
};

export function pageSource(name, ...args) {
  return '(' + pageFunctions[name] + ')(' + args.map(value => JSON.stringify(value)).join(', ') + ')';
}

export async function run(context) {
  const route = radioRamp(sitePosition('radio-hill', seed)).map(row => row.point);
  const evaluate = (name, ...args) => context.evaluate(pageSource(name, ...args));
  const wait = (name, ...args) => context.waitFor(pageSource(name, ...args), name, 120000);
  await context.navigate('/tools/menu-check.html?flags=story-choices,crew-gear&seed=' + seed + '&harness=open-radio-hill-voice');
  await wait('memoryMenu');
  await wait('temporaryPlayerReady');
  await evaluate('temporaryPlayer', seed);
  for (const action of ['wasteland-visit', 'yard-cards', 'story-open-roam']) {
    await wait('actionReady', action);
    await evaluate('click', action);
    if (action === 'wasteland-visit') await wait('yardReady');
  }
  await wait('roamReady');
  await evaluate('loadNight', world);
  // The Mall approach is on natural ground, clear of river crossings and decks.
  await evaluate('placeCar', start, route[0]);
  await evaluate('advance', 3.5);
  await wait('atBeat', 'second-voice', 'stopped-for-hetty');
  await evaluate('advance', 18);
  await wait('atBeat', 'second-voice', 'heard-two-voices');
  await evaluate('drive', route[0], 7, 100);
  await evaluate('advance', .2);
  await wait('atBeat', 'ramp', 'entered/ramp');
  await evaluate('use');
  const confirm = voice.beats.ramp.choices[0].words;
  await wait('choiceReady', confirm);
  await evaluate('choose', confirm);
  await evaluate('advance', .25);
  await wait('atBeat', 'climb');
  for (const point of route.slice(1)) await evaluate('drive', point, 7, 70);
  await evaluate('advance', .3);
  await wait('climbed');
  await context.screenshot('radio-hill-climb');
}
