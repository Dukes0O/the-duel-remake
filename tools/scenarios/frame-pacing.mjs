// Compare delivered frame intervals on the real HUD, mirror, and QA autopilot.
// The QA page installs disposable in-memory saves before the App loads.
import { readFile, writeFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { inspectNightProcesses, validateFramePacket } from '../full-check.mjs';
import { UPGRADE_TYPES } from '../../src/progression.js';
import { armMissions } from '../../src/heli/heli-missions.js';
import { createMissions } from '../../src/heli/heli-save.js';
import { skiZone } from '../../src/ski/runs/summit-zones.js';
import { SKI_PADS } from '../../src/ski/ski-session.js';
import { GUIDE } from '../../src/ski/ski-guide.js';

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
  const labFan = carId === 'mcmurtry_speirling';
  if (labFan && process.env.LAB_FAN_FRAMES_ONLY !== '1')
    throw Error('Speirling frames require the explicit LAB_FAN_FRAMES_ONLY opt-in.');
  const sameCarGrid = labFan || (courseId === 'panorama-ridge' && carId === 'mclaren_f1');
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
    } else {
      (${prepareNightPlayer.toString()})(app, ${JSON.stringify(quality)}, requestedCourse);
      if (${labFan}) {
        if (app._switches().state('lab') !== 'on' || app._switches().state('lab-tuning') !== 'on')
          throw Error('Speirling frames require both released Lab switches.');
        app.profile = {...app.profile,
          unlockedCars: [...new Set([...app.profile.unlockedCars, requestedCar])],
          heli: {...app.profile.heli, version: 1, carsAt: {...app.profile.heli?.carsAt, [requestedCar]: requestedCourse}}};
        if (!app._saveProfile()) throw Error('Memory-only Speirling player setup failed.');
      }
    }
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
      (${sameCarGrid} && (state.car !== requestedCar || state.opponents.some(actor => actor.car !== requestedCar))) ||
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
          (${sameCarGrid} && (state.car !== requestedCar || state.opponents.some(actor => actor.car !== requestedCar))) ||
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
    return {${sameCarGrid ? "sourceCar: state.car, roster: [state.car, ...state.opponents.map(actor => actor.car)]," : ''}
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

// ---- HELI-VIEW-FRAMES: the moguls skier view and the Summit avalanche hover ----
// SKI_FRAMES_ONLY=1 times the moguls run at Summit seen from the skier (the default chase camera).
// RESCUE_FRAMES_ONLY=1 times the hover over the Summit avalanche with the rescue line hanging below.
// Both run High and Performance with the same guards as the Summit option (headed, idle, alone) and rule 8's limits.
// Existing hooks only: the helipad visit button, the ski drop, the radio and cruise actions, as ski-view.mjs and
// rescue-view.mjs use them. A page-side pilot flies the long approach fast (not timed); only the 120 real frames are.
const TRAINED_LESSONS = {liftoff: true, hover: true, landing: true, carry: true};
const HELI_VIEW = {
  ski: {flags: 'helicopter,forest-fire,rescue,summit-run,heli-skiing', mode: 'ski-simple'},
  rescue: {flags: 'helicopter,forest-fire,rescue,summit-run', mode: 'rescue-simple'},
};
const pause = ms => new Promise(done => setTimeout(done, ms));
export function heliViewFrameSelection(env = process.env) {
  const ski = env.SKI_FRAMES_ONLY === '1', rescue = env.RESCUE_FRAMES_ONLY === '1';
  if (ski && rescue) throw Error('Choose SKI_FRAMES_ONLY or RESCUE_FRAMES_ONLY, not both.');
  return ski ? 'ski' : rescue ? 'rescue' : null;
}
export function validateHeliViewFramePacket(packet, kind, {warn = () => {}} = {}) {
  if (!HELI_VIEW[kind] || packet?.schema !== 1 || packet.mode !== HELI_VIEW[kind].mode || packet.reports?.length !== 2)
    throw Error('Missing complete ' + kind + ' frame packet.');
  for (const [index, quality] of ['High', 'Performance'].entries()) {
    const row = packet.reports[index];
    if (row?.quality === quality && Number.isFinite(row.worldReadyMs) && row.worldReadyMs > 5000)
      warn(`${quality}: Summit world ready ${row.worldReadyMs} ms exceeds 5000 ms (warning only).`);
    const viewOk = kind === 'ski'
      ? row?.run === 'moguls' && row.skiing === true
      : row?.rescue === 'avalanche' && row.lineOut === true && Number.isFinite(row.hoverMetres) && row.hoverMetres <= 15;
    if (row?.quality !== quality || row.view !== kind || row.course !== 'summit-run' || !viewOk ||
        row.frames !== 120 || row.headed !== true || row.visible !== true || row.memoryOnlySaves !== true ||
        row.appRunning !== true || row.worldRebuilds !== 0 ||
        !Number.isFinite(row.progressBefore) || !Number.isFinite(row.progressAfter) || row.progressAfter <= row.progressBefore ||
        !Number.isFinite(row.p95) || row.p95 <= 0 || row.p95 > 18.5 ||
        !Number.isFinite(row.worldBuildMs) || row.worldBuildMs < 0 || row.worldBuildMs >= 1000 ||
        !Number.isFinite(row.worldReadyMs) || row.worldReadyMs < 0)
      throw Error(`${quality}: invalid or failed real ${kind === 'ski' ? 'moguls skier' : 'Summit avalanche hover'} frames (delivered p95 at most 18.5 ms, world build under 1000 ms).`);
  }
  return packet;
}
// A temporary memory-only player who owns Summit and has done the lessons (the ski drop or the rescue call is added by heli).
export function prepareHeliFramePlayer(app, quality, heli) {
  app.returnToMenu();
  if (!app.addPlayer('Heli Frame QA ' + quality).ok)
    throw Error('Memory-only native temporary player creation failed.');
  app.profile = {...app.profile, credits: 50000,
    courses: {version: 1, unlocked: [...new Set([...(app.profile.courses?.unlocked || []), 'tremblant-woods', 'summit-run'])]}, heli};
  if (!app._saveProfile()) throw Error('Memory-only helicopter player setup failed.');
}
// A rescue call waiting for an avalanche at Summit (as rescue-view.mjs builds its calls).
function summitAvalancheHeli(date = new Date()) {
  const pad = n => String(n).padStart(2, '0');
  const armed = armMissions(createMissions(), {date: '2026-10-14', playerName: 'QA'});
  return {version: 1, fuelKg: 400, refuels: 3, lessons: TRAINED_LESSONS,
    playDay: {last: date.getFullYear() + '-' + pad(date.getMonth() + 1) + '-' + pad(date.getDate()), count: 30},
    missions: {...armed, count: armed.need, call: {kind: 'avalanche', id: `avalanche-${armed.draws}`, courseId: 'summit-run', day: 30, answered: false}}};
}
// Page helpers: the scripted pilot and skier of ski-view.mjs, and the straight climb, cruise leg and climb to the slide
// of rescue-view.mjs and the Summit rescue test. The ground comes from the course the way the helicopter's ground does.
const heliQaSource = pads => `(window.__heliQa = (() => {
  const app = () => window.__qaApp, clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v)), wrap = a => Math.atan2(Math.sin(a), Math.cos(a));
  const ground = (x, z) => { const c = app().duel.course, n = c.nearest(x, z); return c.groundAt(n.s, n.lateral).y; };
  const highest = (x, z, r = 10) => { let top = -Infinity; for (const [dx, dz] of [[0, 0], [r, 0], [-r, 0], [0, r], [0, -r]]) top = Math.max(top, ground(x + dx, z + dz)); return top; };
  const pilot = (view, target, {speed = 12, sink = 4} = {}) => {
    const h = view.heli, fx = Math.sin(h.heading), fz = Math.cos(h.heading), rx = -fz, rz = fx;
    const dx = target.x - h.x, dz = target.z - h.z, d = Math.hypot(dx, dz), want = Math.min(speed, d * .4);
    const wx = d > .01 ? dx / d * want : 0, wz = d > .01 ? dz / d * want : 0, ex = wx - h.vx, ez = wz - h.vz, c = v => clamp(v, -1, 1);
    return {pitch: c((ex * fx + ez * fz) * .25), roll: c((ex * rx + ez * rz) * .25),
      lift: c(Math.max(-sink, Math.min(sink, target.y - h.y)) * .3 - h.vy * .3), yaw: 0};
  };
  // Fast-forward the session's own step (120 a second). The test is looked at every "every" steps; with no test, just run the seconds.
  const fly = (seconds, controls, until, every = 1) => {
    const s = app().heliSession;
    for (let i = 0; i < Math.round(seconds * 120); i++) {
      const events = s.step(controls(s.view()));
      app()._heliEvents(events);
      if (events.some(e => e.type === 'crashed')) throw Error('The helicopter crashed on the way.');
      if (until && i % every === 0 && until(s.view())) return true;
    }
    if (until) throw Error('The flight took too long.');
    return true;
  };
  // From the home pad over to Summit with the ski drop taken, then on to a ski pad (ski-view.mjs).
  const toSummit = () => {
    const s = app().heliSession;
    fly(120, v => pilot(v, {x: v.heli.x - 300, z: v.heli.z + 300, y: 100}, {speed: 30, sink: 8}), v => v.cruiseOffered);
    if (!s.acceptCruise()) throw Error('The cruise leg was refused.');
    fly(10, () => ({lift: 0}), v => v.phase === 'flying' && v.courseId === 'summit-run');
  };
  const toPad = name => {
    const pad = ${JSON.stringify(pads)}[name];
    let y = pad.y + 40, tick = 0;
    fly(900, v => {
      const h = v.heli, d = Math.hypot(pad.x - h.x, pad.z - h.z) || 1, ux = (pad.x - h.x) / d, uz = (pad.z - h.z) / d;
      if (tick++ % 12 === 0) {
        let top = -Infinity;
        for (let k = 0; k <= 16; k++) top = Math.max(top, highest(h.x + ux * k * 25, h.z + uz * k * 25));
        y = d > 150 ? Math.min(top + 110, ground(h.x, h.z) + 285) : pad.y + 40;
      }
      if (h.y < y - 12) return pilot(v, {x: h.x, z: h.z, y}, {speed: 1, sink: 8});
      return pilot(v, {x: pad.x, z: pad.z, y}, {speed: 18, sink: 8});
    }, v => Math.hypot(v.heli.x - pad.x, v.heli.z - pad.z) < 3 && Math.hypot(v.heli.vx, v.heli.vz) < .6);
    fly(120, v => pilot(v, {x: pad.x, z: pad.z, y: pad.y - 2}, {speed: 2, sink: 2.5}), v => v.heli.onGround);
  };
  // The skier: steer for the planned line a little ahead, tuck where it runs straight, then skid to a stop in the pickup.
  const skier = (line, pickup, g) => {
    const cum = [0];
    for (let i = 1; i < line.length; i++) cum.push(cum[i - 1] + Math.hypot(line[i].x - line[i - 1].x, line[i].z - line[i - 1].z));
    let progress = 0;
    const at = d => {
      d = clamp(d, 0, cum.at(-1)); let i = 1; while (i < cum.length - 1 && cum[i] < d) i++;
      const k = (d - cum[i - 1]) / (cum[i] - cum[i - 1] || 1);
      return {x: line[i - 1].x + (line[i].x - line[i - 1].x) * k, z: line[i - 1].z + (line[i].z - line[i - 1].z) * k};
    };
    return s => {
      let best = Infinity;
      for (let i = 1; i < line.length; i++) {
        if (cum[i] < progress - 1) continue;
        if (cum[i - 1] > progress + 80) break;
        const ax = line[i - 1].x, az = line[i - 1].z, bx = line[i].x, bz = line[i].z, span = cum[i] - cum[i - 1] || 1;
        const k = clamp(((s.x - ax) * (bx - ax) + (s.z - az) * (bz - az)) / (span * span), 0, 1), side = Math.hypot(s.x - (ax + (bx - ax) * k), s.z - (az + (bz - az) * k));
        if (side < best) { best = side; progress = Math.max(progress, cum[i - 1] + k * span); }
      }
      const end = progress >= cum.at(-1) - 1, goal = end ? pickup : at(progress + clamp(g.lookAheadMin + g.lookAheadPerSpeed * s.speed, g.lookAheadMin, g.lookAheadMax));
      const error = wrap(Math.atan2(goal.x - s.x, goal.z - s.z) - s.heading), toPickup = Math.hypot(pickup.x - s.x, pickup.z - s.z), stop = end && toPickup < 11;
      return {turn: s.grounded && !stop ? clamp(-error / g.turnFullAt, -1, 1) : 0, tuck: !end && Math.abs(error) < g.tuckBelow, skate: !stop,
        skid: stop || (end && s.speed * s.speed / 7 > toPickup - 4)};
    };
  };
  // Rescue: straight up with the line hanging, then the autopilot out of the area and the cruise leg to another course.
  const cruiseTo = courseId => {
    const a = app(), s = a.heliSession;
    fly(60, v => pilot(v, {x: v.heli.x, z: v.heli.z, y: v.zone.y + 60}, {speed: 1, sink: 4}), v => v.heli.y - v.zone.y > 50, 30);
    a.heliSetDestination(courseId);
    if (!s.autopilotOn) a._inputAction('heli-autopilot');
    fly(400, () => ({}), v => v.cruiseOffered, 30);
    if (s.autopilotOn) a._inputAction('heli-autopilot');
    a._inputAction('heli-cruise');
    fly(8, () => ({}), null);
  };
  // Rescue: up the mountain to the slide and into a hover 40 m above the obstacles, the rescuer hanging below
  // (the Summit rescue test's climb). Aimed ten times a second, since the ground ahead is looked at each time.
  const toSlide = slide => {
    const finalY = highest(slide.x, slide.z, 12) + 40;
    let held = null, tick = 0;
    fly(1500, v => {
      if (tick++ % 12 === 0) {
        const h = v.heli, d = Math.hypot(slide.x - h.x, slide.z - h.z), ux = d > 1 ? (slide.x - h.x) / d : 0, uz = d > 1 ? (slide.z - h.z) / d : 0;
        let y = -Infinity;
        for (let ahead = 0; ahead <= Math.min(d, 400); ahead += 20) y = Math.max(y, highest(h.x + ux * ahead, h.z + uz * ahead, 12));
        const want = d < 100 ? finalY : y + 45;
        held = pilot(v, {x: slide.x, z: slide.z, y: want}, {speed: d < 100 ? 4 : h.y < want - 30 ? 4 : h.y < want - 12 ? 12 : 24, sink: 6});
      }
      return held;
    }, v => Math.hypot(v.heli.x - slide.x, v.heli.z - slide.z) < 8 && Math.abs(v.heli.y - finalY) < 3 && Math.hypot(v.heli.vx, v.heli.vz) < 1, 12);
    window.__heliHold = {x: slide.x, z: slide.z, y: finalY};
  };
  // The page-side hold: the real loop keeps the hover with the same controls a player has (it steers nothing else).
  const install = () => {
    const s = app().heliSession, step = s.step.bind(s);
    window.__heliHold = null;
    s.step = (controls, dt) => window.__heliHold ? step(pilot(s.view(), window.__heliHold, {speed: 1, sink: 2}), dt) : step(controls, dt);
  };
  return {ground, highest, pilot, fly, toSummit, toPad, skier, cruiseTo, toSlide, install};
})())`;

// Put the player into the view and stop there, ready to time (the long approach is flown fast and is not timed).
export async function reachHeliView(context, kind, quality) {
  const setup = HELI_VIEW[kind];
  await context.navigate(`${entry}?flags=${setup.flags}&frame-pacing=${kind}-${quality}`);
  await context.waitFor(`document.readyState==='complete' && !!window.__qaApp &&
    document.querySelector('#view3d')?.dataset.vehicleAsset==='ready' &&
    !!Object.getOwnPropertyDescriptor(window,'localStorage')?.value`, `${quality} isolated heli menu`, 60_000);
  await context.evaluate(`(() => {
    const select = document.querySelector('#graphics-quality');
    select.value = ${JSON.stringify(quality)};
    select.dispatchEvent(new Event('change', {bubbles: true}));
    document.querySelectorAll('details').forEach(node => {node.open = false;});
  })()`);
  await context.waitFor(`document.querySelector('#graphics-quality')?.value===${JSON.stringify(quality)} &&
    document.querySelector('#view3d')?.dataset.vehicleAsset==='ready' && !document.querySelector('#start-engine')?.disabled`,
    `${quality} normal renderer`, 60_000);
  const heli = kind === 'ski' ? {version: 1, fuelKg: 400, lessons: TRAINED_LESSONS, refuels: 3} : summitAvalancheHeli();
  await context.evaluate(`(() => {
    const app = window.__qaApp;
    if (document.hidden || document.visibilityState !== 'visible') throw Error('Heli frame tab is hidden.');
    (${prepareHeliFramePlayer.toString()})(app, ${JSON.stringify(quality)}, ${JSON.stringify(heli)});
    app.audio.setMuted?.(true); app.heliAudio?.setMuted?.(true);
    document.querySelectorAll('details').forEach(node => {node.hidden = true;});
    if (!app.visitHeli()) throw Error('The helipad visit did not start (is the helicopter switch on?).');
  })()`);
  await context.waitFor(`window.__qaApp.duel.state.status==='heli' && window.__qaApp.visualReady`, 'the home pad', 120_000);
  await context.evaluate(`${heliQaSource(SKI_PADS)}.install()`);
  if (kind === 'ski') {
    const zone = skiZone('moguls');
    await context.waitFor(`!!document.querySelector('[data-ski-board="drop"]')`, 'the ski box at the home pad', 30_000);
    await context.evaluate(`document.querySelector('[data-ski-board="drop"]').click()`);
    await context.waitFor(`window.__qaApp.heliSession.view().ski?.flight?.kind==='drop'`, 'the ski drop taken', 10_000);
    await context.evaluate(`window.__heliQa.toSummit()`);
    await context.evaluate(`window.__heliQa.toPad(${JSON.stringify(zone.pad)})`);
    await context.waitFor(`window.__qaApp.duel.course.def.id==='summit-run' && window.__qaApp.visualReady &&
      window.__qaApp.heliSession.view().ski.pad===${JSON.stringify(zone.pad)}`, 'on the Devils Playground pad, the Summit world drawn', 300_000);
    await context.waitFor(`!!document.querySelector('[data-ski-run="moguls"]')`, 'the moguls entry on the run menu', 30_000);
    await pause(3000);
    // The scripted skier skis the moguls in the game's own loop: each step the session takes gets its controls.
    await context.evaluate(`(() => {
      const s = window.__qaApp.heliSession, step = s.step.bind(s), drive = window.__heliQa.skier(${JSON.stringify(zone.line)}, ${JSON.stringify(zone.pickup)}, ${JSON.stringify({...GUIDE, ...zone.guide})});
      s.step = (controls, dt) => step(window.__skiGo && s.phase === 'skiing' ? drive(s.view().ski.run.skier) : controls, dt);
      document.querySelector('[data-ski-run="moguls"]').click();
    })()`);
    await context.waitFor(`window.__qaApp.heliSession.phase==='skiing' && window.__qaApp.visualReady`, 'stepped out onto the moguls', 30_000);
    await pause(8000);
    await context.evaluate(`window.__skiGo = true`);
    await context.waitFor(`(window.__qaApp.heliSession.view().ski.run?.t ?? 0) > 6`, 'skiing the moguls', 120_000);
  } else {
    await context.evaluate(`window.__qaApp._inputAction('heli-radio')`);
    await context.waitFor(`!!window.__qaApp.heliView().rescue?.active`, 'the avalanche call answered', 30_000);
    await context.evaluate(`(() => {
      const a = window.__qaApp, r = a.heliSession.fitRescueLine();
      a._heliEvents(a.heliSession.takeEvents());
      if (!r.ok) throw Error(r.reason);
    })()`);
    await context.evaluate(`window.__heliQa.cruiseTo('summit-run')`);
    await context.waitFor(`window.__qaApp.heliView()?.courseId==='summit-run' && window.__qaApp.visualReady`, 'arrival at Summit, the world drawn', 120_000);
    await context.evaluate(`(() => {
      const slide = window.__qaApp.heliView().rescue.active.sites?.slide;
      if (!slide) throw Error('The avalanche slide is not on the view.');
      window.__heliQa.toSlide(slide);
    })()`);
    await context.waitFor(`window.__qaApp.visualReady && !!window.__qaApp.heliView().rescue.line`, 'hovering over the slide with the line out', 60_000);
    await pause(2000);
  }
}
// Time 120 real frames of the view reached by reachHeliView; every frame checks that the view has not changed.
export async function sampleHeliView(context, kind, quality) {
  return context.evaluate(`(async () => {
    const app = window.__qaApp, view = document.querySelector('#view3d'), s = app.heliSession;
    const kind = ${JSON.stringify(kind)}, quality = ${JSON.stringify(quality)}, builds = view.dataset.worldBuilds;
    const slide = kind === 'rescue' ? s.view().rescue.active.sites.slide : null;
    const read = () => {
      const v = s.view();
      if (kind === 'ski') {
        const r = v.ski?.run;
        return {ok: s.phase === 'skiing' && !!r && r.run === 'moguls' && r.started && !r.finished && !r.ended && !r.out, progress: r?.t};
      }
      const a = v.rescue?.active, h = v.heli, hover = slide && h ? Math.hypot(h.x - slide.x, h.z - slide.z) : Infinity;
      return {ok: s.phase === 'flying' && !!a && a.kind === 'avalanche' && a.here && a.courseId === 'summit-run' && !!v.rescue.line && hover <= 15,
        progress: a?.clockSeconds, hover};
    };
    const wrong = () => document.hidden || document.visibilityState !== 'visible' || !app.running || !app.visualReady ||
      app.duel.state.paused || app.duel.course.def.id !== 'summit-run' || view.dataset.worldBuilds !== builds ||
      (app.ambientOcclusionEnabled !== false ? 'high' : 'performance') !== quality;
    const first = read();
    if (!first.ok || wrong()) throw Error('The ' + kind + ' view is not ready to time.');
    const intervals = [];
    await new Promise((done, reject) => {
      let previous = null, count = 0;
      const sample = now => {
        if (wrong() || (count++ % 10 === 0 && !read().ok)) return reject(Error('The ' + kind + ' view changed during timing.'));
        if (previous !== null) intervals.push(now - previous);
        previous = now;
        if (intervals.length === 120) return done();
        requestAnimationFrame(sample);
      };
      requestAnimationFrame(sample);
    });
    const last = read();
    if (!last.ok) throw Error('The ' + kind + ' view ended during timing.');
    const worldBuildText = view.dataset.worldBuildMs, worldBuildMs = Number(worldBuildText);
    if (typeof worldBuildText !== 'string' || !worldBuildText.trim() || !Number.isFinite(worldBuildMs))
      throw Error('Missing or malformed actual world-build measurement.');
    return {course: app.duel.course.def.id, view: kind, intervals, progressBefore: first.progress, progressAfter: last.progress,
      ...(kind === 'ski' ? {run: s.view().ski.run.run, skiing: s.phase === 'skiing'} : {rescue: s.view().rescue.active.kind, lineOut: !!s.view().rescue.line, hoverMetres: last.hover}),
      worldBuildMs, worldReadyMs: Number(view.dataset.worldReadyMs), worldRebuilds: Number(view.dataset.worldBuilds) - Number(builds),
      appRunning: app.running, visible: document.visibilityState === 'visible', renderPipeline: view.dataset.renderPipeline,
      memoryOnlySaves: !!Object.getOwnPropertyDescriptor(window, 'localStorage')?.value};
  })()`);
}
async function measureHeliView(context, kind, quality) {
  assertNightFrameContext(context, process.env, inspectNightProcesses());
  await reachHeliView(context, kind, quality);
  const {intervals, ...details} = await sampleHeliView(context, kind, quality);
  assertNightFrameContext(context, process.env, inspectNightProcesses());
  const report = {quality: quality === 'high' ? 'High' : 'Performance', ...details, ...summarizeNightFrames(intervals), headed: context.headed};
  await context.screenshot(`${HELI_VIEW[kind].mode}-${quality}`);
  return report;
}
export async function runHeliViewFrames(context, kind, {measure = measureHeliView, writeText = writeFile} = {}) {
  const reports = [], failures = [], warnings = [];
  for (const quality of ['high', 'performance']) {
    try {reports.push(await measure(context, kind, quality));}
    catch (error) {
      const failed = {quality: quality === 'high' ? 'High' : 'Performance', passed: false, error: error.message || String(error)};
      reports.push(failed); failures.push(failed);
    }
  }
  const packet = {schema: 1, mode: HELI_VIEW[kind].mode, reports, failures, warnings};
  if (failures.length) {
    await writeText(join(context.outputDir, 'frame-pacing.json'), JSON.stringify(packet, null, 2) + '\n');
    throw Error(failures.map(row => row.quality + ': ' + row.error).join('; '));
  }
  try {validateHeliViewFramePacket(packet, kind, {warn: message => warnings.push(message)});}
  finally {await writeText(join(context.outputDir, 'frame-pacing.json'), JSON.stringify(packet, null, 2) + '\n');}
  for (const message of warnings) console.log('WARNING ' + message);
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
  // LAB-FAN: opt in to the existing busiest night-grid recipe, with eight fan cars.
  // DUEL_NIGHT_FRAMES and DUEL_NIGHT_IDLE_AWAKE retain its headed/idle guards.
  if (process.env.LAB_FAN_FRAMES_ONLY === '1')
    return runNightFrames(context, {measure: (ctx, quality) =>
      measureNight(ctx, quality, 'harbour-lights', 'mcmurtry_speirling')});
  // Summit release check: the same night recipe and guards on Summit Run.
  if (process.env.SUMMIT_FRAMES_ONLY === '1')
    return runNightFrames(context, {measure: (ctx, quality) => measureNight(ctx, quality, 'summit-run')});
  // HELI-VIEW-FRAMES: SKI_FRAMES_ONLY (moguls, skier view) or RESCUE_FRAMES_ONLY (Summit avalanche hover, line out),
  // with the same DUEL_NIGHT_FRAMES and DUEL_NIGHT_IDLE_AWAKE guards as the Summit option.
  const heliView = heliViewFrameSelection();
  if (heliView) return runHeliViewFrames(context, heliView);
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
