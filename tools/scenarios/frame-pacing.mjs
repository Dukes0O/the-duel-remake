// Compare delivered frame intervals on the real HUD, mirror, and QA autopilot.
// The QA page installs disposable in-memory saves before the App loads.
import { readFile, writeFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { inspectNightProcesses, validateFramePacket } from '../full-check.mjs';
import { UPGRADE_TYPES } from '../../src/progression.js';

const entry = '/tools/menu-check.html';


export function assertNightFrameContext(context, env = process.env, busy = []) {
  if (context?.headed !== true || context.launchMode !== 'headed' ||
      env.DUEL_NIGHT_FRAMES !== '1' || env.DUEL_NIGHT_IDLE_AWAKE !== '1')
    throw Error('Official night frames require actual headed mode and declared idle, awake context.');
  if (busy.length) throw Error('Official night frames refused: another heavy job is active.');
}
export function assertArdennesFrameContext(context, env = process.env, busy = []) {
  if (context?.headed !== true || context.launchMode !== 'headed' ||
      env.ARDENNES_FRAMES_ONLY !== '1' || env.DUEL_FRAME_IDLE_AWAKE !== '1')
    throw Error('Ardennes frames require headed mode and declared idle, awake context.');
  if (busy.length) throw Error('Ardennes frames refused: another heavy job is active.');
}
export function validateArdennesFramePacket(packet) {
  if (packet?.schema !== 1 || packet.mode !== 'ardennes-simple' || packet.reports?.length !== 2)
    throw Error('Missing complete Ardennes frame packet.');
  for (const [index, quality] of ['High', 'Performance'].entries()) {
    const row = packet.reports[index];
    if (row.quality !== quality || row.course !== 'ardennes-forest' || row.gridPiece !== 'Pit Straight' ||
        row.cars !== 8 || row.frames !== 120 || row.headed !== true || row.visible !== true ||
        row.memoryOnlySaves !== true || row.appRunning !== true || row.rearView !== 'ready' ||
        !Number.isFinite(row.countdownBefore) || !Number.isFinite(row.countdownAfter) ||
        row.countdownAfter <= row.countdownBefore || !Number.isFinite(row.p95) || row.p95 <= 0 || row.p95 > 18.5 ||
        !Number.isFinite(row.worldBuildMs) || row.worldBuildMs < 0 || row.worldBuildMs >= 1000 ||
        !Number.isFinite(row.constructionMs) || row.constructionMs < 0)
      throw Error(quality + ': invalid or failed real Ardennes eight-car grid frames.');
  }
  return packet;
}
export function earnCar2FrameSelection(env = process.env) {
  return env.EARN_CAR_2_FRAMES_ONLY === '1'
    ? {courseId: 'panorama-ridge', car: 'mclaren_f1', flags: 'panorama-ridge,earned-cars,grand-prix'} : null;
}
export function assertEarnCar2FrameContext(context, env = process.env, busy = []) {
  if (context?.headed !== true || context.launchMode !== 'headed' ||
      env.EARN_CAR_2_FRAMES_ONLY !== '1' || env.DUEL_FRAME_IDLE_AWAKE !== '1')
    throw Error('F1 frames require headed mode and declared idle, awake context.');
  if (busy.length) throw Error('F1 frames refused: another heavy job is active.');
}
export function validateEarnCar2FramePacket(packet, {warn = () => {}} = {}) {
  if (packet?.schema !== 1 || packet.mode !== 'earn-car-2-simple' || packet.reports?.length !== 2)
    throw Error('Missing complete F1 frame packet.');
  for (const [index, quality] of ['High', 'Performance'].entries()) {
    const row = packet.reports[index];
    if (row?.quality === quality && Number.isFinite(row.constructionMs) && row.constructionMs > 5000)
      warn(`${quality}: full first-race load ${row.constructionMs} ms exceeds 5000 ms (warning only).`);
    if (row?.quality !== quality || row.course !== 'panorama-ridge' || row.sourceCar !== 'mclaren_f1' ||
        !Array.isArray(row.roster) || row.roster.length !== 8 || !row.roster.every(car => car === 'mclaren_f1') ||
        row.cars !== 8 || row.frames !== 120 || row.headed !== true || row.visible !== true ||
        row.memoryOnlySaves !== true || row.appRunning !== true || row.rearView !== 'ready' ||
        !Number.isFinite(row.countdownBefore) || !Number.isFinite(row.countdownAfter) ||
        row.countdownAfter <= row.countdownBefore || !Number.isFinite(row.p95) || row.p95 <= 0 || row.p95 > 18.5 ||
        !Number.isFinite(row.worldBuildMs) || row.worldBuildMs < 0 || row.worldBuildMs >= 1000 ||
        !Number.isFinite(row.constructionMs) || row.constructionMs < 0)
      throw Error(quality + ': invalid or failed real Panorama eight-F1 grid frames.');
  }
  return packet;
}
export function prepareEarnCar2FramePlayer(app, quality, upgradeTypes) {
  app.returnToMenu();
  if (!app.addPlayer('F1 Frame QA ' + quality).ok)
    throw Error('Memory-only native F1 temporary player creation failed.');
  app.profile = {...app.profile, credits: 50000,
    unlockedCars: [...app.profile.unlockedCars, 'mclaren_f1'],
    upgrades: {...app.profile.upgrades, mclaren_f1: Object.fromEntries(Object.keys(upgradeTypes).map(type => [type, 3]))},
    heli: {...app.profile.heli, version: 1, carsAt: {...app.profile.heli?.carsAt, mclaren_f1: 'panorama-ridge'}}};
  if (!app._saveProfile() || !app.purchaseCourse('panorama-ridge').ok)
    throw Error('Memory-only native F1 course purchase failed.');
}
export function summarizeNightFrames(values) {
  if (values.length !== 120 || values.some(value => !Number.isFinite(value) || value <= 0))
    throw Error('Expected 120 real positive delivered RAF intervals.');
  const sorted = [...values].sort((a, b) => a - b);
  return {frames: 120, p50: sorted[59], p95: sorted[113], max: sorted[119]};
}
export function prepareNightPlayer(app, quality, courseId = 'harbour-lights') {
  app.returnToMenu();
  if (!app.addPlayer('Frame QA ' + quality).ok)
    throw Error('Memory-only native temporary player creation failed.');
  app.profile = {...app.profile, credits: 50000};
  if (!app._saveProfile() || !app.purchaseCourse(courseId).ok)
    throw Error('Memory-only native course purchase failed.');
}
async function measureNight(context, quality, courseId = 'harbour-lights', carId = 'falcone_f42') {
  const ardennes = courseId === 'ardennes-forest';
  const earnedF1 = courseId === 'panorama-ridge' && carId === 'mclaren_f1';
  const assertContext = earnedF1 ? assertEarnCar2FrameContext : ardennes ? assertArdennesFrameContext : assertNightFrameContext;
  assertContext(context, process.env, inspectNightProcesses());
  await context.navigate(earnedF1 ? `${entry}?flags=${earnCar2FrameSelection().flags}&frame-pacing=earn-car-2-${quality}` :
    ardennes ? `${entry}?flags=ardennes-forest&frame-pacing=ardennes-${quality}` :
    `${entry}?frame-pacing=night-${quality}`);
  await context.waitFor(`document.readyState==='complete' && !!window.__qaApp &&
    document.querySelector('#view3d')?.dataset.vehicleAsset==='ready' &&
    !!Object.getOwnPropertyDescriptor(window,'localStorage')?.value`, `${quality} isolated night menu`, 60_000);
  await context.evaluate(`(() => {
    const select = document.querySelector('#graphics-quality');
    select.value = ${JSON.stringify(quality)};
    select.dispatchEvent(new Event('change', {bubbles: true}));
    document.querySelectorAll('details').forEach(node => {node.open = false;});
  })()`);
  await context.waitFor(`document.querySelector('#graphics-quality')?.value===${JSON.stringify(quality)} &&
    document.querySelector('#view3d')?.dataset.vehicleAsset==='ready'`, `${quality} normal renderer`, 60_000);
  const observed = await context.evaluate(`(async () => {
    const app = window.__qaApp, view = document.querySelector('#view3d');
    const requestedCourse = ${JSON.stringify(courseId)}, requestedCar = ${JSON.stringify(carId)};
    if (document.hidden || document.visibilityState !== 'visible') throw Error('Night tab is hidden.');
    if ((requestedCourse === 'harbour-lights' ? app._switches().state(requestedCourse) !== 'on' : !app._switches().enabled(requestedCourse)) || app._switches().state('grand-prix') !== 'on')
      throw Error('Night frames require released Harbour Lights and Grand Prix.');
    const stage = [...document.querySelector('#scene-select').options].map(option => Number(option.value))
      .find(index => app.getMenuCourse(index).def.id === requestedCourse);
    if (!Number.isInteger(stage)) throw Error('Requested frame course is absent from the real menu.');
    if (${earnedF1}) {
      if (!app._switches().enabled('earned-cars')) throw Error('F1 frames require the earned-cars switch.');
      (${prepareEarnCar2FramePlayer.toString()})(app, ${JSON.stringify(quality)}, ${JSON.stringify(Object.fromEntries(Object.keys(UPGRADE_TYPES).map(type => [type, true])))});
    } else (${prepareNightPlayer.toString()})(app, ${JSON.stringify(quality)}, requestedCourse);
    app.setLightingMood('clear');
    const previousBuild = view.dataset.worldBuilds, started = performance.now();
    if (!app.startCampaign({startStage: stage, seed: 1989, fieldSeed: 12, fieldSize: 7,
      mode: 'grandprix', car: requestedCar, difficulty: 'casual', cpuDifficulty: 'medium'}))
      throw Error('Native night grid did not start.');
    app.start();
    const state = app.duel.state, course = app.duel.course;
    if (course.def.id !== requestedCourse || (requestedCourse === 'harbour-lights' && (course.def.timeOfDay !== 'night' ||
      !course.def.lightPath?.keyframes?.length || course.def.lightPath.keyframes.some(key => key.look !== 'night'))) ||
      (requestedCourse === 'ardennes-forest' && course.script.pieceAt(state.s).name !== 'Pit Straight') ||
      state.mode !== 'grandprix' || state.opponents.length + 1 !== 8 || state.traffic.length ||
      (${earnedF1} && (state.car !== requestedCar || state.opponents.some(actor => actor.car !== requestedCar))) ||
      state.qualifying || app.autopilot || app.inspectionCamera || state.paused)
      throw Error('Native grid, night lighting or normal gameplay context is wrong.');
    let constructionMs;
    await new Promise((done, reject) => {
      const ready = () => {
        if (performance.now() - started > 60000) return reject(Error('Complete night scene failed to initialize.'));
        if (document.hidden || !app.running) return reject(Error('Native visible App loop stopped.'));
        if (app.visualReady && view.dataset.worldBuilds !== previousBuild &&
          view.dataset.vehicleAsset === 'ready' && view.dataset.trackKitAsset === 'ready' &&
          view.dataset.rearView === 'ready' && Number(view.dataset.worldReadyMs) > 0) {
          constructionMs = performance.now() - started;
          return done();
        }
        requestAnimationFrame(ready);
      };
      requestAnimationFrame(ready);
    });
    const before = state.field.start.elapsed, intervals = [];
    await new Promise((done, reject) => {
      let previous = null;
      const sample = now => {
        if (document.hidden || document.visibilityState !== 'visible' || !app.running || !app.visualReady ||
          state !== app.duel.state || course !== app.duel.course || state.status !== 'countdown' || state.paused ||
          state.opponents.length + 1 !== 8 || app.autopilot || app.inspectionCamera ||
          (${earnedF1} && (state.car !== requestedCar || state.opponents.some(actor => actor.car !== requestedCar))) ||
          view.dataset.rearView !== 'ready' || view.dataset.vehicleAsset !== 'ready' ||
          view.dataset.trackKitAsset !== 'ready' || (app.ambientOcclusionEnabled !== false ? 'high' : 'performance') !== ${JSON.stringify(quality)})
          return reject(Error('Visible native eight-car countdown or quality changed during timing.'));
        if (previous !== null) intervals.push(now - previous);
        previous = now;
        if (intervals.length === 120) return done();
        requestAnimationFrame(sample);
      };
      requestAnimationFrame(sample);
    });
    if (!(state.field.start.elapsed > before)) throw Error('App simulation did not run during the frame sample.');
    const worldBuildText = view.dataset.worldBuildMs, worldBuildMs = Number(worldBuildText);
    if (typeof worldBuildText !== 'string' || !worldBuildText.trim() || !Number.isFinite(worldBuildMs))
      throw Error('Missing or malformed actual world-build measurement.');
    return {${earnedF1 ? "sourceCar: state.car, roster: [state.car, ...state.opponents.map(actor => actor.car)]," : ''}
      course: course.def.id, cars: state.opponents.length + 1, night: course.def.timeOfDay === 'night', gridPiece: course.script?.pieceAt(state.s)?.name ?? null, intervals,
      constructionMs, worldBuildMs, worldReadyMs: Number(view.dataset.worldReadyMs),
      appRunning: app.running, countdownBefore: before, countdownAfter: state.field.start.elapsed,
      rearView: view.dataset.rearView, renderPipeline: view.dataset.renderPipeline,
      visible: document.visibilityState === 'visible',
      memoryOnlySaves: !!Object.getOwnPropertyDescriptor(window, 'localStorage')?.value};
  })()`);
  assertContext(context, process.env, inspectNightProcesses());
  const {intervals, ...details} = observed;
  const report = {quality: quality === 'high' ? 'High' : 'Performance', ...details,
    ...summarizeNightFrames(intervals), headed: context.headed};
  await context.screenshot(`${earnedF1 ? 'earn-car-2-simple' : ardennes ? 'ardennes-simple' : 'night-simple'}-${quality}`);
  return report;
}
export async function reuseNightFrames(context,{packetPath,priorPassed,
  readText=file=>readFile(file,'utf8'),writeText=writeFile}={}) {
  const expected=resolve(context.outputDir,'..','..','frames','frame-pacing.json');
  if(typeof packetPath!=='string'||resolve(packetPath).toLowerCase()!==expected.toLowerCase())
    throw Error('Night frame reuse requires the same owned evidence leaf.');
  if(priorPassed!==true)throw Error('The original simple frame stage failed; no second measurement is allowed.');
  const packet=JSON.parse(await readText(packetPath));
  validateFramePacket(packet);
  const original=JSON.parse(await readText(join(dirname(packetPath),'report.json')));
  if(original.scenario!=='frame-pacing'||original.passed!==true||original.headed!==true||
    original.memoryOnlySaves!==true||original.issues?.length!==0||original.warnings?.length!==0)
    throw Error('The original simple frame harness verdict failed or is incomplete.');
  const reused={...packet,reused:true,sourcePacket:packetPath};
  await writeText(join(context.outputDir,'frame-pacing.json'),JSON.stringify(reused,null,2)+'\n');
  return reused;
}
export async function runNightFrames(context,{measure=measureNight,writeText=writeFile}={}) {
  const reports=[],failures=[];
  for(const quality of ['high','performance']) {
    try{reports.push(await measure(context,quality));}
    catch(error) {
      const failed={quality:quality==='high'?'High':'Performance',passed:false,error:error.message||String(error)};
      reports.push(failed);failures.push(failed);
    }
  }
  const packet={schema:1,mode:'night-simple',reports,failures,warnings:[]};
  if(failures.length) {
    await writeText(join(context.outputDir,'frame-pacing.json'),JSON.stringify(packet,null,2)+'\n');
    throw Error(failures.map(row=>row.quality+': '+row.error).join('; '));
  }
  try {validateFramePacket(packet,{warn:message=>packet.warnings.push(message)});}
  finally {await writeText(join(context.outputDir,'frame-pacing.json'),JSON.stringify(packet,null,2)+'\n');}
  for(const message of packet.warnings)console.log('WARNING '+message);
  return packet;
}

async function measure(context, quality) {
  await context.navigate(`${entry}?frame-pacing=${quality}`);
  await context.waitFor(`document.readyState==='complete' && !!window.__qaApp &&
    document.querySelector('#view3d')?.dataset.vehicleAsset==='ready' &&
    !!Object.getOwnPropertyDescriptor(window,'localStorage')?.value`, `${quality} isolated menu`, 60_000);
  await context.evaluate(`(() => {
    const select=document.querySelector('#graphics-quality');
    select.value=${JSON.stringify(quality)};
    select.dispatchEvent(new Event('change',{bubbles:true}));
  })()`);
  await context.waitFor(`document.querySelector('#graphics-quality')?.value===${JSON.stringify(quality)} &&
    document.querySelector('#view3d')?.dataset.vehicleAsset==='ready' &&
    !document.querySelector('#start-engine')?.disabled`, `${quality} renderer ready`, 60_000);
  await context.evaluate(`(() => {
    const button=[...document.querySelectorAll('button')].find(node=>node.textContent==='Start driving performance sample');
    if(!button)throw Error('Missing performance drive control');
    button.click();
  })()`);
  await context.waitFor(`window.__qaApp?.running && window.__qaApp?.duel?.state?.status==='racing' &&
    document.querySelector('#view3d')?.dataset.vehicleAsset==='ready'`, `${quality} driving`, 30_000);
  await new Promise(done=>setTimeout(done,1200));
  await context.evaluate(`(() => {
    const button=[...document.querySelectorAll('button')].find(node=>node.textContent==='Measure frame pacing');
    if(!button)throw Error('Missing frame measurement control');
    button.click();
  })()`);
  await context.waitFor(`document.querySelector('#performance-results')?.textContent?.includes('"frames": 120')`,
    `${quality} 120 measured frames`, 35_000);
  const report = await context.evaluate(`JSON.parse(document.querySelector('#performance-results').textContent).at(-1)`);
  if(report.quality!== (quality==='high'?'High':'Performance') || report.frames!==120 ||
     !Number.isFinite(report.p95) || report.p95<=0 || report.over33ms<0)
    throw Error(`${quality}: invalid frame measurement: ${JSON.stringify(report)}`);
  await context.screenshot(`frame-${quality}`);
  console.log(`${quality}: p50 ${report.p50} ms, p95 ${report.p95} ms, >33ms ${report.over33ms}`);
  return report;
}

export async function run(context) {
  if(process.env.DUEL_NIGHT_FRAME_REUSE==='1')return reuseNightFrames(context,{
    packetPath:process.env.DUEL_NIGHT_FRAME_PACKET,priorPassed:process.env.DUEL_NIGHT_FRAME_PASSED==='1'});
  await context.command('Emulation.setDeviceMetricsOverride', {
    width: 1280, height: 720, deviceScaleFactor: 1, mobile: false,
  });
  const earnedF1 = earnCar2FrameSelection();
  if (earnedF1) {
    const reports = [], warnings = [];
    try {
      for (const quality of ['high', 'performance'])
        reports.push(await measureNight(context, quality, earnedF1.courseId, earnedF1.car));
      const packet = {schema: 1, mode: 'earn-car-2-simple', reports, warnings};
      try {validateEarnCar2FramePacket(packet, {warn: message => warnings.push(message)});}
      finally {await writeFile(join(context.outputDir, 'frame-pacing.json'), JSON.stringify(packet, null, 2) + '\n');}
      for (const message of warnings) console.log('WARNING ' + message);
      return packet;
    } catch (error) {
      let readiness;
      try {
        readiness = await context.evaluate(`(() => {
          const app = window.__qaApp, state = app?.duel?.state;
          return {course: app?.duel?.course?.def?.id, status: state?.status,
            sourceCar: state?.car, roster: state ? [state.car, ...state.opponents.map(actor => actor.car)] : [],
            running: app?.running, visualReady: app?.visualReady, countdown: state?.field?.start?.elapsed,
            cars: state?.opponents?.length + 1, visibility: document.visibilityState,
            memoryOnlySaves: !!Object.getOwnPropertyDescriptor(window, 'localStorage')?.value,
            view: {...document.querySelector('#view3d')?.dataset}};
        })()`);
      } catch (captureError) {readiness = {captureError: captureError.message};}
      await writeFile(join(context.outputDir, 'frame-readiness.json'), JSON.stringify(readiness, null, 2) + '\n');
      await writeFile(join(context.outputDir, 'frame-pacing.json'), JSON.stringify({schema: 1,
        mode: 'earn-car-2-simple', reports, warnings, error: error.message}, null, 2) + '\n');
      throw error;
    }
  }
  if (process.env.ARDENNES_FRAMES_ONLY === '1') {
    const reports = [];
    try {
      for (const quality of ['high', 'performance']) reports.push(await measureNight(context, quality, 'ardennes-forest'));
      const packet = {schema:1,mode:'ardennes-simple',reports};
      await writeFile(join(context.outputDir,'frame-pacing.json'),JSON.stringify(packet,null,2)+'\n');
      validateArdennesFramePacket(packet);
    } catch (error) {
      let readiness;
      try {
        readiness = await context.evaluate(`(() => {
          const app = window.__qaApp, state = app?.duel?.state;
          return {course:app?.duel?.course?.def?.id, status:state?.status,
            running:app?.running, visualReady:app?.visualReady, countdown:state?.field?.start?.elapsed,
            cars:state?.opponents?.length + 1, visibility:document.visibilityState,
            memoryOnlySaves:!!Object.getOwnPropertyDescriptor(window,'localStorage')?.value,
            view:{...document.querySelector('#view3d')?.dataset}};
        })()`);
      } catch (captureError) { readiness = {captureError:captureError.message}; }
      await writeFile(join(context.outputDir,'frame-readiness.json'),JSON.stringify(readiness,null,2)+'\n');
      await writeFile(join(context.outputDir,'frame-pacing.json'),JSON.stringify({schema:1,mode:'ardennes-simple',reports,error:error.message},null,2)+'\n');
      throw error;
    }
    return;
  }
  if (process.env.DUEL_NIGHT_FRAMES === '1') return runNightFrames(context);
  const reports=[];
  for(const quality of ['high','performance'])reports.push(await measure(context,quality));
  await writeFile(join(context.outputDir,'frame-pacing.json'),JSON.stringify({reports},null,2)+'\n');
}
