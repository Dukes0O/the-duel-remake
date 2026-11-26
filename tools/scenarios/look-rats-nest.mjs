// OPEN-LOOK-RATS-NEST, round 1: the pictures by which Claude judges the Rats' Nest on the laptop. Not a frame check.
//
// It enters the Scablands by Hot Delivery, as tools/scenarios/scablands-things.mjs does, stands the site at its position in "Claude
// answers" of docs/board/cards/OPEN-SITES.md (`land.at('boneyard', -150, -900)`) through tools/open-look-stand.js, which also cuts
// the cutting into the land for the pictures, and takes the seven pictures the card names: `rim-north`, `rim-middle`, `rim-south`
// (each from its spot at eye height 1.6 m towards its `looksAt`, by day), `drain` (the drain's mouth from 10 m, by day), `far`
// (from 1.2 km to the west at car height, by day), `road-down` (from `road-top` at car height, at night) and `yard` (from
// `pen-gate` across the yard, at night). Each file is `look-rats-nest-<name>.png`. The browser uses memory-only storage.
import {writeFile} from 'node:fs/promises';
import {join} from 'node:path';
import {RATS_NEST_BUDGET, RATS_NEST_LAYOUT} from '../../src/world/open/looks/rats-nest-look.js';

export const PICTURES = Object.freeze([
  {name: 'rim-north', stage: 'day', from: 'rim-north', eye: 1.6},
  {name: 'rim-middle', stage: 'day', from: 'rim-middle', eye: 1.6},
  {name: 'rim-south', stage: 'day', from: 'rim-south', eye: 1.6},
  {name: 'drain', stage: 'day', from: 'drain-in', eye: 1.6, back: {x: -8.7, z: 1.5}},
  {name: 'far', stage: 'day', far: 1200, eye: 1.2},
  {name: 'road-down', stage: 'night', from: 'road-top', eye: 1.2},
  {name: 'yard', stage: 'night', from: 'pen-gate', eye: 1.6},
]);

// Every string this scenario sends to the page. tools/test-rats-nest-look.mjs proves that each one parses.
export const pageSource = {
  memoryMenu: () => '(() => window.__qaApp?.duel.state.status==="menu" && !!window.__render && !!window.__openLookStand)()',
  prepare: () => `(() => {
    const a = window.__qaApp;
    if (!window.name.startsWith('__duel_qa_tab_v2:') || !Object.getOwnPropertyDescriptor(window, 'localStorage')?.value) throw Error('Memory-only fixture required');
    a.audio.setMuted(true);
    a.profile = {...a.profile, wasteland: {...a.profile.wasteland, version: 1, discoveredGate: true}}; a._saveProfile();
    return true;
  })()`,
  click: selector => `(() => {
    const button = document.querySelector(${JSON.stringify(selector)});
    if (!button || button.hidden || button.disabled) throw Error('Missing ' + ${JSON.stringify(selector)});
    button.click(); return true;
  })()`,
  quality: quality => `(() => { const select = document.querySelector('#graphics-quality');
    select.value = ${JSON.stringify(quality)}; select.dispatchEvent(new Event('change', {bubbles: true})); return true; })()`,
  yard: () => '(() => window.__qaApp?.isYardHomeActive?.())()',
  wall: () => '(() => !!document.querySelector(".ember-wall"))()',
  noteRead: () => '(() => window.__qaApp.profile.story?.ember?.read===true)()',
  racing: () => '(() => window.__qaApp?.duel.state.arena?.mode==="world-job" && window.__qaApp.duel.state.status==="racing" && window.__qaApp.visualReady)()',
  landReady: () => `(() => {let root = null; window.__render.scene.traverse(n => {if (n.name === 'The Scablands') root = n;});
    return root?.userData.assetStatus === 'ready';})()`,
  // Only the 3D view is drawn in the pictures: the menu, the HUD, the captions and the rear view (which is not drawn once its
  // frame has no size) are hidden.
  hideScreens: () => `(() => { const style = document.createElement('style'); style.textContent = 'body *{visibility:hidden !important} canvas{visibility:visible !important} canvas.world-hud-minimap,.world-hud-minimap canvas{visibility:hidden !important} .rear-view-frame{display:none !important}'; document.head.appendChild(style); window.dispatchEvent(new Event('resize')); return true; })()`,
  stand: stage => `(async () => window.__openLookStand.stand('rats-nest', {stage: ${JSON.stringify(stage)}}))()`,
  // The car is put down out of the picture, so that the land near the camera is drawn in full, and the camera is set by hand.
  view: ({car, position, target}) => `(() => {
    const a = window.__qaApp, d = a.duel, s = d.state, car = ${JSON.stringify(car)}, pose = d.course.nearest(car.x, car.z);
    s.s = s.prevS = pose.s; s.lateral = s.prevLateral = pose.lateral; s.speedMph = 0; s.yawVelocity = 0; s.pushVelocity = 0; s.headingError = 0;
    s.arena.worldJob.job.stepState.ember = 100;
    a.inspectionCamera = {position: ${JSON.stringify(position)}, target: ${JSON.stringify(target)}};
    return true;
  })()`,
  advance: seconds => `(() => { window.__qaApp.advance(${Number(seconds)}); return true; })()`,
  // What the site itself costs, read from the scene: its draws, its triangles and its lights.
  count: () => `(() => {
    const group = window.__render.scene.getObjectByName("The Rats' Nest");
    if (!group) throw Error("The Rats' Nest is not in the scene");
    let draws = 0, triangles = 0, lights = 0;
    group.traverse(node => {
      if (node.isLight) lights++;
      if (!node.isMesh && !node.isPoints && !node.isLine) return;
      draws++; triangles += (node.geometry.index ? node.geometry.index.count : node.geometry.attributes.position.count) / 3;
    });
    return {draws, triangles, lights, stage: group.userData.stage};
  })()`,
};

// Where the camera stands and looks for a picture, and where the car waits, from what the stand gave back.
export function cameraFor(picture, stood) {
  const hollow = stood.spots['car-hollow'];
  if (picture.far) {
    const position = [stood.at.x - picture.far, 0, stood.at.z + 60];
    return {car: {x: position[0] - 14, z: position[2]}, position, target: [stood.at.x, stood.land + 22, stood.at.z], onLand: true};
  }
  const spot = stood.spots[picture.from], back = picture.back ?? {x: 0, z: 0};
  if (!spot?.looksAt) throw Error('The spot ' + picture.from + ' has nothing to look at');
  return {car: {x: hollow.x, z: hollow.z}, position: [spot.x + back.x, spot.y + picture.eye, spot.z + back.z],
    target: [spot.looksAt.x, spot.looksAt.y, spot.looksAt.z]};
}

async function enterLand(context) {
  await context.navigate('/tools/menu-check.html?flags=hidden-road,story-everburn,warlord-cards,story-choices&harness=look-rats-nest&open-look-stand=1');
  await context.waitFor(pageSource.memoryMenu(), 'memory-only menu with the look stand', 90000);
  await context.evaluate(pageSource.prepare());
  await context.evaluate(pageSource.quality('performance'));
  await context.evaluate(pageSource.click('#wasteland-visit'));
  await context.waitFor(pageSource.yard(), 'Scablands yard', 90000);
  await context.evaluate(pageSource.click('[data-action="yard-cards"]'));
  await context.waitFor(pageSource.wall(), 'Hollis note on the Story Wall', 30000);
  if (!await context.evaluate(pageSource.noteRead())) await context.evaluate(pageSource.click('[data-ember-step="read"]'));
  await context.waitFor(pageSource.noteRead(), 'Hollis note read');
  await context.evaluate(pageSource.click('[data-ember-step="hot-delivery"]'));
  await context.waitFor(pageSource.racing(), 'Hot Delivery racing', 120000);
  await context.waitFor(pageSource.landReady(), 'the Scablands art', 120000);
  await context.evaluate(pageSource.hideScreens());
}

export async function run(context) {
  await context.command('Emulation.setDeviceMetricsOverride', {width: 1280, height: 720, deviceScaleFactor: 1, mobile: false});
  const report = {card: 'OPEN-LOOK-RATS-NEST', round: 1, quality: 'performance', budget: RATS_NEST_BUDGET, radius: RATS_NEST_LAYOUT.radius,
    pictures: [], stages: {}, failures: []};
  const persist = () => writeFile(join(context.outputDir, 'look-rats-nest.json'), JSON.stringify(report, null, 2) + '\n');
  try {
    await enterLand(context);
    for (const stage of ['day', 'night']) {
      const stood = await context.evaluate(pageSource.stand(stage));
      report.site = {at: stood.at, land: stood.land, landFall: stood.landFall};
      const counted = await context.evaluate(pageSource.count());
      report.stages[stage] = counted;
      if (counted.draws > RATS_NEST_BUDGET.draws || counted.triangles > RATS_NEST_BUDGET.triangles)
        report.failures.push(`The ${stage} stage is over its budget: ${JSON.stringify(counted)}`);
      for (const picture of PICTURES.filter(row => row.stage === stage)) {
        const view = cameraFor(picture, stood);
        if (view.onLand) {
          // The far picture stands on the land itself: the page gives the ground's height there once the car is down.
          await context.evaluate(pageSource.view({...view, position: [view.position[0], stood.land + picture.eye, view.position[2]]}));
        } else await context.evaluate(pageSource.view(view));
        await context.evaluate(pageSource.advance(1.5));
        await new Promise(done => setTimeout(done, 2600));
        const file = await context.screenshot('look-rats-nest-' + picture.name);
        report.pictures.push({name: picture.name, stage, file, position: view.position, target: view.target});
        console.log(JSON.stringify({picture: picture.name, stage, ...counted}));
      }
    }
    await persist();
    if (report.failures.length) throw Error(report.failures.join('; '));
  } catch (error) {
    report.failure = error.message; await persist(); throw error;
  }
}
