import assert from 'node:assert/strict';

// Each page expression is self-contained and can be checked without a browser.
export const page = {
  ready: `(() => !!window.__qaApp && !!Object.getOwnPropertyDescriptor(window, 'localStorage')?.value && window.name.startsWith('__duel_qa_tab_v2:'))()`,
  enter: `(() => { const app = window.__qaApp; app.stop();
    if (!app.addPlayer('The Dig test').ok) throw Error('Could not create the memory-only player');
    app.profile = {...app.profile, wasteland:{...app.profile.wasteland, discoveredGate:true}};
    if (!app._saveProfile() || !app.visitWasteland()) throw Error('Could not enter the yard');
    app.advance(8); app.onFrame?.(app.duel.state); return true; })()`,
  yard: `(() => window.__qaApp.isYardHomeActive() && !!document.querySelector('[data-action="yard-the-dig"]') && !document.querySelector('[data-action="yard-the-town"]'))()`,
  frame: `(() => new Promise(resolve => requestAnimationFrame(resolve)))()`,
  pictureFrame: `(() => new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))))()`,
  storage: `(() => JSON.stringify(Object.keys(localStorage).sort().map(key => [key, localStorage.getItem(key)])))()`,
  open: `(() => { document.querySelector('[data-action="yard-the-dig"]').click(); return true; })()`,
  loaded: `(() => !!document.querySelector('.the-dig-machine')?.textContent.includes('EXCAVATOR'))()`,
  controls: `(() => !document.querySelector('.the-dig-controls')?.hidden && document.querySelector('.the-dig-control-content')?.textContent.includes('Space digs'))()`,
  modelReady: `(() => !!document.querySelector('.the-dig')?.digForCheck)()`,
  modelFailed: `(() => document.querySelector('.the-dig').digForCheck.failed)()`,
  excavated: `(() => document.querySelector('.the-dig').digForCheck.simulation.excavatedM3 > .3)()`,
  loadedTruck: `(() => document.querySelector('.the-dig').digForCheck.simulation.loadedM3 > 0)()`,
  truck: `(() => document.querySelector('.the-dig').digForCheck.simulation.activeMachine === 'dumpTruck')()`,
  tipped: `(() => document.querySelector('.the-dig').digForCheck.simulation.tippedM3 > 0)()`,
  trencher: `(() => document.querySelector('.the-dig').digForCheck.simulation.activeMachine === 'trencher')()`,
  ditch: `(() => document.querySelector('.the-dig').digForCheck.simulation.trencher.cutVolumeM3 > 4)()`,
  borer: `(() => !!document.querySelector('.the-dig-machine')?.textContent.includes('MABEL'))()`,
  atFace: `(() => document.querySelector('.the-dig').digForCheck.viewForCheck.readyToWork)()`,
  cut: `(() => parseFloat(document.querySelector('.the-dig-load')?.textContent) > 0)()`,
  // The game gives each frame at most 0.1 s of simulated time, so a slow software-drawn page moves less than the wall clock
  // says. This clock adds up the same clamped frame times; holds and waits are measured on it, not on the wall clock.
  simClock: `(() => { if (!window.__digSimClock) { const clock = window.__digSimClock = {seconds: 0, frames: 0, started: performance.now()};
    let last = performance.now(); const tick = now => { clock.seconds += Math.min(.1, (now - last) / 1000); clock.frames++; last = now; requestAnimationFrame(tick); };
    requestAnimationFrame(tick); } return true; })()`,
  simSeconds: `(() => window.__digSimClock.seconds)()`,
  slowdown: `(() => { const clock = window.__digSimClock, real = (performance.now() - clock.started) / 1000; return real > 0 ? Math.max(1, real / Math.max(clock.seconds, .001)) : 1; })()`,
  returned: `(() => !document.querySelector('.the-dig') && window.__qaApp.isYardHomeActive())()`,
};

const key = (context, code, type) => {
  const expression = `(() => { document.dispatchEvent(new KeyboardEvent(${JSON.stringify(type)}, {code:${JSON.stringify(code)}, bubbles:true, cancelable:true})); })()`;
  new Function(expression);
  return context.evaluate(expression);
};
const picture = async (context, name) => {
  await context.evaluate(page.pictureFrame);
  await context.screenshot(name);
};
async function press(context, code) {
  await key(context, code, 'keydown');
  await context.evaluate(page.frame);
  await key(context, code, 'keyup');
}
// Waits are stretched by how much slower than real time the page simulates (1 on a fast page).
let slowdown = 1;
const stretch = milliseconds => Math.round(milliseconds * slowdown);
const waitFor = (context, expression, label, timeout) => context.waitFor(expression, label, stretch(timeout));
async function hold(context, code, milliseconds) {
  await key(context, code, 'keydown');
  try {
    const start = await context.evaluate(page.simSeconds);
    await context.waitFor(`(() => window.__digSimClock.seconds >= ${start + milliseconds / 1000})()`, `${code} held for ${milliseconds} ms of game time`, stretch(milliseconds) + 30000);
  } finally { await key(context, code, 'keyup'); }
}

async function holdUntil(context, code, expression, label, timeout) {
  await key(context, code, 'keydown');
  try { await waitFor(context, expression, label, timeout); }
  finally { await key(context, code, 'keyup'); }
}

export async function run(context) {
  await context.navigate('/tools/menu-check.html?flags=the-dig');
  await waitFor(context, page.ready, 'isolated test game', 60000);
  await context.evaluate(page.enter);
  await waitFor(context, page.yard, 'The Dig button without the town', 60000);
  await picture(context, 'the-dig-yard');
  const before = await context.evaluate(page.storage);
  await context.evaluate(page.open);
  await waitFor(context, page.loaded, 'excavator ready', 60000);
  assert.ok(await context.evaluate(page.controls), 'the opening view shows the excavator controls');
  await picture(context, 'the-dig-excavator-ready');
  await waitFor(context, page.modelReady, 'machine yard loaded', 60000);
  await context.evaluate(page.simClock);
  await context.waitFor(`(() => window.__digSimClock.frames >= 5)()`, 'a few drawn frames', 60000);
  slowdown = await context.evaluate(page.slowdown);
  assert.equal(await context.evaluate(page.modelFailed), false, 'the machine and Dome models load');
  await hold(context, 'KeyD', 2100); await picture(context, 'the-dig-swing-to-heap');
  await hold(context, 'KeyS', 1100); await picture(context, 'the-dig-lowered');
  await press(context, 'KeyC'); await picture(context, 'the-dig-cab');
  await press(context, 'KeyC'); await picture(context, 'the-dig-work-view');
  await press(context, 'KeyC');
  await key(context, 'Space', 'keydown');
  await waitFor(context, page.excavated, 'excavator dug dirt', 30000);
  await key(context, 'Space', 'keyup'); await picture(context, 'the-dig-excavated');
  await hold(context, 'KeyW', 700); await hold(context, 'KeyA', 4200); await picture(context, 'the-dig-swing-to-truck');
  await press(context, 'KeyE'); await waitFor(context, page.loadedTruck, 'truck loaded from bucket', 10000);
  await press(context, 'KeyQ'); await waitFor(context, page.truck, 'dump truck selected', 3000);
  await picture(context, 'the-dig-truck-loaded');
  await press(context, 'KeyC'); await picture(context, 'the-dig-truck-cab');
  await press(context, 'KeyC'); await press(context, 'KeyC');
  await hold(context, 'KeyW', 1500); await press(context, 'Tab'); await key(context, 'Space', 'keydown');
  await waitFor(context, page.tipped, 'truck tipped a heap', 30000);
  await picture(context, 'the-dig-bed-lifted'); await key(context, 'Space', 'keyup');
  await picture(context, 'the-dig-truck-tipped');
  await press(context, 'KeyQ'); await waitFor(context, page.trencher, 'trencher selected', 3000);
  await press(context, 'Tab'); await key(context, 'KeyW', 'keydown'); await key(context, 'Space', 'keydown');
  await waitFor(context, page.ditch, 'trencher cut a ditch', 60000);
  await key(context, 'Space', 'keyup'); await key(context, 'KeyW', 'keyup');
  await picture(context, 'the-dig-trencher-ditch');
  await press(context, 'KeyC'); await picture(context, 'the-dig-trencher-cab');
  await press(context, 'KeyC'); await press(context, 'KeyC');
  for (const name of ['drill', 'dozer']) {
    await press(context, 'KeyQ');
    await press(context, 'KeyC'); await picture(context, `the-dig-${name}-cab`);
    await press(context, 'KeyC'); await press(context, 'KeyC');
  }
  await press(context, 'KeyQ');
  await waitFor(context, page.borer, 'Mabel selected', 10000);
  await press(context, 'KeyC'); await picture(context, 'the-dig-mabel-cab');
  await press(context, 'KeyC');
  await holdUntil(context, 'KeyW', page.atFace, 'Mabel reaches the rock', 90000);
  await press(context, 'Tab');
  await holdUntil(context, 'KeyW', page.cut, 'Mabel cut rock', 60000);
  await picture(context, 'the-dig-borer-cut');
  await press(context, 'Escape');
  await waitFor(context, page.returned, 'back in the yard', 5000);
  await picture(context, 'the-dig-returned-to-yard');
  assert.equal(await context.evaluate(page.storage), before, 'the saved profile is unchanged after operating the machines');
}
