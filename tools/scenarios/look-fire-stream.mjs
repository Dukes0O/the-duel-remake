// TOWN-FIRE-STREAM-LOOK: the pictures by which Claude judges the fire truck's water. Look pictures only, never a frame
// check; the browser uses memory-only storage. Run:
//   node tools/browser-harness.mjs scenario look-fire-stream
// It starts Chapter 7's fire as tools/scenarios/town-fire-save.mjs does, stands the truck 12 m short of the burning soup
// kitchen and holds H as a player does. The jet is photographed from the game's own chase camera (once with the game's
// screens up), from the side and close to where the water lands; then the water is held on the kitchen until its fire goes
// out, and the steam is photographed at that moment and in the seconds after it. The kitchen is an open frame with one
// boarded side, so the truck is also stood off that side: that is the water on a wall, the wall darkening, and the wall
// left wet. Every picture is taken by what the game
// says (spraying, the fire's state), not by the clock. FIRE_LOOK_BEFORE=<folder of an earlier run's pictures> pairs each
// picture with the older one of the same name, and FIRE_LOOK_ROUND=<n> writes that sheet to
// docs/board/looks/town-fire-stream-look/round-<n>.jpg.
import {existsSync} from 'node:fs';
import {readFile, writeFile} from 'node:fs/promises';
import {join} from 'node:path';
import {publishReviewSheet} from './review-sheet.mjs';

const entry = '/tools/menu-check.html?flags=wasteland-town';
const BEFORE = process.env.FIRE_LOOK_BEFORE || '';
const ROUND = Number(process.env.FIRE_LOOK_ROUND || 0);
const job = 'window.__qaApp.duel.state.arena?.worldJob';
const shots = [];

const screens = hidden => `(() => {
  let style = document.querySelector('#fire-look-style');
  if (!style) { style = document.createElement('style'); style.id = 'fire-look-style'; document.head.appendChild(style); }
  style.textContent = ${hidden} ? 'body *{visibility:hidden !important} canvas{visibility:visible !important} .world-hud-minimap canvas,canvas.world-hud-minimap{visibility:hidden !important} .rear-view-frame{display:none !important}' : '';
  window.dispatchEvent(new Event('resize'));
  return true;
})()`;
const drawOnce = '(() => { window.__render.renderFrame(); return true; })()';
async function picture(context, name, label) {
  for (let i = 0; i < 6; i++) await context.evaluate(drawOnce);
  await context.evaluate('new Promise(done=>requestAnimationFrame(()=>requestAnimationFrame(()=>done(true))))');
  const path = await context.screenshot(name);
  if (label) shots.push({name, label, path});
}
const place = (x, z, heading = 0) => `(() => {const duel=window.__qaApp.duel,state=duel.state,pose=duel.course.nearest(${x},${z});
  state.s=state.prevS=pose.s;state.lateral=state.prevLateral=pose.lateral;state.speedMph=0;state.pushVelocity=0;state.yawVelocity=0;
  state.headingError=${heading}-duel.course.at(pose.s).heading;return true;})()`;
const key = (type, code) => `window.dispatchEvent(new KeyboardEvent('${type}',{code:'${code}',key:'${code === 'KeyH' ? 'h' : code}',bubbles:true}))`;
// Run the game for some seconds in half-second steps with a frame drawn after each: the wall's wetness is kept by the
// drawing, frame by frame, as it is in play.
async function play(context, seconds) {
  for (let t = 0; t < seconds - 1e-6; t += .5) { await context.evaluate(`window.__qaApp.advance(${Math.min(.5, seconds - t)})`); await context.evaluate(drawOnce); }
}
const chase = `(() => { const app = window.__qaApp; app.inspectionCamera = null; app.setCamera('chase'); return true; })()`;
// A camera at `from` looking at `at`, both in the truck's own metres (+Z forward, +X to its left).
const view = (from, at) => `(() => {
  const app = window.__qaApp, truck = window.__render.scene.getObjectByName('work-vehicle:fire-truck');
  if (!truck) throw Error('The fire truck is not drawn.');
  truck.updateMatrixWorld(true);
  const V = truck.position.constructor, local = ([x, y, z]) => truck.localToWorld(new V(x, y, z)).toArray();
  app.inspectionCamera = {position: local(${JSON.stringify(from)}), target: local(${JSON.stringify(at)})};
  return true;
})()`;
const SIDE = [[13, 3.2, 5], [0, 2.6, 7]], WALL = [[4.5, 2.6, 4], [0, 2.4, 13]];
// The pictures that go on the comparison sheet; the rest stay in the evidence folder for the review.
const ON_SHEET = new Set(['spray-start-chase', 'spray-chase', 'spray-side', 'spray-wall', 'spray-screens', 'out-chase', 'out-side', 'out-1s-chase',
  'out-1s-wall', 'wall-spray-chase', 'wall-spray-side', 'wall-spray-wall', 'wall-wet-wall', 'wall-wet-close']);

// Three views of one moment: the game's clock is held while they are taken, or the second and third would be later moments.
async function trio(context, tag, what) {
  await context.evaluate(`(() => { window.__qaApp.stop(); return true; })()`);
  await context.evaluate(chase);
  await picture(context, `${tag}-chase`, `${what} (chase camera)`);
  await context.evaluate(view(...SIDE));
  await picture(context, `${tag}-side`, `${what}, from the side`);
  await context.evaluate(view(...WALL));
  await picture(context, `${tag}-wall`, `${what}, where the water lands`);
  await context.evaluate(chase);
  await context.evaluate(`(() => { window.__qaApp.start(); return true; })()`);
}

async function writeSheet(context, path, title) {
  const cells = [];
  for (const shot of shots.filter(row => ON_SHEET.has(row.name))) {
    const before = BEFORE && existsSync(join(BEFORE, `${shot.name}.png`)) ? join(BEFORE, `${shot.name}.png`) : null;
    if (before) cells.push({label: `BEFORE. ${shot.label}`, path: before});
    cells.push({label: before ? `AFTER. ${shot.label}` : shot.label, path: shot.path});
  }
  const data = await Promise.all(cells.map(async cell => ({label: cell.label, data: 'data:image/png;base64,' + (await readFile(cell.path)).toString('base64')})));
  const png = await context.evaluate(`(async () => {
    const shots = ${JSON.stringify(data)}, c = document.createElement('canvas'), w = 640, h = 400, cols = 4;
    c.width = w * cols; c.height = 44 + Math.ceil(shots.length / cols) * (h + 30);
    const x = c.getContext('2d'); x.fillStyle = '#14191a'; x.fillRect(0, 0, c.width, c.height);
    x.fillStyle = '#eadabc'; x.font = '22px sans-serif'; x.fillText(${JSON.stringify(title)}, 16, 30);
    for (let i = 0; i < shots.length; i++) {
      const im = new Image(); im.src = shots[i].data; await im.decode();
      const left = (i % cols) * w, top = 44 + Math.floor(i / cols) * (h + 30);
      x.drawImage(im, left + 4, top, w - 8, h);
      x.fillStyle = '#fff'; x.font = '15px sans-serif'; x.fillText(shots[i].label, left + 10, top + h + 20);
    }
    return c.toDataURL('image/png'); })()`);
  await writeFile(path, Buffer.from(png.split(',')[1], 'base64'));
}

export async function run(context) {
  await context.navigate(entry);
  await context.waitFor(`document.readyState==='complete'&&!!window.__qaApp`, 'the QA game', 90_000);
  await context.waitFor(`window.__qaApp.visualReady===true`, 'the yard renderer', 60_000);
  await context.evaluate(`(() => {const app=window.__qaApp;app.audio.setMuted?.(true);app.addPlayer('Fire look');app.profile={...app.profile,wasteland:{...app.profile.wasteland,discoveredGate:true}};app._saveProfile();if(!app.visitWasteland())throw Error('Could not enter the Wasteland.');app.advance(8);})()`);
  await context.waitFor(`!!document.querySelector('[data-action="yard-the-town"]')`, 'the yard', 30_000);
  await context.evaluate(`document.querySelector('[data-action="yard-the-town"]').click()`);
  await context.waitFor(`!!document.querySelector('.town-onboard form')`, 'Hollis note', 30_000);
  await context.evaluate(`document.querySelector('#town-name').value='Fire look';document.querySelector('.town-onboard form button').click()`);
  await context.waitFor(`!!document.querySelector('.town-screen')`, 'the town view', 30_000);
  await context.evaluate(`(() => {const host=document.querySelector('.town-entry'),town=host.__town;
    for(const [buildingId,x,z] of [['soup-kitchen',1,-6],['hand-well',-4,-6],['chicken-run',-1,-6]]){
      const placed=host.__townCommand({type:'placeBuilding',buildingId,x,z})[0];if(!placed?.ok)throw Error(buildingId+': '+placed?.message);}
    for(const building of town.buildings)building.state='finished';
    town.weather={...(town.weather||{}),windDirection:0,windSpeedKph:9,windFactor:.5};
    town.story={facts:{pitsDug:true,wellBuilt:true,salvageDelivered:true,soupBuilt:true,latrineBuilt:true,winterPassed:true},
      completed:{'town.act1.twelve':true,'town.act1.water':true,'town.act1.salvage':true,'town.act1.soup':true,'town.act1.smell':true,'town.act1.winter':true}};
    host.__townCommand({type:'setSpeed',speed:1});})()`);
  await context.waitFor(`!!document.querySelector('.town-mission-card [data-town-mission-go]')`, 'the fire card', 15_000);
  await context.evaluate(`document.querySelector('[data-town-mission-go]').click()`);
  await context.waitFor(`${job}?.definition?.townJob==='fire'&&window.__qaApp.duel.state.status==='racing'`, 'the fire call to start', 60_000);
  await context.waitFor(`!!window.__render.scene.getObjectByName('work-vehicle:fire-truck')`, 'the fire truck drawn', 60_000);
  const step = await context.evaluate(`JSON.stringify(${job}.definition.steps[0])`).then(JSON.parse);
  const kitchen = step.buildings.find(row => row.id === step.mainId);
  await context.evaluate(place(kitchen.x, kitchen.z - kitchen.halfZ - 12, 0));
  await play(context, 3);
  await context.evaluate(screens(true));
  await context.evaluate(chase);
  await picture(context, 'flames-chase', 'Before the water: the kitchen burning (chase camera)');
  // Hold H until the game says the water is on the kitchen.
  await context.evaluate(key('keydown', 'KeyH'));
  for (let i = 0; i < 20; i++) {
    if (await context.evaluate(`${job}.job.stepState.spraying===true&&${job}.job.stepState.targetId===${JSON.stringify(kitchen.id)}`)) break;
    await context.evaluate(`window.__qaApp.advance(.25)`);
  }
  await play(context, 1.5);
  await trio(context, 'spray-start', 'Spraying, two seconds in');
  await play(context, 6);
  await trio(context, 'spray', 'Spraying, eight seconds in');
  await context.evaluate(screens(false));
  await picture(context, 'spray-screens', "Spraying, the game's screens up (chase camera)");
  await context.evaluate(screens(true));
  // The kitchen's boarded side: from 12 m off it, the water lands on a wall. WALL_SIDE=-1 takes the other side.
  const sideOf = Number(process.env.FIRE_LOOK_WALL_SIDE || 1);
  const onKitchen = `${job}.job.stepState.spraying===true&&${job}.job.stepState.targetId===${JSON.stringify(kitchen.id)}`;
  await context.evaluate(key('keyup', 'KeyH'));
  await context.evaluate(place(kitchen.x + sideOf * (kitchen.halfX + 12), kitchen.z, -sideOf * Math.PI / 2));
  await play(context, 1);
  await context.evaluate(key('keydown', 'KeyH'));
  for (let i = 0; i < 20 && !await context.evaluate(onKitchen); i++) await context.evaluate(`window.__qaApp.advance(.25)`);
  if (!await context.evaluate(onKitchen)) throw Error("The water is not on the kitchen from its side.");
  await play(context, 4);
  // Where the wet patch stands, which way it faces and how wet it is: numbers to read beside the pictures.
  const wet = await context.evaluate(`(() => { const patch = window.__render.scene.getObjectByName('fire-truck-jet:wet-wall');
    if (!patch) return null;
    const V = patch.position.constructor, n = patch.getWorldDirection(new V()), r = v => +v.toFixed(2);
    window.__wetLook = {at: patch.position.toArray(), n: n.toArray()};
    const jet = window.__render.scene.getObjectByName('fire-truck-jet:jet'), land = jet.material.uniforms.uTo.value;
    return {shown: patch.visible, at: patch.position.toArray().map(r), faces: n.toArray().map(r), wet: r(patch.material.uniforms.uWet.value),
      lands: land.toArray().map(r),
      kitchen: ${JSON.stringify({x: kitchen.x, z: kitchen.z, halfX: kitchen.halfX, halfZ: kitchen.halfZ})}}; })()`);
  console.log(`The wet patch off the kitchen's side: ${JSON.stringify(wet)}`);
  await trio(context, 'wall-spray', 'On the boarded side, four seconds in');
  await context.evaluate(key('keyup', 'KeyH'));
  await play(context, 3);
  await context.evaluate(view(...WALL));
  await picture(context, 'wall-wet-wall', 'Three seconds after the water is off: the wall left wet');
  // Square on to the wet patch from 6 m.
  await context.evaluate(`(() => { const w = window.__wetLook; if (!w) return false;
    window.__qaApp.inspectionCamera = {position: [w.at[0] + w.n[0] * 6, w.at[1] + 1 + w.n[1] * 6, w.at[2] + w.n[2] * 6], target: [w.at[0], w.at[1] + .6, w.at[2]]};
    return true; })()`);
  await picture(context, 'wall-wet-close', 'The wet wall, square on from 6 m');
  await context.evaluate(chase);
  // Back in front of the kitchen.
  await context.evaluate(place(kitchen.x, kitchen.z - kitchen.halfZ - 12, 0));
  await play(context, .5);
  await context.evaluate(key('keydown', 'KeyH'));
  await play(context, 1.5);
  // Keep the water on until the kitchen's fire is out (the tank holds three minutes; fill it by hand if it runs low).
  const fire = `${job}.job.stepState.fires[${JSON.stringify(kitchen.id)}]`;
  for (let i = 0; i < 400; i++) {
    const now = await context.evaluate(`({state:${fire}.state,heat:${fire}.heat,tank:${job}.job.stepState.tankL})`);
    if (now.state !== 'burning') break;
    if (now.tank < 200) await context.evaluate(`(() => {window.__qaApp.duel.state.arena.worldJob.job.stepState.tankL=3000;return true;})()`);
    await context.evaluate(`window.__qaApp.advance(${now.heat < .12 ? .1 : .5})`);
  }
  const out = await context.evaluate(`${fire}.state`);
  if (out !== 'out') throw Error(`The kitchen's fire did not go out: ${out}`);
  await trio(context, 'out', 'The moment the fire goes out');
  await play(context, 1.2);
  await trio(context, 'out-1s', 'One second after the fire goes out');
  await play(context, 2.5);
  await context.evaluate(key('keyup', 'KeyH'));
  await picture(context, 'out-4s-chase', 'Four seconds after: the water off (chase camera)');
  await context.evaluate(view(...WALL));
  await picture(context, 'out-4s-wall', 'Four seconds after: the wall the water hit');
  await context.evaluate(chase);
  const sheet = join(context.outputDir, 'sheet.png');
  await writeSheet(context, sheet, `TOWN-FIRE-STREAM-LOOK${ROUND ? ` round ${ROUND}` : ''}: the fire truck's water (browser captures, memory-only saves)`);
  if (ROUND) console.log(`Sheet: ${await publishReviewSheet(context, sheet, 'town-fire-stream-look', ROUND)}`);
}
