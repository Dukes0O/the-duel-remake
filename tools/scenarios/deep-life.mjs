// The Deep, sea life pictures (card DEEP-LIFE).
//
//   node tools/browser-harness.mjs scenario deep-life
//
// Private port, no saves, no race. Opens the look page on the sample loop with
// the Kelp Coast's creatures along it (?life=1), plays each situation for a
// few seconds with the car where the picture needs it, photographs it at
// 1280x720 on High, and joins the pictures into one sheet (life-sheet.jpg).
// Everything lands in the harness's .evidence folder; the sheet kept in Git is
// copied by hand to docs/board/looks/deep-life/round-N.jpg.
import { writeFileSync } from 'node:fs';
import { join } from 'node:path';

// DUEL_LIFE_QUALITY=performance runs the same pictures and cost check on the Performance setting.
const QUALITY = process.env.DUEL_LIFE_QUALITY === 'performance' ? 'performance' : 'high';
const PAGE = `/tools/deep-look.html?quality=${QUALITY}&still=1&clean=1&manual=1&zone=sample&life=1`;

// Joined in the page so no image library is needed.
async function pageSheet(spec) {
  const load = url => new Promise((done, fail) => { const img = new Image(); img.onload = () => done(img); img.onerror = () => fail(Error('view image failed')); img.src = url; });
  const canvas = document.createElement('canvas');
  canvas.width = spec.W; canvas.height = spec.H;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#05090b'; ctx.fillRect(0, 0, spec.W, spec.H);
  for (let i = 0; i < spec.cells.length; i++) {
    const cell = spec.cells[i], col = i % spec.cols, row = Math.floor(i / spec.cols);
    const x = spec.gap + col * (spec.cw + spec.gap), y = spec.gap + row * (spec.ch + spec.gap);
    ctx.drawImage(await load(cell.url), x, y, spec.cw, spec.ch);
    ctx.fillStyle = 'rgba(4,10,13,0.72)'; ctx.fillRect(x, y + spec.ch - 26, spec.cw, 26);
    ctx.font = 'bold 14px system-ui, Segoe UI, sans-serif'; ctx.fillStyle = '#e8c36a'; ctx.fillText(cell.number, x + 9, y + spec.ch - 8);
    ctx.font = '14px system-ui, Segoe UI, sans-serif'; ctx.fillStyle = '#e6eef0'; ctx.fillText(cell.label, x + 30, y + spec.ch - 8);
    ctx.textAlign = 'right'; ctx.fillStyle = '#9db6bb'; ctx.fillText(cell.right, x + spec.cw - 9, y + spec.ch - 8); ctx.textAlign = 'left';
  }
  return canvas.toDataURL('image/jpeg', spec.quality);
}

// Runs in the page: plays the situation, frames the picture, draws it. Returns facts about it.
function situation(spec) {
  const L = window.__deepLook, d = L.debug, deep = d.deep, sea = deep.sea;
  window.__lifeClock ??= 100;
  const step = 1 / 30;
  const first = key => (deep.sea.positions()[key] || [])[0];
  const place = spec.car(sea.plan, d);                       // { x, z, heading }
  d.placeCarAt(place.x, place.z, place.heading);
  const until = window.__lifeClock + spec.seconds;
  for (let t = window.__lifeClock; t < until; t += step) deep.update({ car: d.carState, camera: d.camera, seconds: t });
  window.__lifeClock = until;
  const target = spec.target(sea, d, first);                   // { x, y, z, yaw }
  const rel = (f, l, u) => [target.x + Math.sin(target.yaw) * f + Math.cos(target.yaw) * l, target.y + u, target.z + Math.cos(target.yaw) * f - Math.sin(target.yaw) * l];
  const [cx, cy, cz] = spec.camera(rel, target, d);
  const floor = d.deep.shape.floorHeight(cx, cz);
  d.camera.position.set(cx, Math.min(-0.5, Math.max(floor + 0.35, cy)), cz);
  d.camera.fov = spec.fov || 55;
  d.camera.updateProjectionMatrix();
  d.camera.lookAt(target.x + (spec.aim?.[0] || 0), target.y + (spec.aim?.[1] || 0), target.z + (spec.aim?.[2] || 0));
  for (let i = 0; i < 4; i++) d.renderFrame(window.__lifeClock + i * step);
  window.__lifeClock += 4 * step;
  return { counts: sea.counts(), positions: sea.positions(), status: sea.status, camera: d.camera.position.toArray(), targetY: target.y };
}

// Runs in the page: the cost of the sea life where it is thickest (the forest school with the car in it).
// Median and 95th percentile of the whole frame with the sea life drawn and with it hidden, and of its own update.
function frameCost() {
  const L = window.__deepLook, d = L.debug, sea = d.deep.sea, gl = d.renderer.getContext();
  const school = sea.plan['silver-school'][0];
  d.placeCarAt(school.x, school.z, 0.4);
  d.camera.position.set(school.x - 7, d.carState.y + 3, school.z - 3); d.camera.fov = 66; d.camera.updateProjectionMatrix();
  d.camera.lookAt(school.x, d.carState.y + 1.5, school.z + 4);
  const percentile = (rows, p) => rows.slice().sort((a, b) => a - b)[Math.min(rows.length - 1, Math.floor(rows.length * p))];
  const measure = (frames, work) => {
    const rows = [];
    for (let i = 0; i < frames; i++) { const t0 = performance.now(); work(i); gl.finish(); rows.push(performance.now() - t0); }
    return { median: +percentile(rows, 0.5).toFixed(2), p95: +percentile(rows, 0.95).toFixed(2) };
  };
  const clock = () => (window.__lifeClock += 1 / 60);
  for (let i = 0; i < 30; i++) d.renderFrame(clock());                      // warm up
  const withLife = measure(240, () => d.renderFrame(clock()));
  sea.group.visible = false;
  const without = measure(240, () => d.renderFrame(clock()));
  sea.group.visible = true;
  const update = measure(240, () => sea.update({ car: d.carState, camera: d.camera, seconds: clock() }));
  const info = d.renderer.info;
  return { withLife, without, update, counts: sea.counts(), draws: info.render.calls, triangles: info.render.triangles };
}

const SHOTS = [
  { id: 'sardines', label: 'Sardines part round the car and close behind it', seconds: 14, fov: 66,
    car: plan => ({ x: plan['silver-school'][0].x, z: plan['silver-school'][0].z, heading: 0.4 }),
    target: (sea, d) => ({ x: d.carState.x, y: d.carState.y + 0.6, z: d.carState.z, yaw: 0.4 }),
    camera: rel => rel(-7, 3.5, 1.6), aim: [0, 1.2, 4] },
  { id: 'turtle', label: 'Green turtle gliding, one flipper stroke', seconds: 9, fov: 52,
    car: plan => ({ x: plan.turtle[0].x + 60, z: plan.turtle[0].z, heading: 0 }),
    target: (sea, d, first) => ({ ...first('turtle'), yaw: first('turtle').yaw }),
    camera: rel => rel(3.6, 2.6, 0.5), aim: [0, 0, 0] },
  { id: 'ray-rest', label: 'Bat ray resting on the sand', seconds: 6, fov: 50,
    car: plan => ({ x: plan.ray[0].x + 60, z: plan.ray[0].z, heading: 0 }),
    target: (sea, d, first) => ({ ...first('ray'), yaw: first('ray').yaw }),
    camera: rel => rel(4.2, 2.4, 1.6), aim: [0, 0, 0] },
  { id: 'ray-lift', label: 'The same ray lifts off as the car comes close', seconds: 9, fov: 58,
    car: plan => ({ x: plan.ray[0].x - 2.6, z: plan.ray[0].z + 0.8, heading: -1.2 }),
    target: (sea, d, first) => ({ ...first('ray'), yaw: first('ray').yaw }),
    camera: (rel, t) => [t.x - 1.0, t.y + 1.5, t.z - 6.0], aim: [-1.0, 0.2, 0] },
  { id: 'sea-lion', label: 'Sea lion on a fast twisting pass', seconds: 21, fov: 60,
    car: plan => ({ x: plan['sea-lion'][0].x + 6, z: plan['sea-lion'][0].z, heading: 1.5 }),
    target: (sea, d, first) => ({ ...first('sea-lion'), yaw: first('sea-lion').yaw }),
    camera: rel => rel(5, 3, 0.8), aim: [0, 0, 0] },
  { id: 'crabs', label: 'Kelp crabs scuttle sideways out of the way', seconds: 7, fov: 58,
    car: plan => ({ x: plan.crab[0].x + 1.7, z: plan.crab[0].z + 0.6, heading: 3.6 }),
    target: (sea, d, first) => ({ ...first('crab'), yaw: first('crab').yaw }),
    camera: rel => rel(0.4, 1.7, 0.7), aim: [0, 0.1, 0] },
  { id: 'whale-1', label: 'Gray whale: the one slow pass, seen from the Drop-off', seconds: 30, fov: 46,
    car: plan => ({ x: plan.whale.x, z: plan.whale.z, heading: 0 }),
    target: (sea, d, first) => ({ ...first('whale'), yaw: first('whale').yaw }),
    camera: (rel, t, d) => [d.carState.x, d.carState.y + 1.8, d.carState.z], aim: [0, 0, 0] },
  { id: 'whale-2', label: 'The whale, a few seconds on', seconds: 5, fov: 40,
    car: plan => ({ x: plan.whale.x, z: plan.whale.z, heading: 0 }),
    target: (sea, d, first) => ({ ...first('whale'), yaw: first('whale').yaw }),
    camera: (rel, t, d) => [d.carState.x - 5, d.carState.y + 2.4, d.carState.z], aim: [0, 0, 0] },
];

export async function run(context) {
  const result = { views: [], notes: 'sample loop with the Kelp Coast spots; not the Kelp Coast itself' };
  await context.command('Emulation.setDeviceMetricsOverride', { width: 1280, height: 800, deviceScaleFactor: 1, mobile: false });
  await context.navigate(PAGE);
  await context.waitFor('!!window.__deepLook && window.__deepLook.ready === true', 'The Deep look page with sea life', 90_000);
  await context.evaluate('window.__deepLook.debug.deep.sea.ready.then(() => true)');
  result.status = await context.evaluate('window.__deepLook.debug.deep.sea.status');
  result.failures = await context.evaluate('window.__deepLook.debug.deep.sea.failures');
  if (result.failures.length) throw new Error('A sea life model did not load: ' + JSON.stringify(result.failures));
  const cells = [];
  for (let i = 0; i < SHOTS.length; i++) {
    const shot = SHOTS[i], before = context.issues.length;
    const facts = await context.evaluate(`(${situation.toString()})({seconds:${shot.seconds},fov:${shot.fov},aim:${JSON.stringify(shot.aim)},`
      + `car:${shot.car.toString()},target:${shot.target.toString()},camera:${shot.camera.toString()}})`);
    const image = await context.command('Page.captureScreenshot', { format: 'jpeg', quality: 93, clip: { x: 0, y: 0, width: 1280, height: 720, scale: 1 } });
    writeFileSync(join(context.outputDir, `life-${i + 1}-${shot.id}.jpg`), Buffer.from(image.data, 'base64'));
    cells.push({ url: 'data:image/jpeg;base64,' + image.data, number: String(i + 1), label: shot.label, right: `camera ${Math.max(0, -facts.camera[1]).toFixed(0)} m deep` });
    result.views.push({ id: shot.id, counts: facts.counts, positions: facts.positions, camera: facts.camera, browserErrors: context.issues.length - before });
    console.log(`Picture ${i + 1}/${SHOTS.length}: ${shot.id}`);
  }
  result.quality = QUALITY;
  result.frameCost = await context.evaluate(`(${frameCost.toString()})()`);
  console.log('Frame cost (ms): ' + JSON.stringify(result.frameCost));
  const cols = 2, rows = Math.ceil(cells.length / cols);
  const spec = { W: 1600, H: 4 + rows * (448 + 4), cw: 796, ch: 448, cols, gap: 4, cells, quality: 0.85 };
  const sheet = await context.evaluate(`(${pageSheet.toString()})(${JSON.stringify(spec)})`);
  const sheetPath = join(context.outputDir, 'life-sheet.jpg');
  writeFileSync(sheetPath, Buffer.from(sheet.slice(sheet.indexOf(',') + 1), 'base64'));
  context.screenshots.push(sheetPath);
  writeFileSync(join(context.outputDir, 'life-result.json'), JSON.stringify(result, null, 2));
}
