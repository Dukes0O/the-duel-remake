// SCABLANDS-LAND round 4, slice 2a: the regions, the roads and the crossings, seen. A memory-only browser walk, on Performance, that takes a picture
// standing in each of the land's regions, at each of the five crossings (on the ground and from the air), on each of the twelve roads, and from above
// each of the four ways from the yard to Tin Town (the East Road at the bridge, the scab plates at the Steps, the salt pan at the Pipe and the river
// bed at the Wash). For each it records the draw calls and triangles of the frame it drew. Then it makes the comparison sheet of the twelve pictures named
// in SHEET (JPEG, 500 KB at most) at `docs/board/looks/scablands-land/round-5.jpg` when the scenario is run with SCABLANDS_SHEET=1. This is a guide for
// Claude and NOT a frame check (AGENTS.md rule 8). The report is `scablands-regions.json` in the scenario's output folder.
import {readFile, writeFile} from 'node:fs/promises';
import {join} from 'node:path';
import {LAND} from '../../src/world/scablands-names.js';
import {ROAD_NET} from '../../src/world/scablands-road.js';
import {pointAlong} from '../../src/world/scablands-road-geometry.js';
import {RIVER_LAND} from '../../src/world/scablands-regions.js';

const QUALITY = 'performance';
const EAST = Math.PI / 2;
const at = (id, dx = 0, dz = 0) => LAND.at(id, dx, dz);
const heading = (from, to) => Math.atan2(to.x - from.x, to.z - from.z);
// A point `metres` before and `metres` beyond a point on a road, so that the car can stand on the road facing along it.
const alongRoad = (id, metres) => { const road = ROAD_NET.road(id), here = pointAlong(road.points, metres), next = pointAlong(road.points, metres + 60); return {from: here, to: next}; };
const riverAt = metres => { const line = RIVER_LAND.line; let index = 1; while (index < line.points.length - 1 && line.along[index] < metres) index++; return {from: line.points[index - 1], to: line.points[index]}; };

// The views. `from` is where the car stands, `to` what it faces; `air` puts a camera that high above the spot and that far back instead.
export function views() {
  const out = [];
  const stand = (name, from, to, extra = {}) => out.push({name, from, to, ...extra});
  stand('region-flats', at('yard', -1400, -1100), at('yard', 400, -1100));
  stand('region-plates', at('yard', 1200, 0), at('yard', 3000, 0));
  stand('region-salt-pan', at('yard', 2000, -1700), at('yard', 4000, -1700));
  const bed = riverAt(3000); stand('region-river-bed', bed.from, bed.to);
  stand('region-wreck-fields', at('yard', 3400, 2000), at('boneyard'));
  stand('region-sand', at('yard', -400, -4400), at('ships-in-sand'));
  stand('region-burn', at('yard', -4300, 2100), at('everburn'));
  const east = alongRoad('east-road', 1000); stand('region-road', east.from, east.to);
  for (const crossing of RIVER_LAND.crossings) {
    const hit = ROAD_NET.nearest(crossing.x, crossing.z);
    const direction = hit ? heading(hit.road.points[hit.index], hit.road.points[hit.index + 1]) : EAST;
    const back = {x: crossing.x - Math.sin(direction) * 160, z: crossing.z - Math.cos(direction) * 160};
    stand(`crossing-${crossing.id}`, back, crossing);
    stand(`crossing-${crossing.id}-air`, back, crossing, {air: 150});
  }
  for (const road of ROAD_NET.roads) { const spot = alongRoad(road.id, road.length * .35); stand(`road-${road.id}`, spot.from, spot.to); }
  // From above each of the four ways from the yard to Tin Town, at the place where the ways differ most: where each crosses the river.
  const above = (name, point) => stand(`way-${name}`, point, point, {above: 420});
  above('east-road-bridge', at('girder-bridge')); above('scab-plates-steps', at('the-steps')); above('salt-pan-pipe', at('the-pipe')); above('river-bed-wash', at('the-wash'));
  return out;
}

// The twelve pictures on the sheet, in order: a region, a crossing and a road each, and the four ways from above.
const SHEET = ['region-plates', 'region-salt-pan', 'region-river-bed', 'region-sand', 'region-burn', 'crossing-girder-bridge', 'crossing-the-pipe', 'crossing-the-steps',
  'road-east-road', 'way-east-road-bridge', 'way-scab-plates-steps', 'way-river-bed-wash'];

const click = (context, selector) => context.evaluate(`(() => {
  const button = document.querySelector(${JSON.stringify(selector)});
  if (!button || button.hidden || button.disabled) throw Error('Missing ' + ${JSON.stringify(selector)});
  button.click(); return true;
})()`);

export async function run(context) {
  await context.command('Emulation.setDeviceMetricsOverride', {width: 1280, height: 720, deviceScaleFactor: 1, mobile: false});
  const report = {card: 'SCABLANDS-LAND', recipe: 'scablands-regions', quality: QUALITY, guideOnly: true, headed: context.headed === true, views: []};
  const persist = () => writeFile(join(context.outputDir, 'scablands-regions.json'), JSON.stringify(report, null, 2) + '\n');
  const pictures = new Map();
  try {
    await context.navigate('/tools/menu-check.html?flags=hidden-road,story-everburn,warlord-cards&harness=scablands-regions');
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
        const view = ${JSON.stringify({air: view.air ?? 0, above: view.above ?? 0})};
        if (view.above) a.inspectionCamera = {position: [from.x, ground + view.above, from.z + view.above * .8], target: [from.x, ground, from.z - 60]};
        else if (view.air) a.inspectionCamera = {position: [from.x - Math.sin(facing) * 60, ground + view.air, from.z - Math.cos(facing) * 60], target: [to.x, ground, to.z]};
        else a.inspectionCamera = null;
        return {x: from.x, z: from.z, ground};
      })()`);
      await context.evaluate('window.__qaApp.advance(1.5)');
      await new Promise(done => setTimeout(done, 2600));
      const picture = await context.screenshot(`scablands-regions-${view.name}`);
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
  const target = new URL('../../docs/board/looks/scablands-land/round-5.jpg', import.meta.url);
  await writeFile(target, buffer);
  return {file: 'docs/board/looks/scablands-land/round-5.jpg', bytes: buffer.length, pictures: SHEET};
}
