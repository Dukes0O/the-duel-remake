import {readFileSync} from 'node:fs';
import {WALK, WALK_LAYOUT, machineApproaches} from '../../src/lab/lab-walk.js';
// LAB-WALK: real keyboard navigation in the existing private memory-only harness.
export async function run(context) {
  await context.command('Emulation.setDeviceMetricsOverride', {width: 1440, height: 900, deviceScaleFactor: 1, mobile: false});
  await context.navigate('/tools/menu-check.html?flags=lab-2');
  await context.waitFor(`!!window.__qaApp && !document.querySelector('#start-engine')?.disabled`, 'menu ready', 90_000);
  await context.evaluate(`(() => { const app = window.__qaApp; app.audio.setMuted?.(true); app.addPlayer('Lab walking QA');
    app.profile = {...app.profile, heli: {...(app.profile.heli ?? {}), version: 1,
      lessons: {liftoff: true, hover: true, landing: true, carry: true}}}; app._saveProfile();
    document.querySelectorAll('body > details').forEach(el => { el.open = false; });
    document.querySelector('#garage-open').click(); })()`);
  await context.waitFor(`!!document.querySelector('.lab-tab')`, 'garage Lab tab');
  await context.evaluate(`document.querySelector('.lab-tab').click()`);
  const canvas = `document.querySelector('.lab-canvas')`;
  const position = `${canvas}?.dataset.labWalkPosition`;
  await context.waitFor(`${canvas}?.dataset.labWalkReady === 'true' && ${canvas}?.dataset.labBrian === 'ready'`, 'walking room and Brian', 60_000);
  const key = async (code, type) => context.command('Input.dispatchKeyEvent', {type, code, key: code.startsWith('Key') ? code.slice(3).toLowerCase() : code, windowsVirtualKeyCode: code === 'KeyE' ? 69 : undefined});
  const tap = async code => { await key(code, 'keyDown'); await key(code, 'keyUp'); };
  const walkUntil = async (code, expression, label) => {
    await key(code, 'keyDown');
    try { await context.waitFor(expression, label, 15_000); } finally { await key(code, 'keyUp'); }
    await new Promise(resolve => setTimeout(resolve, 550)); // let the gentle stop finish
  };
  const drag = async delta => {
    await context.command('Input.dispatchMouseEvent', {type: 'mousePressed', x: 720, y: 450, button: 'left', clickCount: 1});
    await context.command('Input.dispatchMouseEvent', {type: 'mouseMoved', x: 720 - delta / .003, y: 450, button: 'left', buttons: 1});
    await context.command('Input.dispatchMouseEvent', {type: 'mouseReleased', x: 720 - delta / .003, y: 450, button: 'left', clickCount: 1});
    await new Promise(resolve => setTimeout(resolve, 100));
  };
  let looking = 0;
  async function lookAt(x, z) {
    const yaw = await context.evaluate(`(() => { const p = JSON.parse(${position}); return Math.atan2(p[0] - ${x}, p[2] - ${z}); })()`);
    await drag(yaw - looking); looking = yaw;
  }
  async function lookAtBrian() {
    const b = await context.evaluate(`JSON.parse(${canvas}.dataset.labBrianPosition)`);
    await lookAt(b[0], b[1]);
  }
  await tap('KeyE');
  await context.waitFor(`!!document.querySelector('.lab-door-board')`, 'door board');
  const board = await context.evaluate(`({count: document.querySelectorAll('.lab-door-board li').length, text: document.querySelector('.lab-door-board').textContent})`);
  if (board.count !== 16 || !board.text.includes('Opens:') || !board.text.includes('Opens after driving lesson 1')) throw Error('Door board is missing lessons, rewards or lock reasons.');
  await context.screenshot('door');
  await context.evaluate(`document.querySelector('[data-lab="walk-back"]').click()`);
  await walkUntil('KeyW', `JSON.parse(${position} || '[0,0,99]')[2] < 3.6`, 'walk down the middle aisle');
  await walkUntil('KeyA', `JSON.parse(${position} || '[99]')[0] < -7.8`, 'step to the weighing pad');
  await lookAt(-8.008125, 2.84);
  try { await context.waitFor(`document.querySelector('.lab-walk-prompt')?.textContent.includes('E: use the Lift and weight bench')`, 'Lift floor prompt', 5000); }
  catch (error) { await context.screenshot('blocked-prompt'); throw Error(error.message + ': ' + await context.evaluate(`JSON.stringify({position: ${position}, brian: ${canvas}.dataset.labBrianPosition, prompt: document.querySelector('.lab-walk-prompt')?.textContent})`)); }
  await context.screenshot('machine-prompt');
  await context.screenshot('corner');
  const before = await context.evaluate(position);
  await tap('KeyE');
  await context.waitFor(`!!document.querySelector('.lab-teaching:not([hidden])')`, 'E opens the five-step Lift lesson');
  await context.screenshot('lift-bench');
  await context.evaluate(`document.querySelector('[data-teach="back"]').click()`);
  const after = await context.evaluate(position);
  if (before !== after) throw Error('Opening a bench moved the walking camera.');
  // Face Brian from the same approach, rather than moving into his old tiny range.
  await lookAtBrian();
  await context.screenshot('brian');
  await context.waitFor(`document.querySelector('.lab-walk-prompt')?.textContent === 'E: ask Brian'`, 'facing Brian beats the nearer weighing pad');
  await tap('KeyE');
  await context.waitFor(`!!document.querySelector('.lab-brian')`, 'ask Brian');
  await context.evaluate(`document.querySelector('[data-lab="brian-next"]').click()`);
  await context.waitFor(`document.querySelector('.lab-brian [role="status"]')?.textContent.includes('Try Lift and weight')`, 'Brian suggests an open lesson');
  await context.evaluate(`document.querySelector('[data-lab="brian-machine"]').click()`);
  await context.waitFor(`document.querySelector('.lab-brian [role="status"]')?.textContent.includes('weighing pad')`, 'Brian explains this machine');
  // Repeat the actual E/questions path at two other machines, not just target math.
  const manifest = JSON.parse(readFileSync(new URL('../../public/assets/models/lab/manifest.json', import.meta.url)));
  const bounds = manifest.models.filter(m => WALK_LAYOUT[m.id]).map(m => {
    const [x, z] = WALK_LAYOUT[m.id], b = m.footprint;
    return {id: m.id, minX: x + b.minX * WALK.scale, maxX: x + b.maxX * WALK.scale,
      minZ: z + b.minZ * WALK.scale, maxZ: z + b.maxZ * WALK.scale};
  });
  await context.evaluate(`window.__qaApp.profile = {...window.__qaApp.profile, drivingLessons: {version: 1, done: {corner: true}}}; window.__qaApp._saveProfile()`);
  for (const [model, id] of [['turning-arm', 'gforce'], ['bending-rig', 'strength']]) {
    await context.evaluate(`window.__qaApp.closeLab(); window.__qaApp.openLab()`);
    await context.waitFor(`${canvas}?.dataset.labWalkReady === 'true' && ${canvas}?.dataset.labBrian === 'ready'`, model + ' room');
    looking = 0;
    const at = machineApproaches(bounds.find(b => b.id === model), bounds, manifest.hall)[0];
    await walkUntil('KeyW', `JSON.parse(${position})[2] < ${at[1] + .7}`, model + ' aisle');
    await walkUntil('KeyD', `JSON.parse(${position})[0] > ${at[0] - .5}`, model + ' approach');
    await lookAt(at[0], at[1]);
    await context.waitFor(`${canvas}.dataset.labWalkTarget === 'machine'`, model + ' facing machine');
    await tap('KeyE');
    await context.waitFor(`!!document.querySelector('.lab-bench[data-lesson="${id}"]')`, model + ' bench');
    await context.evaluate(`document.querySelector('[data-lab="back"]').click()`);
    await lookAtBrian();
    await context.waitFor(`document.querySelector('.lab-walk-prompt')?.textContent === 'E: ask Brian'`, model + ' Brian prompt');
    await tap('KeyE');
    await context.waitFor(`document.querySelector('.lab-brian')?.textContent.includes('What should I try next?') && document.querySelector('.lab-brian')?.textContent.includes('Tell me about this machine.')`, model + ' two questions');
    await context.evaluate(`document.querySelector('[data-lab="brian-next"]').click()`);
    await context.waitFor(`document.querySelector('.lab-brian [role="status"]')?.textContent.includes('Try Lift and weight')`, model + ' next answer');
    await context.evaluate(`document.querySelector('[data-lab="brian-machine"]').click()`);
    await context.waitFor(`document.querySelector('.lab-brian [role="status"]')?.textContent.length > 20 && !document.querySelector('.lab-brian [role="status"]').textContent.startsWith('Try ')`, model + ' machine answer');
    await context.screenshot('brian-' + id);
  }
  await tap('Escape');
  await context.waitFor(`!window.__qaApp.labOpen && !${canvas}`, 'Esc leaves and releases the room');
  await context.evaluate(`window.__qaApp.openLab()`);
  await context.waitFor(`${canvas}?.dataset.labWalkReady === 'true'`, 'walk room reopens');
  await tap('Escape');
  await context.waitFor(`!${canvas}`, 'second room released');
  // Switch-off still uses the old board and overview, in a fresh memory-only page.
  await context.navigate('/tools/menu-check.html');
  await context.waitFor(`!!window.__qaApp && !document.querySelector('#start-engine')?.disabled`, 'off menu ready', 90_000);
  await context.evaluate(`window.__qaApp.audio.setMuted?.(true); window.__qaApp.openLab()`);
  await context.waitFor(`!!${canvas} && !!document.querySelector('.lab-board')`, 'old Lab board');
  if (await context.evaluate(`!!document.querySelector('.lab-walk-overlay') || document.querySelector('.lab-panel').classList.contains('lab-walking')`)) throw Error('lab-2 off changed the old Lab.');
  await context.evaluate(`window.__qaApp.closeLab()`);
}
