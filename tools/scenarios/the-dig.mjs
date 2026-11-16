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
  cut: `(() => parseFloat(document.querySelector('.the-dig-load')?.textContent) > 0)()`,
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
async function hold(context, code, milliseconds) {
  await key(context, code, 'keydown');
  try { await new Promise(resolve => setTimeout(resolve, milliseconds)); }
  finally { await key(context, code, 'keyup'); }
}

export async function run(context) {
  await context.navigate('/tools/menu-check.html?flags=the-dig');
  await context.waitFor(page.ready, 'isolated test game', 60000);
  await context.evaluate(page.enter);
  await context.waitFor(page.yard, 'The Dig button without the town', 60000);
  await picture(context, 'the-dig-yard');
  const before = await context.evaluate(page.storage);
  await context.evaluate(page.open);
  await context.waitFor(page.loaded, 'excavator ready', 60000);
  assert.ok(await context.evaluate(page.controls), 'the opening view shows the excavator controls');
  await picture(context, 'the-dig-excavator-ready');
  await context.waitFor(page.modelReady, 'machine yard loaded', 60000);
  assert.equal(await context.evaluate(page.modelFailed), false, 'the machine and Dome models load');
  await hold(context, 'KeyD', 2100); await picture(context, 'the-dig-swing-to-heap');
  await hold(context, 'KeyS', 1100); await picture(context, 'the-dig-lowered');
  await press(context, 'KeyC'); await picture(context, 'the-dig-cab');
  await press(context, 'KeyC'); await picture(context, 'the-dig-work-view');
  await press(context, 'KeyC');
  await key(context, 'Space', 'keydown');
  await context.waitFor(page.excavated, 'excavator dug dirt', 30000);
  await key(context, 'Space', 'keyup'); await picture(context, 'the-dig-excavated');
  await hold(context, 'KeyW', 700); await hold(context, 'KeyA', 4200); await picture(context, 'the-dig-swing-to-truck');
  await press(context, 'KeyE'); await context.waitFor(page.loadedTruck, 'truck loaded from bucket', 10000);
  await press(context, 'KeyQ'); await context.waitFor(page.truck, 'dump truck selected', 3000);
  await picture(context, 'the-dig-truck-loaded');
  await hold(context, 'KeyW', 1500); await press(context, 'Tab'); await key(context, 'Space', 'keydown');
  await context.waitFor(page.tipped, 'truck tipped a heap', 30000);
  await picture(context, 'the-dig-bed-lifted'); await key(context, 'Space', 'keyup');
  await picture(context, 'the-dig-truck-tipped');
  await press(context, 'KeyQ'); await context.waitFor(page.trencher, 'trencher selected', 3000);
  await press(context, 'Tab'); await key(context, 'KeyW', 'keydown'); await key(context, 'Space', 'keydown');
  await context.waitFor(page.ditch, 'trencher cut a ditch', 60000);
  await key(context, 'Space', 'keyup'); await key(context, 'KeyW', 'keyup');
  await picture(context, 'the-dig-trencher-ditch');
  for (let i = 0; i < 5; i++) await press(context, 'KeyQ');
  await context.waitFor(page.borer, 'Mabel selected', 10000);
  await hold(context, 'KeyW', 90000);
  await press(context, 'Tab');
  await hold(context, 'KeyW', 3000);
  await context.waitFor(page.cut, 'Mabel cut rock', 60000);
  await picture(context, 'the-dig-borer-cut');
  await press(context, 'Escape');
  await context.waitFor(page.returned, 'back in the yard', 5000);
  await picture(context, 'the-dig-returned-to-yard');
  assert.equal(await context.evaluate(page.storage), before, 'the saved profile is unchanged after operating the machines');
}
