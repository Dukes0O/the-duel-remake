// OPEN-LOOK-RADIO-HILL, rounds 1 and 2: the pictures by which Claude judges Radio Hill. Not a frame check and not a test of any rule.
//
// It enters Light the Town (the job that has an evening) on a memory-only player, stands Radio Hill at its position for the land's
// seed 0 (`land.at('tin-town', -2245, -992)`, the first of OPEN-SITES' three, on the mesa north-west of Tin Town's east road)
// through tools/open-look-stand.js, and takes the card's pictures. Each file is `look-radio-hill-<name>.png`:
//   camp-far          from the East Road at about 1.4 km (the distance the mast is read from), at dusk, at car height
//   camp-far-day      the same by day (round 2: the mast is the tell by day and at dusk)
//   camp-edge         from `car-stop`, at eye height (1.6 m)
//   camp-door         on foot, in front of the hut's door, looking in at the set
//   camp-yard         on foot, from Hetty's lookout back across the camp to the hut and the mast
//   camp-night        from 50 m south of the camp at night, eye height: the red lamp lit and the light in the hut
//   second-set-edge, second-set-door   the same views with the second set and its aerial
// and three more than the cards ask for: `camp-mast` (from the foot of the mast up the lattice to the lamp), `camp-night-far` (the
// red lamp from the East Road at night, which is how the storyline's bearing is given) and `camp-night-door` (round 2: from 10 m in
// front of the hut at night, the light through the door and the window falling on the ground).
//
// The browser uses memory-only storage. The land's own light is turned down for the night pictures by the stand; that is a
// stand-in for the night the card which places the site will bring.
import {writeFile} from 'node:fs/promises';
import {join} from 'node:path';
import {LAND} from '../../src/world/scablands-names.js';
import {scablandsSurfaceHeightAt} from '../../src/world/scablands-ground.js';
import {ROAD_NET} from '../../src/world/scablands-road.js';
import {sees} from '../../src/world/scablands-ways.js';
import {RADIO_HILL_BUDGET, RADIO_HILL_LAYOUT} from '../../src/world/open/looks/radio-hill-look.js';
import {BRAND_RULE} from '../../src/world/jobs/brand-rule.js';
import {pageSource as job2} from './everburn-job2.mjs';

export const SITE = Object.freeze({x: LAND.at('tin-town', -2245, -992).x, z: LAND.at('tin-town', -2245, -992).z});
const EYE = 1.6, CAR_HEIGHT = 1.2, TELL = 1400;

// Where the far pictures are taken from: on the nearest road, at the point nearest the distance the tell is read from without
// passing it (the camp is not drawn beyond it), walked in steps of 5 m. The point must be on the open road, level with the land 15 m
// either side (not on the bridge where the East Road crosses a wash at about 1.35 to 1.47 km), and see the top of the mast.
export function roadView() {
  let nearest = null;
  for (const road of ROAD_NET.roads) for (const point of road.points) {
    const distance = Math.hypot(point.x - SITE.x, point.z - SITE.z);
    if (!nearest || distance < nearest.distance) nearest = {road: road.id, distance};
  }
  const road = ROAD_NET.roads.find(row => row.id === nearest.road), mast = RADIO_HILL_LAYOUT.mast.height;
  let best = null;
  for (let index = 0; index < road.points.length - 1; index++) {
    const a = road.points[index], b = road.points[index + 1], length = Math.hypot(b.x - a.x, b.z - a.z), steps = Math.max(1, Math.ceil(length / 5));
    const nx = -(b.z - a.z) / length, nz = (b.x - a.x) / length;
    for (let step = 0; step < steps; step++) {
      const x = a.x + (b.x - a.x) * step / steps, z = a.z + (b.z - a.z) * step / steps, distance = Math.hypot(x - SITE.x, z - SITE.z);
      if (distance > TELL || (best && distance <= best.distance)) continue;
      const y = scablandsSurfaceHeightAt(x, z);
      if ([-15, 15].some(off => Math.abs(scablandsSurfaceHeightAt(x + nx * off, z + nz * off) - y) > 2)) continue;
      if (!sees({x, z}, SITE, {heightAt: scablandsSurfaceHeightAt, eye: CAR_HEIGHT, target: mast, step: 2})) continue;
      best = {x, z, y, distance};
    }
  }
  return {road: road.id, ...best, nearest: nearest.distance};
}

// The views, in the land's own metres. `eye` and `look` are {x, z, up}: `up` is metres above the drawn ground there. `car` is where
// the player's car waits, out of the picture, so that the land is drawn finely round the camp.
export function views() {
  const {spots, things, hut} = RADIO_HILL_LAYOUT, at = (point, up = 0) => ({x: SITE.x + point.x, z: SITE.z + point.z, up});
  const road = roadView(), toSite = {x: (SITE.x - road.x) / road.distance, z: (SITE.z - road.z) / road.distance};
  const stop = spots['car-stop'], out = Math.hypot(stop.x, stop.z), parked = at({x: stop.x / out * (out + 12), z: stop.z / out * (out + 12)});
  const far = {eye: {x: road.x, z: road.z, y: road.y + CAR_HEIGHT}, look: {...at({x: 0, z: 0}), y: scablandsSurfaceHeightAt(SITE.x, SITE.z) + 13}, car: {x: road.x - toSite.x * 9, z: road.z - toSite.z * 9}, road: road.road, metres: Math.round(road.distance)};
  return {
    far: {...far, dusk: true},
    'far-day': far,
    edge: {eye: at(stop, EYE), look: at({x: -3.5, z: 2.5}, 3.2), car: parked},
    door: {eye: at({x: spots.door.x + .35, z: spots.door.z + 2.1}, EYE), look: at({x: things.table.x + .1, z: things.table.z}, .95), car: parked},
    yard: {eye: at({x: spots.lookout.x - .2, z: spots.lookout.z - .3}, EYE), look: at({x: -5.5, z: 1}, 4.5), car: parked},
    mast: {eye: at({x: 3.6, z: 4.2}, EYE), look: at({x: .2, z: -.1}, 15), car: parked},
    // Far enough back that the whole mast, its lamp and the hut are in the one picture.
    night: {eye: at({x: 14, z: 50}, EYE), look: at({x: -2.5, z: 2}, 10), car: {x: SITE.x + 20, z: SITE.z + 62}, dusk: true},
    'night-far': {...far, look: {...far.look, y: far.look.y + 5}, dusk: true},
    // Round 2: in front of the hut at night, to see the light through the door and the window falling on the ground.
    'night-door': {eye: at({x: spots.door.x + 4.5, z: spots.door.z + 9}, EYE), look: at({x: spots.door.x + .6, z: spots.door.z - .5}, 1), car: {x: SITE.x + 20, z: SITE.z + 62}, dusk: true},
    hut: {x: SITE.x + hut.x, z: SITE.z + hut.z},
  };
}

// `stand` is the stage the look stand is asked for: 'camp' and 'second-set' by day, 'dusk', and 'night' (the camp, its lamps lit).
export const PICTURES = Object.freeze([
  {name: 'camp-edge', stand: 'camp', view: 'edge'}, {name: 'camp-door', stand: 'camp', view: 'door'},
  {name: 'camp-yard', stand: 'camp', view: 'yard'}, {name: 'camp-mast', stand: 'camp', view: 'mast', extra: true},
  {name: 'camp-far-day', stand: 'camp', view: 'far-day'},
  {name: 'second-set-edge', stand: 'second-set', view: 'edge'}, {name: 'second-set-door', stand: 'second-set', view: 'door'},
  {name: 'camp-far', stand: 'dusk', view: 'far'},
  {name: 'camp-night', stand: 'night', view: 'night'}, {name: 'camp-night-far', stand: 'night', view: 'night-far', extra: true},
  {name: 'camp-night-door', stand: 'night', view: 'night-door', extra: true},
]);

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
    const stood = await window.__openLookStand.stand('radio-hill', {stage, seconds});
    return {stage: stood.stage, at: stood.at, land: stood.land, landFall: stood.landFall, draws: stood.draws.length, triangles: stood.triangles, lights: stood.lights};
  },
  // Parks the car, sets the light and the camera for a view.
  place: (view, duskSeconds) => {
    const app = window.__qaApp, duel = app.duel, state = duel.state, course = duel.course, wrap = value => Math.atan2(Math.sin(value), Math.cos(value));
    let land = null;
    window.__render.scene.traverse(node => { if (node.name === 'The Scablands') land = node; });
    const pose = course.nearest(view.car.x, view.car.z);
    Object.assign(state, {s: pose.s, prevS: pose.s, lateral: pose.lateral, prevLateral: pose.lateral, speedMph: 0, yawVelocity: 0, pushVelocity: 0,
      headingError: wrap(Math.atan2(view.look.x - view.car.x, view.look.z - view.car.z) - course.at(pose.s).heading)});
    // Light the Town's own rule brings the evening on as its clock runs; here the clock is held at day or at dusk.
    Object.assign(state.arena.worldJob.job.stepState, {brandBriefed: true, brandsUsed: 1, brandElapsed: view.dusk ? duskSeconds : 0, dusk: view.dusk ? 1 : 0});
    const ground = (x, z) => land.userData.drawnGroundHeightAt(x, z);
    // A point is given either `up` from the drawn ground or at its own height `y`.
    const height = point => point.y ?? ground(point.x, point.z) + point.up;
    app.inspectionCamera = {position: [view.eye.x, height(view.eye), view.eye.z], target: [view.look.x, height(view.look), view.look.z]};
    window.__render.camera.position.fromArray(app.inspectionCamera.position);
    return {camera: app.inspectionCamera};
  },
  // What the camp costs in this view: the main scene drawn with it and without it, shadows off.
  measure: () => {
    const api = window.__render, renderer = api.renderer, group = api.scene.getObjectByName('Radio Hill');
    if (!group) throw Error('Radio Hill is not in the scene');
    const shadows = renderer.shadowMap.enabled, seen = group.visible;
    const draw = () => { renderer.info.reset(); renderer.render(api.scene, api.camera); return {draws: renderer.info.render.calls, triangles: renderer.info.render.triangles}; };
    try {
      renderer.shadowMap.enabled = false;
      group.visible = false; const without = draw();
      group.visible = true; const withCamp = draw();
      return {draws: withCamp.draws - without.draws, triangles: withCamp.triangles - without.triangles, evening: document.querySelector('#view3d')?.dataset.evening ?? null};
    } finally { renderer.shadowMap.enabled = shadows; group.visible = seen; }
  },
  startDuskBlend: () => {
    let previous = performance.now(), elapsed = 0;
    window.__radioHillDuskReady = false;
    function frame(now) {
      elapsed += Math.min(.05, (now - previous) / 1000);
      previous = now;
      if (elapsed >= 3) window.__radioHillDuskReady = true;
      else requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);
    return true;
  },
  settled: () => window.__radioHillDuskReady && document.querySelector('#view3d')?.dataset.evening === '1.00',
};
export function pageSource(name, ...args) {
  const fn = pageFunctions[name], source = `(${fn.toString()})(...${JSON.stringify(args)})`;
  new Function(`return ${source}`);
  return source;
}
// Every text this scenario can send to the page, for the Node check (tools/test-radio-hill-look.mjs).
export function pageSources() {
  const all = views();
  return [
    pageSource('ready'), pageSource('prepare'), pageSource('hideInterface'), pageSource('measure'), pageSource('startDuskBlend'), pageSource('settled'),
    ...PICTURES.flatMap(picture => [pageSource('stand', picture.stand, 7.3), pageSource('place', all[picture.view], BRAND_RULE.duskSeconds)]),
    ...['yard', 'start', 'loaded'].map(name => job2(name)),
  ];
}

export async function run(context) {
  await context.command('Emulation.setDeviceMetricsOverride', {width: 1280, height: 720, deviceScaleFactor: 1, mobile: false});
  const all = views();
  const report = {card: 'OPEN-LOOK-RADIO-HILL-2', round: 2, site: SITE, quality: 'performance', budget: RADIO_HILL_BUDGET,
    roadView: {road: all.far.road, metres: all.far.metres}, pictures: [], failures: []};
  const persist = () => writeFile(join(context.outputDir, 'look-radio-hill.json'), JSON.stringify(report, null, 2) + '\n');
  try {
    await context.navigate('/tools/menu-check.html?flags=hidden-road,story-everburn,warlord-cards,scablands-realism,story-choices&harness=look-radio-hill&open-look-stand=1');
    await context.waitFor(pageSource('ready'), 'memory-only menu with the look stand', 90000);
    await context.evaluate(pageSource('prepare'));
    await context.waitFor(job2('yard'), 'yard', 90000);
    await context.evaluate(job2('start'));
    await context.evaluate('window.__qaApp.advance(4)');
    await context.waitFor(job2('loaded'), 'Light the Town and the Scablands art', 120000);
    await context.evaluate(pageSource('hideInterface'));
    let standing = null, duskSet = false;
    for (const picture of PICTURES) {
      const view = all[picture.view], row = {name: picture.name, stand: picture.stand, view: picture.view, extra: picture.extra === true};
      if (standing !== picture.stand) { row.built = await context.evaluate(pageSource('stand', picture.stand, 7.3)); standing = picture.stand; report.landFall = row.built.landFall; }
      row.placed = await context.evaluate(pageSource('place', view, BRAND_RULE.duskSeconds));
      // Let the land draw itself finely round the car and the light settle, then set the view again and take the picture.
      await context.evaluate('(() => window.__qaApp.advance(1.5))()');
      if (view.dusk && !duskSet) {
        // The sky blends towards dusk one drawn frame at a time; a software renderer draws the long view slowly, so the blend
        // is run with the camera on the near view in front of the hut.
        await context.evaluate(pageSource('place', {...all.door, dusk: true}, BRAND_RULE.duskSeconds));
        await context.evaluate(pageSource('startDuskBlend'));
        await context.waitFor(pageSource('settled'), 'dusk sky over the East Road', 180000);
        duskSet = true;
      } else await new Promise(done => setTimeout(done, 3200));
      await context.evaluate(pageSource('place', view, BRAND_RULE.duskSeconds));
      await new Promise(done => setTimeout(done, 400));
      row.picture = await context.screenshot('look-radio-hill-' + picture.name);
      row.cost = await context.evaluate(pageSource('measure'));
      if (row.cost.draws > RADIO_HILL_BUDGET.draws || row.cost.triangles > RADIO_HILL_BUDGET.triangles) report.failures.push(picture.name + ' is over the budget: ' + JSON.stringify(row.cost));
      if (view.dusk && row.cost.evening !== '1.00') report.failures.push(picture.name + ' was not taken at dusk: evening ' + row.cost.evening);
      report.pictures.push(row);
      console.log(JSON.stringify({picture: picture.name, ...row.cost, built: row.built}));
    }
    await persist();
    if (report.failures.length) throw Error(report.failures.join('; '));
  } catch (error) {
    report.failure = error.message; await persist(); throw error;
  }
}
