// SCABLANDS-LAND, "Kyle on realism": the realism trial, before and after. A memory-only browser walk that stands the car at the same
// few places twice, first with the switch `scablands-realism` off and then with it on, and takes a picture at each on Performance
// (and one at the Girder Bridge on High). It records the draw calls, the triangles and the time between frames for each picture.
// Run with SCABLANDS_SHEET=1 it makes the comparison sheet (before above, after below; JPEG, 500 KB at most) at
// `docs/board/looks/scablands-land/round-<SCABLANDS_ROUND>.jpg` (round 8 unless told). This is a guide for Claude and NOT a frame
// check (AGENTS.md rule 8). The report is `scablands-realism.json` in the scenario's output folder.
import {readFile, writeFile} from 'node:fs/promises';
import {join} from 'node:path';
import {LAND} from '../../src/world/scablands-names.js';
import {ROAD_NET} from '../../src/world/scablands-road.js';
import {pointAlong} from '../../src/world/scablands-road-geometry.js';

const at = (id, dx = 0, dz = 0) => LAND.at(id, dx, dz);
const alongRoad = (id, metres) => { const road = ROAD_NET.road(id); return {from: pointAlong(road.points, metres), to: pointAlong(road.points, metres + 60)}; };

// Where the car stands (`from`) and what it faces (`to`).
export function views() {
  const bridge = at('girder-bridge'), hit = ROAD_NET.nearest(bridge.x, bridge.z);
  const a = hit.road.points[hit.index], b = hit.road.points[hit.index + 1], length = Math.hypot(b.x - a.x, b.z - a.z);
  const back = metres => ({x: bridge.x - (b.x - a.x) / length * metres, z: bridge.z - (b.z - a.z) / length * metres});
  const east = alongRoad('east-road', ROAD_NET.road('east-road').length * .35);
  return [
    {name: 'bridge', from: back(160), to: bridge},
    {name: 'bridge-near', from: back(60), to: bridge},
    {name: 'east-road', from: east.from, to: east.to},
    {name: 'yard', from: at('yard', 30, 20), to: at('tin-town')},
    {name: 'tin-town-gate', from: at('tin-town', -25, 200), to: at('tin-town', -25, 62)},
    {name: 'plates', from: at('yard', 1200, 0), to: at('yard', 3000, 0)},
    {name: 'salt-pan', from: at('yard', 2000, -1700), to: at('yard', 4000, -1700)},
  ];
}

// The four pictures on the sheet, before above and after below.
const SHEET = ['bridge', 'east-road', 'tin-town-gate', 'plates'];
const PASSES = [{name: 'before', flags: ''}, {name: 'after', flags: ',scablands-realism'}];

const click = (context, selector) => context.evaluate(`(() => {
  const button = document.querySelector(${JSON.stringify(selector)});
  if (!button || button.hidden || button.disabled) throw Error('Missing ' + ${JSON.stringify(selector)});
  button.click(); return true;
})()`);
const setQuality = (context, quality) => context.evaluate(`(() => { const select = document.querySelector('#graphics-quality');
  select.value = ${JSON.stringify(quality)}; select.dispatchEvent(new Event('change', {bubbles: true})); return true; })()`);

async function enterJob(context, flags) {
  await context.navigate(`/tools/menu-check.html?flags=hidden-road,story-everburn,warlord-cards${flags}&harness=scablands-realism`);
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

const observe = context => context.evaluate(`(async () => {
  const api = window.__render, intervals = [];
  await new Promise(done => { let previous = null;
    const sample = now => { if (previous !== null) intervals.push(now - previous); previous = now; if (intervals.length === 90) return done(); requestAnimationFrame(sample); };
    requestAnimationFrame(sample); });
  intervals.sort((x, y) => x - y);
  const info = api.renderer.info, host = api.renderer.domElement.parentElement;
  return {draws: info.render.calls, triangles: info.render.triangles, p50: intervals[45], p95: intervals[85],
    shadowReach: document.querySelector('[data-shadow-reach]')?.dataset.shadowReach ?? null, pipeline: document.querySelector('[data-render-pipeline]')?.dataset.renderPipeline ?? null};
})()`);

export async function run(context) {
  await context.command('Emulation.setDeviceMetricsOverride', {width: 1280, height: 720, deviceScaleFactor: 1, mobile: false});
  const report = {card: 'SCABLANDS-LAND', recipe: 'scablands-realism', guideOnly: true, headed: context.headed === true, passes: []};
  const persist = () => writeFile(join(context.outputDir, 'scablands-realism.json'), JSON.stringify(report, null, 2) + '\n');
  const pictures = new Map();
  try {
    for (const pass of PASSES) {
      const rows = [];
      report.passes.push({name: pass.name, views: rows});
      await enterJob(context, pass.flags);
      const shoot = async (view, label, quality) => {
        await place(context, view);
        await context.evaluate('window.__qaApp.advance(1.5)');
        await new Promise(done => setTimeout(done, 2600));
        const picture = await context.screenshot(`scablands-realism-${pass.name}-${label}`);
        pictures.set(`${pass.name}-${label}`, picture);
        const row = {name: label, quality, picture, ...await observe(context)};
        rows.push(row);
        console.log(JSON.stringify({pass: pass.name, view: label, draws: row.draws, triangles: row.triangles, p50: row.p50, p95: row.p95, shadowReach: row.shadowReach}));
      };
      for (const view of views()) await shoot(view, view.name, 'performance');
      await setQuality(context, 'high');
      await new Promise(done => setTimeout(done, 1500));
      await shoot(views()[0], 'bridge-high', 'high');
    }
    if (process.env.SCABLANDS_SHEET === '1') report.sheet = await makeSheet(context, pictures);
    await persist();
  } catch (error) {
    report.failure = error.message; await persist(); throw error;
  }
}

// The sheet: four places, before above and after below, each with its name, saved as a JPEG of 500 KB or less.
async function makeSheet(context, pictures) {
  const cell = {width: 640, height: 360}, names = PASSES.flatMap(pass => SHEET.map(view => `${pass.name}-${view}`));
  await context.evaluate(`window.__sheet = {images: []}`);
  for (const name of names) {
    const file = pictures.get(name);
    if (!file) throw Error('The sheet needs a picture named ' + name);
    const base64 = (await readFile(file)).toString('base64');
    await context.evaluate(`(async () => { const image = new Image(); image.src = 'data:image/png;base64,${base64}'; await image.decode(); window.__sheet.images.push(image); })()`);
  }
  const data = await context.evaluate(`(() => {
    const names = ${JSON.stringify(names)}, cell = ${JSON.stringify(cell)}, canvas = document.createElement('canvas');
    canvas.width = cell.width * 4; canvas.height = cell.height * 2;
    const g = canvas.getContext('2d');
    window.__sheet.images.forEach((image, index) => {
      const x = (index % 4) * cell.width, y = Math.floor(index / 4) * cell.height;
      g.drawImage(image, x, y, cell.width, cell.height);
      g.fillStyle = 'rgba(0,0,0,.55)'; g.fillRect(x, y + cell.height - 22, cell.width, 22);
      g.fillStyle = '#fff'; g.font = '14px sans-serif'; g.fillText(names[index], x + 8, y + cell.height - 7);
    });
    for (let quality = .86; quality >= .4; quality -= .06) {
      const url = canvas.toDataURL('image/jpeg', quality);
      if (url.length * .75 <= 480000) return url;
    }
    return canvas.toDataURL('image/jpeg', .4);
  })()`);
  const buffer = Buffer.from(data.split(',')[1], 'base64');
  if (buffer.length > 500 * 1024) throw Error('The sheet is over 500 KB: ' + buffer.length);
  const round = Number(process.env.SCABLANDS_ROUND) || 8, file = `docs/board/looks/scablands-land/round-${round}.jpg`;
  await writeFile(new URL(`../../${file}`, import.meta.url), buffer);
  return {file, bytes: buffer.length, pictures: names};
}
