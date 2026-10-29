// C4 round 2 pictures on the actual course. Private memory-only harness.
// Uses native progression and existing inspection camera. No frame timing.
import {writeFile} from 'node:fs/promises';
import {join} from 'node:path';
import {nativeBundle} from './p4-panorama.mjs';

const views = [
  {name: 'lakeside-start', at: 45, from: [45, -2, 2.7], to: [115, 16, 3]},
  {name: 'hairpin-car', at: 962, chase: true},
  {name: 'hairpin-above', at: 990, from: [1015, -38, 65], to: [1015, 0, 0]},
  {name: 'stone-wall', at: 2820, from: [2820, -1, 2.1], to: [2870, 7, 2]},
  {name: 'village-run', at: 3700, from: [3700, -1, 2.6], to: [3755, 11, 3]},
  {name: 'sodium-lower-road', at: 4190, chase: true},
];

export async function run(context) {
  const report = {course: 'kogane-pass', round: 2, storage: 'memory-only', frameTiming: false, captures: []};
  try {
    await context.navigate('/tools/menu-check.html?flags=kogane-pass,grand-prix');
    await context.waitFor(`document.readyState==='complete' && !!window.__qaApp &&
      document.querySelector('#view3d')?.dataset.vehicleAsset==='ready' &&
      !!Object.getOwnPropertyDescriptor(window,'localStorage')?.value`, 'isolated menu', 60000);
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
        difficulty:'casual',cpuDifficulty:'medium'}))throw Error('Could not start Kogane');
      a.stop();
      a.autopilot=true;a._scriptedCrashDone=true;window.__panQa.useRacingLine(a,.95);
      a.setCamera('chase');
      document.head.insertAdjacentHTML('beforeend','<style>details,#overlay,.rear-view-frame{display:none!important}</style>');
    })()`);
    await context.waitFor(`(()=>{const a=window.__qaApp;a.onFrame?.(a.duel.state,0);window.__render.renderFrame();
      return a.visualReady && document.querySelector('#renderer-loading')?.hidden;})()`, 'scenery loaded', 120000);
    for (const view of views) {
      const progress = await context.evaluate(`(() => {
        const a=window.__qaApp,s=a.duel.state;
        for(let i=0;i<18000&&s.s<${view.at}&&['countdown','racing'].includes(s.status);i++)a.advance(1/60,1/60);
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
      await context.screenshot('kogane-'+view.name);
      if (['hairpin-car', 'stone-wall'].includes(view.name)) {
        // Exposure-only companion. Preserve the actual authored distance light,
        // camera, geometry, race and profile. Native-light picture stays above.
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
        await context.screenshot('kogane-'+view.name+'-daylight-exposure');
        await context.evaluate(`Object.defineProperty(window.__render.renderer,'toneMappingExposure',window.__koganeExposureDescriptor);window.__render.renderFrame();`);
        report.captures.push({name:view.name+'-daylight-exposure',...progress,...facts,...exposure});
      }
      report.captures.push({name:view.name,file:'kogane-'+view.name+'.png',...progress,...facts});
    }
    report.passed=true;
    console.log('Six native Kogane scenery views and two exposure companions captured; no frame timing.');
  } finally {
    await writeFile(join(context.outputDir,'kogane-views.json'),JSON.stringify(report,null,2)+'\n');
  }
}
