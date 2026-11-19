// Laptop review of the ordinary Story Wall. Positioning in each branch is
// for repeatable screenshots. The native scripted watch proves navigation.
import {NIGHT_2_SITES as sites} from '../../src/world/jobs/night-2-sites.js';
import {namedThrow, createLedger} from '../../src/story/ledger.js';
import {night2Opening} from '../../src/world/jobs/night-2.js';

let theftSeed = 1;
while (!namedThrow(createLedger(night2Opening(theftSeed)), 'night-2/dace-steals', .5)) theftSeed++;

export const pageFunctions = {
  ready: () => window.__qaApp?.duel.state.status === 'menu' && !!window.__render &&
    [...document.querySelectorAll('details button')].some(button =>
      button.textContent === 'Create temporary player ready for Night 2' && !button.hidden && !button.disabled),
  prepare: seed => {
    if (!window.name.startsWith('__duel_qa_tab_v2:')) throw Error('Memory-only storage is required.');
    const button = [...document.querySelectorAll('details button')]
      .find(button => button.textContent === 'Create temporary player ready for Night 2');
    if (!button || button.hidden) throw Error('Missing Night 2 QA player button.');
    button.click();
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
    return !phase || !talk?.hidden && talk?.dataset.scene === id && talk.dataset.phase === phase;
  },
  renderedTurn: (id, phase, after = null, click = false) => {
    const {worldJob: world} = window.__qaApp.duel.state.arena ?? {};
    const talk = document.querySelector('.story-talk:not([hidden])');
    const page = world?.job.stepState.screen;
    const turn = talk?.dataset.turn;
    if (world?.job.steps[world.job.stepIndex]?.id !== id || page?.phase !== phase ||
        talk?.dataset.scene !== id || talk.dataset.phase !== phase || !turn || turn === after) return false;
    const shown = phase === 'thoughts' ? talk.querySelector('.story-thoughts')?.lastElementChild?.textContent
      : talk.querySelector('.story-words')?.textContent;
    const expected = phase === 'thoughts' ? page.thoughts.at(-1) : page.line?.words;
    if (!expected || shown !== expected || world.talkAction) return false;
    if (click) talk.querySelector('.story-talk-controls button:first-child').click();
    return turn;
  },
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
  gateChoicesClear: () => {
    const options = document.querySelector('.story-talk[data-scene="gate"] .story-options');
    if (!options || options.children.length !== 7) throw Error('The gate should show seven options.');
    const box = options.getBoundingClientRect();
    const {camera} = window.__render;
    const {worldJob: world} = window.__qaApp.duel.state.arena;
    const vector = camera.position.clone();
    const feet = world.storyPeople.filter(person => !['auntie-solder', 'cinder'].includes(person.id))
      .map(({position}) => (1 - vector.set(position.x, position.y, position.z).project(camera).y) / 2 * innerHeight);
    const gap = box.top - Math.max(...feet);
    if (innerWidth !== 1280 || innerHeight !== 720 || gap < 4 ||
        box.bottom > innerHeight || options.scrollHeight > options.clientHeight)
      throw Error('Gate choices cover the cast or are clipped: ' + JSON.stringify({viewport: [innerWidth, innerHeight], gap}));
    return true;
  },
  scoutAim: () => {
    const {duel} = window.__qaApp, {worldJob} = duel.state.arena;
    const scout = worldJob.actors.find(actor => actor.brandAsh);
    const point = {x: scout.x, y: scout.y, z: scout.z + 3};
    const {s,lateral} = duel.course.nearest(point.x, point.z);
    Object.assign(duel.state.fighter, point, {s,lateral,groundY: point.y, yaw: Math.PI, pitch: 0});
  },
  scoutTurned: () => window.__qaApp.duel.state.arena.worldJob.night2.scoutTurned === true,
  canvasPressPoint: () => {
    const canvas = document.querySelector('#view3d canvas');
    const rect = canvas.getBoundingClientRect();
    const x = Math.round(rect.left + rect.width / 2), y = Math.round(rect.top + rect.height / 2);
    if (document.elementFromPoint(x, y) !== canvas) throw Error('Night 2 mouse target is covered.');
    return {x, y};
  },
  peacefulPress: () => {
    const app = window.__qaApp, state = app.duel.state;
    if (!app._footPointer.fire || !state.arena.worldJob.night2.holstered || state.footWeapons.selected !== 'rpg')
      throw Error('The mouse press did not reach the peaceful RPG guard.');
    const {ammo, serial} = state.footWeapons;
    app.advance(.08);
    if (state.footWeapons.ammo !== ammo || state.footWeapons.serial !== serial ||
        state.combat.projectiles.some(projectile => projectile.kind === 'rpg'))
      throw Error('The peaceful mouse press fired a rocket.');
    return true;
  },
  pumpDirection: () => {
    const {worldJob: world} = window.__qaApp.duel.state.arena;
    return world.night2.routes[0]?.name === 'The pump lamp' && !!world.marker &&
      document.querySelector('.world-hud-line').textContent === 'Carry the brand to the pump lamp.';
  },
  towerLights: () => {
    const {camera, scene} = window.__render;
    const {worldJob: world} = window.__qaApp.duel.state.arena;
    const eye = world.night2.camera?.position;
    const fires = scene.getObjectByName('Walkers’ camp fires');
    return eye && Math.abs(camera.position.x - eye.x) < .01 && Math.abs(camera.position.y - eye.y) < .01 &&
      fires?.visible && fires.children.every(fire => fire.visible) && [1, 2, 3].every(index =>
      scene.getObjectByName('Wash rider ' + index + ' lights')?.visible);
  },
  towerOptions: () => {
    const buttons = [...document.querySelectorAll('.story-talk[data-scene="tower"] .story-options button')];
    if (buttons.length !== 2 || buttons.some(button => button.disabled) ||
        !buttons[0].textContent.includes('Rell will probably turn Clinker down.') ||
        !buttons[1].textContent.includes('Carry one ember out to them'))
      throw Error('Slice A tower choices still show a missing fight or an unclear Watch hint.');
    return true;
  },
  ledger: () => {
    const page = document.querySelector('.story-ledger');
    return window.__qaApp.profile.story?.ledger?.night === 3 &&
      page?.innerText.includes('What people remember') && !!page.querySelector('.ledger-tonight') &&
      !/Raiding|Watching|Friendly|night-2\/dace-steals/.test(page.innerText);
  },
};

export const pageSource = (name, ...args) =>
  '(' + pageFunctions[name].toString() + ')(' + args.map(arg => JSON.stringify(arg)).join(',') + ')';

export async function advanceNight2Dialogue(context, id, phase, times) {
  let previous = null;
  for (let i = 0; i < times; i++) {
    await context.waitFor(pageSource('renderedTurn', id, phase, previous), id + ' rendered ' + phase, 90000);
    if (!await context.evaluate(pageSource('wordsFit'))) throw Error('Dialogue is hidden in ' + id);
    const turn = await context.evaluate(pageSource('renderedTurn', id, phase, previous, true));
    if (!turn) throw Error('Dialogue changed before Continue in ' + id);
    previous = turn;
  }
}

export async function run(context) {
  const evaluate = (name, ...args) => context.evaluate(pageSource(name, ...args));
  const wait = (name, ...args) => context.waitFor(pageSource(name, ...args), name + ' ' + args.join(' '), 90000);
  const click = async action => { await wait('control', action); await evaluate('control', action, true); };
  const advance = (id, times) => advanceNight2Dialogue(context, id, 'lines', times);
  await context.command('Emulation.setDeviceMetricsOverride', {width: 1280, height: 720, deviceScaleFactor: 1, mobile: false});
  async function reachGate() {
    await context.navigate('/tools/menu-check.html?flags=hidden-road,story-choices,crew-gear,warlord-cards&harness=story-night-2');
    await wait('ready');
    await evaluate('prepare', theftSeed);
    await click('wasteland-visit');
    await click('yard-cards');
    await click('story-night-2');
    await advance('hearth', 4);
    await wait('step', 'walk-to-gate');
    await evaluate('at', sites.gateTalk);
    await wait('step', 'gate', 'lines');
    await wait('gateCast');
  }
  async function leftMouse(type, point) {
    await context.command('Input.dispatchMouseEvent', {...point, type, button: 'left', clickCount: 1,
      buttons: type === 'mousePressed' ? 1 : 0});
  }
  async function gateOptions() {
    await advance('gate', 7);
    await advanceNight2Dialogue(context, 'gate', 'thoughts', 2);
    await wait('step', 'gate', 'options');
    await evaluate('wordsFit');
    await evaluate('gateChoicesClear');
  }

  await reachGate();
  await context.screenshot('night-2-at-the-gate');
  await gateOptions();
  await context.screenshot('night-2-prices');
  await evaluate('choose', 'Take one. No terms.');
  await advance('gift', 4);
  await advance('theft', 1);
  await wait('step', 'reach-store');
  await evaluate('at', sites.storeApproach);
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
  await evaluate('scoutAim');
  const scoutPoint = await evaluate('canvasPressPoint');
  await leftMouse('mousePressed', scoutPoint);
  await wait('scoutTurned');
  await leftMouse('mouseReleased', scoutPoint);
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
  await wait('pumpDirection');
  await evaluate('at', {x: sites.pump.position.x + 1.6, y: sites.pump.position.y, z: sites.pump.position.z});
  const pumpPoint = await evaluate('canvasPressPoint');
  await leftMouse('mousePressed', pumpPoint);
  await evaluate('peacefulPress');
  await leftMouse('mouseReleased', pumpPoint);
  await wait('step', 'back-to-hearth');
  await context.screenshot('night-2-pump-lamp');
  await evaluate('at', sites.hearthApproach);
  await wait('step', 'at-hearth', 'lines');
  await context.screenshot('night-2-back-at-the-hearth');

  await reachGate();
  await gateOptions();
  await evaluate('choose', "I can't.");
  await advance('refuse', 4);
  await wait('step', 'refuse', 'options');
  await evaluate('choose', 'The Dead Mall has a roof.');
  await advance('tell-mall', 1);
  await wait('step', 'tower', 'lines');
  await wait('towerLights');
  await context.screenshot('night-2-tower');
  await advance('tower', 1);
  await wait('step', 'tower', 'options');
  await evaluate('towerOptions');
}
