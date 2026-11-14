// SCABLANDS-LAND round 4, slice 4: the map, seen in play. A memory-only browser walk, on Performance, in Hot Delivery. It takes a picture of the small map
// in play at the yard, on the East Road, at the Girder Bridge, on the salt pan and at Tin Town's gate (each at 1280 by 720), of the big map for Hot Delivery
// at 1280 by 720 and at 1920 by 1080, and of the small map once at 1920 by 1080. It checks that the big map holds the game still while it is open and lets
// it go when it is closed, that the pause screen is not drawn over it, and reads what the maps cost. Then it makes the comparison sheet at
// `docs/board/looks/scablands-land/round-7.jpg` (JPEG, 500 KB at most) when run with SCABLANDS_SHEET=1. A guide for Claude, not a frame check (rule 8).
// The report is `scablands-map.json` in the scenario's output folder.
import {readFile, writeFile} from 'node:fs/promises';
import {join} from 'node:path';
import {LAND} from '../../src/world/scablands-names.js';
import {ROAD_NET} from '../../src/world/scablands-road.js';
import {pointAlong} from '../../src/world/scablands-road-geometry.js';

const QUALITY = 'performance';
const at = (id, dx = 0, dz = 0) => LAND.at(id, dx, dz);
const heading = (from, to) => Math.atan2(to.x - from.x, to.z - from.z);
const alongRoad = (id, metres) => { const road = ROAD_NET.road(id), here = pointAlong(road.points, metres), next = pointAlong(road.points, metres + 60); return {from: here, to: next}; };

// Where the car stands for each picture, and what it faces. The bridge is approached on the East Road, a hundred metres short of it.
export function spots() {
  const east = alongRoad('east-road', 3300), bridge = at('girder-bridge'), hit = ROAD_NET.nearest(bridge.x, bridge.z);
  const direction = heading(hit.road.points[hit.index], hit.road.points[hit.index + 1]);
  return [
    {name: 'yard', from: at('yard', 30, 20), to: at('tin-town')},
    {name: 'east-road', from: east.from, to: east.to},
    {name: 'girder-bridge', from: {x: bridge.x - Math.sin(direction) * 110, z: bridge.z - Math.cos(direction) * 110}, to: bridge},
    {name: 'salt-pan', from: at('yard', 2000, -1700), to: at('yard', 4000, -1700)},
    {name: 'tin-town-gate', from: at('tin-town', -25, 200), to: at('tin-town', -25, 62)},
  ];
}
const SHEET = ['yard', 'east-road', 'girder-bridge', 'salt-pan', 'tin-town-gate'];

const click = (context, selector) => context.evaluate(`(() => {
  const button = document.querySelector(${JSON.stringify(selector)});
  if (!button || button.hidden || button.disabled) throw Error('Missing ' + ${JSON.stringify(selector)});
  button.click(); return true;
})()`);
const pause = ms => new Promise(done => setTimeout(done, ms));

export async function run(context) {
  await context.command('Emulation.setDeviceMetricsOverride', {width: 1280, height: 720, deviceScaleFactor: 1, mobile: false});
  const report = {card: 'SCABLANDS-LAND', recipe: 'scablands-map', quality: QUALITY, guideOnly: true, headed: context.headed === true, spots: []};
  const persist = () => writeFile(join(context.outputDir, 'scablands-map.json'), JSON.stringify(report, null, 2) + '\n');
  const pictures = new Map();
  try {
    await context.navigate('/tools/menu-check.html?flags=hidden-road,story-everburn,warlord-cards&harness=scablands-map');
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
    // The QA page's own panel is not part of the game: it is hidden in the pictures.
    await context.evaluate(`document.querySelectorAll('body > details').forEach(panel => { panel.style.display = 'none'; })`);
    // How long the picture of the land took to make, and how many frames it was spread over.
    const place = async spot => context.evaluate(`(() => {
      const a = window.__qaApp, d = a.duel, s = d.state, job = s.arena.worldJob, wrap = v => Math.atan2(Math.sin(v), Math.cos(v));
      const from = ${JSON.stringify(spot.from)}, to = ${JSON.stringify(spot.to)}, pose = d.course.nearest(from.x, from.z);
      s.s = s.prevS = pose.s; s.lateral = s.prevLateral = pose.lateral; s.speedMph = 0; s.yawVelocity = 0; s.pushVelocity = 0;
      s.headingError = wrap(Math.atan2(to.x - from.x, to.z - from.z) - d.course.at(pose.s).heading);
      job.job.stepState.ember = 100;
      return {x: from.x, z: from.z};
    })()`);
    const hud = () => `document.querySelector('.world-hud').worldMapStats`;
    report.picture = await context.evaluate(`(() => { const stats = ${hud()}; return {pictureMs: stats.pictureMs, updates: stats.updates}; })()`);
    const frame = async seconds => { await context.evaluate(`window.__qaApp.advance(${seconds})`); await pause(900); };
    const panel = () => context.evaluate(`(() => { const r = document.querySelector('.world-hud-minimap').getBoundingClientRect(); return {x: r.x, y: r.y, width: r.width, height: r.height}; })()`);
    const readMap = () => context.evaluate(`(() => { const label = document.querySelector('.world-hud-minimap-canvas').getAttribute('aria-label'); const k = document.querySelector('.world-hud').worldMapStats;
      return {label, smallDraws: k.smallDraws, smallMs: k.smallMs, smallMaxMs: k.smallMaxMs}; })()`);
    for (const spot of spots()) {
      await place(spot);
      await frame(.4);
      const picture = await context.screenshot(`scablands-map-${spot.name}`);
      pictures.set(spot.name, {picture, panel: await panel()});
      const row = {name: spot.name, ...await readMap(), ...await context.evaluate(`(() => { const k = window.__qaApp.duel.state.arena.worldJob; return {learnt: document.querySelector('.world-hud-minimap') ? true : false}; })()`)};
      report.spots.push(row);
      console.log(JSON.stringify(row));
    }
    // The big map for Hot Delivery, from the yard: it holds the game still, shows no pause screen, and is shut by M.
    await place(spots()[0]);
    await frame(.3);
    report.bigMap = await context.evaluate(`(async () => {
      const a = window.__qaApp, s = a.duel.state, snapshot = () => JSON.stringify({s: s.s, lateral: s.lateral, speed: s.speedMph, clock: s.stageTimeSec, ember: s.arena.worldJob.job.stepState.ember});
      const press = () => document.dispatchEvent(new KeyboardEvent('keydown', {code: 'KeyM', bubbles: true, cancelable: true}));
      const wait = ms => new Promise(done => setTimeout(done, ms));
      const before = snapshot(); press(); await wait(700);
      const open = !document.querySelector('.world-hud-map').hidden, paused = s.paused === true, modal = !document.querySelector('#modal-layer')?.hidden;
      const during = snapshot(); await wait(900); const later = snapshot();
      return {open, paused, modalShown: modal, unchangedWhileOpen: during === later, before, during, ways: document.querySelector('.world-hud-ways').innerText,
        stats: {bigMs: document.querySelector('.world-hud').worldMapStats.bigMs, waysMs: document.querySelector('.world-hud').worldMapStats.waysMs}};
    })()`);
    pictures.set('big-1280', {picture: await context.screenshot('scablands-map-big-1280')});
    await context.command('Emulation.setDeviceMetricsOverride', {width: 1920, height: 1080, deviceScaleFactor: 1, mobile: false});
    await pause(900);
    pictures.set('big-1920', {picture: await context.screenshot('scablands-map-big-1920')});
    report.bigRect = await context.evaluate(`(() => { const r = document.querySelector('.world-hud-map').getBoundingClientRect(); return {width: r.width, height: r.height, top: r.top, bottom: r.bottom, viewport: [innerWidth, innerHeight]}; })()`);
    await context.evaluate(`document.dispatchEvent(new KeyboardEvent('keydown', {code: 'KeyM', bubbles: true, cancelable: true}))`);
    await pause(700);
    report.afterClose = await context.evaluate(`({open: !document.querySelector('.world-hud-map').hidden, paused: window.__qaApp.duel.state.paused === true, modalShown: !document.querySelector('#modal-layer')?.hidden})`);
    await place(spots()[2]);
    await frame(.4);
    pictures.set('small-1920', {picture: await context.screenshot('scablands-map-small-1920'), panel: await panel()});
    report.panel1920 = await panel();
    await context.command('Emulation.setDeviceMetricsOverride', {width: 1280, height: 720, deviceScaleFactor: 1, mobile: false});
    await pause(600);
    // What the maps cost: the mean and the slowest draw of the small map over the whole walk, in the page's own clock.
    report.cost = await context.evaluate(`(() => { const k = document.querySelector('.world-hud').worldMapStats; return {smallDraws: k.smallDraws, smallMeanMs: k.smallMs / Math.max(1, k.smallDraws), smallMaxMs: k.smallMaxMs, pictureMs: k.pictureMs, updates: k.updates, updateMeanMs: k.updateMs / Math.max(1, k.updates)}; })()`);
    console.log(JSON.stringify({bigMap: report.bigMap && {open: report.bigMap.open, paused: report.bigMap.paused, modalShown: report.bigMap.modalShown, unchanged: report.bigMap.unchangedWhileOpen}, afterClose: report.afterClose, cost: report.cost}));
    if (process.env.SCABLANDS_SHEET === '1') report.sheet = await makeSheet(context, pictures);
    await persist();
  } catch (error) {
    report.failure = error.message; await persist(); throw error;
  }
}

// The sheet: for each of the five spots the whole picture (scaled down) beside the small map as it stood on the screen, then the big map at 1280 and at 1920.
async function makeSheet(context, pictures) {
  const images = [];
  for (const [name, entry] of pictures) {
    const base64 = (await readFile(entry.picture)).toString('base64');
    images.push({name, base64, panel: entry.panel ?? null});
  }
  await context.evaluate(`window.__sheet = {items: []}`);
  for (const item of images) await context.evaluate(`(async () => { const image = new Image(); image.src = 'data:image/png;base64,${item.base64}'; await image.decode(); window.__sheet.items.push({name: ${JSON.stringify(item.name)}, image, panel: ${JSON.stringify(item.panel)}}); })()`);
  const data = await context.evaluate(`(() => {
    const order = ${JSON.stringify(SHEET)}, items = window.__sheet.items, by = name => items.find(item => item.name === name);
    const tile = {width: 480, height: 270}, crop = {width: 360, height: 270}, gap = 6, label = 22;
    const rows = order.length, big = by('big-1280'), width = tile.width + crop.width + gap, rowHeight = tile.height + label;
    const canvas = document.createElement('canvas');
    canvas.width = width * 2 + gap; canvas.height = rowHeight * 3 + (big ? 0 : 0);
    const g = canvas.getContext('2d'); g.fillStyle = '#14120e'; g.fillRect(0, 0, canvas.width, canvas.height);
    const caption = (text, x, y) => { g.fillStyle = '#f2e9d0'; g.font = 'bold 13px sans-serif'; g.fillText(text, x + 6, y + 15); };
    order.forEach((name, index) => {
      const item = by(name), col = index % 2, row = Math.floor(index / 2), x = col * (width + gap), y = row * rowHeight;
      caption('SMALL MAP: ' + name.toUpperCase().replace(/-/g, ' '), x, y);
      g.drawImage(item.image, x, y + label, tile.width, tile.height);
      const p = item.panel; g.drawImage(item.image, p.x, p.y, p.width, p.height, x + tile.width + gap, y + label, crop.width, crop.width * p.height / p.width);
    });
    const slot = order.length, col = slot % 2, row = Math.floor(slot / 2), x = col * (width + gap), y = row * rowHeight;
    const wide = by('big-1280');
    caption('BIG MAP (M), 1280 BY 720', x, y); g.drawImage(wide.image, x, y + label, width, width * 9 / 16);
    for (let quality = .8; quality >= .35; quality -= .05) { const url = canvas.toDataURL('image/jpeg', quality); if (url.length * .75 <= 480000) return url; }
    return canvas.toDataURL('image/jpeg', .35);
  })()`);
  const buffer = Buffer.from(data.split(',')[1], 'base64');
  if (buffer.length > 500 * 1024) throw Error('The sheet is over 500 KB: ' + buffer.length);
  const target = new URL('../../docs/board/looks/scablands-land/round-7.jpg', import.meta.url);
  await writeFile(target, buffer);
  return {file: 'docs/board/looks/scablands-land/round-7.jpg', bytes: buffer.length, pictures: [...SHEET, 'big-1280']};
}
