// TOWN-HAUL-LOAD-LOOK: the pictures by which Claude judges the haul's load, on the bed and on the ground. Look pictures only,
// never a frame check; the browser uses memory-only storage. Run:
//   node tools/browser-harness.mjs scenario look-haul-load
// It starts Chapter 3's haul as tools/scenarios/town-haul-save.mjs does, stands the flatbed at the pile while the gang loads,
// takes it onto the road with a full stack and knocks pieces off, and then does the same on a Steel Run. Each place is
// photographed from the game's own chase camera (once with the game's screens up, so that nothing covers the stack) and from
// a camera stood close to the load. Last, one piece of every kind is put on the bed and on the ground beside the pile (the
// load is written straight into the job for these pictures only), so that no kind goes unseen whatever the seed dealt.
// HAUL_LOOK_BEFORE=<folder of an earlier run's pictures> pairs each picture with the older
// one of the same name, and HAUL_LOOK_ROUND=<n> writes that sheet to docs/board/looks/town-haul-load-look/round-<n>.jpg.
import {existsSync} from 'node:fs';
import {readFile, writeFile} from 'node:fs/promises';
import {join} from 'node:path';
import {publishReviewSheet} from './review-sheet.mjs';

const entry = '/tools/menu-check.html?flags=wasteland-town';
const BEFORE = process.env.HAUL_LOOK_BEFORE || '';
const ROUND = Number(process.env.HAUL_LOOK_ROUND || 0);
const job = 'window.__qaApp.duel.state.arena?.worldJob';
const shots = [];
// The pictures that go on the comparison sheet; the rest stay in the evidence folder for the review.
const ON_SHEET = new Set(['salvage-pile-few', 'salvage-pile-few-close', 'salvage-pile-full-screens', 'salvage-road-full', 'salvage-road-full-close',
  'salvage-falling', 'salvage-fallen', 'salvage-fallen-close', 'salvage-kinds-bed', 'salvage-kinds-ground-1', 'salvage-kinds-ground-2', 'salvage-kinds-ground-3',
  'steel-road-full', 'steel-road-full-close', 'steel-fallen-close', 'steel-kinds-bed', 'steel-kinds-ground-1', 'steel-kinds-ground-2']);

const screens = hidden => `(() => {
  let style = document.querySelector('#haul-look-style');
  if (!style) { style = document.createElement('style'); style.id = 'haul-look-style'; document.head.appendChild(style); }
  style.textContent = ${hidden} ? 'body *{visibility:hidden !important} canvas{visibility:visible !important} .world-hud-minimap canvas,canvas.world-hud-minimap{visibility:hidden !important} .rear-view-frame{display:none !important}' : '';
  window.dispatchEvent(new Event('resize'));
  return true;
})()`;
const drawOnce = '(() => { window.__render.renderFrame(); return true; })()';
async function picture(context, name, label) {
  for (let i = 0; i < 10; i++) await context.evaluate(drawOnce);
  await context.evaluate('new Promise(done=>requestAnimationFrame(()=>requestAnimationFrame(()=>done(true))))');
  const path = await context.screenshot(name);
  if (label) shots.push({name, label, path});
}
// Put the truck at a world point, stopped, facing along `heading` (radians, as the World Job's poses are).
const place = (x, z, heading = 0) => `(() => {const duel=window.__qaApp.duel,state=duel.state,pose=duel.course.nearest(${x},${z});
  state.s=state.prevS=pose.s;state.lateral=state.prevLateral=pose.lateral;state.speedMph=0;state.pushVelocity=0;state.yawVelocity=0;
  state.headingError=${heading}-duel.course.at(pose.s).heading;return true;})()`;
// The game's own chase camera, or a camera stood at `from` looking at `at`, both in the truck's own metres (+Z forward).
const chase = `(() => { const app = window.__qaApp; app.inspectionCamera = null; app.setCamera('chase'); return true; })()`;
const close = (from, at) => `(() => {
  const app = window.__qaApp, truck = window.__render.scene.getObjectByName('work-vehicle:flatbed');
  if (!truck) throw Error('The flatbed is not drawn.');
  truck.updateMatrixWorld(true);
  const V = truck.position.constructor, local = ([x, y, z]) => truck.localToWorld(new V(x, y, z)).toArray();
  app.inspectionCamera = {position: local(${JSON.stringify(from)}), target: local(${JSON.stringify(at)})};
  return true;
})()`;
// A camera stood on the road 4 m behind where the truck was when the pieces fell, 2.4 m up, looking at their middle.
// `window.__haulLookAt` is the truck's place and heading at the knock.
const closeToFallen = `(() => {
  const app = window.__qaApp, scene = window.__render.scene, lying = [], at = window.__haulLookAt;
  scene.traverse(node => { if (node.parent === scene && String(node.name).startsWith('haul-piece:')) lying.push(node.position); });
  const mid = lying.length ? lying.reduce((sum, p) => [sum[0] + p.x / lying.length, sum[1] + p.y / lying.length, sum[2] + p.z / lying.length], [0, 0, 0])
    : [at.x + at.fx * 3, at.y, at.z + at.fz * 3];
  app.inspectionCamera = {position: [at.x - at.fx * 4, at.y + 2.4, at.z - at.fz * 4], target: [mid[0], mid[1] + .2, mid[2]]};
  return lying.length;
})()`;
const markTruck = `(() => {
  const truck = window.__render.scene.getObjectByName('work-vehicle:flatbed'), V = truck.position.constructor;
  const forward = new V(0, 0, 1).applyQuaternion(truck.quaternion);
  window.__haulLookAt = {x: truck.position.x, y: truck.position.y, z: truck.position.z, fx: forward.x, fz: forward.z};
  return true;
})()`;

// One piece of each kind on the bed, and one of each thrown off at 7 m steps ahead of the truck. Pictures only.
const KINDS = {salvage: ['rib', 'skin', 'gear', 'seats', 'spar', 'beam'], steel: ['plate', 'rail', 'angle', 'bar']};
const oneOfEach = kinds => `(() => {
  const w = ${job}, truck = window.__render.scene.getObjectByName('work-vehicle:flatbed'), V = truck.position.constructor;
  const f = new V(0, 0, 1).applyQuaternion(truck.quaternion), kinds = ${JSON.stringify(kinds)};
  const load = kinds.map((kind, i) => ({id: kind + '-9' + i, kind, name: kind, kg: 300}));
  const shed = kinds.map((kind, i) => ({id: kind + '-8' + i, kind, name: kind, kg: 300, cause: 'knock',
    x: truck.position.x + f.x * (9 + 7 * i), z: truck.position.z + f.z * (9 + 7 * i)}));
  w.job.stepState = {...w.job.stepState, load, shed: [...w.job.stepState.shed, ...shed]};
  if (w.job.stepState.load.length !== kinds.length) throw Error('The look load could not be written.');
  return true;
})()`;
// A camera 6 m to one side of the middle of the named fallen pieces, 2.6 m up.
const closeToPieces = ids => `(() => {
  const app = window.__qaApp, scene = window.__render.scene, truck = scene.getObjectByName('work-vehicle:flatbed'), V = truck.position.constructor;
  const lying = ${JSON.stringify(ids)}.map(id => scene.getObjectByName('haul-piece:' + id)).filter(node => node && node.parent === scene).map(node => node.position);
  if (!lying.length) return 0;
  const mid = lying.reduce((sum, p) => [sum[0] + p.x / lying.length, sum[1] + p.y / lying.length, sum[2] + p.z / lying.length], [0, 0, 0]);
  const f = new V(0, 0, 1).applyQuaternion(truck.quaternion);
  app.inspectionCamera = {position: [mid[0] - f.x * 6.5, mid[1] + 2.6, mid[2] - f.z * 6.5], target: [mid[0], mid[1] + .2, mid[2]]};
  return lying.length;
})()`;

async function openTown(context, name, story, reports = []) {
  await context.navigate(entry);
  await context.waitFor(`document.readyState==='complete'&&!!window.__qaApp`, 'the QA game', 90_000);
  await context.waitFor(`window.__qaApp.visualReady===true`, 'the yard renderer', 60_000);
  await context.evaluate(`(() => {const app=window.__qaApp;app.audio.setMuted?.(true);app.addPlayer(${JSON.stringify(name)});app.profile={...app.profile,wasteland:{...app.profile.wasteland,discoveredGate:true}};app._saveProfile();if(!app.visitWasteland())throw Error('Could not enter the Wasteland.');app.advance(8);})()`);
  await context.waitFor(`!!document.querySelector('[data-action="yard-the-town"]')`, 'the yard', 30_000);
  await context.evaluate(`document.querySelector('[data-action="yard-the-town"]').click()`);
  await context.waitFor(`!!document.querySelector('.town-onboard form')`, 'Hollis note', 30_000);
  await context.evaluate(`document.querySelector('#town-name').value=${JSON.stringify(name)};document.querySelector('.town-onboard form button').click()`);
  await context.waitFor(`!!document.querySelector('.town-screen')`, 'the town view', 30_000);
  await context.evaluate(`(() => {const host=document.querySelector('.town-entry');host.__town.story=${JSON.stringify(story)};
    host.__town.reports=[...(host.__town.reports||[]),...${JSON.stringify(reports)}];host.__townCommand({type:'setSpeed',speed:1});})()`);
  await context.waitFor(`!!document.querySelector('.town-mission-card [data-town-mission-go]')`, 'the mission card', 15_000);
  await context.evaluate(`document.querySelector('[data-town-mission-go]').click()`);
  await context.waitFor(`${job}?.definition?.kind==='town-job'&&window.__qaApp.duel.state.status==='racing'`, 'the haul to start', 60_000);
  await context.waitFor(`!!window.__render.scene.getObjectByName('work-vehicle:flatbed')`, 'the flatbed drawn', 60_000);
  return context.evaluate(`JSON.stringify(${job}.definition.steps[0])`).then(JSON.parse);
}

// Stand at the pile until `pieces` are on the bed (or the bed is full), reading the load from the game and not from the clock.
async function loadTo(context, pieces) {
  for (let i = 0; i < 80; i++) {
    const state = await context.evaluate(`({count:${job}.job.stepState.load.length,phase:${job}.job.stepState.phase,full:${job}.job.stepState.full===true})`);
    if (state.count >= pieces || state.phase !== 'loading' && state.count > 0 && i > 2) return state.count;
    await context.evaluate(`window.__qaApp.advance(1.5)`);
  }
  return context.evaluate(`${job}.job.stepState.load.length`);
}

async function haul(context, tag, what, step) {
  const pile = step.pile.position;
  await context.evaluate(place(pile.x + 6, pile.z, Math.PI / 2));
  await context.evaluate(screens(true));
  await context.evaluate(chase);
  const few = await loadTo(context, 4);
  await picture(context, `${tag}-pile-few`, `${what}: at the pile, ${few} pieces on (chase camera)`);
  await context.evaluate(close([-3.4, 3.0, -4.6], [0, 1.5, -1.2]));
  await picture(context, `${tag}-pile-few-close`, `${what}: ${few} pieces, from 5 m`);
  await context.evaluate(chase);
  const full = await loadTo(context, 99);
  const names = await context.evaluate(`JSON.stringify(${job}.job.stepState.load.map(p=>p.kind))`);
  console.log(`${tag}: full stack of ${full}: ${names}`);
  await context.evaluate(screens(false));
  await picture(context, `${tag}-pile-full-screens`, `${what}: full stack of ${full} at the pile, the game's screens up`);
  await context.evaluate(screens(true));
  // Onto the road, 60 m on, rolling.
  await context.evaluate(place(pile.x + 60, pile.z, Math.PI / 2));
  await context.evaluate(`(() => {window.__qaApp.duel.state.speedMph=19;window.__qaApp.advance(.1);return true;})()`);
  await picture(context, `${tag}-road-full`, `${what}: on the road with the full stack (chase camera)`);
  await context.evaluate(close([3.6, 2.6, -4.2], [0, 1.6, -1.2]));
  await picture(context, `${tag}-road-full-close`, `${what}: the full stack from the rear quarter`);
  await context.evaluate(close([-4.8, 2.0, -1.0], [0, 1.6, -1.0]));
  await picture(context, `${tag}-road-full-side`, `${what}: the full stack from the side`);
  await context.evaluate(chase);
  await context.evaluate(markTruck);
  // A hard knock: the speed drops from 60 km/h to nothing in a step, as a hit on a wreck does.
  await context.evaluate(`(() => {const w=${job};w.lastKmh=60;window.__qaApp.duel.state.speedMph=0;window.__qaApp.advance(1/60);return true;})()`);
  const shed = await context.evaluate(`JSON.stringify(${job}.job.stepState.shed)`).then(JSON.parse);
  if (!shed.length) throw Error(`${tag}: the knock threw nothing off`);
  console.log(`${tag}: fell: ${shed.map(piece => piece.kind).join(', ')}`);
  // Let anything that tumbles come to rest, then look from the truck stood 11 m short of where they fell.
  await context.evaluate(`window.__qaApp.advance(.35)`);
  await picture(context, `${tag}-falling`, `${what}: the pieces in the air, a third of a second after the knock (chase camera)`);
  await context.evaluate(`window.__qaApp.advance(2)`);
  await context.evaluate(place(shed[0].x - 11, shed[0].z, Math.PI / 2));
  await context.evaluate(`window.__qaApp.advance(.5)`);
  await picture(context, `${tag}-fallen`, `${what}: ${shed.length} fallen pieces ahead (chase camera)`);
  await context.evaluate(closeToFallen);
  await picture(context, `${tag}-fallen-close`, `${what}: the fallen pieces from 6 m (${shed.map(piece => piece.name).join('; ')})`);
  await context.evaluate(chase);
  // One of every kind, back beside the pile where the ground is open.
  const kinds = KINDS[step.good];
  await context.evaluate(place(pile.x + 6, pile.z, Math.PI / 2));
  await context.evaluate(`window.__qaApp.advance(.2)`);
  await context.evaluate(oneOfEach(kinds));
  await context.evaluate(`window.__qaApp.advance(1.5)`);
  await context.evaluate(close([-3.2, 3.6, -3.4], [0, 1.6, -1.4]));
  await picture(context, `${tag}-kinds-bed`, `${what}: one of each kind on the bed (${kinds.join(', ')})`);
  for (let i = 0; i < kinds.length; i += 2) {
    const pair = kinds.slice(i, i + 2);
    if (!await context.evaluate(closeToPieces(pair.map((kind, n) => `${kind}-8${i + n}`)))) continue;
    await picture(context, `${tag}-kinds-ground-${i / 2 + 1}`, `${what} on the ground: ${pair.join(' and ')}`);
  }
  await context.evaluate(chase);
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
  const salvage = await openTown(context, 'Haul look', {facts: {pitsDug: true, wellBuilt: true}, completed: {'town.act1.twelve': true, 'town.act1.water': true}});
  if (salvage.good !== 'salvage') throw Error(`Expected the salvage haul, not ${salvage.good}`);
  await haul(context, 'salvage', 'Salvage', salvage);
  if (process.env.HAUL_LOOK_STEEL !== '0') {
    const steel = await openTown(context, 'Steel look',
      {facts: {pitsDug: true, wellBuilt: true, salvageDelivered: true}, completed: {'town.act1.twelve': true, 'town.act1.water': true, 'town.act1.salvage': true}},
      [{id: 'look-steel', unanswered: true, eventId: 'site-stopped', shortage: {good: 'steel'}}]);
    if (steel.good !== 'steel') throw Error(`Expected the Steel Run, not ${steel.good}`);
    await haul(context, 'steel', 'Steel', steel);
  }
  const sheet = join(context.outputDir, 'sheet.png');
  await writeSheet(context, sheet, `TOWN-HAUL-LOAD-LOOK${ROUND ? ` round ${ROUND}` : ''}: the haul's load on the bed and on the ground (browser captures, memory-only saves)`);
  if (ROUND) console.log(`Sheet: ${await publishReviewSheet(context, sheet, 'town-haul-load-look', ROUND)}`);
}
