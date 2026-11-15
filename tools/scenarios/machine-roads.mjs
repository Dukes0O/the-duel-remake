import assert from 'node:assert/strict';

const key = (context, code, type) => context.evaluate(`document.dispatchEvent(new KeyboardEvent('${type}',{code:'${code}',bubbles:true,cancelable:true}))`);
async function press(context, code) {
  await key(context, code, 'keydown');
  await context.evaluate('new Promise(resolve => setTimeout(resolve, 150))');
  await key(context, code, 'keyup');
}
async function select(context, machine) {
  await press(context, 'KeyQ');
  await context.waitFor(`window.__theDig.simulation.activeMachine===${JSON.stringify(machine)}`, machine, 10000);
  const label = machine === 'roller' ? 'ROAD ROLLER' : machine.toUpperCase();
  await context.waitFor(`document.querySelector(".the-dig-controls").textContent.includes(${JSON.stringify(label + ' CONTROLS')})`, 'machine controls', 10000);
  const panel = await context.evaluate('document.querySelector(".the-dig-controls").textContent');
  assert.match(panel, new RegExp(machine === 'roller' ? 'road roller' : machine, 'i'));
  assert.match(panel, /Space/);
  assert.doesNotMatch(panel, /bucket|mast|feed/i);
  if (machine === 'paver') assert.match(panel, /Shift/);
  else assert.doesNotMatch(panel, /Shift/);
}
// Place a machine at the start of the practice strip. Work is always done by driving it.
async function position(context, machine, z) {
  await context.evaluate(`Object.assign(window.__theDig.simulation.roadMachines[${JSON.stringify(machine)}].machine,{x:40,z:${z},heading:0,speedMps:0})`);
}
async function drive(context, {slow=false, picture=null, until}) {
  if (slow) await key(context, 'ShiftLeft', 'keydown');
  await key(context, 'Space', 'keydown');
  await key(context, 'KeyW', 'keydown');
  await context.waitFor(until, 'machine work', 30000);
  if (picture) await context.screenshot(picture);
  await key(context, 'KeyW', 'keyup');
  await key(context, 'Space', 'keyup');
  if (slow) await key(context, 'ShiftLeft', 'keyup');
}

// Run with the browser harness and its isolated, memory-only profile.
export async function run(context) {
  await context.navigate('/tools/menu-check.html?flags=wasteland-town');
  await context.waitFor('!!window.__qaApp&&!!Object.getOwnPropertyDescriptor(window,"localStorage")?.value&&window.name.startsWith("__duel_qa_tab_v2:")', 'isolated test game', 60000);
  await context.evaluate(`(() => {
    const app=window.__qaApp; app.stop();
    if(!app.addPlayer('Road test').ok) throw Error('Could not create test player');
    app.profile={...app.profile,wasteland:{...app.profile.wasteland,discoveredGate:true}};
    if(!app._saveProfile()||!app.visitWasteland()) throw Error('Could not enter yard');
    app.advance(8); app.onFrame?.(app.duel.state);
  })()`);
  await context.waitFor('window.__qaApp.isYardHomeActive()&&document.querySelector("[data-action=yard-the-dig]")', 'yard', 60000);
  await context.evaluate('document.querySelector("[data-action=yard-the-dig]").click()');
  await context.waitFor('window.__theDig?.simulation?.activeMachine==="excavator"', 'machine yard', 60000);
  assert.equal(await context.evaluate('window.__theDig.failed'), false);
  for (const machine of ['dumpTruck','trencher','drill','dozer']) {
    await press(context, 'KeyQ');
    await context.waitFor(`window.__theDig.simulation.activeMachine===${JSON.stringify(machine)}`, machine, 10000);
  }
  await context.waitFor('/DOZER CONTROLS/.test(document.querySelector(".the-dig-controls").textContent)', 'dozer controls', 10000);
  assert.doesNotMatch(await context.evaluate('document.querySelector(".the-dig-controls").textContent'), /bucket|mast|Shift/i);
  await drive(context, {picture:'machine-roads-dozer', until:'window.__theDig.simulation.roadWork.bladeLoad>0'});
  await drive(context, {until:'window.__theDig.simulation.roadWork.cells["40:17"]?.spread>0'});
  await select(context, 'roller');
  for (let pass=0; pass<3; pass++) {
    await position(context, 'roller', 15);
    await drive(context, {picture:pass===0?'machine-roads-roller':null,
      until:`window.__theDig.simulation.roadWork.cells["40:17"]?.compaction>=${(pass+1)*0.35-0.01}`});
  }
  await select(context, 'paver');
  await position(context, 'paver', 15);
  await drive(context, {picture:'machine-roads-paver', until:'window.__theDig.simulation.roadWork.cells["40:17"]?.surface===1'});
  assert.ok(await context.evaluate('window.__theDig.simulation.roadWork.cells["40:17"].roughness>0.2'), 'Fast paving leaves rough work.');
  await context.screenshot('machine-roads-bad-stretch');
  await position(context, 'paver', 15);
  await drive(context, {slow:true, until:'window.__theDig.simulation.roadWork.cells["40:17"]?.roughness<=0.2'});
  await context.screenshot('machine-roads-finished-stretch');
  await press(context, 'Escape');
  await context.waitFor('!document.querySelector(".the-dig")&&window.__qaApp.isYardHomeActive()', 'return to yard', 10000);
}
