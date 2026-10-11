// Full native view: fresh seeded worlds, unchanged samples and presentation limits.
import {writeFile} from 'node:fs/promises';
import {join} from 'node:path';
import {nativeBundle} from './p4-panorama.mjs';
import {measureMainRearFrames} from './track-kits.mjs';

function prepare(quality, present) {
  const app = window.__qaApp, api = window.__render, host = document.querySelector('#view3d');
  if (!Object.getOwnPropertyDescriptor(window, 'localStorage')?.value ||
      !window.name.startsWith('__duel_qa_tab_v2:')) throw Error('Memory-only QA required');
  app.stop(); app.audio.setMuted(true); app.setGraphicsQuality(quality);
  window.__panQa.ownTestCourses(app);
  const index = [...document.querySelector('#scene-select').options]
    .map(option => Number(option.value)).find(i => app.getMenuCourse(i)?.def.id === 'panorama-ridge');
  if (index == null) throw Error('Actual Panorama course missing');
  const catalog = app.getMenuCourse(index).def, catalogBefore = JSON.stringify(catalog);
  const buildsBefore = Number(host.dataset.worldBuilds);
  if (!Number.isInteger(buildsBefore)) throw Error('Native world construction witness missing');
  if (!app.startCampaign({mode: 'grandprix', startStage: index, car: 'stuttgart_959s',
    seed: 1989, fieldSeed: 1000, cpuDifficulty: 'medium', difficulty: 'casual'}))
    throw Error('Native grid rejected');
  app.stop();
  const course = app.duel.course, state = app.duel.state, original = course.def;
  if (state.mode !== 'grandprix' || state.opponents.length !== 7 ||
      !original.kitPlacements?.length || !original.circuitLandmarks?.length)
    throw Error('Actual authored eight-car Grand Prix required');
  // This synchronous metadata copy precedes the first race-world draw. Never
  // hide an already populated owner or replace any ground, road or racer data.
  course.def = {...original,
    kitPlacements: present ? original.kitPlacements : [],
    circuitLandmarks: present ? original.circuitLandmarks : [],
    lightPath: {axis: 'race-progress', keyframes: [{at: 0, look: present ? 'night' : 'day'}]}};
  if (Number(host.dataset.worldBuilds) !== buildsBefore) throw Error('Race world built before metadata omission');
  const fixedLightPath = JSON.stringify(course.def.lightPath);
  const metadataExact = () => {
    if (JSON.stringify(course.def.lightPath) !== fixedLightPath) throw Error('Frame leg lighting changed');
    if (JSON.stringify(catalog) !== catalogBefore) throw Error('Course catalog changed');
    for (const key of Object.keys(original)) {
      if (!['kitPlacements', 'circuitLandmarks', 'lightPath'].includes(key) && course.def[key] !== original[key])
        throw Error('Complete native ground/road definition changed: ' + key);
    }
    if (Object.keys(course.def).length !== Object.keys(original).length)
      throw Error('Unexpected course definition field');
    if (present && (course.def.kitPlacements !== original.kitPlacements ||
        course.def.circuitLandmarks !== original.circuitLandmarks) ||
        !present && (course.def.kitPlacements.length || course.def.circuitLandmarks.length))
      throw Error('Authored presentation metadata changed');
  };
  const eye = course.groundAt(-68, -42), target = course.groundAt(-24, 0);
  app.inspectionCamera = {position: [eye.x, eye.y + 20, eye.z], target: [target.x, target.y + 1, target.z]};
  api.camera.position.fromArray(app.inspectionCamera.position);
  const stable = () => ({raceState: JSON.stringify(app.duel.state), profile: JSON.stringify(app.profile),
    storage: Array.from({length: localStorage.length}, (_, i) => localStorage.key(i))
      .sort().map(key => [key, localStorage.getItem(key)])});
  const before = JSON.stringify(stable());
  window.__panoramaFrames = {witness() {
    metadataExact();
    const readOnly = stable();
    if (JSON.stringify(readOnly) !== before) throw Error('Frame fixture changed race/profile/storage');
    if (Number(host.dataset.worldBuilds) !== buildsBefore + 1)
      throw Error('Frame leg did not construct one fresh native race world');
    const kits = api.scene.getObjectByName('Approved track kits');
    const landmarks = api.scene.getObjectByName('Authored circuit landmarks');
    if (present ? !kits?.visible || !kits.children.length || !landmarks?.visible ||
        !landmarks.getObjectByName('ridge-radio') || !landmarks.getObjectByName('pit-timing') : !!kits || !!landmarks)
      throw Error('Native world presentation does not match fresh metadata');
    const visible = selector => {
      const element = document.querySelector(selector), rect = element?.getBoundingClientRect();
      const style = element && getComputedStyle(element);
      return element && !element.hidden && rect.width > 0 && rect.height > 0 &&
        style.display !== 'none' && style.visibility !== 'hidden' && style.opacity !== '0';
    };
    if (!visible('#race-hud') || !visible('.rear-view-frame') || host.dataset.rearView !== 'ready' ||
        !(Number(host.dataset.rearViewDrawCalls) > 0)) throw Error('Production HUD/rear view inactive');
    const cars = api.scene.children.filter(node => node.visible && node.userData.vehicleKey);
    if (cars.length !== 8) throw Error('Missing actual native car');
    api.camera.updateWorldMatrix(true, false);
    const models = cars.map(car => {
      car.updateWorldMatrix(true, true);
      const projected = car.getWorldPosition(car.position.clone()); projected.y += .8; projected.project(api.camera);
      if (projected.z < -1 || projected.z > 1 || Math.abs(projected.x) >= .96 || Math.abs(projected.y) >= .96)
        throw Error('Native car outside frame view');
      return {car: car.userData.vehicleKey, position: car.position.toArray(), quaternion: car.quaternion.toArray()};
    });
    return {...readOnly, models, camera: api.camera.position.toArray(),
      target: [...app.inspectionCamera.target], course: course.def.id, hud: true, rear: true,
      kits: !!kits, landmarks: !!landmarks, lightPath: course.def.lightPath};
  }};
  metadataExact(); app.onFrame?.(state, 0); api.renderFrame();
}

export function validateFrameLeg(row) {
  for (const [name, timing, count] of [
    ['cpu', row.pacing.cpu, 360], ['delivered', row.pacing.delivered, 359],
    ['update', row.update, 360], ['combined', row.combined, 360]]) {
    if (timing?.samples !== count || !Number.isFinite(timing.p95) || timing.p95 <= 0)
      throw Error('Incomplete full-view ' + name + ' samples');
  }
  if (row.gpuSupported && (row.pacing.gpu?.samples < 288 || row.pacing.gpu?.samples > 360 ||
      !Number.isFinite(row.pacing.gpu?.p95) || row.pacing.gpu.p95 <= 0))
    throw Error('Incomplete full-view GPU samples');
  if (!row.gpuSupported && row.pacing.gpu) throw Error('Unsupported GPU cannot claim timing');
  if (row.scales.length !== 1 || row.ratios.length !== 1) throw Error('Changing full-view resolution');
}

export function compareFrameCosts(off, on) {
  validateFrameLeg(off); validateFrameLeg(on);
  for (const key of ['scales', 'ratios']) {
    if (JSON.stringify(off[key]) !== JSON.stringify(on[key])) throw Error('Paired full-view resolution differs');
  }
  if (off.gpuSupported !== on.gpuSupported) throw Error('Paired GPU support differs');
  const costs = {};
  for (const metric of ['cpu', 'gpu', 'delivered', 'combined']) {
    const baseline = metric === 'combined' ? off.combined : off.pacing[metric];
    const candidate = metric === 'combined' ? on.combined : on.pacing[metric];
    if (metric === 'gpu' && !off.gpuSupported) { costs.gpu = 'unsupported'; continue; }
    costs[metric] = {off: baseline.p95, on: candidate.p95, increase: candidate.p95 / baseline.p95 - 1,
      passed: candidate.p95 <= baseline.p95 * 1.10};
  }
  const delivered = {on: on.pacing.delivered.p95, limit: 18.5, passed: on.pacing.delivered.p95 <= 18.5};
  return {costs, delivered, passed: delivered.passed && Object.values(costs).every(value => value === 'unsupported' || value.passed)};
}

async function frameLeg(context, bundle, quality, look, pair) {
  // Navigation creates a fresh renderer/world; no populated owners are hidden.
  await context.navigate('/tools/menu-check.html?flags=grand-prix,panorama-ridge');
  await context.waitFor('window.__qaApp?.visualReady && !!window.__render', 'native memory menu', 60000);
  await context.evaluate(bundle + ';globalThis.__panQa=PanQa;');
  await context.evaluate('(' + prepare.toString() + ')(' + JSON.stringify(quality) + ',' + (look === 'on') + ')');
  await context.waitFor('(()=>{const a=window.__qaApp,v=window.__render;v.renderFrame();' +
    'return a.visualReady && document.querySelector("#view3d").dataset.trackKitAsset===' +
    JSON.stringify(look === 'on' ? 'ready' : 'off') + ' && v.camera.position.toArray().every((x,i)=>' +
    'Math.abs(x-a.inspectionCamera.position[i])<.001);})()', 'actual full race world and camera ready', 90000);
  const before = await context.evaluate('window.__panoramaFrames.witness()');
  const sample = await measureMainRearFrames(context, quality, 'Panorama pair' + pair + ' ' + look);
  const after = await context.evaluate('window.__panoramaFrames.witness()');
  if (JSON.stringify(before) !== JSON.stringify(after) || sample.raceState !== before.raceState ||
      JSON.stringify(sample.actorPoses) !== JSON.stringify(before.models))
    throw Error('Full-view sampling changed actual camera, native poses or presentation');
  validateFrameLeg(sample);
  return {...sample, pair, look, witness: before};
}

export async function run(context) {
  if (process.env.P4_PANORAMA_MEASURE_FRAMES !== '1') throw Error('Director must schedule a quiet frame slot');
  const report = {passed: false,
    scope: 'Fresh identical native eight-car grids: only kits/landmarks omitted before baseline world construction; day off versus night on. Complete mountain ground/road, main, rear and production HUD remain active. Stationary grid cost; no moving-field or art verdict.',
    protocol: {warmup: 120, cpu: 360, update: 360, combined: 360, delivered: 359, minimumGpu: 288,
      relativeLimit: .10, deliveredLimitMs: 18.5, sharedSamplerSource: '6e5f2d64'}, frames: [], comparisons: []};
  const persist = () => writeFile(join(context.outputDir, 'p4-panorama-frames.json'), JSON.stringify(report, null, 2) + '\n');
  const bundle = await nativeBundle();
  await context.command('Emulation.setDeviceMetricsOverride', {width: 1280, height: 720, deviceScaleFactor: 1, mobile: false});
  try {
    for (const quality of ['high', 'performance']) for (const pair of [1, 2]) {
      for (const look of pair === 1 ? ['off', 'on'] : ['on', 'off']) {
        report.frames.push(await frameLeg(context, bundle, quality, look, pair)); await persist();
      }
      const rows = report.frames.filter(row => row.quality === quality && row.pair === pair);
      const off = rows.find(row => row.look === 'off'), on = rows.find(row => row.look === 'on');
      for (const key of ['raceState', 'profile', 'storage', 'models', 'camera', 'target', 'course', 'hud', 'rear']) {
        if (JSON.stringify(off.witness[key]) !== JSON.stringify(on.witness[key]))
          throw Error('Fresh paired native witness differs: ' + key);
      }
      const comparison = {quality, pair, ...compareFrameCosts(off, on)};
      report.comparisons.push(comparison); await persist();
    }
    if (report.comparisons.some(row => !row.passed)) throw Error('Full-view original10%/combined10%/18.5ms limit exceeded');
    report.passed = true;
  } finally { await persist(); }
  console.log('Panorama quiet native full-view CPU/GPU/delivered/combined comparisons pass.');
}
