// C2 road review only. Native memory-only scene, no frame measurements.
import {writeFile} from 'node:fs/promises';
import {join} from 'node:path';
import {nativeBundle} from './p4-panorama.mjs';
import {drawCircuit} from '../track-script.mjs';
import {EIFEL_CROWN} from '../../src/circuits/eifel-crown.js';

export async function run(context) {
  await context.command('Emulation.setDeviceMetricsOverride', {width: 1280, height: 720, deviceScaleFactor: 1, mobile: false});
  await writeFile(join(context.outputDir, 'eifel-c2-map.png'), drawCircuit(EIFEL_CROWN, {width: 1280, height: 720}).png());
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
    if (!a.startCampaign({mode: 'timetrial', startStage: 9, car: 'stuttgart_959s', seed: 1989, difficulty: 'casual'}))
      throw Error('Native Eifel start rejected');
    a.stop(); a.onFrame?.(a.duel.state, 0);
    document.head.insertAdjacentHTML('beforeend', '<style>details,#overlay,.rear-view-frame{display:none!important}</style>');
  })()`);
  await context.waitFor('(()=>{window.__render.renderFrame();return window.__qaApp.visualReady && document.querySelector("#view3d").dataset.trackKitAsset === "ready";})()', 'native Eifel boards loaded', 90000);
  const captures = [];
  for (const [view, pieceName, rise] of [['esses', 'First Ess', 22], ['ridge', 'Ridge Top', 16], ['valley', 'Reservoir Right', 24]]) {
    const camera = await context.evaluate(`(() => {
      const a = window.__qaApp, c = a.duel.course, p = c.script.pieces.find(p => p.name === ${JSON.stringify(pieceName)});
      if (!p) throw Error('Missing road piece');
      const eyeS = p.s0 - 30, targetS = p.s0 + 90, off = -18;
      const eye = c.groundAt(eyeS, off), target = c.groundAt(targetS, 0);
      const y = window.__panQa.renderedGroundHeight(c, {...eye, s: eyeS, off}, {requireSurface: true});
      if (!Number.isFinite(y)) throw Error('Camera ground missing');
      a.inspectionCamera = {position: [eye.x, y + ${rise}, eye.z], target: [target.x, target.y + 1, target.z]};
      window.__render.renderFrame();
      return a.inspectionCamera;
    })()`);
    await context.waitFor(`Math.hypot(...window.__render.camera.position.toArray().map((v,i)=>v-${JSON.stringify(camera.position)}[i])) < .001`, 'inspection camera', 10000);
    const witness = await context.evaluate(`(() => {
      const a = window.__qaApp, before = JSON.stringify(a.duel.state), profile = JSON.stringify(a.profile);
      window.__render.renderFrame();
      if (JSON.stringify(a.duel.state) !== before || JSON.stringify(a.profile) !== profile) throw Error('Rendering changed the race or save');
      if (a.duel.course.def.layoutVersion !== 3 || a.duel.course.def.expansion) throw Error('Wrong Eifel road');
      return {id: a.duel.course.def.id, layoutVersion: 3, stateUnchanged: true};
    })()`);
    captures.push({view, pieceName, camera, witness, path: await context.screenshot('eifel-c2-' + view)});
  }
  await writeFile(join(context.outputDir, 'eifel-views.json'), JSON.stringify({passed: true, memoryOnlySaves: true, captures}, null, 2) + '\n');
}
