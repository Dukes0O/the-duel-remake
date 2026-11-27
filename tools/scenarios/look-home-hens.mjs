// HOME-GROUND-LOOK-1: the pictures by which Claude judges Home Ground's hens, nest box, tin coop and egg. Not a frame check and not
// a test of any rule: these parts have no rules yet (step 2 gives them their place and the hens their laying).
//
// It enters Light the Town (the job that has an evening) on a memory-only player, with the switches story-choices and home-ground
// on, stands the hens through tools/open-look-stand.js on his ground beside Tin Town (HOME_HENS_STAND from the ground's corner,
// inside a fence drawn by step 1's own code), and takes the card's pictures. Each file is `look-home-hens-<name>.png`:
//   coop-day       the coop and the nest box on his ground from the lane, at eye height (1.6 m), by day
//   coop-dusk      the same at dusk
//   hen-far        hen A from 10 m at eye height: she must read as a hen
//   hen-near       hen A from 2 m at eye height: she must read as one of his, leg band and all
//   nest-sit       hen B sitting in the crate nest box, from 1.4 m
//   egg-in-box     the nest box once she has laid: the brown egg in the straw, from 1.1 m, eye at 0.95 m (he bends to look)
// and two more than the card asks for: `coop-door` (the pop door, its ramp and the egg he set down by it) and `coop-back` (the
// coop's far corner and his own door on the east end).
import {writeFile} from 'node:fs/promises';
import {join} from 'node:path';
import {HOME_CORNER} from '../../src/world/open/content/home-ground.js';
import {HOME_HENS_BUDGET, HOME_HENS_LAYOUT, HOME_HENS_STAND} from '../../src/world/open/looks/home-hens-look.js';
import {BRAND_RULE} from '../../src/world/jobs/brand-rule.js';
import {pageSource as job2} from './everburn-job2.mjs';

export const SITE = Object.freeze({x: HOME_CORNER.x + HOME_HENS_STAND.x, z: HOME_CORNER.z + HOME_HENS_STAND.z});
const EYE = 1.6;

// The views, in the land's own metres. `eye` and `look` are {x, z, up}: `up` is metres above the drawn ground there. `car` is where
// the player's car waits, out of the picture, so that the land is drawn finely round the ground.
export function views() {
  const {henA, nest} = HOME_HENS_LAYOUT, at = (point, up = 0) => ({x: SITE.x + point.x, z: SITE.z + point.z, up});
  // The car waits west of his ground, behind every camera.
  const car = {x: HOME_CORNER.x - 18, z: SITE.z};
  const lane = {eye: at({x: -9, z: -4}, EYE), look: at({x: -.4, z: .5}, .75), car};
  return {
    coop: lane,
    'coop-dusk': {...lane, dusk: true},
    'hen-far': {eye: at({x: henA.x - 9.5, z: henA.z - 3}, EYE), look: at(henA, .2), car},
    'hen-near': {eye: at({x: henA.x - 1.7, z: henA.z - .9}, EYE), look: at(henA, .2), car},
    'nest-sit': {eye: at({x: nest.x - 1.35, z: nest.z + .35}, EYE), look: at(nest, .4), car},
    'egg-in-box': {eye: at({x: nest.x - 1.05, z: nest.z - .3}, .95), look: at({x: nest.x, z: nest.z + .05}, .3), car},
    'coop-door': {eye: at({x: -2.9, z: -.9}, 1.3), look: at({x: -.9, z: -.45}, .45), car},
    'coop-back': {eye: at({x: 4.2, z: 4.6}, 1.8), look: at({x: 0, z: 0}, .8), car},
    // Hen A from her side at 1.2 m, eye at 0.6 m (he crouches to look at her), to judge her shape against the photographs.
    'hen-side': {eye: at({x: henA.x + .6, z: henA.z - 1.05}, .6), look: at(henA, .2), car},
  };
}

// `stand` is the stage the look stand is asked for; `seconds` the moment of the hens' poses.
export const PICTURES = Object.freeze([
  {name: 'coop-day', stand: 'day', view: 'coop', seconds: 7.3},
  {name: 'hen-far', stand: 'day', view: 'hen-far', seconds: 7.3},
  {name: 'hen-near', stand: 'day', view: 'hen-near', seconds: 7.5},
  {name: 'hen-side', stand: 'day', view: 'hen-side', seconds: 9.0, extra: true},
  {name: 'nest-sit', stand: 'day', view: 'nest-sit', seconds: 7.3},
  {name: 'egg-in-box', stand: 'laid', view: 'egg-in-box', seconds: 7.3},
  {name: 'coop-door', stand: 'laid', view: 'coop-door', seconds: 8.9, extra: true},
  {name: 'coop-back', stand: 'laid', view: 'coop-back', seconds: 7.3, extra: true},
  {name: 'coop-dusk', stand: 'day', view: 'coop-dusk', seconds: 7.3},
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
    const stood = await window.__openLookStand.stand('home-hens', {stage, seconds});
    return {stage: stood.stage, at: stood.at, land: stood.land, landFall: stood.landFall, draws: stood.draws, triangles: stood.triangles};
  },
  pose: seconds => window.__openLookStand.at(seconds),
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
    const height = point => point.y ?? ground(point.x, point.z) + point.up;
    app.inspectionCamera = {position: [view.eye.x, height(view.eye), view.eye.z], target: [view.look.x, height(view.look), view.look.z]};
    window.__render.camera.position.fromArray(app.inspectionCamera.position);
    return {camera: app.inspectionCamera};
  },
  // What the hens, the crate, the coop and the eggs cost in this view: the main scene drawn with them and without them, the fence
  // (step 1's, already timed) hidden both times, shadows off.
  measure: () => {
    const api = window.__render, renderer = api.renderer, group = api.scene.getObjectByName('Home hens');
    if (!group) throw Error('The hens are not in the scene');
    // The fence's drawing shows its own group on every frame, so its parts are hidden one by one.
    const fence = group.getObjectByName('home-ground'), shadows = renderer.shadowMap.enabled, seen = group.visible;
    const fenceParts = fence ? fence.children.map(child => [child, child.visible]) : [];
    const draw = () => { renderer.info.reset(); renderer.render(api.scene, api.camera); return {draws: renderer.info.render.calls, triangles: renderer.info.render.triangles}; };
    try {
      renderer.shadowMap.enabled = false;
      for (const [child] of fenceParts) child.visible = false;
      group.visible = false; const without = draw();
      group.visible = true; const withHens = draw();
      return {draws: withHens.draws - without.draws, triangles: withHens.triangles - without.triangles, evening: document.querySelector('#view3d')?.dataset.evening ?? null};
    } finally { renderer.shadowMap.enabled = shadows; group.visible = seen; for (const [child, shown] of fenceParts) child.visible = shown; }
  },
  startDuskBlend: () => {
    let previous = performance.now(), elapsed = 0;
    window.__homeHensDuskReady = false;
    function frame(now) {
      elapsed += Math.min(.05, (now - previous) / 1000);
      previous = now;
      if (elapsed >= 3) window.__homeHensDuskReady = true;
      else requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);
    return true;
  },
  settled: () => window.__homeHensDuskReady && document.querySelector('#view3d')?.dataset.evening === '1.00',
};
export function pageSource(name, ...args) {
  const fn = pageFunctions[name], source = `(${fn.toString()})(...${JSON.stringify(args)})`;
  new Function(`return ${source}`);
  return source;
}
// Every text this scenario can send to the page, for the Node check (tools/test-home-hens-look.mjs).
export function pageSources() {
  const all = views();
  return [
    pageSource('ready'), pageSource('prepare'), pageSource('hideInterface'), pageSource('measure'), pageSource('startDuskBlend'), pageSource('settled'),
    ...PICTURES.flatMap(picture => [pageSource('stand', picture.stand, picture.seconds), pageSource('pose', picture.seconds),
      pageSource('place', all[picture.view], BRAND_RULE.duskSeconds)]),
    ...['yard', 'start', 'loaded'].map(name => job2(name)),
  ];
}

export async function run(context) {
  await context.command('Emulation.setDeviceMetricsOverride', {width: 1280, height: 720, deviceScaleFactor: 1, mobile: false});
  const all = views();
  const report = {card: 'HOME-GROUND-LOOK-1', round: Number(process.env.HOME_HENS_ROUND ?? 1), site: SITE, quality: 'performance', budget: HOME_HENS_BUDGET, pictures: [], failures: []};
  const persist = () => writeFile(join(context.outputDir, 'look-home-hens.json'), JSON.stringify(report, null, 2) + '\n');
  try {
    await context.navigate('/tools/menu-check.html?flags=hidden-road,story-everburn,warlord-cards,scablands-realism,story-choices,home-ground&harness=look-home-hens&open-look-stand=1');
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
      if (standing !== picture.stand) { row.built = await context.evaluate(pageSource('stand', picture.stand, picture.seconds)); standing = picture.stand; report.landFall = row.built.landFall; }
      await context.evaluate(pageSource('pose', picture.seconds));
      row.placed = await context.evaluate(pageSource('place', view, BRAND_RULE.duskSeconds));
      // Let the land draw itself finely round the car and the light settle, then set the view again and take the picture.
      await context.evaluate('(() => window.__qaApp.advance(1.5))()');
      if (view.dusk && !duskSet) {
        await context.evaluate(pageSource('startDuskBlend'));
        await context.waitFor(pageSource('settled'), 'dusk over his ground', 180000);
        duskSet = true;
      } else await new Promise(done => setTimeout(done, 3200));
      await context.evaluate(pageSource('place', view, BRAND_RULE.duskSeconds));
      await new Promise(done => setTimeout(done, 400));
      row.picture = await context.screenshot('look-home-hens-' + picture.name);
      row.cost = await context.evaluate(pageSource('measure'));
      if (row.cost.draws > HOME_HENS_BUDGET.draws || row.cost.triangles > HOME_HENS_BUDGET.triangles) report.failures.push(picture.name + ' is over the budget: ' + JSON.stringify(row.cost));
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
