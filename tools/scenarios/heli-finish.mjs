// Claude's finishing pass on the helicopter's first slice (HELI-FINISH,
// docs/HELICOPTER.md section 11): a trained pilot hooks their own car at
// the Tremblant Woods helipad, flies it on the autopilot to Panorama Ridge,
// sets it down in the zone and starts the race there with Race here; then
// the frame check 150 m over Panorama Ridge on High and Performance.
// Saves are memory-only. Run:
//   node tools/browser-harness.mjs scenario heli-finish
// HELI_FINISH_FRAMES=0 takes the pictures only.
const entry = '/tools/menu-check.html?flags=helicopter,panorama-ridge,tremblant-woods,tremblant-snow';
const P95_LIMIT_MS = 18.5;
const FRAMES = process.env.HELI_FINISH_FRAMES !== '0';
const pause = ms => new Promise(resolve => setTimeout(resolve, ms));

async function menu(context, quality) {
  await context.navigate(entry);
  await context.waitFor(`document.readyState==='complete' && !!window.__qaApp &&
    document.querySelector('#view3d')?.dataset.vehicleAsset==='ready' && !document.querySelector('#start-engine')?.disabled`, `${quality} menu`, 90_000);
  await context.evaluate(`(() => {
    const select = document.querySelector('#graphics-quality');
    select.value = ${JSON.stringify(quality)}; select.dispatchEvent(new Event('change', {bubbles: true}));
    document.querySelectorAll('details').forEach(node => { node.open = false; });
    const app = window.__qaApp;
    // A pilot who has done the lessons and owns Panorama Ridge (test fixture, memory only).
    app.profile = {...app.profile, credits: 5000,
      courses: {version: 1, unlocked: [...new Set([...(app.profile.courses?.unlocked || []), 'tremblant-woods', 'panorama-ridge'])]},
      heli: {version: 1, fuelKg: 0, refuels: 0, lessons: {liftoff: true, hover: true, landing: true, carry: true}}};
    if (!app._saveProfile()) throw Error('fixture not saved');
    app.audio.setMuted?.(true);
    app.menuCar = 'falcone_f42';
  })()`);
  await context.waitFor(`document.querySelector('#graphics-quality')?.value===${JSON.stringify(quality)} && !document.querySelector('#start-engine')?.disabled`, `${quality} ready`, 60_000);
}

// A steady page-side pilot that steers the session with the same controls
// a player has (QA only: it wraps the session's step for this tab).
async function installPilot(context) {
  await context.evaluate(`(() => {
    const app = window.__qaApp, session = app.heliSession, step = session.step.bind(session);
    const clamp = v => Math.max(-1, Math.min(1, v));
    window.__pilot = null;
    session.step = (controls, dt) => {
      const t = window.__pilot, v = session.view();
      if (!t || !v.heli) return step(controls, dt);
      const h = v.heli, fx = Math.sin(h.heading), fz = Math.cos(h.heading);
      const dx = t.x - h.x, dz = t.z - h.z, d = Math.hypot(dx, dz), want = Math.min(t.speed || 4, d * 0.4);
      const ex = (d > .01 ? dx / d * want : 0) - h.vx, ez = (d > .01 ? dz / d * want : 0) - h.vz;
      return step({pitch: clamp((ex * fx + ez * fz) * .25), roll: clamp((ex * -fz + ez * fx) * .25),
        lift: clamp((t.y - h.y) * .3 - h.vy * .3), yaw: 0}, dt);
    };
  })()`);
}

async function measure(context, quality) {
  const before = await context.evaluate(`(document.querySelector('#performance-results')?.textContent.match(/"frames": 120/g) || []).length`);
  await context.evaluate(`(() => {
    const button = [...document.querySelectorAll('button')].find(node => node.textContent === 'Measure frame pacing');
    if (!button) throw Error('Missing frame measurement control');
    button.click();
  })()`);
  await context.waitFor(`(document.querySelector('#performance-results')?.textContent.match(/"frames": 120/g) || []).length > ${before}`, `${quality} frames`, 60_000);
  const report = await context.evaluate(`JSON.parse(document.querySelector('#performance-results').textContent).at(-1)`);
  console.log(`Frames ${quality}, 150 m over Panorama Ridge: p50 ${report.p50} ms, p95 ${report.p95} ms, >33ms ${report.over33ms}, draws ${report.drawCalls}, triangles ${report.triangles}`);
  return {quality, ...report};
}

async function toPanorama(context, {pictures}) {
  await context.evaluate(`document.querySelector('#heli-visit').click()`);
  await context.waitFor(`window.__qaApp.duel.state.status==='heli' && window.__qaApp.visualReady`, 'helipad', 120_000);
  await context.evaluate(`window.__qaApp.heliBuyFuel()`);
  await installPilot(context);
  // Over the car with the hook at its roof, then H.
  await context.evaluate(`(() => { const car = window.__qaApp.heliView().loads.find(l => l.own); window.__pilot = {x: car.x, z: car.z, y: car.y + 15.2, speed: 4}; })()`);
  await context.waitFor(`(() => { const v = window.__qaApp.heliView(), car = v.loads.find(l => l.own), h = v.heli;
    return Math.hypot(h.x - car.x, h.z - car.z) < 1 && Math.abs(h.y - car.y - 15.2) < .6 && Math.hypot(h.vx, h.vy, h.vz) < .5; })()`, 'over the car', 90_000);
  await context.evaluate(`window.__qaApp._inputAction('heli-hook')`);
  if (!await context.evaluate(`!!window.__qaApp.heliView().loads.find(l => l.own)?.hooked`)) throw Error('The car did not hook.');
  await context.evaluate(`(() => { const v = window.__qaApp.heliView(); window.__pilot = {x: v.heli.x, z: v.heli.z, y: v.zone.y + 60}; })()`);
  await context.waitFor(`window.__qaApp.heliView().heli.y - window.__qaApp.heliView().zone.y > 55`, 'climb with the car', 60_000);
  if (pictures) { await context.evaluate(`window.__qaApp.heliCamera = 3`); await pause(700); await context.screenshot('finish-car-on-the-cable-side'); }
  await context.evaluate(`(() => { const app = window.__qaApp; window.__pilot = null; app.heliCamera = 0;
    app.heliSetDestination('panorama-ridge'); if (!app.heliSession.autopilotOn) app._inputAction('heli-autopilot'); })()`);
  if (pictures) { await pause(15000); await context.screenshot('finish-autopilot-over-tremblant'); }
  await context.waitFor(`window.__qaApp.heliSession.cruiseOffered`, 'out of the area', 300_000);
  await context.evaluate(`window.__qaApp._inputAction('heli-cruise')`);
  await context.waitFor(`window.__qaApp.heliView().courseId==='panorama-ridge' && window.__qaApp.visualReady`, 'arrive at Panorama Ridge', 120_000);
  await pause(1500);
}

export async function run(context) {
  await context.command('Emulation.setDeviceMetricsOverride', {width: 1280, height: 720, deviceScaleFactor: 1, mobile: false});
  const frames = [];
  await menu(context, 'high');
  await toPanorama(context, {pictures: true});
  await context.screenshot('finish-arriving-panorama-ridge');
  if (FRAMES) frames.push(await measure(context, 'high'));
  // The autopilot stops 20 m above the zone (plus the car); then let it down by hand.
  await context.waitFor(`(() => { const v = window.__qaApp.heliView(), h = v.heli;
    return Math.hypot(h.x - v.zone.x, h.z - v.zone.z) < 3 && Math.hypot(h.vx, h.vz) < .5; })()`, 'hover over the zone', 240_000);
  await context.screenshot('finish-hover-over-the-zone');
  await context.evaluate(`(() => { const app = window.__qaApp; if (app.heliSession.autopilotOn) app._inputAction('heli-autopilot');
    const v = app.heliView(); window.__pilot = {x: v.zone.x, z: v.zone.z, y: v.zone.y + .7 + 14.6, speed: 1}; app.heliCamera = 3; })()`);
  await context.waitFor(`!!window.__qaApp.heliView().loads.find(l => l.own)?.onGround`, 'the car touches down', 90_000);
  await pause(1000);
  await context.evaluate(`window.__qaApp._inputAction('heli-hook')`);
  await pause(800);
  await context.screenshot('finish-car-set-down');
  const offer = await context.evaluate(`(() => { const b = document.querySelector('[data-heli-board="race-here"]'); return !!b; })()`);
  if (!offer) throw Error('Race here should be offered after setting the car down on an owned course.');
  await context.screenshot('finish-race-here');
  await context.evaluate(`document.querySelector('[data-heli-board="race-here"]').click()`);
  await context.waitFor(`['countdown','racing'].includes(window.__qaApp.duel.state.status) && window.__qaApp.duel.course.def.id==='panorama-ridge' && window.__qaApp.visualReady`, 'the race at Panorama Ridge', 120_000);
  await pause(1500);
  await context.screenshot('finish-racing-at-panorama-ridge');
  const raced = await context.evaluate(`({car: window.__qaApp.duel.state.car, course: window.__qaApp.duel.course.def.id, heli: !!window.__qaApp.heliSession})`);
  if (raced.car !== 'falcone_f42' || raced.heli) throw Error(`Unexpected race ${JSON.stringify(raced)}`);
  await context.evaluate(`window.__qaApp.returnToMenu()`);
  if (FRAMES) {
    await menu(context, 'performance');
    await toPanorama(context, {pictures: false});
    frames.push(await measure(context, 'performance'));
    const failed = frames.filter(item => item.p95 > P95_LIMIT_MS);
    console.log(`Frame check: ${frames.map(item => `${item.quality} p95 ${item.p95} ms`).join(', ')} (limit ${P95_LIMIT_MS} ms)${failed.length ? ' FAILED' : ''}`);
  }
}
