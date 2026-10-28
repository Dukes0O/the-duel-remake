// C2 road views and native downhill run. Memory-only saves, no frame timing.
import {writeFile} from 'node:fs/promises';
import {join} from 'node:path';
import {nativeBundle} from './p4-panorama.mjs';

export async function run(context) {
  const report = {passed: false, captures: []};
  await context.command('Emulation.setDeviceMetricsOverride', {width: 1280, height: 720, deviceScaleFactor: 1, mobile: false});
  try {
    await context.navigate('/tools/menu-check.html?flags=grand-prix,kogane-pass');
    await context.waitFor('window.__qaApp?.visualReady && !!window.__render', 'memory-only menu', 60000);
    await context.evaluate(await nativeBundle());
    report.setup = await context.evaluate(`(() => {
      const a = window.__qaApp;
      if (!Object.getOwnPropertyDescriptor(window, 'localStorage')?.value || !window.name.startsWith('__duel_qa_tab_v2:'))
        throw Error('Memory-only QA required');
      window.__panQa.ownTestCourses(a); a.audio.setMuted(true); a.setGraphicsQuality('high');
      const stage = [...document.querySelector('#scene-select').options].map(o => Number(o.value))
        .find(i => a.getMenuCourse(i)?.def.id === 'kogane-pass');
      if (!Number.isSafeInteger(stage) || !a.startCampaign({mode: 'grandprix', startStage: stage,
        car: 'falcone_f42', seed: 1989, fieldSeed: 1000, cpuDifficulty: 'medium', difficulty: 'casual'}))
        throw Error('Native Grand Prix start rejected');
      a.stop();
      if (a.duel.state.opponents.length !== 5 || a.duel.state.lapsTotal !== 1 || a.duel.state.traffic.length)
        throw Error('Expected six-car one-run Grand Prix');
      // C3 tunes the full field. C2 follows the existing drive-through profile.
      if (!a.startCampaign({mode: 'duel', startStage: stage, car: 'falcone_f42', seed: 1989,
        cpuDifficulty: 'medium', difficulty: 'casual'})) throw Error('Native duel start rejected');
      a.stop(); a.autopilot = true; a._scriptedCrashDone = true;
      window.__panQa.useRacingLine(a, .95); a.onFrame?.(a.duel.state, 0);
      document.head.insertAdjacentHTML('beforeend', '<style>details,#overlay,.rear-view-frame{display:none!important}</style>');
      return {course: a.duel.course.def.id, length: a.duel.course.length, grandPrixField: 6, storage: 'memory-only'};
    })()`);
    await context.waitFor('(()=>{window.__render.renderFrame();return window.__qaApp.visualReady && document.querySelector("#view3d").dataset.trackKitAsset==="ready";})()', 'existing safety kits ready', 90000);
    for (const view of [
      {name: 'lakeside-start', s: 45, back: 30, off: -14, rise: 12, ahead: 85},
      {name: 'hairpin-above', piece: 'Cedar Hairpin', back: 25, off: 10, rise: 80, ahead: 30},
      {name: 'lower-sodium', piece: 'Sodium Hairpin', back: 35, off: -12, rise: 18, ahead: 30},
    ]) {
      const target = await context.evaluate(`(() => {
        const c = window.__qaApp.duel.course, v = ${JSON.stringify(view)};
        return v.s ?? c.script.pieces.find(p => p.name === v.piece).s0;
      })()`);
      for (let batch = 0; batch < 40; batch++) {
        const reached = await context.evaluate(`(() => {
          const a = window.__qaApp, s = a.duel.state;
          for (let i = 0; i < 600 && s.s < ${target} && ['countdown','racing'].includes(s.status); i++) a.advance(1/60, 1/60);
          return s.s >= ${target};
        })()`);
        if (reached) break;
        if (batch === 39) throw Error('Native driver did not reach ' + view.name);
      }
      const meta = await context.evaluate(`(() => {
        const a = window.__qaApp, c = a.duel.course, s = a.duel.state, v = ${JSON.stringify(view)}, at = ${target};
        const e = c.groundAt(at - v.back, v.off), t = c.groundAt(at + v.ahead, 0);
        a.inspectionCamera = {position: [e.x, e.y + v.rise, e.z], target: [t.x, t.y + 1, t.z]};
        const before = JSON.stringify(s); window.__render.renderFrame();
        if (JSON.stringify(s) !== before) throw Error('Render wrote race state');
        return {s: s.s, seconds: s.stageTimeSec, crashes: s.stageCrashes, camera: a.inspectionCamera};
      })()`);
      await context.waitFor('(()=>{const p=window.__qaApp.inspectionCamera.position,c=window.__render.camera.position;window.__render.renderFrame();return Math.hypot(c.x-p[0],c.y-p[1],c.z-p[2])<.001;})()', 'inspection camera', 10000);
      await context.screenshot('kogane-c2-' + view.name);
      report.captures.push({name: view.name, ...meta});
    }
    report.finish = await context.evaluate(`(() => {
      const a = window.__qaApp, s = a.duel.state;
      for (let i = 0; i < 60*240 && ['countdown','racing'].includes(s.status); i++) a.advance(1/60, 1/60);
      if (!s.results?.completed || s.stageCrashes || s.boundaryResets) throw Error('Native downhill run was not clean');
      return {status: s.status, seconds: s.stageTimeSec, crashes: s.stageCrashes, resets: s.boundaryResets};
    })()`);
    report.passed = true;
  } finally {
    await writeFile(join(context.outputDir, 'kogane-pass.json'), JSON.stringify(report, null, 2) + '\n');
  }
  console.log('Kogane: six-car Grand Prix admission, clean native downhill run and three road views. No frame timing.');
}
