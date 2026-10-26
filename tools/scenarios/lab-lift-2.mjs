// The real lesson, real 3D inputs, isolated memory-only career.
export async function run(c) {
  await c.command('Emulation.setDeviceMetricsOverride', {width: 1440, height: 900, deviceScaleFactor: 1, mobile: false});
  await c.navigate('/tools/menu-check.html');
  await c.waitFor(`!!window.__qaApp && !document.querySelector('#start-engine')?.disabled`, 'menu', 90_000);
  await c.evaluate(`(() => { const a = window.__qaApp; a.audio.setMuted?.(true); a.addPlayer('Lift QA');
    a.profile = {...a.profile, heli: {...a.profile.heli, version: 1, fuelKg: 400, lessons: {liftoff: true, hover: true, landing: true, carry: true}}}; a._saveProfile();
    document.querySelectorAll('body > details').forEach(e => e.open = false); a.openLab(); })()`);
  const canvas = `document.querySelector('.lab-canvas')`;
  await c.waitFor(`${canvas}?.dataset.labWalkReady === 'true' && ${canvas}?.dataset.labBrian === 'ready'`, 'room and Brian', 60_000);
  const key = (code, type) => c.command('Input.dispatchKeyEvent', {type, code, key: code === 'KeyE' ? 'e' : code.startsWith('Arrow') ? code : code.slice(3).toLowerCase()});
  async function walk(code, expression) { await key(code, 'keyDown'); try { await c.waitFor(expression, code, 15_000); } finally { await key(code, 'keyUp'); } await new Promise(r => setTimeout(r, 550)); }
  await walk('KeyW', `JSON.parse(${canvas}.dataset.labWalkPosition)[2] < 3.6`);
  await walk('KeyA', `JSON.parse(${canvas}.dataset.labWalkPosition)[0] < -7.8`);
  const yaw = await c.evaluate(`(() => { const p = JSON.parse(${canvas}.dataset.labWalkPosition); return Math.atan2(p[0] + 8.008125, p[2] - 2.84); })()`);
  await c.command('Input.dispatchMouseEvent', {type: 'mousePressed', x: 720, y: 450, button: 'left', clickCount: 1});
  await c.command('Input.dispatchMouseEvent', {type: 'mouseMoved', x: 720 - yaw / .003, y: 450, button: 'left', buttons: 1});
  await c.command('Input.dispatchMouseEvent', {type: 'mouseReleased', x: 720 - yaw / .003, y: 450, button: 'left', clickCount: 1});
  await c.waitFor(`document.querySelector('.lab-walk-prompt')?.textContent.includes('E: use the Lift')`, 'face the Lift machine');
  await key('KeyE', 'keyDown'); await key('KeyE', 'keyUp');
  const text = `document.querySelector('.lab-teaching')?.textContent`;
  const click = action => c.evaluate(`document.querySelector('[data-teach="${action}"]').click()`);
  async function ready() {
    try { await c.waitFor(`!!document.querySelector('[data-teach="next"]') && !document.querySelector('[data-teach="next"]').disabled`, 'step ready', 40_000); }
    catch (error) { await c.screenshot('blocked-step'); throw Error(error.message + ': ' + await c.evaluate(text)); }
  }
  try { await c.waitFor(`${canvas}.dataset.labLiftModel === 'ready'`, 'Kestrel', 60_000); }
  catch (error) { await c.screenshot('blocked-model'); throw Error(error.message + ': ' + await c.evaluate(`${canvas}.dataset.labLiftModel + ' / ' + ${text}`)); }
  await c.waitFor(`${text}?.includes("Why?")`, 'wonder'); await c.screenshot('wonder');
  await click('next');
  for (const word of ['Rotor', 'Weight', 'Lift', 'Collective', 'Hover']) {
    await c.waitFor(`document.querySelector('.lab-teaching h4')?.textContent === '${word}'`, word);
    await new Promise(r => setTimeout(r, word === 'Collective' ? 4500 : 1200));
    await c.screenshot(`word-${word.toLowerCase()}`);
    if (word === 'Collective') await c.screenshot('collective-close-up');
    await click('next');
  }
  for (const name of ['watch-ramp', 'watch-hover', 'watch-car', 'watch-heavy']) {
    await ready(); await c.screenshot(name); await click('next');
  }
  await c.waitFor(`${text}?.includes('Will she lift off')`, 'prediction'); await c.screenshot('prediction');
  if (!(await c.evaluate(`[...document.querySelectorAll('[data-lift-label]')].every(el => el.hidden)`))) throw Error('Prediction has floating 3D labels.');
  async function target(id) {
    await c.waitFor(`JSON.parse(${canvas}.dataset.labLessonControls ?? '[]').some(p => p.id === '${id}')`, 'visible machine control');
    return c.evaluate(`(() => { const el = ${canvas}, b = el.getBoundingClientRect(), p = JSON.parse(el.dataset.labLessonControls).find(p => p.id === '${id}'); return {x: b.left + p.x, y: b.top + p.y}; })()`);
  }
  async function touch(id) {
    const p = await target(id);
    const before = await c.evaluate(`JSON.parse(${canvas}.dataset.labLiftLoad)['${id}']`);
    await c.command('Input.dispatchMouseEvent', {type: 'mousePressed', button: 'left', clickCount: 1, ...p});
    await c.command('Input.dispatchMouseEvent', {type: 'mouseReleased', button: 'left', clickCount: 1, ...p});
    try { await c.waitFor(`JSON.parse(${canvas}.dataset.labLiftLoad)['${id}'] !== ${before}`, `3D ${id} changed`, 5000); }
    catch (error) { await c.screenshot('load-inputs'); throw Error(error.message + ': ' + await c.evaluate(`${canvas}.dataset.labLiftLoad + ' / ' + ${text}`)); }
  }
  // Drag the actual lever, then lower it with a held key.
  await click('answer:hover');
  const p = await target('collective');
  await c.command('Input.dispatchMouseEvent', {type: 'mousePressed', button: 'left', clickCount: 1, ...p});
  await c.command('Input.dispatchMouseEvent', {type: 'mouseMoved', button: 'left', buttons: 1, x: p.x, y: p.y - 120});
  await c.command('Input.dispatchMouseEvent', {type: 'mouseReleased', button: 'left', clickCount: 1, x: p.x, y: p.y - 120});
  await c.waitFor(`JSON.parse(${canvas}.dataset.labLiftLoad).collective > .55`, 'dragged lever');
  await key('ArrowDown', 'keyDown');
  await c.waitFor(`JSON.parse(${canvas}.dataset.labLiftLoad).collective < .35`, 'held Down');
  await key('ArrowDown', 'keyUp');
  // First fail deliberately, exercising the kilogram hint.
  await click('run'); await c.waitFor(`!!document.querySelector('[data-teach="retry"]')`, 'hint'); await c.screenshot('hint');
  if (!(await c.evaluate(`/[0-9]+ kg/.test(${text})`))) throw Error('Hint has no kilogram change.');
  await click('retry');
  // The model carries the force numbers; use them to hold the actual key
  // until the arrows match, without reaching into a teaching session.
  async function balance() {
    await click('answer:hover');
    await key('ArrowDown', 'keyDown');
    await c.waitFor(`JSON.parse(${canvas}.dataset.labLiftLoad).collective <= .001`, 'lever lowered');
    await key('ArrowDown', 'keyUp');
    const l = await c.evaluate(`JSON.parse(${canvas}.dataset.labLiftLoad)`);
    // Runtime values supplied by the same pure module during QA; no hand-kept
    // copy of helicopter numbers in the browser scenario.
    const {padForces, PAD} = await import('../../src/lab/benches/lift-pad.js');
    const desired = padForces(l, PAD.hoverHeight).hoverCollective;
    const p = await target('collective');
    await c.command('Input.dispatchMouseEvent', {type: 'mousePressed', button: 'left', clickCount: 1, ...p});
    await c.command('Input.dispatchMouseEvent', {type: 'mouseMoved', button: 'left', buttons: 1, x: p.x, y: p.y - desired * 180});
    await c.command('Input.dispatchMouseEvent', {type: 'mouseReleased', button: 'left', clickCount: 1, x: p.x, y: p.y - desired * 180});
    await c.waitFor(`Math.abs(JSON.parse(${canvas}.dataset.labLiftLoad).collective - ${desired}) < .0001`, 'matching arrows');
  }
  await balance(); await click('run');
  await c.waitFor(`${text}?.includes('held a hover')`, 'guided hover'); await c.screenshot('guided'); await click('next');
  await balance(); await click('run');
  await c.waitFor(`${text}?.includes('held a hover')`, 'prompted hover'); await c.screenshot('prompted'); await click('next');
  // Load using real objects. Button access is also covered by the two hover tries.
  await click('answer:down');
  await touch('fuel'); await touch('fuel');
  await c.waitFor(`JSON.parse(${canvas}.dataset.labLiftLoad).fuel === 100`, 'fuel can transfer');
  await touch('fuel'); await touch('fuel'); await touch('fuel');
  await touch('car'); await touch('crates'); await touch('crates'); await touch('crates');
  await c.waitFor(`JSON.parse(${canvas}.dataset.labLiftLoad).car === 1 && JSON.parse(${canvas}.dataset.labLiftLoad).crates === 3`, 'real load objects');
  await key('ArrowUp', 'keyDown'); await c.waitFor(`JSON.parse(${canvas}.dataset.labLiftLoad).collective === 1`, 'full collective'); await key('ArrowUp', 'keyUp');
  await click('run'); await c.waitFor(`${text}?.includes('lighten it')`, 'alone overload'); await c.screenshot('alone'); await click('next');
  for (let i = 0; i < 2; i++) {
    await c.waitFor(`${text}?.includes('Which one can hover')`, 'check'); await c.screenshot(`check-${i}`);
    await click(i === 0 ? 'answer:a' : 'answer:c'); await c.screenshot(`check-answer-${i}`); await click('next');
  }
  if (!(await c.evaluate(`window.__qaApp.profile.lab.notebook.includes('lift-collective') && !window.__qaApp.profile.lab.done.lift`))) throw Error('Teaching changed rewards or missed vocabulary.');
  await click('challenge');
  await c.waitFor(`window.__qaApp.heliSession?.view().challenge?.id === 'lift' && !document.querySelector('.lab-key-idea').hidden`, 'real flight challenge', 60_000);
  await c.screenshot('challenge');
  await c.evaluate(`window.__qaApp.returnToMenu()`);
}
