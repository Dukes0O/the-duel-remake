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
  await tap('KeyE');
  await context.waitFor(`!!document.querySelector('.lab-door-board')`, 'door board');
  const board = await context.evaluate(`({count: document.querySelectorAll('.lab-door-board li').length, text: document.querySelector('.lab-door-board').textContent})`);
  if (board.count !== 16 || !board.text.includes('Opens:') || !board.text.includes('Opens after driving lesson 1')) throw Error('Door board is missing lessons, rewards or lock reasons.');
  await context.screenshot('door');
  await context.evaluate(`document.querySelector('[data-lab="walk-back"]').click()`);
  await walkUntil('KeyW', `JSON.parse(${position} || '[0,0,99]')[2] < 3.6`, 'walk down the middle aisle');
  await walkUntil('KeyA', `JSON.parse(${position} || '[99]')[0] < -7.8`, 'step to the weighing pad');
  await context.waitFor(`document.querySelector('.lab-walk-prompt')?.textContent.includes('E: use the Lift and weight bench')`, 'Lift floor prompt');
  await context.screenshot('machine-prompt');
  await context.screenshot('corner');
  const before = await context.evaluate(position);
  await tap('KeyE');
  await context.waitFor(`!!document.querySelector('.lab-bench[data-lesson="lift"]')`, 'E opens the existing Lift bench');
  await context.screenshot('lift-bench');
  await context.evaluate(`document.querySelector('[data-lab="back"]').click()`);
  const after = await context.evaluate(position);
  if (before !== after) throw Error('Opening a bench moved the walking camera.');
  // Photograph the standing figure from a readable distance, using mouse drag to look at him.
  await walkUntil('KeyA', `JSON.parse(${position} || '[99]')[0] < -8.7`, 'step back for Brian’s picture');
  const yaw = await context.evaluate(`(() => { const p = JSON.parse(${position}), b = JSON.parse(${canvas}.dataset.labBrianPosition); return Math.atan2(p[0] - b[0], p[2] - b[1]); })()`);
  const drag = async delta => {
    await context.command('Input.dispatchMouseEvent', {type: 'mousePressed', x: 720, y: 450, button: 'left', clickCount: 1});
    await context.command('Input.dispatchMouseEvent', {type: 'mouseMoved', x: 720 - delta / .003, y: 450, button: 'left', buttons: 1});
    await context.command('Input.dispatchMouseEvent', {type: 'mouseReleased', x: 720 - delta / .003, y: 450, button: 'left', clickCount: 1});
    await new Promise(resolve => setTimeout(resolve, 100));
  };
  await drag(yaw);
  await context.screenshot('brian');
  await drag(-yaw);
  await walkUntil('KeyD', `JSON.parse(${position} || '[-99]')[0] > -6.4`, 'walk over to Brian');
  await context.waitFor(`${canvas}?.dataset.labWalkTarget === 'brian'`, 'Brian is beside the last machine');
  await tap('KeyE');
  await context.waitFor(`!!document.querySelector('.lab-brian')`, 'ask Brian');
  await context.evaluate(`document.querySelector('[data-lab="brian-next"]').click()`);
  await context.waitFor(`document.querySelector('.lab-brian [role="status"]')?.textContent.includes('Try Lift and weight')`, 'Brian suggests an open lesson');
  await context.evaluate(`document.querySelector('[data-lab="brian-machine"]').click()`);
  await context.waitFor(`document.querySelector('.lab-brian [role="status"]')?.textContent.includes('weighing pad')`, 'Brian explains this machine');
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
