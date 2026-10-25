// ARDENNES-STAVELOT-STONE: look views of the Stavelot village for the round sheets.
// Existing browser harness, disposable memory-only App, no race and no frame measurement.
import {writeFile} from 'node:fs/promises';
import {join} from 'node:path';
import {nativeBundle} from './p4-panorama.mjs';

// Views by station offset from the village centre (s) and lateral, eye height and target.
const VIEWS = [
  {name: 'from-the-road', eye: [-55, -4, 3.2], target: [10, 38, 4]},
  {name: 'street', eye: [-60, 28, 1.7], target: [10, 29, 3]},
  {name: 'house-close', eye: [-12, 33, 2.2], target: [0, 40, 3.2]},
  {name: 'village-above', eye: [-70, -2, 35], target: [-10, 38, 1.5]},
];

export async function run(context) {
  const report = {passed: false, captures: []};
  await context.command('Emulation.setDeviceMetricsOverride', {width: 1280, height: 720, deviceScaleFactor: 1, mobile: false});
  const bundle = await nativeBundle();
  await context.navigate('/tools/menu-check.html?flags=ardennes-forest');
  await context.waitFor('window.__qaApp?.visualReady && !!window.__render', 'memory-only Ardennes menu', 60000);
  await context.evaluate(bundle);
  await context.evaluate(`(() => {
    const app = window.__qaApp;
    if (!Object.getOwnPropertyDescriptor(window, 'localStorage')?.value || !window.name.startsWith('__duel_qa_tab_v2:'))
      throw Error('Memory-only QA required');
    window.__panQa.ownTestCourses(app); app.audio.setMuted(true); app.setGraphicsQuality('high');
    const stage = [...document.querySelector('#scene-select').options].map(option => Number(option.value))
      .find(index => app.getMenuCourse(index)?.def.id === 'ardennes-forest');
    if (!Number.isSafeInteger(stage) || !app.startCampaign({mode: 'timetrial', startStage: stage, car: 'stuttgart_959s', seed: 1989}))
      throw Error('Ardennes start rejected');
    app.stop();
    document.head.insertAdjacentHTML('beforeend', '<style>details,#overlay,.rear-view-frame,.hud,#hud{display:none!important}</style>');
  })()`);
  await context.waitFor('(()=>{window.__render.renderFrame();return window.__qaApp.visualReady && document.querySelector("#view3d").dataset.trackKitAsset==="ready";})()', 'real kits', 90000);
  for (const view of VIEWS) {
    const position = await context.evaluate(`(() => {
      const a = window.__qaApp, c = a.duel.course, town = c.def.circuitLandmarks.find(row => row.id === 'stavelot-valley-town');
      const v = ${JSON.stringify(view)}, at = (s, lateral) => {
        const p = c.groundAt(town.s + s, lateral);
        return {p, y: window.__panQa.renderedGroundHeight(c, {...p, s: town.s + s, off: lateral})};
      };
      const e = at(v.eye[0], v.eye[1]), t = at(v.target[0], v.target[1]);
      a.inspectionCamera = {position: [e.p.x, e.y + v.eye[2], e.p.z], target: [t.p.x, t.y + v.target[2], t.p.z]};
      window.__render.renderFrame(); return a.inspectionCamera.position;
    })()`);
    await context.waitFor(`(()=>{const c=window.__render.camera,p=${JSON.stringify(position)};window.__render.renderFrame();return Math.hypot(c.position.x-p[0],c.position.y-p[1],c.position.z-p[2])<.001;})()`, 'camera ' + view.name, 10000);
    const file = 'stavelot-' + view.name + (process.env.STAVELOT_TAG ? '-' + process.env.STAVELOT_TAG : '');
    await context.screenshot(file);
    report.captures.push({view: view.name, file: file + '.png', position});
  }
  report.passed = true;
  await writeFile(join(context.outputDir, 'stavelot-stone.json'), JSON.stringify(report, null, 2) + '\n');
}
