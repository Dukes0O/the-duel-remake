// Existing circuits, native full-field grid and first corner in both quality modes.
// Existing 14 m road sections and passing lanes stay unchanged. No QA frame measurement.
import { writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import {fileURLToPath} from 'node:url';
import {build} from 'vite';
import { installTestDriver, LINE_SKILL } from '../race-field-balance.mjs';

const ids = ['pacific-canyon', 'high-country', 'harbor-highlands', 'eifel-crown',
  'alpine-serpent', 'azure-riviera', 'red-mesa', 'neon-docks', 'cloudbreak-skyway'];

const root=resolve(fileURLToPath(new URL('../../',import.meta.url)));
export async function nativeBundle() {
  // Preview serves only the built QA bundle. Compile actual fixture functions
  // in memory; do not request raw /src or /tools modules from that server.
  const entry=join(root,'.qa-dist/gp-existing.virtual.js').replaceAll('\\','/');
  const config=JSON.stringify(join(root,'src/config.js').replaceAll('\\','/'));
  const access=JSON.stringify(join(root,'tools/career-fixture.mjs').replaceAll('\\','/'));
  const lines=JSON.stringify(join(root,'src/race-lines.js').replaceAll('\\','/'));
  const result=await build({root,configFile:false,logLevel:'silent',plugins:[{
    name:'gp-existing-private',
    resolveId(id){if(id.replaceAll('\\','/')===entry)return '\0gp-existing';},
    load(id){
      if(id!=='\0gp-existing')return null;
      return 'import {DRIVE,steeringYawAuthority,TYRE_SLIP,steeringGrip,tyreClamp,tyreSlipSteering,steerForYaw} from '+config+';'+
        'export {COURSE,CARS,DRIVE,steeringYawAuthority,TYRE_SLIP,steeringGrip,tyreClamp,tyreSlipSteering,steerForYaw} from '+config+';'+
        'export {ownTestCourses} from '+access+';'+
        'import {racingLineFor,buildSpeedProfile} from '+lines+';'+
        'export {racingLineFor,buildSpeedProfile};'+
        'const LINE_SKILL='+JSON.stringify(LINE_SKILL)+';'+
        'const clampTo=(value,limit)=>Math.max(-limit,Math.min(limit,value));'+
        'export const installTestDriver='+installTestDriver.toString()+';';
    },
  }],build:{write:false,minify:false,lib:{entry,formats:['es']}}});
  const chunk=(Array.isArray(result)?result[0]:result).output.find(row=>row.type==='chunk');
  if(!chunk)throw Error('Existing Grand Prix native helper bundle is missing.');
  return chunk.code;
}

export async function run(context) {
  await context.command('Emulation.setDeviceMetricsOverride', {width: 1280, height: 720,
    deviceScaleFactor: 1, mobile: false});
  const reports = [];
  const bundle=await nativeBundle();
  for (const quality of ['high', 'performance']) {
    await context.navigate('/tools/menu-check.html?flags=grand-prix');
    await context.waitFor(`document.readyState==='complete' && !!window.__qaApp &&
      document.querySelector('#view3d')?.dataset.vehicleAsset==='ready' &&
      !!Object.getOwnPropertyDescriptor(window,'localStorage')?.value`, `${quality} memory-only menu`, 60000);
    await context.evaluate(`(() => {
      const select=document.querySelector('#graphics-quality'); select.value=${JSON.stringify(quality)};
      select.dispatchEvent(new Event('change',{bubbles:true}));
    })()`);
    await context.waitFor(`document.querySelector('#graphics-quality')?.value===${JSON.stringify(quality)} &&
      document.querySelector('#view3d')?.dataset.vehicleAsset==='ready' &&
      !document.querySelector('#start-engine')?.disabled`, `${quality} menu ready`, 60000);
    await context.evaluate(`(async () => {
      const url=URL.createObjectURL(new Blob([${JSON.stringify(bundle)}], {type:"text/javascript"}));
      try { window.GpExistingQa=await import(url); }
      finally { URL.revokeObjectURL(url); }
    })()`);
    for (const id of ids) {
      const grid = await context.evaluate(`(async () => {
        const {COURSE,CARS,DRIVE,steeringYawAuthority,TYRE_SLIP,steeringGrip,tyreClamp,tyreSlipSteering,steerForYaw,ownTestCourses,
          racingLineFor,buildSpeedProfile,installTestDriver}=GpExistingQa;
        const app=window.__qaApp; app.returnToMenu(); ownTestCourses(app);
        const stage=COURSE.findIndex(def=>def.id===${JSON.stringify(id)});
        if(!app.grandPrixAvailable(COURSE[stage]))throw Error('GP unavailable: '+${JSON.stringify(id)});
        if(!app.startCampaign({startStage:stage,mode:'grandprix',seed:1989,fieldSeed:4242,
          car:'falcone_f42',cpuDifficulty:'medium',difficulty:'casual'}))throw Error('Start rejected');
        app.autopilot=true; app._scriptedCrashDone=true;
        installTestDriver(app);
        app.togglePause();
        const duel=app.duel,s=duel.state,course=duel.course;
        const widths=[];
        for(let distance=0;distance<course.length;distance+=8)widths.push(course.roadHalfWidthAt(distance));
        const profile=buildSpeedProfile(racingLineFor(course),duel.car);
        let narrow=20;
        for(let distance=20;distance<course.length;distance+=8){
          if(course.roadHalfWidthAt(distance)===7 && Math.abs(course.at(distance).curvature)>.002){narrow=distance;break;}
        }
        window.__gpExistingCorner=Math.max(100,profile.corners[0]?.apexS??150,narrow);
        const actors=[s,...s.opponents],positions=actors.map(actor=>course.worldAt(actor.s,actor.lateral));
        let separation=Infinity;
        for(let a=0;a<positions.length;a++)for(let b=a+1;b<positions.length;b++)
          separation=Math.min(separation,Math.hypot(positions[a].x-positions[b].x,positions[a].z-positions[b].z));
        return {id:${JSON.stringify(id)},quality:${JSON.stringify(quality)},mode:s.mode,
          size:actors.length,laps:s.lapsTotal,traffic:s.traffic.length,
          radar:course.features.radarTraps.length,police:!!s.police.pursuit,
          minHalfWidth:Math.min(...widths),maxHalfWidth:Math.max(...widths),separation,
          edgeMargin:Math.min(...actors.map(actor=>course.roadHalfWidthAt(actor.s)-Math.abs(actor.lateral))),
          firstCorner:profile.corners[0]?.apexS??150,narrow,checkThrough:window.__gpExistingCorner};
      })()`);
      if (grid.mode !== 'grandprix' || grid.size !== 8 || grid.laps !== 3 || grid.traffic || grid.radar || grid.police)
        throw Error(`Invalid native grid ${JSON.stringify(grid)}`);
      if (grid.minHalfWidth < 7 || grid.separation < 4.4 || grid.edgeMargin < 1.5)
        throw Error(`Circuit needs a reviewed width decision ${JSON.stringify(grid)}`);
      await context.waitFor(`window.__qaApp.visualReady && document.querySelector('#view3d')?.dataset.vehicleAsset==='ready'`,
        `${id} ${quality} native grid ready`, 60000);
      await context.screenshot(`${id}-grid-${quality}`);
      await context.evaluate(`window.__qaApp.resume()`);
      await context.waitFor(`window.__qaApp.duel.state.status==='racing' &&
        window.__qaApp.duel.state.s>window.__gpExistingCorner &&
        window.__qaApp.duel.state.opponents.every(actor=>actor.s>window.__gpExistingCorner)`,
        `${id} ${quality} full field through first corner`, 180000);
      const corner = await context.evaluate(`(() => {
        const app=window.__qaApp,s=app.duel.state;
        return {size:s.opponents.length+1,rows:document.querySelectorAll('#field-rows li').length,
          elapsed:s.stageTimeSec,crashingCars:new Set(s.field.stats.crashes.filter(hit=>hit.t<=30).map(hit=>hit.index)).size,
          ghostVisible:!!app.ghostPose,
          crashEvents:s.field.stats.crashes.filter(hit=>hit.t<=30),
          actors:[s,...s.opponents].map((actor,index)=>({index:index-1,name:actor.name||'YOU',
            s:actor.s,lateral:actor.lateral,speedMph:actor.speedMph,offRoad:actor.offRoad,
            impactTimer:actor.impactTimer,knock:actor.knock})),
          finite:[s,...s.opponents].every(actor=>
            [actor.s,actor.lateral,actor.speedMph].every(Number.isFinite))};
      })()`);
      reports.push({...grid,corner});
      await writeFile(join(context.outputDir,'grand-prix-existing.json'),JSON.stringify({reports},null,2)+'\n');
      if (corner.size !== 8 || corner.rows !== 8 || corner.ghostVisible || !corner.finite || corner.crashingCars >= 3)
        throw Error(`Native first corner failed ${JSON.stringify(corner)}`);
      await context.screenshot(`${id}-corner-${quality}`);
    }
  }
  console.log('Existing Grand Prix: nine native grids, first corners and narrow roads in both qualities.');
}
