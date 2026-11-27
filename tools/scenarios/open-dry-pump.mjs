// The temporary profile and storyline world both live in the QA tab's memory.
import {applyEffects} from '../../src/world/open/open-effects.js';
import {newWorld} from '../../src/world/open/open-record.js';
import {DRY_PUMP_SPOTS as spots} from '../../src/world/open/content/dry-pump-places.js';
import {residentPose, sitePosition, siteSpot} from '../../src/world/open/site-rule.js';
import {campPeople} from '../../src/world/open/content/people-sites.js';
import {STORY_FIGURES} from '../../src/world/jobs/story-people.js';
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
const leader = campPeople('glasshouse').find(row => row.id === 'marigold');
const start = LAND.at('dead-mall', 75, -43);

export const pageFunctions = {
  ...shared,
  yardReady: camp.inYard,
  arrivalLoaded: () => window.__qaApp.visualReady && window.__qaApp.duel.state.status === 'exploring',
  roamLoaded: () => window.__qaApp.visualReady &&
    window.__qaApp.duel.state.arena?.worldJob?.definition.id === 'open-roam',
  onFoot: camp.walkAt,
  interact: () => {
    const app = window.__qaApp;
    app.keys.KeyF = true;
    try { app.advance(.12); } finally { app.keys.KeyF = false; }
    app.advance(.12);
  },
  campState: () => {
    const {open} = window.__qaApp.duel.state.arena.worldJob;
    return {world: open.world, site: open.parts.sites};
  },
  talkReady: id => {
    const {job} = window.__qaApp.duel.state.arena.worldJob;
    const overlay = document.querySelector('.story-talk:not([hidden])');
    return job.steps[job.stepIndex]?.id === id && overlay?.dataset.scene === id && !!overlay.getClientRects().length;
  },
  beatReady: beat => window.__qaApp.duel.state.arena.worldJob.open.world.open.threads['dry-pump']?.beat === beat,
  talkState: () => {
    const state = window.__qaApp?.duel.state, trip = state?.arena?.worldJob;
    const job = trip?.job;
    return {status: state?.status, step: job?.steps[job.stepIndex], talk: job?.stepState.talk,
      threads: trip?.open?.world.open.threads, progress: trip?.open?.parts.threads?.dryPump,
      talks: [...document.querySelectorAll('.story-talk')].map(box => ({
        html: box.outerHTML, buttons: [...box.querySelectorAll('button')].map(button => ({
          text: button.textContent, hidden: button.hidden, disabled: button.disabled,
          visible: !!button.getClientRects().length, visibility: getComputedStyle(button).visibility,
        })),
      }))};
  },
  decisionReady: (id, option) => {
    const overlay = document.querySelector('.story-talk:not([hidden])');
    if (overlay?.dataset.scene !== id) return false;
    const options = [...(overlay?.querySelectorAll('.story-options button') ?? [])];
    if (options.some(button => button.textContent.includes(option) && button.getClientRects().length && !button.disabled)) return true;
    // Poll between advances so the renderer can replace the screen accepted by talkInput.
    const button = overlay.querySelector('.story-talk-controls button:first-child');
    if (!button || button.disabled || !button.getClientRects().length) return false;
    button.click();
    window.__qaApp.advance(.1);
    return false;
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
    app._footPointer.fire = true;
    try { app.advance(seconds); } finally { app._footPointer.fire = false; }
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
  const wait = async (name, ...values) => {
    try { return await context.waitFor(pageSource(name, ...values), name, 120000); }
    catch (error) {
      error.message += '\nTalk state: ' + await evaluate('talkState').then(JSON.stringify, failure => failure.message);
      throw error;
    }
  };
  const foot = point => evaluate('onFoot', onGround(point));
  const meetLeader = async () => {
    const state = await evaluate('campState');
    await foot(residentPose(leader, state.world, state.site, STORY_FIGURES[leader.figure].pace).position);
  };
  const choose = async (id, option) => {
    await wait('talkReady', id);
    await wait('decisionReady', id, option);
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
    if (action === 'wasteland-visit') {
      await wait('arrivalLoaded');
      await evaluate('advance', 6.2);
    }
  }
  await wait('roamLoaded');
  await evaluate('advance', 3.2);
  await wait('roamReady');
  await evaluate('loadWorld', world);
  await meetLeader();
  await evaluate('interact');
  await choose('dry-pump/asking/decision', "I'll go to the Mall for it today.");
  await wait('beatReady', 'mall-outside');
  // The story drive starts on level ground clear of the Mall walls, bridges and decks.
  await evaluate('placeCar', start, spots['car-park']);
  await evaluate('drive', spots['car-park'], 5, 30);
  await foot(spots['north-side']);
  await evaluate('interact');
  await choose('dry-pump/mall-outside/decision', 'Climb the sand and go in by the roof');
  await foot(spots.gallery);
  await foot(spots.hall);
  await foot(spots['staff-door']);
  await wait('beatReady', 'penny');
  await evaluate('interact');
  await choose('dry-pump/penny/decision', "Thank you. I'll take the one from your pipe.");
  await foot(spots['penny-pipe']);
  await evaluate('wrench', 10.2);
  await evaluate('interact');
  await choose('dry-pump/his-pipe/decision', 'Say nothing');
  await foot(spots['tunnel-door']);
  await evaluate('placeCar', spots['car-park'], house);
  await evaluate('advance', .22);
  await wait('beatReady', 'fitting');
  await foot(pump);
  await evaluate('wrench', 12.2);
  await meetLeader();
  await evaluate('interact');
  await choose('dry-pump/fitting/decision', 'An old man who lives under the Mall gave me the one out of his own pump.');
  await evaluate('returnedWater');
  await context.screenshot('dry-pump-water-back');
}
