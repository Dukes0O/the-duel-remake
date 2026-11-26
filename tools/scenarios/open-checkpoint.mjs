// OPEN-CHECKPOINTS: the real roam job and one Easy fight on the Mall Road, with an isolated player.
import assert from 'node:assert/strict';
import {OPEN_CHECKPOINTS} from '../../src/world/open/checkpoint-rule.js';
import {ROAD_NET, roadPointFrom} from '../../src/world/scablands-road.js';

export const seed = 284;
const mall = OPEN_CHECKPOINTS.find(row => row.id === 'mall-road-1');
const road = ROAD_NET.road(mall.at.road);
export const approach = roadPointFrom(road, mall.position.x, mall.position.z, -(mall.radius + 12));
const heading = Math.atan2(mall.position.x - approach.x, mall.position.z - approach.z);

export const pageFunctions = {
  ready: () => !!window.__qaApp && !!window.__render && window.__qaApp.duel.state.status === 'menu' &&
    !document.querySelector('#start-engine')?.disabled &&
    // The QA panel adds its temporary-player buttons after the menu is up.
    [...document.querySelectorAll('details button')].some(item =>
      item.textContent === 'Create temporary player who has found the wasteland' && !item.hidden && !item.disabled),
  prepare: seed => {
    if (!window.name.startsWith('__duel_qa_tab_v2:')) throw Error('Memory-only storage is required.');
    const button = [...document.querySelectorAll('details button')]
      .find(item => item.textContent === 'Create temporary player who has found the wasteland');
    button.click();
    const app = window.__qaApp;
    app.seed = seed;
    app.cpuDifficulty = 'easy';
    if (!app.visitWasteland()) throw Error('Could not visit the Wasteland.');
  },
  atYard: () => window.__qaApp.isYardHomeActive(),
  start: seed => {
    window.__qaApp.seed = seed;
    if (!window.__qaApp.startOpenRoam()) throw Error('Could not start roam from the yard.');
  },
  loaded: () => window.__qaApp.duel.state.status === 'racing' &&
    window.__qaApp.duel.state.arena?.worldJob?.definition.id === 'open-roam' &&
    window.__render.scene.getObjectByName('The Scablands')?.userData.assetStatus === 'ready',
  cross: (at, heading) => {
    const app = window.__qaApp, duel = app.duel, state = duel.state, world = state.arena.worldJob;
    app.stop();
    // A previous outing taught the first pass. This is the first crossing on the Mall Road.
    world.open.world.open.crossings['east-road-1'] = 1;
    const near = duel.course.nearest(at.x, at.z);
    Object.assign(state, {s:near.s, prevS:near.s, lateral:near.lateral, prevLateral:near.lateral,
      headingError:heading - duel.course.at(near.s).heading, groundHeight:near.y, prevGroundHeight:near.y,
      onFoot:false, fighter:null, footPresentation:null, speedMph:0});
    for (let tick = 0; tick < 300 && !world.riderFight; tick++) {
      duel.setInput({throttle:1, steer:0});
      duel.step(1 / 60);
    }
    duel.setInput({throttle:0, brake:1, steer:0});
    return {difficulty:state.cpuDifficulty, count:world.riderFight?.riders.length,
      crossings:world.open.world.open.crossings['mall-road-1']};
  },
  win: () => {
    const {duel} = window.__qaApp, state = duel.state, world = state.arena.worldJob;
    const fight = world.riderFight;
    for (let tick = 0; tick < 60 * 45 && !fight.outcome; tick++) {
      duel.fireWeapon('crossbow');
      duel.step(1 / 60);
    }
    // The result is delivered to the part on the tick after native combat settles.
    duel.step(1 / 60);
    duel.setInput({brake:0});
    return {outcome:fight.outcome, job:world.job.steps[world.job.stepIndex].kind,
      feud:world.open.world.open.feuds['road-rats'], wrecked:state.combatWrecking};
  },
  render: () => {
    window.__qaApp.onFrame?.(window.__qaApp.duel.state);
    window.__render.renderFrame();
    return !!window.__render.scene.getObjectByName('Open road faction flag');
  },
};

export const pageSource = (name, ...args) =>
  '(' + pageFunctions[name].toString() + ')(' + args.map(arg => JSON.stringify(arg)).join(',') + ')';

export async function run(context) {
  await context.navigate('/tools/menu-check.html?flags=hidden-road,story-choices,arsenal,scablands-realism&memory-backups=1');
  await context.waitFor(pageSource('ready'), 'the memory-only menu and renderer', 60_000);
  await context.evaluate(pageSource('prepare', seed));
  await context.waitFor(pageSource('atYard'), 'the temporary player at the yard', 60_000);
  await context.evaluate(pageSource('start', seed));
  await context.waitFor(pageSource('loaded'), 'the open Scablands ready to drive', 120_000);
  assert.deepEqual(await context.evaluate(pageSource('cross', approach, heading)), {difficulty:'easy', count:2, crossings:1});
  await context.waitFor(pageSource('render'), 'the native rider cars rendered', 60_000);
  await context.screenshot('mall-road-fight');
  assert.deepEqual(await context.evaluate(pageSource('win')), {outcome:'won', job:'roam', feud:'Raiding', wrecked:false});
  await context.evaluate(pageSource('render'));
  await context.screenshot('mall-road-won');
}
