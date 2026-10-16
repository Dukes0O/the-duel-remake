// Private browser check for Tremblant Woods (card P4-TREMBLANT): the landmark
// views (grid and paddock, lodge and ski runs, lake and dock with mist, the
// chairlift from the road and from the side, the safety kit), then frame pacing
// with eight cars on the grid and on Timber Straight, on High and Performance.
// Saves are disposable and memory-only. Run:
//   node tools/browser-harness.mjs scenario tremblant-views
import { writeFile } from 'node:fs/promises';
import { join } from 'node:path';

const entry = '/tools/menu-check.html?flags=tremblant-woods,grand-prix';
const QA_MODE = process.env.DUEL_TREMBLANT_QA_MODE || 'combined';
if (!['combined','views','timing'].includes(QA_MODE)) throw Error('Unknown Tremblant QA mode');
const PICTURES = QA_MODE !== 'timing';
const COURSE_ID = 'tremblant-woods';
// The usual limit: a 95th percentile frame no slower than 30 frames a second,
// and no more than one frame in ten over that.
const P95_LIMIT_MS = 33.5, SLOW_FRAMES_LIMIT = 12;
const PACING = QA_MODE !== 'views';

async function prepare(context, quality) {
  await context.navigate(entry);
  await context.waitFor(`document.readyState==='complete' && !!window.__qaApp &&
    document.querySelector('#view3d')?.dataset.vehicleAsset==='ready' &&
    !!Object.getOwnPropertyDescriptor(window,'localStorage')?.value`, `${quality} isolated menu`, 60_000);
  await context.evaluate(`(() => {
    const select = document.querySelector('#graphics-quality');
    select.value = ${JSON.stringify(quality)};
    select.dispatchEvent(new Event('change', {bubbles: true}));
    document.querySelectorAll('details').forEach(node => { node.open = false; });
  })()`);
  await context.waitFor(`document.querySelector('#graphics-quality')?.value===${JSON.stringify(quality)} &&
    document.querySelector('#view3d')?.dataset.vehicleAsset==='ready' && !document.querySelector('#start-engine')?.disabled`,
  `${quality} renderer ready`, 60_000);
}

async function startRace(context, mode) {
  await context.evaluate(`(() => {
    const app = window.__qaApp;
    let index = -1;
    for (let i = 16; i < 24 && index < 0; i++) if (app.getMenuCourse(i)?.def.id === ${JSON.stringify(COURSE_ID)}) index = i;
    if (index < 0) throw Error('Tremblant Woods is not on the course list (is its switch on?)');
    app.profile = {...app.profile, credits: 1e6, courses: {version: 1, unlocked: [...new Set([...(app.profile.courses?.unlocked || []), ${JSON.stringify(COURSE_ID)}])]}};
    if (!app._saveProfile()) throw Error('Fixture could not be saved in temporary storage');
    app.audio.setMuted?.(true);
    if (!app.startCampaign({startStage: index, seed: 1989, fieldSeed: 12, fieldSize: 7, mode: ${JSON.stringify(mode)}, car: 'falcone_f42', difficulty: 'casual', cpuDifficulty: 'medium'}))
      throw Error('The race did not start');
    app.autopilot = false; app._scriptedCrashDone = true; app.setCamera('chase');
    window.__views = {
      render: n => { const s = app.duel.state; for (let i = 0; i < n; i++) { app.onFrame?.(s, 1 / 60); window.__render.renderFrame(); } },
      ready: () => { app.onFrame?.(app.duel.state, 0); window.__render?.renderFrame(); return app.visualReady && document.querySelector('#renderer-loading')?.hidden; },
      // Camera and target are written as [s, lateral, height above the ground there].
      look: (from, to) => {
        const c = app.duel.course, point = ([s, lateral, up]) => { const g = c.groundAt(s, lateral); return [g.x, g.y + up, g.z]; };
        app.inspectionCamera = {position: point(from), target: point(to)};
        window.__views.render(20);
      },
      clear: () => { delete app.inspectionCamera; },
      piece: id => app.duel.course.def.kitPlacements.find(item => item.id === id),
    };
  })()`);
  await context.waitFor('window.__views.ready()', 'race scene', 120_000);
}

async function measure(context, quality, label, cars) {
  const before = await context.evaluate(`(document.querySelector('#performance-results')?.textContent.match(/"frames": 120/g) || []).length`);
  await context.evaluate(`(() => {
    const button = [...document.querySelectorAll('button')].find(node => node.textContent === 'Measure frame pacing');
    if (!button) throw Error('Missing frame measurement control');
    button.click();
  })()`);
  await context.waitFor(`(document.querySelector('#performance-results')?.textContent.match(/"frames": 120/g) || []).length > ${before}`,
    `${quality} 120 measured frames`, 40_000);
  const report = await context.evaluate(`JSON.parse(document.querySelector('#performance-results').textContent).at(-1)`);
  if (!Number.isFinite(report.p95) || report.p95 <= 0 || report.frames !== 120) throw Error(`${quality}: invalid frame measurement ${JSON.stringify(report)}`);
  console.log(`${quality}, ${label}: p50 ${report.p50} ms, p95 ${report.p95} ms, >33ms ${report.over33ms}, draws ${report.drawCalls}, triangles ${report.triangles}`);
  const course = await context.evaluate('window.__qaApp.duel.course.def.id');
  return { quality, label, cars, ...report, course };
}

const VIEWS = [
  // [name, camera [s, lateral, up], target [s, lateral, up]]
  ['grid-and-gantry', [-30, -3, 2.4], [20, 0, 4]],
  ['paddock-pits', [50, 4, 2], [40, -30, 2]],
  ['grandstands', [30, -6, 3], [35, 31, 4]],
  ['lodge-and-ski-runs', [10, -14, 4], [170, 100, 22]],
  ['lodge-close', [100, 30, 5], [163, 78, 8]],
  ['lodge-front', [173, 52, 24], [173, 100, 22]],
  ['hill-from-above', [235, 10, 70], [235, 112, 14]],
  ['lake-and-mist', [560, 8, 2.2], [690, 50, 1.2]],
  ['dock', [660, 10, 2.5], [690, 24, 0.5]],
  ['chairlift-from-the-road', [2560, 0, 3], [2701, 0, 9]],
  ['chairlift-from-the-side', [2701, -55, 5], [2701, 0, 8]],
  ['chairlift-under', [2701, 4, 1.6], [2701, 40, 10]],
  ['hairpin-tyre-walls', [1790, -2, 3], [1860, 12, 1]],
  ['catch-fence', [1940, 3, 2.5], [1990, 14, 2]],
  ['armco-pine-drop', [380, -5, 2.5], [400, 12, 1]],
  ['autumn-trees', [3000, 20, 3], [3050, 40, 6]],
];

export async function run(context) {
  await context.command('Emulation.setDeviceMetricsOverride', { width: 1280, height: 720, deviceScaleFactor: 1, mobile: false });
  const reports = [];
  for (const quality of ['high', 'performance']) {
    await prepare(context, quality);
    // Landmark views from a free camera (High only; the pictures are for Claude's finishing pass).
    if (PICTURES && quality === 'high') {
      await startRace(context, 'duel');
      await context.evaluate(`(() => { const hud = document.querySelector('#race-hud'); if (hud) hud.style.visibility = 'hidden'; })()`);
      for (const [name, from, to] of VIEWS) {
        await context.evaluate(`window.__views.look(${JSON.stringify(from)}, ${JSON.stringify(to)})`);
        await context.screenshot(`tremblant-view-${name}`);
      }
      await context.evaluate('window.__views.clear()');
      await prepare(context, quality);
    }
    // Eight cars on the grid with the five lamps lit.
    await startRace(context, 'grandprix');
    await context.waitFor(`window.__qaApp.duel.state.status==='countdown' && window.__qaApp.duel.state.field?.start.lights>=5`, `${quality} five start lights`, 30_000);
    const lamps = await context.evaluate(`(() => {
      const s = window.__qaApp.duel.state;
      return {cars: s.opponents.length + 1, lights: s.field.start.lights};
    })()`);
    if (lamps.cars !== 8) throw Error(`${quality}: the grid is wrong ${JSON.stringify(lamps)}`);
    // Hold the lights on while measuring: a sample is cancelled if the race changes state under it.
    await context.evaluate(`(() => { const s = window.__qaApp.duel.state; s.field.hold = 1e6; s.countdown = 1e6; })()`);
    if (PICTURES) await context.screenshot(`tremblant-grid-lamps-${quality}`);
    if (PACING) reports.push(await measure(context, quality, '8 cars on the grid', lamps.cars));
    // Eight cars close together on Timber Straight, under the chairlift.
    await context.evaluate(`(() => {
      const app = window.__qaApp, s = app.duel.state, L = app.duel.course.length;
      s.field.hold = .5; s.countdown = .5;
      for (let i = 0; i < 900 && s.status !== 'racing'; i++) app.advance(1 / 60, 1 / 60);
      const at = ${JSON.stringify(2450)} + L;
      s.s = s.prevS = at; s.lateral = s.prevLateral = 0; s.speedMph = 150; s.headingError = 0; s.impactTimer = 0; s.airHeight = 0;
      s.opponents.forEach((car, i) => { car.s = car.prevS = at + 14 + i * 11; car.lateral = car.prevLateral = (i % 2 ? 3 : -3); car.speedMph = 150; car.headingError = 0; });
      app.autopilot = true;
      for (let i = 0; i < 40; i++) app.advance(1 / 60, 1 / 60);
    })()`);
    if (PICTURES) await context.screenshot(`tremblant-timber-eight-cars-${quality}`);
    if (PACING) reports.push(await measure(context, quality, '8 cars on Timber Straight', lamps.cars));
  }
  if (QA_MODE === 'views') console.log('Frame timing: run in the frame step');
  const misses = reports.filter(r => r.p95 > P95_LIMIT_MS || r.over33ms > SLOW_FRAMES_LIMIT);
  await writeFile(join(context.outputDir, 'tremblant-frame-pacing.json'), JSON.stringify({ mode: QA_MODE, timing: QA_MODE === 'views' ? 'run in the frame step' : 'measured', reports, misses: QA_MODE === 'views' ? null : misses.length }, null, 2) + '\n');
  if (misses.length) throw Error('Frame limit missed: ' + misses.map(r => `${r.quality} ${r.label} p95 ${r.p95} ms, ${r.over33ms} slow frames`).join('; '));
}
