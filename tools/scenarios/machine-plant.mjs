import assert from 'node:assert/strict';

// The one scripted drive for MACHINE-PLANT: rock in the hopper to set concrete, with the
// real keys at every machine. Travel between machines is skipped by placing each machine
// where its work starts; the excavator's loading is The Dig's own scenario.
const key = (context, code, type) => context.evaluate(`document.dispatchEvent(new KeyboardEvent('${type}',{code:'${code}',bubbles:true,cancelable:true}))`);
const wait = (context, ms) => context.evaluate(`new Promise(resolve => setTimeout(resolve, ${ms}))`);
async function press(context, code) { await key(context, code, 'keydown'); await wait(context, 150); await key(context, code, 'keyup'); await wait(context, 100); }
async function hold(context, codes, until, label, timeout) {
  for (const code of codes) await key(context, code, 'keydown');
  try { await context.waitFor(until, label, timeout); }
  finally { for (const code of codes) await key(context, code, 'keyup'); }
}

const sim = 'window.__theDig.simulation';
export const page = {
  goods: (cell, good) => `((${sim}.plant.ledger.goods.stockpiles['scablands:${cell}']||{goods:{}}).goods.${good}||0)`,
  drumM3: `(Object.values(${sim}.plant.mixer.drum).reduce((a,b)=>a+b,0)/2375)`,
  place: (machine, x, z, heading) => `Object.assign(${sim}.plant.${machine}.machine,{x:${x},z:${z},heading:${heading},speedMps:0})`,
};

export async function run(context) {
  await context.navigate('/tools/menu-check.html?flags=wasteland-town,the-dig');
  await context.waitFor('!!window.__qaApp&&!!Object.getOwnPropertyDescriptor(window,"localStorage")?.value&&window.name.startsWith("__duel_qa_tab_v2:")', 'isolated test game', 60000);
  await context.evaluate(`(() => {
    const app=window.__qaApp; app.stop();
    if(!app.addPlayer('Plant test').ok) throw Error('Could not create test player');
    app.profile={...app.profile,wasteland:{...app.profile.wasteland,discoveredGate:true}};
    if(!app._saveProfile()||!app.visitWasteland()) throw Error('Could not enter yard');
    app.advance(8); app.onFrame?.(app.duel.state);
  })()`);
  await context.waitFor('window.__qaApp.isYardHomeActive()&&document.querySelector("[data-action=yard-the-dig]")', 'yard', 60000);
  await context.evaluate('document.querySelector("[data-action=yard-the-dig]").click()');
  await context.waitFor(`window.__theDig?.simulation?.activeMachine==="excavator"&&!!${sim}.plant`, 'machine yard with the plant', 60000);
  assert.equal(await context.evaluate('window.__theDig.failed'), false, 'machine models loaded');
  await context.waitFor('!!window.__theDig.viewForCheck.world.getObjectByName("Crusher")', 'the plant is drawn', 60000);

  // The dump truck backs its bed over the hopper and tips four bucket loads of rock.
  await press(context, 'KeyQ');
  await context.waitFor(`${sim}.activeMachine==="dumpTruck"`, 'dump truck', 10000);
  await context.evaluate(`Object.assign(${sim}.haul.machines.dumpTruck,{x:-22.5,z:20,heading:Math.PI/2,speedMps:0,load:{rock:3.2}})`);
  await press(context, 'Tab');
  await hold(context, ['Space'], `Object.keys(${sim}.haul.machines.dumpTruck.load).length===0`, 'the load is in the hopper', 30000);
  await context.screenshot('machine-plant-hopper');
  await context.waitFor(`${page.goods('-51:20', 'gravel')}>7600`, 'the crusher made a gravel pile', 300000);
  await context.screenshot('machine-plant-gravel-pile');

  // The loader takes a bucket of gravel and a bucket of sand to the bins.
  for (let i = 0; i < 7; i++) await press(context, 'KeyQ');
  await context.waitFor(`${sim}.activeMachine==="loader"`, 'loader', 10000);
  for (const [material, x, z] of [['gravel', -51, 20], ['sand', -50, 6]]) {
    await context.evaluate(`${page.place('loader', `${x}+3.6+Math.cbrt(3*${page.goods(`${x}:${z}`, material)}/1600/(Math.PI*Math.tan(35*Math.PI/180)))-0.3`, z, '-Math.PI/2')}`);
    await hold(context, ['Space', 'KeyW'], `${sim}.plant.loader.bucket.kg>3199`, `a bucket of ${material}`, 30000);
    await context.evaluate(page.place('loader', -55.8, 10.1, '-Math.PI/2'));
    await hold(context, ['KeyE'], `${sim}.plant.loader.bucket.kg===0`, `${material} in the bins`, 30000);
  }
  assert.ok(await context.evaluate(page.goods('-64:12', 'gravel')) > 3199, 'gravel in the bin');
  assert.ok(await context.evaluate(page.goods('-64:12', 'sand')) > 3199, 'sand in the bin');
  await context.screenshot('machine-plant-loader');

  // The mixer truck is charged under the plant, then pours the first form full.
  await press(context, 'KeyQ');
  await context.waitFor(`${sim}.activeMachine==="mixer"`, 'mixer truck', 10000);
  await context.evaluate(page.place('mixer', -64, 21.9, 0));
  await press(context, 'Tab');
  await hold(context, ['Space'], `${page.drumM3}>=2.84`, 'the drum is charged', 150000);
  await context.screenshot('machine-plant-charging');
  await press(context, 'Tab');
  await context.evaluate(`${page.place('mixer', -44, 41, 0)};${sim}.plant.mixer.chute=0`);
  await press(context, 'Tab');
  // Space is let go about half a second of pouring short of the brim (6,725 kg), as a
  // driver would; a full form spills what more the chute sends, and the key comes up late.
  await hold(context, ['Space'], `${sim}.plant.forms[0].kg>=6680`, 'the first form is nearly full', 150000);
  await context.screenshot('machine-plant-poured');
  assert.equal(await context.evaluate(`${sim}.plant.spilledKg`), 0, 'nothing was spilled');
  await context.waitFor(`${sim}.plant.forms[0].set===1`, 'the concrete has set', 180000);
  assert.match(await context.evaluate('document.querySelector(".the-dig-message").textContent + " " + document.querySelector(".the-dig-load").textContent'), /set hard/);
  await context.screenshot('machine-plant-set');
  await press(context, 'Escape');
  await context.waitFor('!document.querySelector(".the-dig")&&window.__qaApp.isYardHomeActive()', 'return to yard', 10000);
}
