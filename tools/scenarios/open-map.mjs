// Laptop only. The fixture supplies what the driver already knows and a clear eastbound start.
import {mkdir, rm, writeFile} from 'node:fs/promises';
import {applyEffects} from '../../src/world/open/open-effects.js';
import {sampleWorld} from '../../src/world/open/samples.js';
import {LAND} from '../../src/world/scablands-names.js';

const fixture = applyEffects(sampleWorld('helped-camp'), {id: 'map/heard', effects: [{type: 'rumour', site: 'radio-hill'}]}).world;
// Land seed 2 puts the Glasshouse at Ships in the Sand. End the drive just northwest
// of it so the little place mark and the car arrow are distinct on both maps.
fixture.open.landSeed = 2;
const start = LAND.at('ships-in-sand', 200, 450);

function drive(world, start) {
  const {duel} = window.__qaApp, state = duel.state, job = state.arena.worldJob;
  if (job.definition.id !== 'open-roam' || !state.onFoot || job.open.world.seed !== world.seed)
    throw Error('Expected the fixed-seed roam job at the hearth.');
  job.open.world = world;
  const pose = duel.course.nearest(start.x, start.z);
  state.s = state.prevS = pose.s;
  state.lateral = state.prevLateral = pose.lateral;
  state.headingError = Math.PI / 2 - duel.course.at(pose.s).heading;
  const ground = duel.course.groundAt(pose.s, pose.lateral);
  Object.assign(state.fighter, {x: ground.x, y: ground.y, z: ground.z, groundY: ground.y, s: pose.s, lateral: pose.lateral});
  duel.setInput({interact: true});
  for (let tick = 0; tick < 240 && state.onFoot; tick++) duel.step(1 / 120);
  if (state.onFoot) throw Error('The driver could not enter the car.');
  duel.setInput({interact: false, throttle: 1, brake: 0, steer: 0});
  let at = ground;
  for (let tick = 0; tick < 120 * 120 && at.x - ground.x < 1500; tick++) {
    duel.step(1 / 120);
    at = duel.course.worldAt(state.s, state.lateral);
  }
  duel.setInput({throttle: 0, brake: 1});
  if (at.x - ground.x < 1500 || Math.abs(at.z - ground.z) > 100 || job.open.world.open.driven.length < 4)
    throw Error('The car did not drive 1.5 km east across four squares: ' + JSON.stringify(at));
}

function sheet() {
  const big = document.querySelector('.world-hud-map-canvas'), small = document.querySelector('.world-hud-minimap-canvas');
  const canvas = document.createElement('canvas');
  canvas.width = big.width + small.width;
  canvas.height = big.height;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#14120e';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(big, 0, 0);
  ctx.drawImage(small, big.width, 0);
  for (const quality of [.88, .75, .6, .45]) {
    const data = canvas.toDataURL('image/jpeg', quality).split(',')[1];
    if (data.length * .75 <= 500000) return data;
  }
  throw Error('The open map sheet exceeds 500 KB.');
}

export async function run(context) {
  await context.navigate('/tools/menu-check.html?flags=story-choices,crew-gear&seed=' + fixture.seed + '&harness=open-map');
  await context.waitFor("window.__qaApp?.duel.state.status === 'menu' && !!window.__render", 'memory-only menu', 90000);
  // The QA panel adds its temporary-player buttons after the menu is up: wait for the one this scenario uses.
  await context.waitFor("[...document.querySelectorAll('details button')].some(b => b.textContent === 'Create temporary player ready for Night 2' && !b.hidden && !b.disabled)", 'Night 2 player button', 90000);
  await context.evaluate(`(() => {
    if (!window.name.startsWith('__duel_qa_tab_v2:') || !Object.getOwnPropertyDescriptor(window, 'localStorage')?.value)
      throw Error('Open map requires the memory-only QA page.');
    const button = [...document.querySelectorAll('details button')].find(b => b.textContent === 'Create temporary player ready for Night 2');
    if (!button || button.hidden || button.disabled) throw Error('Missing temporary player fixture.');
    button.click();
    window.__qaApp.seed = ${fixture.seed};
  })()`);
  for (const action of ['wasteland-visit', 'yard-cards', 'story-open-roam']) {
    const button = 'document.querySelector(' + JSON.stringify('[data-action="' + action + '"]') + ')';
    await context.waitFor(button + '?.getClientRects().length > 0', action, 90000);
    await context.evaluate(button + '.click()');
  }
  await context.waitFor("window.__qaApp.duel.state.status === 'racing' && window.__qaApp.visualReady", 'roam ready', 120000);
  await context.evaluate(`(${drive})(${JSON.stringify(fixture)}, ${JSON.stringify(start)})`);
  // Wait for the terrain and a small-map draw at the car's new position before M pauses the job.
  await context.waitFor(`(async () => {
    const stats = document.querySelector('.world-hud').worldMapStats;
    const {pictureMs, smallDraws} = stats;
    await new Promise(resolve => setTimeout(resolve, 350));
    return pictureMs > 0 && pictureMs === stats.pictureMs && smallDraws < stats.smallDraws;
  })()`, 'finished terrain and updated small map', 120000);
  await context.evaluate("document.dispatchEvent(new KeyboardEvent('keydown', {code: 'KeyM', bubbles: true, cancelable: true}))");
  await context.waitFor("!document.querySelector('.world-hud-map').hidden && window.__qaApp.duel.state.paused", 'whole map open');
  const jpeg = await context.evaluate(`(${sheet})()`);
  const folder = new URL('../../docs/board/looks/open-map/', import.meta.url);
  await mkdir(folder, {recursive: true});
  await writeFile(new URL('round-2.jpg', folder), Buffer.from(jpeg, 'base64'));
  await rm(new URL('round-1.jpg', folder), {force: true});
}
