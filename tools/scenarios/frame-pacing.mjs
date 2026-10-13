// Compare delivered frame intervals on the real HUD, mirror, and QA autopilot.
// The QA page installs disposable in-memory saves before the App loads.
import { readFile, writeFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { inspectNightProcesses, validateFramePacket } from '../full-check.mjs';

const entry = '/tools/menu-check.html';


export function assertNightFrameContext(context, env = process.env, busy = []) {
  if (context?.headed !== true || context.launchMode !== 'headed' ||
      env.DUEL_NIGHT_FRAMES !== '1' || env.DUEL_NIGHT_IDLE_AWAKE !== '1')
    throw Error('Official night frames require actual headed mode and declared idle, awake context.');
  if (busy.length) throw Error('Official night frames refused: another heavy job is active.');
}
export function summarizeNightFrames(values) {
  if (values.length !== 120 || values.some(value => !Number.isFinite(value) || value <= 0))
    throw Error('Expected 120 real positive delivered RAF intervals.');
  const sorted = [...values].sort((a, b) => a - b);
  return {frames: 120, p50: sorted[59], p95: sorted[113], max: sorted[119]};
}
async function measureNight(context, quality) {
  assertNightFrameContext(context, process.env, inspectNightProcesses());
  await context.navigate(`${entry}?frame-pacing=night-${quality}`);
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
    if (document.hidden || document.visibilityState !== 'visible') throw Error('Night tab is hidden.');
    if (app._switches().state('harbour-lights') !== 'on' || app._switches().state('grand-prix') !== 'on')
      throw Error('Night frames require released Harbour Lights and Grand Prix.');
    const stage = [...document.querySelector('#scene-select').options].map(option => Number(option.value))
      .find(index => app.getMenuCourse(index).def.id === 'harbour-lights');
    if (!Number.isInteger(stage)) throw Error('Released Harbour Lights is absent from the real menu.');
    app.profile = {...app.profile, credits: 50000};
    if (!app._saveProfile() || !app.purchaseCourse('harbour-lights').ok) throw Error('Memory-only native course purchase failed.');
    app.setLightingMood('clear');
    const previousBuild = view.dataset.worldBuilds, started = performance.now();
    if (!app.startCampaign({startStage: stage, seed: 1989, fieldSeed: 12, fieldSize: 7,
      mode: 'grandprix', car: 'falcone_f42', difficulty: 'casual', cpuDifficulty: 'medium'}))
      throw Error('Native night grid did not start.');
    app.start();
    const state = app.duel.state, course = app.duel.course;
    if (course.def.id !== 'harbour-lights' || course.def.timeOfDay !== 'night' ||
      !course.def.lightPath?.keyframes?.length || course.def.lightPath.keyframes.some(key => key.look !== 'night') ||
      state.mode !== 'grandprix' || state.opponents.length + 1 !== 8 || state.traffic.length ||
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
    return {course: course.def.id, cars: state.opponents.length + 1, night: true, intervals,
      constructionMs, worldBuildMs: Number(view.dataset.worldBuildMs), worldReadyMs: Number(view.dataset.worldReadyMs),
      appRunning: app.running, countdownBefore: before, countdownAfter: state.field.start.elapsed,
      rearView: view.dataset.rearView, renderPipeline: view.dataset.renderPipeline,
      visible: document.visibilityState === 'visible',
      memoryOnlySaves: !!Object.getOwnPropertyDescriptor(window, 'localStorage')?.value};
  })()`);
  assertNightFrameContext(context, process.env, inspectNightProcesses());
  const {intervals, ...details} = observed;
  const report = {quality: quality === 'high' ? 'High' : 'Performance', ...details,
    ...summarizeNightFrames(intervals), headed: context.headed};
  await context.screenshot(`night-simple-${quality}`);
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
  const packet={schema:1,mode:'night-simple',reports,failures};
  await writeText(join(context.outputDir,'frame-pacing.json'),JSON.stringify(packet,null,2)+'\n');
  if(failures.length)throw Error(failures.map(row=>row.quality+': '+row.error).join('; '));
  validateFramePacket(packet);
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
  if (process.env.DUEL_NIGHT_FRAMES === '1') return runNightFrames(context);
  const reports=[];
  for(const quality of ['high','performance'])reports.push(await measure(context,quality));
  await writeFile(join(context.outputDir,'frame-pacing.json'),JSON.stringify({reports},null,2)+'\n');
}
