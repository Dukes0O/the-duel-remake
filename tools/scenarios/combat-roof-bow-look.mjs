// COMBAT-ROOF-BOW-LOOK: the pictures by which Claude judges the roof crossbow drawn on every fighting car, and the town's
// road seen from a truck's cab. Look pictures only, never a frame check; the browser uses memory-only storage.
//
// For each car in CARS it starts a Wasteland race (the combat rig is on), stops the car on the road and takes
// `chase-<car>` (the game's own chase camera), `quarter-<car>` (5 m off the rear quarter, a little above the roof),
// `side-<car>` (square to the flank at roof height) and `front-<car>` (ahead of the bonnet, low), with the menu and the
// HUD hidden (ROOF_BOW_CARS=0 leaves the cars out and ROOF_BOW_TOWN=0 the town). Before each picture it reads where the bow falls in the chase picture against the windscreen's own box
// (src/combat-roof-bow.js names the parts) and the report lists those numbers. Then it drives the town (as
// tools/scenarios/town-world.mjs does) and takes `town-road-cab` (a truck's cab, 2.9 m, just outside the Dome's gate) and
// `town-road-hood` (the hood camera's 1.4 m, where the town's road once floated highest over the land), looking along the road.
import {writeFile} from 'node:fs/promises';
import {join} from 'node:path';
import {createTownWorld} from '../../src/town/town-world.js';
import {scablandsSurfaceHeightAt} from '../../src/world/scablands-ground.js';

export const CARS = Object.freeze(['falcone_f42', 'dusthawk_rally', 'banshee_muscle', 'titan_monster']);

const hideScreens = `(() => {
  if (!document.querySelector('#roof-bow-look-style')) {
    const style = document.createElement('style'); style.id = 'roof-bow-look-style';
    style.textContent = 'body *{visibility:hidden !important} canvas{visibility:visible !important} .world-hud-minimap canvas,canvas.world-hud-minimap{visibility:hidden !important} .rear-view-frame{display:none !important}';
    document.head.appendChild(style); window.dispatchEvent(new Event('resize'));
  }
  return true;
})()`;

// Where the camera stands for each picture, in the car's own metres (+Z forward, +Y up, origin on the ground).
const VIEWS = Object.freeze({
  quarter: {from: [-3.2, 1.0, -4.0], at: [0, 0, .4], lift: true},
  side: {from: [-5.2, .1, -.2], at: [0, 0, -.2], lift: true},
  front: {from: [2.6, .9, 6.5], at: [0, .6, 0], lift: false},
});

const stand = car => `(() => {
  const app = window.__qaApp;
  app.profile = {...app.profile, unlockedCars: [...new Set([...app.profile.unlockedCars, ${JSON.stringify(car)}])],
    wasteland: {...app.profile.wasteland, version: 1, discoveredGate: true}};
  app._saveProfile();
  app.inspectionCamera = null;
  app.setCamera('chase');
  if (!app.startCampaign({mode: 'wasteland', startStage: 0, car: ${JSON.stringify(car)}, opponentCount: 1, seed: 1989}))
    throw Error('Wasteland race did not start for ${car}');
  app.stop();
  const s = app.duel.state;
  Object.assign(s, {status: 'racing', countdown: 0, paused: false, s: 520, prevS: 520, lateral: 0, prevLateral: 0,
    speedMph: 0, traffic: []});
  for (const actor of s.opponents || []) Object.assign(actor, {s: -600, prevS: -600, speedMph: 0});
  s.combat.aiTimer = Infinity; s.combat.pickupTimer = Infinity;
  return true;
})()`;

// The bow's box and the windscreen's box on the screen, in pixels, from the game's camera as it stands.
const measure = `(() => {
  const scene = window.__render.scene, camera = window.__render.camera, canvas = window.__render.renderer.domElement;
  const bow = scene.getObjectByName('combat-bow-0');
  const vehicle = bow?.parent?.parent;
  if (!bow?.visible || !vehicle) throw Error('The player car carries no visible roof bow');
  vehicle.updateMatrixWorld(true);
  const box = object => {
    const out = {minX: Infinity, minY: Infinity, maxX: -Infinity, maxY: -Infinity}, v = new bow.position.constructor();
    object.traverse(node => {
      if (!node.isMesh || !node.visible) return;
      const p = node.geometry.attributes.position;
      for (let i = 0; i < p.count; i += Math.max(1, Math.floor(p.count / 400))) {
        v.fromBufferAttribute(p, i).applyMatrix4(node.matrixWorld).project(camera);
        const x = (v.x + 1) / 2 * canvas.clientWidth, y = (1 - v.y) / 2 * canvas.clientHeight;
        out.minX = Math.min(out.minX, x); out.maxX = Math.max(out.maxX, x); out.minY = Math.min(out.minY, y); out.maxY = Math.max(out.maxY, y);
      }
    });
    return Object.fromEntries(Object.entries(out).map(([k, n]) => [k, Math.round(n)]));
  };
  const size = vehicle.userData.size;
  const roof = new bow.position.constructor();
  bow.getWorldPosition(roof);
  return {car: vehicle.userData.vehicleKey, size, bow: box(bow), car2d: box(vehicle),
    bowLocal: (() => { const b = new (bow.position.constructor)(); const local = {min: [Infinity, Infinity, Infinity], max: [-Infinity, -Infinity, -Infinity]};
      bow.traverse(node => { if (!node.isMesh) return; const p = node.geometry.attributes.position;
        for (let i = 0; i < p.count; i++) { b.fromBufferAttribute(p, i).applyMatrix4(node.matrixWorld); vehicle.worldToLocal(b);
          ['x', 'y', 'z'].forEach((k, j) => { local.min[j] = Math.min(local.min[j], b[k]); local.max[j] = Math.max(local.max[j], b[k]); }); } });
      return {min: local.min.map(n => +n.toFixed(2)), max: local.max.map(n => +n.toFixed(2))}; })()};
})()`;

const drawOnce = '(() => { window.__render.renderFrame(); return true; })()';

const view = ({from, at, lift}) => `(() => {
  const app = window.__qaApp, scene = window.__render.scene;
  const vehicle = scene.getObjectByName('combat-bow-0').parent.parent;
  vehicle.updateMatrixWorld(true);
  const h = vehicle.userData.size.height, V = vehicle.position.constructor;
  const local = ([x, y, z]) => vehicle.localToWorld(new V(x, y + (${lift} ? h : 0), z)).toArray();
  app.inspectionCamera = {position: local(${JSON.stringify(from)}), target: local(${JSON.stringify(at)})};
  window.__render.renderFrame();
  return true;
})()`;

export async function run(context) {
  const report = {cars: [], town: null};
  await context.navigate('/tools/menu-check.html');
  await context.waitFor("!!window.__qaApp && !!window.__render && !document.querySelector('#start-engine').disabled && !!Object.getOwnPropertyDescriptor(window, 'localStorage')?.value",
    'memory-only menu and renderer', 60_000);
  await context.evaluate(`(() => { const app = window.__qaApp; app.audio.setMuted?.(true);
    if (!app.addPlayer('Roof bow look QA').ok) throw Error('Memory-only player required'); return true; })()`);
  for (const car of process.env.ROOF_BOW_CARS === '0' ? [] : CARS) {
    await context.evaluate(stand(car));
    await context.waitFor(`document.querySelector('#view3d')?.dataset.combatEffectsStatus === 'ready' && window.__qaApp.visualReady !== false`,
      `${car} drawn`, 60_000);
    await context.evaluate(hideScreens);
    // The chase camera eases its height over a few frames; draw them one call at a time (software drawing is slow).
    for (let i = 0; i < 12; i++) await context.evaluate(drawOnce);
    const chase = await context.evaluate(measure);
    await context.screenshot(`chase-${car.replaceAll('_', '-')}`);
    report.cars.push({car, chase});
    for (const [name, pose] of Object.entries(VIEWS)) {
      await context.evaluate(view(pose));
      await context.screenshot(`${name}-${car.replaceAll('_', '-')}`);
    }
  }
  if (process.env.ROOF_BOW_TOWN !== '0') report.town = await townRoad(context);
  await writeFile(join(context.outputDir, 'roof-bow.json'), JSON.stringify(report, null, 2) + '\n');
  console.log(JSON.stringify(report.cars.map(row => ({car: row.car, bow: row.chase.bow, car2d: row.chase.car2d, local: row.chase.bowLocal}))));
}

// The town's road from a truck's cab: 2.9 m over the road, looking along it, by day.
async function townRoad(context) {
  await context.navigate('/tools/menu-check.html?flags=wasteland-town');
  await context.waitFor('!!window.__qaApp', 'the game app', 90_000);
  await context.evaluate(`(() => {
    const app = window.__qaApp; app.audio.setMuted?.(true);
    app.addPlayer('Town road QA');
    app.profile = {...app.profile, wasteland: {version: 1, discoveredGate: true, scrap: 0, rank: 1}};
    app._saveProfile();
    if (!app.visitWasteland()) throw Error('Could not enter the Wasteland.');
    app.advance(8);
    return true;
  })()`);
  await context.waitFor(`window.__qaApp.isYardHomeActive() && !!document.querySelector('[data-action="yard-the-town"]')`, 'the yard');
  await context.evaluate(`document.querySelector('[data-action="yard-the-town"]').click()`);
  await context.waitFor('!!document.querySelector(".town-entry form")', 'the new town form');
  await context.evaluate(`(() => { const form = document.querySelector('.town-entry form'); form.querySelector('[name="name"]').value = 'Road town'; form.requestSubmit(); })()`);
  await context.waitFor('!!document.querySelector(".town-entry [data-town-action=drive]")', 'the town DRIVE button');
  await context.evaluate(`(() => {
    const host = document.querySelector('.town-entry');
    for (const [id, x, z] of [['town-hall', 15, -12], ['road-dirt', 19, -12], ['road-dirt', 19, -4], ['road-dirt', 19, 4], ['road-dirt', 19, 12]])
      if (!host.__townCommand({type: 'placeBuilding', buildingId: id, x, z})[0]?.ok) throw Error('Could not place ' + id);
    host.querySelector('[data-town-action="drive"]').click();
  })()`);
  await context.waitFor(`(() => { const a = window.__qaApp; return a.duel.state.arena?.worldJob?.definition?.kind === 'town-drive' && a.duel.state.status === 'racing'; })()`, 'the town drive', 90_000);
  await context.waitFor(`!!window.__render?.scene?.getObjectByName('Town roads, sites and buildings')?.children.length`, 'the town drawn', 90_000);
  await context.evaluate(hideScreens);
  // Two places on the road from the Dome's gate: just outside the gate at a truck's cab height, and where the old flat box floated
  // highest over the land, at the hood camera's height.
  const gateRoad = createTownWorld({seed: 1, buildings: []}).roads.find(road => road.id === 'old-road-gate-safe');
  const {a, b} = gateRoad, length = Math.hypot(b.x - a.x, b.z - a.z), dx = (b.x - a.x) / length, dz = (b.z - a.z) / length;
  const middle = scablandsSurfaceHeightAt((a.x + b.x) / 2, (a.z + b.z) / 2) + .04;
  let worst = {along: 0, gap: -Infinity};
  for (let along = 0; along <= length; along += 2) {
    const gap = middle - scablandsSurfaceHeightAt(a.x + dx * along, a.z + dz * along);
    if (gap > worst.gap) worst = {along, gap};
  }
  const pose = (along, eye) => {
    const x = a.x + dx * along, z = a.z + dz * along, ahead = along + 30;
    return {position: [x, scablandsSurfaceHeightAt(x, z) + eye, z],
      target: [a.x + dx * ahead, scablandsSurfaceHeightAt(a.x + dx * ahead, a.z + dz * ahead) + .5, a.z + dz * ahead]};
  };
  const shots = [['town-road-cab', pose(8, 2.9)], ['town-road-hood', pose(Math.max(0, worst.along - 12), 1.4)]];
  const roads = await context.evaluate(`(() => {
    const app = window.__qaApp; app.stop();
    const roads = []; window.__render.scene.traverse(node => { if (/^Town road /.test(node.name)) roads.push(node.name); });
    if (!roads.length) throw Error('No town road is drawn');
    return roads;
  })()`);
  for (const [name, camera] of shots) {
    await context.evaluate(`(() => { window.__qaApp.inspectionCamera = ${JSON.stringify(camera)}; window.__render.renderFrame(); return true; })()`);
    await context.evaluate(drawOnce);
    await context.screenshot(name);
  }
  return {roads, worst};
}
