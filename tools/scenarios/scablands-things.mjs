// SCABLANDS-LAND: compare six views on Performance with the trial off and on.
// The browser uses memory-only storage. This is a visual guide, not a frame check.
import {writeFile} from 'node:fs/promises';
import {join} from 'node:path';
import {LAND} from '../../src/world/scablands-names.js';
import {ROAD_NET} from '../../src/world/scablands-road.js';
import {pointAlong} from '../../src/world/scablands-road-geometry.js';
import {clearedFixedThings, smallThingsInCell, THINGS_CELL} from '../../src/world/scablands-things.js';
import {EVERBURN_JOBS, EVERBURN_SIDE_JOBS} from '../../src/world/jobs/everburn.js';
import {gasRunJob, GAS_RUN_ROADS, fieldBattleJob} from '../../src/world/jobs/gas-run.js';

// Pick actual cleared objects for the same seed and job starts used by the scene.
export function views(seed) {
  const jobs = [...EVERBURN_JOBS, ...EVERBURN_SIDE_JOBS, ...GAS_RUN_ROADS.map(road => gasRunJob({road})), fieldBattleJob()];
  const starts = jobs.map(job => job.steps[0]?.carStart).filter(Boolean);
  const fixed = clearedFixedThings(seed, starts);
  const poleLine = fixed.telegraphs.find(line => line.id === 'east-road').poles;
  const poleIndex = poleLine.findIndex((pole, i) => pole && pole.state !== 'down' && poleLine[i + 1] && poleLine[i + 1].state !== 'down');
  const pole = poleLine[poleIndex], nextPole = poleLine[poleIndex + 1];
  const sign = fixed.signs.find(item => item.destinations.length);
  const rock = fixed.boulders[0];
  const pylon = fixed.pylons.find(Boolean);
  const fence = fixed.fences.flatMap(run => run.posts).find(post => post && !post.gap);
  if (!pole || !nextPole || !sign || !rock || !pylon || !fence) throw Error('A landmark needed for the pictures is missing');
  const road = ROAD_NET.road('east-road');
  const roadView = pointAlong(road.points, pole.along);
  const flats = LAND.at('yard', 1200, 1000);
  let small = null;
  const ci = Math.floor(flats.x / THINGS_CELL), cj = Math.floor(flats.z / THINGS_CELL);
  for (let radius = 0; radius <= 20 && !small; radius++) {
    for (let i = ci - radius; i <= ci + radius && !small; i++) for (let j = cj - radius; j <= cj + radius && !small; j++) {
      const items = smallThingsInCell(seed, i, j, starts);
      if (items.some(item => item.kind === 'scrub') && items.some(item => item.kind === 'stone')) small = items.find(item => item.kind === 'scrub');
    }
  }
  if (!small) throw Error('Could not find scrub and stones together');
  const offset = (point, x, z) => ({x: point.x + x, z: point.z + z});
  return [
    {name: 'east-road-poles', from: roadView, to: nextPole},
    {name: 'fork-sign', from: offset(sign, -16, -16), to: sign},
    {name: 'flats', from: offset(small, -12, -12), to: small},
    {name: 'scarp-boulders', from: offset(rock, -22, -22), to: rock},
    {name: 'pylon-line', from: offset(pylon, 14, 14), to: pylon},
    {name: 'tin-town-fence', from: offset(fence, -12, -12), to: fence},
  ];
}

const click = (context, selector) => context.evaluate(`(() => {
  const button = document.querySelector(${JSON.stringify(selector)});
  if (!button || button.hidden || button.disabled) throw Error('Missing ' + ${JSON.stringify(selector)});
  button.click(); return true;
})()`);
const setQuality = (context, quality) => context.evaluate(`(() => { const select = document.querySelector('#graphics-quality');
  select.value = ${JSON.stringify(quality)}; select.dispatchEvent(new Event('change', {bubbles: true})); return true; })()`);

async function enterJob(context, flags) {
  await context.navigate(`/tools/menu-check.html?flags=hidden-road,story-everburn,warlord-cards${flags}&harness=scablands-things`);
  await context.waitFor('window.__qaApp?.duel.state.status==="menu" && !!window.__render', 'memory-only menu', 90000);
  await context.evaluate(`(() => {
    const a = window.__qaApp;
    if (!window.name.startsWith('__duel_qa_tab_v2:') || !Object.getOwnPropertyDescriptor(window, 'localStorage')?.value) throw Error('Memory-only fixture required');
    a.audio.setMuted(true);
    a.profile = {...a.profile, wasteland: {...a.profile.wasteland, version: 1, discoveredGate: true}}; a._saveProfile();
  })()`);
  await setQuality(context, 'performance');
  await click(context, '#wasteland-visit');
  await context.waitFor('window.__qaApp?.isYardHomeActive?.()', 'Scablands yard', 90000);
  await click(context, '[data-action="yard-cards"]');
  await context.waitFor('document.querySelector(".ember-wall")', 'Hollis note on the Story Wall', 30000);
  // The second pass finds the note already read: the memory-only save lasts as long as the tab.
  if (!await context.evaluate('window.__qaApp.profile.story?.ember?.read===true')) await click(context, '[data-ember-step="read"]');
  await context.waitFor('window.__qaApp.profile.story?.ember?.read===true', 'Hollis note read');
  await click(context, '[data-ember-step="hot-delivery"]');
  await context.waitFor('window.__qaApp?.duel.state.arena?.mode==="world-job" && window.__qaApp.duel.state.status==="racing" && window.__qaApp.visualReady', 'Hot Delivery racing', 120000);
  await context.waitFor(`(() => {let root = null; window.__render.scene.traverse(n => {if (n.name === 'The Scablands') root = n;});
    return root?.userData.assetStatus === 'ready';})()`, 'the Scablands art', 120000);
  // Only the 3D view is drawn in the pictures: the menu, the HUD and the captions are hidden.
  await context.evaluate(`(() => { const style = document.createElement('style'); style.textContent = 'body *{visibility:hidden !important} canvas{visibility:visible !important} canvas.world-hud-minimap,.world-hud-minimap canvas{visibility:hidden !important}'; document.head.appendChild(style); })()`);
}

const place = (context, view) => context.evaluate(`(() => {
  const a = window.__qaApp, d = a.duel, s = d.state, wrap = v => Math.atan2(Math.sin(v), Math.cos(v));
  const from = ${JSON.stringify(view.from)}, to = ${JSON.stringify(view.to)}, pose = d.course.nearest(from.x, from.z);
  s.s = s.prevS = pose.s; s.lateral = s.prevLateral = pose.lateral; s.speedMph = 0; s.yawVelocity = 0; s.pushVelocity = 0;
  s.headingError = wrap(Math.atan2(to.x - from.x, to.z - from.z) - d.course.at(pose.s).heading);
  s.arena.worldJob.job.stepState.ember = 100; a.inspectionCamera = null;
  return true;
})()`);

// Render just the main scene with shadows off, so the shadow pass is not counted.
const observe = context => context.evaluate(`(() => {
  const api = window.__render, renderer = api.renderer, root = api.scene.getObjectByName('Scablands realism things');
  const batches = [], old = [], shadows = renderer.shadowMap.enabled;
  try {
    const transform = (m, v) => [0, 1, 2, 3].map(i => m[i] * v[0] + m[i + 4] * v[1] + m[i + 8] * v[2] + m[i + 12] * v[3]);
    const inView = mesh => {
      const values = mesh.instanceMatrix.array;
      for (let i = 0; i < mesh.count; i++) {
        let p = transform(mesh.matrixWorld.elements, [values[i * 16 + 12], values[i * 16 + 13], values[i * 16 + 14], 1]);
        p = transform(api.camera.matrixWorldInverse.elements, p);
        p = transform(api.camera.projectionMatrix.elements, p);
        if (p[3] > 0 && Math.abs(p[0]) <= p[3] && Math.abs(p[1]) <= p[3] && Math.abs(p[2]) <= p[3]) return true;
      }
      return false;
    };
    root?.traverse(mesh => {
      if (!mesh.isInstancedMesh || !mesh.count) return;
      old.push([mesh, mesh.onAfterRender]);
      mesh.onAfterRender = function (...args) { if (inView(mesh)) batches.push(mesh.name); old.find(row => row[0] === mesh)[1]?.apply(this, args); };
    });
    renderer.shadowMap.enabled = false;
    renderer.info.reset(); renderer.render(api.scene, api.camera);
    return {draws: renderer.info.render.calls, triangles: renderer.info.render.triangles, batches};
  } finally {
    renderer.shadowMap.enabled = shadows;
    for (const [mesh, handler] of old) mesh.onAfterRender = handler;
  }
})()`);

// Use the running course and its own inputs, and require a stop at the selected solid.
const driveAtSolid = (context, kind) => context.evaluate(`(() => {
  const a = window.__qaApp, d = a.duel, s = d.state, course = d.course;
  const target = course.solidGrid.solids.find(item => item.kind === ${JSON.stringify(kind)});
  if (!target) throw Error('Missing collision target: ' + ${JSON.stringify(kind)});
  const start = course.nearest(target.x, target.z - 8), heading = 0;
  s.s = s.prevS = start.s; s.lateral = s.prevLateral = start.lateral;
  s.headingError = Math.atan2(Math.sin(heading - course.at(start.s).heading), Math.cos(heading - course.at(start.s).heading));
  s.speedMph = 25; s.yawVelocity = s.pushVelocity = s.slipAngle = 0;
  s.airborne = false; s.airHeight = s.prevAirHeight = 0; s._verticalSpeed = 0; s.groundHeight = s.prevGroundHeight = null;
  s.impactTimer = 0; s.crashSpin = 0;
  d.setInput({throttle: 0, brake: 0, steer: 0, boost: false});
  for (let i = 0; i < 180; i++) {
    const before = Math.abs(s.speedMph);
    d.step(1 / 60);
    const at = course.worldAt(s.s, s.lateral), after = Math.abs(s.speedMph);
    if (Math.hypot(at.x - target.x, at.z - target.z) < 6 && before > 8 && after < before * .6)
      return {id: target.id, impactSpeedMph: before, speedAfterMph: after};
  }
  throw Error('Car did not stop at ' + target.kind);
})()`);

export async function run(context) {
  await context.command('Emulation.setDeviceMetricsOverride', {width: 1280, height: 720, deviceScaleFactor: 1, mobile: false});
  const report = {card: 'SCABLANDS-LAND', quality: 'performance', measurement: 'main scene render with shadows off', views: []};
  const persist = () => writeFile(join(context.outputDir, 'scablands-things.json'), JSON.stringify(report, null, 2) + '\n');
  try {
    let positions;
    for (const pass of [{name: 'off', flags: ''}, {name: 'on', flags: ',scablands-realism'}]) {
      await enterJob(context, pass.flags);
      const seed = await context.evaluate('window.__qaApp.duel.course.seed');
      if (!positions) positions = views(seed);
      else if (seed !== report.seed) throw Error('The course seed changed between views');
      report.seed = seed;
      for (const view of positions) {
        await place(context, view);
        await context.evaluate('window.__qaApp.advance(1.5)');
        await new Promise(done => setTimeout(done, 2600));
        const picture = await context.screenshot(`scablands-things-${pass.name}-${view.name}`);
        const measured = await observe(context);
        let row = report.views.find(item => item.name === view.name);
        if (!row) { row = {name: view.name}; report.views.push(row); }
        row[pass.name] = {picture, ...measured};
        if (row.off && row.on) {
          row.extra = {draws: row.on.draws - row.off.draws, triangles: row.on.triangles - row.off.triangles};
          row.withinLimits = row.extra.draws <= 40 && row.extra.triangles <= 150000;
          if (!row.withinLimits) throw Error(view.name + ' exceeds the graphics limits: ' + JSON.stringify(row.extra));
        }
        console.log(JSON.stringify({pass: pass.name, view: view.name, ...measured, extra: row.extra}));
      }
      if (pass.name === 'on') {
        const seen = new Set(report.views.flatMap(row => row.on.batches));
        const required = ['stone', 'scrub', 'brush', 'bone', 'can', 'scrap', 'salt', 'stump',
          'pylon-foot', 'telegraph', 'telegraph-down', 'fence-post', 'sign-post', 'boulder', 'pylons'];
        const missing = required.filter(kind => !seen.has('Scablands ' + kind));
        if (missing.length) throw Error('No batch drawn for: ' + missing.join(', '));
        report.collisions = {};
        for (const kind of ['boulder', 'telegraph']) report.collisions[kind] = await driveAtSolid(context, kind);
      }
    }
    await persist();
  } catch (error) {
    report.failure = error.message; await persist(); throw error;
  }
}
