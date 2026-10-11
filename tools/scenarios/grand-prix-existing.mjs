// Existing circuits, native full-field grid and first corner in both quality modes.
// Existing 14 m road sections and passing lanes stay unchanged. No QA frame measurement.
import { writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { installTestDriver } from '../race-field-balance.mjs';

const ids = ['pacific-canyon', 'high-country', 'harbor-highlands', 'eifel-crown',
  'alpine-serpent', 'azure-riviera', 'red-mesa', 'neon-docks', 'cloudbreak-skyway'];

export async function run(context) {
  await context.command('Emulation.setDeviceMetricsOverride', {width: 1280, height: 720,
    deviceScaleFactor: 1, mobile: false});
  const reports = [];
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
    for (const id of ids) {
      const grid = await context.evaluate(`(async () => {
        const {COURSE,CARS,DRIVE,steeringYawAuthority}=await import('/src/config.js');
        const {ownTestCourses}=await import('/tools/career-fixture.mjs');
        const {racingLineFor,buildSpeedProfile}=await import('/src/race-lines.js');
        const app=window.__qaApp; app.returnToMenu(); ownTestCourses(app);
        const stage=COURSE.findIndex(def=>def.id===${JSON.stringify(id)});
        if(!app.grandPrixAvailable(COURSE[stage]))throw Error('GP unavailable: '+${JSON.stringify(id)});
        if(!app.startCampaign({startStage:stage,mode:'grandprix',seed:1989,fieldSeed:4242,
          car:'falcone_f42',cpuDifficulty:'medium',difficulty:'casual'}))throw Error('Start rejected');
        app.autopilot=true; app._scriptedCrashDone=true;
        (${installTestDriver.toString()})(app);
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
          ghostVisible:!!app.ghostPose,finite:[s,...s.opponents].every(actor=>
            [actor.s,actor.lateral,actor.speedMph].every(Number.isFinite))};
      })()`);
      if (corner.size !== 8 || corner.rows !== 8 || corner.ghostVisible || !corner.finite || corner.crashingCars >= 3)
        throw Error(`Native first corner failed ${JSON.stringify(corner)}`);
      await context.screenshot(`${id}-corner-${quality}`);
      reports.push({...grid,corner});
      await writeFile(join(context.outputDir,'grand-prix-existing.json'),JSON.stringify({reports},null,2)+'\n');
    }
  }
  console.log('Existing Grand Prix: nine native grids, first corners and narrow roads in both qualities.');
}
