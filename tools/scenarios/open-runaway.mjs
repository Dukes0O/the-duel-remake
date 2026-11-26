// Laptop only. From the yard, follow the ash prints and give Clinker his answer.
import {applyEffects} from '../../src/world/open/open-effects.js';
import {RUNAWAY_PLACES} from '../../src/world/open/content/runaway-places.js';
import {sampleWorld} from '../../src/world/open/samples.js';
import {LAND} from '../../src/world/scablands-names.js';
import {scablandsSurfaceHeightAt} from '../../src/world/scablands-ground.js';
import {pageFunctions as camp} from './open-burned-camp.mjs';
import {pageFunctions as scout} from './open-burned-scout.mjs';

const world = applyEffects(sampleWorld('first-night'), {id: 'qa/runaway-on-a-morning', effects: [
  {type: 'thread', id: 'runaway', to: 'prints'},
]}).world;
const parked = LAND.at('tin-town', 47, 85);
const shedRoad = LAND.at('tin-town', 46, 66);
const ground = point => ({...point, y: scablandsSurfaceHeightAt(point.x, point.z)});

export const pageFunctions = {
  memoryMenu: scout.memoryMenu,
  temporaryPlayerReady: scout.temporaryPlayerReady,
  temporaryPlayer: scout.temporaryPlayer,
  actionReady: scout.actionReady,
  click: scout.click,
  yard: () => window.__qaApp?.isYardHomeActive() === true,
  roamReady: scout.roamReady,
  loadWorld: scout.loadWorld,
  partOfDay: partOfDay => { window.__qaApp.duel.state.arena.worldJob.definition.open.partOfDay = partOfDay; },
  placeCar: scout.placeCar,
  drive: camp.drive,
  walkAt: camp.walkAt,
  advance: camp.advance,
  interact: () => {
    const {duel} = window.__qaApp;
    duel.setInput({interact: true});
    duel.step(1 / 60);
    duel.setInput({interact: false});
    duel.step(1 / 60);
  },
  visibleClue: id => window.__render.scene.getObjectByName('Runaway ' + id)?.visible === true,
  talkControl: words => {
    const talk = document.querySelector('.story-talk:not([hidden])');
    const controls = talk?.querySelectorAll(words ? '.story-options button' : '.story-talk-controls button:first-child');
    return [...controls ?? []].some(button => !button.disabled && !button.hidden &&
      button.getClientRects().length && (!words || button.textContent.includes(words)));
  },
  clickTalk: words => {
    const talk = document.querySelector('.story-talk:not([hidden])');
    const controls = talk?.querySelectorAll(words ? '.story-options button' : '.story-talk-controls button:first-child');
    const button = [...controls ?? []].find(button => !button.disabled && !button.hidden &&
      button.getClientRects().length && (!words || button.textContent.includes(words)));
    if (!button) throw Error('A conversation button was unavailable.');
    button.click();
  },
  outcome: end => {
    const {open} = window.__qaApp.duel.state.arena.worldJob;
    return open.world.open.threads.runaway.end === end &&
      open.world.ledger.marks.includes('runaway/handed-back') &&
      !open.holds.some(row => row.holder.startsWith('thread:runaway'));
  },
};

export function pageSource(name, ...values) {
  return '(' + pageFunctions[name] + ')(' + values.map(value => JSON.stringify(value)).join(', ') + ')';
}

export async function run(context) {
  const evaluate = (name, ...values) => context.evaluate(pageSource(name, ...values));
  const wait = (name, ...values) => context.waitFor(pageSource(name, ...values), name, 120000);
  const choose = async words => {
    for (let step = 0; step < 20; step++) {
      if (await evaluate('talkControl', words)) {
        await wait('talkControl', words);
        await evaluate('clickTalk', words);
        await evaluate('advance', .15);
        return;
      }
      await wait('talkControl', '');
      await evaluate('clickTalk', '');
      await evaluate('advance', .05);
    }
    throw Error('The conversation never offered ' + words);
  };
  await context.navigate('/tools/menu-check.html?flags=story-choices,crew-gear&seed=' + world.seed + '&harness=open-runaway');
  await wait('memoryMenu');
  await wait('temporaryPlayerReady');
  await evaluate('temporaryPlayer', world.seed);
  for (const action of ['wasteland-visit', 'yard-cards', 'story-open-roam']) {
    if (action === 'yard-cards') await wait('yard');
    await wait('actionReady', action);
    await evaluate('click', action);
  }
  await wait('roamReady');
  await evaluate('loadWorld', world);
  await evaluate('partOfDay', 'dawn');
  await evaluate('placeCar', ground(parked), shedRoad);
  await evaluate('drive', shedRoad, 5, 15);
  for (const clue of ['footprints', 'wire', 'bowl', 'handprint']) {
    await evaluate('walkAt', ground(RUNAWAY_PLACES[clue]));
    if (clue === 'footprints') {
      await wait('visibleClue', clue);
      await context.screenshot('ash-footprints');
    }
  }
  await evaluate('walkAt', ground(RUNAWAY_PLACES['in-the-shed']));
  await evaluate('interact');
  await choose('Stay out of sight.');
  await evaluate('walkAt', ground(RUNAWAY_PLACES['in-the-woodpile']));
  await evaluate('interact');
  await evaluate('partOfDay', 'dusk');
  await evaluate('walkAt', ground(RUNAWAY_PLACES.gate));
  await evaluate('interact');
  await choose("Take him. He's yours.");
  await wait('outcome', 'handed-back');
  await context.screenshot('clinker-at-the-gate');
}
