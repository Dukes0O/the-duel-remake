// Private browser check for the Lab screen (LAB-VIEW, docs/LAB.md): open the Lab from the garage, run the lift bench, pass a
// workshop challenge (the strength hook arm), buy an upgrade, and leave. Saves are memory-only. Run:
//   node tools/browser-harness.mjs scenario lab-view
import {run as runLiftLesson} from './lab-lift-2.mjs';
import {lightestArm, MATERIALS} from '../../src/lab/benches/strength.js';

const entry = '/tools/menu-check.html?flags=helicopter,lab';

export async function run(context) {
  // Complete every new Lift teaching step and launch its unchanged flight challenge.
  await runLiftLesson(context);
  await context.command('Emulation.setDeviceMetricsOverride', {width: 1280, height: 720, deviceScaleFactor: 1, mobile: false});
  await context.navigate(entry);
  await context.waitFor(`document.readyState==='complete' && !!window.__qaApp &&
    document.querySelector('#view3d')?.dataset.vehicleAsset==='ready' && !document.querySelector('#start-engine')?.disabled`,
  'menu ready', 90_000);
  // A pilot who has finished the helicopter lessons and has credits to spend.
  await context.evaluate(`(() => { const app = window.__qaApp;
    app.audio.setMuted?.(true);
    app.profile = {...app.profile, credits: 20000, heli: {...(app.profile.heli ?? {}), version: 1, fuelKg: 0,
      lessons: {liftoff: true, hover: true, landing: true, carry: true}, playDay: {last: null, count: 0}, jobs: {day: 0, taken: null, done: []},
      carsAt: {}, refuels: 0, flights: 0}};
    app._saveProfile(); })()`);

  // The Lab tab in the garage.
  await context.evaluate(`document.querySelector('#garage-open').click()`);
  await context.waitFor(`!!document.querySelector('.garage-panel .lab-tab')`, 'the Lab tab in the garage', 20_000);
  await context.evaluate(`document.querySelector('.lab-tab').click()`);
  await context.waitFor(`window.__qaApp.labOpen === true && !document.querySelector('.lab-panel').hidden && !!document.querySelector('.lab-canvas')`,
    'the Lab opens with its room', 30_000);
  // Two 3D views never run at once: with the Lab open the game's own renderer draws nothing, the Lab's canvas does.
  await context.evaluate(`(() => { for (const Context of [WebGL2RenderingContext, WebGLRenderingContext])
    for (const name of ['drawElements', 'drawArrays', 'drawElementsInstanced', 'drawArraysInstanced']) {
      const original = Context.prototype[name];
      Context.prototype[name] = function (...args) { const canvas = this.canvas; canvas.__draws = (canvas.__draws || 0) + 1; return original.apply(this, args); }; } })()`);
  await new Promise(resolve => setTimeout(resolve, 1500));
  const draws = await context.evaluate(`({main: document.querySelector('#view3d canvas').__draws || 0, lab: document.querySelector('.lab-canvas').__draws || 0})`);
  await new Promise(resolve => setTimeout(resolve, 1500));
  const later = await context.evaluate(`({main: document.querySelector('#view3d canvas').__draws || 0, lab: document.querySelector('.lab-canvas').__draws || 0})`);
  if (later.main !== draws.main) throw Error(`The game's renderer drew ${later.main - draws.main} calls while the Lab was open.`);
  if (!(later.lab > draws.lab)) throw Error('The Lab\u2019s own room is not drawing.');
  const canvas = `document.querySelector('.lab-canvas')`;
  await context.waitFor(`${canvas}?.dataset.labWalkReady === 'true'`, 'walking room ready');
  const key = (code, type) => context.command('Input.dispatchKeyEvent', {type, code, key: code === 'KeyE' ? 'e' : code.slice(3).toLowerCase()});
  const tap = async code => { await key(code, 'keyDown'); await key(code, 'keyUp'); };
  const walk = async (code, expression) => { await key(code, 'keyDown'); try { await context.waitFor(expression, code, 15_000); } finally { await key(code, 'keyUp'); } await new Promise(r => setTimeout(r, 550)); };
  await tap('KeyE');
  await context.waitFor(`!!document.querySelector('.lab-door-board')`, 'door board');
  const rows = await context.evaluate(`[...document.querySelectorAll('.lab-door-board li')].map(li => li.textContent.trim())`);
  if (!rows.some(row => row.includes('Lift and weight')) || !rows.some(row => row.includes('Strength against weight')))
    throw Error(`The board should list the lessons: ${JSON.stringify(rows)}`);
  await context.screenshot('lab-board');
  await context.evaluate(`document.querySelector('[data-lab="walk-back"]').click()`);
  // Visit the bending rig through the walking room, then pass its current bench.
  await walk('KeyW', `JSON.parse(${canvas}.dataset.labWalkPosition)[2] < -3.8`);
  await walk('KeyD', `JSON.parse(${canvas}.dataset.labWalkPosition)[0] > 2.5`);
  const yaw = await context.evaluate(`(() => { const p = JSON.parse(${canvas}.dataset.labWalkPosition); return Math.atan2(p[0] - 3.167375, p[2] + 4.721); })()`);
  await context.command('Input.dispatchMouseEvent', {type: 'mousePressed', x: 640, y: 400, button: 'left', clickCount: 1});
  await context.command('Input.dispatchMouseEvent', {type: 'mouseMoved', x: 640-yaw/.003, y: 400, button: 'left', buttons: 1});
  await context.command('Input.dispatchMouseEvent', {type: 'mouseReleased', x: 640-yaw/.003, y: 400, button: 'left', clickCount: 1});
  await context.waitFor(`document.querySelector('.lab-walk-prompt')?.textContent.includes('Strength against weight')`, 'bending rig prompt');
  await tap('KeyE');
  await context.waitFor(`!!document.querySelector('.lab-bench[data-lesson="strength"]')`, 'the strength bench', 10_000);
  // Brian's existing bench caption must still appear above the walking room.
  await context.waitFor(`(() => { const box = document.querySelector('.lab-caption').getBoundingClientRect(); const top = document.elementFromPoint(box.left + box.width / 2, box.top + box.height / 2); return !!top && !!top.closest('.lab-caption'); })()`,
    'Brian\u2019s caption shows above the canvas', 10_000);
  const arm = lightestArm();
  const material = Object.keys(MATERIALS).find(name => name === arm.material);
  await context.evaluate(`(() => { const set = (id, value) => { const el = document.querySelector('[data-lab-control="' + id + '"]'); el.value = value; el.dispatchEvent(new Event('input', {bubbles: true})); el.dispatchEvent(new Event('change', {bubbles: true})); };
    set('part', 'hook arm'); set('material', ${JSON.stringify(material)}); set('thicknessMm', ${arm.thicknessMm}); document.querySelector('[data-lab="run"]').click(); })()`);
  await context.waitFor(`window.__qaApp.profile.lab?.done?.strength === true`, 'the strength lesson passes and is saved', 10_000);
  await context.screenshot('lab-strength-passed');

  // The shop: the pass opened the Heavy hook.
  const before = await context.evaluate(`window.__qaApp.profile.credits`);
  await context.evaluate(`document.querySelector('[data-lab-tab="shop"]').click()`);
  await context.waitFor(`!!document.querySelector('[data-lab-buy="heavy-hook"]:not(:disabled)')`, 'the Heavy hook is for sale', 10_000);
  await context.evaluate(`document.querySelector('[data-lab-buy="heavy-hook"]').click()`);
  await context.waitFor(`window.__qaApp.profile.lab.owned['heavy-hook'] === true`, 'the Heavy hook is bought', 10_000);
  const after = await context.evaluate(`window.__qaApp.profile.credits`);
  if (before - after !== 2000) throw Error(`The Heavy hook should cost 2000, credits went ${before} to ${after}`);
  await context.screenshot('lab-shop');

  // Leaving takes the room down; the second visit builds it again and takes it down again.
  for (let visit = 0; visit < 2; visit++) {
    await context.evaluate(`document.querySelector('[data-lab="close"]').click()`);
    await context.waitFor(`window.__qaApp.labOpen === false && document.querySelector('.lab-panel').hidden && !document.querySelector('.lab-canvas')`,
      'the Lab closes and its canvas is released', 10_000);
    if (visit === 0) {
      await context.evaluate(`window.__qaApp.openLab()`);
      await context.waitFor(`!!document.querySelector('.lab-canvas')`, 'the Lab opens again', 30_000);
    }
  }
  console.log(`Lab view: strength passed, Heavy hook bought for ${before - after} credits`);
}
