// The tab gets a parked, dented car and a walker just outside the forge.
// All movement, conversation, payment and repair afterwards use game controls.
import {readFile, writeFile} from 'node:fs/promises';
import {join} from 'node:path';
import {MAX_REVIEW_BYTES} from './review-sheet.mjs';
import {openRoamJob} from '../../src/world/open/roam-job.js';
import {BUILDINGS} from '../../src/world/open/content/buildings.js';
import {pointInBuilding} from '../../src/world/open/building-rule.js';
import {scablandsSurfaceHeightAt} from '../../src/world/scablands-ground.js';

export const pageFunctions = {
  ready: () => window.__qaApp?.duel.state.status === 'menu' && !!window.__render &&
    !!document.querySelector('.qa-temporary-saves'),
  enter: () => {
    if (!window.name.startsWith('__duel_qa_tab_v2:') || !window.__qaMemoryBackupStore) throw Error('The forge drive needs memory-only storage.');
    document.querySelector('.qa-temporary-saves').hidden = true;
    const app = window.__qaApp;
    app.profile = {...app.profile, wasteland: {...app.profile.wasteland, discoveredGate: true, scrap: 60}};
    if (!app._saveProfile()) throw Error('The memory-only fixture could not be staged.');
    if (!app.visitWasteland()) throw Error('The yard could not open.');
  },
  yard: () => window.__qaApp.isYardHomeActive(),
  start: () => {
    const app = window.__qaApp;
    if (!app.startOpenRoam()) throw Error('The outing could not start.');
    // The day pictures are taken in daytime: at dawn the Runaway can put Slack in the wash shed's doorway, as
    // test-open-doors found (QA-OPEN-DOORS-WASH, 26 November 2026).
    app.duel.state.arena.worldJob.open.daySeconds = 2 * 60;
  },
  startDark: job => {
    const app = window.__qaApp;
    if (!app._startArenaFight({venueId: 'scablands', mode: 'world-job', opponents: 0, job}))
      throw Error('The after-dark outing could not start.');
    const course = app.duel.course;
    course.def = {...course.def, timeOfDay: 'night'};
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
  inside: (id, phase) => {
    const state = window.__qaApp.duel.state, render = window.__render;
    const job = state.arena.worldJob, room = render.scene.getObjectByName(id);
    if (job.open.parts.buildings?.inside !== id || room?.getObjectByName(id + '/roof')?.visible !== false)
      return false;
    const signature = id === 'forge-shed' ? 'hearth' : 'floor-drain';
    const prompt = document.querySelector('.combat-foot-action');
    const host = render.renderer.domElement.parentElement;
    const atNight = host.dataset.lightingMood === 'night';
    return !!room.getObjectByName(signature) && room.getObjectByName('Doorway light')?.visible &&
      state.footGear?.name === 'LONGHORN RPG' && prompt?.textContent === '' &&
      (job.definition.open.partOfDay ?? 'day') === phase && atNight === (phase === 'dark') &&
      (phase !== 'dark' || render.scene.environmentIntensity < .36);
  },
  speak: () => {
    const duel = window.__qaApp.duel;
    duel.setInput({interact: true});
    duel.step(1/120);
    duel.setInput({interact: false});
  },
  line: words => document.querySelector('.story-talk:not([hidden]) .story-words')?.textContent.includes(words) &&
    !!document.querySelector('.story-talk:not([hidden]) .story-talk-controls button:not(:disabled):not([hidden])'),
  next: () => document.querySelector('.story-talk:not([hidden]) .story-talk-controls button').click(),
  offered: () => Array.from(document.querySelectorAll('.story-talk:not([hidden]) .story-options button:not(:disabled)')).some(b => b.textContent.includes('Yes, please mend it.')),
  pay: () => Array.from(document.querySelectorAll('.story-talk:not([hidden]) .story-options button:not(:disabled)')).find(b => b.textContent.includes('Yes, please mend it.')).click(),
  repaired: () => {
    const s = window.__qaApp.duel.state;
    return s.arena.worldJob.open.world.scrap === 54 && s.armor === s.maxArmor;
  },
  roaming: () => window.__qaApp.duel.state.arena.worldJob.job.steps[0]?.kind === 'roam',
  outside: id => window.__qaApp.duel.state.arena.worldJob.open.parts.buildings.inside === null &&
    window.__render.scene.getObjectByName(id + '/roof')?.visible === true,
  sheet: async (shots, maxBytes) => {
    const canvas = document.createElement('canvas');
    const width = 800;
    const images = await Promise.all(shots.map(async shot => {
      const image = new Image();
      image.src = shot.uri;
      await image.decode();
      return image;
    }));
    const height = Math.round(width * images[0].height / images[0].width);
    canvas.width = 2 * width;
    canvas.height = 2 * (height + 32);
    const brush = canvas.getContext('2d');
    brush.fillStyle = '#201e1a';
    brush.fillRect(0,0,canvas.width,canvas.height);
    brush.font = '18px sans-serif';
    brush.fillStyle = '#fff5de';
    images.forEach((image,i) => {
      const x = (i % 2) * width, y = Math.floor(i / 2) * (height + 32);
      brush.fillText(shots[i].label,x + 12,y + 22);
      brush.drawImage(image,x,y + 32,width,height);
    });
    for (const quality of [.88,.78,.68,.58,.48]) {
      const bytes = canvas.toDataURL('image/jpeg',quality).split(',')[1];
      if (bytes.length * 3 / 4 <= maxBytes) return bytes;
    }
    throw Error('The four views exceed the review sheet budget.');
  },
};
export function pageSource(name, ...args) {
  const source = '(' + pageFunctions[name].toString() + ')(...' + JSON.stringify(args) + ')';
  new Function('return ' + source);
  return source;
}
export async function run(context) {
  const page = (name,...args) => context.evaluate(pageSource(name,...args));
  const wait = (name,...args) => context.waitFor(pageSource(name,...args),name,90000);
  const shots = [];
  for (const phase of ['day','dark']) {
    await context.navigate('/tools/menu-check.html?flags=hidden-road,story-everburn,story-choices&harness=open-forge-shed');
    await wait('ready');
    await page('enter');
    await wait('yard');
    if (phase === 'day') await page('start');
    else {
      const job = openRoamJob({wasteland:{scrap:60}});
      job.open.partOfDay = phase;
      await page('startDark',job);
    }
    await wait('racing');
    for (const shed of BUILDINGS) {
      const street = pointInBuilding(shed,[0,shed.size[1]/2+1]);
      await page('park',street,scablandsSurfaceHeightAt(street.x,street.z),pointInBuilding(shed,shed.carBay.at));
      await page('walk',true);
      await wait('inside',shed.id,phase);
      const path = await context.screenshot(shed.id + '-' + phase);
      const label = (shed.id === 'forge-shed' ? "Odessa’s forge" : "Moss’s wash shed") + ' · ' + phase;
      shots.push({label, uri:'data:image/png;base64,' + (await readFile(path)).toString('base64')});
      if (phase === 'day' && shed.id === 'forge-shed') {
        await page('speak');
        await wait('line','6 scrap');
        await page('next');
        await wait('offered');
        await page('pay');
        await wait('line','every panel');
        await wait('repaired');
        await page('next');
        await wait('roaming');
      }
      await page('walk',false);
      await wait('outside',shed.id);
    }
  }
  const jpeg = await page('sheet',shots,MAX_REVIEW_BYTES);
  await writeFile(join(context.outputDir,'round-2.jpg'),Buffer.from(jpeg,'base64'));
}
