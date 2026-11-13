// EVERBURN-PLAY-FIXES, fourth round: frame timing in the Scablands at its busiest view, a tool for Claude (modelled on convoy-frames.mjs
// and deep-frames.mjs). Job 4 (Slow Ride, the gas run) with Big Bess, the raiders of her first ambush and Old Smoke's furnace all in
// sight, on Performance, memory-only saves. Zero player input: the car stands behind Big Bess while the game runs for 120 delivered
// frames. The pass line is the one every frame check has: delivered p95 of 18.5 ms or less (AGENTS.md rule 8). Run it alone, headed
// (`node tools/run-browser-scenarios.mjs --scenarios everburn-frames --jobs 1 --headed`), with the laptop's own screen off and nothing else using the
// graphics card; a run with company is not counted. The report is `everburn-frames.json` in the scenario's output folder.
import {writeFile} from 'node:fs/promises';
import {join} from 'node:path';
import {summarizeNightFrames} from './frame-pacing.mjs';

const QUALITY = 'performance';
const P95_LIMIT_MS = 18.5;
const DONE_BEFORE_JOB_4 = ['hot-delivery', 'get-out-and-walk', 'run-him-down'];
// Big Bess is put 197 m down her road (the road is 647 m): just past 30 per cent, where the furnace begins to pace her on the high ground
// (src/world/jobs/furnace-sightings.js), and 11 m past the first ambush at 186 m, whose raiders stand on the road behind her (they give up
// 60 m beyond it). The car is then put behind her, at the first distance from which she, the raiders and the furnace are all in one picture.
const BESS_METRES = 197;

const click = (context, selector) => context.evaluate(`(() => {
  const button = document.querySelector(${JSON.stringify(selector)});
  if (!button || button.hidden || button.disabled) throw Error('Missing ' + ${JSON.stringify(selector)});
  button.click(); return true;
})()`);

export async function run(context) {
  await context.command('Emulation.setDeviceMetricsOverride', {width: 1280, height: 720, deviceScaleFactor: 1, mobile: false});
  const report = {card: 'EVERBURN-PLAY-FIXES', recipe: 'everburn-frames', quality: QUALITY, limitMs: P95_LIMIT_MS, passed: false,
    method: 'Job 4 on Performance, memory-only saves, zero player input. Big Bess is put 197 m down her road, the car 14 to 44 m behind her and 6 m to one side, ' +
      'aimed at the middle of her, the raiders and the furnace. 120 delivered requestAnimationFrame intervals once all three stand in the picture.',
    headed: context.headed === true, launchMode: context.launchMode ?? null};
  const persist = () => writeFile(join(context.outputDir, 'everburn-frames.json'), JSON.stringify(report, null, 2) + '\n');
  try {
    await context.navigate('/tools/menu-check.html?flags=hidden-road,story-everburn,warlord-cards,scablands-runs&harness=everburn-frames');
    await context.waitFor('window.__qaApp?.duel.state.status==="menu" && !!window.__render', 'memory-only menu', 90000);
    await context.evaluate(`(() => {
      const a = window.__qaApp, select = document.querySelector('#graphics-quality');
      if (!window.name.startsWith('__duel_qa_tab_v2:') || !Object.getOwnPropertyDescriptor(window, 'localStorage')?.value) throw Error('Memory-only frame fixture required');
      select.value = ${JSON.stringify(QUALITY)}; select.dispatchEvent(new Event('change', {bubbles: true}));
      a.audio.setMuted(true);
      a.profile = {...a.profile, wasteland: {...a.profile.wasteland, version: 1, discoveredGate: true},
        story: {...a.profile.story, ember: {...(a.profile.story?.ember || {}), read: true, jobs: ${JSON.stringify(DONE_BEFORE_JOB_4)}}}};
      a._saveProfile();
      window.__everburnFrames = {started: performance.now()};
    })()`);
    await click(context, '#wasteland-visit');
    await context.waitFor('window.__qaApp?.isYardHomeActive?.()', 'Scablands yard', 90000);
    await context.evaluate(`(() => {const a = window.__qaApp;
      a.profile = {...a.profile, story: {...a.profile.story, ember: {...(a.profile.story?.ember || {}), read: true, jobs: ${JSON.stringify(DONE_BEFORE_JOB_4)}}}}; a._saveProfile();})()`);
    await click(context, '[data-action="yard-cards"]');
    await context.waitFor('document.querySelector("[data-ember-step=\\"slow-ride\\"]")', 'job 4 on the Story Wall', 30000);
    await click(context, '[data-ember-step="slow-ride"]');
    await context.waitFor(`window.__qaApp?.duel.state.arena?.mode==="world-job" && window.__qaApp.duel.state.status==="racing" &&
      window.__qaApp.duel.state.arena.worldJob.definition.number===4 && window.__qaApp.visualReady`, 'job 4 racing', 120000);
    await context.waitFor(`(() => {let root = null; window.__render.scene.traverse(n => {if (n.name === 'The Scablands') root = n;});
      return root?.userData.assetStatus === 'ready';})()`, 'the Scablands art', 120000);
    await context.evaluate(`(() => {
      const q = window.__everburnFrames, view = document.querySelector('#view3d');
      q.firstLoadMs = performance.now() - q.started; q.worldBuildMs = Number(view.dataset.worldBuildMs);
    })()`);
    // The job puts Big Bess on her road in its first ticks. Then she is put 197 m down it, and the raiders of her first ambush appear.
    await context.evaluate('window.__qaApp.advance(0.5)');
    report.placed = await context.evaluate(`(() => {
      const a = window.__qaApp, s = a.duel.state, job = s.arena.worldJob, step = job.job.steps[0];
      const bess = job.actors.find(actor => actor.id === 'big-bess');
      if (!bess) throw Error('Big Bess is not on her road yet');
      const points = step.path.map(place => place.position ?? place);
      let left = ${BESS_METRES}, index = 1;
      while (index < points.length - 1 && left > Math.hypot(points[index].x - points[index - 1].x, points[index].z - points[index - 1].z)) {
        left -= Math.hypot(points[index].x - points[index - 1].x, points[index].z - points[index - 1].z); index++;
      }
      const from = points[index - 1], to = points[index], length = Math.hypot(to.x - from.x, to.z - from.z);
      bess.position = {x: from.x + (to.x - from.x) / length * left, y: 0, z: from.z + (to.z - from.z) / length * left}; bess.pathIndex = index;
      bess.stretchHealth = bess.health;
      return {bess: bess.position, metres: ${BESS_METRES}};
    })()`);
    await context.evaluate('window.__qaApp.advance(1.5)');
    // The car is put behind her and to one side, and aimed at the middle of Big Bess, the raiders and the furnace, at the first distance
    // behind her from which all three stand inside the picture.
    const seen = await context.evaluate(`(() => {
      const a = window.__qaApp, d = a.duel, api = window.__render, s = d.state, job = s.arena.worldJob;
      const rigs = {}; api.scene.traverse(node => {if (node.name === 'Big Bess moving rig' || node.name === "Old Smoke's moving furnace rig") rigs[node.name] = node;});
      const V = api.camera.position.constructor;
      const inView = (x, y, z) => {const v = new V(x, y, z).project(api.camera); return Math.abs(v.x) < .94 && Math.abs(v.y) < .94 && v.z > -1 && v.z < 1;};
      const visible = node => {for (let p = node; p; p = p.parent) if (!p.visible) return false; return true;};
      const at = node => {node.updateWorldMatrix(true, false); const e = node.matrixWorld.elements; return {x: e[12], y: e[13], z: e[14]};};
      const bessActor = job.actors.find(actor => actor.id === 'big-bess'), bessRig = rigs['Big Bess moving rig'], furnaceRig = rigs["Old Smoke's moving furnace rig"];
      const raiders = job.actors.filter(actor => actor.ambushKey && (actor.health ?? 1) > 0).map(r => ({x: r.x ?? r.position?.x, z: r.z ?? r.position?.z}));
      if (!bessRig || !furnaceRig || !raiders.length) throw Error('Big Bess, the furnace or the raiders are missing: ' + JSON.stringify({bess: !!bessRig, furnace: !!furnaceRig, raiders: raiders.length}));
      const path = job.job.steps[0].path.map(place => place.position ?? place), forward = (() => {
        const to = path[bessActor.pathIndex], from = path[bessActor.pathIndex - 1], length = Math.hypot(to.x - from.x, to.z - from.z);
        return {x: (to.x - from.x) / length, z: (to.z - from.z) / length};})();
      const bess = bessActor.position, furnace = at(furnaceRig);
      const targets = [bess, furnace, ...raiders], aim = {x: targets.reduce((n, t) => n + t.x, 0) / targets.length, z: targets.reduce((n, t) => n + t.z, 0) / targets.length};
      let result = null;
      for (const side of [6, -6]) for (const behind of [14, 18, 22, 26, 32, 38, 44]) {
        const car = {x: bess.x - forward.x * behind - forward.z * side, z: bess.z - forward.z * behind + forward.x * side};
        const pose = d.course.nearest(car.x, car.z);
        s.s = s.prevS = pose.s; s.lateral = s.prevLateral = pose.lateral; s.speedMph = 0; s.yawVelocity = 0; s.pushVelocity = 0;
        const heading = Math.atan2(aim.x - car.x, aim.z - car.z), base = d.course.at(pose.s).heading;
        s.headingError = Math.atan2(Math.sin(heading - base), Math.cos(heading - base));
        a.onFrame?.(s, 0); api.renderFrame(); api.camera.updateMatrixWorld(true);
        const found = {behind, side, bessInView: inView(bess.x, 2, bess.z), furnaceInView: inView(furnace.x, furnace.y + 3, furnace.z),
          raidersInView: raiders.filter(r => inView(r.x, 1, r.z)).length};
        result = found;
        if (found.bessInView && found.furnaceInView && found.raidersInView === raiders.length) break;
      }
      return {...result, bessVisible: visible(bessRig), furnaceVisible: visible(furnaceRig), raiders: raiders.length,
        raiderPlaces: raiders.map(r => ({x: Math.round(r.x), z: Math.round(r.z)})), bessAt: bess, furnaceAt: furnace, step: job.job.stepIndex, status: s.status};
    })()`);
    report.view = seen;
    if (!seen.bessVisible || !seen.bessInView) throw Error('Big Bess is not in the picture: ' + JSON.stringify(seen));
    if (!seen.furnaceVisible || !seen.furnaceInView) throw Error('The furnace is not in the picture: ' + JSON.stringify(seen));
    if (!seen.raiders || seen.raidersInView !== seen.raiders) throw Error('The raiders are not all in the picture: ' + JSON.stringify(seen));
    // Let streamed tiles and shaders settle, as the other driving samples do, then take 120 delivered frames.
    await new Promise(done => setTimeout(done, 1500));
    report.viewScreenshot = await context.screenshot('everburn-frames-view');
    const observed = await context.evaluate(`(async () => {
      const a = window.__qaApp, d = a.duel, s = d.state, intervals = [];
      const before = s.stageTimeSec;
      await new Promise((done, reject) => {
        let previous = null;
        const sample = now => {
          if (document.hidden || document.visibilityState !== 'visible' || !a.running || !a.visualReady || s !== d.state || s.paused ||
            s.status !== 'racing' || s.arena?.mode !== 'world-job' || a.autopilot || a.inspectionCamera ||
            (a.ambientOcclusionEnabled !== false ? 'high' : 'performance') !== ${JSON.stringify(QUALITY)})
            return reject(Error('The visible job, its quality or its running changed during timing'));
          if (previous !== null) intervals.push(now - previous);
          previous = now;
          if (intervals.length === 120) return done();
          requestAnimationFrame(sample);
        };
        requestAnimationFrame(sample);
      });
      if (!(s.stageTimeSec > before)) throw Error('The job stopped during the sample');
      const q = window.__everburnFrames;
      return {intervals, firstLoadMs: q.firstLoadMs, worldBuildMs: q.worldBuildMs, stageBefore: before, stageAfter: s.stageTimeSec,
        memoryOnlySaves: !!Object.getOwnPropertyDescriptor(window, 'localStorage')?.value};
    })()`);
    const {intervals, ...details} = observed;
    Object.assign(report, details, summarizeNightFrames(intervals));
    report.passed = report.p95 > 0 && report.p95 <= P95_LIMIT_MS;
    if (report.firstLoadMs > 5000) console.log('WARNING: first load ' + Math.round(report.firstLoadMs) + ' ms exceeds 5 s');
    if (!Number.isFinite(report.worldBuildMs) || report.worldBuildMs >= 1000) console.log('NOTE: world build ' + report.worldBuildMs + ' ms (rule 8 asks for under 1 s)');
    console.log(JSON.stringify({p50: report.p50, p95: report.p95, max: report.max, firstLoadMs: report.firstLoadMs, worldBuildMs: report.worldBuildMs, headed: report.headed}));
    await persist();
    if (!report.passed) throw Error('Delivered p95 ' + report.p95.toFixed(1) + ' ms is over the ' + P95_LIMIT_MS + ' ms line');
  } catch (error) {
    report.failure = error.message; await persist(); throw error;
  }
}
