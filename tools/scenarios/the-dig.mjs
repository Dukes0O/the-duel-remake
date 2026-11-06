import assert from 'node:assert/strict';

const key=(context,code,type)=>context.evaluate(`document.dispatchEvent(new KeyboardEvent('${type}',{code:'${code}',bubbles:true,cancelable:true}))`);
const picture=async(context,name)=>{await context.evaluate('new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)))');await context.screenshot(name);};
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
  await picture(context,'the-dig-yard');
  await context.evaluate('document.querySelector("[data-action=yard-the-dig]").click()');
  await context.waitFor('!!window.__theDig?.host?.isConnected','machine yard loaded',60000);
  await context.waitFor('window.__theDig.failed||window.__theDig.simulation?.activeMachine==="excavator"','excavator ready',60000);
  await picture(context,'the-dig-excavator-ready');
  assert.equal(await context.evaluate('window.__theDig.failed'),false,'the machine and Dome models load');
  await hold(context,'KeyD',2100);await picture(context,'the-dig-swing-to-heap');
  await hold(context,'KeyS',1100);await picture(context,'the-dig-lowered');
  await press(context,'KeyC');await picture(context,'the-dig-cab');
  await press(context,'KeyC');await picture(context,'the-dig-work-view');
  await press(context,'KeyC');
  // Hold each key until the game has acted on it, as a player does; under load frames can be slow.
  await key(context,'Space','keydown');
  await context.waitFor('window.__theDig.simulation.excavatedM3>.3','excavator dug dirt',30000);
  await key(context,'Space','keyup');
  await picture(context,'the-dig-excavated');
  await hold(context,'KeyW',700);await hold(context,'KeyA',4200);await picture(context,'the-dig-swing-to-truck');
  await press(context,'KeyE');
  await context.waitFor('window.__theDig.simulation.loadedM3>0','truck loaded from bucket',10000);
  await press(context,'KeyQ');
  await context.waitFor('window.__theDig.simulation.activeMachine==="dumpTruck"','dump truck selected',3000);
  await picture(context,'the-dig-truck-loaded');
  await hold(context,'KeyW',1500);await press(context,'Tab');await key(context,'Space','keydown');
  await context.waitFor('window.__theDig.simulation.tippedM3>0','truck tipped a heap',30000);
  await picture(context,'the-dig-bed-lifted');await key(context,'Space','keyup');
  await picture(context,'the-dig-truck-tipped');
  await press(context,'KeyQ');await context.waitFor('window.__theDig.simulation.activeMachine==="trencher"','trencher selected',3000);
  await press(context,'Tab');await key(context,'KeyW','keydown');await key(context,'Space','keydown');
  await context.waitFor('window.__theDig.simulation.trencher.cutVolumeM3>4','trencher cut a ditch',60000);
  await key(context,'Space','keyup');await key(context,'KeyW','keyup');
  await picture(context,'the-dig-trencher-ditch');
  await press(context,'Escape');
  await context.waitFor('!document.querySelector(".the-dig")&&window.__qaApp.isYardHomeActive()','back in yard',5000);
  await picture(context,'the-dig-returned-to-yard');
}
