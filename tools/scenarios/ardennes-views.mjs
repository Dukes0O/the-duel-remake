// P4-ARDENNES: actual native High/Performance art views and two-lap field.
// Existing browser harness, disposable memory-only App, no frame measurement.
import {writeFile} from 'node:fs/promises';
import {join} from 'node:path';
import {nativeBundle} from './p4-panorama.mjs';

const names = ['La Fontaine', 'Red Water', 'The Wall', 'Kestrel Straight', 'Les Combes', 'Riverside', 'Stavelot', 'Bus Stop Exit'];

export async function run(context) {
  const report = {passed: false, qualities: [], captures: []};
  const persist = () => writeFile(join(context.outputDir, 'ardennes-views.json'), JSON.stringify(report, null, 2) + '\n');
  await context.command('Emulation.setDeviceMetricsOverride', {width: 1280, height: 720, deviceScaleFactor: 1, mobile: false});
  const bundle = await nativeBundle();
  try {
    for (const quality of ['high', 'performance']) {
      await context.navigate('/tools/menu-check.html?flags=grand-prix,ardennes-forest');
      await context.waitFor('window.__qaApp?.visualReady && !!window.__render', 'memory-only Ardennes menu', 60000);
      await context.evaluate(bundle);
      const setup = await context.evaluate(`(() => {
        const app = window.__qaApp;
        if (!Object.getOwnPropertyDescriptor(window, 'localStorage')?.value || !window.name.startsWith('__duel_qa_tab_v2:'))
          throw Error('Memory-only QA required');
        window.__panQa.ownTestCourses(app); app.audio.setMuted(true); app.setGraphicsQuality(${JSON.stringify(quality)});
        const stage = [...document.querySelector('#scene-select').options].map(option => Number(option.value))
          .find(index => app.getMenuCourse(index)?.def.id === 'ardennes-forest');
        if (!Number.isSafeInteger(stage) || !app.startCampaign({mode: 'grandprix', startStage: stage,
          car: 'stuttgart_959s', seed: 1989, fieldSeed: 1000, cpuDifficulty: 'medium', difficulty: 'casual'}))
          throw Error('Native Ardennes start rejected');
        app.stop(); app.autopilot = true; app._scriptedCrashDone = true; window.__panQa.useRacingLine(app, .95);
        app.onFrame?.(app.duel.state, 0); app.duel.state.field.deferFinish = true;
        const d = app.duel, s = d.state;
        if (s.opponents.length !== 7 || s.lapsTotal !== 2 || s.traffic.length || d.course.features.radarTraps.length || s.police.pursuit)
          throw Error('Native eight-car two-lap grid missing');
        document.head.insertAdjacentHTML('beforeend', '<style>details,#overlay,.rear-view-frame{display:none!important}</style>');
        return {id: d.course.def.id, seed: s.seed, fieldSeed: s.fieldSeed, nativeFieldSize: 1 + s.opponents.length,
          length: d.course.length, laps: s.lapsTotal, kits: d.course.def.kitPlacements.length};
      })()`);
      await context.waitFor('(()=>{window.__render.renderFrame();return window.__qaApp.visualReady && document.querySelector("#view3d").dataset.trackKitAsset==="ready";})()', quality + ' real kits', 90000);
      const witness = await context.evaluate(`(() => {
        const a = window.__qaApp, v = window.__render, before = JSON.stringify(a.duel.state), profile = JSON.stringify(a.profile);
        v.renderFrame(); const kits = v.scene.getObjectByName('Approved track kits');
        if (!kits?.children.length || !v.scene.getObjectByName('Ardennes red-brown stream')) throw Error('Actual Ardennes scenery missing');
        if (JSON.stringify(a.duel.state) !== before || JSON.stringify(a.profile) !== profile) throw Error('Render wrote race or profile');
        return {kitChildren: kits.children.length, renderedStateUnchanged: true};
      })()`);
      async function capture(name, phase) {
        const camera = await context.evaluate(`(() => {
          const a = window.__qaApp, c = a.duel.course, s = a.duel.state;
          const piece = c.script.pieces.find(piece => piece.name === ${JSON.stringify(name)});
          if (!piece) throw Error('Missing authored view');
          let distance = name => c.script.pieces.find(piece => piece.name === name).s0;
          const at = ${JSON.stringify(name)} === 'Pit Straight' ? 0 : Math.max(0, piece.s0 - 35);
          const off = ${JSON.stringify(name)} === 'Stavelot' ? 55 : -32;
          const e = c.groundAt(at, off);
          const targetS = ${JSON.stringify(name)} === 'Stavelot' ? distance('Stavelot') + 100 : piece.s0 + 25;
          const targetOff = ${JSON.stringify(name)} === 'Stavelot' ? 104 : ${JSON.stringify(name)} === 'Red Water' ? 36 : 0;
          const t = c.groundAt(targetS, targetOff);
          const ground = window.__panQa.renderedGroundHeight(c, {...e, s: at, off}, {requireSurface: true});
          const targetGround = window.__panQa.renderedGroundHeight(c, {...t, s: targetS, off: targetOff}, {requireSurface: true});
          if (![ground, targetGround].every(Number.isFinite)) throw Error('View lacks actual rendered ground');
          a.inspectionCamera = {position: [e.x, ground + 18, e.z], target: [t.x, targetGround + 3, t.z]};
          window.__render.renderFrame(); return {position: a.inspectionCamera.position};
        })()`);
        await context.waitFor(`(()=>{const c=window.__render.camera,p=${JSON.stringify(camera.position)};window.__render.renderFrame();return Math.hypot(c.position.x-p[0],c.position.y-p[1],c.position.z-p[2])<.001;})()`, 'actual ground camera', 10000);
        const facts = await context.evaluate(`(() => {
          const a = window.__qaApp, d = a.duel, s = d.state, c = d.course, before = JSON.stringify(s), profile = JSON.stringify(a.profile);
          window.__render.renderFrame(); if (JSON.stringify(s) !== before || JSON.stringify(a.profile) !== profile) throw Error('Photo changed native state');
          const distance = s.completedLaps * c.length + c.phase(s.s), light = window.__panQa.sampleCourseLightPath(c, {distance});
          const cars = window.__render.scene.children.filter(node => node.visible && node.userData.vehicleKey);
          return {s: s.s, time: s.stageTimeSec, laps: s.completedLaps, distance, fogNear: light.settings.fogNear,
            nativeFieldSize: 1 + s.opponents.length, nativeCars: cars.length,
            camera: window.__render.camera.position.toArray(), stateUnchanged: true};
        })()`);
        const file = 'ardennes-' + name.toLowerCase().replaceAll(' ', '-') + '-' + quality + '-' + phase;
        await context.screenshot(file); report.captures.push({quality, name, phase, file: file + '.png', ...facts}); await persist();
      }
      await capture('Pit Straight', 'mist-grid');
      const targets = await context.evaluate(`(() => {const c=window.__qaApp.duel.course;return ${JSON.stringify(names)}.map(name=>({name,s:c.script.pieces.find(piece=>piece.name===name).s0}));})()`);
      const progress = []; let targetIndex = 0, clear = false;
      for (let batch = 0; batch < 70; batch++) {
        const target = targets[targetIndex]?.s ?? null;
        const result = await context.evaluate(`(() => {
          const a=window.__qaApp,d=a.duel,s=d.state,target=${JSON.stringify(target)};
          for(let i=0;i<600;i++) {
            if(!['racing','countdown'].includes(s.status) || s.completedLaps>=2&&s.opponents.every(r=>r.finished))break;
            if(target!==null&&s.completedLaps===0&&s.s>=target)break;
            a.advance(1/60,1/60);
          }
          const before=JSON.stringify(s);window.__render.renderFrame();if(JSON.stringify(s)!==before)throw Error('Render wrote race');
          if(![s,...s.opponents].every(r=>[r.s,r.lateral,r.speedMph].every(Number.isFinite)))throw Error('Nonfinite native racer');
          return {status:s.status,time:s.stageTimeSec,s:s.s,laps:s.completedLaps,finished:s.opponents.filter(r=>r.finished).length,
            lapTimes:[...s.lapTimes],crashes:s.majorCrashes,resets:s.boundaryResets,
            firstLapPileUp:new Set(s.field.stats.crashes.filter(crash=>crash.t<=30).map(crash=>crash.index)).size>=3,
            allDone:s.completedLaps>=2&&s.opponents.every(r=>r.finished)};
        })()`);
        progress.push(result);
        if(target!==null&&result.laps===0&&result.s>=target) {await capture(targets[targetIndex].name,'first-lap');targetIndex++;}
        if(result.laps>=1&&!clear) {await capture('Pit Straight','clear-second-lap');clear=true;}
        if(result.allDone||!['racing','countdown'].includes(result.status))break;
      }
      const final = progress.at(-1); report.qualities.push({quality,...setup,witness,progress,final}); await persist();
      if (!final?.allDone || final.laps !== 2 || final.finished !== 7 || final.crashes !== 0 || final.resets !== 0 || final.firstLapPileUp) throw Error('Native Ardennes field did not finish: '+JSON.stringify(final));
      if (targetIndex !== targets.length || !clear) throw Error('Native required art views were not reached');
    }
    report.passed = true;
  } finally {await persist();}
  console.log('Ardennes native field and actual High/Performance art views complete. No frame timing.');
}
