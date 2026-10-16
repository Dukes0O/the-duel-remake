// Private browser check for Tremblant Snow (card P4-TREMBLANT-SNOW): the winter
// landmark views (grid and pit lane, lodge with its smoke, ski runs with skiers,
// the frozen lake, the two ice patches and their boards, the chairlift, the snowy
// hills), then frame pacing with eight cars on the grid, on High and Performance.
// Race setup uses winter tyres. Saves are disposable and memory-only. Run:
//   node tools/browser-harness.mjs scenario tremblant-snow
// TREMBLANT_SNOW_PACING=0 takes the pictures only (no frame measurement).
import { writeFile } from 'node:fs/promises';
import { join } from 'node:path';

const entry = '/tools/menu-check.html?flags=tremblant-woods,tremblant-snow,grand-prix';
// TREMBLANT_SNOW_COURSE=tremblant-woods measures the autumn circuit the same way, for comparison.
const QA_MODE = process.env.DUEL_TREMBLANT_QA_MODE || 'combined';
if (!['combined','views','timing'].includes(QA_MODE)) throw Error('Unknown Tremblant QA mode');
const PICTURES = QA_MODE !== 'timing';
const COURSE_ID = process.env.TREMBLANT_SNOW_COURSE || 'tremblant-snow';
if (QA_MODE === 'timing' && COURSE_ID !== 'tremblant-snow')
  throw Error('Named timing requires actual Tremblant Snow');
// Card limit (Claude, 11 October): delivered 95th percentile frame at most 18.5 ms with eight cars on the grid.
const P95_LIMIT_MS = 18.5;
if (QA_MODE === 'timing' && process.env.TREMBLANT_SNOW_PACING === '0')
  throw Error('Timing-only mode cannot disable its measurements');
const PACING = QA_MODE !== 'views' && process.env.TREMBLANT_SNOW_PACING !== '0';

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
    if (index < 0) throw Error('Tremblant Snow is not on the course list (is its switch on?)');
    app.profile = {...app.profile, credits: 1e6, courses: {version: 1, unlocked: [...new Set([...(app.profile.courses?.unlocked || []), ${JSON.stringify(COURSE_ID)}])]}};
    if (!app._saveProfile()) throw Error('Fixture could not be saved in temporary storage');
    app.audio.setMuted?.(true);
    if (!app.startCampaign({startStage: index, seed: 1989, fieldSeed: 12, fieldSize: 7, mode: ${JSON.stringify(mode)}, car: 'falcone_f42', difficulty: 'casual', cpuDifficulty: 'medium', tyre: 'winter'}))
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
  ['grid-and-pits', [-30, -3, 2.4], [60, -12, 2]],
  ['pit-lane', [70, 2, 2.2], [160, -13, 1.5]],
  ['lodge-and-ski-runs', [10, -14, 4], [170, 100, 22]],
  ['lodge-smoke', [110, 55, 12], [172, 100, 38]],
  ['lodge-smoke-near', [140, 75, 25], [172, 100, 40]],
  ['ski-runs-skiers', [140, 22, 7], [215, 85, 12]],
  ['hill-from-above', [235, 10, 70], [235, 112, 14]],
  ['ski-mountain', [230, 4, 5], [235, 330, 70]],
  ['frozen-lake', [560, 8, 2.2], [690, 50, 1.2]],
  ['lake-wide', [520, 0, 12], [700, 120, -2]],
  ['dock-on-ice', [660, 10, 2.5], [690, 24, 0.5]],
  ['ice-board-1', [790, 0, 2.2], [880, 0, 1]],
  ['ice-patch-1', [880, 0, 2.5], [960, 0, 0.5]],
  ['ice-patch-2', [1700, 0, 2.5], [1765, 0, 0.5]],
  ['chairlift-from-the-road', [2560, 0, 3], [2701, 0, 9]],
  ['chairlift-from-the-side', [2701, -55, 5], [2701, 0, 8]],
  ['hairpin-banks', [1790, -2, 3], [1860, 12, 1]],
  ['devils-chicane', [3150, 0, 3], [3260, 6, 1]],
  ['timber-straight', [2300, 0, 3], [2500, 0, 1.5]],
];

export async function run(context) {
  await context.command('Emulation.setDeviceMetricsOverride', { width: 1280, height: 720, deviceScaleFactor: 1, mobile: false });
  const reports = [];
  for (const quality of ['high', 'performance']) {
    await prepare(context, quality);
    // Landmark views from a free camera (High only; the pictures are for Claude's finishing pass).
    if (PICTURES && quality === 'high') {
      await startRace(context, 'duel');
      await context.evaluate(`(() => { const hud = document.querySelector('#race-hud'); if (hud) hud.style.visibility = 'hidden'; document.querySelectorAll('details').forEach(node => { node.open = false; node.style.display = 'none'; }); })()`);
      for (const [name, from, to] of VIEWS) {
        await context.evaluate(`window.__views.look(${JSON.stringify(from)}, ${JSON.stringify(to)})`);
        await context.screenshot(`tremblant-snow-view-${name}`);
        if (false) console.log('PROBE', await context.evaluate(`(() => { const out = []; window.__render.scene.traverse(o => { if (o.name === 'Lake' || o.name === 'Chimney smoke' ) { const p = o.getWorldPosition(new o.position.constructor()); out.push([o.name, o.visible, o.material.opacity, o.material.transparent, o.renderOrder, p.x|0, p.y|0, p.z|0, o.parent?.visible]); } }); const c = window.__render.camera.position; return JSON.stringify({out: out.slice(0,5), n: out.length, cam: [c.x|0,c.y|0,c.z|0]}); })()`));
      }
      await context.evaluate('window.__views.clear()');
      if (!PACING && QA_MODE === 'combined') return;
      await prepare(context, quality);
    }
    // Eight cars on the grid with the five lamps lit.
    await startRace(context, 'grandprix');
    await context.waitFor(`window.__qaApp.duel.state.status==='countdown' && window.__qaApp.duel.state.field?.start.lights>=5`, `${quality} five start lights`, 30_000);
    const lamps = await context.evaluate(`(() => {
      const s = window.__qaApp.duel.state;
      return {cars: s.opponents.length + 1, lights: s.field.start.lights, tyre: s.tyre};
    })()`);
    if (lamps.cars !== 8 || (COURSE_ID === 'tremblant-snow' && lamps.tyre !== 'winter')) throw Error(`${quality}: the grid is wrong ${JSON.stringify(lamps)}`);
    // Hold the lights on while measuring: a sample is cancelled if the race changes state under it.
    await context.evaluate(`(() => { const s = window.__qaApp.duel.state; s.field.hold = 1e6; s.countdown = 1e6; })()`);
    if (PICTURES) await context.screenshot(`tremblant-snow-grid-lamps-${quality}`);
    if (PACING) reports.push(await measure(context, quality, '8 cars on the grid', lamps.cars));
  }
  if (QA_MODE === 'views') console.log('Frame timing: run in the frame step');
  const misses = reports.filter(r => r.p95 > P95_LIMIT_MS);
  await writeFile(join(context.outputDir, 'tremblant-snow-frame-pacing.json'), JSON.stringify({ mode: QA_MODE, timing: QA_MODE === 'views' ? 'run in the frame step' : 'measured', reports, misses: QA_MODE === 'views' ? null : misses.length }, null, 2) + '\n');
  if (misses.length) throw Error('Frame limit missed: ' + misses.map(r => `${r.quality} ${r.label} p95 ${r.p95} ms`).join('; '));
}
