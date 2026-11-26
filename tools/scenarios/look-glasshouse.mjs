// OPEN-LOOK-GLASSHOUSE: stands the Glasshouse in the Scablands at its first position (OPEN-SITES, "Claude answers":
// `land.at('ships-in-sand', 2000, 700)`) and takes the card's pictures for Claude's look review. Laptop only.
// The browser uses memory-only storage. This is a guide for the eye, not a frame check and not a test of any rule.
//
// The pictures, by name (each file is `look-glasshouse-<name>.png`):
//   camp-far, camp-edge, camp-rows, camp-pump          the camp whole
//   burned-far, burned-edge, burned-rows, burned-pump  burned, with `fresh: true`
//   burned-clues                                       down the track from `ruts` towards `tracks-away`
// and two more than the card asks for, so that both of the camp's tells and the cold camp can be judged:
//   camp-glint                                         by day, from 250 m, where the sun is thrown by the upright screens
//   cold-clues                                         the same view as burned-clues with `fresh: false`
// `far` is from the nearest road at dusk and car height; `edge` from `car-stop` at eye height (1.6 m); `rows` on foot
// between two rows; `pump` from 8 m.
//
// How the camp gets into the page: nothing in the game draws a site yet (OPEN-SITES will), and the page gives a scenario no
// way to load a file of the game by name. So the scenario bundles the look file itself, as tollkeeper.mjs bundles its
// helpers, loads it into the page as a module of its own, builds the group there and adds it to the Scablands' own group.
// The bundle carries its own copy of Three.js (only the parts the look uses); the page's renderer draws its meshes as it
// draws any others. OPEN-SITES will load the look in the game's own bundle, and then this way in can go.
import {build} from 'vite';
import {writeFile} from 'node:fs/promises';
import {join, resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {LAND} from '../../src/world/scablands-names.js';
import {ROAD_NET} from '../../src/world/scablands-road.js';
import {GLASSHOUSE_LAYOUT, GLASSHOUSE_BUDGET} from '../../src/world/open/looks/glasshouse-look.js';
import {BRAND_RULE} from '../../src/world/jobs/brand-rule.js';
import {pageSource as job2} from './everburn-job2.mjs';

const root = resolve(fileURLToPath(new URL('../../', import.meta.url)));
export const SITE = Object.freeze({x: LAND.at('ships-in-sand', 2000, 700).x, z: LAND.at('ships-in-sand', 2000, 700).z});
const EYE = 1.6, CAR_HEIGHT = 1.2;

// The look file as one module of plain text, for the page to load.
export async function lookBundle() {
  const entry = resolve(root, '.qa-dist/look-glasshouse-entry.virtual.js');
  const result = await build({root, configFile: false, logLevel: 'silent', plugins: [{
    name: 'look-glasshouse-fixture',
    resolveId: id => id === entry ? '\0look-glasshouse-fixture' : null,
    load: id => id === '\0look-glasshouse-fixture'
      ? `export {buildGlasshouse, updateGlasshouse, glasshouseGlint, GLASSHOUSE_LAYOUT} from ${JSON.stringify(resolve(root, 'src/world/open/looks/glasshouse-look.js'))};` : null,
  }], build: {write: false, minify: false, lib: {entry, name: 'LookGlasshouse', formats: ['es']}}});
  const output = Array.isArray(result) ? result[0].output : result.output;
  return output.find(item => item.type === 'chunk').code;
}

// The point of the road net nearest the site.
export function nearestRoadPoint(site = SITE) {
  let best = null;
  for (const road of ROAD_NET.roads) for (let index = 0; index < road.points.length - 1; index++) {
    const a = road.points[index], b = road.points[index + 1], dx = b.x - a.x, dz = b.z - a.z;
    const t = Math.max(0, Math.min(1, ((site.x - a.x) * dx + (site.z - a.z) * dz) / (dx * dx + dz * dz || 1)));
    const x = a.x + dx * t, z = a.z + dz * t, distance = Math.hypot(site.x - x, site.z - z);
    if (!best || distance < best.distance) best = {road: road.id, x, z, distance};
  }
  return best;
}

// The views, in the land's own metres. `eye` and `look` are {x, z, up}: `up` is metres above the drawn ground there. `car`
// is where the player's car is parked, so that the land is drawn finely round the camp and the car is out of the picture.
export function views() {
  const {spots, things, rows} = GLASSHOUSE_LAYOUT, at = (point, up = 0) => ({x: SITE.x + point.x, z: SITE.z + point.z, up});
  const road = nearestRoadPoint(), toSite = {x: (SITE.x - road.x) / road.distance, z: (SITE.z - road.z) / road.distance};
  const stop = spots['car-stop'], out = Math.hypot(stop.x, stop.z), parked = at({x: stop.x / out * (out + 9), z: stop.z / out * (out + 9)});
  const path = (rows[2].z + rows[3].z) / 2;
  return {
    far: {dusk: true, eye: {x: road.x, z: road.z, up: CAR_HEIGHT}, look: at({x: 0, z: 0}, 3), car: {x: road.x - toSite.x * 9, z: road.z - toSite.z * 9}, road: road.road, metres: Math.round(road.distance)},
    edge: {eye: at(stop, EYE), look: at({x: 2, z: -2}, 1.4), car: parked},
    rows: {eye: at({x: rows[2].x0 + .4, z: path}, EYE), look: at({x: rows[2].x1, z: path - .4}, .7), car: parked},
    // From up the wind, so that the wheel is seen nearly face on.
    pump: {eye: at({x: things.pump.x - 7.7, z: things.pump.z - 1.7}, EYE), look: at(things.pump, 3.1), car: parked},
    clues: {eye: at(spots.ruts, EYE), look: at(spots['tracks-away'], .3), car: parked},
  };
}
export const PICTURES = Object.freeze([
  {name: 'camp-far', stage: 'camp', fresh: true, view: 'far'}, {name: 'camp-edge', stage: 'camp', fresh: true, view: 'edge'},
  {name: 'camp-rows', stage: 'camp', fresh: true, view: 'rows'}, {name: 'camp-pump', stage: 'camp', fresh: true, view: 'pump'},
  {name: 'camp-glint', stage: 'camp', fresh: true, view: 'glint', extra: true},
  {name: 'burned-far', stage: 'burned', fresh: true, view: 'far'}, {name: 'burned-edge', stage: 'burned', fresh: true, view: 'edge'},
  {name: 'burned-rows', stage: 'burned', fresh: true, view: 'rows'}, {name: 'burned-pump', stage: 'burned', fresh: true, view: 'pump'},
  {name: 'burned-clues', stage: 'burned', fresh: true, view: 'clues'},
  {name: 'cold-clues', stage: 'burned', fresh: false, view: 'clues', extra: true},
]);

// ---- What runs in the page. Each is sent as text; `pageSource` proves that the text parses. ----
export const pageFunctions = {
  // Only the 3D view is drawn in the pictures: the menu, the HUD and the captions are hidden.
  hideInterface: () => {
    const style = document.createElement('style');
    style.textContent = 'body *{visibility:hidden !important} canvas{visibility:visible !important} canvas.world-hud-minimap,.world-hud-minimap canvas{visibility:hidden !important} .rear-view-frame{display:none !important}';
    document.head.appendChild(style);
    // The rear-view mirror is drawn into the main picture wherever its frame is; with no frame it measures again and stops.
    window.dispatchEvent(new Event('resize'));
    window.__qaApp.audio.setMuted(true);
    return true;
  },
  // Loads the look file's module once and keeps it.
  load: async source => {
    if (!window.__qaApp.duel.featureFlags.enabled('story-choices')) throw Error('The switch story-choices is off.');
    const url = URL.createObjectURL(new Blob([source], {type: 'text/javascript'}));
    // The bundle's own copy of Three.js would warn that it is the second in the page. It is meant to be: the page's mark
    // is put aside while the bundle loads, so that the runner's rule of no warnings still tells of any other.
    const mark = window.__THREE__;
    delete window.__THREE__;
    try { window.__lookGlasshouse = await import(url); } finally { URL.revokeObjectURL(url); window.__THREE__ = mark; }
    return Object.keys(window.__lookGlasshouse.GLASSHOUSE_LAYOUT.spots).length;
  },
  // Builds the camp at a stage and stands it in the Scablands, in place of whatever stage stood there before.
  stand: (site, stage, fresh) => {
    const look = window.__lookGlasshouse;
    let land = null;
    window.__render.scene.traverse(node => { if (node.name === 'The Scablands') land = node; });
    if (!land?.userData.drawnGroundHeightAt) throw Error('The Scablands and its drawn ground are missing.');
    const old = window.__glasshouseGroup;
    if (old) { old.parent?.remove(old); old.userData.dispose(); }
    const heightAt = (x, z) => land.userData.drawnGroundHeightAt(site.x + x, site.z + z);
    const group = look.buildGlasshouse({stage, fresh, heightAt});
    group.position.set(site.x, 0, site.z);
    land.add(group);
    window.__glasshouseGroup = group;
    // How flat the ground under the camp is, for the report.
    let low = Infinity, high = -Infinity;
    for (let x = -28; x <= 28; x += 4) for (let z = -28; z <= 28; z += 4) { const y = heightAt(x, z); low = Math.min(low, y); high = Math.max(high, y); }
    return {name: group.name, draws: group.userData.draws.length, triangles: group.userData.triangles, groundFall: high - low, groundAtCentre: heightAt(0, 0)};
  },
  // Parks the car, sets the light and the camera for a view, and moves the camp's parts to a fixed moment.
  place: (view, seconds, duskSeconds) => {
    const app = window.__qaApp, duel = app.duel, state = duel.state, course = duel.course, wrap = value => Math.atan2(Math.sin(value), Math.cos(value));
    let land = null, sun = null;
    window.__render.scene.traverse(node => { if (node.name === 'The Scablands') land = node; if (node.isDirectionalLight && node.castShadow) sun = node; });
    const pose = course.nearest(view.car.x, view.car.z);
    Object.assign(state, {s: pose.s, prevS: pose.s, lateral: pose.lateral, prevLateral: pose.lateral, speedMph: 0, yawVelocity: 0, pushVelocity: 0,
      headingError: wrap(Math.atan2(view.look.x - view.car.x, view.look.z - view.car.z) - course.at(pose.s).heading)});
    // Light the Town's own rule brings the evening on as its clock runs; here the clock is held at day or at dusk.
    Object.assign(state.arena.worldJob.job.stepState, {brandBriefed: true, brandsUsed: 1, brandElapsed: view.dusk ? duskSeconds : 0, dusk: view.dusk ? 1 : 0});
    const ground = (x, z) => land.userData.drawnGroundHeightAt(x, z);
    app.inspectionCamera = {position: [view.eye.x, ground(view.eye.x, view.eye.z) + view.eye.up, view.eye.z], target: [view.look.x, ground(view.look.x, view.look.z) + view.look.up, view.look.z]};
    const towardsSun = sun ? {x: sun.position.x - sun.target.position.x, y: sun.position.y - sun.target.position.y, z: sun.position.z - sun.target.position.z} : null;
    window.__lookGlasshouse.updateGlasshouse(window.__glasshouseGroup, seconds, towardsSun ? {sun: towardsSun} : {});
    return {camera: app.inspectionCamera, sun: towardsSun};
  },
  // Where to stand to see the glint, and when: 250 m out along the line on which the first upright screen that the sun
  // reaches throws it, at the moment that screen's flash is brightest. Null when the sun is down or behind every screen.
  glintView: site => {
    const look = window.__lookGlasshouse, glints = look.GLASSHOUSE_LAYOUT.glints;
    let sun = null;
    window.__render.scene.traverse(node => { if (node.isDirectionalLight && node.castShadow) sun = node; });
    if (!sun) return null;
    const s = {x: sun.position.x - sun.target.position.x, y: sun.position.y - sun.target.position.y, z: sun.position.z - sun.target.position.z};
    const far = Math.hypot(s.x, s.y, s.z); s.x /= far; s.y /= far; s.z /= far;
    for (const glint of glints) {
      const n = glint.normal, lit = n.x * s.x + n.y * s.y + n.z * s.z, mx = 2 * lit * n.x - s.x, mz = 2 * lit * n.z - s.z, flat = Math.hypot(mx, mz);
      if (lit < .1 || flat < .4) continue;
      const eye = {x: glint.x + mx / flat * 250, y: 1.3, z: glint.z + mz / flat * 250}, seconds = glint.period * (1 - glint.phase) + .13;
      const strengths = look.glasshouseGlint(s, eye, seconds);
      return {seconds, strengths, sun: s, view: {eye: {x: site.x + eye.x, z: site.z + eye.z, up: 1.3}, look: {x: site.x + glint.x, z: site.z + glint.z, up: 1},
        car: {x: site.x + eye.x + mx / flat * 9, z: site.z + eye.z + mz / flat * 9}}};
    }
    return {sun: s, view: null};
  },
  // What the camp costs in this view: the main scene drawn with it and without it, shadows off.
  measure: () => {
    const api = window.__render, renderer = api.renderer, group = window.__glasshouseGroup, shadows = renderer.shadowMap.enabled, seen = group.visible;
    const draw = () => { renderer.info.reset(); renderer.render(api.scene, api.camera); return {draws: renderer.info.render.calls, triangles: renderer.info.render.triangles}; };
    try {
      renderer.shadowMap.enabled = false;
      group.visible = false; const without = draw();
      group.visible = true; const withCamp = draw();
      return {draws: withCamp.draws - without.draws, triangles: withCamp.triangles - without.triangles, evening: document.querySelector('#view3d')?.dataset.evening ?? null};
    } finally { renderer.shadowMap.enabled = shadows; group.visible = seen; }
  },
  settled: () => window.__qaApp.visualReady === true,
};
export function pageSource(name, ...args) {
  const fn = pageFunctions[name], source = `(${fn.toString()})(...${JSON.stringify(args)})`;
  // An async function is a promise in the page; the harness waits for it.
  new Function(`return ${source}`);
  return source;
}
// Every text this scenario can send to the page, for the Node check (tools/test-glasshouse-look.mjs).
export function pageSources() {
  const all = views(), site = SITE;
  return [
    pageSource('hideInterface'), pageSource('load', 'export const GLASSHOUSE_LAYOUT = {spots: {}};'), pageSource('glintView', site), pageSource('measure'), pageSource('settled'),
    ...PICTURES.filter(picture => picture.view !== 'glint').flatMap(picture => [pageSource('stand', site, picture.stage, picture.fresh), pageSource('place', all[picture.view], 3.3, BRAND_RULE.duskSeconds)]),
    ...['ready', 'prepare', 'yard', 'start', 'loaded'].map(name => job2(name)),
  ];
}

export async function run(context) {
  await context.command('Emulation.setDeviceMetricsOverride', {width: 1280, height: 720, deviceScaleFactor: 1, mobile: false});
  const report = {card: 'OPEN-LOOK-GLASSHOUSE', site: SITE, quality: 'performance', budget: GLASSHOUSE_BUDGET, pictures: [], failures: []};
  const persist = () => writeFile(join(context.outputDir, 'look-glasshouse.json'), JSON.stringify(report, null, 2) + '\n');
  try {
    const source = await lookBundle(), all = views();
    report.nearestRoad = {road: all.far.road, metres: all.far.metres};
    // Light the Town is the job that has an evening, so the camp can be seen at dusk as well as by day.
    await context.navigate('/tools/menu-check.html?flags=hidden-road,story-everburn,warlord-cards,scablands-realism,story-choices&harness=look-glasshouse');
    await context.waitFor(job2('ready'), 'memory-only menu', 90000);
    await context.evaluate(job2('prepare'));
    await context.waitFor(job2('yard'), 'yard', 90000);
    await context.evaluate(job2('start'));
    await context.waitFor(job2('loaded'), 'Light the Town and the Scablands art', 120000);
    await context.evaluate(pageSource('hideInterface'));
    report.spots = await context.evaluate(pageSource('load', source));
    let standing = null;
    for (const picture of PICTURES) {
      const key = picture.stage + ':' + picture.fresh;
      const row = {name: picture.name, stage: picture.stage, fresh: picture.fresh, view: picture.view, extra: picture.extra === true};
      if (standing !== key) { row.built = await context.evaluate(pageSource('stand', SITE, picture.stage, picture.fresh)); standing = key; report.groundFall = row.built.groundFall; }
      let view = all[picture.view], seconds = 3.3;
      if (picture.view === 'glint') {
        const glint = await context.evaluate(pageSource('glintView', SITE));
        row.glint = glint;
        if (!glint?.view) { row.skipped = 'The sun does not reach an upright screen in this light.'; report.pictures.push(row); continue; }
        view = glint.view; seconds = glint.seconds;
      }
      row.placed = await context.evaluate(pageSource('place', view, seconds, BRAND_RULE.duskSeconds));
      // Let the land draw itself finely round the car and the light settle, then set the moment again and take the picture.
      await context.evaluate('(() => window.__qaApp.advance(1.5))()');
      await new Promise(done => setTimeout(done, 3200));
      await context.evaluate(pageSource('place', view, seconds, BRAND_RULE.duskSeconds));
      await new Promise(done => setTimeout(done, 400));
      row.picture = await context.screenshot('look-glasshouse-' + picture.name);
      row.cost = await context.evaluate(pageSource('measure'));
      if (row.cost.draws > GLASSHOUSE_BUDGET.draws || row.cost.triangles > GLASSHOUSE_BUDGET.triangles) report.failures.push(picture.name + ' is over the budget: ' + JSON.stringify(row.cost));
      if (view.dusk && row.cost.evening !== '1.00') report.failures.push(picture.name + ' was not taken at dusk: evening ' + row.cost.evening);
      report.pictures.push(row);
      console.log(JSON.stringify({picture: picture.name, ...row.cost, built: row.built}));
    }
    if (report.groundFall > 2) report.failures.push('The drawn ground falls ' + report.groundFall.toFixed(2) + ' m across the camp; OPEN-SITES allows 2 m.');
    await persist();
    if (report.failures.length) throw Error(report.failures.join('; '));
  } catch (error) {
    report.failure = error.message; await persist(); throw error;
  }
}
