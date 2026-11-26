// Laptop only. From the yard, follow the ash prints and give Clinker his answer.
import {applyEffects} from '../../src/world/open/open-effects.js';
import {RUNAWAY_PLACES} from '../../src/world/open/content/runaway-places.js';
import {sampleWorld} from '../../src/world/open/samples.js';
import {LAND} from '../../src/world/scablands-names.js';
import {partOfDay as partOfDayAt} from '../../src/world/open/day-rule.js';
import {scablandsSurfaceHeightAt} from '../../src/world/scablands-ground.js';
import {pageFunctions as camp} from './open-burned-camp.mjs';
import {pageFunctions as scout} from './open-burned-scout.mjs';

const world = applyEffects(sampleWorld('first-night'), {id: 'qa/runaway-on-a-morning', effects: [
  {type: 'thread', id: 'runaway', to: 'prints'},
]}).world;
// Drive in by the gate (25 m west, 62 m south of the centre), as a player does. The first version parked at (47, 85) outside
// the ring fence and steered straight at (46, 66), into tin-town-fence-29 (Claude, 26 November 2026).
const parked = LAND.at('tin-town', -25, 90);
const inGate = LAND.at('tin-town', -25, 50);
const shedRoad = LAND.at('tin-town', 22, 52);
// The first second of a part of day on the roam's clock (src/world/open/day-rule.js).
const startOf = part => Array.from({length: 120}, (_, step) => step * 30).find(seconds => partOfDayAt(seconds) === part);
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
  // The roam keeps its own clock (dayClock): the part of day the rules read comes from open.daySeconds, so the clock is set
  // to the part's first second. Setting only definition.open.partOfDay left the gate at dawn, where Clinker's talk cannot open.
  partOfDay: (partOfDay, seconds) => {
    const {worldJob} = window.__qaApp.duel.state.arena;
    worldJob.definition.open.partOfDay = partOfDay;
    worldJob.open.daySeconds = seconds;
  },
  placeCar: scout.placeCar,
  drive: camp.drive,
  // Where the car and the walker stand, for a failed step's message.
  where: () => {
    const {state, course} = window.__qaApp.duel, car = course.worldAt(state.s, state.lateral), {fighter} = state;
    const {open} = state.arena.worldJob, round = value => Math.round(value * 100) / 100;
    return {car: {x: round(car.x), z: round(car.z), ground: round(state.groundHeight), mph: round(state.speedMph)},
      onFoot: state.onFoot, walker: fighter && {x: round(fighter.x), y: round(fighter.y), z: round(fighter.z)},
      partOfDay: open.partOfDay, beat: open.world.open.threads.runaway?.beat ?? null,
      talkOpen: !!document.querySelector('.story-talk:not([hidden])')};
  },
  walkAt: camp.walkAt,
  advance: camp.advance,
  // Turn the walker to look at a point, so the picture shows the moment and not the town behind.
  face: point => {
    const {fighter} = window.__qaApp.duel.state;
    fighter.yaw = Math.atan2(point.x - fighter.x, point.z - fighter.z);
  },
  interact: () => {
    const {duel} = window.__qaApp;
    duel.setInput({interact: true});
    duel.step(1 / 60);
    duel.setInput({interact: false});
    duel.step(1 / 60);
  },
  visibleClue: id => window.__render.scene.getObjectByName('Runaway ' + id)?.visible === true,
  // One step of a conversation, checked and clicked in the same call: the option with these words if it is offered, or else
  // Continue. Two calls raced the talk, which hides Continue when its options appear (Claude, 26 November 2026).
  talkReady: () => {
    const talk = document.querySelector('.story-talk:not([hidden])');
    return [...talk?.querySelectorAll('.story-options button, .story-talk-controls button:first-child') ?? []]
      .some(button => !button.disabled && !button.hidden && button.getClientRects().length);
  },
  talkStep: words => {
    const talk = document.querySelector('.story-talk:not([hidden])');
    const usable = button => !button.disabled && !button.hidden && button.getClientRects().length;
    const option = [...talk?.querySelectorAll('.story-options button') ?? []]
      .find(button => usable(button) && button.textContent.includes(words));
    if (option) { option.click(); return 'chose'; }
    const next = talk?.querySelector('.story-talk-controls button:first-child');
    if (next && usable(next)) { next.click(); return 'continued'; }
    return null;
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
  // A failed step says which one it was and where the car and the walker stood.
  const where = async (error, name, values) => Error(error.message + ' At ' + name + ' ' + JSON.stringify(values) + ': ' +
    JSON.stringify(await context.evaluate(pageSource('where')).catch(() => null)));
  const evaluate = (name, ...values) => context.evaluate(pageSource(name, ...values))
    .catch(async error => { throw await where(error, name, values); });
  const wait = (name, ...values) => context.waitFor(pageSource(name, ...values), name, 120000)
    .catch(async error => { throw await where(error, name, values); });
  const choose = async words => {
    for (let step = 0; step < 40; step++) {
      const done = await evaluate('talkStep', words);
      if (done === 'chose') return evaluate('advance', .15);
      await evaluate('advance', .05);
      await wait('talkReady');
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
  await evaluate('partOfDay', 'dawn', startOf('dawn'));
  await evaluate('placeCar', ground(parked), inGate);
  await evaluate('drive', inGate, 4, 20);
  await evaluate('drive', shedRoad, 5, 20);
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
  await evaluate('partOfDay', 'dusk', startOf('dusk'));
  await evaluate('walkAt', ground(RUNAWAY_PLACES.gate));
  await evaluate('interact');
  await choose("Take him. He's yours.");
  await wait('outcome', 'handed-back');
  await evaluate('face', RUNAWAY_PLACES['gate-entry']);
  await evaluate('advance', 3);
  await context.screenshot('clinker-at-the-gate');
}
