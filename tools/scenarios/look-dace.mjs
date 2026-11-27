// OPEN-LOOK-DACE, rounds 1 and 2: the pictures by which Claude judges the things of Dace Goes Looking. Not a frame check and not a test
// of any rule.
//
// It enters Light the Town (the job that has an evening) on a memory-only player, stands each thing where the storyline puts it
// for the land's seed 0 through tools/open-look-stand.js, and takes the card's pictures. Each file is `look-dace-<name>.png`:
//   forge-day      Moss's pickup at the forge by day: the cover dropped, the bonnet up for the radiator, the flat tyre, eye height
//   gate-dusk      the pickup on the road outside the gate at dusk, its lamps lit and their light on the road, from the roadside
//   stones-car     the three Walker stones from a car 40 m off (1.2 m up)
//   deep-sign      the Deep Sign from where the car stops
//   hangar         the Hangar from in front of its open end
//   crows-step     the Crow's Step from where the car stops
// and more than the card asks for: `forge-covered` (the cover on and the tyre flat, from the side where the cover hangs loose), `forge-key` (the key on its
// nail), `roadside` (the pickup stopped with Rell's blanket on the aerial), `roadside-dusk` (the same at dusk from a car coming
// up the road, its lamps lit: round 2), `stones-near`, `tracks` (the ruts from behind, along
// the way he drove), `deep-sign-near` (the strainer), `hangar-side` (the roof coming down to the ground) and `crows-step-far`.
//
// The browser uses memory-only storage.
import {writeFile} from 'node:fs/promises';
import {join} from 'node:path';
import {DACE_PLACES as places} from '../../src/world/open/content/dace-goes-looking-places.js';
import {DACE_LOOK_BUDGET, DACE_STAND} from '../../src/world/open/looks/dace-goes-looking-look.js';
import {BRAND_RULE} from '../../src/world/jobs/brand-rule.js';
import {pageSource as job2} from './everburn-job2.mjs';
import {pageFunctions as hill} from './look-radio-hill.mjs';

const EYE = 1.6, CAR_HEIGHT = 1.2;
const way = Math.atan2(places.hill.x - places['his-tracks'].x, places.hill.z - places['his-tracks'].z), along = {x: Math.sin(way), z: Math.cos(way)};

// The pictures. `stand` and `stage` are what the look stand is asked for. `eye`, `look` and `car` are metres from the thing's own
// spot (x east, z south); `up` is metres above the drawn ground there. `car` is where the player's car waits, out of the picture.
export const PICTURES = Object.freeze([
  {name: 'forge-day', stand: 'dace-forge', stage: 'ready', eye: {x: 5.2, z: 6.6, up: EYE}, look: {x: .1, z: .8, up: 1.0}, car: {x: 14, z: 18}},
  {name: 'forge-covered', stand: 'dace-forge', stage: 'covered', eye: {x: -5.8, z: 1.6, up: EYE}, look: {x: 0, z: .3, up: 1.0}, car: {x: 14, z: 18}, extra: true},
  {name: 'forge-key', stand: 'dace-forge', stage: 'covered', eye: {x: -2.05, z: -.85, up: 1.55}, look: {x: -2.3, z: -1.75, up: 1.42}, car: {x: 14, z: 18}, extra: true},
  {name: 'roadside', stand: 'dace-roadside', stage: 'stopped', eye: {x: -6.4, z: 6.2, up: EYE}, look: {x: -.3, z: 1.1, up: 1.25}, car: {x: -16, z: 14}, extra: true},
  {name: 'stones-car', stand: 'dace-stones', stage: 'left', eye: {x: 28.3, z: 28.3, up: CAR_HEIGHT}, look: {x: 0, z: 0, up: .6}, car: {x: 36, z: 36}},
  {name: 'stones-near', stand: 'dace-stones', stage: 'left', eye: {x: 3.4, z: 4.2, up: 1.4}, look: {x: .2, z: -.6, up: .45}, car: {x: 16, z: 18}, extra: true},
  {name: 'tracks', stand: 'dace-tracks', stage: 'left', eye: {x: -along.x * 15 + along.z * 1.2, z: -along.z * 15 - along.x * 1.2, up: 1.5}, look: {x: along.x * 6, z: along.z * 6, up: 0}, car: {x: -along.x * 26, z: -along.z * 26}, extra: true},
  {name: 'deep-sign', stand: 'deep-sign', stage: 'found', eye: {x: 4.6, z: 5.4, up: EYE}, look: {x: -2.6, z: -2.4, up: .7}, car: {x: 14, z: 16}},
  {name: 'deep-sign-near', stand: 'deep-sign', stage: 'found', eye: {x: .5, z: 1.5, up: 1.35}, look: {x: -2.1, z: -1.25, up: .6}, car: {x: 14, z: 16}, extra: true},
  {name: 'hangar', stand: 'hangar', stage: 'found', eye: {x: 8, z: 14, up: EYE}, look: {x: 0, z: -14, up: 3.6}, car: {x: 20, z: 30}},
  {name: 'hangar-side', stand: 'hangar', stage: 'found', eye: {x: 32, z: -12, up: EYE}, look: {x: 0, z: -19, up: 3}, car: {x: 46, z: -6}, extra: true},
  {name: 'crows-step', stand: 'crows-step', stage: 'found', eye: {x: 5.2, z: 2.6, up: EYE}, look: {x: .2, z: -6.6, up: 2.1}, car: {x: 16, z: 14}},
  {name: 'crows-step-far', stand: 'crows-step', stage: 'found', eye: {x: -14, z: 12, up: EYE}, look: {x: -1, z: -6, up: 1.8}, car: {x: -22, z: 22}, extra: true},
  // Dusk last: the sky does not blend back to day between pictures.
  {name: 'roadside-dusk', stand: 'dace-roadside', stage: 'waiting', dusk: true, eye: {x: 9, z: 16, up: CAR_HEIGHT}, look: {x: -.4, z: 3.6, up: .6}, car: {x: 16, z: 30}, extra: true},
  {name: 'gate-dusk', stand: 'dace-gate', stage: 'leaving', dusk: true, eye: {x: 7.6, z: 14.6, up: 1.6}, look: {x: -.4, z: 3.6, up: .5}, car: {x: 14, z: 30}},
]);

// What a stood thing may cost: the pickup at the forge has its key beside it.
export function budgetFor(stand) {
  const B = DACE_LOOK_BUDGET, sum = (...rows) => ({draws: rows.reduce((n, row) => n + row.draws, 0), triangles: rows.reduce((n, row) => n + row.triangles, 0)});
  return stand === 'dace-forge' ? sum(B.pickup, B.key) : stand === 'dace-gate' || stand === 'dace-roadside' ? B.pickup :
    stand === 'dace-stones' ? B.stones : stand === 'dace-tracks' ? B.tracks : B[stand];
}
// A picture's view in the land's own metres, for the look stand's `place`.
export function viewOf(picture, landSeed = 0) {
  const at = DACE_STAND[picture.stand].at(landSeed), point = spot => ({x: at.x + spot.x, z: at.z + spot.z, up: spot.up});
  return {eye: point(picture.eye), look: point(picture.look), car: point(picture.car), dusk: picture.dusk === true};
}

// ---- What runs in the page. Each is sent as text; `pageSource` proves that the text parses. ----
export const pageFunctions = {
  ready: hill.ready, prepare: hill.prepare, hideInterface: hill.hideInterface, place: hill.place, startDuskBlend: hill.startDuskBlend, settled: hill.settled,
  stand: async (name, stage, seconds) => {
    const stood = await window.__openLookStand.stand(name, {stage, seconds});
    return {name: stood.name, stage: stood.stage, at: stood.at, land: stood.land, landFall: stood.landFall, draws: stood.draws.length, triangles: Math.round(stood.triangles)};
  },
  // What the stood thing costs in this view: the main scene drawn with it and without it, shadows off.
  measure: name => {
    const api = window.__render, renderer = api.renderer, group = api.scene.getObjectByName('Dace look stand: ' + name);
    if (!group) throw Error(name + ' is not in the scene');
    const shadows = renderer.shadowMap.enabled, seen = group.visible;
    const draw = () => { renderer.info.reset(); renderer.render(api.scene, api.camera); return {draws: renderer.info.render.calls, triangles: renderer.info.render.triangles}; };
    try {
      renderer.shadowMap.enabled = false;
      group.visible = false; const without = draw();
      group.visible = true; const withThing = draw();
      return {draws: withThing.draws - without.draws, triangles: withThing.triangles - without.triangles, evening: document.querySelector('#view3d')?.dataset.evening ?? null};
    } finally { renderer.shadowMap.enabled = shadows; group.visible = seen; }
  },
};
export function pageSource(name, ...args) {
  const fn = pageFunctions[name], source = `(${fn.toString()})(...${JSON.stringify(args)})`;
  new Function(`return ${source}`);
  return source;
}
// Every text this scenario can send to the page, for the Node check (tools/test-dace-look.mjs).
export function pageSources() {
  return [
    pageSource('ready'), pageSource('prepare'), pageSource('hideInterface'), pageSource('startDuskBlend'), pageSource('settled'),
    ...PICTURES.flatMap(picture => [pageSource('stand', picture.stand, picture.stage, 7.3), pageSource('place', viewOf(picture), BRAND_RULE.duskSeconds), pageSource('measure', picture.stand)]),
    ...['yard', 'start', 'loaded'].map(name => job2(name)),
  ];
}

export async function run(context) {
  await context.command('Emulation.setDeviceMetricsOverride', {width: 1280, height: 720, deviceScaleFactor: 1, mobile: false});
  const report = {card: 'OPEN-LOOK-DACE', round: 2, quality: 'performance', budget: DACE_LOOK_BUDGET, pictures: [], failures: []};
  const persist = () => writeFile(join(context.outputDir, 'look-dace.json'), JSON.stringify(report, null, 2) + '\n');
  try {
    await context.navigate('/tools/menu-check.html?flags=hidden-road,story-everburn,warlord-cards,scablands-realism,story-choices&harness=look-dace&open-look-stand=1');
    await context.waitFor(pageSource('ready'), 'memory-only menu with the look stand', 90000);
    await context.evaluate(pageSource('prepare'));
    await context.waitFor(job2('yard'), 'yard', 90000);
    await context.evaluate(job2('start'));
    await context.evaluate('window.__qaApp.advance(4)');
    await context.waitFor(job2('loaded'), 'Light the Town and the Scablands art', 120000);
    await context.evaluate(pageSource('hideInterface'));
    let standing = null, duskSet = false;
    for (const picture of PICTURES) {
      const view = viewOf(picture), row = {name: picture.name, stand: picture.stand, stage: picture.stage, extra: picture.extra === true};
      if (standing !== picture.stand + '/' + picture.stage) { row.built = await context.evaluate(pageSource('stand', picture.stand, picture.stage, 7.3)); standing = picture.stand + '/' + picture.stage; }
      row.placed = await context.evaluate(pageSource('place', view, BRAND_RULE.duskSeconds));
      // Let the land draw itself finely round the car and the light settle, then set the view again and take the picture.
      await context.evaluate('(() => window.__qaApp.advance(1.5))()');
      if (view.dusk && !duskSet) {
        await context.evaluate(pageSource('startDuskBlend'));
        await context.waitFor(pageSource('settled'), 'dusk sky over the gate', 180000);
        duskSet = true;
      } else await new Promise(done => setTimeout(done, 3200));
      await context.evaluate(pageSource('place', view, BRAND_RULE.duskSeconds));
      await new Promise(done => setTimeout(done, 400));
      row.picture = await context.screenshot('look-dace-' + picture.name);
      row.cost = await context.evaluate(pageSource('measure', picture.stand));
      const budget = budgetFor(picture.stand);
      if (row.cost.draws > budget.draws || row.cost.triangles > budget.triangles) report.failures.push(picture.name + ' is over the budget: ' + JSON.stringify(row.cost));
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
