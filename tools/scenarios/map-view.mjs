// MAP-VIEW (docs/PILOT_MAP.md section 3), private and memory-only: from the menu's HELIPAD button, open the
// pilot's map from the dispatch board's Map button, set a destination with a real click, close it with N,
// open it from the FLY TO panel and close it with Esc,
// cruise there, see the corner names of an owned course, and (on a second visit) fly to the Table (seen in the save). The
// flight is advanced by the fixed-step sim so the wait is not the browser's frame rate. Run:
//   node tools/browser-harness.mjs scenario map-view
import {chartFrame} from '../../src/heli/pilot-map-view.js';
import {placeById} from '../../src/heli/pilot-map-data.js';

const entry = '/tools/menu-check.html?flags=helicopter,pilot-map';
const ready = `document.readyState==='complete' && !!window.__qaApp &&
  document.querySelector('#view3d')?.dataset.vehicleAsset==='ready' && !document.querySelector('#start-engine')?.disabled`;
const pause = ms => new Promise(resolve => setTimeout(resolve, ms));

// A real mouse click at the centre of an element, or at a point in a canvas given in the chart's own km.
async function clickAt(context, point) {
  for (const type of ['mousePressed', 'mouseReleased']) await context.command('Input.dispatchMouseEvent', {type, button: 'left', clickCount: 1, ...point});
}
async function clickSelector(context, selector) {
  const point = await context.evaluate(`(() => { const b = document.querySelector(${JSON.stringify(selector)});
    if (!b || b.hidden || b.disabled) throw Error('Missing visible control ${selector}');
    b.scrollIntoView({block: 'center'}); const r = b.getBoundingClientRect(); return {x: r.x + r.width / 2, y: r.y + r.height / 2}; })()`);
  await clickAt(context, point);
}
async function pressKey(context, code, key) {
  for (const type of ['keyDown', 'keyUp']) await context.command('Input.dispatchKeyEvent', {type, code, key, text: type === 'keyDown' && key.length === 1 ? key : undefined});
}
async function clickPlace(context, id) {
  const rect = await context.evaluate(`(() => { const r = document.querySelector('.pilot-map-canvas').getBoundingClientRect(); return {x: r.x, y: r.y, w: r.width, h: r.height}; })()`);
  const frame = chartFrame(900, 900), place = placeById(id).drawAt, [px, py] = frame.project(place.x, place.z);
  await clickAt(context, {x: rect.x + px * rect.w / 900, y: rect.y + py * rect.h / 900});
}

// Advance the sim until the page says so (or give up after `seconds` of simulated time).
async function advanceUntil(context, condition, seconds, label) {
  const done = await context.evaluate(`(() => { const app = window.__qaApp;
    for (let i = 0; i < ${Math.round(seconds * 60)}; i++) { if (${condition}) return true; app.advance(1 / 60, 1 / 60); }
    return ${condition}; })()`);
  if (!done) throw Error(`Timed out: ${label}`);
}

// Fly toward the landing zone by hand (yaw to face it, nose down, hold 90 to 130 m above the ground under the helicopter) until within `metres` of it.
async function approachZone(context, metres, label) {
  await advanceUntil(context, `(() => {
    const v = app.heliView(), h = v.heli, dx = v.zone.x - h.x, dz = v.zone.z - h.z;
    if (Math.hypot(dx, dz) < ${metres}) { app.keys = {}; return true; }
    let error = Math.atan2(dx, dz) - h.heading; error = Math.atan2(Math.sin(error), Math.cos(error));
    const up = h.y - h.groundY;
    app.keys = {...(error > .12 ? {KeyD: true} : error < -.12 ? {KeyA: true} : {ArrowUp: Math.abs(error) < .5}),
      ...(up < 90 ? {KeyW: true} : up > 130 ? {KeyS: true} : {})};
    return false; })()`, 400, label);
  const crashed = await context.evaluate(`window.__qaApp.heliLog.some(event => event.type === 'crashed') || window.__qaApp.heliView().phase !== 'flying'`);
  if (crashed) throw Error(`The scripted approach crashed ${label}`);
}

async function cruiseTo(context, place, label) {
  await context.evaluate(`(() => { const app = window.__qaApp; app.heliCamera = 0; app.heliSetDestination(${JSON.stringify(place)});
    if (!app.heliSession.autopilotOn) app._inputAction('heli-autopilot'); })()`);
  await advanceUntil(context, `app.heliSession.cruiseOffered`, 900, `out of the area toward ${label}`);
  await context.evaluate(`window.__qaApp._inputAction('heli-cruise')`);
  await advanceUntil(context, `app.heliView().courseId === ${JSON.stringify(place)}`, 60, `arrive at ${label}`);
  await context.evaluate(`window.__qaApp.keys = {}`);
}

export async function run(context) {
  await context.command('Emulation.setDeviceMetricsOverride', {width: 1280, height: 720, deviceScaleFactor: 1, mobile: false});
  await context.navigate(entry);
  await context.waitFor(ready, 'menu ready', 90_000);
  // An owner of the home courses with the lessons done and the Table already seen (the 500 credits come on landing).
  await context.evaluate(`(() => { const app = window.__qaApp;
    app.profile = {...app.profile, credits: 5000,
      courses: {...app.profile.courses, version: 1, unlocked: [...new Set([...(app.profile.courses?.unlocked ?? []), 'tremblant-woods', 'tremblant-snow', 'panorama-ridge'])]},
      heli: {version: 1, lessons: {liftoff: true, hover: true, landing: true, carry: true}, map: {version: 1, seen: ['the-table'], found: [], table: false}}};
    app._saveProfile(); app.audio.setMuted?.(true); document.querySelector('#heli-visit').click(); })()`);
  await context.waitFor(`window.__qaApp.duel.state.status==='heli' && window.__qaApp.visualReady`, 'helipad scene', 120_000);
  await context.evaluate(`window.__qaApp.heliBuyFuel()`);
  await context.waitFor(`!!document.querySelector('[data-heli-board="map"]')`, 'the Map button on the board', 30_000);
  await context.screenshot('map-board');

  // Open it from the board; the flight is not paused and the map is a chart.
  await clickSelector(context, '[data-heli-board="map"]');
  await context.waitFor(`document.querySelector('.pilot-map') && !document.querySelector('.pilot-map').hidden && window.__qaApp.heliMapOpen`, 'the map opens', 20_000);
  const chart = await context.evaluate(`(() => { const c = document.querySelector('.pilot-map-canvas'), d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data;
    const colours = new Set(); for (let i = 0; i < d.length; i += 4 * 997) colours.add(d[i] + ',' + d[i + 1] + ',' + d[i + 2]);
    return {colours: colours.size, paused: window.__qaApp.duel.state.paused === true}; })()`);
  if (chart.colours < 6 || chart.paused) throw Error(`The chart should be drawn and the flight running ${JSON.stringify(chart)}`);
  await context.screenshot('map-open');

  // Click Panorama Ridge: it becomes the destination, through the session.
  await clickPlace(context, 'panorama-ridge');
  await context.waitFor(`window.__qaApp.heliView().destination === 'panorama-ridge'`, 'a click sets the destination', 10_000);
  await pause(500);
  await context.screenshot('map-destination');
  // N closes it (and opens it again).
  await pressKey(context, 'KeyN', 'n');
  await context.waitFor(`!window.__qaApp.heliMapOpen && document.querySelector('.pilot-map').hidden`, 'N closes the map', 10_000);
  await clickSelector(context, '.heli-map-open');
  await context.waitFor(`window.__qaApp.heliMapOpen`, 'the FLY TO panel\'s map button opens the map', 10_000);
  await pressKey(context, 'Escape', 'Escape');
  await context.waitFor(`!window.__qaApp.heliMapOpen && window.__qaApp.duel.state.paused !== true`, 'Esc closes the map without pausing', 10_000);

  // Climb, cruise to Panorama Ridge and look for the corner names of a course the pilot owns.
  await context.evaluate(`window.__qaApp.keys = {KeyW: true}`);
  await advanceUntil(context, `(() => { const v = app.heliView(); return v.heli.y - v.zone.y > 120; })()`, 120, 'climb to 120 m');
  await context.evaluate(`window.__qaApp.keys = {}`);
  await cruiseTo(context, 'panorama-ridge', 'Panorama Ridge');
  await advanceUntil(context, `(app.heliView().scout?.corners.length ?? 0) > 0`, 5, 'the corner names of an owned course');
  await context.waitFor(`window.__qaApp.visualReady`, 'Panorama Ridge scene', 120_000);
  await approachZone(context, 450, 'toward the Panorama Ridge pad');
  await pause(1500);
  await context.screenshot('scouting-panorama');
  await pressKey(context, 'KeyN', 'n');
  await context.waitFor(`window.__qaApp.heliMapOpen`, 'the map at Panorama Ridge', 10_000);
  await pause(500);
  await context.screenshot('map-at-panorama');
  await pressKey(context, 'KeyN', 'n');

  // A second visit with a full tank (memory-only save). The Table: seen in the save, so it is a destination, and the
  // course last loaded steps aside while the helicopter is there.
  await context.evaluate(`window.__qaApp.returnToMenu()`);
  await context.waitFor(`window.__qaApp.duel.state.status==='menu' && window.__qaApp.heliSession===null && !window.__qaApp.heliMapOpen`, 'back to the menu', 30_000);
  await context.evaluate(`(() => { const app = window.__qaApp; app.profile = {...app.profile, heli: {...app.profile.heli, fuelKg: 400}};
    app._saveProfile(); document.querySelector('#heli-visit').click(); })()`);
  await context.waitFor(`window.__qaApp.duel.state.status==='heli' && window.__qaApp.visualReady`, 'helipad scene again', 120_000);
  await context.evaluate(`window.__qaApp.keys = {KeyW: true}`);
  await advanceUntil(context, `(() => { const v = app.heliView(); return v.heli.y - v.zone.y > 120; })()`, 120, 'climb to 120 m');
  await context.evaluate(`window.__qaApp.keys = {}`);
  await cruiseTo(context, 'the-table', 'the Table');
  await context.waitFor(`window.__qaApp.heliView().courseId === 'the-table' && window.__qaApp.visualReady`, 'at the Table', 30_000);
  await pause(1500);
  await context.screenshot('table-from-the-air');
  await approachZone(context, 380, 'toward the Table');
  await pause(1500);
  await context.screenshot('table-close');
  const table = await context.evaluate(`(() => { const v = window.__qaApp.heliView(); return {course: v.courseId, zone: !!v.zone, secrets: !!v.secrets, notice: document.querySelector('.heli-notices')?.textContent ?? ''}; })()`);
  if (table.course !== 'the-table' || !table.zone) throw Error(`The Table should be a place the helicopter can land ${JSON.stringify(table)}`);
  await context.evaluate(`window.__qaApp.returnToMenu()`);
  await context.waitFor(`window.__qaApp.duel.state.status==='menu' && window.__qaApp.heliSession===null && !window.__qaApp.heliMapOpen`, 'back to the menu', 30_000);
  console.log('Pilot map: board button, click to set a destination, N and Esc, cruise, corner names and the Table.');
}
