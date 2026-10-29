// EIFEL-CROWN-C5 round pictures on the actual course, switch on, in the course's own overcast light.
// Private memory-only harness, existing inspection camera, no driving, no frame timing.
import {writeFile} from 'node:fs/promises';
import {join} from 'node:path';
import {nativeBundle} from './p4-panorama.mjs';

// Each view: where the camera stands and what it looks at, as [piece, metres from the piece start, metres
// across the road (left is positive), metres above the ground]; a piece of `null` reads the second number as
// the distance along the lap.
const views = [
  {name: 'castle', eye: ['Ridge Top', 205, -3, 4.2], target: [null, 3050, -110, 60]},
  {name: 'castle-ridge-b', eye: ['Ridge Top', 150, -3, 4.2], target: [null, 3050, -110, 60]},
  {name: 'castle-near', eye: [null, 3055, -3, 2.6], target: [null, 3050, -110, 55]},
  {name: 'village', eye: ['Wall Left', 135, -3, 2.8], target: [null, 3350, -44, 5]},
  {name: 'reservoir', eye: ['Reservoir Right', 20, -3, 3.4], target: [null, 5290, -108, 3]},
  {name: 'lodge', eye: ['Lodge Straight', 14, 4, 2.6], target: [null, 84, 54, 5]},
];

export async function run(context) {
  const report = {course: 'eifel-crown', card: 'EIFEL-CROWN-C5', round: 1, storage: 'memory-only', frameTiming: false, captures: []};
  try {
    await context.command('Emulation.setDeviceMetricsOverride', {width: 1280, height: 720, deviceScaleFactor: 1, mobile: false});
    await context.navigate('/tools/menu-check.html?flags=eifel-crown');
    await context.waitFor('window.__qaApp?.visualReady && !!window.__render', 'memory-only Eifel menu', 60000);
    await context.evaluate(await nativeBundle());
    await context.evaluate(`(() => {
      const a = window.__qaApp;
      if (!Object.getOwnPropertyDescriptor(window, 'localStorage')?.value || !window.name.startsWith('__duel_qa_tab_v2:'))
        throw Error('Memory-only QA required');
      window.__panQa.ownTestCourses(a); a.audio.setMuted(true); a.setGraphicsQuality('high');
      if (a.getMenuCourse(9)?.def.id !== 'eifel-crown' || !a.getMenuCourse(9).def.script)
        throw Error('Scripted road must occupy slot 9');
      // The course's own mood (defaultMood), set the way tools/visual-check.js sets it.
      a.setLightingMood(a.getMenuCourse(9).def.defaultMood);
      if (!a.startCampaign({mode: 'timetrial', startStage: 9, car: 'stuttgart_959s', seed: 1989, difficulty: 'casual'}))
        throw Error('Native Eifel start rejected');
      a.stop(); a.onFrame?.(a.duel.state, 0);
      document.head.insertAdjacentHTML('beforeend', '<style>details,#overlay,.rear-view-frame{display:none!important}</style>');
    })()`);
    await context.waitFor('(()=>{window.__render.renderFrame();return window.__qaApp.visualReady && document.querySelector("#view3d").dataset.trackKitAsset === "ready";})()',
      'native Eifel scenery loaded', 120000);
    // The light eases toward the mood over a few seconds of real time; take no picture until it has stopped moving.
    await context.waitFor(`(()=>{
      window.__render.renderFrame();
      const lights = [];
      window.__render.scene.traverse(o => { if (o.isHemisphereLight || o.isDirectionalLight) lights.push(o.intensity); });
      const now = lights.join(','), same = window.__lightSeen === now;
      window.__lightSeen = now; window.__lightStill = same ? (window.__lightStill || 0) + 1 : 0;
      return window.__lightStill >= 12;
    })()`, 'overcast light settled', 60000);
    for (const view of views) {
      const camera = await context.evaluate(`(() => {
        const a = window.__qaApp, c = a.duel.course, view = ${JSON.stringify(view)};
        const point = ([name, along, off, up]) => {
          const piece = name && c.script.pieces.find(p => p.name === name);
          if (name && !piece) throw Error('Missing road piece ' + name);
          const s = c.phase((piece ? piece.s0 : 0) + along), p = c.groundAt(s, off);
          const y = window.__panQa.renderedGroundHeight(c, {...p, s, off}, {requireSurface: true});
          if (!Number.isFinite(y)) throw Error('Camera ground missing at ' + name);
          return [p.x, y + up, p.z];
        };
        a.inspectionCamera = {position: point(view.eye), target: point(view.target)};
        a.onFrame?.(a.duel.state, 0); window.__render.renderFrame();
        return a.inspectionCamera;
      })()`);
      await context.waitFor(`(()=>{const a=window.__qaApp;a.onFrame?.(a.duel.state,0);window.__render.renderFrame();
        return Math.hypot(...window.__render.camera.position.toArray().map((v,i)=>v-${JSON.stringify(camera.position)}[i])) < .001;})()`,
        'inspection camera settled', 10000);
      const witness = await context.evaluate(`(() => {
        const a = window.__qaApp, before = JSON.stringify(a.duel.state), profile = JSON.stringify(a.profile);
        window.__render.renderFrame();
        if (JSON.stringify(a.duel.state) !== before || JSON.stringify(a.profile) !== profile) throw Error('Rendering changed the race or save');
        const d = a.duel.course.def;
        if (d.layoutVersion !== 3 || d.expansion) throw Error('Wrong Eifel road');
        return {id: d.id, mood: a.lightingMood, stateUnchanged: true};
      })()`);
      report.captures.push({view: view.name, camera, witness, path: await context.screenshot('eifel-c5-' + view.name)});
    }
    report.passed = true;
  } finally {
    await writeFile(join(context.outputDir, 'eifel-c5-views.json'), JSON.stringify(report, null, 2) + '\n');
  }
}
