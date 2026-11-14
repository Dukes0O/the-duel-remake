// SCABLANDS-LAND round 4, slice 2b: the land's shape and every drawn thing, solid. A memory-only browser walk, on Performance, that takes a picture of a car stopped
// against a shack, a wreck, a gate post and the well's barricade, of a car at the foot of a bank in the river bed, on the Steps with their marked way, on the Girder Bridge's
// deck between its trusses, on the Pipe's deck, in the bed after a fall, and of each of the four scarps. For each it records the draw calls and triangles of the frame it drew
// (a guide for Claude, NOT a frame check: AGENTS.md rule 8). With SCABLANDS_SHEET=1 it makes the comparison sheet of the twelve pictures named in SHEET (JPEG, 500 KB at
// most) at `docs/board/looks/scablands-land/round-6.jpg`. The report is `scablands-solid.json` in the scenario's output folder.
import {readFile, writeFile} from 'node:fs/promises';
import {join} from 'node:path';
import {LAND} from '../../src/world/scablands-names.js';
import {RIVER_LAND, riverDepthAt, stepsWayFor} from '../../src/world/scablands-regions.js';
import {SCABLANDS_SOLIDS, solidsNear} from '../../src/world/scablands-solids.js';
import {SCARPS} from '../../src/world/scablands-scarps.js';

const QUALITY = 'performance';
const solid = id => SCABLANDS_SOLIDS.find(row => row.id === id);
// A solid's face that looks into clear ground for `reach` metres: {x, z (its middle), nx, nz (the way out), tx, tz}, or null.
function openFace(row, reach = 30) {
  const c = Math.cos(row.heading), s = Math.sin(row.heading), ex = {x: c, z: -s}, ez = {x: s, z: c};
  for (const [n, reach, t] of [[ex, row.halfX, ez], [{x: -ex.x, z: -ex.z}, row.halfX, ez], [ez, row.halfZ, ex], [{x: -ez.x, z: -ez.z}, row.halfZ, ex]]) {
    const face = {x: row.x + n.x * reach, z: row.z + n.z * reach, nx: n.x, nz: n.z, tx: t.x, tz: t.z};
    let clear = true;
    for (let metres = 3; metres <= reach && clear; metres += 3) {
      const x = face.x + n.x * metres, z = face.z + n.z * metres;
      clear = !solidsNear(x, z, x, z, 3).some(other => other !== row) && riverDepthAt(x, z) < .5;
    }
    if (clear) return face;
  }
  return null;
}
// A car stopped nose to a face of a solid: its middle 2.6 m from the face (its half length is 2.35), facing it; the lens stands 9 m out and 5 m along.
const against = row => { const face = openFace(row, 14); return {from: {x: face.x + face.nx * 2.6, z: face.z + face.nz * 2.6}, to: {x: face.x, z: face.z}, camera: {x: face.x + face.nx * 13 + face.tx * 7, z: face.z + face.nz * 13 + face.tz * 7}}; };

// The views. `from` is where the car stands, `to` what it faces; `camera` puts the lens there (3 m up) aimed at the car; `air` lifts it that high, 60 m back.
export function views() {
  const out = [], stand = (name, from, to, extra = {}) => out.push({name, from, to, ...extra});
  const shackBox = SCABLANDS_SOLIDS.find(row => /^tin-town-cluster-\d+-slot-\d+$/.test(row.id) && openFace(row, 14));
  const shack = against(shackBox); stand('stop-shack', shack.from, shack.to, {camera: shack.camera});
  const wreck = against(solid('boneyard-wreck-east')); stand('stop-wreck', wreck.from, wreck.to, {camera: wreck.camera});
  const post = solid('tin-town-gate-post-left'); stand('stop-gate-post', {x: post.x, z: post.z + 4.7}, {x: post.x, z: post.z}, {camera: {x: post.x + 9, z: post.z + 14}});
  const barricade = SCABLANDS_SOLIDS.find(row => /^everburn-prop-\d+-barricade/.test(row.id));
  stand('stop-well-barricade', {x: barricade.x + 3.6, z: barricade.z + 6}, {x: barricade.x, z: barricade.z}, {camera: {x: barricade.x + 12, z: barricade.z + 14}});
  // A bank from the bed: 30 m from the river's middle, facing the nearer bank.
  const line = RIVER_LAND.line, i = Math.floor(line.points.length * .2), a = line.points[i], b = line.points[i + 3], l = Math.hypot(b.x - a.x, b.z - a.z), n = {x: (b.z - a.z) / l, z: -(b.x - a.x) / l};
  stand('bank-from-bed', {x: a.x - n.x * 30, z: a.z - n.z * 30}, {x: a.x - n.x * 90, z: a.z - n.z * 90});
  const way = stepsWayFor();
  stand('steps-way', {x: way.x - way.nx * 130, z: way.z - way.nz * 130}, {x: way.x, z: way.z});
  stand('steps-ledges-air', {x: way.x - way.nx * 90, z: way.z - way.nz * 90}, {x: way.x, z: way.z}, {air: 40});
  const bridge = RIVER_LAND.crossings.find(crossing => crossing.kind === 'bridge'), truss = solid('girder-bridge-truss-left');
  stand('deck-bridge', {x: bridge.x - Math.sin(truss.heading) * 90, z: bridge.z - Math.cos(truss.heading) * 90}, {x: bridge.x, z: bridge.z});
  const pipe = RIVER_LAND.crossings.find(crossing => crossing.kind === 'pipe'), pipeline = solid('the-pipe-pipeline');
  stand('deck-pipe', {x: pipe.x - Math.sin(pipeline.heading) * 90, z: pipe.z - Math.cos(pipeline.heading) * 90}, {x: pipe.x, z: pipe.z});
  // After a fall: in the bed beside the pipe's middle pier, facing the deck it fell from (the car is hurt: its armour and its dents are set).
  stand('after-fall', {x: pipe.x + Math.cos(pipeline.heading) * 24 + Math.sin(pipeline.heading) * 12, z: pipe.z - Math.sin(pipeline.heading) * 24 + Math.cos(pipeline.heading) * 12}, {x: pipe.x, z: pipe.z}, {hurt: true});
  for (const scarp of SCARPS) {
    const {a: p, b: q} = scarp.stretches[0], length = Math.hypot(q.x - p.x, q.z - p.z), tx = (q.x - p.x) / length, tz = (q.z - p.z) / length;
    // Seen on a map the face is on the left of the way p to q: stand 70 m out from it, level with its middle, facing it.
    const mid = {x: (p.x + q.x) / 2, z: (p.z + q.z) / 2};
    stand(`scarp-${scarp.id}`, {x: mid.x + tz * 70, z: mid.z - tx * 70}, mid);
  }
  return out;
}

// The twelve pictures on the sheet, in order: four things stopped against, the bank, the Steps, the two decks, the fall, and four scarps.
const SHEET = ['stop-well-barricade', 'stop-wreck', 'stop-gate-post', 'bank-from-bed', 'steps-way', 'deck-bridge', 'deck-pipe', 'after-fall', 'scarp-scab-west', 'scarp-scab-east', 'scarp-camp-north', 'scarp-ridge-south'];

const click = (context, selector) => context.evaluate(`(() => {
  const button = document.querySelector(${JSON.stringify(selector)});
  if (!button || button.hidden || button.disabled) throw Error('Missing ' + ${JSON.stringify(selector)});
  button.click(); return true;
})()`);

export async function run(context) {
  await context.command('Emulation.setDeviceMetricsOverride', {width: 1280, height: 720, deviceScaleFactor: 1, mobile: false});
  const report = {card: 'SCABLANDS-LAND', recipe: 'scablands-solid', quality: QUALITY, guideOnly: true, headed: context.headed === true, views: []};
  const persist = () => writeFile(join(context.outputDir, 'scablands-solid.json'), JSON.stringify(report, null, 2) + '\n');
  const pictures = new Map();
  try {
    await context.navigate('/tools/menu-check.html?flags=hidden-road,story-everburn,warlord-cards&harness=scablands-solid');
    await context.waitFor('window.__qaApp?.duel.state.status==="menu" && !!window.__render', 'memory-only menu', 90000);
    await context.evaluate(`(() => {
      const a = window.__qaApp, select = document.querySelector('#graphics-quality');
      if (!window.name.startsWith('__duel_qa_tab_v2:') || !Object.getOwnPropertyDescriptor(window, 'localStorage')?.value) throw Error('Memory-only fixture required');
      select.value = ${JSON.stringify(QUALITY)}; select.dispatchEvent(new Event('change', {bubbles: true}));
      a.audio.setMuted(true);
      a.profile = {...a.profile, wasteland: {...a.profile.wasteland, version: 1, discoveredGate: true}}; a._saveProfile();
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
    // Only the 3D view is drawn in the pictures: the menu, the HUD and the captions are hidden.
    await context.evaluate(`(() => { const style = document.createElement('style'); style.textContent = 'body *{visibility:hidden !important} canvas{visibility:visible !important}'; document.head.appendChild(style); })()`);
    for (const view of views()) {
      const placed = await context.evaluate(`(() => {
        const a = window.__qaApp, d = a.duel, s = d.state, job = s.arena.worldJob, wrap = v => Math.atan2(Math.sin(v), Math.cos(v));
        const from = ${JSON.stringify(view.from)}, to = ${JSON.stringify(view.to)}, pose = d.course.nearest(from.x, from.z);
        s.s = s.prevS = pose.s; s.lateral = s.prevLateral = pose.lateral; s.speedMph = 0; s.yawVelocity = 0; s.pushVelocity = 0;
        const facing = Math.hypot(to.x - from.x, to.z - from.z) < 1 ? 0 : Math.atan2(to.x - from.x, to.z - from.z);
        s.headingError = wrap(facing - d.course.at(pose.s).heading);
        job.job.stepState.ember = 100;
        const ground = d.course.groundAt(pose.s, pose.lateral).y;
        const view = ${JSON.stringify({air: view.air ?? 0, camera: view.camera ?? null, hurt: view.hurt === true})};
        if (view.hurt) { s.armor = Math.round(s.maxArmor * .5); for (const zone of Object.keys(s.damageZones)) s.damageZones[zone] = 1.5; d._callout('HARD LANDING', 4); }
        const lens = view.camera ? d.course.groundAt(d.course.nearest(view.camera.x, view.camera.z).s, d.course.nearest(view.camera.x, view.camera.z).lateral).y : 0;
        if (view.camera) a.inspectionCamera = {position: [view.camera.x, lens + 3.2, view.camera.z], target: [from.x, ground + 1, from.z]};
        else if (view.air) a.inspectionCamera = {position: [from.x - Math.sin(facing) * 60, ground + view.air, from.z - Math.cos(facing) * 60], target: [to.x, ground, to.z]};
        else a.inspectionCamera = null;
        return {x: from.x, z: from.z, ground};
      })()`);
      await context.evaluate('window.__qaApp.advance(1.5)');
      await new Promise(done => setTimeout(done, 2600));
      const picture = await context.screenshot(`scablands-solid-${view.name}`);
      pictures.set(view.name, picture);
      const observed = await context.evaluate(`(async () => {
        const api = window.__render, intervals = [];
        await new Promise(done => { let previous = null;
          const sample = now => { if (previous !== null) intervals.push(now - previous); previous = now; if (intervals.length === 30) return done(); requestAnimationFrame(sample); };
          requestAnimationFrame(sample); });
        const info = api.renderer.info, s = window.__qaApp.duel.state;
        return {draws: info.render.calls, triangles: info.render.triangles, region: s.groundRegion ?? null, p50: intervals.sort((x, y) => x - y)[15]};
      })()`);
      const row = {name: view.name, placed, picture, ...observed};
      report.views.push(row);
      console.log(JSON.stringify({view: view.name, draws: row.draws, triangles: row.triangles, region: row.region}));
    }
    await context.evaluate('window.__qaApp.inspectionCamera = null');
    if (process.env.SCABLANDS_SHEET === '1') report.sheet = await makeSheet(context, pictures);
    await persist();
  } catch (error) {
    report.failure = error.message; await persist(); throw error;
  }
}

// The sheet: the twelve pictures in a grid of 4 by 3, each with its name, drawn on a canvas in the page and saved as a JPEG of 500 KB or less.
async function makeSheet(context, pictures) {
  const cell = {width: 640, height: 360};
  await context.evaluate(`window.__sheet = {images: []}`);
  for (const name of SHEET) {
    const file = pictures.get(name);
    if (!file) throw Error('The sheet needs a picture named ' + name);
    const base64 = (await readFile(file)).toString('base64');
    await context.evaluate(`(async () => { const image = new Image(); image.src = 'data:image/png;base64,${base64}'; await image.decode(); window.__sheet.images.push(image); })()`);
  }
  const data = await context.evaluate(`(() => {
    const names = ${JSON.stringify(SHEET)}, cell = ${JSON.stringify(cell)}, canvas = document.createElement('canvas');
    canvas.width = cell.width * 4; canvas.height = cell.height * 3;
    const g = canvas.getContext('2d');
    window.__sheet.images.forEach((image, index) => {
      const x = (index % 4) * cell.width, y = Math.floor(index / 4) * cell.height;
      g.drawImage(image, x, y, cell.width, cell.height);
      g.fillStyle = 'rgba(0,0,0,.55)'; g.fillRect(x, y + cell.height - 22, cell.width, 22);
      g.fillStyle = '#fff'; g.font = '14px sans-serif'; g.fillText(names[index], x + 8, y + cell.height - 7);
    });
    for (let quality = .82; quality >= .4; quality -= .06) {
      const url = canvas.toDataURL('image/jpeg', quality);
      if (url.length * .75 <= 480000) return url;
    }
    return canvas.toDataURL('image/jpeg', .4);
  })()`);
  const buffer = Buffer.from(data.split(',')[1], 'base64');
  if (buffer.length > 500 * 1024) throw Error('The sheet is over 500 KB: ' + buffer.length);
  const target = new URL('../../docs/board/looks/scablands-land/round-6.jpg', import.meta.url);
  await writeFile(target, buffer);
  return {file: 'docs/board/looks/scablands-land/round-6.jpg', bytes: buffer.length, pictures: SHEET};
}
