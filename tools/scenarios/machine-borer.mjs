import assert from 'node:assert/strict';

// Every expression is a function call, so each can be parsed independently.
const page = {
  ready: `(() => !!window.__qaApp && !!Object.getOwnPropertyDescriptor(window, 'localStorage')?.value && window.name.startsWith('__duel_qa_tab_v2:'))()`,
  enter: `(() => { const app = window.__qaApp; app.stop();
    if (!app.addPlayer('Mabel test').ok) throw Error('Could not create the memory-only player');
    app.profile = {...app.profile, wasteland:{...app.profile.wasteland, discoveredGate:true}};
    if (!app._saveProfile() || !app.visitWasteland()) throw Error('Could not enter the yard');
    app.advance(8); app.onFrame?.(app.duel.state); return true; })()`,
  yard: `(() => window.__qaApp.isYardHomeActive() && !!document.querySelector('[data-action=yard-the-dig]'))()`,
  open: `(() => { document.querySelector('[data-action=yard-the-dig]').click(); return true; })()`,
  loaded: `(() => !!window.__theDig?.host?.isConnected && (!!window.__theDig.failed || window.__theDig.simulation?.activeMachine === 'excavator'))()`,
  selected: `(() => window.__theDig.simulation.activeMachine === 'borer')()`,
  cut: `(() => window.__theDig.simulation.borer.distanceM >= 30)()`,
  mouth: `(() => window.__theDig.simulation.borer.travelM <= 0.1)()`,
  face: `(() => window.__theDig.simulation.borer.travelM >= 29.9)()`,
  inside: `(() => window.__theDig.simulation.borer.travelM <= 10)()`,
  frame: `(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))))()`,
  driveWait: `(() => new Promise(resolve => setTimeout(resolve, 20000)))()`,
  view: `(() => { const dig = window.__theDig, view = dig.viewForCheck, camera = view.camera;
    const inView = root => { let found = false; root?.traverse(node => {
      if (!node.isMesh || !node.visible || !node.geometry?.attributes?.position) return;
      const positions = node.geometry.attributes.position, point = node.position.clone();
      const stride = Math.max(1, Math.floor(positions.count / 500));
      for (let i = 0; i < positions.count; i += stride) {
        point.fromBufferAttribute(positions, i).applyMatrix4(node.matrixWorld).project(camera);
        if (Math.abs(point.x) <= 1 && Math.abs(point.y) <= 1 && point.z >= -1 && point.z <= 1) { found = true; break; }
      }
    }); return found; };
    return {failed:dig.failed, machine:inView(view.machine), tunnel:inView(view.lining) || inView(view.portals),
      distance:dig.simulation.borer.distanceM, segments:dig.simulation.tunnels.segments.length,
      headSpeed:dig.simulation.borer.headSpeed}; })()`,
};
for (const expression of Object.values(page)) new Function(`return ${expression};`);

const key = (context, code, type) => {
  const expression = `(() => { document.dispatchEvent(new KeyboardEvent(${JSON.stringify(type)}, {code:${JSON.stringify(code)}, bubbles:true, cancelable:true})); return true; })()`;
  new Function(`return ${expression};`);
  return context.evaluate(expression);
};
async function press(context, code) {
  await key(context, code, 'keydown');
  await context.evaluate(page.frame);
  await key(context, code, 'keyup');
}
async function holdUntil(context, code, expression, label, timeout) {
  await key(context, code, 'keydown');
  try { await context.waitFor(expression, label, timeout); }
  finally { await key(context, code, 'keyup'); }
}
async function picture(context, name) {
  await context.evaluate(page.frame);
  const view = await context.evaluate(page.view);
  assert.equal(view.failed, false, 'Mabel and the yard models loaded');
  assert.ok(view.distance >= 30 && view.segments > 0, 'the tunnel grew by 30 m');
  assert.ok(view.machine, `${name}: Mabel is in the camera view`);
  assert.ok(view.tunnel, `${name}: tunnel lining or portal is in the camera view`);
  await context.screenshot(name);
  return view;
}
export async function run(context) {
  await context.navigate('/tools/menu-check.html?flags=wasteland-town');
  await context.waitFor(page.ready, 'isolated test game', 60000);
  await context.evaluate(page.enter);
  await context.waitFor(page.yard, 'The Dig button', 60000);
  await context.evaluate(page.open);
  await context.waitFor(page.loaded, 'The Dig loaded', 60000);
  for (let i = 0; i < 7; i++) await press(context, 'KeyQ');
  await context.waitFor(page.selected, 'Mabel selected', 10000);
  // Drive to the rock, then use gentle thrust through the hardest material.
  await key(context, 'KeyW', 'keydown');
  await context.evaluate(page.driveWait);
  await key(context, 'KeyW', 'keyup');
  await press(context, 'Tab');
  await key(context, 'ShiftLeft', 'keydown');
  try { await holdUntil(context, 'KeyW', page.cut, '30 m bored', 300000); }
  finally { await key(context, 'ShiftLeft', 'keyup'); }
  await holdUntil(context, 'KeyS', page.mouth, 'back at the mouth', 60000);
  await picture(context, 'machine-borer-mouth');
  await holdUntil(context, 'KeyW', page.face, 'back at the face', 120000);
  await picture(context, 'machine-borer-face');
  await key(context, 'KeyS', 'keydown');
  try {
    await context.waitFor(page.inside, '20 m back from the face', 60000);
    const inside = await picture(context, 'machine-borer-inside');
    assert.equal(inside.headSpeed, 0, 'the head is stopped while reversing');
  } finally { await key(context, 'KeyS', 'keyup'); }
}
