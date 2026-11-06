import assert from 'node:assert/strict';

const key=(context,code,type)=>context.evaluate(`document.dispatchEvent(new KeyboardEvent('${type}',{code:'${code}',bubbles:true,cancelable:true}))`);
async function press(context,code,frames=1){
  await key(context,code,'keydown');
  if(frames>1)await context.evaluate(`new Promise(resolve=>setTimeout(resolve,${Math.ceil(frames*1000/60)}))`);
  await key(context,code,'keyup');
}
async function hold(context,code,milliseconds){
  await key(context,code,'keydown');await context.evaluate(`new Promise(resolve=>setTimeout(resolve,${milliseconds}))`);await key(context,code,'keyup');
}

export async function run(context){
  await context.navigate('/tools/menu-check.html?flags=wasteland-town');
  await context.waitFor('!!window.__qaApp&&!!Object.getOwnPropertyDescriptor(window,"localStorage")?.value&&window.name.startsWith("__duel_qa_tab_v2:")',
    'isolated THE DIG test game',60000);
  await context.evaluate(`(() => {const app=window.__qaApp;app.stop();
    const added=app.addPlayer('THE DIG test');if(!added.ok)throw Error('Could not create the memory-only test player');
    app.profile={...app.profile,wasteland:{...app.profile.wasteland,discoveredGate:true}};
    if(!app._saveProfile()||!app.visitWasteland())throw Error('Could not enter the memory-only Wasteland yard');
    app.advance(8);app.onFrame?.(app.duel.state);})()`);
  await context.waitFor('window.__qaApp.isYardHomeActive()&&document.querySelector("[data-action=yard-the-dig]")',
    'THE DIG button in the yard',60000);
  await context.screenshot('the-dig-yard');
  await context.evaluate('document.querySelector("[data-action=yard-the-dig]").click()');
  await context.waitFor('!!window.__theDig?.host?.isConnected','machine yard loaded',60000);
  await context.waitFor('window.__theDig.failed||window.__theDig.simulation?.activeMachine==="excavator"','excavator ready',60000);
  await context.screenshot('the-dig-excavator-ready');
  assert.equal(await context.evaluate('window.__theDig.failed'),false,'the machine and Dome models load');
  await press(context,'Tab');await hold(context,'Space',1800);
  await context.waitFor('window.__theDig.simulation.excavatedM3>0','excavator dug dirt',10000);
  await context.screenshot('the-dig-excavated');
  await press(context,'KeyE');
  await context.waitFor('window.__theDig.simulation.loadedM3>0','truck loaded from bucket',10000);
  await press(context,'KeyQ');
  await context.waitFor('window.__theDig.simulation.activeMachine==="dumpTruck"','dump truck selected',3000);
  await context.screenshot('the-dig-truck-loaded');
  await hold(context,'KeyW',1200);await press(context,'Tab');await hold(context,'Space',2000);
  await context.waitFor('window.__theDig.simulation.tippedM3>0','truck tipped a heap',10000);
  await context.screenshot('the-dig-truck-tipped');
  await press(context,'KeyQ');await context.waitFor('window.__theDig.simulation.activeMachine==="trencher"','trencher selected',3000);
  await hold(context,'KeyW',1000);await press(context,'Tab');await hold(context,'Space',2200);
  await context.waitFor('window.__theDig.simulation.trencher.cutVolumeM3>0','trencher cut a ditch',10000);
  await context.screenshot('the-dig-trencher-ditch');
  await press(context,'Escape');
  await context.waitFor('!document.querySelector(".the-dig")&&window.__qaApp.isYardHomeActive()','back in yard',5000);
}
