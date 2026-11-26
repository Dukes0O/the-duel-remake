// Laptop only. Start with the invitations done, then drive to Tin Town and walk the market through to dusk.
import market from '../../src/story/threads/content/market-day.js';
import {LAND} from '../../src/world/scablands-names.js';
import {scablandsSurfaceHeightAt} from '../../src/world/scablands-ground.js';
import {MARKET_PLACES} from '../../src/world/open/content/market-day-places.js';
import {applyEffects} from '../../src/world/open/open-effects.js';
import {newWorld} from '../../src/world/open/open-record.js';
import {pageFunctions as scout} from './open-burned-scout.mjs';
import {pageFunctions as camp} from './open-burned-camp.mjs';

const cast = {first: 'glasshouse', second: 'walkers', third: 'radio-hill', odd: 'bus-ring'};
const world = applyEffects(newWorld({seed: 2105, night: 3, scrap: 70, embers: 3}), {id: 'qa/market-invitations', effects: [
  ...['glasshouse', 'radio-hill', 'bus-ring'].map(site => ({type: 'find', site})),
  ...['first', 'second', 'third', 'odd-asked', 'heard-gasket', 'bern-came'].map(key =>
    ({type: 'mark', id: 'market-day/' + (cast[key] && key !== 'odd' ? 'comes-' : '') + key})),
  {type: 'promise', id: 'market-day/hold-market', person: 'dot', dueNights: 5,
    text: market.beats.sign.choices[0].effects[1].text},
  {type: 'thread', id: 'market-day', to: 'stakes', cast},
]}).world;
const approach = LAND.at('tin-town', -52, 85);
const parking = LAND.at('tin-town', -30, 75);
const floor = point => ({...point, y: scablandsSurfaceHeightAt(point.x, point.z)});

export const pageFunctions = {
  memoryMenu: scout.memoryMenu,
  temporaryPlayerReady: scout.temporaryPlayerReady,
  temporaryPlayer: scout.temporaryPlayer,
  actionReady: scout.actionReady,
  click: scout.click,
  inYard: camp.inYard,
  roamReady: scout.roamReady,
  loadWorld: scout.loadWorld,
  placeCar: scout.placeCar,
  drive: scout.drive,
  advance: scout.advance,
  walkAt: camp.walkAt,
  setDay: (partOfDay, seconds, bank = false) => {
    const {state} = window.__qaApp.duel;
    const {worldJob} = state.arena;
    worldJob.definition.open.partOfDay = partOfDay;
    state.stageTimeSec = seconds;
    if (bank) worldJob.open.world.ledger.night++;
  },
  // The runner polls this while the conversation progresses. Both a choice and Continue must be visible and enabled.
  optionReady: words => {
    const talk = document.querySelector('.story-talk:not([hidden])');
    const ready = button => !!button?.getClientRects().length && !button.disabled;
    const option = [...(talk?.querySelectorAll('.story-options button') ?? [])]
      .find(button => button.textContent.includes(words));
    if (ready(option)) return true;
    const next = talk?.querySelector('.story-talk-controls button:first-child');
    if (ready(next) && talk.dataset.phase !== 'options') next.click();
    return false;
  },
  choose: words => {
    const button = [...document.querySelectorAll('.story-talk:not([hidden]) .story-options button')]
      .find(button => button.textContent.includes(words));
    if (!button?.getClientRects().length || button.disabled) throw Error('Market option is unavailable: ' + words);
    button.click();
  },
  beat: beat => {
    const open = window.__qaApp.duel.state.arena.worldJob.open;
    return open.world.open.threads['market-day'].beat === beat;
  },
  held: () => {
    const open = window.__qaApp.duel.state.arena.worldJob.open;
    return open.parts.missions.active?.id === 'market-day/day' &&
      open.holds.some(hold => hold.holder === 'thread:market-day/day' &&
        ['checkpoints', 'signs'].every(system => hold.systems.includes(system)));
  },
  voices: () => window.__qaApp.duel.state.arena.worldJob.open.events.some(event =>
    event.id === 'market-day/day' && event.phase === 'voices'),
  mendedAtDusk: () => {
    const {world, holds} = window.__qaApp.duel.state.arena.worldJob.open;
    return world.open.threads['market-day'].end === 'mended' &&
      world.ledger.marks.includes('market-day/quarrel-mended') &&
      world.ledger.made.includes('market-day/market') &&
      world.open.favours.glasshouse === 1 && world.scrap === 70 &&
      !holds.some(hold => hold.holder === 'thread:market-day/day');
  },
};

export function pageSource(name, ...values) {
  return '(' + pageFunctions[name] + ')(' + values.map(value => JSON.stringify(value)).join(', ') + ')';
}

export async function run(context) {
  const evaluate = (name, ...args) => context.evaluate(pageSource(name, ...args));
  const wait = (name, ...args) => context.waitFor(pageSource(name, ...args), name, 120000);
  const choose = async (beat, option) => {
    const {words} = market.beats[beat].choices.find(row => row.id === option);
    await wait('optionReady', words);
    await evaluate('choose', words);
  };
  const use = async () => {
    const event = {key: 'f', code: 'KeyF', windowsVirtualKeyCode: 70};
    await context.command('Input.dispatchKeyEvent', {type: 'keyDown', ...event});
    await evaluate('advance', .05);
    await context.command('Input.dispatchKeyEvent', {type: 'keyUp', ...event});
  };
  await context.navigate('/tools/menu-check.html?flags=story-choices,crew-gear&seed=' + world.seed + '&harness=open-market-day');
  await wait('memoryMenu');
  await wait('temporaryPlayerReady');
  await evaluate('temporaryPlayer', world.seed);
  await wait('actionReady', 'wasteland-visit');
  await evaluate('click', 'wasteland-visit');
  await wait('inYard');
  for (const action of ['yard-cards', 'story-open-roam']) {
    await wait('actionReady', action);
    await evaluate('click', action);
  }
  await wait('roamReady');
  await evaluate('loadWorld', world);
  await evaluate('placeCar', approach, parking);
  await evaluate('drive', parking, 6, 30);
  await evaluate('setDay', 'dusk', 16 * 60);
  await evaluate('walkAt', floor(MARKET_PLACES.yard));
  await use();
  await choose('stakes', 'beside');
  await wait('beat', 'day');
  await evaluate('setDay', 'dawn', 0, true);
  await evaluate('advance', .15);
  await wait('held');
  await context.screenshot('market-day-stalls');
  await evaluate('setDay', 'day', 9 * 60);
  await evaluate('advance', .15);
  await wait('beat', 'rider');
  await evaluate('walkAt', floor(MARKET_PLACES.gate));
  await use();
  await choose('rider', 'at-the-fence');
  await wait('beat', 'yard-quarrel');
  await evaluate('walkAt', floor(MARKET_PLACES['the-forge-wall']));
  for (let i = 0; i < 6; i++) await evaluate('advance', 10);
  await evaluate('advance', 1);
  await wait('voices');
  await use();
  await choose('yard-quarrel', 'tell-her');
  await wait('beat', 'dusk');
  await evaluate('setDay', 'dusk', 16 * 60);
  await evaluate('advance', .15);
  await wait('mendedAtDusk');
  await context.screenshot('market-day-dusk');
}
