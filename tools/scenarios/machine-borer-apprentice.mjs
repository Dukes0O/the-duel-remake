import {writeFile} from 'node:fs/promises';
import {join} from 'node:path';

// Each page expression has its own scope and is parsed before the scenario runs.
export const page = {
  ready: `(() => !!window.__qaApp && !!Object.getOwnPropertyDescriptor(window, 'localStorage')?.value && window.name.startsWith('__duel_qa_tab_v2:'))()`,
  enter: `(() => { const app=window.__qaApp; app.stop(); if(!app.addPlayer('Pim check').ok) throw Error('Could not create memory-only player'); app.profile={...app.profile,wasteland:{...app.profile.wasteland,discoveredGate:true}}; if(!app._saveProfile() || !app.visitWasteland()) throw Error('Could not enter the yard'); app.advance(8); app.onFrame?.(app.duel.state); return true; })()`,
  yard: `(() => window.__qaApp.isYardHomeActive() && !!document.querySelector('[data-action=yard-the-dig]'))()`,
  open: `(() => { document.querySelector('[data-action=yard-the-dig]').click(); return true; })()`,
  loaded: `(() => !!window.__theDig?.host?.isConnected && (!!window.__theDig.failed || window.__theDig.simulation?.activeMachine==='excavator'))()`,
  teach: `(() => { window.__theDig.teachBorerForCheck(); return true; })()`,
  borer: `(() => window.__theDig.simulation.activeMachine==='borer')()`,
  face: `(() => window.__theDig.viewForCheck.readyToWork)()`,
  sendReady: `(() => Array.from(window.__theDig.host.querySelectorAll('button')).some(b=>!b.hidden && b.textContent.includes('Send Pim')))()`,
  sent: `(() => window.__theDig.simulation.boreOrders.length>0)()`,
  excavator: `(() => window.__theDig.simulation.activeMachine==='excavator')()`,
  snapshot: `(() => { const d=window.__theDig, s=d.simulation, o=s.boreOrders[0]; return {elapsed:s.elapsed, machine:s.activeMachine, order:o ? {status:o.status, done:o.stages[0].completed, metres:o.metres} : null, board:Array.from(d.host.querySelectorAll('.the-dig-survey p')).map(p=>p.textContent).find(t=>t.startsWith('Bore board.')) || '', lever:s.borePlayerAtLever, distance:s.borer.distanceM, camera:s.cameraIndex}; })()`,
  view: `(() => { const v=window.__theDig.viewForCheck, body=v.machine, camera=v.camera; if(!body) return {visible:false}; body.updateWorldMatrix(true,true); camera.updateMatrixWorld(true); const point=new v.three.Box3().setFromObject(body).getCenter(new v.three.Vector3()).project(camera); return {visible:body.visible && Math.abs(point.x)<=1 && Math.abs(point.y)<=1 && point.z>=-1 && point.z<=1, projected:point.toArray(), cameraPosition:camera.position.toArray()}; })()`,
  visit: `(() => { const b=Array.from(window.__theDig.host.querySelectorAll('button')).find(x=>!x.hidden && x.textContent.startsWith('Go and see bore')); if(!b) throw Error('Visit button is missing'); b.click(); return true; })()`,
  atWork: `(() => window.__theDig.simulation.activeMachine==='borer' && !!window.__theDig.simulation.activeBoreId)()`,
  playerLever: `(() => window.__theDig.simulation.borePlayerAtLever===true)()`,
  apprenticeLever: `(() => window.__theDig.simulation.borePlayerAtLever===false)()`,
  frame: `(() => new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))))()`,
  thirtySeconds: `(() => new Promise(resolve=>setTimeout(resolve,30000)))()`,
  fiveSeconds: `(() => new Promise(resolve=>setTimeout(resolve,5000)))()`,
};
for (const expression of Object.values(page)) new Function(`return ${expression};`);

function keyExpression(code, type) {
  const expression=`(() => { document.dispatchEvent(new KeyboardEvent(${JSON.stringify(type)}, {code:${JSON.stringify(code)},bubbles:true,cancelable:true})); return true; })()`;
  new Function(`return ${expression};`);
  return expression;
}
async function press(context, code) {
  await context.evaluate(keyExpression(code, 'keydown'));
  try { await context.evaluate(page.frame); }
  finally { await context.evaluate(keyExpression(code, 'keyup')); }
}

export async function run(context) {
  const measurements={failures:[], pictures:{}};
  const persist=()=>writeFile(join(context.outputDir,'machine-borer-apprentice-measurements.json'),JSON.stringify(measurements,null,2)+'\n');
  const attempt=async (label, action)=>{ try { return await action(); } catch(error) { measurements.failures.push(`${label}: ${error.message}`); return null; } };
  const check=(condition, label, value)=>{ measurements[label]=value; if(!condition) measurements.failures.push(label); };
  const picture=async name=>{ measurements.pictures[name]=await attempt(name,async()=>{ await context.screenshot(name); return 'taken'; }); };
  await attempt('Open the Dig',async()=>{ await context.navigate('/tools/menu-check.html?flags=wasteland-town,the-dig'); await context.waitFor(page.ready,'isolated test game',60000); await context.evaluate(page.enter); await context.waitFor(page.yard,'The Dig button',60000); await context.evaluate(page.open); await context.waitFor(page.loaded,'The Dig loaded',60000); await context.evaluate(page.teach); });
  await attempt('Reach the surveyed face',async()=>{ for(let i=0;i<7;i++) await press(context,'KeyQ'); await context.waitFor(page.borer,'Mabel selected',10000); await context.evaluate(keyExpression('KeyW','keydown')); try { await context.waitFor(page.face,'Mabel reaches the face',90000); } finally { await context.evaluate(keyExpression('KeyW','keyup')); } await context.waitFor(page.sendReady,'Send Pim offered',10000); });
  await attempt('Send Pim',async()=>{ await press(context,'KeyF'); await context.waitFor(page.sent,'bore sent',10000); await press(context,'KeyQ'); await context.waitFor(page.excavator,'excavator selected',10000); await context.evaluate(page.frame); });
  const first=await attempt('First board reading',()=>context.evaluate(page.snapshot));
  check(!!first?.board && first.machine==='excavator' && !!first.order,'Board shows the bore while the excavator is selected',first);
  await picture('machine-borer-apprentice-board');
  await attempt('Wait 30 seconds',()=>context.evaluate(page.thirtySeconds));
  const second=await attempt('Second board reading',()=>context.evaluate(page.snapshot));
  check(!!second?.order && second.order.done>(first?.order?.done ?? Infinity) && second.board!==first?.board,'The bore and board advance',second);
  check(Number.isFinite(second?.elapsed) && second.elapsed>first?.elapsed,'Simulation time advances while the excavator is selected',{first:first?.elapsed,second:second?.elapsed});
  await attempt('Go and see',async()=>{ await context.evaluate(page.visit); await context.waitFor(page.atWork,'working face',10000); await context.evaluate(page.frame); });
  const face=await attempt('Working face reading',()=>context.evaluate(page.snapshot));
  check(face?.machine==='borer' && face?.lever===false,'The visit reaches Pim at the working face',face);
  const view=await attempt('Working face view',()=>context.evaluate(page.view));
  check(view?.visible===true,'Mabel is visible at the working face',view);
  await picture('machine-borer-apprentice-face');
  await attempt('Take the lever',async()=>{ await press(context,'KeyV'); await context.waitFor(page.playerLever,'player has the lever',10000); });
  const before=await attempt('Before player cuts',()=>context.evaluate(page.snapshot));
  await attempt('Cut for five seconds',async()=>{ await context.evaluate(keyExpression('KeyW','keydown')); try { await context.evaluate(page.fiveSeconds); } finally { await context.evaluate(keyExpression('KeyW','keyup')); } });
  const after=await attempt('After player cuts',()=>context.evaluate(page.snapshot));
  check(after?.lever===true && after?.order?.done>(before?.order?.done ?? Infinity),'Player cutting advances the same bore', {before,after});
  await attempt('Hand back',async()=>{ await press(context,'KeyV'); await context.waitFor(page.apprenticeLever,'Pim has the lever',10000); });
  const handedBack=await attempt('Hand back reading',()=>context.evaluate(page.snapshot));
  check(handedBack?.lever===false && handedBack?.order?.done >= after?.order?.done,'Pim receives the same bore',handedBack);
  await persist();
  if(measurements.failures.length) throw Error(`Scenario failures:\n- ${measurements.failures.join('\n- ')}`);
}
