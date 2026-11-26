// Claude's laptop only. The temporary profile and storyline world both live in the QA tab's memory.
import {applyEffects} from '../../src/world/open/open-effects.js';
import {newWorld} from '../../src/world/open/open-record.js';
import {DRY_PUMP_SPOTS as spots} from '../../src/world/open/content/dry-pump-places.js';
import {sitePosition, siteSpot} from '../../src/world/open/site-rule.js';
import {LAND} from '../../src/world/scablands-names.js';
import {scablandsSurfaceHeightAt} from '../../src/world/scablands-ground.js';
import {pageFunctions as shared} from './open-burned-scout.mjs';
import {pageFunctions as camp} from './open-burned-camp.mjs';

const world = applyEffects(newWorld({seed: 2, night: 2}), {id: 'qa/dry-pump-sign', effects: [
  {type: 'find', site: 'glasshouse'},
  {type: 'thread', id: 'dry-pump', to: 'sign', cast: {camp: 'glasshouse'}},
]}).world;
const onGround = point => ({...point, y: scablandsSurfaceHeightAt(point.x, point.z)});
const house = sitePosition('glasshouse', world.open.landSeed);
const pump = siteSpot('glasshouse', world.open.landSeed, 'pump');
const leader = siteSpot('glasshouse', world.open.landSeed, 'marigold');
const start = LAND.at('dead-mall', 75, -43);

export const pageFunctions = {
  ...shared,
  yardReady: camp.inYard,
  onFoot: camp.walkAt,
  interact: () => {
    const app = window.__qaApp;
    app.duel.setInput({interact: true});
    app.advance(.12);
    app.duel.setInput({interact: false});
    app.advance(.12);
  },
  beatReady: beat => window.__qaApp.duel.state.arena.worldJob.open.world.open.threads['dry-pump']?.beat === beat,
  decisionReady: option => {
    const overlay = document.querySelector('.story-talk:not([hidden])');
    const options = [...(overlay?.querySelectorAll('.story-options button') ?? [])];
    return options.some(button => button.textContent.includes(option) && button.getClientRects().length && !button.disabled);
  },
  advanceTalk: () => {
    const button = document.querySelector('.story-talk:not([hidden]) .story-talk-controls button:first-child');
    if (!button || button.disabled || !button.getClientRects().length) return false;
    button.click();
    window.__qaApp.advance(.1);
    return true;
  },
  select: option => {
    const button = [...document.querySelectorAll('.story-talk:not([hidden]) .story-options button')].find(row =>
      row.textContent.includes(option) && row.getClientRects().length && !row.disabled);
    if (!button) throw Error('The Dry Pump decision is unavailable: ' + option);
    button.click();
    window.__qaApp.advance(.2);
  },
  wrench: seconds => {
    const app = window.__qaApp;
    app.duel.selectFootGear(2);
    app.duel.setFighterInput({fire: true});
    app.advance(seconds);
    app.duel.setFighterInput({fire: false});
    app.advance(.2);
  },
  returnedWater: () => {
    const {open} = window.__qaApp.duel.state.arena.worldJob;
    const {ledger} = open.world;
    if (open.world.open.threads['dry-pump'].end !== 'water-back' || ledger.words.glasshouse !== 'Sworn' ||
        !['water-back', 'mall-way-in', 'signed-the-book', 'penny-has-friends'].every(id => ledger.marks.includes('dry-pump/' + id)) ||
        open.holds.some(hold => hold.holder.startsWith('thread:dry-pump/')))
      throw Error('The camp did not get water and tell Mr Penny’s part of the story.');
  },
};

export function pageSource(name, ...values) {
  return '(' + pageFunctions[name] + ')(' + values.map(value => JSON.stringify(value)).join(', ') + ')';
}

export async function run(context) {
  const evaluate = (name, ...values) => context.evaluate(pageSource(name, ...values));
  const wait = (name, ...values) => context.waitFor(pageSource(name, ...values), name, 120000);
  const foot = point => evaluate('onFoot', onGround(point));
  const choose = async option => {
    for (let i = 0; i < 16 && await evaluate('advanceTalk'); i++) { /* Advance only a visible, enabled button. */ }
    await wait('decisionReady', option);
    await evaluate('select', option);
  };
  await context.navigate('/tools/menu-check.html?flags=story-choices,crew-gear&seed=2&harness=open-dry-pump');
  await wait('memoryMenu');
  await wait('temporaryPlayerReady');
  await evaluate('temporaryPlayer', world.seed);
  for (const action of ['wasteland-visit', 'yard-cards', 'story-open-roam']) {
    if (action === 'yard-cards') await wait('yardReady');
    await wait('actionReady', action);
    await evaluate('click', action);
  }
  await wait('roamReady');
  await evaluate('loadWorld', world);
  await foot(leader);
  await evaluate('interact');
  await choose("I'll go to the Mall for it today.");
  await wait('beatReady', 'mall-outside');
  // The story drive starts on level ground clear of the Mall walls, bridges and decks.
  await evaluate('placeCar', start, spots['car-park']);
  await evaluate('drive', spots['car-park'], 5, 30);
  await foot(spots['north-side']);
  await evaluate('interact');
  await choose('Climb the sand and go in by the roof');
  await foot(spots.gallery);
  await foot(spots.hall);
  await foot(spots['staff-door']);
  await wait('beatReady', 'penny');
  await evaluate('interact');
  await choose("Thank you. I'll take the one from your pipe.");
  await foot(spots['penny-pipe']);
  await evaluate('wrench', 10.2);
  await evaluate('interact');
  await choose('Say nothing');
  await foot(spots['tunnel-door']);
  await evaluate('placeCar', spots['car-park'], house);
  await evaluate('advance', .22);
  await wait('beatReady', 'fitting');
  await foot(pump);
  await evaluate('wrench', 12.2);
  await foot(leader);
  await evaluate('interact');
  await choose('An old man who lives under the Mall gave me the one out of his own pump.');
  await evaluate('returnedWater');
  await context.screenshot('dry-pump-water-back');
}
