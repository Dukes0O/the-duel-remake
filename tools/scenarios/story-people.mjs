// Fixed camera views of the real world-job cast in the harness's memory-only tab.
import {writeFile} from 'node:fs/promises';
import {join} from 'node:path';
import {pageFunctions as lightTown} from './everburn-job2.mjs';
import {TIN_TOWN_GATE} from '../../src/world/tin-town-gate.js';
import {EVERBURN_JOBS} from '../../src/world/jobs/everburn.js';
import {createStoryPeople, walkerGroupAt, setStoryPersonAction} from '../../src/world/jobs/story-people.js';
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
    app.stop();
    app.footCameraMode='first-person';
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
  gateSample(present) {
    return (async () => {
      const app=window.__qaApp, api=window.__render, world=app.duel.state.arena.worldJob;
      const cast=world.storyPeople, crowd=api.scene.getObjectByName('Wasteland story people');
      const gl=api.renderer.getContext(), ext=gl.getExtension('EXT_disjoint_timer_query_webgl2');
      const pass=api.composer.passes[0], previousDraw=pass.render, previousProbe=app.frameDiagnostics;
      const previousCamera=api.camera.position.clone(), next=()=>new Promise(requestAnimationFrame);
      const cpu=[],gpu=[],intervals=[],queries=[];
      let collecting=false, disjoint=false, previous=null;
      const poll=()=>{
        if (!ext) return;
        if (gl.getParameter(ext.GPU_DISJOINT_EXT)) disjoint=true;
        while (queries.length && gl.getQueryParameter(queries[0],gl.QUERY_RESULT_AVAILABLE)) {
          const query=queries.shift();
          if (!disjoint) gpu.push(gl.getQueryParameter(query,gl.QUERY_RESULT)/1e6);
          gl.deleteQuery(query);
        }
      };
      const summary=values=>{
        const sorted=values.slice().sort((a,b)=>a-b);
        const at=q=>sorted.length?sorted[Math.ceil(q*sorted.length)-1]:null;
        return {samples:sorted.length,p50:at(.5),p95:at(.95)};
      };
      try {
        world.storyPeople=present?cast:[];
        await next();
        await crowd.userData.ready;
        for(let i=0;i<30;i++) await next();
        if (crowd.visible!==present || (present && crowd.children.filter(n=>n.name.startsWith('story-person-')).length!==12))
          throw Error('Gate frame control has the wrong visible cast.');
        app.frameDiagnostics={active:true,now:()=>performance.now(),recordAppFrame(){},
          recordRendererFrame(timestamp,update,submit) {
            if (!collecting) return;
            cpu.push(update+submit);
            if (previous!==null) intervals.push(timestamp-previous);
            previous=timestamp;
          }};
        pass.render=function(...args) {
          poll();
          let query;
          if (collecting && ext && !disjoint && !gl.getQuery(ext.TIME_ELAPSED_EXT,gl.CURRENT_QUERY)) {
            query=gl.createQuery();
            if (query) gl.beginQuery(ext.TIME_ELAPSED_EXT,query);
          }
          try { return previousDraw.apply(this,args); }
          finally { if (query) { gl.endQuery(ext.TIME_ELAPSED_EXT); queries.push(query); } }
        };
        collecting=true;
        for(let i=0;i<121;i++) await next();
        collecting=false;
        for(let i=0;i<60 && queries.length;i++){ await next(); poll(); }
        if (cpu.length<115 || previousCamera.distanceTo(api.camera.position)>.15)
          throw Error('Gate frame sample lost its fixed player camera or delivered too few frames.');
        return {present,sceneCpuMs:summary(cpu),mainPassGpuMs:disjoint?null:summary(gpu),
          deliveredMs:summary(intervals),gpuSupported:!!ext,disjoint,
          pixelRatio:api.renderer.getPixelRatio(),viewport:[gl.drawingBufferWidth,gl.drawingBufferHeight]};
      } finally {
        collecting=false;
        pass.render=previousDraw;
        app.frameDiagnostics=previousProbe;
        for(const query of queries) gl.deleteQuery(query);
        world.storyPeople=cast;
        await next();
        await crowd.userData.ready;
      }
    })();
  },
  installTown(cast) {
    const app = window.__qaApp;
    if (!window.name.startsWith('__duel_qa_tab_v2:')) throw Error('Expected a memory-only QA tab.');
    const world = app.duel.state.arena.worldJob;
    world.storyPeople = cast;
    world.solidGrid.setStoryPeople(cast);
    app.onFrame?.(app.duel.state,0);
  },
  townLoaded(ids) {
    const group = window.__render.scene.getObjectByName('Wasteland story people');
    if (group?.userData.loadError) throw Error(group.userData.loadError);
    return ids.every(id => group?.getObjectByName('story-person-'+id)?.visible);
  },
  settled: () => new Promise(resolve => setTimeout(resolve, 1250)),
  draw(shot, eye, subject) {
    const api = window.__render, scene = api.scene, camera = api.camera;
    api.renderFrame();
    const land = scene.getObjectByName('The Scablands');
    const feet = land.userData.drawnGroundHeightAt(eye.x,eye.z);
    const actor = scene.getObjectByName('story-person-' + subject);
    const crown = scene.getObjectByName('story-bubble-' + subject);
    if (!actor?.visible || !crown) throw Error(shot + ': missing subject.');
    const point = crown.getWorldPosition(camera.position.clone());
    const fighter = window.__qaApp.duel.state.fighter;
    const distance = Math.hypot(point.x-eye.x,point.z-eye.z);
    fighter.yaw = Math.atan2(point.x-eye.x,point.z-eye.z);
    fighter.pitch = Math.atan2(point.y-(shot==='gate-group'?.4:.36)-feet-1.62,distance);
    // The ongoing Three.js frame and the screenshot now use the same real
    // first-person camera, even if another animation frame intervenes.
    api.renderFrame();
    if (camera.fov!==72 || Math.hypot(camera.position.x-eye.x,camera.position.z-eye.z)>.15)
      throw Error(shot+' did not use the fighter’s first-person camera.');
    const projected = point.clone().project(camera);
    if (Math.abs(projected.x)>1 || Math.abs(projected.y)>1 || Math.abs(projected.z)>1)
      throw Error(shot + ': the crown is outside the image.');
    const cast = window.__qaApp.duel.state.arena.worldJob.storyPeople;
    if (shot === 'open-figures-20m') {
      if (cast.length !== 5) throw Error('Expected the five Tin Town figures.');
    } else if (cast.length!==12 || cast.filter(person=>person.cart).length!==4)
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
  await context.command('Emulation.setDeviceMetricsOverride',{width:1280,height:720,deviceScaleFactor:1,mobile:false});
  await context.navigate('/tools/menu-check.html?flags=hidden-road,story-everburn,story-choices,warlord-cards&harness=story-people');
  await context.waitFor(pageSource('ready'),'memory-only menu',60000);
  await evaluate('prepare');
  await context.waitFor(pageSource('yard'),'yard',60000);
  await evaluate('start',reviewJob);
  await context.waitFor(pageSource('loaded'),'gate company and town',120000);
  const report = {views:[],frameTiming:null};
  for (const [shot,eye,subject,changes] of [
    ['gate-group',at(0,-25.6),'rell',{}], ['rell-speaking',at(-.4,-9.1),'rell',{}],
    ['dace-running',at(-2,-7.4),'dace',{dace:at(0,-5.2)}],
    ['wim-and-auntie',at(8.1,-2.5),'wim',{wim:at(8.62,-.41), 'auntie-solder':at(9.0,-.16)}],
  ]) {
    await evaluate('stage',shot,eye,changes,runAction);
    // Let gaze, hands, and the grounded resting pose settle on rendering time.
    await evaluate('settled');
    report.views.push(await evaluate('draw',shot,eye,subject));
    await context.screenshot('story-people-' + shot);
    if (shot==='gate-group' && context.headed) {
      // Alternate identical views to limit order bias. GPU work, CPU work and
      // delivered intervals are separate observations on the target laptop.
      const samples=[];
      for (const enabled of [false,true,true,false]) samples.push(await evaluate('gateSample',enabled));
      const p95Delta=key=>{
        if (samples.some(s=>!s[key] || s[key].samples<115)) return null;
        return (samples[1][key].p95+samples[2][key].p95-samples[0][key].p95-samples[3][key].p95)/2;
      };
      report.frameTiming={limitMs:1,samples,p95AddedMs:{
        rendererCpu:p95Delta('sceneCpuMs'),mainPassGpu:p95Delta('mainPassGpuMs'),delivered:p95Delta('deliveredMs')}};
    }
  }
  const tasks = [['odessa','weld'],['moss','scrub'],['tin-cook','cook'],['tin-porter','haul-sack'],['tin-child','sit']];
  const town = createStoryPeople(tasks.map(([id,action],i) => ({
    id,action,position:at((i-2)*1.6,-5.2),yaw:Math.PI,
  })));
  const eye = at(0,-25.2);
  await evaluate('installTown',town);
  await evaluate('stage','open-figures-20m',eye,{},null);
  await context.waitFor(pageSource('townLoaded',town.map(person=>person.id)),'five Tin Town figures',60000);
  await evaluate('settled');
  report.views.push(await evaluate('draw','open-figures-20m',eye,'tin-cook'));
  await context.screenshot('open-figures-20m');
  await writeFile(join(context.outputDir,'story-people.json'), JSON.stringify(report,null,2)+'\n');
  return report;
}
