// Fixed camera views of the real world-job cast in the harness's memory-only tab.
import {writeFile} from 'node:fs/promises';
import {join} from 'node:path';
import {pageFunctions as lightTown} from './everburn-job2.mjs';
import {TIN_TOWN_GATE} from '../../src/world/tin-town-gate.js';
import {EVERBURN_JOBS} from '../../src/world/jobs/everburn.js';
import {walkerGroupAt, setStoryPersonAction} from '../../src/world/jobs/story-people.js';
import {scablandsSurfaceHeightAt as ground} from '../../src/world/scablands-ground.js';

const at = (dx, dz) => {
  const x = TIN_TOWN_GATE.x + dx, z = TIN_TOWN_GATE.z + dz;
  return {x, y:ground(x,z), z};
};
const people = [...walkerGroupAt(at(0,-5.2), Math.PI, ground),
  {id:'auntie-solder', position:at(4,-5), yaw:Math.PI}];
const reviewJob = {...EVERBURN_JOBS[1], id:'story-people-review', storyPeople:people,
  steps:[{...EVERBURN_JOBS[1].steps[0], bellowsFootStart:{...at(0,-25.6),heading:0}}]};
const runAction = {};
setStoryPersonAction(runAction,'run',[at(1,-4.2),at(5,-1.2)]);

export const pageFunctions = {
  ready:lightTown.ready, prepare:lightTown.prepare, yard:lightTown.yard,
  start(job) {
    if (!window.name.startsWith('__duel_qa_tab_v2:')) throw Error('Expected a memory-only QA tab.');
    const app = window.__qaApp;
    if (!app._startArenaFight({venueId:'scablands',mode:'world-job',opponents:0,job}))
      throw Error('The Scablands world job could not start.');
    app.duel.state.countdown = 0;
    app.advance(1/60);
  },
  loaded() {
    const scene = window.__render.scene, actors = scene.getObjectByName('Wasteland story people');
    if (actors?.userData.loadError) throw Error(actors.userData.loadError);
    return scene.getObjectByName('The Scablands')?.userData.assetStatus === 'ready' &&
      !!scene.getObjectByName('story-bubble-rell') && !!scene.getObjectByName('story-bubble-auntie-solder');
  },
  stage(shot, eye, changes, action) {
    const app = window.__qaApp, d = app.duel, state = d.state, world = state.arena.worldJob;
    world.storySpeaker = shot === 'rell-speaking' ? 'rell' : null;
    world.job.stepState.brandBriefed = true;
    world.job.stepState.dusk = 1;
    state.paused = false;
    const fighter = state.fighter;
    if (!state.onFoot || !fighter) throw Error('A real on-foot viewpoint is required.');
    Object.assign(fighter, d.course.nearest(eye.x,eye.z), eye, {groundY:eye.y});
    for (const [id,p] of Object.entries(changes)) {
      const actor = world.storyPeople.find(person => person.id === id);
      Object.assign(actor.position,p);
      if (id === 'dace') Object.assign(actor,action);
      if (id === 'wim' || id === 'auntie-solder' || id === 'rell')
        Object.assign(actor,{action:id==='wim'?'sleep':'sit',path:[],nextPoint:0});
    }
    world.solidGrid.setStoryPeople(world.storyPeople);
    if (shot === 'dace-running') app.advance(.42);
    app.onFrame?.(state,0);
  },
  settled: () => new Promise(resolve => setTimeout(resolve, 1250)),
  draw(shot, eye, subject) {
    const api = window.__render, scene = api.scene, camera = api.camera;
    api.renderFrame();
    const land = scene.getObjectByName('The Scablands');
    const feet = land.userData.drawnGroundHeightAt(eye.x,eye.z);
    camera.position.set(eye.x,feet+1.62,eye.z);
    const actor = scene.getObjectByName('story-person-' + subject);
    const crown = scene.getObjectByName('story-bubble-' + subject);
    if (!actor?.visible || !crown) throw Error(shot + ': missing subject.');
    const point = crown.getWorldPosition(camera.position.clone());
    camera.fov=72;
    camera.updateProjectionMatrix();
    camera.lookAt(point.x,point.y-(shot==='gate-group'?0.4:0.36),point.z);
    camera.updateMatrixWorld(true);
    api.renderer.render(scene,camera);
    const projected = point.clone().project(camera);
    if (Math.abs(projected.x)>1 || Math.abs(projected.y)>1 || Math.abs(projected.z)>1)
      throw Error(shot + ': the crown is outside the image.');
    const cast = window.__qaApp.duel.state.arena.worldJob.storyPeople;
    if (cast.length!==12 || cast.filter(person=>person.cart).length!==4)
      throw Error(shot + ': expected eleven Walkers, four carts and Auntie.');
    return {shot,subject,people:cast.length,fov:camera.fov,eye:camera.position.toArray(),
      target:point.toArray(),metres:Math.hypot(eye.x-point.x,eye.z-point.z)};
  },
};
export function pageSource(name, ...args) {
  // Object method shorthand is not itself an expression. Preserve async/arrow
  // functions from the shared fixture and wrap local methods in an object.
  const fn = pageFunctions[name], code = fn.toString();
  const expression = /^\w+\s*\(/.test(code) ? '({' + code + '}).' + name : '(' + code + ')';
  const source = expression + '(...' + JSON.stringify(args) + ')';
  new Function('return ' + source);
  return source;
}

export async function run(context) {
  const evaluate = (name, ...args) => context.evaluate(pageSource(name,...args));
  await context.navigate('/tools/menu-check.html?flags=hidden-road,story-everburn,story-choices,warlord-cards&harness=story-people');
  await context.waitFor(pageSource('ready'),'memory-only menu',60000);
  await evaluate('prepare');
  await context.waitFor(pageSource('yard'),'yard',60000);
  await evaluate('start',reviewJob);
  await context.waitFor(pageSource('loaded'),'gate company and town',120000);
  const report = [];
  for (const [shot,eye,subject,changes] of [
    ['gate-group',at(0,-25.6),'rell',{}], ['rell-speaking',at(-.4,-9.1),'rell',{}],
    ['dace-running',at(-2,-7.4),'dace',{dace:at(0,-5.2)}],
    ['wim-and-auntie',at(8.1,-2.5),'wim',{wim:at(8.62,-.41), 'auntie-solder':at(9.0,-.16)}],
  ]) {
    await evaluate('stage',shot,eye,changes,runAction);
    // Let gaze, hands, and the grounded resting pose settle on rendering time.
    await evaluate('settled');
    report.push(await evaluate('draw',shot,eye,subject));
    await context.screenshot('story-people-' + shot);
  }
  await writeFile(join(context.outputDir,'story-people.json'), JSON.stringify(report,null,2)+'\n');
  return report;
}
