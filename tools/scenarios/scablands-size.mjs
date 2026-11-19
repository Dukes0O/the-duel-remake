// SCABLANDS-LAND round 4, slice 1: the larger land, seen. A memory-only browser walk that takes a picture at the yard looking east, 1 km, 3 km
// and 5 km out on the straight way to Tin Town, and at Tin Town's gate, and records for each the frame time it measured and the number of draw
// calls and triangles. Job 1 (Hot Delivery) starts the Scablands; the car is then put on each spot, facing Tin Town, the way a job puts its car
// at its start, and the game runs for 120 delivered frames. This is a guide for Claude and NOT a frame check (AGENTS.md rule 8 needs the laptop
// alone, its own screen off, headed, nothing else on the graphics card). The report is `scablands-size.json` in the scenario's output folder.
import {writeFile} from 'node:fs/promises';
import {join} from 'node:path';
import {summarizeNightFrames} from './frame-pacing.mjs';

const QUALITY = 'performance';
const FRAMES = 120;
// Metres east of the yard along the straight way to Tin Town; the last view is Tin Town's own gate.
const VIEWS = [{name: 'yard-east', east: 0}, {name: '1km', east: 1000}, {name: '3km', east: 3000}, {name: '5km', east: 5000}, {name: 'tin-town-gate', gate: true}];

const click = (context, selector) => context.evaluate(`(() => {
  const button = document.querySelector(${JSON.stringify(selector)});
  if (!button || button.hidden || button.disabled) throw Error('Missing ' + ${JSON.stringify(selector)});
  button.click(); return true;
})()`);

export async function run(context) {
  await context.command('Emulation.setDeviceMetricsOverride', {width: 1280, height: 720, deviceScaleFactor: 1, mobile: false});
  const report = {card: 'SCABLANDS-LAND', recipe: 'scablands-size', quality: QUALITY, guideOnly: true, headed: context.headed === true, views: []};
  const persist = () => writeFile(join(context.outputDir, 'scablands-size.json'), JSON.stringify(report, null, 2) + '\n');
  try {
    await context.navigate('/tools/menu-check.html?flags=hidden-road,story-everburn,warlord-cards&harness=scablands-size');
    await context.waitFor('window.__qaApp?.duel.state.status==="menu" && !!window.__render', 'memory-only menu', 90000);
    await context.evaluate(`(() => {
      const a = window.__qaApp, select = document.querySelector('#graphics-quality');
      if (!window.name.startsWith('__duel_qa_tab_v2:') || !Object.getOwnPropertyDescriptor(window, 'localStorage')?.value) throw Error('Memory-only fixture required');
      select.value = ${JSON.stringify(QUALITY)}; select.dispatchEvent(new Event('change', {bubbles: true}));
      a.audio.setMuted(true);
      a.profile = {...a.profile, wasteland: {...a.profile.wasteland, version: 1, discoveredGate: true}}; a._saveProfile();
      window.__sizeRun = {started: performance.now()};
    })()`);
    await click(context, '#wasteland-visit');
    await context.waitFor('window.__qaApp?.isYardHomeActive?.()', 'Scablands yard', 90000);
    await click(context, '[data-action="yard-cards"]');
    await context.waitFor('document.querySelector(".ember-wall")', 'Hollis note on the Story Wall', 30000);
    await click(context, '[data-ember-step="read"]');
    await context.waitFor('window.__qaApp.profile.story?.ember?.read===true', 'Hollis note read');
    await click(context, '[data-ember-step="hot-delivery"]');
    await context.waitFor('window.__qaApp?.duel.state.arena?.mode==="world-job" && window.__qaApp.duel.state.status==="racing" && window.__qaApp.visualReady', 'Hot Delivery racing', 120000);
    await context.waitFor(`(() => {let root = null; window.__render.scene.traverse(n => {if (n.name === 'The Scablands') root = n;});
      return root?.userData.assetStatus === 'ready';})()`, 'the Scablands art', 120000);
    report.firstLoadMs = await context.evaluate('performance.now() - window.__sizeRun.started');
    report.worldBuildMs = await context.evaluate('Number(document.querySelector("#view3d").dataset.worldBuildMs)');
    for (const view of VIEWS) {
      // The car is put on the spot facing Tin Town (east), at rest; the job's own rules do the rest. The ember is held so that the job goes on.
      const placed = await context.evaluate(`(() => {
        const a = window.__qaApp, d = a.duel, s = d.state, job = s.arena.worldJob, step = job.job.steps[0];
        const town = (step.destination.position ?? step.destination), gate = {x: town.x - 25, z: town.z + 62};
        const x = ${view.gate ? 'gate.x' : view.east}, z = ${view.gate ? 'gate.z + 40' : 0}, tx = ${view.gate ? 'gate.x' : 'town.x'}, tz = ${view.gate ? 'gate.z' : 'town.z'};
        const pose = d.course.nearest(x, z), wrap = v => Math.atan2(Math.sin(v), Math.cos(v));
        s.s = s.prevS = pose.s; s.lateral = s.prevLateral = pose.lateral; s.speedMph = 0; s.yawVelocity = 0; s.pushVelocity = 0;
        s.headingError = wrap(Math.atan2(tx - x, tz - z) - d.course.at(pose.s).heading);
        job.job.stepState.ember = 100;
        return {x, z, town};
      })()`);
      await context.evaluate('window.__qaApp.advance(1.5)');
      await new Promise(done => setTimeout(done, 1500));
      const picture = await context.screenshot(`scablands-size-${view.name}`);
      const observed = await context.evaluate(`(async () => {
        const a = window.__qaApp, api = window.__render, intervals = [];
        await new Promise(done => { let previous = null;
          const sample = now => { if (previous !== null) intervals.push(now - previous); previous = now; if (intervals.length === ${FRAMES}) return done(); requestAnimationFrame(sample); };
          requestAnimationFrame(sample); });
        const info = api.renderer.info;
        return {intervals, draws: info.render.calls, triangles: info.render.triangles, geometries: info.memory.geometries, textures: info.memory.textures};
      })()`);
      const {intervals, ...counts} = observed;
      const row = {name: view.name, placed, picture, ...counts, ...summarizeNightFrames(intervals)};
      report.views.push(row);
      console.log(JSON.stringify({view: view.name, p50: row.p50, p95: row.p95, max: row.max, draws: row.draws, triangles: row.triangles}));
    }
    await persist();
  } catch (error) {
    report.failure = error.message; await persist(); throw error;
  }
}
