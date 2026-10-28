// Private browser check for the Lab screen (LAB-VIEW, docs/LAB.md): take the Lift lesson, then the Strength lesson
// and its challenge (the hook arm), buy an upgrade, and leave. Saves are memory-only. Run:
//   node tools/browser-harness.mjs scenario lab-view
import {run as runLiftLesson} from './lab-lift-2.mjs';
import * as strength from '../../src/lab/lessons/strength-lesson.js';

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
  // Strength teaches on the five-step lesson frame: its own lesson opens and no old bench panel does.
  await context.waitFor(`!document.querySelector('.lab-teaching')?.hidden && document.querySelector('.lab-teaching').textContent.includes(${JSON.stringify(strength.definition.wonder.text)})`, 'the strength lesson', 30_000);
  if (await context.evaluate(`!!document.querySelector('.lab-bench')`)) throw Error('The old bench panel opened beside the strength lesson.');
  // The lesson panel (which replaces the old bench caption) must show above the walking room, not behind the canvas.
  await context.waitFor(`(() => { const box = document.querySelector('.lab-teaching').getBoundingClientRect(); const top = document.elementFromPoint(box.left + box.width / 2, box.top + box.height / 2); return !!top && !!top.closest('.lab-teaching'); })()`,
    'the lesson panel shows above the canvas', 10_000);
  const text = `document.querySelector('.lab-teaching')?.textContent`;
  const click = action => context.evaluate(`document.querySelector('[data-teach="${action}"]').click()`);
  const ready = () => context.waitFor(`!!document.querySelector('[data-teach="next"]') && !document.querySelector('[data-teach="next"]').disabled`, 'step ready', 45_000);
  const control = async id => {
    await context.waitFor(`JSON.parse(${canvas}.dataset.labLessonControls ?? '[]').some(p => p.id === '${id}')`, `control ${id}`);
    return context.evaluate(`(() => { const el = ${canvas}, b = el.getBoundingClientRect(), p = JSON.parse(el.dataset.labLessonControls).find(p => p.id === '${id}'); return {x: b.left + p.x, y: b.top + p.y}; })()`);
  };
  const touch = async id => {
    const p = await control(id);
    await context.command('Input.dispatchMouseEvent', {type: 'mousePressed', button: 'left', clickCount: 1, ...p});
    await context.command('Input.dispatchMouseEvent', {type: 'mouseReleased', button: 'left', clickCount: 1, ...p});
  };
  const dragThickness = async () => {
    const p = await control('thicknessMm'), y = p.y - (50 - 30) / (120 - 5) * 180;
    await context.command('Input.dispatchMouseEvent', {type: 'mousePressed', button: 'left', clickCount: 1, ...p});
    await context.command('Input.dispatchMouseEvent', {type: 'mouseMoved', x: p.x, y, button: 'left', buttons: 1});
    await context.command('Input.dispatchMouseEvent', {type: 'mouseReleased', x: p.x, y, button: 'left', clickCount: 1});
  };
  // Take the real lesson: wonder, new words, watch it work, three tries, two checks, then the unchanged bench challenge.
  const d = strength.definition;
  await new Promise(resolve => setTimeout(resolve, 1800)); await click('next');
  for (const row of d.words) { await context.waitFor(`document.querySelector('.lab-teaching h4')?.textContent === ${JSON.stringify(row.word)}`, row.word); await click('next'); }
  for (let i = 0; i < d.worked.length; i++) { await ready(); await click('next'); }
  await context.waitFor(`!!document.querySelector('[data-teach="answer:holds"]')`, 'prediction');
  await click('answer:holds'); await click('run');
  await context.waitFor(`!!document.querySelector('[data-teach="retry"]')`, 'failed try and its hint', 35_000); await click('retry');
  for (let index = 0; index < 3; index++) {
    await click('answer:holds'); await touch('part'); await touch('materialDial'); await dragThickness();
    await context.waitFor(`JSON.parse(${canvas}.dataset.workshopDrawing).input.material === 'carbon fibre' && Math.abs(JSON.parse(${canvas}.dataset.workshopDrawing).input.thicknessMm - 50) < .01`, 'real material dial and thickness handle');
    await click('run'); await ready(); await click('next');
  }
  for (const q of d.checks) {
    await click(`answer:${q.answers.find(a => a.id !== q.correct).id}`);
    await context.waitFor(`${text}.includes('Watch the highlighted picture.')`, 'wrong check replays the right picture'); await click('next');
  }
  if (await context.evaluate(`window.__qaApp.profile.lab?.done?.strength === true`)) throw Error('The lesson alone must not pass the challenge.');
  await context.command('Input.dispatchMouseEvent', {type: 'mouseMoved', x: 2, y: 2});
  await click('challenge');
  await context.waitFor(`${text}.includes('Challenge') && !!document.querySelector('[data-teach="answer:holds"]')`, 'inline challenge');
  await click('answer:holds'); await touch('part'); await touch('materialDial'); await dragThickness();
  await click('run'); await context.waitFor(`!!document.querySelector('[data-teach="finish"]')`, 'bench goal met');
  await click('finish');
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
