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
  atFace: `(() => window.__theDig.viewForCheck.readyToWork)()`,
  leverReady: `(() => window.__theDig.simulation.borer.lever >= 0.30)()`,
  leverZero: `(() => window.__theDig.simulation.borer.lever <= 0)()`,
  cut: `(() => window.__theDig.simulation.borer.distanceM >= 30)()`,
  cut20: `(() => window.__theDig.simulation.borer.distanceM >= 20)()`,
  groundSamples: `(() => { const dig=window.__theDig, b=dig.simulation.borer, v=dig.viewForCheck;
    const forward={x:Math.sin(b.heading),z:Math.cos(b.heading)}, right={x:forward.z,z:-forward.x};
    return [-5,0,5].flatMap(side=>[0,10,20,30,40,60].map(distance=>{
      const x=b.x+distance*forward.x+side*right.x, z=b.z+distance*forward.z+side*right.z;
      return {side,distance,rules:v.surfaceHeight(x,z),hit:v.groundRay({x,y:200,z},{x:0,y:-1,z:0})};
    })); })()`,
  cover: `(() => { const dig=window.__theDig, b=dig.simulation.borer, v=dig.viewForCheck;
    const crown=b.y+1.65+3, hit=v.groundRay({x:b.x,y:200,z:b.z},{x:0,y:-1,z:0});
    return {crown,rules:v.surfaceHeight(b.x,b.z),drawn:hit?.y ?? null}; })()`,
  roofRay: `(() => { const dig=window.__theDig, v=dig.viewForCheck, s=dig.simulation.tunnels.segments[0];
    const dx=s.end.x-s.start.x,dz=s.end.z-s.start.z,length=Math.hypot(dx,dz);
    const target={x:s.start.x+10*dx/length,y:s.start.y+s.radius+3,z:s.start.z+10*dz/length};
    const origin=v.camera.position, direction={x:target.x-origin.x,y:target.y-origin.y,z:target.z-origin.z};
    const distance=Math.hypot(direction.x,direction.y,direction.z);
    return {target,hit:v.groundRay(origin,direction,distance)}; })()`,
  mouth: `(() => window.__theDig.simulation.borer.travelM <= 0.1)()`,
  face: `(() => window.__theDig.simulation.borer.travelM >= 29.9)()`,
  inside: `(() => window.__theDig.simulation.borer.travelM <= 10)()`,
  status: `(() => { const b = window.__theDig.simulation.borer; return {distance:b.distanceM, lever:b.lever, stalled:b.stalled}; })()`,
  pause: `(() => new Promise(resolve => setTimeout(resolve, 100)))()`,
  frame: `(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))))()`,
  sample: `(() => { window.__theDig.requestCentreSample(); return new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))); })()`,
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
      headSpeed:dig.simulation.borer.headSpeed, pixels:view.pixels}; })()`,
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
async function cutUntil(context, metres) {
  const deadline = Date.now() + 450000;
  let nextReport = Date.now() + 30000, held = null, recovering = false;
  try {
    while (Date.now() < deadline) {
      const state = await context.evaluate(page.status);
      if (Date.now() >= nextReport) {
        console.log(`Mabel: ${state.distance.toFixed(1)} m, lever ${state.lever.toFixed(2)}, stalled ${state.stalled}`);
        nextReport += 30000;
      }
      if (state.distance >= metres) return;
      if (state.stalled) recovering = true;
      if (recovering && !state.stalled && state.lever <= 0) recovering = false;
      const wanted = recovering ? (state.lever > 0 ? 'KeyS' : null) :
        state.lever < 0.30 ? 'KeyW' : state.lever > 0.32 ? 'KeyS' : null;
      if (wanted !== held) {
        if (held) await key(context, held, 'keyup');
        held = wanted;
        if (held) await key(context, held, 'keydown');
      }
      await context.evaluate(page.pause);
    }
    const state = await context.evaluate(page.status);
    throw Error(`Cut timed out at ${state.distance.toFixed(1)} m, lever ${state.lever.toFixed(2)}, stalled ${state.stalled}`);
  } finally { if (held) await key(context, held, 'keyup'); }
}
async function picture(context, name, minimum = 30) {
  await context.evaluate(page.sample);
  const view = await context.evaluate(page.view);
  assert.equal(view.failed, false, 'Mabel and the yard models loaded');
  assert.ok(view.distance >= minimum && view.segments > 0, `the tunnel grew by ${minimum} m`);
  assert.ok(view.machine, `${name}: Mabel is in the camera view`);
  assert.ok(view.tunnel, `${name}: tunnel lining or portal is in the camera view`);
  assert.ok(view.pixels?.length === 5 && view.pixels.some(pixel => pixel.some((value, i) => i < 3 && Math.abs(value - view.pixels[0][i]) > 2)), `${name}: picture centre is not a flat colour`);
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
  await context.evaluate(page.frame);
  const samples = await context.evaluate(page.groundSamples);
  for (const sample of samples) {
    console.log(`Ground ${sample.distance} m ahead, ${sample.side} m right: rules ${sample.rules.toFixed(2)}, mesh ${sample.hit?.y?.toFixed(2) ?? 'no hit'}`);
  }
  for (const sample of samples) {
    assert.ok(sample.hit && Math.abs(sample.rules - sample.hit.y) <= 0.5, 'drawn ground matches the rules');
  }
  await holdUntil(context, 'KeyW', page.atFace, 'Mabel reaches the rock', 90000);
  await press(context, 'Tab');
  await cutUntil(context, 20);
  await holdUntil(context, 'KeyS', page.leverZero, 'pull the lever back', 10000);
  await press(context, 'KeyC');
  const cover = await context.evaluate(page.cover);
  console.log(`Cover at 20 m: crown ${cover.crown.toFixed(2)}, rules ${cover.rules.toFixed(2)}, mesh ${cover.drawn?.toFixed(2) ?? 'no hit'}`);
  assert.ok(cover.rules >= cover.crown + 6 && cover.drawn !== null && cover.drawn >= cover.crown + 6, 'rules and mesh give six metres of cover');
  await picture(context, 'machine-borer-mouth-20m', 20);
  await press(context, 'KeyC');
  await cutUntil(context, 30);
  await holdUntil(context, 'KeyS', page.leverZero, 'pull the lever back', 10000);
  await press(context, 'KeyC');
  await picture(context, 'machine-borer-mouth');
  await press(context, 'KeyC');
  await picture(context, 'machine-borer-face');
  await key(context, 'KeyS', 'keydown');
  try {
    await context.waitFor(page.inside, '20 m back from the face', 60000);
    const roof = await context.evaluate(page.roofRay);
    console.log(`Ground above the bore: ${JSON.stringify(roof)}`);
    assert.ok(roof.hit, 'ground blocks the view from inside to above the crown');
    const inside = await picture(context, 'machine-borer-inside');
    assert.equal(inside.headSpeed, 0, 'the head is stopped while reversing');
  } finally { await key(context, 'KeyS', 'keyup'); }
}
