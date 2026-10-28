// Real input only after the memory-only profile is prepared.
export async function run(context) {
  await context.command('Emulation.setDeviceMetricsOverride', {width: 1440, height: 900, deviceScaleFactor: 1, mobile: false});
  await context.navigate('/tools/menu-check.html');
  await context.waitFor(`!!window.__qaApp && !document.querySelector('#start-engine')?.disabled`, 'menu ready', 90000);
  await context.evaluate(`(() => { const app = window.__qaApp; app.audio.setMuted?.(true); app.addPlayer('Lab navigation QA');
    app.profile = {...app.profile, heli: {version: 1, lessons: {liftoff: true, hover: true, landing: true, carry: true}},
      lab: {version: 1, done: {rust: true}}}; app._saveProfile();
    document.querySelectorAll('body > details').forEach(el => { el.open = false; }); app.openLab(); })()`);
  const canvas = `document.querySelector('.lab-canvas')`;
  await context.waitFor(`${canvas}?.dataset.labWalkReady === 'true' && ${canvas}?.dataset.labBrian === 'ready'`, 'room ready', 60000);
  const mouse = async (type, x, y) => context.command('Input.dispatchMouseEvent', {type, x, y,
    ...(type === 'mouseMoved' ? {} : {button: 'left', clickCount: 1})});
  async function click(x, y) { await mouse('mouseMoved', x, y); await mouse('mousePressed', x, y); await mouse('mouseReleased', x, y); }
  async function clickSelector(selector) {
    const p = await context.evaluate(`(() => {const r = document.querySelector(${JSON.stringify(selector)})?.getBoundingClientRect(); return r ? [r.x+r.width/2,r.y+r.height/2] : null;})()`);
    if (!p) throw Error('Missing control ' + selector);
    if (!await context.evaluate(`!!document.elementFromPoint(${p[0]},${p[1]})?.closest(${JSON.stringify(selector)})`)) throw Error('Covered control ' + selector);
    await click(...p);
  }
  const panel = `!!document.querySelector('.lab-teaching:not([hidden]), .lab-bench, .lab-machine-choice, .lab-brian, .lab-door-board')`;
  async function closePanel() {
    const selector = await context.evaluate(`document.querySelector('.lab-teaching:not([hidden])') ? '[data-teach="back"]' : document.querySelector('[data-lab="walk-back"]') ? '[data-lab="walk-back"]' : '[data-lab="back"]'`);
    await clickSelector(selector);
    await context.waitFor(`!(${panel})`, 'back in walking room');
  }
  async function arrive(key, opens = true) {
    try { await context.waitFor(`${canvas}.dataset.labWalkArrived === ${JSON.stringify(key)} ${opens ? '&& ('+panel+')' : ''}`, 'arrive ' + key, 45000); }
    catch (error) {
      await context.screenshot('blocked-' + key);
      throw Error(error.message + ': ' + await context.evaluate(`JSON.stringify({data: {...${canvas}.dataset}, hover: document.querySelector('.lab-walk-hover')?.textContent, panel: ${panel}})`));
    }
  }
  const machines = await context.evaluate(`Array.from(document.querySelectorAll('.lab-map-dot'), b => b.dataset.go)`);
  if (machines.length !== 12) throw Error('Map needs all twelve physical machines');
  if (!await context.evaluate(`document.querySelector('[data-go="nail-jars"]').textContent.includes('✓')`)) throw Error('Passed machine has no map tick');
  // Map travel crosses the room repeatedly. Then click the actual highlighted object.
  async function worldClick(key) {
    const r = await context.evaluate(`(() => {const r=${canvas}.getBoundingClientRect(); return {x:r.x,y:r.y,width:r.width,height:r.height};})()`);
    for (const fy of [.5,.65,.8,.35,.2,.9,.1]) for (const fx of [.5,.4,.6,.3,.7,.2,.8]) {
      const x=r.x+r.width*fx, y=r.y+r.height*fy;
      if (x < r.x+265 && y < r.y+255) continue; // map covers this part of the canvas
      await mouse('mouseMoved',x,y);
      if (await context.evaluate(`${canvas}.dataset.labWalkSelected === ${JSON.stringify(key)}`)) {
        // Right after a lesson closes the room is still settling for a moment. Click only a spot that still names the
        // object once it has settled, so the click goes where the player would see the highlight.
        await new Promise(r => setTimeout(r, 400));
        await mouse('mouseMoved',x,y);
        if (!await context.evaluate(`${canvas}.dataset.labWalkSelected === ${JSON.stringify(key)}`)) continue;
        if (!await context.evaluate(`document.querySelector('.lab-walk-hover').textContent.length > 8`)) throw Error('Missing hover name');
        await click(x,y); return;
      }
    }
    await context.screenshot('missing-' + key); throw Error('Could not point at ' + key);
  }
  for (const key of machines) {
    console.log('Click navigation: ' + key);
    await clickSelector(`[data-go="${key}"]`); await arrive(key); await closePanel();
    await worldClick(key); await arrive(key); await closePanel();
  }
  for (const key of ['corner-0','corner-1','corner-2','corner-3','brian','board']) {
    console.log('Click navigation: ' + key);
    const opens = !key.startsWith('corner-');
    await clickSelector(`[data-go="${key}"]`); await arrive(key, opens);
    if (opens) await closePanel();
    await worldClick(key); await arrive(key, opens);
    if (opens) await closePanel();
  }
  await context.screenshot('click-navigation');
  // A genuine drag must not enqueue a click or move the walker.
  const before = await context.evaluate(`${canvas}.dataset.labWalkPosition`);
  await mouse('mousePressed',800,450); await mouse('mouseMoved',860,430); await mouse('mouseReleased',860,430);
  await new Promise(r=>setTimeout(r,350));
  if (before !== await context.evaluate(`${canvas}.dataset.labWalkPosition`)) throw Error('Drag started walking');
  // Fresh room, keyboard only. Normal panel buttons are reached with Tab and Enter.
  await context.evaluate(`window.__qaApp.closeLab()`);
  await context.waitFor(`!${canvas}`, 'room disposed');
  await context.evaluate(`window.__qaApp.openLab()`);
  await context.waitFor(`${canvas}?.dataset.labWalkReady === 'true' && ${canvas}?.dataset.labBrian === 'ready'`, 'keyboard room ready');
  async function key(code, shift = false) {
    for (const type of ['keyDown','keyUp']) await context.command('Input.dispatchKeyEvent', {type, code, key: code, modifiers: shift ? 8 : 0,
      windowsVirtualKeyCode: code === 'Tab' ? 9 : 13,
      ...(code === 'Enter' && type === 'keyDown' ? {text: '\r', unmodifiedText: '\r'} : {})});
  }
  await key('Tab',true);
  if (await context.evaluate(`${canvas}.dataset.labWalkSelected`) !== machines.at(-1)) throw Error('Shift+Tab must wrap backwards');
  await key('Tab');
  for (let i=0; i<machines.length; i++) {
    console.log('Keyboard navigation: ' + machines[i]);
    if (await context.evaluate(`${canvas}.dataset.labWalkSelected`) !== machines[i]) throw Error('Tab order '+i);
    await key('Enter'); await arrive(machines[i]);
    // The walking controller must release Tab while a panel owns focus.
    let focusedBack = false;
    for (let t=0;t<35;t++) {
      focusedBack = await context.evaluate(`document.activeElement?.matches('[data-teach="back"], [data-lab="back"], [data-lab="walk-back"]')`);
      if (focusedBack) break;
      await key('Tab');
    }
    if (!focusedBack) throw Error('Cannot reach panel Back with Tab');
    await key('Enter');
    try { await context.waitFor(`!(${panel})`, 'keyboard closes panel'); }
    catch (error) {
      await context.screenshot('keyboard-blocked');
      throw Error(error.message + ': ' + await context.evaluate(`JSON.stringify({focus: document.activeElement?.outerHTML, text: document.querySelector('.lab-teaching:not([hidden]), .lab-bench, .lab-machine-choice')?.textContent})`));
    }
    await key('Tab');
  }
  await context.screenshot('keyboard-navigation');
  await context.evaluate(`window.__qaApp.closeLab()`);
}
