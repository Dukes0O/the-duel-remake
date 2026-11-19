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
const SHEET_ORDER = ['yard', 'east-road', 'girder-bridge', 'salt-pan', 'tin-town-gate', 'small-1920'];

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

// The sheet (1920 wide): row 1 the whole screen at each of the five spots and the small map at 1920 by 1080; row 2 the small map of each, cut out of the screen at its own
// size; row 3 the big map for Hot Delivery at 1280 by 720 and at 1920 by 1080. JPEG, 500 KB at most.
async function makeSheet(context, pictures) {
  const images = [];
  for (const [name, entry] of pictures) {
    const base64 = (await readFile(entry.picture)).toString('base64');
    images.push({name, base64, panel: entry.panel ?? null});
  }
  await context.evaluate(`window.__sheet = {items: []}`);
  for (const item of images) await context.evaluate(`(async () => { const image = new Image(); image.src = 'data:image/png;base64,${item.base64}'; await image.decode(); window.__sheet.items.push({name: ${JSON.stringify(item.name)}, image, panel: ${JSON.stringify(item.panel)}}); })()`);
  const data = await context.evaluate(`(() => {
    const order = ${JSON.stringify(SHEET_ORDER)}, items = window.__sheet.items, by = name => items.find(item => item.name === name);
    const columns = order.length, tile = {width: 1920 / columns, height: 1920 / columns * 9 / 16}, label = 20, bigWidth = 960, bigHeight = 540;
    const crop = {width: tile.width, height: tile.width * 3 / 4};
    const canvas = document.createElement('canvas');
    canvas.width = 1920; canvas.height = (tile.height + label) + (crop.height + label) + (bigHeight + label);
    const g = canvas.getContext('2d'); g.fillStyle = '#14120e'; g.fillRect(0, 0, canvas.width, canvas.height);
    const caption = (text, x, y) => { g.fillStyle = '#f2e9d0'; g.font = 'bold 12px sans-serif'; g.fillText(text, x + 6, y + 14); };
    const names = {'small-1920': 'GIRDER BRIDGE, 1920 BY 1080'};
    order.forEach((name, index) => {
      const item = by(name), x = index * tile.width, label1 = (names[name] ?? name.toUpperCase().replace(/-/g, ' '));
      caption(label1, x, 0); g.drawImage(item.image, x, label, tile.width - 3, (tile.width - 3) * 9 / 16);
      const p = item.panel, y2 = tile.height + label;
      caption('SMALL MAP: ' + label1, x, y2); g.drawImage(item.image, p.x, p.y, p.width, p.height, x, y2 + label, tile.width - 3, (tile.width - 3) * p.height / p.width);
    });
    const y3 = tile.height + label + crop.height + label;
    caption('BIG MAP (M) FOR HOT DELIVERY, 1280 BY 720', 0, y3); g.drawImage(by('big-1280').image, 0, y3 + label, bigWidth - 3, bigHeight);
    caption('BIG MAP (M), 1920 BY 1080', bigWidth, y3); g.drawImage(by('big-1920').image, bigWidth, y3 + label, bigWidth, bigHeight);
    for (let quality = .85; quality >= .3; quality -= .05) { const url = canvas.toDataURL('image/jpeg', quality); if (url.length * .75 <= 490000) return url; }
    return canvas.toDataURL('image/jpeg', .3);
  })()`);
  const buffer = Buffer.from(data.split(',')[1], 'base64');
  if (buffer.length > 500 * 1024) throw Error('The sheet is over 500 KB: ' + buffer.length);
  const target = new URL('../../docs/board/looks/scablands-land/round-7.jpg', import.meta.url);
  await writeFile(target, buffer);
  return {file: 'docs/board/looks/scablands-land/round-7.jpg', bytes: buffer.length, pictures: [...SHEET_ORDER, 'big-1280', 'big-1920']};
}
