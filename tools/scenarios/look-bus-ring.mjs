// OPEN-LOOK-BUS-RING: the pictures by which Claude judges the Bus Ring, round 1. Not a frame check, and not a test of any rule.
//
// It enters the Scablands by Light the Town, the job that has an evening, as tools/scenarios/look-glasshouse.mjs does, and stands
// the camp at the position OPEN-T-MARKET gives it (`land.at('ridge', -665, -345)`) through tools/open-look-stand.js. The browser
// uses memory-only storage. The pictures, by name (each file is `look-bus-ring-<name>.png`):
//   edge      from `car-stop` at eye height (1.6 m), by day, through the gate
//   yard      on foot from `gate` across the yard to the workshop, the canopy, the welding and the hoist, by day
//   table     on foot from `forge` across the yard to the table, the stove and the car on its stands, by day
//   far       from the nearest point of a road that sees the camp (the Ridge spur, about 700 m out), at dusk and car height (1.2 m)
//   night     on foot from `table` to the workshop and the welding, at night
// and two more than the card asks for, so that each tell can be judged at a second distance:
//   near      from 250 m out on the line to the road, by day and at car height: the roofs
//   edge-dusk from `car-stop` at dusk: the lamp on its mast and the flicker through the gate
// The welding is caught while its arc is struck (`busRingWeld`), so that its flicker is in the pictures that should show it.
import {writeFile} from 'node:fs/promises';
import {join} from 'node:path';
import {LAND} from '../../src/world/scablands-names.js';
import {ROAD_NET} from '../../src/world/scablands-road.js';
import {scablandsSurfaceHeightAt} from '../../src/world/scablands-ground.js';
import {sees} from '../../src/world/scablands-ways.js';
import {BUS_RING_BUDGET, BUS_RING_LAYOUT, busRingWeld} from '../../src/world/open/looks/bus-ring-look.js';
import {BRAND_RULE} from '../../src/world/jobs/brand-rule.js';
import {pageSource as job2} from './everburn-job2.mjs';

export const SITE = Object.freeze({x: LAND.at('ridge', -665, -345).x, z: LAND.at('ridge', -665, -345).z});
const EYE = 1.6, CAR_HEIGHT = 1.2;

// The nearest point of any road from which the camp can be seen at car height. The Ridge Road passes 740 m off along
// the top of the ridge, 40 m above the salt, and the ridge's own edge hides the camp from it; the spur that comes down
// off the ridge onto the pan is the first road that sees it.
export function roadView() {
  let best = null;
  for (const road of ROAD_NET.roads) for (let index = 1; index < road.points.length; index++) {
    const a = road.points[index - 1], b = road.points[index], length = Math.hypot(b.x - a.x, b.z - a.z);
    for (let along = 0; along <= length; along += 5) {
      const point = {x: a.x + (b.x - a.x) * along / length, z: a.z + (b.z - a.z) * along / length}, metres = Math.hypot(point.x - SITE.x, point.z - SITE.z);
      if (metres > 1500 || (best && metres >= best.metres)) continue;
      if (sees(point, SITE, {heightAt: scablandsSurfaceHeightAt, eye: CAR_HEIGHT, target: 2.6, step: 3})) best = {road: road.id, x: point.x, z: point.z, metres};
    }
  }
  if (!best) throw Error('No road sees the Bus Ring.');
  return best;
}

// A moment when the arc is struck and bright, the first after `after` seconds.
export function weldMoment(after = 7) {
  for (let seconds = after; seconds < after + 60; seconds += .01) if (busRingWeld(seconds) > .85) return Math.round(seconds * 100) / 100;
  throw Error('The welding never strikes its arc.');
}

export const PICTURES = Object.freeze([
  {name: 'edge', stage: 'camp', from: 'car-stop', eye: EYE},
  {name: 'yard', stage: 'camp', from: 'gate', eye: EYE},
  {name: 'table', stage: 'camp', from: 'forge', eye: EYE, toward: {x: -7.6, z: 3.1, up: 1}},
  {name: 'near', stage: 'camp', out: 250, eye: CAR_HEIGHT, extra: true},
  {name: 'far', stage: 'camp', road: true, eye: CAR_HEIGHT, dusk: true},
  {name: 'edge-dusk', stage: 'camp', from: 'car-stop', eye: EYE, dusk: true, extra: true},
  {name: 'night', stage: 'night', from: 'table', eye: EYE, dusk: true, toward: 'arc'},
]);

// Where the camera stands and looks, and where the car waits, in the land's metres. `stood` is what the stand gave back:
// every spot with its ground height. Heights of the eye and of what it looks at are taken from the drawn ground in the page.
export function viewFor(picture, stood) {
  const at = point => ({x: SITE.x + point.x, z: SITE.z + point.z});
  const towards = {x: BUS_RING_LAYOUT.gateFacing.x, z: BUS_RING_LAYOUT.gateFacing.z};
  if (picture.road || picture.out) {
    const road = roadView(), toSite = {x: (SITE.x - road.x) / road.metres, z: (SITE.z - road.z) / road.metres};
    const eye = picture.road ? {x: road.x, z: road.z} : {x: SITE.x - toSite.x * picture.out, z: SITE.z - toSite.z * picture.out};
    return {eye: {...eye, up: picture.eye}, look: {x: SITE.x, z: SITE.z, up: 3}, car: {x: eye.x - toSite.x * 9, z: eye.z - toSite.z * 9},
      metres: Math.round(Math.hypot(SITE.x - eye.x, SITE.z - eye.z)), road: road.road, dusk: !!picture.dusk};
  }
  const spot = stood.spots[picture.from];
  if (!spot) throw Error('No spot called ' + picture.from);
  let look;
  if (picture.toward === 'arc') look = {...at(BUS_RING_LAYOUT.things.arc), up: 1.1};
  else if (picture.toward) look = {...at(picture.toward), up: picture.toward.up};
  else look = {x: spot.looksAt.x, z: spot.looksAt.z, up: BUS_RING_LAYOUT.spots[picture.from].looksAt.y};
  // The car waits outside, out of the picture: behind the camera for the views from outside, at `car-stop` for the rest.
  const stop = stood.spots['car-stop'];
  const car = picture.from === 'car-stop' ? {x: stop.x + towards.x * 10, z: stop.z + towards.z * 10} : {x: stop.x, z: stop.z};
  return {eye: {x: spot.x, z: spot.z, up: picture.eye}, look, car, dusk: !!picture.dusk};
}

// ---- What runs in the page. Each is sent as text; `pageSource` proves that the text parses. ----
export const pageFunctions = {
  ready: () => window.__qaApp?.visualReady && window.__qaApp.duel.state.status === 'menu' && !!window.__render && !!window.__openLookStand &&
    !!document.querySelector('#graphics-quality') &&
    [...document.querySelectorAll('details button')].some(button => !button.disabled && button.textContent.startsWith('Create temporary player ready for job 2:')),
  prepare: () => {
    const app = window.__qaApp;
    if (!window.name.startsWith('__duel_qa_tab_v2:')) throw Error('Memory-only player required');
    const quality = document.querySelector('#graphics-quality');
    quality.value = 'performance';
    quality.dispatchEvent(new Event('change', {bubbles: true}));
    const player = [...document.querySelectorAll('details button')].find(button => button.textContent.startsWith('Create temporary player ready for job 2:'));
    player.click();
    if (!app.visitWasteland({arrived: true})) throw Error('Could not enter the memory-only yard');
    return true;
  },
  // Only the 3D view is drawn in the pictures: the menu, the HUD, the captions and the rear view are hidden.
  hideInterface: () => {
    const style = document.createElement('style');
    style.textContent = 'body *{visibility:hidden !important} canvas{visibility:visible !important} canvas.world-hud-minimap,.world-hud-minimap canvas{visibility:hidden !important} .rear-view-frame{display:none !important}';
    document.head.appendChild(style);
    window.dispatchEvent(new Event('resize'));
    window.__qaApp.audio.setMuted(true);
    return true;
  },
  stand: async (stage, seconds) => {
    const stood = await window.__openLookStand.stand('bus-ring', {stage, seconds});
    window.__openLookStand.at(seconds);
    return stood;
  },
  // Parks the car, sets the light and the camera for a view.
  place: (view, duskSeconds) => {
    const app = window.__qaApp, duel = app.duel, state = duel.state, course = duel.course, wrap = value => Math.atan2(Math.sin(value), Math.cos(value));
    let land = null;
    window.__render.scene.traverse(node => { if (node.name === 'The Scablands') land = node; });
    const pose = course.nearest(view.car.x, view.car.z);
    Object.assign(state, {s: pose.s, prevS: pose.s, lateral: pose.lateral, prevLateral: pose.lateral, speedMph: 0, yawVelocity: 0, pushVelocity: 0,
      headingError: wrap(Math.atan2(view.look.x - view.car.x, view.look.z - view.car.z) - course.at(pose.s).heading)});
    // Light the Town's rule brings the evening on as its clock runs; here the clock is held at day or at dusk.
    Object.assign(state.arena.worldJob.job.stepState, {brandBriefed: true, brandsUsed: 1, brandElapsed: view.dusk ? duskSeconds : 0, dusk: view.dusk ? 1 : 0});
    const ground = (x, z) => land.userData.drawnGroundHeightAt(x, z);
    app.inspectionCamera = {position: [view.eye.x, ground(view.eye.x, view.eye.z) + view.eye.up, view.eye.z], target: [view.look.x, ground(view.look.x, view.look.z) + view.look.up, view.look.z]};
    window.__render.camera.position.fromArray(app.inspectionCamera.position);
    window.__render.camera.zoom = 1;
    window.__render.camera.updateProjectionMatrix();
    return app.inspectionCamera;
  },
  // What the camp costs in this view: the main scene drawn with it and without it, shadows off.
  measure: () => {
    const api = window.__render, renderer = api.renderer, group = api.scene.getObjectByName('The Bus Ring');
    if (!group) throw Error('The Bus Ring is not in the scene');
    const shadows = renderer.shadowMap.enabled, seen = group.visible;
    const draw = () => { renderer.info.reset(); renderer.render(api.scene, api.camera); return {draws: renderer.info.render.calls, triangles: renderer.info.render.triangles}; };
    try {
      renderer.shadowMap.enabled = false;
      group.visible = false; const without = draw();
      group.visible = true; const withCamp = draw();
      return {draws: withCamp.draws - without.draws, triangles: withCamp.triangles - without.triangles, lights: group.userData.lights.length,
        evening: document.querySelector('#view3d')?.dataset.evening ?? null};
    } finally { renderer.shadowMap.enabled = shadows; group.visible = seen; }
  },
  startDuskBlend: () => {
    let previous = performance.now(), elapsed = 0;
    window.__busRingDuskReady = false;
    function frame(now) {
      elapsed += Math.min(.05, (now - previous) / 1000);
      previous = now;
      if (elapsed >= 3) window.__busRingDuskReady = true;
      else requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);
    return true;
  },
  settled: () => window.__busRingDuskReady && document.querySelector('#view3d')?.dataset.evening === '1.00',
};
export function pageSource(name, ...args) {
  const fn = pageFunctions[name], source = `(${fn.toString()})(...${JSON.stringify(args)})`;
  new Function(`return ${source}`);
  return source;
}
// Every text this scenario can send to the page, for the Node check (tools/test-bus-ring-look.mjs).
export function pageSources() {
  const spots = Object.fromEntries(Object.entries(BUS_RING_LAYOUT.spots).map(([name, spot]) => [name, {x: SITE.x + spot.x, y: 0, z: SITE.z + spot.z,
    looksAt: {x: SITE.x + spot.looksAt.x, y: spot.looksAt.y, z: SITE.z + spot.looksAt.z}}]));
  return [
    pageSource('ready'), pageSource('prepare'), pageSource('hideInterface'), pageSource('measure'), pageSource('startDuskBlend'), pageSource('settled'),
    pageSource('stand', 'camp', weldMoment()), pageSource('stand', 'night', weldMoment()),
    ...PICTURES.map(picture => pageSource('place', viewFor(picture, {spots}), BRAND_RULE.duskSeconds)),
    ...['yard', 'start', 'loaded'].map(name => job2(name)),
  ];
}

export async function run(context) {
  await context.command('Emulation.setDeviceMetricsOverride', {width: 1280, height: 720, deviceScaleFactor: 1, mobile: false});
  const report = {card: 'OPEN-LOOK-BUS-RING', round: 1, site: SITE, quality: 'performance', budget: BUS_RING_BUDGET, radius: BUS_RING_LAYOUT.radius, pictures: [], failures: []};
  const persist = () => writeFile(join(context.outputDir, 'look-bus-ring.json'), JSON.stringify(report, null, 2) + '\n');
  try {
    const seconds = weldMoment();
    report.weld = {seconds, strength: busRingWeld(seconds)};
    report.road = roadView();
    await context.navigate('/tools/menu-check.html?flags=hidden-road,story-everburn,warlord-cards,scablands-realism,story-choices&harness=look-bus-ring&open-look-stand=1');
    await context.waitFor(pageSource('ready'), 'memory-only menu with the look stand', 90000);
    await context.evaluate(pageSource('prepare'));
    await context.waitFor(job2('yard'), 'yard', 90000);
    await context.evaluate(job2('start'));
    await context.evaluate('window.__qaApp.advance(4)');
    await context.waitFor(job2('loaded'), 'Light the Town and the Scablands art', 120000);
    await context.evaluate(pageSource('hideInterface'));
    let standing = null, duskSet = false;
    for (const picture of PICTURES) {
      const row = {name: picture.name, stage: picture.stage, extra: picture.extra === true};
      if (standing?.stage !== picture.stage) { standing = await context.evaluate(pageSource('stand', picture.stage, seconds)); standing.stage = picture.stage; row.stood = {at: standing.at, land: standing.land, landFall: standing.landFall}; report.landFall = standing.landFall; }
      const view = viewFor(picture, standing);
      row.view = view;
      row.camera = await context.evaluate(pageSource('place', view, BRAND_RULE.duskSeconds));
      await context.evaluate('(() => window.__qaApp.advance(1.5))()');
      if (view.dusk && !duskSet) {
        await context.evaluate(pageSource('startDuskBlend'));
        await context.waitFor(pageSource('settled'), 'dusk sky over the ridge', 180000);
        duskSet = true;
      } else await new Promise(done => setTimeout(done, 3200));
      await context.evaluate(pageSource('place', view, BRAND_RULE.duskSeconds));
      await new Promise(done => setTimeout(done, 400));
      row.picture = await context.screenshot('look-bus-ring-' + picture.name);
      row.cost = await context.evaluate(pageSource('measure'));
      if (row.cost.draws > BUS_RING_BUDGET.draws || row.cost.triangles > BUS_RING_BUDGET.triangles) report.failures.push(picture.name + ' is over the budget: ' + JSON.stringify(row.cost));
      if (view.dusk && row.cost.evening !== '1.00') report.failures.push(picture.name + ' was not taken at dusk: evening ' + row.cost.evening);
      report.pictures.push(row);
      console.log(JSON.stringify({picture: picture.name, ...row.cost}));
    }
    await persist();
    if (report.failures.length) throw Error(report.failures.join('; '));
  } catch (error) {
    report.failure = error.message; await persist(); throw error;
  }
}
