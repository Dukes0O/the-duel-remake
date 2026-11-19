import assert from 'node:assert/strict';

const key = (context, code, type) => context.evaluate(`document.dispatchEvent(new KeyboardEvent('${type}',{code:'${code}',bubbles:true,cancelable:true}))`);
async function press(context, code) {
  await key(context, code, 'keydown');
  await context.evaluate('new Promise(resolve => setTimeout(resolve, 150))');
  await key(context, code, 'keyup');
}

// Run with the browser harness and its isolated, memory-only profile.
export async function run(context) {
  await context.navigate('/tools/menu-check.html?flags=wasteland-town,the-dig');
  await context.waitFor('!!window.__qaApp&&!!Object.getOwnPropertyDescriptor(window,"localStorage")?.value&&window.name.startsWith("__duel_qa_tab_v2:")', 'isolated test game', 60000);
  await context.evaluate(`(() => {
    const app=window.__qaApp; app.stop();
    if(!app.addPlayer('Drill test').ok) throw Error('Could not create test player');
    app.profile={...app.profile,wasteland:{...app.profile.wasteland,discoveredGate:true}};
    if(!app._saveProfile()||!app.visitWasteland()) throw Error('Could not enter yard');
    app.advance(8); app.onFrame?.(app.duel.state);
  })()`);
  await context.waitFor('window.__qaApp.isYardHomeActive()&&document.querySelector("[data-action=yard-the-dig]")', 'yard', 60000);
  await context.evaluate('document.querySelector("[data-action=yard-the-dig]").click()');
  await context.waitFor('window.__theDig?.simulation?.activeMachine==="excavator"', 'machine yard', 60000);
  assert.equal(await context.evaluate('window.__theDig.failed'), false, 'machine models loaded');
  for (let i=0; i<3; i++) { await press(context, 'KeyQ'); await context.evaluate('new Promise(resolve => setTimeout(resolve, 200))'); }
  await context.waitFor('window.__theDig.simulation.activeMachine==="drill"', 'drill rig', 10000);
  const panel=await context.evaluate('document.querySelector(".the-dig-controls").textContent');
  assert.match(panel, /mast/i);
  assert.match(panel, /feed/i);
  assert.doesNotMatch(panel, /bucket/i);
  const before=await context.evaluate('({...window.__theDig.simulation.drill.machine})');
  await key(context, 'KeyW', 'keydown');
  await context.evaluate('new Promise(resolve => setTimeout(resolve, 2000))');
  await key(context, 'KeyW', 'keyup');
  const after=await context.evaluate('({...window.__theDig.simulation.drill.machine})');
  assert.ok(Math.hypot(after.x-before.x,after.z-before.z)>0.1, 'the rig drives');
  await press(context, 'Tab');
  await key(context, 'Space', 'keydown');
  await context.waitFor('window.__theDig.simulation.drill.hole?.depth>0.1', 'drill feeding', 30000);
  await context.screenshot('machine-drill-feeding');
  // Keep feeding at the normal rate until the bit reaches rock. This can take several minutes.
  await context.waitFor('(()=>{const h=window.__theDig.simulation.drill.hole;return h&&h.depth>=h.site.gravelEnd;})()', 'rock layer', 600000);
  await key(context, 'KeyW', 'keydown');
  await context.waitFor('window.__theDig.simulation.drill.hole?.jammed', 'hard feed jams the bit', 30000);
  await key(context, 'KeyW', 'keyup'); await key(context, 'Space', 'keyup');
  await context.screenshot('machine-drill-jammed');
  assert.match(await context.evaluate('document.querySelector(".the-dig-message").textContent'), /jammed/i);
  await key(context, 'KeyS', 'keydown');
  await context.waitFor('!window.__theDig.simulation.drill.hole?.jammed', 'bit freed', 10000);
  await key(context, 'KeyS', 'keyup'); await key(context, 'Space', 'keydown');
  await context.waitFor('window.__theDig.simulation.drill.wellheads.length===1', 'water and wellhead', 600000);
  await key(context, 'Space', 'keyup');
  await context.screenshot('machine-drill-water');
  assert.match(await context.evaluate('document.querySelector(".the-dig-load").textContent'), /wet/i);
  const well=await context.evaluate('({...window.__theDig.simulation.drill.wellheads[0]})');
  await press(context, 'Tab');
  await key(context, 'KeyS', 'keydown');
  await context.waitFor(`(()=>{const m=window.__theDig.simulation.drill.machine;return Math.hypot(m.x-${well.x},m.z-${well.z})>=8;})()`, 'drive back from wellhead', 30000);
  await key(context, 'KeyS', 'keyup');
  await context.screenshot('machine-drill-wellhead');
  await press(context, 'Escape');
  await context.waitFor('!document.querySelector(".the-dig")&&window.__qaApp.isYardHomeActive()', 'return to yard', 10000);
  await context.evaluate('document.querySelector("[data-action=yard-the-dig]").click()');
  await context.waitFor('window.__theDig?.host?.isConnected&&window.__theDig.simulation?.activeMachine==="excavator"', 'new yard visit', 60000);
  assert.equal(await context.evaluate('window.__theDig.simulation.drill.wellheads.length'), 0, 'yard wellheads last only for the visit');
  await press(context, 'Escape');
  await context.waitFor('!document.querySelector(".the-dig")&&window.__qaApp.isYardHomeActive()', 'return after second visit', 10000);
}
