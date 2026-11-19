// Laptop review of the ordinary Story Wall. Positioning in each branch is
// for repeatable screenshots. The native scripted watch proves navigation.
import {NIGHT_2_SITES as sites} from '../../src/world/jobs/night-2-sites.js';
import {namedThrow, createLedger} from '../../src/story/ledger.js';
import {night2Opening} from '../../src/world/jobs/night-2.js';

let theftSeed = 1;
while (!namedThrow(createLedger(night2Opening(theftSeed)), 'night-2/dace-steals', .5)) theftSeed++;

export const pageFunctions = {
  ready: () => window.__qaApp?.duel.state.status === 'menu' && !!window.__render,
  prepare: seed => {
    if (!window.name.startsWith('__duel_qa_tab_v2:')) throw Error('Memory-only storage is required.');
    const button = [...document.querySelectorAll('details button')]
      .find(button => button.textContent === 'Create temporary player ready for Night 2');
    if (!button || button.hidden) throw Error('Missing Night 2 QA player button.');
    button.click();
    document.querySelector('[data-action="wasteland-visit"]').click();
    window.__qaApp.seed = seed;
  },
  control: (action, click = false) => {
    const el = document.querySelector('[data-action="' + action + '"]');
    if (click) el.click();
    return Boolean(el && !el.hidden);
  },
  step: (id, phase) => {
    const {worldJob: world} = window.__qaApp.duel.state.arena ?? {};
    if (world?.job.steps[world.job.stepIndex]?.id !== id) return false;
    const talk = document.querySelector('.story-talk');
    return !phase || !talk?.hidden && talk?.dataset.phase === phase;
  },
  continue: () => document.querySelector('.story-talk:not([hidden]) .story-talk-controls button:first-child')?.click(),
  choose: words => {
    const button = [...document.querySelectorAll('.story-options button')].find(button => button.textContent.includes(words));
    if (!button || button.disabled) throw Error('Missing available choice: ' + words);
    button.click();
  },
  at: (point, face) => {
    const {duel} = window.__qaApp, fighter = duel.state.fighter;
    const {x,y,z} = point.position ?? point;
    const {s,lateral} = duel.course.nearest(x,z);
    const yaw = face === undefined ? fighter.yaw : face;
    Object.assign(fighter, {x, y, z, groundY: y, s, lateral, yaw});
  },
  gateCast: () => {
    const {scene} = window.__render;
    const wim = scene.getObjectByName('story-bubble-wim');
    const carts = ['walker-1', 'walker-3', 'walker-6', 'walker-8']
      .every(id => scene.getObjectByName('story-handcart-' + id)?.visible === true);
    const {worldJob: world} = window.__qaApp.duel.state.arena;
    if (!wim || !carts) return false;
    if (world.storyPeople.find(person => person.id === 'wim').seat !== 'handcart' ||
        scene.getObjectByName('Camp stool')?.visible)
      throw Error('Wim needs to be sitting on the cart.');
    return true;
  },
  wordsFit: () => {
    const talk = document.querySelector('.story-talk:not([hidden])');
    if (!talk) return false;
    for (const voice of talk.querySelectorAll('.story-speech:not([hidden]), .story-options:not([hidden])')) {
      if (!voice.offsetWidth) continue;
      const rect = voice.getBoundingClientRect();
      if (rect.left < 0 || rect.top < 0 || rect.bottom > innerHeight || rect.right > innerWidth)
        throw Error('Clipped dialogue: ' + voice.innerText);
    }
    return true;
  },
  scoutFire: () => {
    const {duel} = window.__qaApp, {worldJob} = duel.state.arena;
    const scout = worldJob.actors.find(actor => actor.brandAsh);
    const point = {x: scout.x, y: scout.y, z: scout.z + 3};
    const {s,lateral} = duel.course.nearest(point.x, point.z);
    Object.assign(duel.state.fighter, point, {s,lateral,groundY: point.y, yaw: Math.PI, pitch: 0});
    window.__qaApp._footPointer.fire = true;
  },
  scoutTurned: () => window.__qaApp.duel.state.arena.worldJob.night2.scoutTurned === true,
  releaseFire: () => { window.__qaApp._footPointer.fire = false; },
  ledger: () => {
    const page = document.querySelector('.story-ledger');
    return window.__qaApp.profile.story?.ledger?.night === 3 &&
      page?.innerText.includes('What people remember') && !!page.querySelector('.ledger-tonight') &&
      !/Raiding|Watching|Friendly|night-2\/dace-steals/.test(page.innerText);
  },
};

export const pageSource = (name, ...args) =>
  '(' + pageFunctions[name].toString() + ')(' + args.map(arg => JSON.stringify(arg)).join(',') + ')';

export async function run(context) {
  const evaluate = (name, ...args) => context.evaluate(pageSource(name, ...args));
  const wait = (name, ...args) => context.waitFor(pageSource(name, ...args), name + ' ' + args.join(' '), 90000);
  const click = async action => { await wait('control', action); await evaluate('control', action, true); };
  async function advance(id, times) {
    for (let i = 0; i < times; i++) {
      await wait('step', id, 'lines');
      await evaluate('wordsFit');
      await evaluate('continue');
    }
  }
  async function reachGate() {
    await context.navigate('/tools/menu-check.html?flags=hidden-road,story-choices,crew-gear,warlord-cards&harness=story-night-2');
    await wait('ready');
    await evaluate('prepare', theftSeed);
    await click('yard-cards');
    await click('story-night-2');
    await advance('hearth', 4);
    await wait('step', 'walk-to-gate');
    await evaluate('at', sites.gateTalk);
    await wait('step', 'gate', 'lines');
    await wait('gateCast');
  }
  async function gateOptions() {
    await advance('gate', 7);
    for (let i = 0; i < 2; i++) {
      await wait('step', 'gate', 'thoughts');
      await evaluate('continue');
    }
    await wait('step', 'gate', 'options');
    await evaluate('wordsFit');
  }

  await reachGate();
  await context.screenshot('night-2-at-the-gate');
  await gateOptions();
  await context.screenshot('night-2-prices');
  await evaluate('choose', 'Take one. No terms.');
  await advance('gift', 4);
  await advance('theft', 1);
  await wait('step', 'chase');
  await context.waitFor("document.querySelector('.night-2-alternative-route')?.hidden === false", 'both chase routes', 12000);
  await context.screenshot('night-2-chase');

  await reachGate();
  await gateOptions();
  await evaluate('choose', "for two nights' watch");
  await advance('watch', 4);
  await wait('step', 'walk-watch-post');
  await evaluate('at', sites.watchPost);
  await advance('whistle', 1);
  await wait('step', 'scout');
  await context.screenshot('night-2-scout');
  await evaluate('scoutFire');
  await wait('scoutTurned');
  await evaluate('releaseFire');
  await advance('scout-stopped', 1);
  await advance('close', 1);
  await wait('ledger');
  await context.screenshot('night-2-ledger');

  await reachGate();
  await gateOptions();
  await evaluate('choose', 'Come inside.');
  await advance('inside', 5);
  await advance('lamp', 1);
  await wait('step', 'light-pump');
  await evaluate('at', sites.hearthFront);
  await context.waitFor('window.__qaApp.duel.state.arena.worldJob.job.stepState.brandSeconds > 0', 'the brand', 12000);
  await evaluate('at', {x: sites.pump.position.x + 1.6, y: sites.pump.position.y, z: sites.pump.position.z});
  await context.screenshot('night-2-pump-lamp');

  await reachGate();
  await gateOptions();
  await evaluate('choose', "I can't.");
  await advance('refuse', 4);
  await wait('step', 'refuse', 'options');
  await evaluate('choose', 'The Dead Mall has a roof.');
  await advance('tell-mall', 1);
  await wait('step', 'tower', 'lines');
  await context.screenshot('night-2-tower');
}
