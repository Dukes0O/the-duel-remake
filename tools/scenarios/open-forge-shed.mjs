// The tab gets a parked, dented car and a walker just outside the forge.
// All movement, conversation, payment and repair afterwards use game controls.
import {BUILDINGS} from '../../src/world/open/content/buildings.js';
import {pointInBuilding} from '../../src/world/open/building-rule.js';
import {scablandsSurfaceHeightAt} from '../../src/world/scablands-ground.js';

const forge = BUILDINGS.find(row => row.id === 'forge-shed');
const street = pointInBuilding(forge, [0, forge.size[1]/2 + 1]);
const bay = pointInBuilding(forge, forge.carBay.at);
export const pageFunctions = {
  ready: () => window.__qaApp?.duel.state.status === 'menu' && !!window.__render,
  enter: () => {
    if (!window.name.startsWith('__duel_qa_tab_v2:')) throw Error('The forge drive needs memory-only storage.');
    const app = window.__qaApp;
    app.profile = {...app.profile, wasteland: {...app.profile.wasteland, discoveredGate: true, scrap: 60}};
    if (!app._saveProfile()) throw Error('The memory-only fixture could not be staged.');
    if (!app.visitWasteland()) throw Error('The yard could not open.');
  },
  yard: () => window.__qaApp.isYardHomeActive(),
  start: () => {
    const app = window.__qaApp;
    if (!app.startOpenRoam()) throw Error('The outing could not start.');
  },
  park: (street, floor, bay) => {
    const {state, course} = window.__qaApp.duel, pose = course.nearest(bay.x,bay.z);
    Object.assign(state, {s: pose.s, prevS: pose.s, lateral: pose.lateral, prevLateral: pose.lateral,
      armor: state.maxArmor - 30});
    Object.assign(state.fighter, course.nearest(street.x,street.z), street, {y: floor, groundY: floor, yaw: Math.PI});
  },
  racing: () => window.__qaApp.duel.state.status === 'racing',
  walk: forward => {
    const duel = window.__qaApp.duel;
    duel.setFighterInput({forward, back: !forward});
    for (let i = 0; i < 85; i++) duel.step(1/120);
    duel.setFighterInput({forward: false, back: false});
  },
  inside: () => {
    const roof = window.__render.scene.getObjectByName('forge-shed/roof');
    return window.__qaApp.duel.state.arena.worldJob.open.parts.buildings?.inside === 'forge-shed' &&
      roof?.visible === false && !!window.__render.scene.getObjectByName('anvil');
  },
  speak: () => {
    const duel = window.__qaApp.duel;
    duel.setInput({interact: true});
    duel.step(1/120);
    duel.setInput({interact: false});
  },
  line: words => document.querySelector('.story-talk:not([hidden]) .story-words')?.textContent.includes(words),
  next: () => document.querySelector('.story-talk-controls button').click(),
  offered: () => Array.from(document.querySelectorAll('.story-options button')).some(b => b.textContent.includes('Yes, please mend it.')),
  pay: () => Array.from(document.querySelectorAll('.story-options button')).find(b => b.textContent.includes('Yes, please mend it.')).click(),
  repaired: () => {
    const s = window.__qaApp.duel.state;
    return s.arena.worldJob.open.world.scrap === 54 && s.armor === s.maxArmor;
  },
  roaming: () => window.__qaApp.duel.state.arena.worldJob.job.steps[0]?.kind === 'roam',
  outside: () => window.__qaApp.duel.state.arena.worldJob.open.parts.buildings.inside === null &&
    window.__render.scene.getObjectByName('forge-shed/roof')?.visible === true,
};
export function pageSource(name, ...args) {
  const source = '(' + pageFunctions[name].toString() + ')(...' + JSON.stringify(args) + ')';
  new Function('return ' + source);
  return source;
}
export async function run(context) {
  const page = (name,...args) => context.evaluate(pageSource(name,...args));
  const wait = (name,...args) => context.waitFor(pageSource(name,...args),name,90000);
  await context.navigate('/tools/menu-check.html?flags=hidden-road,story-everburn,story-choices&harness=open-forge-shed');
  await wait('ready');
  await page('enter');
  await wait('yard');
  await page('start');
  await wait('racing');
  await page('park', street, scablandsSurfaceHeightAt(street.x,street.z), bay);
  await page('walk',true);
  await wait('inside');
  await context.screenshot('open-forge-room');
  await page('speak');
  await wait('line','6 scrap');
  await page('next');
  await wait('offered');
  await page('pay');
  await wait('line','every panel');
  await wait('repaired');
  await page('next');
  await wait('roaming');
  await page('walk',false);
  await wait('outside');
}
