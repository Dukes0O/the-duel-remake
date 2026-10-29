// C6 finishing pass on the actual course. Private memory-only harness. The test driver
// drives every sector on Casual and on Pro; pictures are 1280 x 720 in the course's own
// light, with exposure-only companions at the dark places. No frame timing.
import {writeFile} from 'node:fs/promises';
import {join} from 'node:path';
import {nativeBundle} from './p4-panorama.mjs';

// `at` is the distance the driver must reach before the picture; `chase` uses the
// game's own chase camera, otherwise a fixed [s, lateral, height] camera is used.
// `lit` adds the exposure-only companion. `pro` also takes it in the Pro pass.
const views = [
  {name: 'start-gantry', at: 45, from: [14, 0, 2.6], to: [45, 0, 5.2], lit: true},
  {name: 'lakeside-start', at: 45, from: [45, -2, 2.7], to: [115, 16, 3], lit: true},
  {name: 'start-gantry-back', at: 100, from: [112, 0, 2.4], to: [45, 0, 5.2]},
  {name: 'hairpin-1-entry', at: 955, chase: true, pro: true},
  {name: 'hairpin-1-apex', at: 1020, chase: true, lit: true, pro: true},
  {name: 'hairpin-2-entry', at: 1545, chase: true},
  {name: 'chevrons-right-turn', at: 1560, from: [1565, 0, 2.2], to: [1596, 9.6, 1.4], lit: true},
  {name: 'hairpin-2-apex', at: 1609, chase: true, lit: true, pro: true},
  {name: 'hairpin-3-entry', at: 2098, chase: true},
  {name: 'hairpin-3-apex', at: 2164, chase: true, lit: true, pro: true},
  {name: 'stone-wall-fixed', at: 2820, from: [2820, -1, 2.1], to: [2870, 7, 2], lit: true},
  {name: 'stone-wall', at: 2930, chase: true, lit: true, pro: true},
  {name: 'hairpin-4-entry', at: 3240, chase: true},
  {name: 'hairpin-4-apex', at: 3304, chase: true, lit: true, pro: true},
  {name: 'village-run-fixed', at: 3700, from: [3700, -1, 2.6], to: [3755, 11, 3], lit: true},
  {name: 'village-run', at: 3770, chase: true, pro: true},
  {name: 'lower-road', at: 4190, chase: true, lit: true, pro: true},
  {name: 'finish-line-fixed', at: 4620, from: [4620, -1, 2.6], to: [4684, 0, 5], lit: true},
  {name: 'finish-line', at: 4655, chase: true, pro: true},
];

async function pass(context, difficulty, report) {
  const pro = difficulty === 'pro';
  await context.navigate('/tools/menu-check.html?flags=kogane-pass,grand-prix');
  await context.waitFor(`document.readyState==='complete' && !!window.__qaApp &&
    document.querySelector('#view3d')?.dataset.vehicleAsset==='ready' &&
    !!Object.getOwnPropertyDescriptor(window,'localStorage')?.value`, 'isolated menu', 60000);
  await context.command('Emulation.setDeviceMetricsOverride', {width: 1280, height: 720, deviceScaleFactor: 1, mobile: false});
  await context.evaluate(await nativeBundle());
  await context.evaluate(`(() => {
    const a=window.__qaApp;
    const select=document.querySelector('#graphics-quality');select.value='high';
    select.dispatchEvent(new Event('change',{bubbles:true}));
    window.__panQa.ownTestCourses(a);
    a.audio.setMuted?.(true);
    let index=-1;
    for(let i=0;i<100;i++)if(a.getMenuCourse(i)?.def.id==='kogane-pass'){index=i;break;}
    if(index<0)throw Error('Kogane missing');
    if(!a.startCampaign({startStage:index,seed:1989,mode:'timetrial',car:'stuttgart_959s',
      difficulty:${JSON.stringify(difficulty)},cpuDifficulty:'medium'}))throw Error('Could not start Kogane');
    a.stop();
    a.autopilot=true;a._scriptedCrashDone=true;window.__panQa.useRacingLine(a,.95);
    a.setCamera('chase');
    document.head.insertAdjacentHTML('beforeend','<style>details,#overlay,.rear-view-frame{display:none!important}</style>');
  })()`);
  await context.waitFor(`(()=>{const a=window.__qaApp;a.onFrame?.(a.duel.state,0);window.__render.renderFrame();
    return a.visualReady && document.querySelector('#renderer-loading')?.hidden;})()`, 'scenery loaded', 120000);
  for (const view of views) {
    if (pro && !view.pro) continue;
    const tag = pro ? view.name + '-pro' : view.name;
    const progress = await context.evaluate(`(() => {
      const a=window.__qaApp,s=a.duel.state;
      for(let i=0;i<30000&&s.s<${view.at}&&['countdown','racing'].includes(s.status);i++)a.advance(1/60,1/60);
      if(s.s<${view.at})throw Error('Native driver did not reach ${view.name}');
      return {s:s.s,crashes:s.majorCrashes,resets:s.boundaryResets};
    })()`);
    await context.evaluate(`(() => {
      const a=window.__qaApp,c=a.duel.course;
      if(${!!view.chase})a.inspectionCamera=null;
      else {
        const point=([s,off,up])=>{const p=c.groundAt(s,off);
          const y=window.__panQa.renderedGroundHeight(c,{...p,s,off},{requireSurface:true});
          if(!Number.isFinite(y))throw Error('Missing drawn ground');return [p.x,y+up,p.z];};
        a.inspectionCamera={position:point(${JSON.stringify(view.from ?? [])}),target:point(${JSON.stringify(view.to ?? [])})};
      }
      a.onFrame?.(a.duel.state,0);window.__render.renderFrame();
    })()`);
    await context.waitFor(`(()=>{const a=window.__qaApp;a.onFrame?.(a.duel.state,0);window.__render.renderFrame();
      if(!a.inspectionCamera)return true;
      const p=a.inspectionCamera.position,c=window.__render.camera.position;
      return Math.hypot(c.x-p[0],c.y-p[1],c.z-p[2])<.001;})()`, 'camera settled', 10000);
    await context.waitFor(`(()=>{
      const a=window.__qaApp, r=window.__render;
      r.renderFrame();
      const settings=window.__panQa.sampleCourseLightPath(a.duel.course,{distance:a.duel.state.s}).settings;
      return Math.abs(r.renderer.toneMappingExposure-settings.exposure)<.02;
    })()`, 'native light exposure settled', 15000);
    const facts = await context.evaluate(`(() => {
      const a=window.__qaApp,s=a.duel.state,before=JSON.stringify(s),profile=JSON.stringify(a.profile);
      window.__render.renderFrame();
      if(before!==JSON.stringify(s)||profile!==JSON.stringify(a.profile))throw Error('Picture mutated race or profile');
      return {nightAmount:window.__panQa.sampleCourseLightPath(a.duel.course,{distance:s.s}).settings.nightAmount,
        camera:window.__render.camera.position.toArray(),stateUnchanged:true};
    })()`);
    await context.screenshot('kogane-c6-' + tag);
    report.captures.push({difficulty, name: tag, file: 'kogane-c6-' + tag + '.png', ...progress, ...facts});
    if (view.lit && !pro) {
      // Exposure-only companion: same light path, camera, geometry, race and profile; only the
      // tone exposure is raised so dark spots, gaps and floating objects can be judged.
      const exposure = await context.evaluate(`(() => {
        const r=window.__render.renderer, a=window.__qaApp;
        window.__koganeExposureDescriptor=Object.getOwnPropertyDescriptor(r,'toneMappingExposure');
        window.__koganeNativeExposure=r.toneMappingExposure;
        Object.defineProperty(r,'toneMappingExposure',{configurable:true,get:()=>8,set:()=>{}});
        const before=JSON.stringify(a.duel.state),profile=JSON.stringify(a.profile);
        window.__render.renderFrame();
        if(before!==JSON.stringify(a.duel.state)||profile!==JSON.stringify(a.profile))throw Error('Exposure view mutated state');
        return {nativeExposure:window.__koganeNativeExposure,reviewExposure:r.toneMappingExposure};
      })()`);
      await context.screenshot('kogane-c6-' + tag + '-lit');
      await context.evaluate(`Object.defineProperty(window.__render.renderer,'toneMappingExposure',window.__koganeExposureDescriptor);window.__render.renderFrame();`);
      report.captures.push({difficulty, name: tag + '-lit', file: 'kogane-c6-' + tag + '-lit.png', ...progress, ...facts, ...exposure});
    }
  }
  // Let the driver finish the lap, and record how it ended.
  report.laps.push(await context.evaluate(`(() => {
    const a=window.__qaApp,s=a.duel.state;a.inspectionCamera=null;
    let frames=0;
    for(;frames<30000&&['countdown','racing'].includes(s.status);frames++)a.advance(1/60,1/60);
    return {difficulty:${JSON.stringify(difficulty)},status:s.status,s:s.s,crashes:s.majorCrashes,resets:s.boundaryResets,
      secondsToEnd:frames/60};
  })()`));
}

export async function run(context) {
  const report = {course: 'kogane-pass', round: 'c6', storage: 'memory-only', frameTiming: false, captures: [], laps: []};
  try {
    await pass(context, 'casual', report);
    await pass(context, 'pro', report);
    for (const lap of report.laps)
      if (lap.crashes || lap.resets) throw Error(`${lap.difficulty}: ${lap.crashes} crashes, ${lap.resets} resets`);
    report.passed = true;
    console.log(`Kogane C6: ${report.captures.length} native pictures on Casual and Pro at 1280 x 720; no frame timing.`);
  } finally {
    await writeFile(join(context.outputDir, 'kogane-finish.json'), JSON.stringify(report, null, 2) + '\n');
  }
}
