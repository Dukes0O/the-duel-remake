// Small test lesson in the real walkable room; all careers are memory-only.
export async function run(c) {
  await c.command('Emulation.setDeviceMetricsOverride', {width: 1440, height: 900, deviceScaleFactor: 1, mobile: false});
  await c.navigate('/tools/menu-check.html?flags=lab-2&lab-lesson-example=1');
  await c.waitFor(`!!window.__qaApp && !document.querySelector('#start-engine')?.disabled`, 'menu', 90_000);
  await c.evaluate(`(() => { const a = window.__qaApp; a.audio.setMuted?.(true); a.addPlayer('Teaching QA');
    a.profile = {...a.profile, heli: {...a.profile.heli, version: 1, fuelKg: 400, lessons: {liftoff: true, hover: true, landing: true, carry: true}}}; a._saveProfile();
    document.querySelectorAll('body > details').forEach(e => e.open = false); a.openLab(); })()`);
  const canvas = `document.querySelector('.lab-canvas')`;
  await c.waitFor(`${canvas}?.dataset.labWalkReady === 'true'`, 'room', 60_000);
  const key = (code, type) => c.command('Input.dispatchKeyEvent', {type, code, key: code === 'KeyE' ? 'e' : code.slice(3).toLowerCase(), windowsVirtualKeyCode: code === 'KeyE' ? 69 : undefined});
  async function walk(code, expression) { await key(code, 'keyDown'); try { await c.waitFor(expression, code, 15_000); } finally { await key(code, 'keyUp'); } await new Promise(r => setTimeout(r, 550)); }
  await walk('KeyW', `JSON.parse(${canvas}.dataset.labWalkPosition)[2] < 3.6`);
  await walk('KeyA', `JSON.parse(${canvas}.dataset.labWalkPosition)[0] < -7.8`);
  await c.waitFor(`document.querySelector('.lab-walk-prompt')?.textContent.includes('E: use the Lift')`, 'machine');
  await key('KeyE', 'keyDown'); await key('KeyE', 'keyUp');
  const text = `document.querySelector('.lab-teaching')?.textContent`;
  const click = action => c.evaluate(`document.querySelector('[data-teach="${action}"]').click()`);
  const waitNext = () => c.waitFor(`document.querySelector('[data-teach="next"]') && !document.querySelector('[data-teach="next"]').disabled`, 'step ready');
  await c.waitFor(`${text}?.includes('Can a fan move')`, 'wonder'); await c.screenshot('wonder');
  await click('next'); await c.waitFor(`${text}?.includes('New words')`, 'words');
  await c.evaluate(`document.querySelector('.lab-teaching [data-word="push"]').dispatchEvent(new PointerEvent('pointerover', {bubbles: true}))`);
  await c.waitFor(`${text}?.includes('A push is a force')`, 'underlined meaning'); await c.screenshot('words');
  await click('meaning-close'); await click('next');
  await c.waitFor(`${text}?.includes('Watch it work')`, 'watch'); await click('pause');
  await click('step'); await c.screenshot('watch'); await click('replay');
  await waitNext(); await click('next'); await waitNext(); await click('next');
  await c.waitFor(`${text}?.includes('Where will the ball go?')`, 'prediction'); await c.screenshot('prediction');
  for (let i = 0; i < 3; i++) {
    await click('answer:near'); await click('run');
    await c.waitFor(`!!document.querySelector('[data-teach="retry"]')`, 'failure');
    if (i === 0) { await c.screenshot('hint'); if (!(await c.evaluate(`${text}.includes('The ball stopped before')`))) throw Error('First hint missing.'); }
    if (i === 1 && !(await c.evaluate(`${text}.includes('Turn the fan handle once')`))) throw Error('Plainer hint missing.');
    if (i < 2) await click('retry');
  }
  await click('show'); await waitNext(); await click('next'); await waitNext(); await click('next');
  for (let i = 0; i < 3; i++) {
    await click('answer:far'); await click('control:turn'); await click('run');
    await c.waitFor(`${text}?.includes('The ball reached the mark')`, 'success');
    await c.screenshot(i === 0 ? 'ghost' : i === 1 ? 'prompted' : 'alone'); await click('next');
  }
  await click('answer:near'); await c.waitFor(`${text}?.includes('Watch the highlighted picture')`, 'wrong check replays correct picture');
  await c.screenshot('check'); await click('next'); await click('answer:far'); await click('next');
  if (!(await c.evaluate(`window.__qaApp.profile.lab.notebook.includes('push') && !window.__qaApp.profile.lab.done.lift`))) throw Error('Notebook or reward isolation failed.');
  await click('challenge');
  await c.waitFor(`window.__qaApp.heliSession?.view().challenge?.id === 'lift' && !document.querySelector('.lab-key-idea').hidden`, 'key idea in actual flight challenge', 60_000);
  await c.screenshot('challenge');
  await c.evaluate(`window.__qaApp.returnToMenu(); window.__qaApp.openLab()`);
  await c.waitFor(`${canvas}?.dataset.labWalkReady === 'true'`, 'reopened');
  await c.evaluate(`document.querySelector('.lab-notebook-button').click()`);
  await c.waitFor(`${text}?.includes('My Lab notebook') && !!document.querySelector('[data-word="push"]')`, 'notebook after reopen');
  await c.screenshot('notebook');
  await c.evaluate(`window.__qaApp.closeLab()`);
  await c.navigate('/tools/menu-check.html?lab-lesson-example=1');
  await c.waitFor(`!!window.__qaApp && !document.querySelector('#start-engine')?.disabled`, 'off menu', 90_000);
  await c.evaluate(`window.__qaApp.audio.setMuted?.(true); window.__qaApp.openLab()`);
  await c.waitFor(`!!document.querySelector('.lab-board') && !!${canvas}`, 'old Lab');
  if (await c.evaluate(`!document.querySelector('.lab-teaching').hidden || !document.querySelector('.lab-notebook-button').hidden || !!document.querySelector('.lab-walk-overlay')`)) throw Error('Switch-off changed old Lab.');
  await c.evaluate(`window.__qaApp.closeLab()`);
}
