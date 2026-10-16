// Private browser look check for the Ferrari Enzo (EARN-CAR-1 round 5): the
// car in the menu showroom and the garage, then racing at Panorama Ridge from
// the chase camera, the side and the front. Memory-only saves, loaded from the
// 12-medals fixture so the Enzo is owned. Run:
//   node tools/browser-harness.mjs scenario enzo-look
import {readFileSync} from 'node:fs';

import {COURSE} from '../../src/config.js';

const entry = '/tools/menu-check.html?flags=earned-cars';
const PANORAMA = COURSE.findIndex(course => course.id === 'panorama-ridge');
const fixture = JSON.parse(readFileSync(new URL('../fixtures/saves/12-medals.json', import.meta.url), 'utf8'));
const wait = ms => new Promise(resolve => setTimeout(resolve, ms));
const ready = `document.readyState==='complete' && !!window.__qaApp && !!window.__render &&
  document.querySelector('#view3d')?.dataset.vehicleAsset==='ready' && !document.querySelector('#start-engine')?.disabled &&
  !!Object.getOwnPropertyDescriptor(window, 'localStorage')?.value`;
const hideQaPanels = `for (const panel of document.querySelectorAll('details')) {
  const title = panel.querySelector('summary')?.textContent || '';
  if (title.includes('TEMPORARY SAVES') || title.startsWith('Performance samples')) panel.style.display = 'none'; }`;

// Freeze the frame and look at the player's Enzo from beside or ahead of it.
const pose = (side, ahead, up, fov) => `(() => {
  const r = window.__render, app = window.__qaApp;
  window.requestAnimationFrame = () => 0; app.stop?.();
  const car = []; r.scene.traverse(node => { if (node.userData?.vehicleKey === 'ferrari_enzo' && node.visible) car.push(node); });
  if (car.length !== 1) throw Error('Expected one visible Enzo, found ' + car.length);
  const enzo = car[0]; enzo.updateMatrixWorld(true);
  const at = enzo.getWorldPosition(new r.camera.position.constructor());
  // The direction of travel, from the chase camera behind the car (kept for later poses).
  if (!window.__enzoForward) { const f = at.clone().sub(r.camera.position); f.y = 0; window.__enzoForward = f.normalize(); }
  const forward = window.__enzoForward;
  const right = new r.camera.position.constructor(-forward.z, 0, forward.x).normalize();
  r.camera.position.copy(at).addScaledVector(right, ${side}).addScaledVector(forward, ${ahead});
  r.camera.position.y += ${up};
  r.camera.lookAt(at.x, at.y + 0.55, at.z);
  r.camera.fov = ${fov}; r.camera.updateProjectionMatrix();
  for (const id of ['#hud', '.hud', '#modal-layer', '.rear-view-frame']) for (const node of document.querySelectorAll(id)) node.style.visibility = 'hidden';
  r.composer.render();
  return {at: at.toArray().map(v => Math.round(v * 10) / 10)};
})()`;

export async function run(context) {
  await context.command('Emulation.setDeviceMetricsOverride', {width: 1280, height: 720, deviceScaleFactor: 1, mobile: false});
  await context.navigate(entry);
  await context.waitFor(ready, 'memory-only menu ready', 90_000);
  // The 12-medals save: Medal QA owns the Enzo with the six medals that earned it.
  await context.evaluate(`(() => { for (const [key, value] of Object.entries(${JSON.stringify(fixture.storage)}))
    localStorage.setItem(key, JSON.stringify(value)); })()`);
  await context.navigate(entry);
  await context.waitFor(ready, 'menu with the fixture save', 90_000);
  const owned = await context.evaluate(`(() => { const app = window.__qaApp; app.audio.setMuted?.(true);
    // With the helicopter live the Enzo travels only by air: the save says Kestrel One set it down at Panorama Ridge.
    app.profile = {...app.profile, courses: {version: 1, unlocked: [...new Set([...(app.profile.courses?.unlocked || []), 'panorama-ridge'])]},
      heli: {...(app.profile.heli || {version: 1}), carsAt: {...(app.profile.heli?.carsAt || {}), ferrari_enzo: 'panorama-ridge'}}};
    app._saveProfile(); ${hideQaPanels}
    return {player: app.player.name, enzo: app.profile.unlockedCars.includes('ferrari_enzo')}; })()`);
  if (owned.player !== 'Medal QA' || !owned.enzo) throw Error(`The fixture save did not load the owned Enzo: ${JSON.stringify(owned)}`);

  // Showroom: the menu car picker on the Enzo.
  await context.evaluate(`(() => { const select = document.querySelector('#car-select'); select.value = 'ferrari_enzo';
    select.dispatchEvent(new Event('change', {bubbles: true})); })()`);
  await context.waitFor(`window.__qaApp.menuCar === 'ferrari_enzo' && document.querySelector('#view3d')?.dataset.vehicleAsset === 'ready'`, 'Enzo in the showroom', 30_000);
  await wait(1500);
  await context.screenshot('enzo-showroom');
  // Garage page for the Enzo.
  await context.evaluate(`document.querySelector('[data-action="garage"]').click()`);
  await context.waitFor(`!!document.querySelector('[data-garage-car="ferrari_enzo"]')`, 'garage open', 20_000);
  await context.evaluate(`document.querySelector('[data-garage-car="ferrari_enzo"]').click()`);
  await context.waitFor(`document.querySelector('.garage-panel')?.textContent.includes('MEDAL REWARD')`, 'Enzo garage page', 20_000);
  const garage = await context.evaluate(`document.querySelector('.garage-panel').textContent`);
  if (!garage.includes('Ferrari Enzo') || !garage.includes('MEDAL SHEET')) throw Error('The Enzo garage page is missing its name or medal sheet.');
  await wait(500);
  await context.screenshot('enzo-garage');
  await context.evaluate(`document.querySelector('[data-action="garage-close"]').click()`);

  // Racing at Panorama Ridge against a 959, so the Enzo is the only one on track.
  const started = await context.evaluate(`(() => { const app = window.__qaApp;
    return app.startCampaign({startStage: ${PANORAMA}, mode: 'duel', car: 'ferrari_enzo', cpuDifficulty: 'easy', seed: 1989,
      rival: {car: 'stuttgart_959s', driverId: 'club', upgradeLevel: 0}}) ? true : {courses: app.profile.courses,
      access: app.courseAccessMessage, message: app.message ?? app.menuMessage ?? null, status: app.duel.state.status}; })()`);
  if (started !== true) throw Error(`The Panorama Ridge race did not start with the Enzo: ${JSON.stringify(started)}`);
  await context.waitFor(`window.__qaApp.duel.state.status === 'racing' && window.__qaApp.duel.state.stageIndex === ${PANORAMA} && window.__qaApp.visualReady !== false`,
    'racing at Panorama Ridge', 180_000);
  await context.evaluate(`(() => { window.__qaApp.keys = {ArrowUp: true}; })()`);
  await wait(6000);
  const speed = await context.evaluate(`window.__qaApp.duel.state.speedMph`);
  if (!(speed > 40)) throw Error(`The Enzo should be moving for the chase picture, speed ${speed}`);
  await context.screenshot('enzo-chase');
  await context.evaluate(`(() => { window.__qaApp.keys = {}; window.requestAnimationFrame = () => 0; window.__qaApp.stop?.(); })()`);
  await wait(500); // let the last queued game frame draw before the camera moves
  await context.evaluate(pose(5.2, 0.4, 0.9, 40));
  await wait(300);
  await context.screenshot('enzo-side');
  await context.evaluate(pose(1.6, 6.5, 1.1, 40));
  await wait(300);
  await context.screenshot('enzo-front');
  await context.evaluate(pose(0, 5.5, 0.7, 34));
  await wait(300);
  await context.screenshot('enzo-front-straight');
  await context.evaluate(pose(0.9, 3.4, 0.45, 34));
  await wait(300);
  await context.screenshot('enzo-front-close');
  await context.evaluate(pose(-4.2, -4.4, 1.3, 40));
  await wait(300);
  await context.screenshot('enzo-rear-three-quarter');
  // Damage: two front hits and one on the left, drawn by the race's own damage code.
  await context.evaluate(`(() => { const s = window.__qaApp.duel.state;
    Object.assign(s, {majorCrashes: 3, damageZones: {front: 2, rear: 0, left: 1, right: 0}}); window.__render.renderFrame(); })()`);
  await context.evaluate(pose(-2.2, 5.8, 1.1, 40));
  await wait(300);
  await context.screenshot('enzo-damaged');
}
