// Five views of the conversation itself. The in-memory tab borrows Auntie's
// shipped figure and places it at the gate, before Night 2 supplies its cast.
import {TIN_TOWN_GATE} from '../../src/world/tin-town-gate.js';
import {scablandsSurfaceHeightAt} from '../../src/world/scablands-ground.js';

const feet = {x: TIN_TOWN_GATE.x + 2, z: TIN_TOWN_GATE.z + 4};
feet.y = scablandsSurfaceHeightAt(feet.x, feet.z);
const carStart = {x: feet.x, z: feet.z + 6, heading: Math.PI};
const scene = {stocks: {embers: 4}, lines: [
  {speaker: 'auntie-solder', words: "That's the gate bell. I forgot we had a gate bell."},
  {speaker: 'cinder', words: 'Eleven people. Blankets for about six. It freezes tonight.', radio: true}],
  thoughts: ["If I give one, that's three nights. And Bess isn't back yet.", "I wonder what happens to eleven people out there if I don't."],
  questions: [{id: 'road', words: 'Where are you going?', lines: [{speaker: 'rell', words: 'The south pans, over the Girder Bridge.'}]}],
  choices: [{id: 'give', words: 'Take one. No terms.', thought: 'Kindness travels. I wonder who else is on that road.',
    plain: {stock: 'embers', before: 4, after: 3}, effects: [{type: 'stock', stock: 'embers', by: -1}]},
    {id: 'refuse', words: "I can't. Four embers, four nights.", effects: []}]};

export const pageFunctions = {
  ready: () => window.__qaApp?.duel.state.status === 'menu' && !!window.__render,
  enterYard: () => {
    if (!window.name.startsWith('__duel_qa_tab_v2:')) throw Error('Memory-only storage is required.');
    const app = window.__qaApp;
    app.profile = {...app.profile, wasteland: {...app.profile.wasteland, version: 1, discoveredGate: true}};
    app._saveProfile();
    document.querySelector('#wasteland-visit').click();
  },
  yard: () => window.__qaApp.isYardHomeActive(),
  start: (scene, feet, carStart) => {
    const step = {kind: 'talk', carStart, scene, anchors: {'auntie-solder': {...feet, y: feet.y + 1.7}}};
    const ok = window.__qaApp._startArenaFight({venueId: 'scablands', mode: 'world-job', opponents: 0,
      job: {id: 'story-talk-review', title: 'At the gate', steps: [step]}});
    if (!ok) throw Error('The review conversation could not start.');
  },
  loaded: () => !!document.querySelector('.story-talk:not([hidden]) .story-words')?.textContent &&
    !!window.__render.scene.getObjectByName('Auntie Solder at the forge')?.children.length,
  placeActor: feet => {
    const {scene} = window.__render;
    const rig = scene.getObjectByName('Auntie Solder at the forge');
    const actor = rig.children[0], anchor = rig.clone(false);
    actor.position.x += feet.x;
    actor.position.y += feet.y;
    actor.position.z += feet.z;
    scene.add(actor);
    anchor.name = 'story-bubble-auntie-solder';
    anchor.visible = true;
    anchor.position.set(feet.x, feet.y + 1.7, feet.z);
    scene.add(anchor);
    window.__render.renderFrame();
  },
  press: (code, type) => {
    window.dispatchEvent(new KeyboardEvent(type, {code, bubbles: true, cancelable: true}));
  },
  state: (phase, text) => {
    const root = document.querySelector('.story-talk');
    return !root?.hidden && root?.dataset.phase === phase && root.innerText.includes(text);
  },
  visible: selector => {
    const el = document.querySelector(selector);
    if (!el?.offsetWidth) return false;
    const rect = el.getBoundingClientRect();
    return rect.top >= 0 && rect.left >= 0 && rect.bottom <= innerHeight && rect.right <= innerWidth;
  },
  cancelPreviewOnBlur: () => {
    const app = window.__qaApp;
    window.dispatchEvent(new Event('blur'));
    if (app.duel.state.paused) app.togglePause();
    window.dispatchEvent(new KeyboardEvent('keyup', {code: 'Digit2', bubbles: true}));
    app.advance(1 / 60);
    return document.querySelector('.story-stock strong')?.textContent === '4' &&
      app.duel.state.arena.worldJob.job.stepState.screen?.phase === 'options';
  },
  stockPreview: () => document.querySelector('.story-stock.is-changing strong')?.textContent === '3' &&
    window.__qaApp.duel.state.arena.worldJob.job.stepState.screen.stocks.embers === 4,
};

export function pageSource(name, ...args) {
  const source = '(' + pageFunctions[name].toString() + ')(...' + JSON.stringify(args) + ')';
  new Function('return ' + source);
  return source;
}

export async function run(context) {
  const page = (name, ...args) => context.evaluate(pageSource(name, ...args));
  const wait = (name, args, why, ms = 10000) => context.waitFor(pageSource(name, ...args), why, ms);
  async function next(phase, text) {
    await page('press', 'Space', 'keydown');
    await page('press', 'Space', 'keyup');
    await wait('state', [phase, text], text);
  }
  await context.navigate('/tools/menu-check.html?flags=hidden-road,story-everburn,story-choices&harness=story-talk');
  await wait('ready', [], 'the memory-only menu', 60000);
  await page('enterYard');
  await wait('yard', [], 'the yard', 60000);
  await page('start', scene, feet, carStart);
  await wait('loaded', [], 'conversation and character art', 120000);
  await page('placeActor', feet);
  await wait('visible', ['.story-speech:not(.radio)'], 'a speech bubble inside the viewport');
  await context.screenshot('story-talk-gate');
  await next('lines', 'Eleven people.');
  await wait('visible', ['.story-speech.radio'], 'radio bubble');
  await context.screenshot('story-talk-radio');
  await next('thoughts', "If I give one");
  await next('thoughts', 'I wonder what happens');
  await context.screenshot('story-talk-thoughts');
  await next('options', 'Take one. No terms.');
  await context.screenshot('story-talk-options');
  await page('press', 'Digit2', 'keydown');
  await wait('stockPreview', [], 'a preview of three embers while four are still held');
  await context.screenshot('story-talk-ember');
  if (!await page('cancelPreviewOnBlur')) throw Error('Losing focus committed or kept the preview.');
}
