// Four rule snapshots for Claude's visual review. This is not a chase driver.
import {writeFile} from 'node:fs/promises';
import {join} from 'node:path';

export const pageFunctions = {
  ready: () => window.__qaApp?.duel.state.status === 'menu' && !!window.__render,
  prepare: () => {
    if (!window.name.startsWith('__duel_qa_tab_v2:')) throw Error('Memory-only storage is missing.');
    const app = window.__qaApp;
    const quality = document.querySelector('#graphics-quality');
    quality.value = 'performance';
    quality.dispatchEvent(new Event('change', {bubbles:true}));
    app.profile = {...app.profile, wasteland:{...app.profile.wasteland,version:1,discoveredGate:true},
      story:{version:1,...app.profile.story,ember:{read:true,jobs:['hot-delivery','get-out-and-walk']}}};
    app._saveProfile();
    // A story job starts only from the yard, so the player goes there first.
    document.querySelector('#wasteland-visit').click();
  },
  yard: () => window.__qaApp?.isYardHomeActive?.() === true,
  start: () => { if (!window.__qaApp.everburnStep('run-him-down')) throw Error('Run Him Down did not start.'); },
  loaded: () => {
    let land;
    window.__render.scene.traverse(node => { if (node.name === 'The Scablands') land = node; });
    return window.__qaApp.duel.state.arena?.worldJob?.definition.id === 'everburn-run-him-down' &&
      land?.userData.assetStatus === 'ready' &&
      // The job's actors exist only once its own countdown has run out.
      window.__qaApp.duel.state.status === 'racing';
  },
  scene: which => {
    const app=window.__qaApp, duel=app.duel, state=duel.state, world=state.arena.worldJob;
    const step=world.job.steps[0];
    state.countdown=0;
    app.advance(1/60);
    const thief=world.actors.find(actor=>actor.id===step.targetId);
    if (!thief) throw Error('The thief is missing.');
    if (which==='opponent') {
      world.job.stepState.ridersStarted=true;
      app.advance(1/60);
    }
    if (which==='ending') {
      world.job.stepState={...world.job.stepState,thiefStopped:true,knocks:3,bellows:100};
      // Place the parked car beside the stopped thief for the collection view.
      const pose=duel.course.nearest(thief.position.x+5,thief.position.z);
      state.s=pose.s; state.lateral=pose.lateral; state.speedMph=0; state.onFoot=false;
      duel.setInput({throttle:0,brake:1,steer:0,interact:false});
      app.advance(1/60);
      if (!world.job.stepState.bellowsLoaded) throw Error('The bellows were not collected.');
    }
    app.onFrame?.(state,0);
    const render=window.__render;
    render.renderFrame();
    let node;
    render.scene.traverse(item=>{ if (item.name==='Bellows roof load') node=item; });
    if (!node) throw Error('The roof load is missing.');
    node.updateWorldMatrix(true,false);
    const point=node.getWorldPosition(render.camera.position.clone());
    if (which==='start') point.set(state.fighter.x,state.fighter.y,state.fighter.z);
    if (which==='opponent') {
      const rider=world.actors.find(actor=>step.bellowsRiders.some(item=>item.id===actor.id));
      if (!rider) throw Error('The furnace riders are missing.');
      point.set(rider.position.x,rider.position.y,rider.position.z);
    }
    const camera=render.camera;
    camera.position.set(point.x+6,point.y+4,point.z+9);
    camera.lookAt(point.x,point.y+1,point.z);
    camera.updateMatrixWorld(true);
    render.renderer.render(render.scene,camera);
    const projected=point.clone().project(camera);
    let visible=true;
    for (let parent=node;parent;parent=parent.parent) visible &&= parent.visible;
    const gauge=document.querySelector('.world-hud-ember');
    return {visible,inView:Math.abs(projected.x)<1 && Math.abs(projected.y)<1 && Math.abs(projected.z)<1,
      onFoot:state.onFoot,bellows:world.job.stepState.bellows,
      loaded:!!world.job.stepState.bellowsLoaded,thiefFled:!!world.job.stepState.thiefFled,
      furnaceLeaving:Number.isFinite(world.bellowsLeavingAtSec),
      riders:world.actors.filter(actor=>step.bellowsRiders.some(item=>item.id===actor.id)).length,
      gauge:gauge && !gauge.hidden ? gauge.textContent:null};
  },
};
export function pageSource(name,...args) {
  const source=`(${pageFunctions[name].toString()})(...${JSON.stringify(args)})`;
  new Function(`return ${source}`);
  return source;
}
export async function run(context) {
  const report={quality:'performance',fixedSnapshots:true,pictures:[],failures:[]};
  const page=(name,...args)=>context.evaluate(pageSource(name,...args));
  try {
    await context.navigate('/tools/menu-check.html?flags=hidden-road,story-everburn,warlord-cards&harness=everburn-job3');
    await context.waitFor(pageSource('ready'),'the memory-only menu',60000);
    await page('prepare');
    await context.waitFor(pageSource('yard'),'the yard',60000);
    await page('start');
    await context.waitFor(pageSource('loaded'),'Run Him Down and its art',120000);
    for (const which of ['start','load','opponent','ending']) {
      const measured=await page('scene',which);
      report.pictures.push({name:which,...measured});
      if (!measured.visible || !measured.inView) report.failures.push(`${which}: the subject is not shown.`);
      if (which==='start' && !measured.onFoot) report.failures.push('The player must start on foot.');
      if (which==='load' && !measured.gauge?.includes('BELLOWS')) report.failures.push('The bellows gauge is missing.');
      if (which==='opponent' && measured.riders!==2) report.failures.push('Both furnace riders must be present.');
      if (which==='ending' && (!measured.loaded || !measured.thiefFled || !measured.furnaceLeaving))
        report.failures.push('Collection must send the thief and furnace away.');
      await context.screenshot(`everburn-job3-${which}`);
    }
  } catch (error) { report.failures.push(error.message); }
  if (report.pictures.length!==4) report.failures.push('The review needs all four pictures.');
  await writeFile(join(context.outputDir,'everburn-job3.json'),JSON.stringify(report,null,2)+'\n');
  if (report.failures.length) throw Error(report.failures.join('\n'));
}
